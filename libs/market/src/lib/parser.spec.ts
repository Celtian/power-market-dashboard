import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { canonicalPoints, parseResponse } from './parser';
const solar = readFileSync(join(__dirname, '../fixtures/solar.xml'), 'utf8');
const bids = readFileSync(join(__dirname, '../fixtures/bids.xml'), 'utf8');

describe('ENTSO-E parser', () => {
  it('expands A03 constant segments including zero and final segment', () => {
    expect(
      parseResponse(strToU8(solar), 'solar-forecast').generation.map(
        (p) => p.mw,
      ),
    ).toEqual([0, 0, 20, 20]);
  });
  it('preserves gaps in A01 curves', () => {
    expect(
      parseResponse(
        strToU8(solar.replace('A03', 'A01')),
        'solar-forecast',
      ).generation.map((p) => p.mw),
    ).toEqual([0, null, 20, null]);
  });
  it('reads ZIP XML and preserves bid identity, currency, negative price and validity', () => {
    const result = parseResponse(
      zipSync({ 'bids.xml': strToU8(bids) }),
      'afrr',
    );
    expect(result.seriesCount).toBe(1);
    expect(result.bids[0]).toMatchObject({
      bidId: 'bid-1',
      mw: 10,
      price: -500,
      currency: 'HUF',
      available: null,
      direction: 'up',
      productType: 'A04',
      validityStart: '2026-09-27T00:00:00.000Z',
    });
  });
  it('preserves cancellations and unavailable flags', () => {
    const xml = bids.replace(
      '<divisible>',
      '<cancelledTS>A01</cancelledTS><status><value>A11</value></status><divisible>',
    );
    expect(parseResponse(strToU8(xml), 'afrr').bids[0]).toMatchObject({
      cancelled: true,
      available: false,
    });
  });
  it('does not turn no-data acknowledgements into zero', () => {
    const xml =
      '<Acknowledgement_MarketDocument><Reason><code>999</code><text>No matching data found</text></Reason></Acknowledgement_MarketDocument>';
    expect(parseResponse(strToU8(xml), 'afrr')).toMatchObject({
      noData: true,
      bids: [],
    });
  });
  it('rejects malformed, unexpected and unsupported source values', () => {
    for (const xml of [
      solar.replace('B16', 'B18'),
      solar.replace('A03', 'A05'),
      solar.replace('<quantity>20', '<quantity>NaN'),
      solar.replace('10YHU-MAVIR----U', 'OTHER'),
      '<bad>',
      '<!DOCTYPE x>' + solar,
    ]) {
      expect(() => parseResponse(strToU8(xml), 'solar-forecast')).toThrow();
    }
  });
  it('deduplicates points and selects the higher revision', () => {
    const p = parseResponse(strToU8(bids), 'afrr').bids[0];
    expect(canonicalPoints([p, p, { ...p, revision: 2, price: 25 }])).toEqual([
      { ...p, revision: 2, price: 25 },
    ]);
    expect(() => canonicalPoints([p, { ...p, price: 99 }])).toThrow(
      'Conflicting',
    );
  });
});
