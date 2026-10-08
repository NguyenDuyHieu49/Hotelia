import { RecommendationsService } from './recommendations.module';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
const id=new Types.ObjectId(), second=new Types.ObjectId();
function fixture() {
  const queries:Record<string,any[]>={};
  const docs:Record<string,any[]>={
    hotels:[{_id:id,name:'Hanoi',city:'Hà Nội'},{_id:second,name:'Danang',city:'Đà Nẵng'}],
    roomtypes:[{_id:id,price:100},{_id:second,price:200}],recommendation_views:[],recommendation_impressions:[],bookings:[],
  };
  const updates=jest.fn().mockResolvedValue({});
  const impressionUpdates=jest.fn().mockResolvedValue({matchedCount:1});
  const deletes:Record<string,jest.Mock>={};
  const db={collection:(name:string)=>({
    find:(query:any)=>{(queries[name] ||= []).push(query); const cursor:any={sort:()=>cursor,limit:()=>cursor,toArray:async()=>docs[name]};return cursor;},
    findOne:jest.fn(async(query:any)=>docs[name]?.find(doc=>String(doc._id)===String(query._id))??null),
    aggregate:()=>({toArray:async()=>docs[name]}),updateOne:name==='recommendation_impressions'?impressionUpdates:updates,
    deleteMany:(deletes[name] ||= jest.fn().mockResolvedValue({})),
  })};
  return {service:new RecommendationsService({db} as any),docs,queries,updates,impressionUpdates,deletes};
}
describe('recommendation service isolation',()=>{
  it('scopes history to JWT user, never uses session identity for a logged-in user',async()=>{
    const f=fixture(); const user=new Types.ObjectId().toString();
    await f.service.recommend({sessionId:'s'},user);
    expect(f.queries.recommendation_views[0].actor).toBe(`user:${user}`);
    expect(f.queries.bookings[0].userId.toString()).toBe(user);
    expect(f.queries.bookings[0].status.$in).not.toContain('CANCELLED');
    expect(f.queries.hotels[0]).toEqual({status:'PUBLISHED'});
  });
  it('does not query other users bookings for anonymous visitors',async()=>{
    const f=fixture();const r=await f.service.recommend({sessionId:'anonymous'});
    expect(f.queries.bookings).toBeUndefined();expect(r.ranking.personalized).toBe(false);
    expect(r.ranking.modelUsed).toBe(false);
  });
  it('ranks all matching candidates before applying limit',async()=>{
    const f=fixture(); f.docs.recommendation_views=[{hotelId:second,viewedAt:new Date()}];
    const r=await f.service.recommend({sessionId:'s',limit:1});
    expect(r.hotels[0]!._id).toEqual(second);expect(r.total).toBe(2);
    expect(r.ranking.personalized).toBe(true);
  });
  it('keeps destination filtering when personal preferences favor another city',async()=>{
    const f=fixture();f.docs.recommendation_views=[{hotelId:second,viewedAt:new Date()}];
    const r=await f.service.recommend({sessionId:'s',destination:'Hà Nội'});
    expect(r.hotels).toHaveLength(1);expect(r.hotels[0]!._id).toEqual(id);
  });
  it('deduplicates repeat detail views by actor and hotel',async()=>{
    const f=fixture();const dto={sessionId:'s',hotelId:id.toString()};
    await f.service.record(dto);await f.service.record(dto);
    expect(f.updates.mock.calls[0][0]).toEqual(f.updates.mock.calls[1][0]);
    expect(f.updates.mock.calls[0][2]).toEqual({upsert:true});
  });
  it('stores ordered, bounded impressions without rewriting them on retry',async()=>{
    const f=fixture();const dto={sessionId:'4d11d232-3016-4623-b55b-6d9e57acb71b',impressionId:'9ea6c374-c692-446f-b23d-77df93c71f7f',
      candidateIds:[second.toString(),id.toString()],destination:' Đà Nẵng ',guests:2,checkIn:'2026-11-01',checkOut:'2026-11-03'};
    await f.service.recordImpression(dto);await f.service.recordImpression(dto);
    expect(f.impressionUpdates).toHaveBeenCalledTimes(2);
    const [selector,update,options]=f.impressionUpdates.mock.calls[0];
    expect(selector._id).toBe(`session:${dto.sessionId}:${dto.impressionId}`);
    expect(update.$setOnInsert.candidateIds.map(String)).toEqual(dto.candidateIds);
    expect(update.$setOnInsert.destinationKey).toBe('danang');
    expect(update.$setOnInsert.candidatePositions.map((entry:any)=>[String(entry.hotelId),entry.position]))
      .toEqual([[dto.candidateIds[0],1],[dto.candidateIds[1],2]]);
    expect(update.$setOnInsert.eventType).toBe('recommendation_served');
    expect(update.$setOnInsert.reportOrigin).toBe('client_reported');
    expect(update.$setOnInsert.cardVisibility).toBe('unverified');
    expect(update.$setOnInsert.filters).toMatchObject({guests:2,checkIn:dto.checkIn,checkOut:dto.checkOut});
    expect(options).toEqual({upsert:true});
    expect(Object.keys(update)).toEqual(['$setOnInsert']);
  });
  it('rejects duplicate or unpublished impression candidates',async()=>{
    const f=fixture();const base={sessionId:'4d11d232-3016-4623-b55b-6d9e57acb71b',impressionId:'9ea6c374-c692-446f-b23d-77df93c71f7f'};
    await expect(f.service.recordImpression({...base,candidateIds:[id.toString(),id.toString()]})).rejects.toBeInstanceOf(BadRequestException);
    await expect(f.service.recordImpression({...base,candidateIds:[new Types.ObjectId().toString()]})).rejects.toBeInstanceOf(BadRequestException);
    expect(f.impressionUpdates).not.toHaveBeenCalled();
  });
  it('does not retain arbitrary free-text searches as destination strings',async()=>{
    const f=fixture();await f.service.recordImpression({sessionId:'4d11d232-3016-4623-b55b-6d9e57acb71b',
      impressionId:'9ea6c374-c692-446f-b23d-77df93c71f7f',candidateIds:[id.toString()],destination:'personal@email.com'});
    const insert=f.impressionUpdates.mock.calls[0][1].$setOnInsert;
    expect(insert.destinationKey).toBeNull();
    expect(insert.searchTextPresent).toBe(true);
    expect(JSON.stringify(insert)).not.toContain('personal@email.com');
  });
  it('links a detail open only when actor, impression and candidate all match',async()=>{
    const f=fixture();const sessionId='4d11d232-3016-4623-b55b-6d9e57acb71b';
    const impressionId='9ea6c374-c692-446f-b23d-77df93c71f7f';
    await f.service.record({sessionId,hotelId:id.toString(),impressionId});
    const [selector,update,options]=f.impressionUpdates.mock.calls[0];
    expect(selector).toMatchObject({_id:`session:${sessionId}:${impressionId}`,actor:`session:${sessionId}`,candidateIds:id});
    expect(selector.expiresAt.$gt).toBeInstanceOf(Date);
    expect(update.$addToSet.detailOpenedHotelIds).toEqual(id);
    expect(update.$min[`detailOpenedAt.${id}`]).toBeInstanceOf(Date);
    expect(options).toBeUndefined();
  });
  it('does not label an unshown hotel or a different user as a detail-open outcome',async()=>{
    const f=fixture();const sessionId='4d11d232-3016-4623-b55b-6d9e57acb71b';
    const impressionId='9ea6c374-c692-446f-b23d-77df93c71f7f';
    const owner=new Types.ObjectId().toString();
    const recorded={actor:`user:${owner}`,candidateIds:[id.toString()],detailOpenedHotelIds:[] as string[]};
    f.impressionUpdates.mockImplementation(async(selector:any,update:any)=>{
      if(selector.actor!==recorded.actor || !recorded.candidateIds.includes(String(selector.candidateIds))) return {matchedCount:0};
      recorded.detailOpenedHotelIds.push(String(update.$addToSet.detailOpenedHotelIds));
      return {matchedCount:1};
    });
    await f.service.record({sessionId,hotelId:second.toString(),impressionId},owner);
    await f.service.record({sessionId,hotelId:id.toString(),impressionId},new Types.ObjectId().toString());
    expect(recorded.detailOpenedHotelIds).toEqual([]);
    await f.service.record({sessionId,hotelId:id.toString(),impressionId},owner);
    expect(recorded.detailOpenedHotelIds).toEqual([id.toString()]);
  });
  it('clears both view history and impression telemetry for one actor',async()=>{
    const f=fixture();const sessionId='4d11d232-3016-4623-b55b-6d9e57acb71b';
    await f.service.clear(sessionId);
    expect(f.deletes.recommendation_views).toHaveBeenCalledWith({actor:`session:${sessionId}`});
    expect(f.deletes.recommendation_impressions).toHaveBeenCalledWith({actor:`session:${sessionId}`});
  });
});
