import { Module } from '@nestjs/common';
import { OrganizersService } from './organizers.service';
import { OrganizersController } from './organizers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizerEntity } from './entities/organizer.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { EventEntity } from 'src/events/entities/event.entity';

import { TicketTypeEntity } from 'src/ticket-type/entities/ticket-type.entity';
import { EventSessionEntity } from 'src/event-session/entities/event-session.entity';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizerEntity,
      UserEntity,
      EventEntity,
      TicketTypeEntity,
      EventSessionEntity,
    ]),
    MailModule,
  ],
  controllers: [OrganizersController],
  providers: [OrganizersService],
  exports: [OrganizersService],
})
export class OrganizersModule {}
