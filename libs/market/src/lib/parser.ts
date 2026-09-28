import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { unzipSync, strFromU8 } from 'fflate';
import {
  BidPoint,
  Dataset,
  GenerationPoint,
  HU_DOMAIN,
  ParsedPage,
} from './types';

type Node = Record<string, unknown>;
const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});
function node(value: unknown): Node {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid XML structure');
  return value as Node;
}
function list(value: unknown): Node[] {
  return value === undefined
    ? []
    : (Array.isArray(value) ? value : [value]).map(node);
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.length ? value : null;
}
function required(value: unknown, name: string): string {
  const result = text(value);
  if (result === null) throw new Error(`Missing ${name}`);
  return result;
}
function numeric(value: unknown): number | null {
  if (value === undefined || value === '') return null;
  const n = Number(required(value, 'number'));
  if (!Number.isFinite(n)) throw new Error('Invalid numeric value');
  return n;
}
function instant(value: unknown): string {
  const ms = Date.parse(required(value, 'timestamp'));
  if (!Number.isFinite(ms)) throw new Error('Invalid timestamp');
  return new Date(ms).toISOString();
}
function flag(value: unknown): boolean | null {
  if (value === undefined) return null;
  if (value === 'A01') return true;
  if (value === 'A02') return false;
  throw new Error('Invalid boolean code');
}
function duration(value: unknown): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(
    required(value, 'resolution'),
  );
  if (!match) throw new Error('Unsupported resolution');
  const seconds =
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0);
  if (seconds <= 0) throw new Error('Invalid resolution');
  return seconds;
}
export class SourceRejection extends Error {
  constructor(readonly code: string) {
    super(`ENTSO-E acknowledgement ${code}`);
  }
}
export function parseResponse(data: Uint8Array, dataset: Dataset): ParsedPage {
  if (data.length > 20 * 1024 * 1024)
    throw new Error('Source response too large');
  let xmls: string[];
  if (data[0] === 0x50 && data[1] === 0x4b) {
    let total = 0;
    const entries = unzipSync(data, {
      filter: (entry) => {
        total += entry.originalSize;
        if (total > 100 * 1024 * 1024)
          throw new Error('Expanded response too large');
        return entry.name.endsWith('.xml');
      },
    });
    xmls = Object.values(entries).map((value) => strFromU8(value));
  } else xmls = [strFromU8(data)];
  if (!xmls.length) throw new Error('Response contains no XML documents');
  const result: ParsedPage = {
    documents: [],
    generation: [],
    bids: [],
    seriesCount: 0,
    noData: false,
  };
  for (const xml of xmls) {
    if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
      throw new Error('Invalid XML');
    const parsed = node(parser.parse(xml));
    if (parsed['Acknowledgement_MarketDocument']) {
      const acknowledgement = node(parsed['Acknowledgement_MarketDocument']);
      const reasons = list(acknowledgement['Reason']);
      if (
        reasons.length &&
        reasons.every(
          (reason) =>
            reason['code'] === '999' &&
            /no matching data/i.test(String(reason['text'])),
        )
      ) {
        result.noData = true;
        continue;
      }
      throw new SourceRejection(String(reasons[0]?.['code'] ?? 'unknown'));
    }
    const isSolar = dataset.startsWith('solar');
    const root = node(
      parsed[isSolar ? 'GL_MarketDocument' : 'ReserveBid_MarketDocument'],
    );
    const expectedType = isSolar
      ? dataset === 'solar-actual'
        ? 'A75'
        : 'A69'
      : 'A37';
    const process =
      dataset === 'solar-actual'
        ? 'A16'
        : dataset === 'solar-forecast'
          ? 'A01'
          : dataset === 'afrr'
            ? 'A51'
            : 'A47';
    if (
      root['type'] !== expectedType ||
      root['process.processType'] !== process
    )
      throw new Error('Unexpected dataset');
    const revision = numeric(root['revisionNumber']) ?? 1;
    if (!Number.isInteger(revision) || revision < 1)
      throw new Error('Invalid document revision');
    result.documents.push({
      id: required(root['mRID'], 'document ID'),
      revision,
      createdAt: root['createdDateTime']
        ? instant(root['createdDateTime'])
        : null,
      xml,
    });
    const series = list(root[isSolar ? 'TimeSeries' : 'Bid_TimeSeries']);
    result.seriesCount += series.length;
    for (const ts of series) {
      if (ts['quantity_Measure_Unit.name'] !== 'MAW')
        throw new Error('Expected MW');
      const domain =
        ts[isSolar ? 'inBiddingZone_Domain.mRID' : 'connecting_Domain.mRID'];
      if (domain !== HU_DOMAIN) throw new Error('Unexpected source area');
      if (isSolar && node(ts['MktPSRType'])['psrType'] !== 'B16')
        throw new Error('Expected solar production');
      if (!isSolar && ts['price_Measure_Unit.name'] !== 'MWH')
        throw new Error('Expected price per MWh');
      const cancelled =
        ts['cancelledTS'] === 'A01' ||
        (root['docStatus'] && node(root['docStatus'])['value'] === 'A09') ||
        false;
      const curve = text(ts['curveType']) ?? 'A01';
      if (!['A01', 'A03'].includes(curve))
        throw new Error(`Unsupported curve ${curve}`);
      const seriesId = required(ts['mRID'], 'series ID');
      for (const period of list(ts['Period'])) {
        const interval = node(period['timeInterval']);
        const start = Date.parse(instant(interval['start']));
        const end = Date.parse(instant(interval['end']));
        const seconds = duration(period['resolution']);
        const count = (end - start) / (seconds * 1000);
        if (!Number.isInteger(count) || count <= 0 || count > 100_000)
          throw new Error('Invalid period');
        const positions = new Map<number, Node>();
        for (const point of list(period['Point'])) {
          const pos = numeric(point['position']);
          if (
            pos === null ||
            !Number.isInteger(pos) ||
            pos < 1 ||
            pos > count ||
            positions.has(pos)
          )
            throw new Error('Invalid point position');
          positions.set(pos, point);
        }
        let previous: Node | undefined;
        for (let i = 1; i <= count; i++) {
          const point =
            positions.get(i) ?? (curve === 'A03' ? previous : undefined);
          previous = point;
          const common = {
            start: new Date(start + (i - 1) * seconds * 1000).toISOString(),
            end: new Date(start + i * seconds * 1000).toISOString(),
            resolutionSeconds: seconds,
            revision,
            cancelled: Boolean(cancelled),
          };
          if (isSolar) {
            result.generation.push({
              ...common,
              seriesId,
              mw: point ? numeric(point['quantity']) : null,
            });
          } else {
            if (!point) throw new Error('Incomplete bid points');
            const direction = ts['flowDirection.direction'];
            if (direction !== 'A01' && direction !== 'A02')
              throw new Error('Invalid direction');
            const mw = numeric(point['quantity.quantity']);
            if (mw === null || mw < 0) throw new Error('Invalid bid volume');
            const validity = ts['validity_Period.timeInterval']
              ? node(ts['validity_Period.timeInterval'])
              : null;
            const status = ts['status']
              ? node(ts['status'])['value']
              : undefined;
            result.bids.push({
              ...common,
              bidId: seriesId,
              mw,
              price: numeric(point['energy_Price.amount']),
              currency: text(ts['currency_Unit.name']),
              direction: direction === 'A01' ? 'up' : 'down',
              productType:
                text(ts['standard_MarketProduct.marketProductType']) ??
                text(ts['original_MarketProduct.marketProductType']) ??
                'unknown',
              available:
                status === 'A06' ? true : status === 'A11' ? false : null,
              divisible: flag(ts['divisible']),
              complexity: text(ts['multipartBidIdentification'])
                ? 'multipart'
                : text(ts['exclusiveBidsIdentification'])
                  ? 'exclusive'
                  : text(ts['linkedBidsIdentification'])
                    ? 'linked'
                    : null,
              validityStart: validity ? instant(validity['start']) : null,
              validityEnd: validity ? instant(validity['end']) : null,
            });
          }
        }
      }
    }
  }
  return result;
}
export function canonicalPoints<T extends GenerationPoint | BidPoint>(
  points: T[],
): T[] {
  const selected = new Map<string, T>();
  for (const point of points) {
    const key =
      'bidId' in point
        ? `${point.bidId}|${point.start}|${point.end}`
        : `${point.seriesId}|${point.start}|${point.end}`;
    const old = selected.get(key);
    if (!old || point.revision > old.revision) selected.set(key, point);
    else if (
      point.revision === old.revision &&
      JSON.stringify(point) !== JSON.stringify(old)
    )
      throw new Error('Conflicting source points');
  }
  return [...selected.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, p]) => p);
}
