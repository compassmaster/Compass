import { BACKUP_RESOURCE_REGISTRY, type BackupResourceDefinition } from './backupResourceRegistry.ts';

export const BACKUP_FORMAT = 'compass-backup';
export const BACKUP_SCHEMA_VERSION = 1;
export interface BackupStorageGateway { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface BackupResource { readonly name: string; readonly schemaVersion: number; readonly data: unknown }
export interface BackupEnvelope { readonly format: typeof BACKUP_FORMAT; readonly schemaVersion: typeof BACKUP_SCHEMA_VERSION; readonly exportedAt: string; readonly resources: readonly BackupResource[] }
export interface BackupPreviewIssue { readonly code: string; readonly message: string; readonly resourceName?: string }
export interface BackupResourceSummary { readonly name: string; readonly count: number; readonly known: boolean; readonly occurrences: number }
export interface BackupPreview {
  readonly format: string | null; readonly schemaVersion: number | null; readonly exportedAt: string | null;
  readonly resourceSummaries: readonly BackupResourceSummary[]; readonly unknownResources: readonly BackupResourceSummary[];
  readonly missingResources: readonly string[]; readonly duplicateResources: readonly string[];
  readonly warnings: readonly BackupPreviewIssue[]; readonly errors: readonly BackupPreviewIssue[]; readonly restorable: boolean;
}
export interface ImportPreparation { readonly preview: BackupPreview; readonly envelope: BackupEnvelope | null }

export class BackupApplicationService {
  private readonly storage: BackupStorageGateway; private readonly registry: readonly BackupResourceDefinition[]; private readonly now: () => string; private readonly afterRestore: () => void;
  constructor(storage: BackupStorageGateway = globalThis.localStorage, registry: readonly BackupResourceDefinition[] = BACKUP_RESOURCE_REGISTRY, now: () => string = () => new Date().toISOString(), afterRestore: () => void = () => undefined) {
    this.storage = storage; this.registry = registry; this.now = now; this.afterRestore = afterRestore;
  }

  getExportPreview(): BackupPreview { return this.prepareImport(this.export()).preview; }
  export(): string {
    const resources = this.registry.map((definition) => {
      const raw = this.storage.getItem(definition.storageKey); let data: unknown = clone(definition.emptyValue);
      if (raw !== null) { try { data = JSON.parse(raw) as unknown; } catch { throw new Error(`${definition.name} の保存データが不正なJSONです。`); } }
      const decoded = definition.decodeStored(data);
      if (!decoded.ok) throw new Error(`${definition.name} の保存データが既知の保存形式に適合しません。`);
      return { name: definition.name, schemaVersion: definition.schemaVersion, data: clone(decoded.data) };
    });
    return canonicalStringify({ format: BACKUP_FORMAT, schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: this.now(), resources });
  }

  /** Produces a complete read model and never writes, even for malformed input. */
  prepareImport(json: string): ImportPreparation {
    const errors: BackupPreviewIssue[] = []; const warnings: BackupPreviewIssue[] = [];
    let input: unknown;
    try { input = JSON.parse(json) as unknown; } catch { return invalidPreview([{ code: 'INVALID_JSON', message: 'JSONファイルを解析できません。' }]); }
    const root = isRecord(input) ? input : {};
    const format = typeof root.format === 'string' ? root.format : null;
    const schemaVersion = typeof root.schemaVersion === 'number' ? root.schemaVersion : null;
    const exportedAt = typeof root.exportedAt === 'string' ? root.exportedAt : null;
    if (format !== BACKUP_FORMAT) errors.push({ code: 'FORMAT_MISMATCH', message: 'バックアップ形式が一致しません。' });
    if (schemaVersion !== BACKUP_SCHEMA_VERSION) errors.push({ code: 'SCHEMA_VERSION_MISMATCH', message: 'バックアップのschemaVersionが一致しません。' });
    if (!isIso(exportedAt)) errors.push({ code: 'INVALID_EXPORTED_AT', message: 'export日時が不正です。' });
    const resources = Array.isArray(root.resources) ? root.resources : [];
    if (!Array.isArray(root.resources)) errors.push({ code: 'INVALID_RESOURCES', message: 'resourcesが配列ではありません。' });
    const definitions = new Map(this.registry.map((item) => [item.name, item])); const grouped = new Map<string, unknown[]>();
    for (const resource of resources) {
      const name = isRecord(resource) && typeof resource.name === 'string' ? resource.name : '(名前なし)';
      grouped.set(name, [...(grouped.get(name) ?? []), resource]);
    }
    const unknownResources = [...grouped].filter(([name]) => !definitions.has(name)).map(([name, values]) => ({ name, count: values.reduce<number>((sum, item) => sum + dataCount(isRecord(item) ? item.data : null), 0), known: false, occurrences: values.length }));
    const missingResources = this.registry.filter((item) => !grouped.has(item.name)).map((item) => item.name);
    const duplicateResources = [...grouped].filter(([, values]) => values.length > 1).map(([name]) => name).sort();
    for (const item of unknownResources) errors.push({ code: 'UNKNOWN_RESOURCE', resourceName: item.name, message: `unknown resource: ${item.name}（${item.occurrences}件）` });
    for (const name of missingResources) errors.push({ code: 'MISSING_RESOURCE', resourceName: name, message: `resourceが欠落しています: ${name}` });
    for (const name of duplicateResources) errors.push({ code: 'DUPLICATE_RESOURCE', resourceName: name, message: `resourceが重複しています: ${name}` });
    const resourceSummaries: BackupResourceSummary[] = [];
    for (const definition of this.registry) {
      const occurrence = grouped.get(definition.name)?.[0]; const resource = isRecord(occurrence) ? occurrence : null;
      resourceSummaries.push({ name: definition.name, count: dataCount(resource?.data), known: true, occurrences: grouped.get(definition.name)?.length ?? 0 });
      if (!resource) continue;
      if (resource.schemaVersion !== definition.schemaVersion) errors.push({ code: 'RESOURCE_SCHEMA_MISMATCH', resourceName: definition.name, message: `${definition.name} のschemaVersionが一致しません。` });
      if (!definition.validate(resource.data)) errors.push({ code: 'INVALID_RESOURCE_DATA', resourceName: definition.name, message: `${definition.name} に不正なデータがあります。` });
      if (dataCount(resource.data) === 0) warnings.push({ code: 'EMPTY_RESOURCE', resourceName: definition.name, message: `${definition.name} は空です。` });
    }
    validateReferences(grouped, errors);
    const preview: BackupPreview = { format, schemaVersion, exportedAt, resourceSummaries: [...resourceSummaries, ...unknownResources], unknownResources, missingResources, duplicateResources, warnings, errors, restorable: errors.length === 0 };
    return { preview, envelope: preview.restorable ? clone(input) as BackupEnvelope : null };
  }

