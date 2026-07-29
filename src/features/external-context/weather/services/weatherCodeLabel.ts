/** WMO Weather interpretation codeを、画面表示用の日本語へ変換する。 */
export function getWeatherCodeLabel(code: number | null): string {
  if (code === null) return '天気情報なし';
  const labels: Readonly<Record<number, string>> = {
    0: '快晴', 1: '晴れ', 2: '一部くもり', 3: 'くもり',
    45: '霧', 48: '着氷性の霧',
    51: '弱い霧雨', 53: '霧雨', 55: '強い霧雨', 56: '弱い着氷性の霧雨', 57: '強い着氷性の霧雨',
    61: '弱い雨', 63: '雨', 65: '強い雨', 66: '弱い着氷性の雨', 67: '強い着氷性の雨',
    71: '弱い雪', 73: '雪', 75: '強い雪', 77: '霧雪',
    80: '弱いにわか雨', 81: 'にわか雨', 82: '激しいにわか雨',
    85: '弱いにわか雪', 86: '強いにわか雪',
    95: '雷雨', 96: '弱い雹を伴う雷雨', 99: '強い雹を伴う雷雨',
  };
  return labels[code] ?? `不明な天気（コード: ${code}）`;
}

/** WMO codes representing rain, drizzle, freezing rain, rain showers, or thunderstorms. */
export function isRainWeatherCode(code: number | null): boolean {
  return code !== null && ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99] as readonly number[]).includes(code);
}

/** IANA timezoneを利用者向けの名称へ変換し、未知値も技術値だと分かる形で表示する。 */
export function getTimezoneLabel(timezone: string): string {
  return timezone === 'Asia/Tokyo' ? '日本標準時' : `タイムゾーン: ${timezone}`;
}
