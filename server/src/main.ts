import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT || 3000);

  const timestamp = new Date().toLocaleString('vi-VN');
  Logger.log(
    `[${timestamp}] Server is running on port ${process.env.PORT || 3000}`,
    'Bootstrap',
  );
}
bootstrap();
