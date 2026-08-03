export type CalendarEventId = string & { readonly __brand: 'CalendarEventId' };
export type CalendarEventStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';
export type CalendarEventSource = 'MANUAL' | 'CONVERSATION_CAPTURE';

export interface ConversationProvenance {
  capturedAt: string;
  consentedAt: string;
  extractionMethod: string;
  extractorVersion: string;
  sourceExcerpt: string;
}

interface CalendarEventBase {
  id: CalendarEventId;
  title: string;
  note?: string;
  status: CalendarEventStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

interface ManualSource { source: 'MANUAL'; conversationProvenance?: never }
interface ConversationSource { source: 'CONVERSATION_CAPTURE'; conversationProvenance: ConversationProvenance }
interface AllDayTime { timeKind: 'ALL_DAY'; startDate: string; endDate: string; startsAt?: never; endsAt?: never; timeZone?: never }
interface TimedTime { timeKind: 'TIMED'; startsAt: string; endsAt: string; timeZone: string; startDate?: never; endDate?: never }

export type CalendarEventRecord = CalendarEventBase & (ManualSource | ConversationSource) & (AllDayTime | TimedTime);

export type CalendarEventTimeInput =
  | { timeKind: 'ALL_DAY'; startDate: string; endDate: string }
  | { timeKind: 'TIMED'; startsAt: string; endsAt: string; timeZone: string };

export type CreateCalendarEventInput = Pick<CalendarEventRecord, 'title' | 'note' | 'source'> &
  CalendarEventTimeInput & { conversationProvenance?: ConversationProvenance };

export type CorrectCalendarEventInput = Pick<CalendarEventRecord, 'title' | 'note'> & CalendarEventTimeInput;
