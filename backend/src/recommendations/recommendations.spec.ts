import { RecommendationsService } from './recommendations.module';
import { Types } from 'mongoose';
const id=new Types.ObjectId(), second=new Types.ObjectId();
function fixture() {
  const queries:Record<string,any[]>={};
  const docs:Record<string,any[]>={
    hotels:[{_id:id,name:'Hanoi',city:'Hà Nội'},{_id:second,name:'Danang',city:'Đà Nẵng'}],
    roomtypes:[{_id:id,price:100},{_id:second,price:200}],recommendation_views:[],bookings:[],
  };
  const updates=jest.fn().mockResolvedValue({});
  const db={collection:(name:string)=>({
    find:(query:any)=>{(queries[name] ||= []).push(query); const cursor:any={sort:()=>cursor,limit:()=>cursor,toArray:async()=>docs[name]};return cursor;},
    findOne:jest.fn().mockResolvedValue({_id:id}),
    aggregate:()=>({toArray:async()=>docs[name]}),updateOne:updates,
  })};
  return {service:new RecommendationsService({db} as any),docs,queries,updates};
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
});
