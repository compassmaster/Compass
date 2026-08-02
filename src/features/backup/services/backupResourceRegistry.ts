import { isBaseLocation } from '../../external-context/location/types/baseLocation.ts';
import { isObservedWeatherRecord, isWeatherForecastSnapshot } from '../../external-context/weather/types/weather.ts';
import { isFormalUserModel } from '../../formal-user-model/types/formalUserModel.ts';
import { isUnderstandingObject } from '../../understanding/types/understandingObject.ts';
import { isUnderstandingHistoryEnvelope } from '../../understanding/services/localStorageUnderstandingHistoryRepository.ts';
import { sortUnderstandingHistory } from '../../understanding/services/localStorageUnderstandingHistoryRepository.ts';
import type { UnderstandingHistoryEnvelope } from '../../understanding/types/understandingHistory.ts';
import { getInsightDedupeKey } from '../../analysis/services/insightDeduplication.ts';
import type { Insight } from '../../analysis/types/analysis.ts';
import { normalizeCandidate } from '../../compass-map/services/userModelUpdateCandidateService.ts';

export interface BackupResourceDefinition {
  readonly name: string;
  readonly storageKey: string;
  readonly schemaVersion: number;
  readonly emptyValue: unknown;
  readonly validate: (value: unknown) => boolean;
  readonly normalize: (value: unknown) => unknown;
  readonly decodeStored: (value: unknown) => StoredResourceDecodeResult;
}
export type StoredResourceDecodeResult = { readonly ok: true; readonly data: unknown; readonly sourceFormat: 'CURRENT' | 'LEGACY' } | { readonly ok: false };

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown, nonEmpty = false): value is string[] => Array.isArray(value) && (!nonEmpty || value.length > 0) && value.every((item) => typeof item === 'string' && (!nonEmpty || item.length > 0));
const iso = (value: unknown) => text(value) && Number.isFinite(Date.parse(value));
const confidence = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const integer = (value: unknown, min = 0) => typeof value === 'number' && Number.isInteger(value) && value >= min;
const arrayOf = (guard: (value: unknown) => boolean) => (value: unknown) => Array.isArray(value) && value.every(guard);
const nullable = (guard: (value: unknown) => boolean) => (value: unknown) => value === null || guard(value);
const versionedRecords = (guard: (value: unknown) => boolean) => (value: unknown) => record(value) && value.schemaVersion === 1 && arrayOf(guard)(value.records);
const period = (value: unknown) => record(value) && /^\d{4}-\d{2}-\d{2}$/.test(String(value.from)) && /^\d{4}-\d{2}-\d{2}$/.test(String(value.to)) && String(value.from) <= String(value.to);
const sourceReference = (value: unknown) => record(value) && ['daily_log', 'sleep_record'].includes(String(value.sourceType)) && text(value.id) && /^\d{4}-\d{2}-\d{2}$/.test(String(value.date));
const evidenceRef = (value: unknown) => record(value) && value.sourceType === 'daily_log' && text(value.logId) && text(value.analyzerId) && text(value.rationale) && text(value.excerpt) && iso(value.sourceCreatedAt);

const captureProvenance = (value: unknown) => record(value) && value.source === 'CONVERSATION_CAPTURE' && iso(value.capturedAt) && iso(value.consentedAt)
  && record(value.extraction) && value.extraction.method === 'USER_STRUCTURED_INPUT' && text(value.extraction.version) && text(value.sourceExcerpt);
const dailyLog = (value: unknown) => record(value) && value.schemaVersion === 1 && text(value.id) && /^\d{4}-\d{2}-\d{2}$/.test(String(value.date))
  && iso(value.createdAt) && iso(value.updatedAt) && [1, 2, 3, 4, 5].includes(value.mood as number) && [1, 2, 3, 4, 5].includes(value.fatigue as number)
  && (value.sleepHours === null || (typeof value.sleepHours === 'number' && Number.isFinite(value.sleepHours))) && typeof value.note === 'string' && strings(value.events)
  && (value.captureProvenance === undefined || captureProvenance(value.captureProvenance));
const sleepRecord = (value: unknown) => record(value) && text(value.id) && /^\d{4}-\d{2}-\d{2}$/.test(String(value.sleepDate)) && text(value.bedtime)
  && text(value.wakeTime) && integer(value.durationMinutes, 1) && ['MANUAL', 'SMARTWATCH'].includes(String(value.source)) && iso(value.createdAt) && iso(value.updatedAt);
const evidence = (value: unknown) => record(value) && text(value.id) && value.type === 'SLEEP_FATIGUE_OBSERVATION' && text(value.analyzerId) && text(value.title)
  && text(value.message) && text(value.observation) && confidence(value.confidence) && integer(value.sampleSize, 1) && arrayOf(sourceReference)(value.sourceReferences)
  && period(value.period) && iso(value.createdAt) && text(value.dedupeKey) && (value.metadata === undefined || record(value.metadata));
