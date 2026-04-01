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
import { CancelEventRequestDto } from './dto/cancel-event-request.dto';
import { SubmitChangeRequestDto } from './dto/submit-change-request.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventService: EventsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

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
      { name: 'venueConfirmation', maxCount: 1 },
      { name: 'performanceLicense', maxCount: 1 },
      { name: 'fireSafetyPermit', maxCount: 1 },
      { name: 'eventInsurance', maxCount: 1 },
    ]),
  )
  async create(
    @Body('data', ParseEventDataPipe) createEventDto: CreateEventDto,
    @UploadedFiles()
    files: {
      bannerImage?: Express.Multer.File[];
      mainImage?: Express.Multer.File[];
      venueConfirmation?: Express.Multer.File[];
      performanceLicense?: Express.Multer.File[];
      fireSafetyPermit?: Express.Multer.File[];
      eventInsurance?: Express.Multer.File[];
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
      {
        venueConfirmation: files.venueConfirmation?.[0],
        performanceLicense: files.performanceLicense?.[0],
        fireSafetyPermit: files.fireSafetyPermit?.[0],
        eventInsurance: files.eventInsurance?.[0],
      },
    );
  }

  @Get(':id/nonce')
  async getBookingNonce(@Param('id') eventId: string, @Request() req) {
    const userId = req.user?.id;
    const nonce = randomUUID();
    await this.redis.setex(
      `booking_nonce:${nonce}`,
      300,
      `${userId}:${eventId}`,
    );
    return { nonce };
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

  @Post(':id/cancel-request')
  @Roles(UserRole.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  submitCancelRequest(
    @Param('id') id: string,
    @Body() dto: CancelEventRequestDto,
    @Request() req,
  ) {
    return this.eventService.cancelRequest(id, req.user.id, dto);
  }

  @Get(':id/stats')
  @Roles(UserRole.ORGANIZER)
  getEventStats(@Param('id') id: string, @Request() req) {
    return this.eventService.getEventStats(id, req.user.id);
  }

  @Post(':id/change-request')
  @Roles(UserRole.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  submitChangeRequest(
    @Param('id') id: string,
    @Body() dto: SubmitChangeRequestDto,
    @Request() req,
  ) {
    return this.eventService.submitChangeRequest(id, req.user.id, dto);
  }
}