  restore(prepared: ImportPreparation): void {
    if (!prepared.preview.restorable || !prepared.envelope) throw new Error('検証済みで復元可能なバックアップが必要です。');
    const before = new Map(this.registry.map((item) => [item.storageKey, this.storage.getItem(item.storageKey)]));
    try {
      const byName = new Map(prepared.envelope.resources.map((item) => [item.name, item.data]));
      for (const definition of this.registry) { const data = definition.normalize(byName.get(definition.name)); const absent = data === null || (Array.isArray(data) && data.length === 0); if (absent) this.storage.removeItem(definition.storageKey); else this.storage.setItem(definition.storageKey, canonicalStringify(data)); }
      this.afterRestore();
    } catch (error) { for (const [key, raw] of before) { if (raw === null) this.storage.removeItem(key); else this.storage.setItem(key, raw); } throw error; }
  }
}

function validateReferences(grouped: Map<string, unknown[]>, errors: BackupPreviewIssue[]): void {
  const data = (name: string): unknown[] => { const item = grouped.get(name)?.[0]; return isRecord(item) && Array.isArray(item.data) ? item.data : []; };
  const ids = (name: string) => new Set(data(name).filter(isRecord).map((item) => item.id).filter((id): id is string => typeof id === 'string'));
  const evidenceIds = ids('evidence'); const candidateIds = ids('understandingCandidates'); const objectIds = ids('understandingObjects');
  for (const item of data('understandingCandidates').filter(isRecord)) for (const id of Array.isArray(item.evidenceIds) ? item.evidenceIds : []) if (!evidenceIds.has(String(id))) errors.push({ code: 'BROKEN_REFERENCE', resourceName: 'understandingCandidates', message: `Candidate ${String(item.id)} が存在しないEvidence ${String(id)} を参照しています。` });
  for (const item of data('candidateResponses').filter(isRecord)) if (!candidateIds.has(String(item.candidateId))) errors.push({ code: 'BROKEN_REFERENCE', resourceName: 'candidateResponses', message: `Responseが存在しないCandidate ${String(item.candidateId)} を参照しています。` });
  for (const item of data('understandingObjects').filter(isRecord)) { for (const id of Array.isArray(item.sourceCandidateIds) ? item.sourceCandidateIds : []) if (!candidateIds.has(String(id))) errors.push({ code: 'BROKEN_REFERENCE', resourceName: 'understandingObjects', message: `Understanding Objectが存在しないCandidate ${String(id)} を参照しています。` }); for (const id of Array.isArray(item.evidenceIds) ? item.evidenceIds : []) if (!evidenceIds.has(String(id))) errors.push({ code: 'BROKEN_REFERENCE', resourceName: 'understandingObjects', message: `Understanding Objectが存在しないEvidence ${String(id)} を参照しています。` }); }
  const formal = grouped.get('formalUserModel')?.[0]; const model = isRecord(formal) && isRecord(formal.data) ? formal.data : null; const membership = model && isRecord(model.understandingIds) ? [...(Array.isArray(model.understandingIds.longTerm) ? model.understandingIds.longTerm : []), ...(Array.isArray(model.understandingIds.shortTerm) ? model.understandingIds.shortTerm : [])] : [];
  for (const id of membership) if (!objectIds.has(String(id))) errors.push({ code: 'BROKEN_REFERENCE', resourceName: 'formalUserModel', message: `Formal UserModelが存在しないUnderstanding Object ${String(id)} を参照しています。` });
}
function invalidPreview(errors: BackupPreviewIssue[]): ImportPreparation { return { envelope: null, preview: { format: null, schemaVersion: null, exportedAt: null, resourceSummaries: [], unknownResources: [], missingResources: [], duplicateResources: [], warnings: [], errors, restorable: false } }; }
function dataCount(data: unknown): number { if (Array.isArray(data)) return data.length; if (isRecord(data) && Array.isArray(data.records)) return data.records.length; return data === null || data === undefined ? 0 : 1; }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isIso(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function canonicalStringify(value: unknown): string { return JSON.stringify(sortKeys(value), null, 2); }
function sortKeys(value: unknown): unknown { if (Array.isArray(value)) return value.map(sortKeys); if (!isRecord(value)) return value; return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])])); }
