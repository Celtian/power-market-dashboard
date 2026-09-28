import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EntsoeConfig } from './entsoe/entsoe.config';
import { EntsoeController } from './entsoe/entsoe.controller';
import { EntsoeService } from './entsoe/entsoe.service';

@Module({
  imports: [],
  controllers: [AppController, EntsoeController],
  providers: [AppService, EntsoeConfig, EntsoeService],
})
export class AppModule {}
