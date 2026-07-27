import type { DateString } from '../../daily-log/types/log.ts';

export const MAX_DAILY_CONTEXT_RANGE_DAYS = 31;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function assertDateString(value: string, fieldName = 'date'): asserts value is DateString {
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new RangeError(`${fieldName} must be a valid YYYY-MM-DD date`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError(`${fieldName} must be a valid YYYY-MM-DD date`);
  }
}

export function enumerateDateRange(startDate: DateString, endDate: DateString): readonly DateString[] {
  assertDateString(startDate, 'startDate');
  assertDateString(endDate, 'endDate');
  if (startDate > endDate) throw new RangeError('startDate must not be after endDate');
  const result: DateString[] = [];
  let cursor = startDate as string;
  while (cursor <= endDate) {
    if (result.length === MAX_DAILY_CONTEXT_RANGE_DAYS) throw new RangeError(`date range must not exceed ${MAX_DAILY_CONTEXT_RANGE_DAYS} days`);
    result.push(cursor as DateString);
    const [year, month, day] = cursor.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    cursor = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  }
  return result;
}
