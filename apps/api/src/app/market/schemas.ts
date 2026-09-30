import { SchemaObject } from '@nestjs/swagger';

const number: SchemaObject = { type: 'number' };
const nullableNumber: SchemaObject = { type: 'number', nullable: true };
const timestamp: SchemaObject = { type: 'string', format: 'date-time' };
const text: SchemaObject = { type: 'string' };
const boolean: SchemaObject = { type: 'boolean' };
function object(
  properties: Record<string, SchemaObject>,
  required = Object.keys(properties),
): SchemaObject {
  return { type: 'object', properties, required };
}
function array(items: SchemaObject): SchemaObject {
  return { type: 'array', items };
}
const metadata = object({
  area: { type: 'string', enum: ['HU'] },
  timezone: { type: 'string', enum: ['Europe/Budapest'] },
  source: { type: 'string', enum: ['ENTSO-E'] },
  sourcePublicationAt: { ...timestamp, nullable: true },
  publicationNote: text,
  windows: array(
    object({
      dataset: text,
      from: timestamp,
      to: timestamp,
      snapshotId: { ...text, nullable: true },
      checkedAt: timestamp,
      lastSuccessAt: { ...timestamp, nullable: true },
      error: { ...text, nullable: true },
      noData: boolean,
      fetchedAt: { ...timestamp, nullable: true },
      storedAt: { ...timestamp, nullable: true },
      sourceCreatedAt: { ...timestamp, nullable: true },
      revision: nullableNumber,
    }),
  ),
});
export const solarSchema = object({
  data: array(
    object({
      start: timestamp,
      end: timestamp,
      actualMw: nullableNumber,
      forecastMw: nullableNumber,
      deviationMw: nullableNumber,
      deviationPercent: nullableNumber,
    }),
  ),
  resolutionSeconds: number,
  unit: { type: 'string', enum: ['MW'] },
  complete: boolean,
  summary: object({
    maeMw: nullableNumber,
    rmseMw: nullableNumber,
    coverage: number,
  }),
  metadata,
});
export const ladderSchema = object({
  from: timestamp,
  to: timestamp,
  product: text,
  direction: text,
  productType: text,
  currency: text,
  priceUnit: text,
  volumeUnit: text,
  steps: array(
    object({
      fromMw: number,
      toMw: number,
      price: number,
      bidIds: array(text),
    }),
  ),
  totalMw: number,
  targetPrice: nullableNumber,
  complete: boolean,
  missingPriceCount: number,
  unknownAvailabilityCount: number,
  complexBidCount: number,
  interpretation: { type: 'string', enum: ['published-offer-order'] },
  bids: array(
    object({
      start: timestamp,
      end: timestamp,
      resolutionSeconds: number,
      bidId: text,
      direction: text,
      productType: text,
      currency: { ...text, nullable: true },
      mw: number,
      price: nullableNumber,
      available: { ...boolean, nullable: true },
      cancelled: boolean,
      divisible: { ...boolean, nullable: true },
      complexity: { ...text, nullable: true },
      validityStart: { ...timestamp, nullable: true },
      validityEnd: { ...timestamp, nullable: true },
      revision: number,
    }),
  ),
  metadata,
});
export const historySchema = object({
  data: array(
    object({
      from: timestamp,
      to: timestamp,
      price: nullableNumber,
      totalMw: number,
      complete: boolean,
      snapshotId: { ...text, nullable: true },
    }),
  ),
  targetMw: number,
  product: text,
  direction: text,
  productType: text,
  currency: text,
  priceUnit: text,
  metadata,
});
export const statusSchema = object({
  pipeline: object({
    status: { type: 'string', enum: ['healthy', 'delayed', 'offline'] },
    schedulerHeartbeatAt: { ...timestamp, nullable: true },
    schedulerAgeSeconds: nullableNumber,
    activeLiveJobs: number,
    oldestLiveJobAgeSeconds: nullableNumber,
  }),
  datasets: array(
    object(
      {
        dataset: text,
        state: text,
        error: { ...text, nullable: true },
        lastAttemptAt: timestamp,
        lastSuccessAt: { ...timestamp, nullable: true },
        latestIntervalEnd: { ...timestamp, nullable: true },
        available: boolean,
        fetchMs: nullableNumber,
        queueMs: nullableNumber,
        processingMs: nullableNumber,
        pollAgeSeconds: nullableNumber,
        intervalAgeSeconds: nullableNumber,
      },
      ['dataset', 'available', 'pollAgeSeconds', 'intervalAgeSeconds'],
    ),
  ),
  groups: array(
    object({
      product: text,
      direction: text,
      productType: text,
      currency: { ...text, nullable: true },
    }),
  ),
  additionalLatencyTargetSeconds: number,
  solarActualFreshnessTargetSeconds: number,
  pollingSeconds: number,
  bidPublicationDeadlineMinutesAfterDelivery: number,
});
