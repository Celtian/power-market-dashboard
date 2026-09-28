import { BidPoint, Direction, GenerationPoint, LadderStep } from './types';

export function ladder(
  bids: BidPoint[],
  direction: Direction,
  targetMw?: number,
) {
  const eligible = bids.filter(
    (b) => !b.cancelled && b.available !== false && b.mw > 0,
  );
  const missingPriceCount = eligible.filter(
    (b) => b.price === null || !b.currency,
  ).length;
  const priced = eligible
    .filter(
      (b): b is BidPoint & { price: number } =>
        b.price !== null && !!b.currency,
    )
    .sort(
      (a, b) =>
        (direction === 'up' ? a.price - b.price : b.price - a.price) ||
        a.bidId.localeCompare(b.bidId),
    );
  const steps: LadderStep[] = [];
  let cumulative = 0;
  for (const bid of priced) {
    const previous = steps[steps.length - 1];
    cumulative += bid.mw;
    if (previous && previous.price === bid.price) {
      previous.toMw = cumulative;
      previous.bidIds.push(bid.bidId);
    } else
      steps.push({
        fromMw: cumulative - bid.mw,
        toMw: cumulative,
        price: bid.price,
        bidIds: [bid.bidId],
      });
  }
  const complete = missingPriceCount === 0;
  return {
    steps,
    totalMw: cumulative,
    complete,
    missingPriceCount,
    unknownAvailabilityCount: eligible.filter((b) => b.available === null)
      .length,
    complexBidCount: eligible.filter((b) => b.complexity !== null).length,
    targetPrice:
      complete && targetMw !== undefined && targetMw > 0
        ? (steps.find((s) => targetMw > s.fromMw && targetMw <= s.toMw)
            ?.price ?? null)
        : null,
    interpretation: 'published-offer-order' as const,
  };
}
function average(
  points: GenerationPoint[],
  start: number,
  end: number,
): number | null {
  const sorted = points
    .filter((p) => Date.parse(p.start) < end && Date.parse(p.end) > start)
    .sort((a, b) => a.start.localeCompare(b.start));
  let cursor = start;
  let weighted = 0;
  for (const p of sorted) {
    const left = Math.max(Date.parse(p.start), start);
    const right = Math.min(Date.parse(p.end), end);
    if (left !== cursor || p.mw === null || p.cancelled) return null;
    weighted += p.mw * (right - left);
    cursor = right;
  }
  return cursor === end ? weighted / (end - start) : null;
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
export function compareSolar(
  actual: GenerationPoint[],
  forecast: GenerationPoint[],
  from: string,
  to: string,
) {
  const all = [...actual, ...forecast];
  const resolutionSeconds = all.reduce(
    (n, p) => (n * p.resolutionSeconds) / gcd(n, p.resolutionSeconds),
    900,
  );
  const data = [];
  let absolute = 0,
    squares = 0,
    duration = 0;
  for (
    let start = Date.parse(from);
    start < Date.parse(to);
    start += resolutionSeconds * 1000
  ) {
    const end = Math.min(start + resolutionSeconds * 1000, Date.parse(to));
    const actualMw = average(actual, start, end);
    const forecastMw = average(forecast, start, end);
    const deviationMw =
      actualMw === null || forecastMw === null ? null : actualMw - forecastMw;
    if (deviationMw !== null) {
      const weight = end - start;
      absolute += Math.abs(deviationMw) * weight;
      squares += deviationMw ** 2 * weight;
      duration += weight;
    }
    data.push({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      actualMw,
      forecastMw,
      deviationMw,
      deviationPercent:
        deviationMw === null || forecastMw === null || forecastMw === 0
          ? null
          : (deviationMw / forecastMw) * 100,
    });
  }
  return {
    data,
    resolutionSeconds,
    unit: 'MW',
    summary: {
      maeMw: duration ? absolute / duration : null,
      rmseMw: duration ? Math.sqrt(squares / duration) : null,
      coverage: duration / (Date.parse(to) - Date.parse(from)),
    },
  };
}
