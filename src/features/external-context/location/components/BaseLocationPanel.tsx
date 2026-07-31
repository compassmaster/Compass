import { useState } from 'react';
import { baseLocationApplicationService, parseBaseLocationFormInput } from '../services/index.ts';
import { findJapaneseRegionOption, JAPANESE_REGION_OPTIONS } from '../services/japaneseRegionOptions.ts';
import './BaseLocationPanel.css';

const empty = { displayName: '', municipality: '', countryCode: '', timezone: '', latitude: '', longitude: '' };

interface BaseLocationPanelProps { readonly onSaved?: () => void }

export function BaseLocationPanel({ onSaved }: BaseLocationPanelProps) {
  const existing = baseLocationApplicationService.getBaseLocation();
  const [form, setForm] = useState(existing ? { displayName: existing.displayName, municipality: existing.municipality,
    countryCode: existing.countryCode, timezone: existing.timezone, latitude: String(existing.coordinates.latitude), longitude: String(existing.coordinates.longitude) } : empty);
  const [configured, setConfigured] = useState(existing !== null);
  const [message, setMessage] = useState(existing ? '設定済みです。' : 'まだ設定されていません。');
  const [error, setError] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState(() => JAPANESE_REGION_OPTIONS.find((option) => option.formInput.municipality === existing?.municipality)?.id ?? '');
  const selectRegion = (regionId: string) => {
    setSelectedRegionId(regionId);
    const selected = findJapaneseRegionOption(regionId);
    if (selected) setForm(selected.formInput);
  };
  const save = () => {
    setError('');
    try {
      baseLocationApplicationService.setBaseLocation(parseBaseLocationFormInput(form));
      setConfigured(true); setMessage('地域を保存しました。7日間の天気予報を取得します。'); onSaved?.();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存できませんでした。'); }
  };
  const remove = () => {
    if (!window.confirm('Base Locationを削除しますか？ 過去のWeather記録は変更されません。')) return;
    baseLocationApplicationService.deleteBaseLocation(); setForm(empty); setSelectedRegionId(''); setConfigured(false); setError(''); setMessage('地域設定を削除しました。'); onSaved?.();
  };
  return <section className="home-section base-location-panel">
    <p className="section-eyebrow">外部コンテキスト / 地域設定</p><h2 className="section-title">天気情報を取得する地域</h2>
    <p className="home-description">普段過ごす地域に近い代表地域を1件選んでください。市の中心付近の座標だけを保存し、現在地の自動取得や常時位置追跡、詳細住所の保存は行いません。</p>
    <p className={configured ? 'base-location-status configured' : 'base-location-status'}>{message}</p>
    <label className="base-location-select">地域
      <select value={selectedRegionId} onChange={(event) => selectRegion(event.target.value)}>
        <option value="">地域を選択してください</option>
        {JAPANESE_REGION_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
    {existing && selectedRegionId === '' && <p className="home-description">現在の設定「{existing.displayName}」は以前の入力形式で保存されています。変更する場合は上から地域を選択してください。</p>}
    {error && <p className="base-location-error" role="alert">{error}</p>}
    <div className="base-location-actions"><button type="button" onClick={save} disabled={!selectedRegionId && !existing}>地域を保存して予報を取得</button>{configured && <button type="button" className="delete" onClick={remove}>地域設定を削除</button>}</div>
  </section>;
}
