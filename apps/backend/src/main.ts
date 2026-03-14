import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 보안 헤더
  app.use(helmet());

  // CORS — JWT는 Authorization 헤더로 처리되므로 origin 제한 불필요
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: corsOrigin,
    credentials: corsOrigin !== '*',
  });

  // 전역 접두사
  app.setGlobalPrefix('api');

  // 전역 유효성 검사
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 4000);
  console.log(`Backend running on port ${process.env.PORT || 4000}`);
}
bootstrap();
