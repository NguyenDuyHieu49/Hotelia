import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { HotelsService } from '../hotels/hotels.service';
import { objectId } from '../account/account.module';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private hotelsService: HotelsService,
    @InjectConnection() private connection:Connection,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<ReviewDocument> {
    const session=await this.connection.startSession();
    let saved:ReviewDocument;
    try {
      await session.withTransaction(async()=>{
        const db=this.connection.db!;
        const booking=await db.collection('bookings').findOne({...(dto.bookingId?{_id:new Types.ObjectId(dto.bookingId)}:{}),userId:new Types.ObjectId(userId),hotelId:new Types.ObjectId(dto.hotelId),status:{$in:['CHECKED_OUT','COMPLETED']}},{session});
        if(!booking) throw new ForbiddenException('Chỉ có thể đánh giá sau khi hoàn tất lưu trú');
        const hotel=await db.collection('hotels').findOneAndUpdate({_id:new Types.ObjectId(dto.hotelId)},{$inc:{reviewVersion:1}},{session});
        if(!hotel) throw new NotFoundException('Hotel not found');
        const existing=await this.reviewModel.findOne({userId:new Types.ObjectId(userId),hotelId:hotel._id}).session(session);
        if(existing) throw new ForbiddenException('Bạn đã đánh giá khách sạn này');
        [saved]=await this.reviewModel.create([{...dto,userId:new Types.ObjectId(userId),hotelId:hotel._id,bookingId:booking._id}],{session});
        const stats=await this.reviewModel.aggregate([{$match:{hotelId:hotel._id,isVisible:true}},{$group:{_id:null,count:{$sum:1},rating:{$avg:'$rating'}}}]).session(session);
        await db.collection('hotels').updateOne({_id:hotel._id},{$set:{reviewCount:stats[0]?.count || 0,averageRating:stats[0]?.rating || 0}},{session});
      });
    } finally {await session.endSession();}
    return saved!;
  }

  async findByHotel(hotelId: string, page = 1, limit = 20): Promise<{ reviews: any[]; total: number }> {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.reviewModel.find({ hotelId: new Types.ObjectId(hotelId), isVisible: true })
        .populate('userId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.reviewModel.countDocuments({ hotelId: new Types.ObjectId(hotelId), isVisible: true }),
    ]);
    return { reviews:reviews.map(review=>{const data=review.toObject();const author=data.userId as any;return {...data,userId:String(author?._id || author),userName:author?.name};}), total };
  }

  async findByUser(userId: string): Promise<ReviewDocument[]> {
    return this.reviewModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  async ownerReviews(userId:string) {
    const hotels=await this.connection.db!.collection('hotels').find({ownerId:new Types.ObjectId(userId)}).toArray();
    return this.reviewModel.find({hotelId:{$in:hotels.map(h=>h._id)}}).populate('userId','name avatar').sort({createdAt:-1});
  }
  async reply(id:string,userId:string,reply:string) {
    const review=await this.reviewModel.findById(id);
    if(!review) throw new NotFoundException('Review not found');
    const hotel=await this.hotelsService.findById(String(review.hotelId));
    if(String(hotel.ownerId)!==userId) throw new ForbiddenException('Not your hotel');
    return this.reviewModel.findByIdAndUpdate(id,{$set:{ownerReply:reply.trim()}},{new:true});
  }

  async hideReview(reviewId: string): Promise<ReviewDocument> {
    const session=await this.connection.startSession();
    let updated:ReviewDocument;
    try {
      await session.withTransaction(async()=>{
        const review=await this.reviewModel.findById(reviewId).session(session);
        if(!review) throw new NotFoundException('Review not found');
        const db=this.connection.db!;
        await db.collection('hotels').updateOne({_id:review.hotelId},{$inc:{reviewVersion:1}},{session});
        review.isVisible=false;
        updated=await review.save({session});
        const stats=await this.reviewModel.aggregate([{$match:{hotelId:review.hotelId,isVisible:true}},{$group:{_id:null,count:{$sum:1},rating:{$avg:'$rating'}}}]).session(session);
        await db.collection('hotels').updateOne({_id:review.hotelId},{$set:{reviewCount:stats[0]?.count || 0,averageRating:stats[0]?.rating || 0}},{session});
      });
    } finally {await session.endSession();}
    return updated!;
  }

  async helpful(reviewId: string,userId:string): Promise<ReviewDocument> {
    const id=objectId(reviewId);
    const review=await this.reviewModel.findById(id);
    if(!review || !review.isVisible) throw new NotFoundException('Review not found');
    if(String(review.userId)===userId) throw new ForbiddenException('Không thể đánh dấu đánh giá của chính mình');
    const voteId=`${userId}:${reviewId}`;
    try {
      const result=await this.connection.db!.collection('review_helpful_votes').updateOne({_id:voteId as any},{$setOnInsert:{reviewId:id,userId:objectId(userId),createdAt:new Date()}},{upsert:true});
      if(result.upsertedCount) return this.reviewModel.findByIdAndUpdate(id,{$inc:{helpfulCount:1}},{new:true}) as Promise<ReviewDocument>;
    } catch(error:any) {
      if(error?.code!==11000) throw error;
    }
    return this.reviewModel.findById(id) as Promise<ReviewDocument>;
  }
}
