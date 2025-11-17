import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { OrganizerEntity } from './entities/organizer.entity';

@Injectable()
export class OrganizersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrganizerEntity)
    private readonly organizersRepository: Repository<OrganizerEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async createAndAssignRole(
    createOrganizerDto: CreateOrganizerDto,
  ): Promise<OrganizerEntity> {
    const { userId, name, description } = createOrganizerDto;

    // Sử dụng queryRunner để quản lý transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(UserEntity, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User với ID "${userId}" không tồn tại.`);
      }

      if (user.role === UserRole.ORGANIZER) {
        throw new BadRequestException('User này đã là một organizer.');
      }
      const newOrganizer = this.organizersRepository.create({
        user: user,
        name: name,
        description: description,
      });
      const savedOrganizer = await queryRunner.manager.save(newOrganizer);

      user.role = UserRole.ORGANIZER;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      return savedOrganizer;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<OrganizerEntity[]> {
    return this.organizersRepository.find();
  }

  async findOne(id: string): Promise<OrganizerEntity> {
    const organizer = await this.organizersRepository.findOne({
      where: { id },
    });
    if (!organizer) {
      throw new NotFoundException(`Organizer with ID "${id}" not found.`);
    }
    return organizer;
  }

  async update(
    id: string,
    updateOrganizerDto: Partial<CreateOrganizerDto>,
  ): Promise<OrganizerEntity> {
    const organizer = await this.findOne(id);
    if (updateOrganizerDto.name) {
      organizer.name = updateOrganizerDto.name;
    }
    if (updateOrganizerDto.description) {
      organizer.description = updateOrganizerDto.description;
    }
    return this.organizersRepository.save(organizer);
  }

  async remove(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const organizer = await queryRunner.manager.findOne(OrganizerEntity, {
        where: { id },
        relations: ['user'],
      });

      if (!organizer) {
        throw new NotFoundException(`Organizer with ID "${id}" not found.`);
      }

      const user = organizer.user;
      if (user) {
        user.role = UserRole.USER;
        await queryRunner.manager.save(user);
      }

      await queryRunner.manager.remove(organizer);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
