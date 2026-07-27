export type BaseLocationId = string & { readonly __brand: 'BaseLocationId' };
export type BaseLocationSource = 'USER_ENTERED' | 'USER_CONFIRMED';
export type BaseLocationConfirmationStatus = 'CONFIRMED';

export interface BaseLocationCoordinates { readonly latitude: number; readonly longitude: number }
export interface BaseLocation {
  readonly schemaVersion: 1;
  readonly id: BaseLocationId;
  readonly displayName: string;
  readonly municipality: string;
  readonly countryCode: string;
  readonly timezone: string;
  readonly coordinates: BaseLocationCoordinates;
  readonly source: BaseLocationSource;
  readonly confirmationStatus: BaseLocationConfirmationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function isBaseLocation(value: unknown): value is BaseLocation {
  if (!isRecord(value) || !isRecord(value.coordinates)) return false;
  return value.schemaVersion === 1 && nonEmpty(value.id) && nonEmpty(value.displayName)
    && nonEmpty(value.municipality) && nonEmpty(value.countryCode) && nonEmpty(value.timezone)
    && finiteRange(value.coordinates.latitude, -90, 90)
    && finiteRange(value.coordinates.longitude, -180, 180)
    && (value.source === 'USER_ENTERED' || value.source === 'USER_CONFIRMED')
    && value.confirmationStatus === 'CONFIRMED'
    && validDateTime(value.createdAt) && validDateTime(value.updatedAt);
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function nonEmpty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function finiteRange(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
function validDateTime(value: unknown): value is string { return nonEmpty(value) && !Number.isNaN(Date.parse(value)); }
