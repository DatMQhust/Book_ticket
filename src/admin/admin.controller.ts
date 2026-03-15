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
import { Roles, User } from '../auth/decorators/auth.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UpdateSepayConfigDto } from './dto/update-sepay-config.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { ReviewEventDto } from './dto/review-event.dto';
import { ReviewCancelRequestDto } from './dto/review-cancel-request.dto';
import { ReviewChangeRequestDto } from './dto/review-change-request.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth()
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
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllOrganizers(
      parseInt(page),
      parseInt(limit),
      status,
    );
  }

  @Patch('organizers/:id/kyc')
  @HttpCode(HttpStatus.OK)
  async reviewKycApplication(
    @User() user: any,
    @Param('id') organizerId: string,
    @Body() reviewKycDto: ReviewKycDto,
  ) {
    return this.adminService.reviewKycApplication(
      user.id,
      organizerId,
      reviewKycDto,
    );
  }

  @Get('events')
  async getAllEvents(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllEvents(
      parseInt(page),
      parseInt(limit),
      status,
    );
  }

  @Get('events/cancel-requests')
  async getCancelRequests(@Query('status') status?: string) {
    return this.adminService.getCancelRequests(status);
  }

  @Patch('events/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async approveCancellation(
    @Param('id') eventId: string,
    @Body() dto: ReviewCancelRequestDto,
  ) {
    return this.adminService.approveCancellation(eventId, dto);
  }

  @Get('events/:id')
  async getEventDetail(@Param('id') eventId: string) {
    return this.adminService.getEventDetail(eventId);
  }

  @Patch('events/:id/review')
  @HttpCode(HttpStatus.OK)
  async reviewEvent(
    @User() user: any,
    @Param('id') eventId: string,
    @Body() reviewEventDto: ReviewEventDto,
  ) {
    return this.adminService.reviewEvent(eventId, user.id, reviewEventDto);
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

  @Get('events/:id/change-requests')
  async getChangeRequests(
    @Param('id') eventId: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getChangeRequests(eventId, status);
  }

  @Patch('events/:id/change-requests/:reqId/review')
  @HttpCode(HttpStatus.OK)
  async reviewChangeRequest(
    @Param('id') eventId: string,
    @Param('reqId') reqId: string,
    @Body() dto: ReviewChangeRequestDto,
  ) {
    return this.adminService.reviewChangeRequest(eventId, reqId, dto);
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
