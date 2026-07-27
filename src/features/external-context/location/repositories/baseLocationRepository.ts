import type { BaseLocation } from '../types/index.ts';
export interface BaseLocationRepository { get(): BaseLocation | null; save(location: BaseLocation): void; delete(): void }
