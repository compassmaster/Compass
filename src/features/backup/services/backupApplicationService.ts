import { BACKUP_RESOURCE_REGISTRY, type BackupResourceDefinition } from './backupResourceRegistry.ts';

export const BACKUP_FORMAT = 'compass-backup';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupStorageGateway { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface BackupResource { readonly name: string; readonly schemaVersion: number; readonly data: unknown }
export interface BackupEnvelope { readonly format: typeof BACKUP_FORMAT; readonly schemaVersion: typeof BACKUP_SCHEMA_VERSION; readonly exportedAt: string; readonly resources: readonly BackupResource[] }
export type ImportPreparation = { readonly ok: true; readonly envelope: BackupEnvelope } | { readonly ok: false; readonly error: string };

export class BackupApplicationService {
  private readonly storage: BackupStorageGateway;
  private readonly registry: readonly BackupResourceDefinition[];
  private readonly now: () => string;
  private readonly afterRestore: () => void;
  constructor(
    storage: BackupStorageGateway = globalThis.localStorage,
    registry: readonly BackupResourceDefinition[] = BACKUP_RESOURCE_REGISTRY,
    now: () => string = () => new Date().toISOString(),
    afterRestore: () => void = () => undefined,
  ) { this.storage = storage; this.registry = registry; this.now = now; this.afterRestore = afterRestore; }

  export(): string {
    const resources = this.registry.map((definition) => {
      const raw = this.storage.getItem(definition.storageKey);
      let data: unknown = definition.name === 'baseLocation' || definition.name.includes('Weather') || definition.name === 'formalUserModel' || definition.name === 'legacyUserModel' ? null : [];
      if (raw !== null) {
        try { data = JSON.parse(raw) as unknown; } catch { throw new Error(`${definition.name} の保存データが不正なJSONです。`); }
      }
      if (!definition.validate(data)) throw new Error(`${definition.name} の保存データがschemaに適合しません。`);
      return { name: definition.name, schemaVersion: definition.schemaVersion, data: clone(data) };
    });
    return canonicalStringify({ format: BACKUP_FORMAT, schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: this.now(), resources });
  }

  /** Parse and validate every resource. This method never writes. */
  prepareImport(json: string): ImportPreparation {
    let input: unknown;
    try { input = JSON.parse(json) as unknown; } catch { return { ok: false, error: 'JSONファイルを解析できません。' }; }
    if (!isRecord(input) || input.format !== BACKUP_FORMAT) return { ok: false, error: 'バックアップ形式が一致しません。' };
    if (input.schemaVersion !== BACKUP_SCHEMA_VERSION) return { ok: false, error: 'バックアップのschemaVersionが一致しません。' };
    if (!isIso(input.exportedAt) || !Array.isArray(input.resources)) return { ok: false, error: 'バックアップenvelopeが不正です。' };
    const expected = new Map(this.registry.map((item) => [item.name, item]));
    if (input.resources.length !== expected.size) return { ok: false, error: 'resource一覧が一致しません。' };
    for (const value of input.resources) {
      if (!isRecord(value) || typeof value.name !== 'string' || !expected.has(value.name)) return { ok: false, error: 'unknown resourceが含まれています。' };
      const definition = expected.get(value.name)!;
      if (value.schemaVersion !== definition.schemaVersion) return { ok: false, error: `${value.name} のschemaVersionが一致しません。` };
      if (!definition.validate(value.data)) return { ok: false, error: `${value.name} に不正なデータがあります。` };
      expected.delete(value.name);
    }
    return { ok: true, envelope: clone(input) as unknown as BackupEnvelope };
  }

  /** Full replacement only. A failed write or reconciliation restores every managed key. */
  restore(prepared: ImportPreparation): void {
    if (!prepared.ok) throw new Error(prepared.error);
    const before = new Map(this.registry.map((item) => [item.storageKey, this.storage.getItem(item.storageKey)]));
    try {
      const byName = new Map(prepared.envelope.resources.map((item) => [item.name, item.data]));
      for (const definition of this.registry) {
        const data = byName.get(definition.name);
        const absent = data === null || (Array.isArray(data) && data.length === 0);
        if (absent) this.storage.removeItem(definition.storageKey);
        else this.storage.setItem(definition.storageKey, canonicalStringify(data));
      }
      this.afterRestore();
    } catch (error) {
      for (const [key, raw] of before) {
        if (raw === null) this.storage.removeItem(key);
        else this.storage.setItem(key, raw);
      }
      throw error;
    }
  }
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isIso(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function canonicalStringify(value: unknown): string { return JSON.stringify(sortKeys(value), null, 2); }
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
}
