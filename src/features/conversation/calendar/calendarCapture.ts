import type { CalendarEventId, CalendarEventRecord, CalendarEventTimeInput, CreateCalendarEventInput } from '../../calendar/types/calendarEvent.ts';
import { localDateTimeToOffsetInstant } from '../../calendar/components/calendarDateTime.ts';

export type CalendarCaptureStep = 'TITLE' | 'NOTE' | 'TIME_KIND' | 'START_DATE' | 'END_DATE' | 'STARTS_AT' | 'ENDS_AT' | 'TIME_ZONE';
export type CalendarCaptureDraft = { title: string; note: string; timeKind: '' | 'ALL_DAY' | 'TIMED'; startDate: string; endDate: string; startsAt: string; endsAt: string; timeZone: string };
export type CalendarCaptureFlow = { sourceExcerpt: string; capturedAt: string; step: CalendarCaptureStep; draft: CalendarCaptureDraft };
export type CalendarCandidateStatus = 'PROPOSED' | 'EDITING' | 'READY' | 'COMMITTING' | 'FAILED' | 'COMMITTED';
export type CalendarCaptureCandidate = { id: string; fingerprint: string; sourceExcerpt: string; capturedAt: string; draft: CalendarCaptureDraft; status: CalendarCandidateStatus; attempt: number; commitToken?: string; failure?: string; receipt?: { recordId: CalendarEventId; targetDate: string } };
export type CalendarCaptureState = { generation: number; flow: CalendarCaptureFlow | null; candidate: CalendarCaptureCandidate | null; rejectedFingerprints: string[] };
export const emptyCalendarCaptureState = (): CalendarCaptureState => ({ generation: 0, flow: null, candidate: null, rejectedFingerprints: [] });
export const initialCalendarCaptureDraft = (date: string, timeZone: string): CalendarCaptureDraft => ({ title: '', note: '', timeKind: '', startDate: date, endDate: date, startsAt: '', endsAt: '', timeZone });

export function startCalendarCapture(state: CalendarCaptureState, sourceExcerpt: string, capturedAt: string, draft: CalendarCaptureDraft): CalendarCaptureState {
  if (state.flow || state.candidate) return state;
  return { ...state, generation: state.generation + 1, flow: { sourceExcerpt, capturedAt, step: 'TITLE', draft } };
}
export function answerCalendarCapture(state: CalendarCaptureState, draft: CalendarCaptureDraft): { state: CalendarCaptureState; error?: string; suppressed?: boolean } {
  const flow = state.flow; if (!flow) return { state, error: 'FLOW_NOT_ACTIVE' };
  const validation = validateStep(flow.step, draft); if (validation) return { state, error: validation };
  const next = nextStep(flow.step, draft.timeKind);
  if (next) return { state: { ...state, flow: { ...flow, step: next, draft } } };
  if (!toTimeInput(draft)) return { state, error: '日時・IANA timezone・期間を確認してください。DST gap / foldの日時は使用できません。' };
  const fingerprint = calendarCandidateFingerprint(draft);
  if (state.rejectedFingerprints.includes(fingerprint)) return { state: { ...state, flow: null }, suppressed: true };
  return { state: { ...state, flow: null, candidate: { id: `calendar-candidate-${state.generation}`, fingerprint, sourceExcerpt: flow.sourceExcerpt, capturedAt: flow.capturedAt, draft, status: 'PROPOSED', attempt: 0 } } };
}
export const beginCalendarCandidateEdit = (state: CalendarCaptureState) => state.candidate?.status === 'PROPOSED' || state.candidate?.status === 'READY' ? { ...state, candidate: { ...state.candidate, status: 'EDITING' as const } } : state;
export function applyCalendarCandidateEdit(state: CalendarCaptureState, draft: CalendarCaptureDraft): { state: CalendarCaptureState; error?: string } {
  if (state.candidate?.status !== 'EDITING') return { state, error: 'NOT_EDITING' };
  if (!draft.title.trim() || !toTimeInput(draft)) return { state, error: '日時・IANA timezone・期間を確認してください。DST gap / foldの日時は使用できません。' };
  return { state: { ...state, candidate: { ...state.candidate, draft, fingerprint: calendarCandidateFingerprint(draft), status: 'READY', failure: undefined } } };
}
export const confirmCalendarCandidate = (state: CalendarCaptureState): CalendarCaptureState => state.candidate?.status === 'PROPOSED' ? { ...state, candidate: { ...state.candidate, status: 'READY' } } : state;
export function rejectCalendarCandidate(state: CalendarCaptureState): CalendarCaptureState { const fingerprint = state.candidate?.fingerprint; return { ...state, candidate: null, rejectedFingerprints: fingerprint ? [...new Set([...state.rejectedFingerprints, fingerprint])] : state.rejectedFingerprints }; }
export function beginCalendarCommit(state: CalendarCaptureState): { state: CalendarCaptureState; request?: CalendarCommitRequest } {
  const candidate = state.candidate; if (!candidate || (candidate.status !== 'READY' && candidate.status !== 'FAILED')) return { state };
  const consentedAt = new Date().toISOString(), attempt = candidate.attempt + 1, commitToken = crypto.randomUUID(), input = toCreateInput(candidate, consentedAt); if (!input) return { state };
  return { state: { ...state, candidate: { ...candidate, status: 'COMMITTING', attempt, commitToken, failure: undefined } }, request: { generation: state.generation, candidateId: candidate.id, attempt, commitToken, input } };
}
export type CalendarCommitRequest = { generation: number; candidateId: string; attempt: number; commitToken: string; input: CreateCalendarEventInput };
export type CalendarCommitOutcome = { ok: true; record: CalendarEventRecord } | { ok: false; message: string };
export function applyCalendarCommitOutcome(state: CalendarCaptureState, request: CalendarCommitRequest, outcome: CalendarCommitOutcome): CalendarCaptureState {
  const candidate = state.candidate;
  if (!candidate || state.generation !== request.generation || candidate.id !== request.candidateId || candidate.status !== 'COMMITTING' || candidate.attempt !== request.attempt || candidate.commitToken !== request.commitToken) return state;
  if (!outcome.ok) return { ...state, candidate: { ...candidate, status: 'FAILED', failure: outcome.message } };
  const targetDate = outcome.record.timeKind === 'ALL_DAY' ? outcome.record.startDate : candidate.draft.startsAt.slice(0, 10);
  return { ...state, candidate: { ...candidate, status: 'COMMITTED', receipt: { recordId: outcome.record.id, targetDate } } };
}
export const dismissCalendarReceipt = (state: CalendarCaptureState, recordId: string): CalendarCaptureState => state.candidate?.status === 'COMMITTED' && state.candidate.receipt?.recordId === recordId ? { ...state, candidate: null } : state;
export const closeCommittedCalendarReceipt = (state: CalendarCaptureState): CalendarCaptureState => state.candidate?.status === 'COMMITTED' ? { ...state, candidate: null } : state;

