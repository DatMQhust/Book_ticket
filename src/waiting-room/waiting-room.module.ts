import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WaitingRoomService } from './waiting-room.service';
import { WaitingRoomController } from './waiting-room.controller';
import { WaitingRoomGateway } from './waiting-room.gateway';
import { WrSlotLifecycleConsumer } from './consumers/wr-slot-lifecycle.consumer';
import { WrDisconnectConsumer } from './consumers/wr-disconnect.consumer';

@Module({
  imports: [
    // JwtModule cần cho Gateway auth (verify access_token từ cookie)
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [WaitingRoomController],
  providers: [
    WaitingRoomService,
    WaitingRoomGateway,
    WrSlotLifecycleConsumer,
    WrDisconnectConsumer,
  ],
  // Export WaitingRoomService vì Giai đoạn 3 cần inject vào BookingsService
  exports: [WaitingRoomService],
})
export class WaitingRoomModule {}
