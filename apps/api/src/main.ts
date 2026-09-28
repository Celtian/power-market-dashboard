import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { AppModule } from './app/app.module';
import { configureHttp } from './app/market/http';

async function bootstrap() {
  if (existsSync('apps/api/.env')) loadEnvFile('apps/api/.env');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  configureHttp(app);
  await app.listen(process.env.PORT || 3000);
  Logger.log('API listening; OpenAPI available at /api/docs');
}
bootstrap().catch(() => {
  Logger.error('API startup failed; check configuration and infrastructure');
  process.exitCode = 1;
});
