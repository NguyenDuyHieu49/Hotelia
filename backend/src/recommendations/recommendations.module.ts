import { Module, Injectable, ExecutionContext, Controller, Get, Post, Delete, Query, Body, Req, UseGuards, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { IsUUID, IsOptional, IsString, MaxLength, IsInt, Min, Max, IsMongoId } from 'class-validator';
import { Candidate, Signal, cityKey, normalize, rank } from './ranking';
import { CatalogFilter, eligibleRooms, hasRoomFilter } from '../hotels/catalog-filter';

export class RecommendationQuery extends CatalogFilter {
  @IsUUID() sessionId: string;
  @IsOptional() @IsString() @MaxLength(100) destination?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}
export class ViewEvent {
  @IsUUID() sessionId: string;
  @IsMongoId() hotelId: string;
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
  }
  private actor(sessionId: string, userId?: string) { return userId ? `user:${userId}` : `session:${sessionId}`; }
  async record(dto: ViewEvent, userId?: string) {
    const db = this.connection.db!;
    const hotel = await db.collection('hotels').findOne({_id:new Types.ObjectId(dto.hotelId),status:'PUBLISHED'},{projection:{_id:1}});
    if(!hotel) throw new NotFoundException('Hotel not found');
    // One document per actor/property; reopening a screen cannot inflate counts.
    const actor = this.actor(dto.sessionId,userId);
    await db.collection('recommendation_views').updateOne({_id:`${actor}:${dto.hotelId}` as any},
      {$set:{actor,hotelId:hotel._id,viewedAt:new Date()}},{upsert:true});
    return {recorded:true};
  }
  async clear(sessionId: string, userId?: string) {
    await this.connection.db!.collection('recommendation_views').deleteMany({actor:this.actor(sessionId,userId)});
    return {cleared:true};
  }
  async recommend(dto: RecommendationQuery, userId?: string) {
    const db=this.connection.db!;
    const since=new Date(Date.now()-90*86400000);
    const [hotels,prices,views,bookings] = await Promise.all([
      db.collection('hotels').find({status:'PUBLISHED'}).toArray(),
      db.collection('roomtypes').aggregate([{$match:{isActive:true,basePrice:{$gt:0}}},{$group:{_id:'$hotelId',price:{$min:'$basePrice'}}}]).toArray(),
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
    return {hotels:ranked.slice(0,dto.limit||20).map(r=>({...documents.get(r.hotel.id),minPrice:r.hotel.price,recommendationReason:r.reason})),total:filtered.length,
      ranking:{mode:signals.length?'content':'discovery',version:'content-v1',personalized:signals.length>0,signalCount:signals.length,
        description:signals.length?'Dựa trên khách sạn bạn đã xem và booking đã xác nhận':'Khám phá các khách sạn khi chưa có lịch sử',modelUsed:false}};
  }
}
@Controller('recommendations')
@UseGuards(OptionalRecommendationAuth)
export class RecommendationsController {
  constructor(private readonly service:RecommendationsService) {}
  @Get() list(@Query() dto:RecommendationQuery,@Req() req:any) {return this.service.recommend(dto,req.user?.sub);}
  @Post('views') view(@Body() dto:ViewEvent,@Req() req:any) {return this.service.record(dto,req.user?.sub);}
  @Delete('views') clear(@Query() dto:RecommendationQuery,@Req() req:any) {return this.service.clear(dto.sessionId,req.user?.sub);}
}
@Module({controllers:[RecommendationsController],providers:[RecommendationsService,OptionalRecommendationAuth]})
export class RecommendationsModule {}
