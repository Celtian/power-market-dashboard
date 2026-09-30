import { DateTime } from 'luxon';

export const QUARTER_MS = 15 * 60_000;
export function tradingDay(date: string, offset = 0): { from: string; to: string } {
  const start = DateTime.fromISO(date, { zone: 'Europe/Budapest' })
    .startOf('day')
    .plus({ days: offset });
  if (!start.isValid) throw new Error('Invalid trading day');
  return {
    from: start.toUTC().toJSDate().toISOString(),
    to: start.plus({ days: 1 }).toUTC().toJSDate().toISOString(),
  };
}
export function utcDay(time: number): { from: string; to: string } {
  const start = Math.floor(time / 86_400_000) * 86_400_000;
  return {
    from: new Date(start).toISOString(),
    to: new Date(start + 86_400_000).toISOString(),
  };
}
export function quarters(from: string, to: string): { from: string; to: string }[] {
  const result = [];
  for (let t = Date.parse(from); t < Date.parse(to); t += QUARTER_MS) {
    result.push({
      from: new Date(t).toISOString(),
      to: new Date(Math.min(t + QUARTER_MS, Date.parse(to))).toISOString(),
    });
  }
  return result;
}
export function entsoeTime(value: string): string {
  return new Date(value).toISOString().slice(0, 16).replace(/[-T:]/g, '');
}
