import { DataSource } from 'typeorm';

import { MarketRepository } from '@power-market-dashboard/database';

import { MarketService } from './market.service';

describe('MarketService status', () => {
  it('reports an empty pipeline without a scheduler heartbeat as offline', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          activeLiveJobs: '0',
          oldestLiveJobAt: null,
          schedulerHeartbeatAt: null,
        },
      ])
      .mockResolvedValueOnce([]);
    const service = new MarketService({} as MarketRepository, { query } as unknown as DataSource);

    await expect(service.status()).resolves.toMatchObject({
      pipeline: {
        activeLiveJobs: 0,
        oldestLiveJobAgeSeconds: null,
        schedulerAgeSeconds: null,
        schedulerHeartbeatAt: null,
        status: 'offline',
      },
    });
  });
});
