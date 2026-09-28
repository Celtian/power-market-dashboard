import { databaseOptions } from './data-source';
import { numericTransformer } from './entities/numeric.transformer';

describe('TypeORM configuration', () => {
  it('requires a connection URL and never changes the schema at application startup', () => {
    expect(() => databaseOptions('')).toThrow('DATABASE_URL');
    expect(databaseOptions('postgresql://localhost/market_test')).toMatchObject(
      {
        type: 'postgres',
        synchronize: false,
        migrationsRun: false,
        migrationsTableName: 'typeorm_migrations',
      },
    );
  });
  it('preserves nulls, zero and negative decimal prices when reading numeric columns', () => {
    expect(numericTransformer.from(null)).toBeNull();
    expect(numericTransformer.from('0')).toBe(0);
    expect(numericTransformer.from('-125.50')).toBe(-125.5);
    expect(numericTransformer.to(-125.5)).toBe(-125.5);
  });
});
