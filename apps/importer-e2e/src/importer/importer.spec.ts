import { createServer, ServerResponse } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { connect, ChannelModel, ConfirmChannel } from 'amqplib';
import {
  readEvent,
  startApp,
  stopApp,
  testDatabase,
  waitFor,
} from '@power-market-dashboard/database/testing';

const fixture = readFileSync('libs/market/src/fixtures/bids.xml', 'utf8');
function page(count: number, offset = 0) {
  const series = fixture.match(
    /<Bid_TimeSeries>[\s\S]*<\/Bid_TimeSeries>/,
  )?.[0];
  if (!series) throw new Error('Missing bid fixture');
  return fixture.replace(
    series,
    Array.from({ length: count }, (_, i) =>
      series.replace('bid-1', `bid-${offset + i}`),
    ).join(''),
  );
}
describe('import pipeline with RabbitMQ and controlled source', () => {
  let database: Awaited<ReturnType<typeof testDatabase>>;
  let importer: Awaited<ReturnType<typeof startApp>>;
  let api: Awaited<ReturnType<typeof startApp>>;
  let connection: ChannelModel;
  let channel: ConfirmChannel;
  const prefix = `market-test-${randomUUID()}`;
  const url =
    process.env.TEST_RABBITMQ_URL ||
    'amqp://power_market:power_market@localhost:5672';
  let mode: 'normal' | 'hold' | 'failure' | 'invalid' | 'scheduled' = 'normal';
  let held: ServerResponse | undefined;
  let calls = 0;
  const server = createServer((req, res) => {
    calls++;
    if (mode === 'hold') {
      held = res;
      return;
    }
    if (mode === 'failure') {
      res.writeHead(503);
      res.end('Unavailable');
      return;
    }
    if (mode === 'invalid') {
      res.end('<invalid>');
      return;
    }
    if (mode === 'scheduled') {
      const params = new URL(req.url ?? '/', 'http://localhost').searchParams;
      const iso = (value: string) =>
        `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:00Z`;
      const from = iso(params.get('periodStart') ?? '202609270000');
      const to = iso(params.get('periodEnd') ?? '202609270015');
      let body =
        params.get('documentType') === 'A37'
          ? fixture
          : readFileSync('libs/market/src/fixtures/solar.xml', 'utf8');
      body = body
        .replaceAll('2026-09-27T00:00Z', from)
        .replaceAll('2026-09-27T00:15Z', to)
        .replaceAll('2026-09-27T01:00Z', to);
      if (params.get('documentType') === 'A75')
        body = body
          .replace('<type>A69', '<type>A75')
          .replace('<process.processType>A01', '<process.processType>A16');
      if (params.get('processType') === 'A47')
        body = body.replace(
          '<process.processType>A51',
          '<process.processType>A47',
        );
      res.setHeader('Content-Type', 'application/xml');
      res.end(body);
      return;
    }
    const offset = Number(
      new URL(req.url ?? '/', 'http://localhost').searchParams.get('offset') ??
        0,
    );
    res.setHeader('Content-Type', 'application/xml');
    res.end(offset === 0 ? page(100) : page(25, 100));
  });
  let env: Record<string, string>;
  async function enqueue() {
    const rows = await database.db.query(
      `INSERT INTO import_jobs(dataset,"from","to",priority) VALUES('afrr','2026-09-27T00:00Z','2026-09-27T00:15Z','live') RETURNING id`,
    );
    return rows[0].id as string;
  }
  async function state(id: string, wanted: string) {
    return waitFor(async () => {
      const result = await database.db.query(
        'SELECT * FROM import_jobs WHERE id=$1',
        [id],
      );
      return result[0]?.state === wanted ? result[0] : false;
    }).catch(async () => {
      const rows = await database.db.query(
        'SELECT id,state,error FROM import_jobs',
      );
      throw new Error(JSON.stringify(rows) + '\n' + importer.output());
    });
  }
  beforeAll(async () => {
    database = await testDatabase();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('No source port');
    env = {
      DATABASE_URL: database.connectionString,
      RABBITMQ_URL: url,
      RABBITMQ_QUEUE_PREFIX: prefix,
      IMPORT_SCHEDULER_ENABLED: 'false',
      ENTSOE_SECURITY_TOKEN: 'fixture-token',
      ENTSOE_API_URL: `http://127.0.0.1:${address.port}`,
      ENTSOE_TIMEOUT_MS: '5000',
    };
    importer = await startApp('importer', env);
    api = await startApp('api', { DATABASE_URL: database.connectionString });
    connection = await connect(url);
    channel = await connection.createConfirmChannel();
  });
  beforeEach(async () => {
    mode = 'normal';
    await database.db.query(
      'TRUNCATE import_jobs, market_changes, market_windows, market_snapshots, source_documents, scheduler_state RESTART IDENTITY CASCADE',
    );
  });
  afterAll(async () => {
    (held as ServerResponse | undefined)?.destroy();
    if (importer) await stopApp(importer.child);
    if (api) await stopApp(api.child);
    if (channel) {
      for (const suffix of ['live', 'history', 'dead'])
        await channel.deleteQueue(`${prefix}.import.${suffix}`);
      await channel.deleteExchange(`${prefix}.dead`);
      await channel.close();
    }
    if (connection) await connection.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (database) await database.close();
  });
  it('publishes all pages to REST and SSE within 30 seconds and deduplicates redelivery', async () => {
    const abort = new AbortController();
    const stream = await fetch(`${api.url}/events`, { signal: abort.signal });
    if (!stream.body) throw new Error('Missing SSE body');
    const reader = stream.body.getReader();
    await readEvent(reader, 'ready');
    const event = readEvent(reader, 'market-change');
    void event.catch(() => undefined);
    const started = Date.now();
    const id = await enqueue();
    await state(id, 'complete');
    await event;
    expect(Date.now() - started).toBeLessThan(30000);
    const response = await fetch(
      `${api.url}/balancing/ladder?at=2026-09-27T00:00Z&product=afrr&direction=up&productType=A04&currency=HUF&targetMw=1250`,
    );
    expect(await response.json()).toMatchObject({
      complete: true,
      totalMw: 1250,
      targetPrice: -500,
    });
    abort.abort();
    channel.sendToQueue(
      `${prefix}.import.live`,
      Buffer.from(
        JSON.stringify({ pattern: 'market.import.v1', data: { id } }),
      ),
      { persistent: true },
    );
    await channel.waitForConfirms();
    // A subsequent job completing proves the consumer passed the duplicate delivery.
    await state(await enqueue(), 'complete');
    expect(
      (await database.db.query('SELECT count(*) FROM market_changes'))[0].count,
    ).toBe('1');
  });
  it('recovers an unacknowledged job after worker restart', async () => {
    mode = 'hold';
    held = undefined;
    const id = await enqueue();
    await waitFor(async () => !!held);
    const exited = once(importer.child, 'exit');
    importer.child.kill('SIGKILL');
    await exited;
    (held as ServerResponse | undefined)?.destroy();
    mode = 'normal';
    importer = await startApp('importer', env);
    const completed = await state(id, 'complete');
    expect(completed.attempts).toBeGreaterThanOrEqual(2);
  });
  it('retains the last snapshot during an outage and retries successfully', async () => {
    await state(await enqueue(), 'complete');
    mode = 'failure';
    const beforeCalls = calls;
    const id = await enqueue();
    await state(id, 'retry');
    expect(calls).toBeGreaterThan(beforeCalls);
    expect(
      (await database.db.query('SELECT count(*) FROM market_snapshots'))[0]
        .count,
    ).toBe('1');
    mode = 'normal';
    await state(id, 'complete');
  });
  it('routes invalid payloads to the dead-letter queue without publishing a snapshot', async () => {
    await state(await enqueue(), 'complete');
    mode = 'invalid';
    const id = await enqueue();
    await state(id, 'dead');
    const dead = await waitFor(
      async () =>
        (await channel.get(`${prefix}.import.dead`, { noAck: true })) || false,
    );
    expect(JSON.parse(dead.content.toString()).data.id).toBe(id);
    expect(
      (await database.db.query('SELECT count(*) FROM market_snapshots'))[0]
        .count,
    ).toBe('1');
    mode = 'normal';
  });
  it('schedules live polling and seven-day backfill, making solar data available within 30 seconds', async () => {
    await stopApp(importer.child);
    mode = 'scheduled';
    const abort = new AbortController();
    const response = await fetch(`${api.url}/events`, { signal: abort.signal });
    if (!response.body) throw new Error('Missing SSE stream');
    const reader = response.body.getReader();
    await readEvent(reader, 'ready');
    const event = readEvent(reader, 'market-change');
    void event.catch(() => undefined);
    const started = Date.now();
    importer = await startApp('importer', {
      ...env,
      IMPORT_SCHEDULER_ENABLED: 'true',
    });
    const now = new Date();
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();
    const to = new Date(Date.parse(from) + 3600000).toISOString();
    try {
      await waitFor(async () => {
        const result = await fetch(`${api.url}/solar?from=${from}&to=${to}`);
        const body = await result.json();
        return body.complete === true;
      }, 29000);
      await event;
      expect(Date.now() - started).toBeLessThan(30000);
      const history = await database.db.query(
        `SELECT count(*) FROM import_jobs WHERE priority='history'`,
      );
      expect(Number(history[0].count)).toBeGreaterThan(1300);
    } finally {
      abort.abort();
    }
  });
});
