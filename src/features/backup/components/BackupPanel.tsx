import { useState, type ChangeEvent } from 'react';
import { backupApplicationService, type BackupPreview, type ImportPreparation } from '../services/index.ts';
import { presentBackupPreview } from './backupPreviewPresentation.ts';
import './BackupPanel.css';

export interface BackupPanelProps { readonly onRestored: () => void }
export function BackupPanel({ onRestored }: BackupPanelProps) {
  const [prepared, setPrepared] = useState<ImportPreparation | null>(null); const [exportPreview, setExportPreview] = useState<BackupPreview | null>(null); const [message, setMessage] = useState('');
  const previewExport = () => { try { setExportPreview(backupApplicationService.getExportPreview()); setMessage('書き出し対象を確認してください。'); } catch (error) { setMessage(error instanceof Error ? error.message : '概要の作成に失敗しました。'); } };
  const exportBackup = () => { try { const blob = new Blob([backupApplicationService.export()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `compass-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); setExportPreview(null); setMessage('バックアップを端末へ保存しました。'); } catch (error) { setMessage(error instanceof Error ? error.message : '書き出しに失敗しました。'); } };
  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; setPrepared(null); if (!file) return; const result = backupApplicationService.prepareImport(await file.text()); setPrepared(result); setMessage('復元プレビューを確認してください。確認するまで現在のデータは変更されません。'); event.target.value = ''; };
  const restore = () => { if (!prepared?.preview.restorable) return; try { backupApplicationService.restore(prepared); setPrepared(null); onRestored(); setMessage('全データを置き換え、表示を更新しました。'); } catch { setMessage('復元に失敗したため、復元前のデータへロールバックしました。'); } };
  return <section className="backup-panel"><h2 id="backup-primary-heading" tabIndex={-1}>バックアップと復元</h2>
    <p><strong>重要:</strong> バックアップには記録・睡眠・地域・理解などの個人情報が含まれます。安全な場所に保管してください。</p>
    <p>ファイルはこの端末内だけで作成・検証され、外部サーバーへ送信されません。復元は現在の対象データをすべて置き換えます（結合は行いません）。</p>
    <div className="backup-actions"><button type="button" onClick={previewExport}>書き出し対象を確認</button><label className="backup-file">バックアップを選択<input type="file" accept="application/json,.json" onChange={selectFile} /></label></div>
    {message && <p role="status">{message}</p>}
    {exportPreview && <><Preview preview={exportPreview} title="書き出し概要" /><button type="button" onClick={exportBackup}>この内容を書き出す</button></>}
    {prepared && <><Preview preview={prepared.preview} title="復元プレビュー" /><div className="backup-confirm">
      <button type="button" onClick={restore} disabled={!prepared.preview.restorable}>確認して復元する</button>
      <button type="button" onClick={() => { setPrepared(null); setMessage('復元をキャンセルしました。'); }}>キャンセル</button>
    </div></>}
  </section>;
}
function Preview({ preview, title }: { preview: BackupPreview; title: string }) { const view = presentBackupPreview(preview); return <section className="backup-preview"><h3>{title}</h3>
  <dl><div><dt>判定</dt><dd className={preview.restorable ? 'preview-ok' : 'preview-error'}>{view.statusLabel}</dd></div><div><dt>backup schemaVersion</dt><dd>{view.schemaLabel}</dd></div><div><dt>export日時</dt><dd>{view.exportedAtLabel}</dd></div><div><dt>unknown resource</dt><dd>{view.unknownLabel}</dd></div><div><dt>欠落resource</dt><dd>{view.missingLabel}</dd></div><div><dt>重複resource</dt><dd>{view.duplicateLabel}</dd></div></dl>
  <h4>resource別件数</h4><ul>{view.resources.map((item) => <li key={item.name}><code>{item.name}</code>: {item.countLabel}（{item.occurrenceLabel}）</li>)}</ul>
  {view.warnings.length > 0 && <div className="preview-warnings"><h4>Warning</h4><ul>{view.warnings.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
  {view.errors.length > 0 && <div className="preview-errors"><h4>Error</h4><ul>{view.errors.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
</section>; }
