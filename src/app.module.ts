import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { TicketTypeModule } from './ticket-type/ticket-type.module';
import { EventSessionModule } from './event-session/event-session.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { BookingsModule } from './bookings/bookings.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { BullModule } from '@nestjs/bull';
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: [`.env.${process.env.NODE_ENV}`],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT') || 6379,
          family: 4,
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      options: {
        keyPrefix: 'highshow:',
        family: 4,
      },
    }),
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
