import { EntsoeConfig } from './app/entsoe/entsoe.config';
import { queueOptions, provisionQueues } from './app/import/queue';
/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const localEnvFile = join(process.cwd(), 'apps/importer/.env');

  if (existsSync(localEnvFile)) {
    loadEnvFile(localEnvFile);
  }

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const config = new EntsoeConfig();
  void config.securityToken;
  void config.timeoutMs;
  await provisionQueues();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.connectMicroservice(queueOptions('live'));
  app.connectMicroservice(queueOptions('history'));
  await app.startAllMicroservices();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap().catch(() => {
  Logger.error(
    'Importer startup failed; check configuration and infrastructure',
  );
  process.exitCode = 1;
});
