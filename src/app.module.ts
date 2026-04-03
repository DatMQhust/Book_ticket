import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import configs from './config/index';
import { TestModule } from '../test/testConfig/test.module';
import { EventsModule } from './events/events.module';
import { OrganizersModule } from './organizers/organizers.module';
import { TicketModule } from './ticket/ticket.module';
import { OrderModule } from './order/order.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/role.guard';
import { TicketTypeModule } from './ticket-type/ticket-type.module';
import { EventSessionModule } from './event-session/event-session.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { BookingsModule } from './bookings/bookings.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { CollaboratorsModule } from './collaborators/collaborators.module';
import { SeatMapModule } from './seat-map/seat-map.module';
import { AppRabbitMQModule } from './rabbitmq/rabbitmq.module';
import { WaitingRoomModule } from './waiting-room/waiting-room.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000,
        limit: 120, // 120 req/phút — đủ thoải mái cho SPA gọi nhiều API song song
      },
      {
        // Mặc định cao — chỉ siết xuống ở route cụ thể bằng @Throttle
        name: 'strict',
        ttl: 60_000,
        limit: 1000,
      },
      {
        // Mặc định cao — chỉ siết xuống ở route cụ thể bằng @Throttle
        name: 'burst',
        ttl: 1_000,
        limit: 1000,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: [`.env.${process.env.NODE_ENV}`],
    }),
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      options: {
        keyPrefix: 'highshow:',
        family: 4,
      },
    }),
    AppRabbitMQModule,
    WaitingRoomModule,
    UsersModule,
    DatabaseModule,
    TestModule,
    EventsModule,
    OrganizersModule,
    TicketModule,
    OrderModule,
    AuthModule,
    TicketTypeModule,
    EventSessionModule,
    CloudinaryModule,
    BookingsModule,
    AdminModule,
    MailModule,
    CollaboratorsModule,
    SeatMapModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
