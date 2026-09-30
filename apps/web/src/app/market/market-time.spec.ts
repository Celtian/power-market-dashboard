import { DateTime } from 'luxon';

import {
  deliveryQuarters,
  historyRange,
  latestPublishedQuarter,
  marketDayRange,
} from './market-time';

describe('market time', () => {
  it('creates 23 and 25 hour Budapest delivery days across DST', () => {
    expect(deliveryQuarters('2026-03-29', 'en').length).toBe(92);
    expect(deliveryQuarters('2026-10-25', 'en').length).toBe(100);
  });

  it('keeps day ranges aligned to the market timezone', () => {
    const spring = marketDayRange('2026-03-29');
    expect(Date.parse(spring.to) - Date.parse(spring.from)).toBe(23 * 3_600_000);
  });

  it('selects the latest quarter past the publication deadline', () => {
    const now = DateTime.fromISO('2026-09-30T12:46:00', {
      zone: 'Europe/Budapest',
    });
    expect(latestPublishedQuarter(now)).toBe('2026-09-30T10:00:00.000Z');
  });

  it('builds an exact 24-hour history ending after the selected quarter', () => {
    const range = historyRange('2026-09-30T10:00:00.000Z');
    expect(Date.parse(range.to) - Date.parse(range.from)).toBe(24 * 3_600_000);
    expect(range.to).toBe('2026-09-30T10:15:00.000Z');
  });
});
