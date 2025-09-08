import { Module } from '@nestjs/common';
import { OrganizersService } from './organizers.service';
import { OrganizersController } from './organizers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizerEntity } from './entities/organizer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizerEntity])],
  controllers: [OrganizersController],
  providers: [OrganizersService],
})
export class OrganizersModule {}
