import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CollaboratorEntity } from './entities/collaborator.entity';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { EventEntity } from '../events/entities/event.entity';
import { MailService } from '../mail/mail.service';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';

@Injectable()
export class CollaboratorsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CollaboratorEntity)
    private readonly collaboratorRepo: Repository<CollaboratorEntity>,
    @InjectRepository(OrganizerEntity)
    private readonly organizerRepo: Repository<OrganizerEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Tìm OrganizerEntity theo userId, throw nếu không tìm thấy
   */
  private async getOrganizerByUserId(userId: string): Promise<OrganizerEntity> {
    const organizer = await this.organizerRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!organizer) {
      throw new NotFoundException('Không tìm thấy hồ sơ organizer của bạn.');
    }
    return organizer;
  }

  /**
   * Mời CTV — tạo tài khoản nếu email chưa tồn tại
   */
  async inviteCollaborator(
    organizerUserId: string,
    dto: InviteCollaboratorDto,
  ): Promise<CollaboratorEntity> {
    const organizer = await this.getOrganizerByUserId(organizerUserId);

    // Validate tất cả assignedEventIds thuộc organizer này
    const events = await this.eventRepo.find({
      where: { organizer: { id: organizer.id } },
      select: ['id', 'name'],
    });
    const orgEventIds = events.map((e) => e.id);
    const invalidIds = dto.assignedEventIds.filter(
      (id) => !orgEventIds.includes(id),
    );
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Các sự kiện không thuộc quyền quản lý của bạn: ${invalidIds.join(', ')}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let ctv = await queryRunner.manager.findOne(UserEntity, {
        where: { email: dto.email },
      });

      let tempPassword: string | undefined;

      if (!ctv) {
        // Tạo tài khoản mới cho CTV
        tempPassword = crypto.randomBytes(8).toString('hex');
        const hashed = await bcrypt.hash(tempPassword, 10);
        ctv = queryRunner.manager.create(UserEntity, {
          name: dto.email.split('@')[0],
          email: dto.email,
          password: hashed,
          role: UserRole.COLLABORATOR,
        });
        await queryRunner.manager.save(ctv);
      } else {
        // Nếu đã có tài khoản — nâng role lên COLLABORATOR (chỉ nếu đang là USER)
        if (ctv.role === UserRole.ORGANIZER || ctv.role === UserRole.ADMIN) {
          throw new BadRequestException(
            `Người dùng "${dto.email}" đang có role ${ctv.role}, không thể thêm làm CTV.`,
          );
        }
        if (ctv.role === UserRole.USER) {
          ctv.role = UserRole.COLLABORATOR;
          await queryRunner.manager.save(ctv);
        }
        // Nếu đã là COLLABORATOR → giữ nguyên role
      }

      // Kiểm tra CollaboratorEntity đã tồn tại chưa
      let collaborator = await queryRunner.manager.findOne(CollaboratorEntity, {
        where: {
          user: { id: ctv.id },
          organizer: { id: organizer.id },
        },
        relations: ['user', 'organizer'],
      });

      if (collaborator) {
        // Kích hoạt lại + cập nhật danh sách event
        collaborator.isActive = true;
        collaborator.assignedEventIds = dto.assignedEventIds;
        await queryRunner.manager.save(collaborator);
      } else {
        // Tạo mới
        collaborator = queryRunner.manager.create(CollaboratorEntity, {
          user: ctv,
          organizer,
          assignedEventIds: dto.assignedEventIds,
          isActive: true,
        });
        await queryRunner.manager.save(collaborator);
      }

      await queryRunner.commitTransaction();

      // Gửi email invitation
      const assignedEventNames = events
        .filter((e) => dto.assignedEventIds.includes(e.id))
        .map((e) => e.name);

      try {
        await this.mailService.sendCollaboratorInvitation({
          to: dto.email,
          collaboratorName: ctv.name,
          organizerName: organizer.name,
          eventNames: assignedEventNames,
          loginEmail: dto.email,
          tempPassword,
        });
      } catch (err) {
        console.error('Không gửi được email mời CTV:', err);
      }

      return this.collaboratorRepo.findOne({
        where: { id: collaborator.id },
        relations: ['user', 'organizer'],
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lấy danh sách CTV của organizer hiện tại
   */
  async getCollaborators(organizerUserId: string): Promise<CollaboratorEntity[]> {
    const organizer = await this.getOrganizerByUserId(organizerUserId);

    return this.collaboratorRepo.find({
      where: { organizer: { id: organizer.id }, isActive: true },
      relations: ['user'],
      order: { invitedAt: 'DESC' },
    });
  }

  /**
   * Cập nhật quyền (assignedEventIds) hoặc trạng thái CTV
   */
  async updateCollaborator(
    organizerUserId: string,
    collaboratorId: string,
    dto: UpdateCollaboratorDto,
  ): Promise<CollaboratorEntity> {
    const organizer = await this.getOrganizerByUserId(organizerUserId);
    const collaborator = await this.findAndVerifyOwnership(
      collaboratorId,
      organizer.id,
    );

    if (dto.assignedEventIds !== undefined) {
      // Validate các eventId mới cũng thuộc organizer
      const events = await this.eventRepo.find({
        where: { organizer: { id: organizer.id } },
        select: ['id'],
      });
      const orgEventIds = events.map((e) => e.id);
      const invalidIds = dto.assignedEventIds.filter(
        (id) => !orgEventIds.includes(id),
      );
      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Các sự kiện không thuộc quyền quản lý của bạn: ${invalidIds.join(', ')}`,
        );
      }
      collaborator.assignedEventIds = dto.assignedEventIds;
    }

    if (dto.isActive !== undefined) {
      collaborator.isActive = dto.isActive;

      // Nếu vô hiệu hoá: kiểm tra CTV có còn hợp lệ cho organizer nào không
      if (!dto.isActive) {
        await this.revokeRoleIfNoActiveCollaboration(collaborator.user.id);
      }
    }

    return this.collaboratorRepo.save(collaborator);
  }

  /**
   * Thu hồi quyền CTV hoàn toàn (xoá record)
   */
  async removeCollaborator(
    organizerUserId: string,
    collaboratorId: string,
  ): Promise<void> {
    const organizer = await this.getOrganizerByUserId(organizerUserId);
    const collaborator = await this.findAndVerifyOwnership(
      collaboratorId,
      organizer.id,
    );

    const ctvUserId = collaborator.user.id;
    await this.collaboratorRepo.remove(collaborator);

    // Nếu user không còn làm CTV cho bất kỳ organizer nào → hạ role về USER
    await this.revokeRoleIfNoActiveCollaboration(ctvUserId);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findAndVerifyOwnership(
    collaboratorId: string,
    organizerId: string,
  ): Promise<CollaboratorEntity> {
    const collaborator = await this.collaboratorRepo.findOne({
      where: { id: collaboratorId },
      relations: ['user', 'organizer'],
    });

    if (!collaborator) {
      throw new NotFoundException(
        `Không tìm thấy CTV với ID "${collaboratorId}".`,
      );
    }

    if (collaborator.organizer.id !== organizerId) {
      throw new ForbiddenException('Bạn không có quyền quản lý CTV này.');
    }

    return collaborator;
  }

  /**
   * Hạ role COLLABORATOR → USER nếu user không còn bất kỳ
   * CollaboratorEntity active nào
   */
  private async revokeRoleIfNoActiveCollaboration(
    userId: string,
  ): Promise<void> {
    const remaining = await this.collaboratorRepo.count({
      where: { user: { id: userId }, isActive: true },
    });

    if (remaining === 0) {
      await this.userRepo.update({ id: userId }, { role: UserRole.USER });
    }
  }
}