const candidate = (value: unknown) => record(value) && text(value.id) && value.type === 'SLEEP_FATIGUE_PATTERN' && text(value.generatorId) && text(value.title) && text(value.statement)
  && text(value.explanation) && strings(value.evidenceIds, true) && text(value.dedupeKey) && iso(value.createdAt) && iso(value.updatedAt) && (value.metadata === undefined || record(value.metadata));
const response = (value: unknown) => record(value) && text(value.candidateId) && ['AGREE', 'PARTIALLY_DISAGREE', 'UNSURE'].includes(String(value.answer)) && iso(value.respondedAt);
const insight = (value: unknown) => record(value) && text(value.id) && ['PATTERN', 'TREND', 'INSIGHT'].includes(String(value.type)) && text(value.message) && confidence(value.confidence)
  && text(value.analyzerId) && strings(value.evidenceSummaries) && arrayOf(evidenceRef)(value.evidenceRefs) && strings(value.relatedLogIds) && text(value.dedupeKey)
  && iso(value.createdAt) && iso(value.updatedAt) && ['NEW', 'CONFIRMED', 'DISMISSED'].includes(String(value.status)) && (value.metadata === undefined || record(value.metadata));
const updateCandidate = (value: unknown) => record(value) && text(value.id) && text(value.sourceInsightId) && text(value.dedupeKey)
  && ['shortTerm.immediateConcerns', 'shortTerm.recentInterests'].includes(String(value.targetField)) && strings(value.proposedValue, true) && confidence(value.confidence)
  && arrayOf(evidenceRef)(value.evidenceRefs) && iso(value.createdAt) && ['PENDING', 'APPLIED', 'REJECTED'].includes(String(value.status)) && (value.updatedAt === undefined || iso(value.updatedAt));
const updateHistory = (value: unknown) => record(value) && text(value.candidateId) && text(value.sourceInsightId) && arrayOf(evidenceRef)(value.evidenceRefs)
  && ['shortTerm.immediateConcerns', 'shortTerm.recentInterests'].includes(String(value.targetField)) && iso(value.appliedAt);
const hypothesis = (value: unknown) => record(value) && strings(value.value) && confidence(value.confidence) && Array.isArray(value.evidenceList)
  && value.evidenceList.every((item) => record(item) && text(item.logId) && typeof item.extractedText === 'string' && iso(item.timestamp)) && iso(value.lastUpdated);
const userModel = (value: unknown) => record(value) && text(value.userId) && record(value.longTerm) && hypothesis(value.longTerm.coreValues)
  && hypothesis(value.longTerm.longTermGoals) && hypothesis(value.longTerm.personalityTraits) && record(value.shortTerm) && record(value.shortTerm.currentMood)
  && typeof value.shortTerm.currentMood.status === 'string' && [1, 2, 3, 4, 5].includes(value.shortTerm.currentMood.intensity as number) && iso(value.shortTerm.currentMood.lastUpdated)
  && hypothesis(value.shortTerm.immediateConcerns) && hypothesis(value.shortTerm.recentInterests);

function stableKey(value: unknown): string {
  if (!record(value)) return JSON.stringify(value);
  return [value.date, value.sleepDate, value.occurredAt, value.createdAt, value.updatedAt, value.respondedAt, value.appliedAt, value.id, value.candidateId, value.logId, value.analyzerId].map((item) => String(item ?? '')).join('\u0000');
}
function normalizeArray(value: unknown): unknown { return Array.isArray(value) ? [...value].map(deepCopyAndSortReferences).sort((a, b) => stableKey(a).localeCompare(stableKey(b))) : value; }
function normalizeEnvelope(value: unknown): unknown { if (!record(value) || !Array.isArray(value.records)) return value; return { ...value, records: normalizeArray(value.records) }; }
function normalizeUnderstandingHistory(value: unknown): unknown {
  if (!isUnderstandingHistoryEnvelope(value)) return value;
  const records = structuredClone(value.records).sort(sortUnderstandingHistory);
  return { schemaVersion: 1, records } satisfies UnderstandingHistoryEnvelope;
}
function deepCopyAndSortReferences(value: unknown): unknown {
  if (!record(value)) return value;
  const copy: Record<string, unknown> = { ...value };
  for (const key of ['sourceReferences', 'evidenceRefs']) if (Array.isArray(copy[key])) copy[key] = [...copy[key]].sort((a, b) => stableKey(a).localeCompare(stableKey(b)));
  return copy;
}
const identity = (value: unknown) => value;

