import assert from 'node:assert/strict';
import { BaseLocationApplicationService, LocalStorageBaseLocationRepository, BASE_LOCATION_INVALID_STORAGE_KEY,
  BASE_LOCATION_STORAGE_KEY, createBaseLocation, isBaseLocation, toWeatherLocationSnapshot,
  type BaseLocationId } from '../src/features/external-context/location/index.ts';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>(); get length() { return this.values.size; }
  clear() { this.values.clear(); } getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; } removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const input = { displayName: '  Home region ', municipality: ' Example City ', countryCode: ' jp ', timezone: ' Asia/Tokyo ', latitude: 35.6, longitude: 139.7 };
const location = createBaseLocation(input, { id: 'base:test' as BaseLocationId, now: '2026-07-27T00:00:00.000Z' });
assert.equal(location.displayName, 'Home region'); assert.equal(location.countryCode, 'JP'); assert.ok(isBaseLocation(location));
for (const invalid of [{ ...input, displayName: ' ' }, { ...input, municipality: '' }, { ...input, latitude: 91 }, { ...input, longitude: -181 }]) assert.throws(() => createBaseLocation(invalid));
assert.equal(isBaseLocation({ ...location, source: 'GPS' }), false);
assert.equal(isBaseLocation({ ...location, confirmationStatus: 'PENDING' }), false);
assert.equal(isBaseLocation({ ...location, createdAt: 'not-a-date' }), false);

const snapshot = toWeatherLocationSnapshot(location); const priorLabel = snapshot.label;
const changed = createBaseLocation({ ...input, displayName: 'Changed' }, { id: location.id, createdAt: location.createdAt, now: '2026-07-27T01:00:00.000Z' });
assert.equal(snapshot.locality, 'Example City'); assert.equal(snapshot.latitude, 35.6); assert.equal(priorLabel, 'Home region'); assert.notEqual(snapshot.label, changed.displayName);

const storage = new MemoryStorage(); const weatherKey = 'compass_weather_forecast_snapshots_v1'; storage.setItem(weatherKey, 'untouched');
const repository = new LocalStorageBaseLocationRepository(storage); assert.equal(repository.get(), null);
repository.save(location); assert.deepEqual(repository.get(), location); repository.save(changed); assert.deepEqual(repository.get(), changed);
repository.delete(); assert.equal(repository.get(), null); assert.equal(storage.getItem(weatherKey), 'untouched');
storage.setItem(BASE_LOCATION_STORAGE_KEY, '{bad'); assert.equal(repository.get(), null); assert.ok(storage.getItem(BASE_LOCATION_INVALID_STORAGE_KEY));
storage.setItem(BASE_LOCATION_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, location })); assert.equal(repository.get(), null);
storage.setItem(BASE_LOCATION_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, location: { ...location, coordinates: { latitude: 999, longitude: 0 } } })); assert.equal(repository.get(), null);

const service = new BaseLocationApplicationService(repository); const first = service.setBaseLocation(input);
const second = service.setBaseLocation({ ...input, displayName: 'Updated' });
assert.equal(second.id, first.id); assert.equal(second.createdAt, first.createdAt); assert.equal(second.displayName, 'Updated'); assert.ok(Date.parse(second.updatedAt) >= Date.parse(first.updatedAt));
assert.equal(storage.getItem(weatherKey), 'untouched'); service.deleteBaseLocation(); assert.equal(service.getBaseLocation(), null);
console.log('base location tests passed');
