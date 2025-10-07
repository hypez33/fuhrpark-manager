import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';
import type { AppConfig } from './config/app.config';
import { PrismaExceptionFilter } from './infra/prisma/prisma-exception.filter';
import { PrismaService } from './infra/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const reflector = app.get(Reflector);

  app.use(helmet());
  const frontendConfig = configService.get('frontend', { infer: true });
  app.enableCors({
    origin: frontendConfig?.url ?? configService.get('APP_URL'),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
  app.useGlobalFilters(new PrismaExceptionFilter());

  const prismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks('SIGINT');
  prismaService.enableShutdownHooks('SIGTERM');

  const port =
    configService.get('app', { infer: true })?.port ??
    Number(process.env.PORT ?? 4000);
  await app.listen(port);

  const url = await app.getUrl();

  console.log(`🚗 Fuhrpark Manager API ready at ${url}`);
}

void bootstrap();
