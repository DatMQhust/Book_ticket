import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://192.168.1.10:5173',
      'http://192.168.1.8:8000',
      process.env.FRONTEND_URL,
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  app.use(cookieParser());

  const PORT = process.env.PORT ?? 8000;
  await app.listen(PORT, '0.0.0.0');

  console.log(`🚀 Server is running on ${await app.getUrl()}`);
}
bootstrap();
