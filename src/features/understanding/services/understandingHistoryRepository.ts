import type { UnderstandingHistoryEvent } from '../types/understandingHistory.ts';
export interface IUnderstandingHistoryRepository { append(event: UnderstandingHistoryEvent): void; list(): UnderstandingHistoryEvent[]; clear(): void; }
