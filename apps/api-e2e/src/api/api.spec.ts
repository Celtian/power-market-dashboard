import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import {
  BalancingBidEntity,
  GenerationIntervalEntity,
  MarketRepository,
  MarketWindowEntity,
} from '@power-market-dashboard/database';
import {
  readEvent,
  startApp,
  stopApp,
  testDatabase,
} from '@power-market-dashboard/database/testing';
import { ImportJob, parseResponse } from '@power-market-dashboard/market';

describe('market API with PostgreSQL', () => {
  let database: Awaited<ReturnType<typeof testDatabase>>;
  let app: Awaited<ReturnType<typeof startApp>>;
  let repository: MarketRepository;
  const from = '2026-09-27T00:00:00Z',
    to = '2026-09-27T00:15:00Z';
  const job: ImportJob = {
    id: '1',
    dataset: 'afrr',
    from,
    to,
    priority: 'live',
    attempts: 1,
    created_at: new Date(),
  };
  const fixture = readFileSync('libs/market/src/fixtures/bids.xml');
  async function store(xml = fixture) {
    const result = {
      ...parseResponse(xml, 'afrr'),
      fetchedAt: new Date().toISOString(),
      fetchMs: 1,
    };
    return database.db.transaction((client) => repository.store(client, job, result));
  }
  beforeAll(async () => {
    database = await testDatabase();
    database.migrate('down');
    database.migrate('up');
    repository = new MarketRepository(
      database.db,
      database.db.getRepository(MarketWindowEntity),
      database.db.getRepository(GenerationIntervalEntity),
      database.db.getRepository(BalancingBidEntity),
    );
    await store();
    app = await startApp('api', { DATABASE_URL: database.connectionString });
  });
  afterAll(async () => {
    if (app) await stopApp(app.child);
    if (database) await database.close();
  });
  it('promotes pending historical work without duplicating or demoting live jobs', async () => {
    await repository.enqueue({ ...job, priority: 'history' });
    await database.db.query(
      `UPDATE import_jobs SET state='published' WHERE dataset='afrr' AND "from"='2026-09-27T00:00Z'`,
    );
    await repository.enqueue({ ...job, priority: 'live' });
    await repository.enqueue({ ...job, priority: 'history' });
    const result = await database.db.query(
      `SELECT priority,state FROM import_jobs WHERE dataset='afrr' AND "from"='2026-09-27T00:00Z'`,
    );
    expect(result).toEqual([{ priority: 'live', state: 'retry' }]);
  });
  it('enqueues a historical UTC day idempotently through the documented Bun command', async () => {
    for (let i = 0; i < 2; i++) {
      const result = spawnSync('bun', ['run', 'import:history', '2000-01-01', '2000-01-02'], {
        env: { ...process.env, DATABASE_URL: database.connectionString },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
    }
    const rows = await database.db.query(
      `SELECT count(*) FROM import_jobs WHERE "from">='2000-01-01' AND "to"<='2000-01-02' AND priority='history'`,
    );
    expect(rows[0].count).toBe('194');
  });
  it('reports healthy, delayed and offline import pipeline states', async () => {
    await database.db.query(
      `INSERT INTO scheduler_state(key,updated_at) VALUES('live',now())
       ON CONFLICT(key) DO UPDATE SET updated_at=EXCLUDED.updated_at`,
    );
    await database.db.query(
      `UPDATE import_jobs
       SET created_at=now(),error=NULL
       WHERE priority='live' AND state IN ('pending','published','running','retry')`,
    );

    let response = await fetch(`${app.url}/data-status`);
    let body = (await response.json()) as {
      pipeline: {
        activeLiveJobs: number;
        oldestLiveJobAgeSeconds: number | null;
        schedulerAgeSeconds: number | null;
        schedulerHeartbeatAt: string | null;
        status: string;
      };
    };
    expect(body.pipeline).toMatchObject({
      status: 'healthy',
      schedulerHeartbeatAt: expect.any(String),
    });
    expect(body.pipeline.schedulerAgeSeconds).toBeLessThan(5);

    await database.db.query(
      `UPDATE import_jobs
       SET created_at=now()-interval '2 minutes'
       WHERE priority='live' AND state IN ('pending','published','running','retry')`,
    );
    response = await fetch(`${app.url}/data-status`);
    body = await response.json();
    expect(body.pipeline.status).toBe('delayed');
    expect(body.pipeline.oldestLiveJobAgeSeconds).toBeGreaterThan(100);

    await database.db.query(
      `UPDATE scheduler_state SET updated_at=now()-interval '2 minutes' WHERE key='live'`,
    );
    response = await fetch(`${app.url}/data-status`);
    body = await response.json();
    expect(body.pipeline).toMatchObject({ status: 'offline' });
    expect(body.pipeline.schedulerAgeSeconds).toBeGreaterThan(100);

    await database.db.query(
      `UPDATE import_jobs
       SET created_at=now()
       WHERE priority='live' AND state IN ('pending','published','running','retry')`,
    );
  });
  it('serves a ladder in source currency and null above offered volume', async () => {
    const response = await fetch(
      `${app.url}/balancing/ladder?at=${from}&product=afrr&direction=up&productType=A04&currency=HUF&targetMw=10`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      complete: true,
      totalMw: 10,
      targetPrice: -500,
      priceUnit: 'HUF/MWh',
    });
    const above = await fetch(
      `${app.url}/balancing/ladder?at=${from}&product=afrr&direction=up&productType=A04&currency=HUF&targetMw=11`,
    );
    expect(await above.json()).toMatchObject({ targetPrice: null });
  });
  it('validates DTOs, timezone, range and SSE cursor', async () => {
    for (const path of [
      '/solar?from=invalid&to=invalid',
      '/solar?from=2026-09-27T00:00:00&to=2026-09-28T00:00:00',
      `/solar?from=${to}&to=${from}`,
      `/balancing/ladder?at=${from}&product=fcr&direction=up&currency=HUF&productType=A04`,
    ])
      expect((await fetch(app.url + path)).status).toBe(400);
    expect((await fetch(`${app.url}/events`, { headers: { 'Last-Event-ID': '-1' } })).status).toBe(
      400,
    );
  });
  it('exposes OpenAPI, missing solar points and price history gaps', async () => {
    expect((await fetch(`${app.url}/docs-json`)).status).toBe(200);
    const solar = await fetch(`${app.url}/solar?from=${from}&to=${to}`);
    expect(await solar.json()).toMatchObject({
      complete: false,
      summary: { coverage: 0, maeMw: null },
    });
    const history = await fetch(
      `${app.url}/balancing/price-history?from=${from}&to=2026-09-27T00:30:00Z&product=afrr&direction=up&productType=A04&currency=HUF&targetMw=10`,
    );
    expect((await history.json()).data).toMatchObject([
      { price: -500, complete: true },
      { price: null, complete: false },
    ]);
  });
  it('reports the latest valid solar point instead of the window end', async () => {
    const solarJob: ImportJob = {
      ...job,
      id: '2',
      dataset: 'solar-actual',
      from: '2026-09-26T00:00:00.000Z',
      to: '2026-09-27T00:00:00.000Z',
    };
    await database.db.transaction((client) =>
      repository.store(client, solarJob, {
        bids: [],
        documents: [],
        fetchMs: 1,
        fetchedAt: new Date().toISOString(),
        generation: [
          {
            cancelled: false,
            end: '2026-09-26T00:15:00.000Z',
            mw: 0,
            resolutionSeconds: 900,
            revision: 1,
            seriesId: 'solar',
            start: '2026-09-26T00:00:00.000Z',
          },
          {
            cancelled: false,
            end: '2026-09-26T00:30:00.000Z',
            mw: 25,
            resolutionSeconds: 900,
            revision: 1,
            seriesId: 'solar',
            start: '2026-09-26T00:15:00.000Z',
          },
          {
            cancelled: false,
            end: '2026-09-26T00:45:00.000Z',
            mw: null,
            resolutionSeconds: 900,
            revision: 1,
            seriesId: 'solar',
            start: '2026-09-26T00:30:00.000Z',
          },
          {
            cancelled: true,
            end: '2026-09-26T01:00:00.000Z',
            mw: 30,
            resolutionSeconds: 900,
            revision: 1,
            seriesId: 'solar',
            start: '2026-09-26T00:45:00.000Z',
          },
        ],
        noData: false,
        seriesCount: 1,
      }),
    );

    const response = await fetch(`${app.url}/data-status`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      datasets: Array<{
        dataset: string;
        intervalAgeSeconds: number;
        latestIntervalEnd: string;
      }>;
      solarActualFreshnessTargetSeconds: number;
    };
    expect(body.solarActualFreshnessTargetSeconds).toBe(1200);
    const actual = body.datasets.find((dataset) => dataset.dataset === 'solar-actual');
    expect(actual).toMatchObject({
      latestIntervalEnd: '2026-09-26T00:30:00.000Z',
    });
    expect(actual?.intervalAgeSeconds).toBeGreaterThan(0);
  });
  it('deduplicates repeated imports and rolls back a failed transaction', async () => {
    const before = (await database.db.query('SELECT count(*) FROM market_changes'))[0].count;
    expect(await store()).toBe(false);
    await expect(
      database.db.transaction(async (client) => {
        await repository.store(client, job, {
          ...parseResponse(Buffer.from(fixture.toString().replace('-500', '999')), 'afrr'),
          fetchedAt: new Date().toISOString(),
          fetchMs: 1,
        });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect((await database.db.query('SELECT count(*) FROM market_changes'))[0].count).toBe(before);
  });
  it('delivers a committed revision through SSE and resumes after its cursor', async () => {
    const abort = new AbortController();
    const response = await fetch(`${app.url}/events`, { signal: abort.signal });
    if (!response.body) throw new Error('Missing SSE body');
    const reader = response.body.getReader();
    const ready = await readEvent(reader, 'ready');
    const pending = readEvent(reader, 'market-change');
    await store(
      Buffer.from(
        fixture
          .toString()
          .replace('-500', '-250')
          .replace('<revisionNumber>1', '<revisionNumber>2'),
      ),
    );
    const event = await pending;
    expect(event.data.dataset).toBe('afrr');
    if (!event.id || !ready.id) throw new Error('Missing SSE cursor');
    expect(BigInt(event.id)).toBeGreaterThan(BigInt(ready.id));
    abort.abort();
    const secondAbort = new AbortController();
    const replay = await fetch(`${app.url}/events`, {
      headers: { 'Last-Event-ID': ready.id },
      signal: secondAbort.signal,
    });
    if (!replay.body) throw new Error('Missing replay body');
    expect((await readEvent(replay.body.getReader(), 'market-change')).id).toBe(event.id);
    secondAbort.abort();
  });
});
