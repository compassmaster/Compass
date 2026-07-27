import type { BaseLocationInput } from './baseLocationFactory.ts';

export interface BaseLocationFormInput {
  readonly displayName: string;
  readonly municipality: string;
  readonly countryCode: string;
  readonly timezone: string;
  readonly latitude: string;
  readonly longitude: string;
}

/** UI文字列をDomain inputへ変換する。空欄を座標0として推測しない。 */
export function parseBaseLocationFormInput(input: BaseLocationFormInput): BaseLocationInput {
  const latitude = parseCoordinate(input.latitude, 'latitude');
  const longitude = parseCoordinate(input.longitude, 'longitude');
  return { ...input, latitude, longitude };
}

function parseCoordinate(value: string, field: 'latitude' | 'longitude'): number {
  if (value.trim().length === 0) throw new Error(`${field}を入力してください。`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field}には有限の数値を入力してください。`);
  return parsed;
}
