import type { CalendarEventId, CalendarEventRecord } from '../types/calendarEvent.ts';
import type { CalendarEventRepository } from './calendarEventRepository.ts';
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
  const startComparison = eventStart(a).localeCompare(eventStart(b));
  if (startComparison !== 0) return startComparison;
  const endComparison = eventEnd(a).localeCompare(eventEnd(b));
  if (endComparison !== 0) return endComparison;
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
    if (!isCalendarEventRecord(record)) throw new Error('Invalid CalendarEventRecord');
    const envelope = this.read();
    if (envelope.records.some((candidate) => candidate.id === record.id)) throw new Error(`CalendarEventRecord ID already exists: ${record.id}`);
    this.write([...envelope.records, clone(record)]);
  }

  update(record: CalendarEventRecord): boolean {
    if (!isCalendarEventRecord(record)) throw new Error('Invalid CalendarEventRecord');
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
    const raw = this.storage.getItem(CALENDAR_EVENT_STORAGE_KEY);
    if (raw === null) return { schemaVersion: CALENDAR_EVENT_STORAGE_SCHEMA_VERSION, records: [] };
    let value: unknown;
    try { value = JSON.parse(raw) as unknown; }
    catch { throw new Error('CalendarEventRecord storage contains invalid JSON'); }
    if (!isCalendarEventStorageEnvelope(value)) throw new Error('CalendarEventRecord storage contains invalid data');
    return clone(value);
  }

  private write(records: readonly CalendarEventRecord[]): void {
    const envelope: CalendarEventStorageEnvelope = { schemaVersion: CALENDAR_EVENT_STORAGE_SCHEMA_VERSION, records: [...clone(records)].sort(compareCalendarEventRecords) };
    if (!isCalendarEventStorageEnvelope(envelope)) throw new Error('Invalid CalendarEventRecord storage envelope');
    this.storage.setItem(CALENDAR_EVENT_STORAGE_KEY, JSON.stringify(envelope));
  }
}

const eventStart = (record: CalendarEventRecord) => record.timeKind === 'ALL_DAY' ? record.startDate : record.startsAt;
const eventEnd = (record: CalendarEventRecord) => record.timeKind === 'ALL_DAY' ? record.endDate : record.endsAt;
const clone = <T>(value: T): T => structuredClone(value);
