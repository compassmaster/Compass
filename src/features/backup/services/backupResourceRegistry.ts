import { isBaseLocation } from '../../external-context/location/types/baseLocation.ts';
import { isObservedWeatherRecord, isWeatherForecastSnapshot } from '../../external-context/weather/types/weather.ts';
import { isFormalUserModel } from '../../formal-user-model/types/formalUserModel.ts';
import { isUnderstandingObject } from '../../understanding/types/understandingObject.ts';

export interface BackupResourceDefinition {
  readonly name: string;
  readonly storageKey: string;
  readonly schemaVersion: number;
  readonly validate: (value: unknown) => boolean;
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const iso = (value: unknown) => text(value) && Number.isFinite(Date.parse(value));
const arrayOf = (guard: (value: unknown) => boolean) => (value: unknown) => Array.isArray(value) && value.every(guard);
const nullable = (guard: (value: unknown) => boolean) => (value: unknown) => value === null || guard(value);
const versionedRecords = (guard: (value: unknown) => boolean) => (value: unknown) => record(value) && value.schemaVersion === 1 && arrayOf(guard)(value.records);

const dailyLog = (value: unknown) => record(value) && value.schemaVersion === 1 && text(value.id) && /^\d{4}-\d{2}-\d{2}$/.test(String(value.date))
  && iso(value.createdAt) && iso(value.updatedAt) && [1, 2, 3, 4, 5].includes(Number(value.mood)) && [1, 2, 3, 4, 5].includes(Number(value.fatigue))
  && (value.sleepHours === null || typeof value.sleepHours === 'number') && typeof value.note === 'string' && Array.isArray(value.events) && value.events.every((item) => typeof item === 'string');
const sleepRecord = (value: unknown) => record(value) && text(value.id) && /^\d{4}-\d{2}-\d{2}$/.test(String(value.sleepDate)) && text(value.bedtime)
  && text(value.wakeTime) && Number.isFinite(value.durationMinutes) && Number(value.durationMinutes) > 0 && ['MANUAL', 'SMARTWATCH'].includes(String(value.source)) && iso(value.createdAt) && iso(value.updatedAt);
const evidence = (value: unknown) => record(value) && text(value.id) && value.type === 'SLEEP_FATIGUE_OBSERVATION' && text(value.analyzerId) && text(value.dedupeKey)
  && Number.isFinite(value.confidence) && Number.isInteger(value.sampleSize) && Array.isArray(value.sourceReferences) && value.sourceReferences.every((ref) => record(ref) && ['daily_log', 'sleep_record'].includes(String(ref.sourceType)) && text(ref.id) && text(ref.date)) && iso(value.createdAt);
const candidate = (value: unknown) => record(value) && text(value.id) && value.type === 'SLEEP_FATIGUE_PATTERN' && text(value.generatorId) && text(value.statement)
  && Array.isArray(value.evidenceIds) && value.evidenceIds.length > 0 && value.evidenceIds.every(text) && text(value.dedupeKey) && iso(value.createdAt) && iso(value.updatedAt);
const response = (value: unknown) => record(value) && text(value.candidateId) && ['AGREE', 'PARTIALLY_DISAGREE', 'UNSURE'].includes(String(value.answer)) && iso(value.respondedAt);
const legacyObject = (value: unknown) => record(value) && Object.keys(value).length > 0;

/** The sole allow-list for data included in a Compass backup. Order is the export order. */
export const BACKUP_RESOURCE_REGISTRY: readonly BackupResourceDefinition[] = [
  { name: 'dailyLogs', storageKey: 'compass_daily_logs', schemaVersion: 1, validate: arrayOf(dailyLog) },
  { name: 'sleepRecords', storageKey: 'compass_sleep_records', schemaVersion: 1, validate: arrayOf(sleepRecord) },
  { name: 'baseLocation', storageKey: 'compass_base_location_v1', schemaVersion: 1, validate: nullable((value) => record(value) && value.schemaVersion === 1 && isBaseLocation(value.location)) },
  { name: 'weatherForecastSnapshots', storageKey: 'compass_weather_forecast_snapshots_v1', schemaVersion: 1, validate: nullable(versionedRecords(isWeatherForecastSnapshot)) },
  { name: 'observedWeatherRecords', storageKey: 'compass_observed_weather_records_v1', schemaVersion: 1, validate: nullable(versionedRecords(isObservedWeatherRecord)) },
  { name: 'evidence', storageKey: 'compass_analysis_evidence', schemaVersion: 1, validate: arrayOf(evidence) },
  { name: 'understandingCandidates', storageKey: 'compass_understanding_candidates', schemaVersion: 1, validate: arrayOf(candidate) },
  { name: 'candidateResponses', storageKey: 'compass_understanding_candidate_responses', schemaVersion: 1, validate: arrayOf(response) },
  { name: 'understandingObjects', storageKey: 'compass_understanding_objects', schemaVersion: 1, validate: arrayOf(isUnderstandingObject) },
  { name: 'formalUserModel', storageKey: 'compass_formal_user_model_v1', schemaVersion: 1, validate: nullable(isFormalUserModel) },
  { name: 'legacyInsights', storageKey: 'compass_insights', schemaVersion: 1, validate: arrayOf(legacyObject) },
  { name: 'legacyUserModel', storageKey: 'compass_user_model', schemaVersion: 1, validate: nullable(legacyObject) },
  { name: 'legacyUserModelUpdateCandidates', storageKey: 'compass_user_model_update_candidates', schemaVersion: 1, validate: arrayOf(legacyObject) },
  { name: 'legacyUserModelUpdateHistory', storageKey: 'compass_user_model_update_history', schemaVersion: 1, validate: arrayOf(legacyObject) },
] as const;
