import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as entities from './entities';
import { databaseOptions } from './data-source';
import { MarketRepository } from './market.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => databaseOptions() }),
    TypeOrmModule.forFeature(Object.values(entities)),
  ],
  providers: [MarketRepository],
  exports: [TypeOrmModule, MarketRepository],
})
export class DatabaseModule {}
