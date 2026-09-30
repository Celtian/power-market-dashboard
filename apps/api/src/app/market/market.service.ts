import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { MarketRepository, WindowMetadata } from '@power-market-dashboard/database';
import {
  BidPoint,
  DATASETS,
  QUARTER_MS,
  compareSolar,
  ladder,
  quarters,
} from '@power-market-dashboard/market';

import { LadderQuery, PriceHistoryQuery, RangeQuery, validateRange } from './queries';

const ADDITIONAL_LATENCY_TARGET_SECONDS = 30;
const PIPELINE_OFFLINE_SECONDS = 45;

const ids = (windows: WindowMetadata[]) =>
  windows.flatMap((w) => (w.snapshotId ? [w.snapshotId] : []));
function metadata(windows: WindowMetadata[]) {
  return {
    area: 'HU',
    timezone: 'Europe/Budapest',
    source: 'ENTSO-E',
    windows,
    sourcePublicationAt: null,
    publicationNote:
      'sourceCreatedAt is the document creation time, not verified public availability; fetchedAt is our observation time.',
  };
}
interface ImportStatusRow {
  dataset: string;
  lastAttemptAt: Date;
  state: string;
  error: string | null;
  fetchMs: number | null;
  queueMs: number | null;
  processingMs: number | null;
}
interface SuccessRow {
  dataset: string;
  lastSuccessAt: Date | null;
  latestIntervalEnd: Date | null;
}
interface PipelineRow {
  schedulerHeartbeatAt: Date | null;
  activeLiveJobs: string;
  oldestLiveJobAt: Date | null;
}
interface GroupRow {
  product: string;
  direction: string;
  productType: string;
  currency: string | null;
}
@Injectable()
export class MarketService {
  constructor(
    private readonly repository: MarketRepository,
    @InjectDataSource() private readonly db: DataSource,
  ) {}
  async solar(query: RangeQuery) {
    validateRange(query, 31);
    const windows = await this.repository.windows(
      ['solar-actual', 'solar-forecast'],
      query.from,
      query.to,
    );
    const [actual, forecast] = await Promise.all([
      this.repository.generation(
        ids(windows.filter((w) => w.dataset === 'solar-actual')),
        query.from,
        query.to,
      ),
      this.repository.generation(
        ids(windows.filter((w) => w.dataset === 'solar-forecast')),
        query.from,
        query.to,
      ),
    ]);
    const result = compareSolar(actual, forecast, query.from, query.to);
    return {
      ...result,
      complete: result.summary.coverage === 1 && windows.every((w) => !w.error && !w.noData),
      metadata: metadata(windows),
    };
  }
  private select(
    bids: BidPoint[],
    query: Pick<LadderQuery, 'direction' | 'currency' | 'productType'>,
  ) {
    return bids.filter(
      (b) =>
        b.direction === query.direction &&
        b.productType === query.productType &&
        (b.currency === query.currency || b.currency === null),
    );
  }
  async ladder(query: LadderQuery) {
    const time = Date.parse(query.at);
    if (!Number.isFinite(time) || time % QUARTER_MS)
      throw new BadRequestException('at must start a delivery quarter');
    const from = new Date(time).toISOString(),
      to = new Date(time + QUARTER_MS).toISOString();
    const windows = await this.repository.windows([query.product], from, to);
    const bids = this.select(await this.repository.bids(ids(windows), from, to), query);
    const result = ladder(bids, query.direction, query.targetMw);
    const complete =
      windows.length === 1 &&
      !windows[0].noData &&
      !windows[0].error &&
      !!windows[0].snapshotId &&
      result.complete;
    return {
      ...result,
      targetPrice: complete ? result.targetPrice : null,
      complete,
      from,
      to,
      product: query.product,
      direction: query.direction,
      productType: query.productType,
      currency: query.currency,
      priceUnit: `${query.currency}/MWh`,
      volumeUnit: 'MW',
      bids,
      metadata: metadata(windows),
    };
  }
  async history(query: PriceHistoryQuery) {
    validateRange(query, 7);
    const windows = await this.repository.windows([query.product], query.from, query.to);
    const bids = this.select(await this.repository.bids(ids(windows), query.from, query.to), query);
    const data = quarters(query.from, query.to).map((range) => {
      const relevant = bids.filter(
        (b) =>
          Date.parse(b.start) < Date.parse(range.to) && Date.parse(b.end) > Date.parse(range.from),
      );
      const window = windows.find(
        (w) =>
          w.from.getTime() === Date.parse(range.from) && w.to.getTime() === Date.parse(range.to),
      );
      const result = ladder(relevant, query.direction, query.targetMw);
      const complete = !!window?.snapshotId && !window.noData && !window.error && result.complete;
      return {
        ...range,
        price: complete ? result.targetPrice : null,
        totalMw: result.totalMw,
        complete,
        snapshotId: window?.snapshotId ?? null,
      };
    });
    return {
      data,
      targetMw: query.targetMw,
      product: query.product,
      direction: query.direction,
      productType: query.productType,
      currency: query.currency,
      priceUnit: `${query.currency}/MWh`,
      metadata: metadata(windows),
    };
  }
  async status() {
    const latest = await this.db.query<ImportStatusRow[]>(
      `SELECT DISTINCT ON (dataset) dataset,updated_at AS "lastAttemptAt",state,error,fetch_ms AS "fetchMs",queue_ms AS "queueMs",processing_ms AS "processingMs" FROM import_jobs ORDER BY dataset,updated_at DESC,id DESC`,
    );
    const successful = await this.db.query<SuccessRow[]>(
      `SELECT
         w.dataset,
         max(w.last_success_at) AS "lastSuccessAt",
         max(
           CASE
             WHEN w.dataset IN ('solar-actual','solar-forecast') THEN (
               SELECT max(g.end_at)
               FROM generation_intervals g
               WHERE g.snapshot_id=w.snapshot_id
                 AND g.mw IS NOT NULL
                 AND NOT g.cancelled
             )
             ELSE w."to"
           END
         ) FILTER (WHERE w.snapshot_id IS NOT NULL AND NOT w.no_data) AS "latestIntervalEnd"
       FROM market_windows w
       GROUP BY w.dataset`,
    );
    const pipelineRows = await this.db.query<PipelineRow[]>(
      `SELECT
         (SELECT updated_at FROM scheduler_state WHERE key='live') AS "schedulerHeartbeatAt",
         count(*) FILTER (WHERE priority='live' AND state IN ('pending','published','running','retry')) AS "activeLiveJobs",
         min(created_at) FILTER (WHERE priority='live' AND state IN ('pending','published','running','retry')) AS "oldestLiveJobAt"
       FROM import_jobs`,
    );
    const groups = await this.db.query<GroupRow[]>(
      `SELECT DISTINCT w.dataset AS product,b.direction,b.product_type AS "productType",b.currency FROM market_windows w JOIN balancing_bids b ON b.snapshot_id=w.snapshot_id WHERE w."to">now()-interval '7 days' ORDER BY product,b.direction,"productType",b.currency`,
    );
    const now = Date.now();
    const pipelineRow = pipelineRows[0];
    const schedulerAgeSeconds = pipelineRow?.schedulerHeartbeatAt
      ? Math.max(0, (now - new Date(pipelineRow.schedulerHeartbeatAt).getTime()) / 1000)
      : null;
    const oldestLiveJobAgeSeconds = pipelineRow?.oldestLiveJobAt
      ? Math.max(0, (now - new Date(pipelineRow.oldestLiveJobAt).getTime()) / 1000)
      : null;
    const pipelineOffline =
      schedulerAgeSeconds === null || schedulerAgeSeconds > PIPELINE_OFFLINE_SECONDS;
    const pipelineDelayed =
      (oldestLiveJobAgeSeconds !== null &&
        oldestLiveJobAgeSeconds > ADDITIONAL_LATENCY_TARGET_SECONDS) ||
      latest.some((row) => !!row.error);
    const pipelineStatus = pipelineOffline ? 'offline' : pipelineDelayed ? 'delayed' : 'healthy';
    return {
      pipeline: {
        status: pipelineStatus,
        schedulerHeartbeatAt: pipelineRow?.schedulerHeartbeatAt?.toISOString() ?? null,
        schedulerAgeSeconds,
        activeLiveJobs: Number(pipelineRow?.activeLiveJobs ?? 0),
        oldestLiveJobAgeSeconds,
      },
      datasets: DATASETS.map((dataset) => {
        const success = successful.find((r) => r.dataset === dataset);
        const attempt = latest.find((r) => r.dataset === dataset);
        return {
          dataset,
          ...success,
          ...attempt,
          available: !!success?.latestIntervalEnd,
          pollAgeSeconds: success?.lastSuccessAt
            ? Math.max(0, (now - new Date(success.lastSuccessAt).getTime()) / 1000)
            : null,
          intervalAgeSeconds: success?.latestIntervalEnd
            ? Math.max(0, (now - new Date(success.latestIntervalEnd).getTime()) / 1000)
            : null,
        };
      }),
      groups: groups,
      additionalLatencyTargetSeconds: ADDITIONAL_LATENCY_TARGET_SECONDS,
      solarActualFreshnessTargetSeconds: 20 * 60,
      pollingSeconds: 15,
      bidPublicationDeadlineMinutesAfterDelivery: 30,
    };
  }
}
