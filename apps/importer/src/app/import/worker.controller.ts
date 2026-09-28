import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Channel, ConsumeMessage } from 'amqplib';
import { MarketRepository } from '@power-market-dashboard/database';
import { ImportJob } from '@power-market-dashboard/market';
import { IMPORT_PATTERN } from './queue';
import { ImportFailure, SourceClient } from './source.client';

@Controller()
export class ImportWorker {
  private readonly logger = new Logger(ImportWorker.name);
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly repository: MarketRepository,
    private readonly source: SourceClient,
  ) {}
  @EventPattern(IMPORT_PATTERN)
  async handle(@Payload() payload: unknown, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as ConsumeMessage;
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('id' in payload) ||
      !/^\d+$/.test(String(payload.id))
    ) {
      channel.nack(message, false, false);
      return;
    }
    const id = String(payload.id);
    let client: QueryRunner | undefined;
    let locked = false;
    let job: ImportJob | undefined;
    const started = Date.now();
    try {
      client = this.db.createQueryRunner();
      await client.connect();
      const found = await client.manager.query<
        (Omit<ImportJob, 'from' | 'to'> & {
          state: string;
          from: Date;
          to: Date;
        })[]
      >('SELECT * FROM import_jobs WHERE id=$1', [id]);
      const row = found[0];
      if (!row || row.state === 'complete') {
        channel.ack(message);
        return;
      }
      if (row.state === 'dead') {
        channel.nack(message, false, false);
        return;
      }
      job = {
        ...row,
        from: new Date(row.from).toISOString(),
        to: new Date(row.to).toISOString(),
      };
      const lockKey = `${job.dataset}:${job.from}:${job.to}`;
      const lock = await client.manager.query<{ locked: boolean }[]>(
        'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
        [lockKey],
      );
      locked = lock[0].locked;
      if (!locked) {
        channel.ack(message);
        return;
      }
      // Re-read after acquiring the window lock to handle duplicate deliveries.
      const state = await client.manager.query<{ state: string }[]>(
        'SELECT state FROM import_jobs WHERE id=$1',
        [id],
      );
      if (state[0].state === 'complete') {
        channel.ack(message);
        return;
      }
      const attempt = await client.manager.query<{ attempts: number }[]>(
        "WITH updated AS (UPDATE import_jobs SET state='running',attempts=attempts+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING attempts) SELECT attempts FROM updated",
        [id],
      );
      job.attempts = attempt[0].attempts;
      const result = await this.source.fetch(job);
      await client.startTransaction();
      try {
        await this.repository.store(client.manager, job, result);
        await client.manager.query(
          "UPDATE import_jobs SET state='complete',updated_at=clock_timestamp(),error=NULL,fetch_ms=$2,queue_ms=$3,processing_ms=$4 WHERE id=$1",
          [
            id,
            result.fetchMs,
            started - new Date(job.created_at).getTime(),
            Date.now() - started - result.fetchMs,
          ],
        );
        await client.commitTransaction();
      } catch (error) {
        await client.rollbackTransaction();
        throw error;
      }
      this.logger.log(
        JSON.stringify({
          jobId: id,
          dataset: job.dataset,
          fetchMs: result.fetchMs,
          queueMs: started - new Date(job.created_at).getTime(),
          processingMs: Date.now() - started - result.fetchMs,
        }),
      );
      channel.ack(message);
    } catch (error) {
      const failure =
        error instanceof ImportFailure
          ? error
          : new ImportFailure('Import storage unavailable');
      if (client && job && locked) {
        const dead = !failure.retryable || job.attempts >= 5;
        try {
          await client.startTransaction();
          await client.manager.query(
            "SELECT pg_advisory_xact_lock(hashtext('market-snapshot-commit'))",
          );
          const previous = await client.manager.query<
            { error: string | null }[]
          >(
            'SELECT error FROM market_windows WHERE dataset=$1 AND "from"=$2 AND "to"=$3',
            [job.dataset, job.from, job.to],
          );
          await client.manager.query(
            "UPDATE import_jobs SET state=$2,error=$3,next_attempt_at=clock_timestamp()+($4 * interval '1 millisecond'),updated_at=clock_timestamp() WHERE id=$1",
            [
              id,
              dead ? 'dead' : 'retry',
              failure.message,
              Math.max(
                failure.retryAfterMs,
                Math.min(60000, 1000 * 2 ** job.attempts),
              ),
            ],
          );
          await client.manager.query(
            `INSERT INTO market_windows(dataset,"from","to",error) VALUES($1,$2,$3,$4) ON CONFLICT(dataset,"from","to") DO UPDATE SET error=$4,checked_at=clock_timestamp()`,
            [job.dataset, job.from, job.to, failure.message],
          );
          if (previous[0]?.error !== failure.message)
            await client.manager.query(
              'INSERT INTO market_changes(dataset,"from","to") VALUES($1,$2,$3)',
              [job.dataset, job.from, job.to],
            );
          await client.commitTransaction();
          if (dead) channel.nack(message, false, false);
          else channel.ack(message);
        } catch {
          await client.rollbackTransaction().catch(() => undefined);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          channel.nack(message, false, true);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        channel.nack(message, false, true);
      }
      this.logger.warn(`Import ${id}: ${failure.message}`);
    } finally {
      if (client) {
        if (locked && job)
          await client.manager
            .query('SELECT pg_advisory_unlock(hashtext($1))', [
              `${job.dataset}:${job.from}:${job.to}`,
            ])
            .catch(() => undefined);
        await client.release();
      }
    }
  }
}
