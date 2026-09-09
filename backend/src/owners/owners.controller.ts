import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OwnersService } from './owners.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('owners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get owner dashboard stats' })
  async getDashboard(@CurrentUser('sub') userId: string) {
    return this.ownersService.getDashboard(userId);
  }

  @Get('hotels/:hotelId/bookings')
  @ApiOperation({ summary: 'Get bookings for a hotel' })
  async getHotelBookings(
    @CurrentUser('sub') userId: string,
    @Param('hotelId') hotelId: string,
  ) {
    return this.ownersService.getHotelBookings(userId, hotelId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue by month' })
  async getRevenueByMonth(
    @CurrentUser('sub') userId: string,
    @Query('year') year?: number,
  ) {
    return this.ownersService.getRevenueByMonth(userId, year || new Date().getFullYear());
  }
}
