import type { CalendarEventId, CalendarEventRecord } from '../types/calendarEvent.ts';

export type CalendarEventRepositoryErrorCode = 'DUPLICATE_ID' | 'CORRUPT_STORAGE' | 'PERSISTENCE_FAILED' | 'INVALID_RECORD';

export class CalendarEventRepositoryError extends Error {
  readonly code: CalendarEventRepositoryErrorCode;
  constructor(code: CalendarEventRepositoryErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CalendarEventRepositoryError';
    this.code = code;
  }
}

export interface CalendarEventRepository {
  getAll(): CalendarEventRecord[];
  getById(id: CalendarEventId): CalendarEventRecord | null;
  save(record: CalendarEventRecord): void;
  update(record: CalendarEventRecord): boolean;
  delete(id: CalendarEventId): boolean;
}
