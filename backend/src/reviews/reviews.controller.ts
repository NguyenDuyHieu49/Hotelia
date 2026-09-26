import { IsString, MinLength, MaxLength } from 'class-validator';
class ReplyReviewDto { @IsString() @MinLength(2) @MaxLength(2000) reply:string; }
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('hotel/:hotelId')
  @ApiOperation({ summary: 'Get reviews for a hotel' })
  async findByHotel(
    @Param('hotelId') hotelId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findByHotel(hotelId, page, limit);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a review' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Get('owner')
  owner(@CurrentUser('sub') user:string) {return this.reviewsService.ownerReviews(user);}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/reply')
  reply(@Param('id') id:string,@CurrentUser('sub') user:string,@Body() dto:ReplyReviewDto) {return this.reviewsService.reply(id,user,dto.reply);}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-reviews')
  @ApiOperation({ summary: 'Get my reviews' })
  async findMyReviews(@CurrentUser('sub') userId: string) {
    return this.reviewsService.findByUser(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':id/hide')
  @ApiOperation({ summary: 'Hide a review (admin)' })
  async hideReview(@Param('id') id: string) {
    return this.reviewsService.hideReview(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark review as helpful' })
  async helpful(@Param('id') id: string,@CurrentUser('sub') userId:string) {
    return this.reviewsService.helpful(id,userId);
  }
}
