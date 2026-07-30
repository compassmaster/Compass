import { useState, type ChangeEvent } from 'react';
import { backupApplicationService, type ImportPreparation } from '../services/index.ts';
import './BackupPanel.css';

export function BackupPanel() {
  const [prepared, setPrepared] = useState<ImportPreparation | null>(null);
  const [message, setMessage] = useState('');

  const exportBackup = () => {
    try {
      const blob = new Blob([backupApplicationService.export()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compass-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('バックアップを端末へ保存しました。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '書き出しに失敗しました。'); }
  };

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPrepared(null);
    if (!file) return;
    const result = backupApplicationService.prepareImport(await file.text());
    setPrepared(result);
    setMessage(result.ok ? '全resourceの検証が完了しました。確認するまで現在のデータは変更されません。' : result.error);
    event.target.value = '';
  };

  const restore = () => {
    if (!prepared?.ok) return;
    try {
      backupApplicationService.restore(prepared);
      setPrepared(null);
      setMessage('全データを置き換えました。表示へ反映するためページを再読み込みします。');
      globalThis.location.reload();
    } catch { setMessage('復元に失敗したため、復元前のデータへロールバックしました。'); }
  };

  return <section className="backup-panel">
    <h2>バックアップと復元</h2>
    <p><strong>重要:</strong> バックアップには記録・睡眠・地域・理解などの個人情報が含まれます。安全な場所に保管してください。</p>
    <p>ファイルはこの端末内だけで作成・検証され、外部サーバーへ送信されません。復元は現在の対象データをすべて置き換えます（結合は行いません）。</p>
    <div className="backup-actions">
      <button type="button" onClick={exportBackup}>バックアップを書き出す</button>
      <label className="backup-file">バックアップを選択<input type="file" accept="application/json,.json" onChange={selectFile} /></label>
    </div>
    {message && <p role="status">{message}</p>}
    {prepared?.ok && <div className="backup-confirm">
      <p>{prepared.envelope.exportedAt} のバックアップ（{prepared.envelope.resources.length} resource）で全置換しますか？</p>
      <button type="button" onClick={restore}>確認して復元する</button>
      <button type="button" onClick={() => { setPrepared(null); setMessage('復元をキャンセルしました。'); }}>キャンセル</button>
    </div>}
  </section>;
}
