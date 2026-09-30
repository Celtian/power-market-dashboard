import { DataSource, DataSourceOptions } from 'typeorm';

import * as entities from './entities';
import { Market1780000000000 } from './migrations/1780000000000-market';

export function databaseOptions(url = process.env.DATABASE_URL): DataSourceOptions {
  if (!url) throw new Error('DATABASE_URL is required');
  return {
    type: 'postgres',
    url,
    entities: Object.values(entities),
    migrations: [Market1780000000000],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    logging: false,
    extra: { max: 12, connectionTimeoutMillis: 5000, statement_timeout: 30000 },
  };
}

export function createDataSource(url?: string): DataSource {
  return new DataSource(databaseOptions(url));
}
