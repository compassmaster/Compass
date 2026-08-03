import { initialCalendarCaptureDraft, type CalendarCaptureDraft, type CalendarCaptureStep } from './calendarCapture.ts';

export type CalendarExtraction = { draft: CalendarCaptureDraft; firstMissingStep: CalendarCaptureStep | null };

function dateInTimeZone(instant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}
function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}
function resolveDate(text: string, capturedAt: string, timeZone: string): string {
  const today = dateInTimeZone(capturedAt, timeZone);
  if (/明日/.test(text)) return addDays(today, 1);
  const explicit = /(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/.exec(text);
  if (explicit) {
    const year = explicit[1] ? Number(explicit[1]) : Number(today.slice(0, 4));
    let result = `${year}-${explicit[2].padStart(2, '0')}-${explicit[3].padStart(2, '0')}`;
    if (!explicit[1] && result < today) result = `${year + 1}-${explicit[2].padStart(2, '0')}-${explicit[3].padStart(2, '0')}`;
    return result;
  }
  const weekday = /来週(?:の)?(月|火|水|木|金|土|日)曜日?/.exec(text);
  if (weekday) {
    const target = '日月火水木金土'.indexOf(weekday[1]);
    const current = new Date(`${today}T00:00:00Z`).getUTCDay();
    return addDays(today, 7 - current + target);
  }
  return '';
}
function extractTitle(text: string): string {
  const patterns = [
    /まで(.+?)(?:の予定)?を(?:入れ|追加|登録|保存)/,
    /\d{1,2}時(?:\d{1,2}分)?に(.+?)(?:へ行く|の)?予定を(?:入れ|追加|登録|保存)/,
    /(?:日|、)に(.+?)(?:の予定)?を(?:入れ|追加|登録|保存)/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const title = match[1].replace(/^カレンダーに/, '').replace(/[、。 ]+$/g, '').trim();
      if (!/(?:明日|今日|来週|\d{1,2}月|予定$)/.test(title)) return title;
    }
  }
  return '';
}

export function extractCalendarInput(text: string, capturedAt: string, timeZone: string): CalendarExtraction {
  const date = resolveDate(text, capturedAt, timeZone);
  const draft = initialCalendarCaptureDraft('', timeZone);
  draft.title = extractTitle(text);
  draft.note = /(?:メモ|補足)[：:]\s*(.+?)(?=[。.!！]?$)/.exec(text)?.[1]?.trim() ?? '';
  const range = /(\d{1,2})時(?:(\d{1,2})分)?から(\d{1,2})時(?:(\d{1,2})分)?まで/.exec(text);
  const single = /(\d{1,2})時(?:(\d{1,2})分)?(?:に|から)/.exec(text);
  if (date && (range || single)) {
    draft.timeKind = 'TIMED';
    const start = range ?? single!;
    draft.startsAt = `${date}T${start[1].padStart(2, '0')}:${(start[2] ?? '0').padStart(2, '0')}`;
    if (range) draft.endsAt = `${date}T${range[3].padStart(2, '0')}:${(range[4] ?? '0').padStart(2, '0')}`;
  } else if (date && !/(?:午前|午後|朝|昼|夕方|夜)/.test(text)) {
    draft.timeKind = 'ALL_DAY'; draft.startDate = date; draft.endDate = date;
  }
  const firstMissingStep: CalendarCaptureStep | null = !draft.title ? 'TITLE'
    : !draft.timeKind ? 'TIME_KIND'
    : draft.timeKind === 'ALL_DAY' ? (!draft.startDate ? 'START_DATE' : !draft.endDate ? 'END_DATE' : null)
    : !draft.startsAt ? 'STARTS_AT' : !draft.endsAt ? 'ENDS_AT' : !draft.timeZone ? 'TIME_ZONE' : null;
  return { draft, firstMissingStep };
}
