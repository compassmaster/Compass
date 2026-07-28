import type { DateString } from '../../daily-log/types/log.ts';

/** Presentation-only rounding; the query result retains full calculation precision. */
export function formatAverageFatigue(average: number | null): string {
  return average === null ? '—' : average.toFixed(1);
}

/** matchedDates is a deterministic ascending projection from the query service. */
export function formatObservationPeriod(matchedDates: readonly DateString[]): string {
  if (matchedDates.length === 0) return '—';
  return `${matchedDates[0]} 〜 ${matchedDates[matchedDates.length - 1]}`;
}
