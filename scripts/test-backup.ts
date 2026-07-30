import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BackupApplicationService } from '../src/features/backup/services/backupApplicationService.ts';
import type { BackupResourceDefinition } from '../src/features/backup/services/backupResourceRegistry.ts';

class MemoryStorage {
  readonly values = new Map<string, string>(); failOnKey: string | null = null;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (key === this.failOnKey) { this.failOnKey = null; throw new Error('write failure'); } this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const valid = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string');
const registry: BackupResourceDefinition[] = [
  { name: 'a', storageKey: 'managed-a', schemaVersion: 1, validate: valid },
  { name: 'b', storageKey: 'managed-b', schemaVersion: 1, validate: valid },
];
const clock = () => '2026-07-30T00:00:00.000Z';
const storage = new MemoryStorage();
storage.setItem('managed-a', JSON.stringify([{ z: 1, id: 'a' }])); storage.setItem('managed-b', JSON.stringify([{ id: 'b' }])); storage.setItem('unmanaged', 'keep');
let reconciled = 0;
const service = new BackupApplicationService(storage, registry, clock, () => { reconciled += 1; });
const exported = service.export(); const envelope = JSON.parse(exported);
assert.deepEqual(envelope.resources.map((item: { name: string }) => item.name), ['a', 'b']);
assert.equal(service.export(), exported, 'deterministic output');
assert.deepEqual(JSON.parse(new BackupApplicationService(new MemoryStorage(), registry, clock).export()).resources.map((item: { data: unknown }) => item.data), [[], []]);
assert.equal(service.prepareImport('{').ok, false); assert.equal(service.prepareImport(JSON.stringify({ ...envelope, format: 'other' })).ok, false);
assert.equal(service.prepareImport(JSON.stringify({ ...envelope, schemaVersion: 2 })).ok, false);
const bad = structuredClone(envelope); bad.resources[0].data = [{ nope: true }]; assert.equal(service.prepareImport(JSON.stringify(bad)).ok, false);
const unknown = structuredClone(envelope); unknown.resources[0].name = 'unknown'; assert.equal(service.prepareImport(JSON.stringify(unknown)).ok, false);
const replacement = structuredClone(envelope); replacement.resources[0].data = [{ id: 'new' }]; replacement.resources[1].data = [];
const replacementJson = JSON.stringify(replacement); const prepared = service.prepareImport(replacementJson);
assert.equal(storage.getItem('managed-a'), JSON.stringify([{ z: 1, id: 'a' }]), 'validation does not write');
service.restore(prepared);
assert.deepEqual(JSON.parse(storage.getItem('managed-a')!), [{ id: 'new' }]); assert.equal(storage.getItem('managed-b'), null);
assert.equal(storage.getItem('unmanaged'), 'keep'); assert.equal(reconciled, 1); assert.equal(JSON.stringify(replacement), replacementJson);
storage.setItem('managed-a', JSON.stringify([{ id: 'before-a' }])); storage.setItem('managed-b', JSON.stringify([{ id: 'before-b' }]));
storage.failOnKey = 'managed-b'; const rollback = structuredClone(envelope); rollback.resources[0].data = [{ id: 'after-a' }]; rollback.resources[1].data = [{ id: 'after-b' }];
assert.throws(() => service.restore(service.prepareImport(JSON.stringify(rollback)))); storage.failOnKey = null;
assert.deepEqual(JSON.parse(storage.getItem('managed-a')!), [{ id: 'before-a' }]); assert.deepEqual(JSON.parse(storage.getItem('managed-b')!), [{ id: 'before-b' }]); assert.equal(storage.getItem('unmanaged'), 'keep');
const ui = readFileSync(new URL('../src/features/backup/components/BackupPanel.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(ui, /localStorage|Repository/);
console.log('backup tests passed');
