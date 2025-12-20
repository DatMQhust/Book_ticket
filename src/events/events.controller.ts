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
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Public, Roles } from 'src/auth/decorators/auth.decorator';
import { UserRole } from 'src/users/entities/user.entity';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ParseEventDataPipe } from 'src/core/pipes/parse-event-data.pipe';
import { CreateEventDto } from './dto/create-event.dto';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { Throttle } from '@nestjs/throttler';
@Controller('events')
export class EventsController {
  constructor(private readonly eventService: EventsService) {}

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
}
