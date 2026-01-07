import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/auth.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UpdateSepayConfigDto } from './dto/update-sepay-config.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.getAllUsers(parseInt(page), parseInt(limit));
  }

  @Get('organizers')
  async getAllOrganizers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.getAllOrganizers(parseInt(page), parseInt(limit));
  }

  @Get('events')
  async getAllEvents(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.getAllEvents(parseInt(page), parseInt(limit));
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() updateDto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, updateDto);
  }

  @Post('organizers/:id/sepay-config')
  @HttpCode(HttpStatus.OK)
  async updateSepayConfig(
    @Param('id') organizerId: string,
    @Body() updateDto: UpdateSepayConfigDto,
  ) {
    return this.adminService.updateSepayConfig(organizerId, updateDto);
  }

  @Get('organizers/:id/sepay-config')
  async getSepayConfig(@Param('id') organizerId: string) {
    return this.adminService.getSepayConfig(organizerId);
  }

  @Get('organizers/:id/revenue')
  async getOrganizerRevenue(
    @Param('id') organizerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.adminService.getOrganizerRevenue(organizerId, start, end);
  }
}