export function calendarCandidateFingerprint(draft: CalendarCaptureDraft): string { return JSON.stringify({ title: draft.title.trim(), note: draft.note.trim(), timeKind: draft.timeKind, startDate: draft.timeKind === 'ALL_DAY' ? draft.startDate : undefined, endDate: draft.timeKind === 'ALL_DAY' ? draft.endDate : undefined, startsAt: draft.timeKind === 'TIMED' ? draft.startsAt : undefined, endsAt: draft.timeKind === 'TIMED' ? draft.endsAt : undefined, timeZone: draft.timeKind === 'TIMED' ? draft.timeZone : undefined }); }
function toCreateInput(candidate: CalendarCaptureCandidate, consentedAt: string): CreateCalendarEventInput | null { const time = toTimeInput(candidate.draft); return time ? { title: candidate.draft.title.trim(), note: candidate.draft.note.trim() || undefined, ...time, source: 'CONVERSATION_CAPTURE', conversationProvenance: { capturedAt: candidate.capturedAt, consentedAt, extractorVersion: 'calendar-structured-v1', sourceExcerpt: candidate.sourceExcerpt.slice(0, 160) } } : null; }
function toTimeInput(draft: CalendarCaptureDraft): CalendarEventTimeInput | null { if (draft.timeKind === 'ALL_DAY') return draft.startDate && draft.endDate >= draft.startDate ? { timeKind: 'ALL_DAY', startDate: draft.startDate, endDate: draft.endDate } : null; if (draft.timeKind !== 'TIMED') return null; const startsAt = localDateTimeToOffsetInstant(draft.startsAt, draft.timeZone), endsAt = localDateTimeToOffsetInstant(draft.endsAt, draft.timeZone); return startsAt && endsAt && Date.parse(startsAt) < Date.parse(endsAt) ? { timeKind: 'TIMED', startsAt, endsAt, timeZone: draft.timeZone } : null; }
function validateStep(step: CalendarCaptureStep, draft: CalendarCaptureDraft) { if (step === 'TITLE' && !draft.title.trim()) return '予定名を入力してください。'; if (step === 'TIME_KIND' && !draft.timeKind) return '終日か時刻指定を選んでください。'; if (step === 'START_DATE' && !draft.startDate) return '開始日を入力してください。'; if (step === 'END_DATE' && (!draft.endDate || draft.endDate < draft.startDate)) return '終了日は開始日以降にしてください。'; if (step === 'STARTS_AT' && !draft.startsAt) return '開始日時を入力してください。'; if (step === 'ENDS_AT' && !draft.endsAt) return '終了日時を入力してください。'; return undefined; }
function nextStep(step: CalendarCaptureStep, kind: CalendarCaptureDraft['timeKind']): CalendarCaptureStep | null { const sequence: CalendarCaptureStep[] = kind === 'ALL_DAY' ? ['TITLE','NOTE','TIME_KIND','START_DATE','END_DATE'] : ['TITLE','NOTE','TIME_KIND','STARTS_AT','ENDS_AT','TIME_ZONE']; const index = sequence.indexOf(step); return sequence[index + 1] ?? null; }
