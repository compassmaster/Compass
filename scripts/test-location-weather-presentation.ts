import assert from 'node:assert/strict';
import { findJapaneseRegionOption, JAPANESE_REGION_OPTIONS } from '../src/features/external-context/location/services/japaneseRegionOptions.ts';
import { parseBaseLocationFormInput } from '../src/features/external-context/location/services/baseLocationFormInput.ts';
import { getTimezoneLabel, getWeatherCodeLabel } from '../src/features/external-context/weather/services/weatherCodeLabel.ts';

assert.ok(JAPANESE_REGION_OPTIONS.length >= 10, '国内の代表地域を十分な数から選べる');
assert.equal(new Set(JAPANESE_REGION_OPTIONS.map((option) => option.id)).size, JAPANESE_REGION_OPTIONS.length);

for (const option of JAPANESE_REGION_OPTIONS) {
  assert.equal(option.formInput.countryCode, 'JP');
  assert.equal(option.formInput.timezone, 'Asia/Tokyo');
  assert.doesNotThrow(() => parseBaseLocationFormInput(option.formInput));
}

const tokyo = findJapaneseRegionOption('tokyo');
assert.equal(tokyo?.label, '東京都心');
const sasebo = findJapaneseRegionOption('sasebo');
assert.deepEqual(sasebo, {
  id: 'sasebo',
  label: '佐世保市',
  formInput: { displayName: '佐世保市', municipality: '佐世保市', countryCode: 'JP', timezone: 'Asia/Tokyo', latitude: '33.1799', longitude: '129.7151' },
});
assert.equal(findJapaneseRegionOption('not-configured'), null);

assert.equal(getWeatherCodeLabel(0), '快晴');
assert.equal(getWeatherCodeLabel(3), 'くもり');
assert.equal(getWeatherCodeLabel(61), '弱い雨');
assert.equal(getWeatherCodeLabel(75), '強い雪');
assert.equal(getWeatherCodeLabel(95), '雷雨');
assert.equal(getWeatherCodeLabel(null), '天気情報なし');
assert.equal(getWeatherCodeLabel(42), '不明な天気（コード: 42）');
assert.equal(getTimezoneLabel('Asia/Tokyo'), '日本標準時');
assert.equal(getTimezoneLabel('Europe/London'), 'タイムゾーン: Europe/London');

console.log('location/weather presentation tests passed');
