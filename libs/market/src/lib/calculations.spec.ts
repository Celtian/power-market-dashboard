import { compareSolar, ladder } from './calculations';
import { tradingDay } from './time';
import { BidPoint, GenerationPoint } from './types';

const point = (start: string, end: string, mw: number | null): GenerationPoint => ({
  start,
  end,
  mw,
  resolutionSeconds: (Date.parse(end) - Date.parse(start)) / 1000,
  seriesId: 'solar',
  revision: 1,
  cancelled: false,
});
const bid = (bidId: string, mw: number, price: number | null): BidPoint => ({
  start: '2026-09-27T00:00:00Z',
  end: '2026-09-27T00:15:00Z',
  resolutionSeconds: 900,
  bidId,
  mw,
  price,
  direction: 'up',
  currency: 'HUF',
  productType: 'A04',
  available: true,
  cancelled: false,
  divisible: true,
  complexity: null,
  validityStart: null,
  validityEnd: null,
  revision: 1,
});

describe('trader calculations', () => {
  it('builds up/down ladders with exact cumulative boundaries and no extrapolation', () => {
    const bids = [bid('a', 10, -20), bid('b', 20, 10), bid('c', 5, 10)];
    expect(ladder(bids, 'up', 10).targetPrice).toBe(-20);
    expect(ladder(bids, 'up', 10.001).targetPrice).toBe(10);
    expect(ladder(bids, 'up', 35).steps).toHaveLength(2);
    expect(ladder(bids, 'up', 36).targetPrice).toBeNull();
    expect(ladder(bids, 'down', 25).targetPrice).toBe(10);
    expect(ladder(bids, 'down', 26).targetPrice).toBe(-20);
  });
  it('excludes unavailable/cancelled bids and never prices an incomplete ladder', () => {
    const bids = [
      bid('a', 10, 1),
      { ...bid('b', 20, 2), cancelled: true },
      { ...bid('c', 20, 3), available: false },
    ];
    expect(ladder(bids, 'up').totalMw).toBe(10);
    expect(ladder([...bids, bid('missing', 1, null)], 'up', 1)).toMatchObject({
      complete: false,
      targetPrice: null,
      missingPriceCount: 1,
    });
  });
  it('averages power over fully covered coarser intervals', () => {
    const from = '2026-09-27T00:00:00Z',
      middle = '2026-09-27T00:30:00Z',
      to = '2026-09-27T01:00:00Z';
    const result = compareSolar(
      [point(from, middle, 10), point(middle, to, 30)],
      [point(from, to, 10)],
      from,
      to,
    );
    expect(result.data[0]).toMatchObject({
      actualMw: 20,
      forecastMw: 10,
      deviationMw: 10,
      deviationPercent: 100,
    });
    expect(result.summary).toEqual({ maeMw: 10, rmseMw: 10, coverage: 1 });
    expect(
      compareSolar([point(from, middle, 10)], [point(from, to, 10)], from, to).data[0].actualMw,
    ).toBeNull();
  });
  it('handles zero forecasts and missing data without fabricating percentages', () => {
    const from = '2026-09-27T00:00:00Z',
      to = '2026-09-27T00:15:00Z';
    expect(
      compareSolar([point(from, to, 2)], [point(from, to, 0)], from, to).data[0].deviationPercent,
    ).toBeNull();
    expect(compareSolar([], [], from, to).summary).toEqual({
      maeMw: null,
      rmseMw: null,
      coverage: 0,
    });
  });
  it('uses 23 and 25 hour Budapest trading days across DST', () => {
    const spring = tradingDay('2026-03-29'),
      autumn = tradingDay('2026-10-25');
    expect((Date.parse(spring.to) - Date.parse(spring.from)) / 3600000).toBe(23);
    expect((Date.parse(autumn.to) - Date.parse(autumn.from)) / 3600000).toBe(25);
  });
});
