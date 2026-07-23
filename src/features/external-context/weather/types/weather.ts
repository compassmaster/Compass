export type WeatherForecastSnapshotId = string & { readonly __brand: 'WeatherForecastSnapshotId' };
export type ObservedWeatherRecordId = string & { readonly __brand: 'ObservedWeatherRecordId' };
export type WeatherSchemaVersion = 1;

export type WeatherRecordGranularity = 'DAILY' | 'HOURLY';
export type WeatherRecordStatus = 'AVAILABLE' | 'MISSING';
export type WeatherMissingReason = 'LOCATION_NOT_CONFIGURED' | 'LOCATION_UNAVAILABLE' | 'API_FAILURE' | 'VALUE_NOT_PROVIDED' | 'OUT_OF_RANGE' | 'NOT_OBSERVED_YET';

export interface WeatherLocationSnapshot {
  readonly label?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  /** 必要最小限の粗い場所。詳細住所や移動履歴は保存しない。 */
  readonly locality?: string;
  readonly countryCode?: string;
}

export interface WeatherSourceMetadata {
  readonly provider: string;
  readonly fetchedAt: string;
  readonly requestId?: string;
  readonly dataset?: string;
}

export interface WeatherValue<T> {
  readonly value: T | null;
  readonly unit?: string;
  readonly missingReason?: WeatherMissingReason;
}

export interface WeatherMeasurements {
  readonly temperature?: WeatherValue<number>;
  readonly apparentTemperature?: WeatherValue<number>;
  readonly humidity?: WeatherValue<number>;
  readonly precipitation?: WeatherValue<number>;
  readonly precipitationProbability?: WeatherValue<number>;
  readonly pressure?: WeatherValue<number>;
  readonly windSpeed?: WeatherValue<number>;
  readonly sunshineDuration?: WeatherValue<number>;
  readonly weatherCode?: WeatherValue<string>;
  readonly dailyMinimumTemperature?: WeatherValue<number>;
  readonly dailyMaximumTemperature?: WeatherValue<number>;
  readonly temperatureDelta?: WeatherValue<number>;
  readonly pressureChange?: WeatherValue<number>;
}

export interface WeatherPeriod {
  /** DailyLog.date / SleepRecord.sleepDate と結合するユーザーlocal date。 */
  readonly localDate: string;
  readonly timezone: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly granularity: WeatherRecordGranularity;
}

export interface WeatherForecastSnapshot {
  readonly id: WeatherForecastSnapshotId;
  readonly schemaVersion: WeatherSchemaVersion;
  readonly kind: 'WEATHER_FORECAST_SNAPSHOT';
  readonly targetPeriod: WeatherPeriod;
  readonly forecastValues: WeatherMeasurements;
  readonly location: WeatherLocationSnapshot | null;
  readonly source: WeatherSourceMetadata;
  readonly status: WeatherRecordStatus;
  readonly missingReasons: WeatherMissingReason[];
  readonly createdAt: string;
}

