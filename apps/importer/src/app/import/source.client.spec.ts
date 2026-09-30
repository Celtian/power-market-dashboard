import axios from 'axios';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { EntsoeConfig } from '../entsoe/entsoe.config';
import { SourceClient } from './source.client';

const xml = readFileSync(resolve('libs/market/src/fixtures/bids.xml'), 'utf8');
function page(count: number, offset = 0) {
  const series = xml.match(/<Bid_TimeSeries>[\s\S]*<\/Bid_TimeSeries>/)?.[0];
  if (!series) throw new Error('Missing bid fixture');
  return Buffer.from(
    xml.replace(
      series,
      Array.from({ length: count }, (_, i) => series.replace('bid-1', `bid-${offset + i}`)).join(
        '',
      ),
    ),
  );
}
describe('source pagination', () => {
  beforeEach(() => {
    process.env.ENTSOE_SECURITY_TOKEN = 'test-token';
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  it('loads every page and returns a single complete batch', async () => {
    const get = jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({ data: page(100) })
      .mockResolvedValueOnce({ data: page(25, 100) });
    const result = await new SourceClient(new EntsoeConfig()).fetch({
      dataset: 'afrr',
      from: '2026-09-27T00:00Z',
      to: '2026-09-27T00:15Z',
      priority: 'live',
    });
    expect(result.bids).toHaveLength(125);
    expect(get.mock.calls[1][1]?.params.offset).toBe(100);
  });
  it('fails the entire batch if a subsequent page fails', async () => {
    jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({ data: page(100) })
      .mockRejectedValueOnce(new Error('unavailable'));
    await expect(
      new SourceClient(new EntsoeConfig()).fetch({
        dataset: 'afrr',
        from: '2026-09-27T00:00Z',
        to: '2026-09-27T00:15Z',
        priority: 'live',
      }),
    ).rejects.toThrow();
  });
  it('detects a repeated page rather than publishing duplicates', async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({ data: page(100) });
    await expect(
      new SourceClient(new EntsoeConfig()).fetch({
        dataset: 'afrr',
        from: '2026-09-27T00:00Z',
        to: '2026-09-27T00:15Z',
        priority: 'live',
      }),
    ).rejects.toThrow('Repeated');
  });
  it('applies a shared cooldown after HTTP 429', async () => {
    jest.useFakeTimers();
    const get = jest
      .spyOn(axios, 'get')
      .mockRejectedValueOnce(
        Object.assign(new Error('rate limited'), {
          isAxiosError: true,
          response: { status: 429, headers: { 'retry-after': '120' } },
        }),
      )
      .mockResolvedValueOnce({ data: page(1) });
    const source = new SourceClient(new EntsoeConfig());
    const request = {
      dataset: 'afrr' as const,
      from: '2026-09-27T00:00Z',
      to: '2026-09-27T00:15Z',
      priority: 'live' as const,
    };
    const first = source.fetch(request);
    const rejected = expect(first).rejects.toMatchObject({
      retryable: true,
      retryAfterMs: 120000,
    });
    await jest.advanceTimersByTimeAsync(1);
    await rejected;
    const next = source.fetch(request);
    await jest.advanceTimersByTimeAsync(119998);
    expect(get).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(2);
    expect((await next).bids).toHaveLength(1);
  });
});
