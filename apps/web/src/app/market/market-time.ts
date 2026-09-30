import { DateTime } from 'luxon';

export const MARKET_ZONE = 'Europe/Budapest';
const QUARTER_MINUTES = 15;

export interface DeliveryQuarter {
  value: string;
  label: string;
}

export const marketToday = (now: DateTime<boolean> = DateTime.now()): string =>
  now.setZone(MARKET_ZONE).toISODate() ?? '';

export const isMarketDate = (value: string | null): value is string =>
  !!value &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  DateTime.fromISO(value, { zone: MARKET_ZONE }).isValid;

export const marketDayRange = (date: string) => {
  const from = DateTime.fromISO(date, { zone: MARKET_ZONE }).startOf('day');
  return {
    from: from.toUTC().toISO() ?? '',
    to: from.plus({ days: 1 }).toUTC().toISO() ?? '',
  };
};

export const shiftMarketDate = (date: string, days: number): string =>
  DateTime.fromISO(date, { zone: MARKET_ZONE }).plus({ days }).toISODate() ?? date;

export const latestPublishedQuarter = (now: DateTime<boolean> = DateTime.now()): string => {
  const local = now.setZone(MARKET_ZONE);
  const quarter = local.set({
    minute: Math.floor(local.minute / QUARTER_MINUTES) * QUARTER_MINUTES,
    second: 0,
    millisecond: 0,
  });
  return quarter.minus({ minutes: 45 }).toUTC().toISO() ?? '';
};

export const deliveryQuarters = (date: string, locale: string): DeliveryQuarter[] => {
  const range = marketDayRange(date);
  const end = DateTime.fromISO(range.to);
  const result: DeliveryQuarter[] = [];
  for (
    let cursor = DateTime.fromISO(range.from);
    cursor < end;
    cursor = cursor.plus({ minutes: QUARTER_MINUTES })
  ) {
    const local = cursor.setZone(MARKET_ZONE).setLocale(locale);
    result.push({
      value: cursor.toUTC().toISO() ?? '',
      label: `${local.toFormat('HH:mm')} (${local.toFormat('ZZ')})`,
    });
  }
  return result;
};

export const marketDateFromInstant = (instant: string): string =>
  DateTime.fromISO(instant).setZone(MARKET_ZONE).toISODate() ?? marketToday();

export const historyRange = (at: string) => {
  const to = DateTime.fromISO(at).plus({ minutes: QUARTER_MINUTES });
  return {
    from: to.minus({ hours: 24 }).toUTC().toISO() ?? '',
    to: to.toUTC().toISO() ?? '',
  };
};
