import { CalendarEventApplicationService } from './calendarEventApplicationService.ts';
import { LocalStorageCalendarEventRepository } from './localStorageCalendarEventRepository.ts';
export const calendarEventApplicationService = new CalendarEventApplicationService(new LocalStorageCalendarEventRepository());
