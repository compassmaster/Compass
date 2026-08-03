import type { CalendarEventRecord, ConversationProvenance } from '../types/calendarEvent.ts';

const BASE_KEYS = ['id', 'title', 'note', 'timeKind', 'status', 'source', 'conversationProvenance', 'revision', 'createdAt', 'updatedAt'];
const ALL_DAY_KEYS = [...BASE_KEYS, 'startDate', 'endDate'];
const TIMED_KEYS = [...BASE_KEYS, 'startsAt', 'endsAt', 'timeZone'];
const PROVENANCE_KEYS = ['capturedAt', 'consentedAt', 'extractorVersion', 'sourceExcerpt'];
const hasOnlyKeys = (value: object, keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
const nonBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export const isOffsetInstant = (value: unknown): value is string =>
  nonBlank(value) && /(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isIanaTimeZone(value: unknown): value is string {
  if (!nonBlank(value)) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return true; }
  catch { return false; }
}

function offsetMatchesTimeZone(value: string, timeZone: string): boolean {
  const match = value.match(/(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return false;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  const instantAtWholeSecond = Math.floor(Date.parse(value) / 1_000) * 1_000;
  const expectedMinutes = (localAsUtc - instantAtWholeSecond) / 60_000;
  const suppliedMinutes = match[1] === 'Z' ? 0 : (match[1][0] === '-' ? -1 : 1) * (Number(match[1].slice(1, 3)) * 60 + Number(match[1].slice(4)));
  return suppliedMinutes === expectedMinutes;
}

function validProvenance(value: unknown, createdAt: string): value is ConversationProvenance {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !hasOnlyKeys(value, PROVENANCE_KEYS)) return false;
  const p = value as Record<string, unknown>;
  return isOffsetInstant(p.capturedAt) && isOffsetInstant(p.consentedAt) && Date.parse(p.capturedAt) <= Date.parse(p.consentedAt) &&
    Date.parse(p.consentedAt) <= Date.parse(createdAt) && nonBlank(p.extractorVersion) && nonBlank(p.sourceExcerpt);
}

export function isCalendarEventRecord(value: unknown): value is CalendarEventRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const keys = r.timeKind === 'ALL_DAY' ? ALL_DAY_KEYS : r.timeKind === 'TIMED' ? TIMED_KEYS : [];
  if (!keys.length || !hasOnlyKeys(value, keys) || !nonBlank(r.id) || !nonBlank(r.title) || (r.note !== undefined && typeof r.note !== 'string') ||
      !['PLANNED', 'COMPLETED', 'CANCELLED'].includes(r.status as string) || !['MANUAL', 'CONVERSATION_CAPTURE'].includes(r.source as string) ||
      !Number.isInteger(r.revision) || (r.revision as number) < 1 || !isOffsetInstant(r.createdAt) || !isOffsetInstant(r.updatedAt) || Date.parse(r.createdAt) > Date.parse(r.updatedAt)) return false;
  if (r.source === 'MANUAL' ? r.conversationProvenance !== undefined : !validProvenance(r.conversationProvenance, r.createdAt as string)) return false;
  if (r.timeKind === 'ALL_DAY') return isCalendarDate(r.startDate) && isCalendarDate(r.endDate) && r.startDate <= r.endDate;
  return isOffsetInstant(r.startsAt) && isOffsetInstant(r.endsAt) && isIanaTimeZone(r.timeZone) && Date.parse(r.startsAt) < Date.parse(r.endsAt) &&
    offsetMatchesTimeZone(r.startsAt, r.timeZone) && offsetMatchesTimeZone(r.endsAt, r.timeZone);
}

export function assertCalendarEventRecord(value: unknown): asserts value is CalendarEventRecord {
  if (!isCalendarEventRecord(value)) throw new Error('Invalid CalendarEventRecord');
}
