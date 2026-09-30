export type Dataset = 'solar-actual' | 'solar-forecast' | 'afrr' | 'mfrr';
export type Direction = 'up' | 'down';
export type BalancingProduct = 'afrr' | 'mfrr';

export interface WindowMetadata {
  dataset: Dataset;
  from: string;
  to: string;
  snapshotId: string | null;
  checkedAt: string;
  lastSuccessAt: string | null;
  error: string | null;
  noData: boolean;
  fetchedAt: string | null;
  storedAt: string | null;
  sourceCreatedAt: string | null;
  revision: number | null;
}

export interface MarketMetadata {
  area: 'HU';
  timezone: 'Europe/Budapest';
  source: 'ENTSO-E';
  sourcePublicationAt: string | null;
  publicationNote: string;
  windows: WindowMetadata[];
}

export interface SolarPoint {
  start: string;
  end: string;
  actualMw: number | null;
  forecastMw: number | null;
  deviationMw: number | null;
  deviationPercent: number | null;
}

export interface SolarResponse {
  data: SolarPoint[];
  resolutionSeconds: number;
  unit: 'MW';
  complete: boolean;
  summary: {
    maeMw: number | null;
    rmseMw: number | null;
    coverage: number;
  };
  metadata: MarketMetadata;
}

export interface LadderStep {
  fromMw: number;
  toMw: number;
  price: number;
  bidIds: string[];
}

export interface BidPoint {
  start: string;
  end: string;
  resolutionSeconds: number;
  bidId: string;
  direction: Direction;
  productType: string;
  currency: string | null;
  mw: number;
  price: number | null;
  available: boolean | null;
  cancelled: boolean;
  divisible: boolean | null;
  complexity: string | null;
  validityStart: string | null;
  validityEnd: string | null;
  revision: number;
}

export interface LadderResponse {
  from: string;
  to: string;
  product: BalancingProduct;
  direction: Direction;
  productType: string;
  currency: string;
  priceUnit: string;
  volumeUnit: 'MW';
  steps: LadderStep[];
  totalMw: number;
  targetPrice: number | null;
  complete: boolean;
  missingPriceCount: number;
  unknownAvailabilityCount: number;
  complexBidCount: number;
  interpretation: 'published-offer-order';
  bids: BidPoint[];
  metadata: MarketMetadata;
}

export interface PriceHistoryPoint {
  from: string;
  to: string;
  price: number | null;
  totalMw: number;
  complete: boolean;
  snapshotId: string | null;
}

export interface PriceHistoryResponse {
  data: PriceHistoryPoint[];
  targetMw: number;
  product: BalancingProduct;
  direction: Direction;
  productType: string;
  currency: string;
  priceUnit: string;
  metadata: MarketMetadata;
}

export interface DatasetStatus {
  dataset: Dataset;
  state?: string;
  error?: string | null;
  lastAttemptAt?: string;
  lastSuccessAt?: string | null;
  latestIntervalEnd?: string | null;
  available: boolean;
  fetchMs?: number | null;
  queueMs?: number | null;
  processingMs?: number | null;
  pollAgeSeconds: number | null;
  intervalAgeSeconds: number | null;
}

export interface ProductGroup {
  product: BalancingProduct;
  direction: Direction;
  productType: string;
  currency: string | null;
}

export interface DataStatusResponse {
  datasets: DatasetStatus[];
  groups: ProductGroup[];
  additionalLatencyTargetSeconds: number;
  solarActualFreshnessTargetSeconds: number;
  pollingSeconds: number;
  bidPublicationDeadlineMinutesAfterDelivery: number;
}

export interface LadderQuery {
  at: string;
  product: BalancingProduct;
  direction: Direction;
  productType: string;
  currency: string;
  targetMw: number;
}

export interface PriceHistoryQuery extends Omit<LadderQuery, 'at'> {
  from: string;
  to: string;
}
