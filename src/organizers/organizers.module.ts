import { Module } from '@nestjs/common';
import { OrganizersService } from './organizers.service';
import { OrganizersController } from './organizers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizerEntity } from './entities/organizer.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizerEntity]),
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [OrganizersController],
  providers: [OrganizersService],
})
export class OrganizersModule {}
