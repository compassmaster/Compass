import type { BackupPreview } from '../services/index.ts';
export interface BackupPreviewViewModel {
  readonly statusLabel: string; readonly schemaLabel: string; readonly exportedAtLabel: string;
  readonly resources: readonly { name: string; countLabel: string; occurrenceLabel: string }[];
  readonly unknownLabel: string; readonly missingLabel: string; readonly duplicateLabel: string;
  readonly warnings: readonly string[]; readonly errors: readonly string[];
}
export function presentBackupPreview(preview: BackupPreview): BackupPreviewViewModel {
  return {
    statusLabel: preview.restorable ? '復元可能' : '復元不可',
    schemaLabel: preview.schemaVersion === null ? '—' : `v${preview.schemaVersion}`,
    exportedAtLabel: preview.exportedAt ? new Date(preview.exportedAt).toLocaleString('ja-JP') : '—',
    resources: preview.resourceSummaries.map((item) => ({ name: item.name, countLabel: `${item.count}件`, occurrenceLabel: item.occurrences === 1 ? '1 resource' : `${item.occurrences} resources` })),
    unknownLabel: preview.unknownResources.length ? preview.unknownResources.map((item) => `${item.name}（データ${item.count}件 / 出現${item.occurrences}件）`).join('、') : 'なし',
    missingLabel: preview.missingResources.length ? preview.missingResources.join('、') : 'なし',
    duplicateLabel: preview.duplicateResources.length ? preview.duplicateResources.join('、') : 'なし',
    warnings: preview.warnings.map((item) => item.message), errors: preview.errors.map((item) => item.message),
  };
}