export interface ObservedWeatherRecord {
  readonly id: ObservedWeatherRecordId;
  readonly schemaVersion: WeatherSchemaVersion;
  readonly kind: 'OBSERVED_WEATHER_RECORD';
  readonly observedPeriod: WeatherPeriod;
  readonly observedValues: WeatherMeasurements;
  readonly location: WeatherLocationSnapshot | null;
  readonly source: WeatherSourceMetadata;
  readonly status: WeatherRecordStatus;
  readonly missingReasons: WeatherMissingReason[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const WEATHER_SCHEMA_VERSION: WeatherSchemaVersion = 1;
export const WEATHER_RECORD_GRANULARITIES: readonly WeatherRecordGranularity[] = ['DAILY', 'HOURLY'];
export const WEATHER_RECORD_STATUSES: readonly WeatherRecordStatus[] = ['AVAILABLE', 'MISSING'];
export const WEATHER_MISSING_REASONS: readonly WeatherMissingReason[] = ['LOCATION_NOT_CONFIGURED', 'LOCATION_UNAVAILABLE', 'API_FAILURE', 'VALUE_NOT_PROVIDED', 'OUT_OF_RANGE', 'NOT_OBSERVED_YET'];

export function isWeatherForecastSnapshot(value: unknown): value is WeatherForecastSnapshot {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && value.schemaVersion === WEATHER_SCHEMA_VERSION
    && value.kind === 'WEATHER_FORECAST_SNAPSHOT'
    && isWeatherPeriod(value.targetPeriod)
    && isWeatherMeasurements(value.forecastValues)
    && (value.location === null || isWeatherLocationSnapshot(value.location))
    && isWeatherSourceMetadata(value.source)
    && isWeatherRecordStatus(value.status)
    && isMissingReasonArray(value.missingReasons)
    && isNonEmptyString(value.createdAt);
}

export function isObservedWeatherRecord(value: unknown): value is ObservedWeatherRecord {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && value.schemaVersion === WEATHER_SCHEMA_VERSION
    && value.kind === 'OBSERVED_WEATHER_RECORD'
    && isWeatherPeriod(value.observedPeriod)
    && isWeatherMeasurements(value.observedValues)
    && (value.location === null || isWeatherLocationSnapshot(value.location))
    && isWeatherSourceMetadata(value.source)
    && isWeatherRecordStatus(value.status)
    && isMissingReasonArray(value.missingReasons)
    && isNonEmptyString(value.createdAt)
    && isNonEmptyString(value.updatedAt);
}

function isWeatherPeriod(value: unknown): value is WeatherPeriod {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.localDate)
    && isNonEmptyString(value.timezone)
    && (value.startsAt === undefined || isNonEmptyString(value.startsAt))
    && (value.endsAt === undefined || isNonEmptyString(value.endsAt))
    && typeof value.granularity === 'string'
    && (WEATHER_RECORD_GRANULARITIES as readonly string[]).includes(value.granularity);
}

function isWeatherLocationSnapshot(value: unknown): value is WeatherLocationSnapshot {
  if (!isRecord(value)) return false;
  return (value.label === undefined || typeof value.label === 'string')
    && (value.locality === undefined || typeof value.locality === 'string')
    && (value.countryCode === undefined || typeof value.countryCode === 'string')
    && (value.latitude === undefined || isLatitude(value.latitude))
    && (value.longitude === undefined || isLongitude(value.longitude));
}

function isWeatherSourceMetadata(value: unknown): value is WeatherSourceMetadata {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.provider)
    && isNonEmptyString(value.fetchedAt)
    && (value.requestId === undefined || typeof value.requestId === 'string')
    && (value.dataset === undefined || typeof value.dataset === 'string');
}

function isWeatherMeasurements(value: unknown): value is WeatherMeasurements {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, item]) => isWeatherMeasurementKey(key) && isWeatherValue(item, key === 'weatherCode'));
}

function isWeatherValue(value: unknown, allowString: boolean): value is WeatherValue<number> | WeatherValue<string> {
  if (!isRecord(value)) return false;
  const hasUsableValue = allowString ? typeof value.value === 'string' && value.value.trim().length > 0 : typeof value.value === 'number' && Number.isFinite(value.value);
  const hasMissingValue = value.value === null && isWeatherMissingReason(value.missingReason);
  return (hasUsableValue || hasMissingValue)
    && (value.unit === undefined || typeof value.unit === 'string')
    && (value.missingReason === undefined || isWeatherMissingReason(value.missingReason));
}

function isWeatherMeasurementKey(key: string): key is keyof WeatherMeasurements {
  return ['temperature', 'apparentTemperature', 'humidity', 'precipitation', 'precipitationProbability', 'pressure', 'windSpeed', 'sunshineDuration', 'weatherCode', 'dailyMinimumTemperature', 'dailyMaximumTemperature', 'temperatureDelta', 'pressureChange'].includes(key);
}
function isWeatherRecordStatus(value: unknown): value is WeatherRecordStatus { return typeof value === 'string' && (WEATHER_RECORD_STATUSES as readonly string[]).includes(value); }
function isWeatherMissingReason(value: unknown): value is WeatherMissingReason { return typeof value === 'string' && (WEATHER_MISSING_REASONS as readonly string[]).includes(value); }
function isMissingReasonArray(value: unknown): value is WeatherMissingReason[] { return Array.isArray(value) && value.every(isWeatherMissingReason); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isLatitude(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90; }
function isLongitude(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180; }
