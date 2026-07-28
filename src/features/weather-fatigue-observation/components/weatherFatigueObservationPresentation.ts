/** Presentation-only rounding; the query result retains full calculation precision. */
export function formatAverageFatigue(average: number | null): string {
  return average === null ? '—' : average.toFixed(1);
}
