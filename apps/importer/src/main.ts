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
import { EntsoeConfig } from './app/entsoe/entsoe.config';
import { configureHttp } from './app/http';
import { provisionQueues, queueOptions } from './app/import/queue';
import { retryStartup } from './startup-retry';

async function bootstrap() {
  const localEnvFile = join(process.cwd(), 'apps/importer/.env');

  if (existsSync(localEnvFile)) {
    loadEnvFile(localEnvFile);
  }

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const config = new EntsoeConfig();
  void config.securityToken;
  void config.timeoutMs;
  await retryStartup(provisionQueues, ({ attempt, delayMs, reason }) => {
    Logger.warn(
      `RabbitMQ provisioning attempt ${attempt} failed (${reason}); retrying in ${delayMs} ms`,
    );
  });
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.connectMicroservice(queueOptions('live'));
  app.connectMicroservice(queueOptions('history'));
  await app.startAllMicroservices();
  configureHttp(app);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`Importer listening at http://localhost:${port}/api`);
  Logger.log('OpenAPI available at /api/docs');
}

bootstrap().catch(() => {
  Logger.error('Importer startup failed; check configuration and infrastructure');
  process.exitCode = 1;
});
