import type { CalendarEventId, CalendarEventRecord } from '../types/calendarEvent.ts';
import { assertCalendarEventRecord, isCalendarEventRecord } from './calendarEventValidation.ts';
import type { CalendarEventRepository } from './calendarEventRepository.ts';

export const CALENDAR_EVENT_STORAGE_KEY = 'compass_calendar_event_records_v1';
const clone = (record: CalendarEventRecord): CalendarEventRecord => structuredClone(record);

export class DuplicateCalendarEventIdError extends Error {}

export class LocalStorageCalendarEventRepository implements CalendarEventRepository {
  private readonly storage: Storage;
  constructor(storage: Storage = localStorage) { this.storage = storage; }
  getAll() { return this.load().map(clone); }
  getById(id: CalendarEventId) { const found = this.load().find((record) => record.id === id); return found ? clone(found) : null; }
  save(record: CalendarEventRecord) {
    assertCalendarEventRecord(record); const records = this.load();
    if (records.some((item) => item.id === record.id)) throw new DuplicateCalendarEventIdError();
    this.persist([...records, clone(record)]);
  }
  update(record: CalendarEventRecord) {
    assertCalendarEventRecord(record); const records = this.load(); const index = records.findIndex((item) => item.id === record.id);
    if (index < 0) return false; records[index] = clone(record); this.persist(records); return true;
  }
  delete(id: CalendarEventId) { const records = this.load(); const next = records.filter((record) => record.id !== id); if (next.length === records.length) return false; this.persist(next); return true; }
  private load(): CalendarEventRecord[] {
    const raw = this.storage.getItem(CALENDAR_EVENT_STORAGE_KEY); if (!raw) return [];
    let parsed: unknown; try { parsed = JSON.parse(raw); } catch { return []; }
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(isCalendarEventRecord); const ids = new Set<string>();
    return valid.filter((record) => !ids.has(record.id) && Boolean(ids.add(record.id))).map(clone);
  }
  private persist(records: CalendarEventRecord[]) { records.forEach(assertCalendarEventRecord); this.storage.setItem(CALENDAR_EVENT_STORAGE_KEY, JSON.stringify(records)); }
}
