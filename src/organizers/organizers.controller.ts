import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { OrganizersService } from './organizers.service';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { UpdateOrganizerDto } from './dto/update-organizer.dto';
import { UpdateEventDto } from '../events/dto/update-event.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, User } from '../auth/decorators/auth.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('organizers')
@ApiBearerAuth()
@Controller('organizers')
export class OrganizersController {
  constructor(private readonly organizersService: OrganizersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('submit-kyc')
  submitKyc(@User() user: any, @Body() submitKycDto: SubmitKycDto) {
    return this.organizersService.submitKyc(user.id, submitKycDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-profile')
  getMyProfile(@User() user: any) {
    return this.organizersService.getMyProfile(user.id);
  }

  // Legacy create endpoint - only admin can create organizers directly.
  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createOrganizerDto: CreateOrganizerDto) {
    return this.organizersService.createAndAssignRole(createOrganizerDto);
  }

  @Get()
  findAll() {
    return this.organizersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateOrganizerDto: UpdateOrganizerDto,
  ) {
    return this.organizersService.update(id, updateOrganizerDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.organizersService.remove(id);
  }
  @Post('/get-id-by-user')
  getOrganizerIdByUserId(@Body('userId') userId: string) {
    return this.organizersService.getOrganizerIdByUserId(userId);
  }

  @Get(':id/events')
  getEvents(@Param('id') id: string) {
    return this.organizersService.getEventsByOrganizer(id);
  }

  @Get(':id/revenue')
  @Roles(UserRole.ADMIN)
  getRevenue(@Param('id') id: string) {
    return this.organizersService.getOrganizerRevenue(id);
  }

  @Get(':id/events/:eventId')
  getEventDetail(@Param('id') id: string, @Param('eventId') eventId: string) {
    return this.organizersService.getEventDetail(id, eventId);
  }

  @Patch(':id/events/:eventId')
  updateEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.organizersService.updateEvent(id, eventId, updateEventDto);
  }

  @Delete(':id/events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEvent(@Param('id') id: string, @Param('eventId') eventId: string) {
    return this.organizersService.deleteEvent(id, eventId);
  }
}
