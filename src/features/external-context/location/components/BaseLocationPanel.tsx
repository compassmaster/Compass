import { useState } from 'react';
import { baseLocationApplicationService, parseBaseLocationFormInput } from '../services/index.ts';
import './BaseLocationPanel.css';

const empty = { displayName: '', municipality: '', countryCode: '', timezone: '', latitude: '', longitude: '' };

export function BaseLocationPanel() {
  const existing = baseLocationApplicationService.getBaseLocation();
  const [form, setForm] = useState(existing ? { displayName: existing.displayName, municipality: existing.municipality,
    countryCode: existing.countryCode, timezone: existing.timezone, latitude: String(existing.coordinates.latitude), longitude: String(existing.coordinates.longitude) } : empty);
  const [configured, setConfigured] = useState(existing !== null);
  const [message, setMessage] = useState(existing ? '設定済みです。' : 'まだ設定されていません。');
  const [error, setError] = useState('');
  const change = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));
  const save = () => {
    setError('');
    try {
      baseLocationApplicationService.setBaseLocation(parseBaseLocationFormInput(form));
      setConfigured(true); setMessage('Base Locationを保存しました。');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存できませんでした。'); }
  };
  const remove = () => {
    if (!window.confirm('Base Locationを削除しますか？ 過去のWeather記録は変更されません。')) return;
    baseLocationApplicationService.deleteBaseLocation(); setForm(empty); setConfigured(false); setError(''); setMessage('Base Locationを削除しました。');
  };
  return <section className="home-section base-location-panel">
    <p className="section-eyebrow">External Context / Base Location</p><h2 className="section-title">天気情報取得のための地域設定</h2>
    <p className="home-description">通常使う地域を1件、あなたの確認後に保存します。現在地の自動取得や常時位置追跡は行わず、詳細住所も必要ありません。</p>
    <p className={configured ? 'base-location-status configured' : 'base-location-status'}>{message}</p>
    <div className="base-location-grid">
      <label>表示名<input value={form.displayName} onChange={(e) => change('displayName', e.target.value)} placeholder="例: 普段過ごす地域" /></label>
      <label>市区町村<input value={form.municipality} onChange={(e) => change('municipality', e.target.value)} /></label>
      <label>国コード<input value={form.countryCode} onChange={(e) => change('countryCode', e.target.value)} placeholder="例: JP" /></label>
      <label>timezone<input value={form.timezone} onChange={(e) => change('timezone', e.target.value)} placeholder="例: Asia/Tokyo" /></label>
      <label>latitude<input type="number" step="any" value={form.latitude} onChange={(e) => change('latitude', e.target.value)} /></label>
      <label>longitude<input type="number" step="any" value={form.longitude} onChange={(e) => change('longitude', e.target.value)} /></label>
    </div>{error && <p className="base-location-error" role="alert">{error}</p>}
    <div className="base-location-actions"><button type="button" onClick={save}>保存する</button>{configured && <button type="button" className="delete" onClick={remove}>削除する</button>}</div>
  </section>;
}
