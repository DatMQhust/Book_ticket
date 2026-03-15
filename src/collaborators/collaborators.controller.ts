import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CollaboratorsService } from './collaborators.service';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles, User } from '../auth/decorators/auth.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('collaborators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER)
@Controller('organizers/collaborators')
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Mời CTV — tạo tài khoản nếu email chưa tồn tại' })
  invite(
    @User() user: any,
    @Body() dto: InviteCollaboratorDto,
  ) {
    return this.collaboratorsService.inviteCollaborator(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách CTV đang hoạt động' })
  findAll(@User() user: any) {
    return this.collaboratorsService.getCollaborators(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật quyền hoặc trạng thái CTV' })
  update(
    @User() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollaboratorDto,
  ) {
    return this.collaboratorsService.updateCollaborator(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Thu hồi quyền CTV (xoá record)' })
  remove(
    @User() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.collaboratorsService.removeCollaborator(user.id, id);
  }
}
