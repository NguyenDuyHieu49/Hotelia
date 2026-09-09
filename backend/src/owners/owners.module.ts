import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';
import { Hotel, HotelSchema } from '../hotels/schemas/hotel.schema';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hotel.name, schema: HotelSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}
