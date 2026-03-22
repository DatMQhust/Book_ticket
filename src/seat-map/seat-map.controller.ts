import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { SeatMapService } from './seat-map.service';
import { SaveSeatMapDto } from './dto/save-seatmap.dto';
import { Public, Roles } from '../auth/decorators/auth.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('seat-maps')
@ApiBearerAuth()
@Controller('events/:eventId/seatmap')
export class SeatMapController {
  constructor(private readonly seatMapService: SeatMapService) {}

  @Put()
  @Roles(UserRole.ORGANIZER)
  @UseInterceptors(FileInterceptor('seatMapBg'))
  @ApiConsumes('multipart/form-data')
  async save(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body('data') dataStr: string,
    @UploadedFile() bgFile: Express.Multer.File,
    @Request() req: any,
  ) {
    const dto: SaveSeatMapDto = JSON.parse(dataStr);
    return this.seatMapService.saveSeatMap(req.user.id, eventId, dto, bgFile);
  }

  @Get()
  @Public()
  async get(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.seatMapService.getSeatMap(eventId);
  }

  @Delete()
  @Roles(UserRole.ORGANIZER)
  async delete(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Request() req: any,
  ) {
    return this.seatMapService.deleteSeatMap(req.user.id, eventId);
  }
}
