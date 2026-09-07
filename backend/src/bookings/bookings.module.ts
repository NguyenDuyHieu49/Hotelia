import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingStateService } from './booking-state.service';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { HotelsModule } from '../hotels/hotels.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    forwardRef(() => HotelsModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingStateService],
  exports: [BookingsService, BookingStateService],
})
export class BookingsModule {}
