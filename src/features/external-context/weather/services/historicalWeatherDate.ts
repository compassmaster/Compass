export function getPreviousLocalDate(now: Date, timezone: string): string {
  if (Number.isNaN(now.valueOf())) throw new RangeError('now must be valid.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const previous = new Date(Date.UTC(read('year'), read('month') - 1, read('day') - 1));
  return previous.toISOString().slice(0, 10);
}
