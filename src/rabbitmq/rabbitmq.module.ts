import { Global, Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('RABBITMQ_URL'),
        exchanges: [
          { name: 'booking-exchange', type: 'topic' },
          { name: 'waiting-room-exchange', type: 'topic' },
          { name: 'dlq-exchange', type: 'topic' },
          {
            name: 'delayed-exchange',
            type: 'x-delayed-message',
            options: { arguments: { 'x-delayed-type': 'topic' } },
          },
        ],
        connectionInitOptions: { wait: true },
        channels: {
          default: { prefetchCount: 10, default: true },
          'high-priority': { prefetchCount: 20 },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [RabbitMQModule],
})
export class AppRabbitMQModule {}
