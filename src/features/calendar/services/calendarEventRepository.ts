import type { CalendarEventId, CalendarEventRecord } from '../types/calendarEvent.ts';

export interface CalendarEventRepository {
  getAll(): CalendarEventRecord[];
  getById(id: CalendarEventId): CalendarEventRecord | null;
  save(record: CalendarEventRecord): void;
  update(record: CalendarEventRecord): boolean;
  delete(id: CalendarEventId): boolean;
}
