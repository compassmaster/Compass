import type { UnderstandingCandidateAnswer, UnderstandingCandidateId } from './understandingCandidate.ts';
import type { UnderstandingId, UnderstandingObject } from './understandingObject.ts';

export type UnderstandingHistoryEventId = string & { readonly __brand: 'UnderstandingHistoryEventId' };
interface BaseEvent { readonly id: UnderstandingHistoryEventId; readonly occurredAt: string; }
export interface CandidateResponseChangedEvent extends BaseEvent { readonly type: 'CANDIDATE_RESPONSE_CHANGED'; readonly candidateId: UnderstandingCandidateId; readonly candidateTitle: string; readonly candidateStatement: string; readonly previousAnswer: UnderstandingCandidateAnswer | null; readonly answer: UnderstandingCandidateAnswer; }
export interface UnderstandingCreatedEvent extends BaseEvent { readonly type: 'UNDERSTANDING_CREATED'; readonly candidateId: UnderstandingCandidateId; readonly understandingId: UnderstandingId; readonly after: UnderstandingObject; readonly reason: 'USER_AGREED'; }
export interface UnderstandingUpdatedEvent extends BaseEvent { readonly type: 'UNDERSTANDING_UPDATED'; readonly candidateId: UnderstandingCandidateId; readonly understandingId: UnderstandingId; readonly before: UnderstandingObject; readonly after: UnderstandingObject; readonly reason: 'EVIDENCE_CHANGED' | 'CANDIDATE_CHANGED'; }
export interface UnderstandingRemovedEvent extends BaseEvent { readonly type: 'UNDERSTANDING_REMOVED'; readonly candidateId: UnderstandingCandidateId; readonly understandingId: UnderstandingId; readonly before: UnderstandingObject; readonly reason: 'USER_RESPONSE_CHANGED'; }
export type UnderstandingHistoryEvent = CandidateResponseChangedEvent | UnderstandingCreatedEvent | UnderstandingUpdatedEvent | UnderstandingRemovedEvent;
export interface UnderstandingHistoryEnvelope { readonly schemaVersion: 1; readonly records: UnderstandingHistoryEvent[]; }

export function createUnderstandingHistoryEventId(type: UnderstandingHistoryEvent['type'], subjectId: string, occurredAt: string): UnderstandingHistoryEventId {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}-${Date.now()}`;
  return `${occurredAt}:${type}:${subjectId}:${random}` as UnderstandingHistoryEventId;
}
