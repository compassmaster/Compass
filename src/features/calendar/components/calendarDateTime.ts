import type { CalendarEventRecord } from '../types/calendarEvent.ts';

export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function moveLocalDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return localToday(new Date(year, month - 1, day + days, 12));
}

export function localDateTimeToOffsetInstant(local: string, timeZone: string): string | null {
  const match = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  try { new Intl.DateTimeFormat('en-US', { timeZone }).format(); } catch { return null; }
  const [, year, month, day, hour, minute] = match;
  const wallUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  const formatter = partsFormatter(timeZone);
  const candidates: { instant: number; offset: number }[] = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const instant = wallUtc - offset * 60_000;
    if (formatParts(formatter, new Date(instant)) === `${year}-${month}-${day}T${hour}:${minute}`) candidates.push({ instant, offset });
  }
  if (candidates.length !== 1) return null;
  const { instant, offset } = candidates[0];
  const sign = offset < 0 ? '-' : '+';
  const absolute = Math.abs(offset);
  return `${new Date(instant + offset * 60_000).toISOString().slice(0, 16)}:00${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

export function instantToLocalDateTime(instant: string, timeZone: string): string {
  return formatParts(partsFormatter(timeZone), new Date(instant));
}

export function calendarEventOccursOnDate(record: CalendarEventRecord, date: string): boolean {
  if (record.timeKind === 'ALL_DAY') return record.startDate <= date && date <= record.endDate;
  const firstDate = instantToLocalDateTime(record.startsAt, record.timeZone).slice(0, 10);
  const finalIncludedDate = instantToLocalDateTime(new Date(Date.parse(record.endsAt) - 1).toISOString(), record.timeZone).slice(0, 10);
  return firstDate <= date && date <= finalIncludedDate;
}

export function availableTimeZones(deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'): string[] {
  const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Asia/Tokyo', 'America/New_York', 'Europe/London'];
  return [...new Set([deviceZone, 'UTC', ...supported])].sort();
}

function partsFormatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}
function formatParts(formatter: Intl.DateTimeFormat, date: Date): string {
  const parts = Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
