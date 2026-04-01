import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/auth.decorator';
import { UserRole } from 'src/users/entities/user.entity';
import { WaitingRoomService } from './waiting-room.service';
import { JoinWaitingRoomDto } from './dto/join-waiting-room.dto';

@ApiTags('waiting-room')
@ApiBearerAuth()
@Controller('waiting-room')
export class WaitingRoomController {
  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  /**
   * Vào hàng chờ hoặc nhận token ngay nếu còn slot.
   * Trả về 1 trong 5 trạng thái: DISABLED / SOLD_OUT / TOKEN / QUEUED / FULL
   */
  @Post('join/:eventId')
  @Roles(UserRole.USER)
  async join(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() dto: JoinWaitingRoomDto,
  ) {
    const userId = req.user.id;
    return this.waitingRoomService.join(userId, eventId, dto);
  }

  /**
   * User tự rời khỏi hàng chờ, giải phóng slot nếu đang giữ token.
   */
  @Post('leave/:eventId')
  @Roles(UserRole.USER)
  async leave(@Request() req, @Param('eventId') eventId: string) {
    const userId = req.user.id;
    await this.waitingRoomService.leave(userId, eventId);
    return { success: true };
  }

  /**
   * Trạng thái hiện tại của user trong hàng chờ.
   * Trả về: TOKEN (kèm token + ttl) / QUEUED (kèm position) / NONE
   */
  @Get('status/:eventId')
  @Roles(UserRole.USER)
  async getStatus(@Request() req, @Param('eventId') eventId: string) {
    const userId = req.user.id;
    return this.waitingRoomService.getStatus(userId, eventId);
  }
}
