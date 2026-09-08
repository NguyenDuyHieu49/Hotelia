import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create payment for booking' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my payments' })
  async findMyPayments(@CurrentUser('sub') userId: string) {
    return this.paymentsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async findById(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get payment by booking ID' })
  async findByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentsService.findByBooking(bookingId);
  }

  @Public()
  @Post('callback/:method')
  @ApiOperation({ summary: 'Payment callback from provider' })
  async callback(@Param('method') method: string, @Body() body: any) {
    // In production, verify signature and process callback
    if (body.transactionId) {
      return this.paymentsService.confirm(body.transactionId);
    }
    return { message: 'Callback received' };
  }
}
