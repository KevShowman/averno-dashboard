import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: [
      configService.get('FRONTEND_URL', 'http://localhost:5173'),
      'http://185.237.14.61',
      'http://185.237.14.61:3000',
      'https://lsc-nc.de',
      'https://lsc-nc.de:3000'
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cookie parser
  app.use(cookieParser());

  // Global prefix
  app.setGlobalPrefix('api');

  const port = configService.get('PORT', 3000);
  const host = configService.get('HOST', '0.0.0.0');
  await app.listen(port, host);
  
  console.log(`🚀 LaSanta Calavera API running on: http://${host}:${port}/api`);
}

bootstrap();
