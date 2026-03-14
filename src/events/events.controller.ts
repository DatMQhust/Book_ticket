import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  Request,
  BadRequestException,
  Get,
  Param,
  Query,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Public, Roles } from 'src/auth/decorators/auth.decorator';
import { UserRole } from 'src/users/entities/user.entity';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ParseEventDataPipe } from 'src/core/pipes/parse-event-data.pipe';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { Throttle } from '@nestjs/throttler';
import { AddTicketTypeToEventDto } from './dto/add-ticket-type.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly eventService: EventsService) {}

  @Get('organizer/my')
  @Roles(UserRole.ORGANIZER)
  getOrganizerEvents(@Request() req) {
    return this.eventService.getOrganizerEvents(req.user.id);
  }

  @Get()
  @Public()
  getEvents(@Query() query: GetEventsQueryDto) {
    return this.eventService.getEvents(query);
  }

  @Get('featured')
  @Public()
  getFeaturedEvents(@Query() query: GetEventsQueryDto) {
    return this.eventService.getFeaturedEvents(query);
  }

  @Post('create')
  @Roles(UserRole.ORGANIZER)
  @Throttle({ default: { limit: 1, ttl: 10000 } })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bannerImage', maxCount: 1 },
      { name: 'mainImage', maxCount: 1 },
    ]),
  )
  async create(
    @Body('data', ParseEventDataPipe) createEventDto: CreateEventDto,
    @UploadedFiles()
    files: {
      bannerImage?: Express.Multer.File[];
      mainImage?: Express.Multer.File[];
    },
    @Request() req,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new BadRequestException('Cannot find user.');
    }
    if (!files.bannerImage || !files.mainImage) {
      throw new BadRequestException(
        'Banner image and main image are required.',
      );
    }

    return this.eventService.createEvent(
      createEventDto,
      files.bannerImage[0],
      files.mainImage[0],
      userId,
    );
  }

  @Get(':id')
  @Public()
  async getEventDetail(@Param('id') id: string) {
    return this.eventService.getEventDetail(id);
  }

  @Patch(':id/submit')
  @Roles(UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  submitForReview(@Param('id') id: string, @Request() req) {
    return this.eventService.submitForReview(id, req.user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ORGANIZER)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bannerImage', maxCount: 1 },
      { name: 'mainImage', maxCount: 1 },
    ]),
  )
  async updateEvent(
    @Param('id') id: string,
    @Body('data', ParseEventDataPipe) updateEventDto: UpdateEventDto,
    @UploadedFiles()
    files: {
      bannerImage?: Express.Multer.File[];
      mainImage?: Express.Multer.File[];
    },
    @Request() req,
  ) {
    return this.eventService.updateEvent(
      id,
      req.user.id,
      updateEventDto,
      files?.bannerImage?.[0],
      files?.mainImage?.[0],
    );
  }

  @Delete(':id')
  @Roles(UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  deleteEvent(@Param('id') id: string, @Request() req) {
    return this.eventService.deleteEvent(id, req.user.id);
  }

  @Post('add-ticket-type')
  @Roles(UserRole.ORGANIZER)
  async addTicketTypeToEvent(@Body() dto: AddTicketTypeToEventDto) {
    return this.eventService.addTicketTypeToEvent(dto.eventId, {
      name: dto.name,
      price: dto.price,
      quantity: dto.quantity,
      description: dto.description,
      rank: dto.rank,
    });
  }
}
