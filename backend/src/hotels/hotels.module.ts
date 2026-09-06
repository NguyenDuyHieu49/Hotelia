import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HotelsController } from './hotels.controller';
import { HotelsService } from './hotels.service';
import { Hotel, HotelSchema } from './schemas/hotel.schema';
import { RoomType, RoomTypeSchema } from './schemas/room-type.schema';
import { RoomAvailability, RoomAvailabilitySchema } from './schemas/room-availability.schema';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';
import { BookingsModule } from '../bookings/bookings.module';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hotel.name, schema: HotelSchema },
      { name: RoomType.name, schema: RoomTypeSchema },
      { name: RoomAvailability.name, schema: RoomAvailabilitySchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
    forwardRef(() => BookingsModule),
  ],
  controllers: [HotelsController, RoomTypesController],
  providers: [HotelsService, RoomTypesService],
  exports: [HotelsService, RoomTypesService],
})
export class HotelsModule {}
