import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my bookings' })
  async findMyBookings(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string
  ) {
    return this.bookingsService.findByUser(userId, status as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  async findById(@Param('id') id: string) {
    return this.bookingsService.findById(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CancelBookingDto
  ) {
    return this.bookingsService.cancel(id, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/check-in')
  @ApiOperation({ summary: 'Check in guest' })
  async checkIn(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.bookingsService.checkIn(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/check-out')
  @ApiOperation({ summary: 'Check out guest' })
  async checkOut(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.bookingsService.checkOut(id, userId);
  }
}
