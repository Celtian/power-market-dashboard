import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import {
  DataSource,
  EntityManager,
  In,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import {
  BidPoint,
  Dataset,
  GenerationPoint,
  ImportJob,
  ImportRequest,
  ImportResult,
  canonicalPoints,
} from '@power-market-dashboard/market';
import {
  BalancingBidEntity,
  GenerationIntervalEntity,
  MarketChangeEntity,
  MarketSnapshotEntity,
  MarketWindowEntity,
  SnapshotDocumentEntity,
  SourceDocumentEntity,
} from './entities';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export interface WindowMetadata {
  dataset: Dataset;
  from: Date;
  to: Date;
  snapshotId: string | null;
  checkedAt: Date;
  lastSuccessAt: Date | null;
  error: string | null;
  noData: boolean;
  fetchedAt: Date | null;
  storedAt: Date | null;
  sourceCreatedAt: Date | null;
  revision: number | null;
}

@Injectable()
export class MarketRepository {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(MarketWindowEntity)
    private readonly windowRepository: Repository<MarketWindowEntity>,
    @InjectRepository(GenerationIntervalEntity)
    private readonly generationRepository: Repository<GenerationIntervalEntity>,
    @InjectRepository(BalancingBidEntity)
    private readonly bidRepository: Repository<BalancingBidEntity>,
  ) {}

  async enqueue(request: ImportRequest, manager = this.db.manager) {
    // The partial unique index and promotion of an active historical job are one atomic operation.
    await manager.query(
      `INSERT INTO import_jobs(dataset,"from","to",priority) VALUES($1,$2,$3,$4)
       ON CONFLICT(dataset,"from","to") WHERE state IN ('pending','published','running','retry')
       DO UPDATE SET
         priority=CASE WHEN EXCLUDED.priority='live' THEN 'live' ELSE import_jobs.priority END,
         state=CASE WHEN EXCLUDED.priority='live' AND import_jobs.priority='history' AND import_jobs.state='published' THEN 'retry' ELSE import_jobs.state END,
         next_attempt_at=CASE WHEN EXCLUDED.priority='live' AND import_jobs.priority='history' AND import_jobs.state='published' THEN now() ELSE import_jobs.next_attempt_at END`,
      [request.dataset, request.from, request.to, request.priority],
    );
  }

  async store(manager: EntityManager, job: ImportJob, result: ImportResult) {
    const inWindow = (p: { start: string; end: string }) =>
      Date.parse(p.start) < Date.parse(job.to) &&
      Date.parse(p.end) > Date.parse(job.from);
    const generation = canonicalPoints(result.generation.filter(inWindow));
    const bids = canonicalPoints(result.bids.filter(inWindow));
    const contentHash = hash(
      JSON.stringify({ generation, bids, noData: result.noData }),
    );
    // Serialize event IDs with commit order so SSE cursors cannot skip a concurrent commit.
    await manager.query(
      "SELECT pg_advisory_xact_lock(hashtext('market-snapshot-commit'))",
    );
    const windows = manager.getRepository(MarketWindowEntity);
    const key = {
      dataset: job.dataset,
      from: new Date(job.from),
      to: new Date(job.to),
    };
    const previous = await windows.findOne({
      where: key,
      relations: { snapshot: true },
    });
    let snapshotId = previous?.snapshotId ?? null;
    const changed = previous?.snapshot?.contentHash !== contentHash;
    if (changed) {
      const created = result.documents
        .map((d) => d.createdAt)
        .filter((d): d is string => d !== null)
        .sort()
        .at(-1);
      const snapshot = await manager.getRepository(MarketSnapshotEntity).save({
        ...key,
        contentHash,
        fetchedAt: new Date(result.fetchedAt),
        sourceCreatedAt: created ? new Date(created) : null,
        revision: Math.max(0, ...result.documents.map((d) => d.revision)),
        noData: result.noData,
      });
      snapshotId = snapshot.id;
      for (const doc of result.documents) {
        const documentHash = hash(doc.xml);
        await manager
          .createQueryBuilder()
          .insert()
          .into(SourceDocumentEntity)
          .values({
            hash: documentHash,
            dataset: job.dataset,
            sourceId: doc.id,
            revision: doc.revision,
            sourceCreatedAt: doc.createdAt ? new Date(doc.createdAt) : null,
            firstSeenAt: new Date(doc.observedAt ?? result.fetchedAt),
            xml: doc.xml,
          })
          .orIgnore()
          .execute();
        await manager
          .createQueryBuilder()
          .insert()
          .into(SnapshotDocumentEntity)
          .values({ snapshotId, documentHash })
          .orIgnore()
          .execute();
      }
      if (generation.length)
        await manager.getRepository(GenerationIntervalEntity).insert(
          generation.map((p) => ({
            snapshotId: snapshot.id,
            startAt: new Date(p.start),
            endAt: new Date(p.end),
            seriesId: p.seriesId,
            mw: p.mw,
            resolutionSeconds: p.resolutionSeconds,
            revision: p.revision,
            cancelled: p.cancelled,
          })),
        );
      if (bids.length)
        await manager.getRepository(BalancingBidEntity).insert(
          bids.map((p) => ({
            snapshotId: snapshot.id,
            startAt: new Date(p.start),
            endAt: new Date(p.end),
            bidId: p.bidId,
            direction: p.direction,
            productType: p.productType,
            currency: p.currency,
            mw: p.mw,
            price: p.price,
            available: p.available,
            cancelled: p.cancelled,
            divisible: p.divisible,
            complexity: p.complexity,
            validityStart: p.validityStart ? new Date(p.validityStart) : null,
            validityEnd: p.validityEnd ? new Date(p.validityEnd) : null,
            resolutionSeconds: p.resolutionSeconds,
            revision: p.revision,
          })),
        );
    }
    if (changed || previous?.error)
      await manager.getRepository(MarketChangeEntity).insert(key);
    await windows.upsert(
      {
        ...key,
        snapshotId,
        checkedAt: new Date(),
        lastSuccessAt: new Date(),
        error: null,
        noData: result.noData,
      },
      ['dataset', 'from', 'to'],
    );
    return changed;
  }

  async windows(
    datasets: Dataset[],
    from: string,
    to: string,
  ): Promise<WindowMetadata[]> {
    const windows = await this.windowRepository.find({
      where: {
        dataset: In(datasets),
        from: LessThan(new Date(to)),
        to: MoreThan(new Date(from)),
      },
      relations: { snapshot: true },
      order: { dataset: 'ASC', from: 'ASC' },
    });
    return windows.map((w) => ({
      dataset: w.dataset,
      from: w.from,
      to: w.to,
      snapshotId: w.snapshotId,
      checkedAt: w.checkedAt,
      lastSuccessAt: w.lastSuccessAt,
      error: w.error,
      noData: w.noData,
      fetchedAt: w.snapshot?.fetchedAt ?? null,
      storedAt: w.snapshot?.storedAt ?? null,
      sourceCreatedAt: w.snapshot?.sourceCreatedAt ?? null,
      revision: w.snapshot?.revision ?? null,
    }));
  }

  async generation(
    snapshotIds: string[],
    from: string,
    to: string,
  ): Promise<GenerationPoint[]> {
    const points = await this.generationRepository.find({
      where: {
        snapshotId: In(snapshotIds),
        startAt: LessThan(new Date(to)),
        endAt: MoreThan(new Date(from)),
      },
      order: { startAt: 'ASC' },
    });
    return points.map((p) => ({
      start: p.startAt.toISOString(),
      end: p.endAt.toISOString(),
      seriesId: p.seriesId,
      mw: p.mw,
      resolutionSeconds: p.resolutionSeconds,
      revision: p.revision,
      cancelled: p.cancelled,
    }));
  }

  async bids(
    snapshotIds: string[],
    from: string,
    to: string,
  ): Promise<BidPoint[]> {
    const bids = await this.bidRepository.find({
      where: {
        snapshotId: In(snapshotIds),
        startAt: LessThan(new Date(to)),
        endAt: MoreThan(new Date(from)),
      },
      order: { startAt: 'ASC', bidId: 'ASC' },
    });
    return bids.map((b) => ({
      start: b.startAt.toISOString(),
      end: b.endAt.toISOString(),
      bidId: b.bidId,
      direction: b.direction,
      productType: b.productType,
      currency: b.currency,
      mw: b.mw,
      price: b.price,
      available: b.available,
      cancelled: b.cancelled,
      divisible: b.divisible,
      complexity: b.complexity,
      validityStart: b.validityStart?.toISOString() ?? null,
      validityEnd: b.validityEnd?.toISOString() ?? null,
      resolutionSeconds: b.resolutionSeconds,
      revision: b.revision,
    }));
  }
}
