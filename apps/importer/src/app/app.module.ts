import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@power-market-dashboard/database';
import { ImportScheduler } from './import/scheduler.service';
import { ImportWorker } from './import/worker.controller';
import { SourceClient } from './import/source.client';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EntsoeConfig } from './entsoe/entsoe.config';
import { EntsoeController } from './entsoe/entsoe.controller';
import { EntsoeService } from './entsoe/entsoe.service';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [AppController, EntsoeController, ImportWorker],
  providers: [
    AppService,
    EntsoeConfig,
    EntsoeService,
    SourceClient,
    ImportScheduler,
  ],
})
export class AppModule {}
