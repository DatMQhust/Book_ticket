import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
  });

  app.use(cookieParser());

  const PORT = process.env.PORT ?? 8000;
  await app.listen(PORT);

  console.log(`🚀 Server is running on http://localhost:${PORT}`);
}
bootstrap();
