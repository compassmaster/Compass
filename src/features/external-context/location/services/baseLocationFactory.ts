import type { WeatherLocationSnapshot } from '../../weather/types/index.ts';
import type { BaseLocation, BaseLocationId, BaseLocationSource } from '../types/index.ts';
import { isBaseLocation } from '../types/index.ts';

export interface BaseLocationInput {
  readonly displayName: string; readonly municipality: string; readonly countryCode: string;
  readonly timezone: string; readonly latitude: number; readonly longitude: number;
  readonly source?: BaseLocationSource;
}
export interface BaseLocationFactoryOptions { readonly id?: BaseLocationId; readonly now?: string; readonly createdAt?: string }

export function createBaseLocation(input: BaseLocationInput, options: BaseLocationFactoryOptions = {}): BaseLocation {
  const now = options.now ?? new Date().toISOString();
  const normalized = {
    displayName: input.displayName.trim(), municipality: input.municipality.trim(),
    countryCode: input.countryCode.trim().toUpperCase(), timezone: input.timezone.trim(),
  };
  const location: BaseLocation = {
    schemaVersion: 1, id: options.id ?? generateId(), ...normalized,
    coordinates: { latitude: input.latitude, longitude: input.longitude },
    source: input.source ?? 'USER_ENTERED', confirmationStatus: 'CONFIRMED',
    createdAt: options.createdAt ?? now, updatedAt: now,
  };
  if (!isBaseLocation(location)) throw new Error('Base Locationの入力内容を確認してください。');
  return location;
}

export function toWeatherLocationSnapshot(location: BaseLocation): WeatherLocationSnapshot {
  return { timezone: location.timezone, precision: 'COARSE', label: location.displayName,
    locality: location.municipality, countryCode: location.countryCode,
    latitude: location.coordinates.latitude, longitude: location.coordinates.longitude };
}

function generateId(): BaseLocationId {
  return (globalThis.crypto?.randomUUID?.() ?? `base-location-${Date.now()}`) as BaseLocationId;
}
