import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaboratorsService } from './collaborators.service';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorEntity } from './entities/collaborator.entity';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { UserEntity } from '../users/entities/user.entity';
import { EventEntity } from '../events/entities/event.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollaboratorEntity,
      OrganizerEntity,
      UserEntity,
      EventEntity,
    ]),
    MailModule,
  ],
  controllers: [CollaboratorsController],
  providers: [CollaboratorsService],
  exports: [TypeOrmModule], // export để TicketModule dùng CollaboratorEntity
})
export class CollaboratorsModule {}
