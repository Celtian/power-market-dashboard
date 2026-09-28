import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { MarketRepository } from '@power-market-dashboard/database';
import {
  DATASETS,
  ImportJob,
  QUARTER_MS,
  quarters,
  utcDay,
} from '@power-market-dashboard/market';
import { IMPORT_PATTERN, queueOptions } from './queue';

@Injectable()
export class ImportScheduler implements OnModuleDestroy {
  private readonly logger = new Logger(ImportScheduler.name);
  private readonly clients: Record<'live' | 'history', ClientProxy> = {
    live: ClientProxyFactory.create(queueOptions('live', false)),
    history: ClientProxyFactory.create(queueOptions('history', false)),
  };
  private scheduling = false;
  private dispatching = false;
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly repository: MarketRepository,
  ) {}
  @Interval(15000)
  async schedule() {
    if (this.scheduling || process.env.IMPORT_SCHEDULER_ENABLED === 'false')
      return;
    this.scheduling = true;
    try {
      await this.db.transaction(async (client) => {
        const lock = await client.query<{ locked: boolean }[]>(
          "SELECT pg_try_advisory_xact_lock(hashtext('market-scheduler')) AS locked",
        );
        if (!lock[0].locked) return;
        const now = Date.now();
        const last = await client.query<{ updated_at: Date }[]>(
          "SELECT updated_at FROM scheduler_state WHERE key='live'",
        );
        if (last[0] && now - last[0].updated_at.getTime() < 14000) return;
        const current = Math.floor(now / QUARTER_MS) * QUARTER_MS;
        for (const dataset of DATASETS) {
          if (dataset.startsWith('solar')) {
            for (const day of [
              -1,
              0,
              ...(dataset === 'solar-forecast' ? [1] : []),
            ])
              await this.repository.enqueue(
                { dataset, ...utcDay(now + day * 86400000), priority: 'live' },
                client,
              );
          } else {
            for (const range of quarters(
              new Date(current - 6 * QUARTER_MS).toISOString(),
              new Date(current + QUARTER_MS).toISOString(),
            ))
              await this.repository.enqueue(
                { dataset, ...range, priority: 'live' },
                client,
              );
          }
        }
        await client.query(
          "INSERT INTO scheduler_state(key) VALUES('live') ON CONFLICT(key) DO UPDATE SET updated_at=clock_timestamp()",
        );
        const history = await client.query<{ updated_at: Date }[]>(
          "SELECT updated_at FROM scheduler_state WHERE key='history'",
        );
        if (
          !history[0] ||
          now - history[0].updated_at.getTime() >= 6 * 3600000
        ) {
          for (let day = 7; day >= 1; day--) {
            const range = utcDay(now - day * 86400000);
            for (const dataset of DATASETS) {
              const windows = dataset.startsWith('solar')
                ? [range]
                : quarters(range.from, range.to);
              for (const window of windows)
                await this.repository.enqueue(
                  { dataset, ...window, priority: 'history' },
                  client,
                );
            }
          }
          await client.query(
            "INSERT INTO scheduler_state(key) VALUES('history') ON CONFLICT(key) DO UPDATE SET updated_at=clock_timestamp()",
          );
        }
      });
    } catch {
      this.logger.error('Could not schedule imports');
    } finally {
      this.scheduling = false;
    }
  }
  @Interval(1000)
  async dispatch() {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      // Recovery after a process or broker interruption; job locks prevent concurrent execution.
      await this.db.query(
        "UPDATE import_jobs SET state='retry',next_attempt_at=now(),updated_at=now() WHERE state IN ('published','running') AND updated_at<now()-interval '5 minutes'",
      );
      for (const priority of ['live', 'history'] as const) {
        await this.db.transaction(async (client) => {
          const rows = await client.query<ImportJob[]>(
            `SELECT id,dataset,"from","to",priority,created_at,attempts FROM import_jobs WHERE state IN ('pending','retry') AND next_attempt_at<=now() AND priority=$1 ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED`,
            [priority, priority === 'live' ? 24 : 2],
          );
          for (const job of rows) {
            await firstValueFrom(
              this.clients[priority]
                .emit(IMPORT_PATTERN, { id: job.id })
                .pipe(timeout(10000)),
            );
            await client.query(
              "UPDATE import_jobs SET state='published',updated_at=clock_timestamp() WHERE id=$1",
              [job.id],
            );
          }
        });
      }
    } catch {
      this.logger.error('Could not dispatch imports; pending jobs retained');
    } finally {
      this.dispatching = false;
    }
  }
  async onModuleDestroy() {
    await Promise.all(
      Object.values(this.clients).map((client) => client.close()),
    );
  }
}
