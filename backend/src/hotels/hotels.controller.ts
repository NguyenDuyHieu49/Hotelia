import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HotelsService } from './hotels.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { SearchHotelsDto } from './dto/search-hotels.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';

@ApiTags('hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search hotels' })
  async search(@Query() dto: SearchHotelsDto) {
    const { hotels, total } = await this.hotelsService.search(dto);
    return { hotels, total };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get hotel by ID' })
  async findById(@Param('id') id: string) {
    return this.hotelsService.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new hotel' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateHotelDto) {
    return this.hotelsService.create(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Get('owner/my-hotels')
  @ApiOperation({ summary: 'Get my hotels' })
  async findMyHotels(@CurrentUser('sub') userId: string) {
    return this.hotelsService.findByOwner(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Update hotel' })
  async update(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body() dto: UpdateHotelDto) {
    return this.hotelsService.update(id, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit hotel for approval' })
  async submit(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.hotelsService.submitForApproval(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete hotel' })
  async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    await this.hotelsService.delete(id, userId);
    return { message: 'Hotel deleted' };
  }
}
