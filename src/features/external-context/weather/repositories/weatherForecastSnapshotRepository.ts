import type { WeatherForecastSnapshot, WeatherForecastSnapshotId } from '../types/index.ts';

export interface WeatherForecastSnapshotRepository {
  save(snapshot: WeatherForecastSnapshot): void;
  findById(id: WeatherForecastSnapshotId): WeatherForecastSnapshot | null;
  findByTargetDate(localDate: string, timezone?: string): readonly WeatherForecastSnapshot[];
  findAll(): readonly WeatherForecastSnapshot[];
  deleteAll(): void;
}
