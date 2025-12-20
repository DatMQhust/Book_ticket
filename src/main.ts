import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173', process.env.FRONTEND_URL],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  app.use(cookieParser());

  const PORT = process.env.PORT ?? 8000;
  await app.listen(PORT, '0.0.0.0');

  console.log(`🚀 Server is running on ${await app.getUrl()}`);
}
bootstrap();
