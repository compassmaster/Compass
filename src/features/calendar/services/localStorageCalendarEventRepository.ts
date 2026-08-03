import type { CalendarEventId, CalendarEventRecord } from '../types/calendarEvent.ts';
import { CalendarEventRepositoryError, type CalendarEventRepository } from './calendarEventRepository.ts';
import { isCalendarEventRecord } from './calendarEventValidation.ts';

export const CALENDAR_EVENT_STORAGE_KEY = 'compass_calendar_event_records_v1';
export const CALENDAR_EVENT_STORAGE_SCHEMA_VERSION = 1;

export interface CalendarEventStorageEnvelope {
  readonly schemaVersion: typeof CALENDAR_EVENT_STORAGE_SCHEMA_VERSION;
  readonly records: readonly CalendarEventRecord[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function compareCalendarEventRecords(a: CalendarEventRecord, b: CalendarEventRecord): number {
  const dateComparison = displayDate(a).localeCompare(displayDate(b));
  if (dateComparison !== 0) return dateComparison;
  if (a.timeKind !== b.timeKind) return a.timeKind === 'ALL_DAY' ? -1 : 1;
  const startComparison = compareTime(a, b, 'start');
  if (startComparison !== 0) return startComparison;
  const endComparison = compareTime(a, b, 'end');
  if (endComparison !== 0) return endComparison;
  const titleComparison = a.title.localeCompare(b.title);
  if (titleComparison !== 0) return titleComparison;
  return a.id.localeCompare(b.id);
}

export function isCalendarEventStorageEnvelope(value: unknown): value is CalendarEventStorageEnvelope {
  if (!isObject(value) || Object.keys(value).some((key) => !['schemaVersion', 'records'].includes(key)) ||
      value.schemaVersion !== CALENDAR_EVENT_STORAGE_SCHEMA_VERSION || !Array.isArray(value.records) ||
      !value.records.every(isCalendarEventRecord)) return false;
  const ids = value.records.map((record) => record.id);
  return new Set(ids).size === ids.length;
}

export class LocalStorageCalendarEventRepository implements CalendarEventRepository {
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'>;
  constructor(storage: Pick<Storage, 'getItem' | 'setItem'> = globalThis.localStorage) { this.storage = storage; }

  getAll(): CalendarEventRecord[] {
    return [...clone(this.read().records)].sort(compareCalendarEventRecords);
  }

  getById(id: CalendarEventId): CalendarEventRecord | null {
    const record = this.read().records.find((candidate) => candidate.id === id);
    return record ? clone(record) : null;
  }

  save(record: CalendarEventRecord): void {
    if (!isCalendarEventRecord(record)) throw new CalendarEventRepositoryError('INVALID_RECORD', 'Invalid CalendarEventRecord');
    const envelope = this.read();
    if (envelope.records.some((candidate) => candidate.id === record.id)) throw new CalendarEventRepositoryError('DUPLICATE_ID', `CalendarEventRecord ID already exists: ${record.id}`);
    this.write([...envelope.records, clone(record)]);
  }

  update(record: CalendarEventRecord): boolean {
    if (!isCalendarEventRecord(record)) throw new CalendarEventRepositoryError('INVALID_RECORD', 'Invalid CalendarEventRecord');
    const envelope = this.read();
    const index = envelope.records.findIndex((candidate) => candidate.id === record.id);
    if (index < 0) return false;
    const records: CalendarEventRecord[] = [...clone(envelope.records)];
    records[index] = clone(record);
    this.write(records);
    return true;
  }

  delete(id: CalendarEventId): boolean {
    const envelope = this.read();
    const records = envelope.records.filter((candidate) => candidate.id !== id);
    if (records.length === envelope.records.length) return false;
    this.write(records);
    return true;
  }

  private read(): CalendarEventStorageEnvelope {
    let raw: string | null;
    try { raw = this.storage.getItem(CALENDAR_EVENT_STORAGE_KEY); }
    catch (cause) { throw new CalendarEventRepositoryError('PERSISTENCE_FAILED', 'CalendarEventRecord storage could not be read', { cause }); }
    if (raw === null) return { schemaVersion: CALENDAR_EVENT_STORAGE_SCHEMA_VERSION, records: [] };
    let value: unknown;
    try { value = JSON.parse(raw) as unknown; }
    catch (cause) { throw new CalendarEventRepositoryError('CORRUPT_STORAGE', 'CalendarEventRecord storage contains invalid JSON', { cause }); }
    if (!isCalendarEventStorageEnvelope(value)) throw new CalendarEventRepositoryError('CORRUPT_STORAGE', 'CalendarEventRecord storage contains invalid data');
    return clone(value);
  }

  private write(records: readonly CalendarEventRecord[]): void {
    const envelope: CalendarEventStorageEnvelope = { schemaVersion: CALENDAR_EVENT_STORAGE_SCHEMA_VERSION, records: [...clone(records)].sort(compareCalendarEventRecords) };
    if (!isCalendarEventStorageEnvelope(envelope)) throw new CalendarEventRepositoryError('INVALID_RECORD', 'Invalid CalendarEventRecord storage envelope');
    try { this.storage.setItem(CALENDAR_EVENT_STORAGE_KEY, JSON.stringify(envelope)); }
    catch (cause) { throw new CalendarEventRepositoryError('PERSISTENCE_FAILED', 'CalendarEventRecord storage could not be written', { cause }); }
  }
}

function displayDate(record: CalendarEventRecord): string {
  if (record.timeKind === 'ALL_DAY') return record.startDate;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: record.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(record.startsAt));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function compareTime(a: CalendarEventRecord, b: CalendarEventRecord, edge: 'start' | 'end'): number {
  if (a.timeKind === 'TIMED' && b.timeKind === 'TIMED') return Date.parse(edge === 'start' ? a.startsAt : a.endsAt) - Date.parse(edge === 'start' ? b.startsAt : b.endsAt);
  if (a.timeKind === 'ALL_DAY' && b.timeKind === 'ALL_DAY') return (edge === 'start' ? a.startDate : a.endDate).localeCompare(edge === 'start' ? b.startDate : b.endDate);
  return 0;
}
const clone = <T>(value: T): T => structuredClone(value);
