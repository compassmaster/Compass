import { useState } from 'react';
import type { DateString } from '../../daily-log/types/log.ts';
import { dailyContextQueryService } from '../services/index.ts';
import './DailyContextPanel.css';

function localToday(timezone: string): DateString {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}` as DateString;
}

function daysBefore(date: DateString, days: number): DateString {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day - days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}` as DateString;
}

function value(value: number | null | undefined, unit = ''): string { return value === null || value === undefined ? '—' : `${value}${unit}`; }

function loadRecentContexts(timezone: string) {
  const endDate = localToday(timezone);
  return dailyContextQueryService.listByDateRange({ startDate: daysBefore(endDate, 6), endDate, timezone })
    .filter((item) => item.metadata.completeness !== 'EMPTY')
    .reverse();
}

export function DailyContextPanel() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [contexts, setContexts] = useState(() => loadRecentContexts(timezone));

  return <section className="home-section daily-context-panel">
    <p className="section-eyebrow">Daily Context / 読み取り専用</p>
    <h2 className="section-title">直近7日の記録と取得時点の予報</h2>
    <p className="home-description">各保存元をローカル日付（{timezone}）で結合しています。予報は当日の実測値ではありません。</p>
    <button className="daily-context-refresh" type="button" onClick={() => setContexts(loadRecentContexts(timezone))}>表示を更新</button>
    {contexts.length === 0 ? <p className="empty-text">直近7日に結合して表示できる記録はありません。</p> : <div className="daily-context-list">
      {contexts.map((context) => <article className="daily-context-card" key={context.localDate}>
        <header><strong>{context.localDate}</strong><span className={`context-status context-${context.metadata.completeness.toLowerCase()}`}>{context.metadata.completeness}</span></header>
        <div><b>DailyLog {context.metadata.dailyLogCount}件</b>{context.dailyLogs.length === 0 ? <span> —</span> : <ul>{context.dailyLogs.map((log, index) => <li key={log.id}>記録{index + 1}: 気分 {log.mood} / 疲労 {log.fatigue}</li>)}</ul>}</div>
        <p><b>睡眠:</b> {context.sleepRecord ? value(context.sleepRecord.durationMinutes, '分') : '—'}{context.metadata.sleepRecordCandidateCount > 1 && `（候補 ${context.metadata.sleepRecordCandidateCount}件から最新を表示）`}</p>
        <div><b>取得時点の予報:</b> {context.forecast ? <>
          <span> 最低 {value(context.forecast.forecastValues.dailyMinimumTemperature?.value, '℃')} / 最高 {value(context.forecast.forecastValues.dailyMaximumTemperature?.value, '℃')} / 降水確率 {value(context.forecast.forecastValues.precipitationProbability?.value, '%')}</span>
          <span className="forecast-meta">availability: {context.forecast.availability.status} / 取得: {context.forecast.source.fetchedAt}</span>
          {context.forecast.availability.status === 'UNAVAILABLE' && <span className="forecast-meta">欠損理由: {context.forecast.availability.reason}</span>}
        </> : <span> —</span>}</div>
      </article>)}
    </div>}
  </section>;
}
