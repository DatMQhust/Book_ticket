// src/event/event.controller.ts
import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { EventService } from './events.service';
import { Roles } from 'src/auth/decorators/auth.decorator';
import { UserRole } from 'src/users/entities/user.entity';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ParseEventDataPipe } from 'src/core/pipes/parse-event-data.pipe';
import { CreateEventDto } from './dto/create-event.dto';
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('create')
  @Roles(UserRole.ORGANIZER)
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

    // 3. Gọi Service
    return this.eventService.createEvent(
      createEventDto,
      files.bannerImage[0],
      files.mainImage[0],
      userId,
    );
  }
}
