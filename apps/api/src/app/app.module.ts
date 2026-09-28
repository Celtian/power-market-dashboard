import { DatabaseModule } from '@power-market-dashboard/database';
import { MarketController } from './market/market.controller';
import { MarketService } from './market/market.service';
import { EventsService } from './market/events.service';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AppController, MarketController],
  providers: [AppService, MarketService, EventsService],
})
export class AppModule {}
