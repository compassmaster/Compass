import type { BaseLocationRepository } from './baseLocationRepository.ts';
import type { BaseLocation } from '../types/index.ts';
import { isBaseLocation } from '../types/index.ts';

export const BASE_LOCATION_STORAGE_KEY = 'compass_base_location_v1';
export const BASE_LOCATION_INVALID_STORAGE_KEY = 'compass_base_location_invalid_v1';

export class LocalStorageBaseLocationRepository implements BaseLocationRepository {
  private readonly storage: Storage;
  constructor(storage: Storage = localStorage) { this.storage = storage; }
  get(): BaseLocation | null {
    const raw = this.storage.getItem(BASE_LOCATION_STORAGE_KEY);
    if (raw === null) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (isRecord(value) && value.schemaVersion === 1 && isBaseLocation(value.location)) return value.location;
      this.quarantine(raw); return null;
    } catch { this.quarantine(raw); return null; }
  }
  save(location: BaseLocation): void {
    if (!isBaseLocation(location)) throw new Error('Invalid BaseLocation');
    this.storage.setItem(BASE_LOCATION_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, location }));
  }
  delete(): void { this.storage.removeItem(BASE_LOCATION_STORAGE_KEY); }
  private quarantine(raw: string): void {
    this.storage.setItem(BASE_LOCATION_INVALID_STORAGE_KEY, raw);
    this.storage.removeItem(BASE_LOCATION_STORAGE_KEY);
  }
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
