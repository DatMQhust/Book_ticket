import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SeatMapEntity } from './entities/seat-map.entity';
import { EventEntity } from '../events/entities/event.entity';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { TicketTypeEntity } from '../ticket-type/entities/ticket-type.entity';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { SaveSeatMapDto } from './dto/save-seatmap.dto';

@Injectable()
export class SeatMapService {
  constructor(
    @InjectRepository(SeatMapEntity)
    private readonly seatMapRepository: Repository<SeatMapEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(OrganizerEntity)
    private readonly organizerRepository: Repository<OrganizerEntity>,
    @InjectRepository(TicketTypeEntity)
    private readonly ticketTypeRepository: Repository<TicketTypeEntity>,
    @InjectRepository(EventSessionEntity)
    private readonly sessionRepository: Repository<EventSessionEntity>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Tìm organizer + verify event ownership
   */
  private async verifyOwnership(userId: string, eventId: string) {
    const organizer = await this.organizerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!organizer) {
      throw new NotFoundException('Không tìm thấy hồ sơ ban tổ chức');
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizer: { id: organizer.id } },
    });
    if (!event) {
      throw new NotFoundException(
        'Không tìm thấy sự kiện hoặc bạn không có quyền',
      );
    }

    return { organizer, event };
  }

  /**
   * Validate tất cả ticketTypeId trong zones thuộc event
   */
  private async validateTicketTypeIds(
    eventId: string,
    ticketTypeIds: string[],
  ) {
    if (ticketTypeIds.length === 0) return;

    const sessions = await this.sessionRepository.find({
      where: { event: { id: eventId } },
      select: ['id'],
    });
    const sessionIds = sessions.map((s) => s.id);

    const validTicketTypes = await this.ticketTypeRepository.find({
      where: [
        { event: { id: eventId } },
        ...(sessionIds.length > 0 ? [{ session: { id: In(sessionIds) } }] : []),
      ],
      select: ['id'],
    });

    const validIds = new Set(validTicketTypes.map((tt) => tt.id));
    const invalidIds = ticketTypeIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Loại vé không hợp lệ: ${invalidIds.join(', ')}`,
      );
    }

    const uniqueIds = new Set(ticketTypeIds);
    if (uniqueIds.size !== ticketTypeIds.length) {
      throw new BadRequestException(
        'Không được gán cùng loại vé cho nhiều zone',
      );
    }
  }

  async saveSeatMap(
    userId: string,
    eventId: string,
    dto: SaveSeatMapDto,
    bgFile?: Express.Multer.File,
  ) {
    const { event } = await this.verifyOwnership(userId, eventId);

    const ticketTypeIds = dto.zones.map((z) => z.ticketTypeId);
    await this.validateTicketTypeIds(eventId, ticketTypeIds);

    let bgUrl: string | null = null;
    if (bgFile) {
      const result = await this.cloudinaryService.uploadImage(
        bgFile,
        'events/seatmaps',
      );
      bgUrl = result.secure_url;
    }

    let seatMap = await this.seatMapRepository.findOne({
      where: { event: { id: eventId } },
    });

    if (seatMap) {
      seatMap.canvasWidth = dto.canvasWidth;
      seatMap.canvasHeight = dto.canvasHeight;
      seatMap.stageElements = dto.stageElements;
      seatMap.zones = dto.zones;
      if (bgUrl) seatMap.bgUrl = bgUrl;
    } else {
      seatMap = this.seatMapRepository.create({
        event: { id: eventId } as EventEntity,
        canvasWidth: dto.canvasWidth,
        canvasHeight: dto.canvasHeight,
        stageElements: dto.stageElements,
        zones: dto.zones,
        bgUrl,
      });
    }

    await this.seatMapRepository.save(seatMap);
    return { message: 'Lưu sơ đồ thành công' };
  }

  async getSeatMap(eventId: string) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    const seatMap = await this.seatMapRepository.findOne({
      where: { event: { id: eventId } },
    });

    const sessions = await this.sessionRepository.find({
      where: { event: { id: eventId } },
      select: ['id'],
    });
    const sessionIds = sessions.map((s) => s.id);

    const ticketTypes = await this.ticketTypeRepository.find({
      where: [
        { event: { id: eventId } },
        ...(sessionIds.length > 0 ? [{ session: { id: In(sessionIds) } }] : []),
      ],
      select: ['id', 'name', 'price', 'quantity', 'sold', 'status'],
    });

    return {
      seatMap: seatMap
        ? {
            bgUrl: seatMap.bgUrl,
            canvasWidth: seatMap.canvasWidth,
            canvasHeight: seatMap.canvasHeight,
            stageElements: seatMap.stageElements,
            zones: seatMap.zones,
          }
        : null,
      ticketTypes,
    };
  }

  async deleteSeatMap(userId: string, eventId: string) {
    await this.verifyOwnership(userId, eventId);

    const seatMap = await this.seatMapRepository.findOne({
      where: { event: { id: eventId } },
    });
    if (!seatMap) {
      throw new NotFoundException('Không tìm thấy sơ đồ');
    }

    await this.seatMapRepository.remove(seatMap);
    return { message: 'Đã xóa sơ đồ' };
  }
}
