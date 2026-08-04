import type { WeatherDataAvailability, WeatherMissingReason } from '../../external-context/weather/types/weather.ts';

export const formatDate = (localDate: string): string => {
  const [year, month, day] = localDate.split('-').map(Number);
  return `${year}年${month}月${day}日`;
};

export const formatInstant = (instant: string, timeZone: string): string => new Intl.DateTimeFormat('ja-JP', {
  timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(instant));

export const formatTime = (instant: string, timeZone: string): string => new Intl.DateTimeFormat('ja-JP', {
  timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(instant));

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return `${hours > 0 ? `${hours}時間` : ''}${remainder > 0 ? `${remainder}分` : ''}` || '0分';
};

export const availabilityLabel = (availability: WeatherDataAvailability): string => ({
  AVAILABLE: 'データあり', PARTIAL: '一部欠損', UNAVAILABLE: '利用不可',
})[availability.status];

export const missingReasonLabel = (reason: WeatherMissingReason): string => ({
  PROVIDER_VALUE_MISSING: '提供元で一部の値を取得できませんでした',
  API_REQUEST_FAILED: '天気データの取得に失敗しました',
  LOCATION_NOT_CONFIGURED: '場所が設定されていません',
  LOCATION_UNAVAILABLE: '場所を確認できませんでした',
  OUT_OF_PROVIDER_RANGE: '天気データの提供期間外です',
  NOT_YET_OBSERVED: 'まだ観測されていません',
})[reason];
