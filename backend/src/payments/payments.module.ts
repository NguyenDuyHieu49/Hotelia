import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forFeature([])],
  controllers: [],
  providers: [],
  exports: [],
})
export class PaymentsModule {}
