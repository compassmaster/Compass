import type { BaseLocationFormInput } from './baseLocationFormInput.ts';

export interface JapaneseRegionOption {
  readonly id: string;
  readonly label: string;
  readonly formInput: BaseLocationFormInput;
}

const region = (id: string, municipality: string, latitude: number, longitude: number): JapaneseRegionOption => ({
  id,
  label: municipality,
  formInput: {
    displayName: municipality,
    municipality,
    countryCode: 'JP',
    timezone: 'Asia/Tokyo',
    latitude: String(latitude),
    longitude: String(longitude),
  },
});

/**
 * MVPで選択できる国内の代表地域。座標は市の中心付近に丸め、詳細住所を扱わない。
 * Domainは任意のBaseLocationを引き続き受け付け、選択肢はUIの関心事に留める。
 */
export const JAPANESE_REGION_OPTIONS: readonly JapaneseRegionOption[] = [
  region('sapporo', '札幌市', 43.062, 141.354),
  region('sendai', '仙台市', 38.268, 140.869),
  region('tokyo', '東京都心', 35.676, 139.65),
  region('yokohama', '横浜市', 35.444, 139.638),
  region('nagoya', '名古屋市', 35.181, 136.907),
  region('kanazawa', '金沢市', 36.561, 136.656),
  region('osaka', '大阪市', 34.694, 135.502),
  region('hiroshima', '広島市', 34.385, 132.455),
  region('takamatsu', '高松市', 34.342, 134.047),
  region('fukuoka', '福岡市', 33.59, 130.402),
  region('kagoshima', '鹿児島市', 31.596, 130.557),
  region('naha', '那覇市', 26.212, 127.681),
];

export function findJapaneseRegionOption(id: string): JapaneseRegionOption | null {
  return JAPANESE_REGION_OPTIONS.find((option) => option.id === id) ?? null;
}
