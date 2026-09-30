import { createDataSource } from '@power-market-dashboard/database';
import { DATASETS, quarters, utcDay } from '@power-market-dashboard/market';

async function main() {
  const [from, to] = process.argv.slice(2);
  if (
    !from ||
    !to ||
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    from >= to ||
    new Date(from).toISOString().slice(0, 10) !== from ||
    new Date(to).toISOString().slice(0, 10) !== to
  )
    throw new Error('Usage: bun import:history YYYY-MM-DD YYYY-MM-DD (UTC, exclusive end)');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const dataSource = await createDataSource().initialize();
  try {
    for (let t = Date.parse(from); t < Date.parse(to); t += 86400000) {
      const range = utcDay(t);
      for (const dataset of DATASETS) {
        for (const window of dataset.startsWith('solar')
          ? [range]
          : quarters(range.from, range.to)) {
          await dataSource.query(
            'INSERT INTO import_jobs(dataset,"from","to",priority) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
            [dataset, window.from, window.to, 'history'],
          );
        }
      }
    }
    console.log('Historical import jobs queued in PostgreSQL; importer will dispatch them.');
  } finally {
    await dataSource.destroy();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Import enqueue failed');
  process.exitCode = 1;
});
