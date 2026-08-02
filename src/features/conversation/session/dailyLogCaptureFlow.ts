import type { DateString, Scale } from '../../daily-log/types/log.ts';
import type { CaptureCandidate } from '../types/captureCandidate.ts';
import { createCaptureCandidate } from './captureCandidateLifecycle.ts';

export const DAILY_LOG_CAPTURE_EXTRACTION_VERSION = 'daily-log-structured-v1';
export const DAILY_LOG_CAPTURE_PURPOSE = '日々の状態を本人の記録として保存するため';

export type DailyLogCaptureStep = 'DATE' | 'MOOD' | 'FATIGUE' | 'NOTE' | 'EVENTS';
export type DailyLogCaptureFlow = {
  step: DailyLogCaptureStep;
  sourceMessageId: string;
  sourceExcerpt: string;
  startedAt: string;
  deduplicationKey: string;
  draft: {
    date?: DateString;
    mood?: Scale;
    fatigue?: Scale;
    note?: string;
    events?: string[];
  };
};

export type DailyLogCaptureAnswer =
  | { step: 'DATE'; value: string }
  | { step: 'MOOD'; value: number }
  | { step: 'FATIGUE'; value: number }
  | { step: 'NOTE'; value: string }
  | { step: 'EVENTS'; value: string | string[] };

export type DailyLogCaptureFlowError = 'FLOW_ALREADY_ACTIVE' | 'NO_ACTIVE_FLOW' | 'STEP_MISMATCH' | 'INVALID_DATE' | 'INVALID_SCALE' | 'FLOW_INCOMPLETE' | 'CANDIDATE_CREATION_FAILED' | 'ALREADY_AT_FIRST_STEP';
export type FlowResult = { ok: true; flow: DailyLogCaptureFlow | null } | { ok: false; reason: DailyLogCaptureFlowError };
export type CompleteFlowResult = { ok: true; flow: null; candidate: CaptureCandidate } | Exclude<FlowResult, { ok: true }>;

const STEPS: readonly DailyLogCaptureStep[] = ['DATE', 'MOOD', 'FATIGUE', 'NOTE', 'EVENTS'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (value: string) => {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const isScale = (value: number): value is Scale => Number.isInteger(value) && value >= 1 && value <= 5;
export const normalizeEvents = (value: string | string[]): string[] => (Array.isArray(value) ? value : value.split('\n')).map((item) => item.trim()).filter(Boolean);

export function startDailyLogCaptureFlow(current: DailyLogCaptureFlow | null, input: Omit<DailyLogCaptureFlow, 'step' | 'draft'>): FlowResult {
  if (current) return { ok: false, reason: 'FLOW_ALREADY_ACTIVE' };
  return { ok: true, flow: { ...input, step: 'DATE', draft: {} } };
}

export function answerDailyLogCaptureStep(flow: DailyLogCaptureFlow | null, answer: DailyLogCaptureAnswer): FlowResult {
  if (!flow) return { ok: false, reason: 'NO_ACTIVE_FLOW' };
  if (flow.step !== answer.step) return { ok: false, reason: 'STEP_MISMATCH' };
  if (answer.step === 'DATE' && !isValidDate(answer.value)) return { ok: false, reason: 'INVALID_DATE' };
  if ((answer.step === 'MOOD' || answer.step === 'FATIGUE') && !isScale(answer.value)) return { ok: false, reason: 'INVALID_SCALE' };
  const draft = { ...flow.draft };
  if (answer.step === 'DATE') draft.date = answer.value as DateString;
  if (answer.step === 'MOOD') draft.mood = answer.value as Scale;
  if (answer.step === 'FATIGUE') draft.fatigue = answer.value as Scale;
  if (answer.step === 'NOTE') draft.note = answer.value.trim();
  if (answer.step === 'EVENTS') draft.events = normalizeEvents(answer.value);
  const index = STEPS.indexOf(flow.step);
  return { ok: true, flow: { ...flow, draft, step: STEPS[Math.min(index + 1, STEPS.length - 1)] } };
}

export function moveBackDailyLogCaptureFlow(flow: DailyLogCaptureFlow | null): FlowResult {
  if (!flow) return { ok: false, reason: 'NO_ACTIVE_FLOW' };
  const index = STEPS.indexOf(flow.step);
  if (index === 0) return { ok: false, reason: 'ALREADY_AT_FIRST_STEP' };
  return { ok: true, flow: { ...flow, step: STEPS[Math.max(0, index - 1)] } };
}

export function cancelDailyLogCaptureFlow(flow: DailyLogCaptureFlow | null): FlowResult {
  return flow ? { ok: true, flow: null } : { ok: false, reason: 'NO_ACTIVE_FLOW' };
}

export function completeDailyLogCaptureFlow(flow: DailyLogCaptureFlow | null, input: { id: string; createdAt: string }): CompleteFlowResult {
  if (!flow) return { ok: false, reason: 'NO_ACTIVE_FLOW' };
  const { date, mood, fatigue, note, events } = flow.draft;
  if (!date || mood === undefined || fatigue === undefined || note === undefined || events === undefined) return { ok: false, reason: 'FLOW_INCOMPLETE' };
  const created = createCaptureCandidate({
    id: input.id, destinationType: 'DAILY_LOG', purpose: DAILY_LOG_CAPTURE_PURPOSE,
    proposedPayload: { date, mood: { value: mood, origin: 'USER_EXPLICIT' }, fatigue: { value: fatigue, origin: 'USER_EXPLICIT' }, note, events },
    targetDate: date, sourceMessageId: flow.sourceMessageId, sourceExcerpt: flow.sourceExcerpt,
    conversationOccurredAt: flow.startedAt, extraction: { method: 'USER_STRUCTURED_INPUT', version: DAILY_LOG_CAPTURE_EXTRACTION_VERSION },
    sensitivity: 'NON_SENSITIVE', deduplicationKey: flow.deduplicationKey, createdAt: input.createdAt,
  });
  return created.ok ? { ok: true, flow: null, candidate: created.candidate } : { ok: false, reason: 'CANDIDATE_CREATION_FAILED' };
}
