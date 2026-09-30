import { retryStartup } from './startup-retry';

describe('startup retry', () => {
  it('retries with capped exponential backoff and a safe error reason', async () => {
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(
        Object.assign(new Error('amqp://secret@example.test'), { code: 'ECONNREFUSED' }),
      )
      .mockRejectedValueOnce(new TypeError('credentials'))
      .mockResolvedValue('ready');
    const retries: Array<{ attempt: number; delayMs: number; reason: string }> = [];
    const delays: number[] = [];

    await expect(
      retryStartup(operation, (retry) => retries.push(retry), {
        initialDelayMs: 10,
        maxDelayMs: 15,
        sleep: async (delayMs) => {
          delays.push(delayMs);
        },
      }),
    ).resolves.toBe('ready');

    expect(delays).toEqual([10, 15]);
    expect(retries).toEqual([
      { attempt: 1, delayMs: 10, reason: 'ECONNREFUSED' },
      { attempt: 2, delayMs: 15, reason: 'TypeError' },
    ]);
    expect(JSON.stringify(retries)).not.toContain('secret');
  });
});
