import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoomTypesService } from './room-types.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('room-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller('room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Post('hotel/:hotelId')
  @ApiOperation({ summary: 'Create room type' })
  async create(
    @Param('hotelId') hotelId: string,
    @CurrentUser('sub') userId: string,
    @Body() data: any,
  ) {
    return this.roomTypesService.createRoomType(userId, hotelId, data);
  }

  @Get('hotel/:hotelId')
  @ApiOperation({ summary: 'Get room types by hotel' })
  async findByHotel(@Param('hotelId') hotelId: string) {
    return this.roomTypesService.findByHotel(hotelId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update room type' })
  async update(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body() data: any) {
    return this.roomTypesService.updateRoomType(userId, id, data);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get availability for date range' })
  async getAvailability(
    @Param('id') id: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.roomTypesService.getAvailability(id, new Date(start), new Date(end));
  }
}
