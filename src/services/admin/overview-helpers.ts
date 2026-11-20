/** Pure helpers for admin overview binding. */

export type TopEventCandidate = {
  eventId: string;
  title: string;
  responseCount: number;
};

/** Linear projection from the last 3 points; clamp at >= 0 */
export function forecastSeries(history: number[], months: number): number[] {
  const window = history.slice(-3);
  if (window.length === 0) return Array.from({ length: months }, () => 0);

  const n = window.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += window[i];
    sumXY += i * window[i];
    sumXX += i * i;
  }
  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const lastIndex = n - 1;

  return Array.from({ length: months }, (_, offset) => {
    const projected = intercept + slope * (lastIndex + 1 + offset);
    return Math.max(0, Math.round(projected));
  });
}

/** Keep only events with responses, highest first, capped. */
export function pickTopEvents(
  candidates: TopEventCandidate[],
  limit: number,
): TopEventCandidate[] {
  return [...candidates]
    .filter((event) => event.responseCount > 0)
    .sort((a, b) => b.responseCount - a.responseCount)
    .slice(0, limit);
}

/**
 * Core tables must all be readable. Any null → hard failure so the route
 * returns 502 instead of a quiet 200 with zeroed KPIs.
 */
export function assertCoreDataAvailable(
  tables: ReadonlyArray<unknown | null>,
): void {
  if (tables.some((row) => row === null)) {
    throw new Error("CORE_DATA_UNAVAILABLE");
  }
}
