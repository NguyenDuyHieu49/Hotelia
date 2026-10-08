import { Module, Injectable, ExecutionContext, Controller, Get, Post, Delete, Query, Body, Req, UseGuards, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { IsUUID, IsOptional, IsString, MaxLength, IsInt, Min, Max, IsMongoId, IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique } from 'class-validator';
import { Candidate, Signal, cityKey, normalize, rank } from './ranking';
import { CatalogFilter, eligibleRooms, hasRoomFilter } from '../hotels/catalog-filter';
import { presentPublicHotel } from '../hotels/public-hotel';

export class RecommendationQuery extends CatalogFilter {
  @IsUUID() sessionId: string;
  @IsOptional() @IsString() @MaxLength(100) destination?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}
export class ViewEvent {
  @IsUUID() sessionId: string;
  @IsMongoId() hotelId: string;
  @IsOptional() @IsUUID() impressionId?: string;
}
export class ImpressionEvent extends CatalogFilter {
  @IsUUID() sessionId: string;
  @IsUUID() impressionId: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(8) @ArrayUnique() @IsMongoId({ each: true }) candidateIds: string[];
  @IsOptional() @IsString() @MaxLength(100) destination?: string;
}
@Injectable()
export class OptionalRecommendationAuth extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return context.switchToHttp().getRequest().headers.authorization ? super.canActivate(context) : true;
  }
}
@Injectable()
export class RecommendationsService implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  async onModuleInit() {
    const views=this.connection.db!.collection('recommendation_views');
    await views.createIndex({actor:1,viewedAt:-1});
    await views.createIndex({viewedAt:1},{expireAfterSeconds:90*86400});
    const impressions=this.connection.db!.collection('recommendation_impressions');
    await impressions.createIndex({actor:1,rowLoadedAt:-1});
    await impressions.createIndex({expiresAt:1},{expireAfterSeconds:0});
  }
  private actor(sessionId: string, userId?: string) { return userId ? `user:${userId}` : `session:${sessionId}`; }
  async recordImpression(dto: ImpressionEvent, userId?: string) {
    const db=this.connection.db!;
    const ids=dto.candidateIds;
    if (!Array.isArray(ids) || !ids.length || ids.length>8 || new Set(ids).size!==ids.length || ids.some(id=>!Types.ObjectId.isValid(id))) {
      throw new BadRequestException('Invalid recommendation candidates');
    }
    const candidates=await db.collection('hotels').find({
      _id:{$in:ids.map(id=>new Types.ObjectId(id))},status:'PUBLISHED',
    },{projection:{_id:1,city:1}}).toArray();
    const published=new Set(candidates.map(h=>String(h._id)));
    if (ids.some(id=>!published.has(id))) throw new BadRequestException('Invalid recommendation candidates');
    const actor=this.actor(dto.sessionId,userId);
    const now=new Date();
    const requestedCity=dto.destination?.trim() ? cityKey(dto.destination.trim()) : null;
    const cities=new Set(candidates.map(h=>cityKey(typeof h.city==='string'?h.city:'')));
    // The client reports the row's ordered candidates. This is an opportunity to
    // view them, not proof that every horizontally scrolling card reached the screen.
    // Only a matching catalog city is kept; arbitrary search text is not retained.
    // Retry with the same ID cannot rewrite the order, filters, or existing outcomes.
    await db.collection('recommendation_impressions').updateOne({_id:`${actor}:${dto.impressionId}` as any},
      {$setOnInsert:{actor,impressionId:dto.impressionId,candidateIds:ids.map(id=>new Types.ObjectId(id)),
        candidatePositions:ids.map((id,index)=>({hotelId:new Types.ObjectId(id),position:index+1})),
        destinationKey:requestedCity && cities.has(requestedCity) ? requestedCity : null,
        searchTextPresent:Boolean(dto.destination?.trim()),
        filters:{checkIn:dto.checkIn||null,checkOut:dto.checkOut||null,guests:dto.guests??null,
          minPrice:dto.minPrice??null,maxPrice:dto.maxPrice??null,minRating:dto.minRating??null},
        source:'explore_recommendations',reportOrigin:'client_reported',
        eventType:'recommendation_served',cardVisibility:'unverified',
        rowLoadedAt:now,expiresAt:new Date(now.getTime()+90*86400000),
        detailOpenedHotelIds:[]}}, {upsert:true});
    return {recorded:true};
  }
  async record(dto: ViewEvent, userId?: string) {
    const db = this.connection.db!;
    const hotel = await db.collection('hotels').findOne({_id:new Types.ObjectId(dto.hotelId),status:'PUBLISHED'},{projection:{_id:1}});
    if(!hotel) throw new NotFoundException('Hotel not found');
    // One document per actor/property; reopening a screen cannot inflate counts.
    const actor = this.actor(dto.sessionId,userId);
    await db.collection('recommendation_views').updateOne({_id:`${actor}:${dto.hotelId}` as any},
      {$set:{actor,hotelId:hotel._id,viewedAt:new Date()}},{upsert:true});
    if (dto.impressionId) {
      // A detail-open is linked only to a candidate from this actor's live impression.
      await db.collection('recommendation_impressions').updateOne({
        _id:`${actor}:${dto.impressionId}` as any,actor,candidateIds:hotel._id,expiresAt:{$gt:new Date()},
      },{$addToSet:{detailOpenedHotelIds:hotel._id},$min:{[`detailOpenedAt.${dto.hotelId}`]:new Date()}});
    }
    return {recorded:true};
  }
  async clear(sessionId: string, userId?: string) {
    const actor=this.actor(sessionId,userId);
    await Promise.all([
      this.connection.db!.collection('recommendation_views').deleteMany({actor}),
      this.connection.db!.collection('recommendation_impressions').deleteMany({actor}),
    ]);
    return {cleared:true};
  }
  async recommend(dto: RecommendationQuery, userId?: string) {
    const db=this.connection.db!;
    const since=new Date(Date.now()-90*86400000);
    const [hotels,prices,views,bookings] = await Promise.all([
      db.collection('hotels').find({status:'PUBLISHED'}).toArray(),
      db.collection('roomtypes').aggregate([{$match:{isActive:true,totalRooms:{$gt:0},maxGuests:{$gte:1},basePrice:{$gt:0}}},{$group:{_id:'$hotelId',price:{$min:'$basePrice'}}}]).toArray(),
      db.collection('recommendation_views').find({actor:this.actor(dto.sessionId,userId),viewedAt:{$gte:since}}).sort({viewedAt:-1}).limit(50).toArray(),
      userId ? db.collection('bookings').find({userId:new Types.ObjectId(userId),status:{$in:['PAID','CONFIRMED','CHECKED_IN','CHECKED_OUT','COMPLETED']},createdAt:{$gte:since}}).sort({createdAt:-1}).limit(50).toArray() : Promise.resolve([]),
    ]);
    const priceMap=new Map(prices.map(p=>[String(p._id),p.price as number]));
    const candidates: Candidate[]=hotels.map(h=>({id:String(h._id),name:h.name,city:h.city,amenities:h.amenities||[],stars:h.starRating||0,rating:h.averageRating||0,reviews:h.reviewCount||0,price:priceMap.get(String(h._id))}));
    const byId=new Map(candidates.map(h=>[h.id,h]));
    const signals: Signal[]=[];
    for(const event of views) {
      const hotel=byId.get(String(event.hotelId));
      if(hotel) signals.push({hotel,weight:Math.pow(0.5,(Date.now()-new Date(event.viewedAt).getTime())/(14*86400000))});
    }
    // Verified server-side bookings carry more weight than client view events.
    const booked=new Set<string>();
    for(const booking of bookings) {
      const id=String(booking.hotelId),hotel=byId.get(id);
      if(hotel && !booked.has(id)) {signals.push({hotel,weight:3});booked.add(id);}
    }
    const destination=dto.destination?.trim();
    const rooms=hasRoomFilter(dto)?await eligibleRooms(db,dto):undefined;
    const eligible=rooms?new Set(rooms.map(r=>String(r.hotelId))):undefined;
    const filtered=candidates.filter(h=>(!eligible || eligible.has(h.id)) && (!dto.minRating || (h.reviews>0 && h.rating>=dto.minRating)) && (!destination || cityKey(h.city)===cityKey(destination) || normalize(h.city).includes(normalize(destination)) || normalize(h.name).includes(normalize(destination))));
    const ranked=rank(filtered,signals);
    const documents=new Map(hotels.map(h=>[String(h._id),h]));
    const enabledIds=new Set(prices.map(price=>String(price._id)));
    return {hotels:ranked.slice(0,dto.limit||20).map(r=>({
      ...presentPublicHotel(documents.get(r.hotel.id)!,enabledIds),
      minPrice:r.hotel.price,recommendationReason:r.reason,
    })),total:filtered.length,
      ranking:{mode:signals.length?'content':'discovery',version:'content-v1',personalized:signals.length>0,signalCount:signals.length,
        description:signals.length?'Dựa trên khách sạn bạn đã xem và booking đã xác nhận':'Khám phá các khách sạn khi chưa có lịch sử',modelUsed:false}};
  }
}
@Controller('recommendations')
@UseGuards(OptionalRecommendationAuth)
export class RecommendationsController {
  constructor(private readonly service:RecommendationsService) {}
  @Get() list(@Query() dto:RecommendationQuery,@Req() req:any) {return this.service.recommend(dto,req.user?.sub);}
  @Post('impressions') impression(@Body() dto:ImpressionEvent,@Req() req:any) {return this.service.recordImpression(dto,req.user?.sub);}
  @Post('views') view(@Body() dto:ViewEvent,@Req() req:any) {return this.service.record(dto,req.user?.sub);}
  @Delete('views') clear(@Query() dto:RecommendationQuery,@Req() req:any) {return this.service.clear(dto.sessionId,req.user?.sub);}
}
@Module({controllers:[RecommendationsController],providers:[RecommendationsService,OptionalRecommendationAuth]})
export class RecommendationsModule {}
