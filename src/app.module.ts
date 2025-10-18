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
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: [`.env.${process.env.NODE_ENV}`],
    }),
    UsersModule,
    DatabaseModule,
    TestModule,
    EventsModule,
    OrganizersModule,
    TicketModule,
    OrderModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
