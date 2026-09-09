import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  async getUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getAllUsers(page, limit);
  }

  @Get('owners/pending')
  @ApiOperation({ summary: 'Get pending owner applications' })
  async getPendingOwners() {
    return this.adminService.getPendingOwners();
  }

  @Post('owners/:id/approve')
  @ApiOperation({ summary: 'Approve owner application' })
  async approveOwner(@Param('id') id: string) {
    return this.adminService.approveOwner(id);
  }

  @Post('owners/:id/reject')
  @ApiOperation({ summary: 'Reject owner application' })
  async rejectOwner(@Param('id') id: string) {
    return this.adminService.rejectOwner(id);
  }

  @Get('hotels/pending')
  @ApiOperation({ summary: 'Get pending hotel approvals' })
  async getPendingHotels() {
    return this.adminService.getPendingHotels();
  }

  @Post('hotels/:id/approve')
  @ApiOperation({ summary: 'Approve hotel' })
  async approveHotel(@Param('id') id: string) {
    return this.adminService.approveHotel(id);
  }

  @Post('hotels/:id/reject')
  @ApiOperation({ summary: 'Reject hotel' })
  async rejectHotel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.rejectHotel(id, reason);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend user' })
  async suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Post('users/:id/activate')
  @ApiOperation({ summary: 'Activate user' })
  async activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }
}