function currentDecoder(validate: (value: unknown) => boolean, normalize: (value: unknown) => unknown): (value: unknown) => StoredResourceDecodeResult {
  return (value) => validate(value) ? { ok: true, data: normalize(value), sourceFormat: 'CURRENT' } : { ok: false };
}
function decodeInsights(value: unknown): StoredResourceDecodeResult {
  if (!Array.isArray(value)) return { ok: false };
  let legacy = false;
  const decoded: unknown[] = [];
  for (const item of value) {
    if (!isKnownStoredInsight(item)) return { ok: false };
    const summaries = (Array.isArray(item.evidenceSummaries) ? item.evidenceSummaries : item.evidence) as string[];
    const refs = Array.isArray(item.evidenceRefs) ? item.evidenceRefs : [];
    const dedupeKey = text(item.dedupeKey) ? item.dedupeKey : getInsightDedupeKey(item as unknown as Insight);
    legacy ||= !text(item.dedupeKey) || !Array.isArray(item.evidenceSummaries) || !Array.isArray(item.evidenceRefs);
    decoded.push({ ...item, dedupeKey, evidenceSummaries: [...summaries], evidenceRefs: [...refs] });
  }
  const normalized = normalizeArray(decoded);
  return arrayOf(insight)(normalized) ? { ok: true, data: normalized, sourceFormat: legacy ? 'LEGACY' : 'CURRENT' } : { ok: false };
}
function isKnownStoredInsight(value: unknown): value is Record<string, unknown> {
  if (!record(value) || !text(value.id) || !['PATTERN', 'TREND', 'INSIGHT'].includes(String(value.type)) || !text(value.message) || !confidence(value.confidence)
    || !text(value.analyzerId) || !strings(value.relatedLogIds) || !iso(value.createdAt) || !iso(value.updatedAt) || !['NEW', 'CONFIRMED', 'DISMISSED'].includes(String(value.status))) return false;
  const summaries = Array.isArray(value.evidenceSummaries) ? value.evidenceSummaries : value.evidence;
  return strings(summaries) && (value.evidenceRefs === undefined || arrayOf(evidenceRef)(value.evidenceRefs))
    && (value.dedupeKey === undefined || text(value.dedupeKey)) && (value.metadata === undefined || record(value.metadata));
}
function decodeUpdateCandidates(value: unknown): StoredResourceDecodeResult {
  if (!Array.isArray(value)) return { ok: false };
  let legacy = false;
  const decoded = value.map((item) => {
    if (record(item) && item.status === 'DISMISSED') { legacy = true; return normalizeCandidate(item as never); }
    return item;
  });
  return arrayOf(updateCandidate)(decoded) ? { ok: true, data: normalizeArray(decoded), sourceFormat: legacy ? 'LEGACY' : 'CURRENT' } : { ok: false };
}

function resource(name: string, storageKey: string, emptyValue: unknown, validate: (value: unknown) => boolean, normalize: (value: unknown) => unknown, decodeStored = currentDecoder(validate, normalize)): BackupResourceDefinition {
  return { name, storageKey, schemaVersion: 1, emptyValue, validate, normalize, decodeStored };
}

/** Sole backup allow-list. Its order is also the deterministic envelope order. */
export const BACKUP_RESOURCE_REGISTRY: readonly BackupResourceDefinition[] = [
  resource('dailyLogs', 'compass_daily_logs', [], arrayOf(dailyLog), normalizeArray),
  resource('sleepRecords', 'compass_sleep_records', [], arrayOf(sleepRecord), normalizeArray),
  resource('baseLocation', 'compass_base_location_v1', null, nullable((value) => record(value) && value.schemaVersion === 1 && isBaseLocation(value.location)), identity),
  resource('weatherForecastSnapshots', 'compass_weather_forecast_snapshots_v1', null, nullable(versionedRecords(isWeatherForecastSnapshot)), normalizeEnvelope),
  resource('observedWeatherRecords', 'compass_observed_weather_records_v1', null, nullable(versionedRecords(isObservedWeatherRecord)), normalizeEnvelope),
  resource('evidence', 'compass_analysis_evidence', [], arrayOf(evidence), normalizeArray),
  resource('understandingCandidates', 'compass_understanding_candidates', [], arrayOf(candidate), normalizeArray),
  resource('candidateResponses', 'compass_understanding_candidate_responses', [], arrayOf(response), normalizeArray),
  resource('understandingObjects', 'compass_understanding_objects', [], arrayOf(isUnderstandingObject), normalizeArray),
  resource('understandingHistory', 'compass_understanding_history_v1', { schemaVersion: 1, records: [] }, isUnderstandingHistoryEnvelope, normalizeUnderstandingHistory),
  resource('formalUserModel', 'compass_formal_user_model_v1', null, nullable(isFormalUserModel), identity),
  resource('legacyInsights', 'compass_insights', [], arrayOf(insight), normalizeArray, decodeInsights),
  resource('legacyUserModel', 'compass_user_model', null, nullable(userModel), identity),
  resource('legacyUserModelUpdateCandidates', 'compass_user_model_update_candidates', [], arrayOf(updateCandidate), normalizeArray, decodeUpdateCandidates),
  resource('legacyUserModelUpdateHistory', 'compass_user_model_update_history', [], arrayOf(updateHistory), normalizeArray),
] as const;
