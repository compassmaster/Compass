export type WeatherForecastSnapshotId = string & { readonly __brand: 'WeatherForecastSnapshotId' };
export type ObservedWeatherRecordId = string & { readonly __brand: 'ObservedWeatherRecordId' };
export type WeatherSchemaVersion = 1;

export type WeatherRecordGranularity = 'DAILY' | 'HOURLY';
export type WeatherSourceType = 'FORECAST' | 'OBSERVED' | 'HISTORICAL';
export type WeatherLocationPrecision = 'COARSE' | 'EXACT';
export type WeatherMissingReason = 'PROVIDER_VALUE_MISSING' | 'API_REQUEST_FAILED' | 'LOCATION_NOT_CONFIGURED' | 'LOCATION_UNAVAILABLE' | 'OUT_OF_PROVIDER_RANGE' | 'NOT_YET_OBSERVED';

export type WeatherDataAvailability =
  | { readonly status: 'AVAILABLE' }
  | { readonly status: 'PARTIAL'; readonly missingReasons: readonly WeatherMissingReason[] }
  | { readonly status: 'UNAVAILABLE'; readonly reason: WeatherMissingReason };

export interface WeatherLocationSnapshot {
  readonly timezone: string;
  readonly precision: WeatherLocationPrecision;
  readonly label?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  /** 必要最小限の粗い場所。詳細住所、建物、階数、施設名、移動履歴は保存しない。 */
  readonly locality?: string;
  readonly countryCode?: string;
}

export interface WeatherSourceMetadata {
  readonly provider: string;
  readonly sourceType: WeatherSourceType;
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
  /** 気温。負値を許可する。 */
  readonly temperature?: WeatherValue<number>;
  readonly apparentTemperature?: WeatherValue<number>;
  /** 期待単位: percent。0〜100。 */
  readonly humidity?: WeatherValue<number>;
  /** 期待単位: mm。0以上。 */
  readonly precipitation?: WeatherValue<number>;
  /** 期待単位: percent。0〜100。 */
  readonly precipitationProbability?: WeatherValue<number>;
  /** 期待単位: hPa。0より大きい。 */
  readonly pressure?: WeatherValue<number>;
  /** 期待単位: m/s 等。0以上。 */
  readonly windSpeed?: WeatherValue<number>;
  /** 期待単位: seconds。0以上。 */
  readonly sunshineDuration?: WeatherValue<number>;
  /** Provider非依存の正規化コード。API固有レスポンス文字列はDomainへ直接保存しない。 */
  readonly weatherCode?: WeatherValue<number>;
  readonly dailyMinimumTemperature?: WeatherValue<number>;
  readonly dailyMaximumTemperature?: WeatherValue<number>;
  /** 前日比などの差分。負値を許可する。 */
  readonly temperatureDelta?: WeatherValue<number>;
  /** 気圧変化。負値を許可する。 */
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
  readonly availability: WeatherDataAvailability;
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
  readonly availability: WeatherDataAvailability;
  readonly createdAt: string;
}

export const WEATHER_SCHEMA_VERSION: WeatherSchemaVersion = 1;
export const WEATHER_RECORD_GRANULARITIES: readonly WeatherRecordGranularity[] = ['DAILY', 'HOURLY'];
export const WEATHER_SOURCE_TYPES: readonly WeatherSourceType[] = ['FORECAST', 'OBSERVED', 'HISTORICAL'];
export const WEATHER_LOCATION_PRECISIONS: readonly WeatherLocationPrecision[] = ['COARSE', 'EXACT'];
export const WEATHER_MISSING_REASONS: readonly WeatherMissingReason[] = ['PROVIDER_VALUE_MISSING', 'API_REQUEST_FAILED', 'LOCATION_NOT_CONFIGURED', 'LOCATION_UNAVAILABLE', 'OUT_OF_PROVIDER_RANGE', 'NOT_YET_OBSERVED'];

export function isWeatherForecastSnapshot(value: unknown): value is WeatherForecastSnapshot {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && value.schemaVersion === WEATHER_SCHEMA_VERSION
    && value.kind === 'WEATHER_FORECAST_SNAPSHOT'
    && isWeatherPeriod(value.targetPeriod)
    && isWeatherMeasurements(value.forecastValues)
    && (value.location === null || isWeatherLocationSnapshot(value.location))
    && isWeatherSourceMetadata(value.source)
    && value.source.sourceType === 'FORECAST'
    && isWeatherDataAvailability(value.availability, value.forecastValues, value.location)
    && isIsoDateTime(value.createdAt);
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
    && (value.source.sourceType === 'OBSERVED' || value.source.sourceType === 'HISTORICAL')
    && isWeatherDataAvailability(value.availability, value.observedValues, value.location)
    && isIsoDateTime(value.createdAt);
}

export function isWeatherPeriod(value: unknown): value is WeatherPeriod {
  if (!isRecord(value)) return false;
  if (!isValidLocalDate(value.localDate) || !isNonEmptyString(value.timezone)) return false;
  if (value.startsAt !== undefined && !isIsoDateTime(value.startsAt)) return false;
  if (value.endsAt !== undefined && !isIsoDateTime(value.endsAt)) return false;
  if (value.startsAt !== undefined && value.endsAt !== undefined && Date.parse(value.startsAt) >= Date.parse(value.endsAt)) return false;
  return typeof value.granularity === 'string' && (WEATHER_RECORD_GRANULARITIES as readonly string[]).includes(value.granularity);
}

