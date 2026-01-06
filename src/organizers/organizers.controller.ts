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
} from '@nestjs/common';
import { OrganizersService } from './organizers.service';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { UpdateOrganizerDto } from './dto/update-organizer.dto';
import { UpdateEventDto } from '../events/dto/update-event.dto';

@Controller('organizers')
export class OrganizersController {
  constructor(private readonly organizersService: OrganizersService) {}

  @Post()
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
  update(
    @Param('id') id: string,
    @Body() updateOrganizerDto: UpdateOrganizerDto,
  ) {
    return this.organizersService.update(id, updateOrganizerDto);
  }

  @Delete(':id')
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
