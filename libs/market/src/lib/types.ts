export const HU_DOMAIN = '10YHU-MAVIR----U';
export const DATASETS = ['solar-actual', 'solar-forecast', 'afrr', 'mfrr'] as const;
export type Dataset = (typeof DATASETS)[number];
export type Direction = 'up' | 'down';
export interface ImportRequest {
  dataset: Dataset;
  from: string;
  to: string;
  priority: 'live' | 'history';
}
export interface ImportJob extends ImportRequest {
  id: string;
  created_at: Date;
  attempts: number;
}
export interface DocumentInfo {
  id: string;
  revision: number;
  createdAt: string | null;
  xml: string;
  observedAt?: string;
}
export interface GenerationPoint {
  start: string;
  end: string;
  resolutionSeconds: number;
  mw: number | null;
  seriesId: string;
  revision: number;
  cancelled: boolean;
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
export interface ParsedPage {
  documents: DocumentInfo[];
  generation: GenerationPoint[];
  bids: BidPoint[];
  seriesCount: number;
  noData: boolean;
}
export interface ImportResult extends ParsedPage {
  fetchedAt: string;
  fetchMs: number;
}
export interface ChangeEvent {
  id: string;
  dataset: Dataset;
  from: string;
  to: string;
  recordedAt: string;
}
export interface LadderStep {
  fromMw: number;
  toMw: number;
  price: number;
  bidIds: string[];
}
