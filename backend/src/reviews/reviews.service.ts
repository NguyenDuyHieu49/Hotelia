import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { HotelsService } from '../hotels/hotels.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private hotelsService: HotelsService,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<ReviewDocument> {
    // Check if user already reviewed this hotel
    const existing = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      hotelId: new Types.ObjectId(dto.hotelId),
    });
    if (existing) throw new ForbiddenException('You already reviewed this hotel');

    const review = new this.reviewModel({
      hotelId: new Types.ObjectId(dto.hotelId),
      userId: new Types.ObjectId(userId),
      bookingId: dto.bookingId ? new Types.ObjectId(dto.bookingId) : undefined,
      rating: dto.rating,
      title: dto.title,
      content: dto.content,
    });

    const saved = await review.save();

    // Update hotel rating
    await this.hotelsService.updateRating(dto.hotelId, dto.rating);

    return saved;
  }

  async findByHotel(hotelId: string, page = 1, limit = 20): Promise<{ reviews: ReviewDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.reviewModel.find({ hotelId: new Types.ObjectId(hotelId), isVisible: true })
        .populate('userId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.reviewModel.countDocuments({ hotelId: new Types.ObjectId(hotelId), isVisible: true }),
    ]);
    return { reviews, total };
  }

  async findByUser(userId: string): Promise<ReviewDocument[]> {
    return this.reviewModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  async hideReview(reviewId: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');
    review.isVisible = false;
    return review.save();
  }

  async helpful(reviewId: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');
    review.helpfulCount += 1;
    return review.save();
  }
}