export function isWeatherLocationSnapshot(value: unknown): value is WeatherLocationSnapshot {
  if (!isRecord(value)) return false;
  const hasLatitude = value.latitude !== undefined;
  const hasLongitude = value.longitude !== undefined;
  return isNonEmptyString(value.timezone)
    && typeof value.precision === 'string'
    && (WEATHER_LOCATION_PRECISIONS as readonly string[]).includes(value.precision)
    && hasLatitude === hasLongitude
    && (value.label === undefined || typeof value.label === 'string')
    && (value.locality === undefined || typeof value.locality === 'string')
    && (value.countryCode === undefined || typeof value.countryCode === 'string')
    && (value.latitude === undefined || isLatitude(value.latitude))
    && (value.longitude === undefined || isLongitude(value.longitude));
}

export function isWeatherSourceMetadata(value: unknown): value is WeatherSourceMetadata {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.provider)
    && typeof value.sourceType === 'string'
    && (WEATHER_SOURCE_TYPES as readonly string[]).includes(value.sourceType)
    && isIsoDateTime(value.fetchedAt)
    && (value.requestId === undefined || typeof value.requestId === 'string')
    && (value.dataset === undefined || typeof value.dataset === 'string');
}

export function isWeatherMeasurements(value: unknown): value is WeatherMeasurements {
  if (!isRecord(value)) return false;
  if (!Object.entries(value).every(([key, item]) => isWeatherMeasurementKey(key) && isWeatherValueForField(key, item))) return false;
  const measurements = value as WeatherMeasurements;
  const min = getUsableNumber(measurements.dailyMinimumTemperature);
  const max = getUsableNumber(measurements.dailyMaximumTemperature);
  return min === null || max === null || min <= max;
}

export function isWeatherDataAvailability(value: unknown, measurements?: WeatherMeasurements, location?: WeatherLocationSnapshot | null): value is WeatherDataAvailability {
  if (!isRecord(value)) return false;
  if (location === null && value.status !== 'UNAVAILABLE' && !hasLocationMissingReason(value)) return false;
  const measurementCount = measurements === undefined ? undefined : Object.keys(measurements).length;
  const usableCount = measurements === undefined ? undefined : countUsableMeasurements(measurements);
  if (value.status === 'AVAILABLE') return measurementCount !== undefined && measurementCount > 0 && usableCount === measurementCount;
  if (value.status === 'PARTIAL') return measurementCount !== undefined && measurementCount > 0 && usableCount !== undefined && usableCount > 0 && isMissingReasonArray(value.missingReasons) && value.missingReasons.length > 0;
  if (value.status === 'UNAVAILABLE') return measurementCount !== undefined && measurementCount === 0 && isWeatherMissingReason(value.reason);
  return false;
}

function isWeatherValueForField(field: keyof WeatherMeasurements, value: unknown): value is WeatherValue<number> {
  if (!isRecord(value)) return false;
  const hasMissingValue = value.value === null && isWeatherMissingReason(value.missingReason);
  const hasUsableValue = typeof value.value === 'number' && isValueInRange(field, value.value);
  return (hasUsableValue || hasMissingValue)
    && (value.unit === undefined || typeof value.unit === 'string')
    && (value.missingReason === undefined || isWeatherMissingReason(value.missingReason));
}

function isValueInRange(field: keyof WeatherMeasurements, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (field === 'humidity' || field === 'precipitationProbability') return value >= 0 && value <= 100;
  if (field === 'precipitation' || field === 'windSpeed' || field === 'sunshineDuration') return value >= 0;
  if (field === 'pressure') return value > 0;
  if (field === 'weatherCode') return Number.isInteger(value) && value >= 0;
  return true;
}

function getUsableNumber(value: WeatherValue<number> | undefined): number | null {
  return value !== undefined && typeof value.value === 'number' && Number.isFinite(value.value) ? value.value : null;
}

function countUsableMeasurements(measurements: WeatherMeasurements): number {
  return Object.values(measurements).filter((item) => isRecord(item) && item.value !== null).length;
}

function hasLocationMissingReason(value: Record<string, unknown>): boolean {
  if (value.status === 'PARTIAL' && Array.isArray(value.missingReasons)) {
    return value.missingReasons.includes('LOCATION_NOT_CONFIGURED') || value.missingReasons.includes('LOCATION_UNAVAILABLE');
  }
  if (value.status === 'UNAVAILABLE') return value.reason === 'LOCATION_NOT_CONFIGURED' || value.reason === 'LOCATION_UNAVAILABLE';
  return false;
}

function isWeatherMeasurementKey(key: string): key is keyof WeatherMeasurements {
  return ['temperature', 'apparentTemperature', 'humidity', 'precipitation', 'precipitationProbability', 'pressure', 'windSpeed', 'sunshineDuration', 'weatherCode', 'dailyMinimumTemperature', 'dailyMaximumTemperature', 'temperatureDelta', 'pressureChange'].includes(key);
}
function isWeatherMissingReason(value: unknown): value is WeatherMissingReason { return typeof value === 'string' && (WEATHER_MISSING_REASONS as readonly string[]).includes(value); }
function isMissingReasonArray(value: unknown): value is WeatherMissingReason[] { return Array.isArray(value) && value.every(isWeatherMissingReason); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isLatitude(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90; }
function isLongitude(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180; }
function isIsoDateTime(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value)); }
function isValidLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
