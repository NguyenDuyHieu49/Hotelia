import { Body, Controller, ForbiddenException, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create or reuse a payOS checkout for a booking' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(userId, dto);
  }

  @Public()
  @Post('webhooks/payos')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive and verify a payOS webhook' })
  webhook(@Body() body: unknown) {
    return this.paymentsService.handlePayOSWebhook(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get my payments' })
  findMyPayments(@CurrentUser('sub') userId: string) {
    return this.paymentsService.findByUser(userId);
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get payment by booking ID' })
  async findByBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const payment = await this.paymentsService.findByBooking(bookingId);
    if (payment && String(payment.userId) !== userId) {
      throw new ForbiddenException('Not your payment');
    }
    return payment;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async findById(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const payment = await this.paymentsService.findById(id);
    if (String(payment.userId) !== userId) throw new ForbiddenException('Not your payment');
    return payment;
  }
}
