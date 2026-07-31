import { isUnderstandingCandidateAnswer } from '../types/understandingCandidate.ts';
import type { UnderstandingHistoryEnvelope, UnderstandingHistoryEvent } from '../types/understandingHistory.ts';
import { isUnderstandingObject } from '../types/understandingObject.ts';
import type { IUnderstandingHistoryRepository } from './understandingHistoryRepository.ts';

export const UNDERSTANDING_HISTORY_STORAGE_KEY = 'compass_understanding_history_v1';
const clone = <T>(value: T): T => structuredClone(value);
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const iso = (value: unknown): value is string => text(value) && Number.isFinite(Date.parse(value));

export function isUnderstandingHistoryEvent(value: unknown): value is UnderstandingHistoryEvent {
  if (!record(value) || !text(value.id) || !iso(value.occurredAt) || !text(value.candidateId)) return false;
  if (value.type === 'CANDIDATE_RESPONSE_CHANGED') return text(value.candidateTitle) && text(value.candidateStatement)
    && (value.previousAnswer === null || (typeof value.previousAnswer === 'string' && isUnderstandingCandidateAnswer(value.previousAnswer)))
    && typeof value.answer === 'string' && isUnderstandingCandidateAnswer(value.answer);
  if (!text(value.understandingId)) return false;
  if (value.type === 'UNDERSTANDING_CREATED') return value.reason === 'USER_AGREED' && isUnderstandingObject(value.after);
  if (value.type === 'UNDERSTANDING_UPDATED') return ['EVIDENCE_CHANGED', 'CANDIDATE_CHANGED'].includes(String(value.reason)) && isUnderstandingObject(value.before) && isUnderstandingObject(value.after);
  if (value.type === 'UNDERSTANDING_REMOVED') return value.reason === 'USER_RESPONSE_CHANGED' && isUnderstandingObject(value.before);
  return false;
}
export function isUnderstandingHistoryEnvelope(value: unknown): value is UnderstandingHistoryEnvelope {
  return record(value) && value.schemaVersion === 1 && Array.isArray(value.records) && value.records.every(isUnderstandingHistoryEvent);
}
export function sortUnderstandingHistory(a: UnderstandingHistoryEvent, b: UnderstandingHistoryEvent): number { return b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id); }

export class LocalStorageUnderstandingHistoryRepository implements IUnderstandingHistoryRepository {
  private readonly storage: Storage;
  constructor(storage: Storage = localStorage) { this.storage = storage; }
  append(event: UnderstandingHistoryEvent): void { if (!isUnderstandingHistoryEvent(event)) return; const records = this.load(); if (records.some((item) => item.id === event.id)) return; this.persist([...records, clone(event)]); }
  list(): UnderstandingHistoryEvent[] { return clone(this.load().sort(sortUnderstandingHistory)); }
  clear(): void { this.persist([]); }
  private load(): UnderstandingHistoryEvent[] { try { const raw = this.storage.getItem(UNDERSTANDING_HISTORY_STORAGE_KEY); if (!raw) return []; const parsed: unknown = JSON.parse(raw); return isUnderstandingHistoryEnvelope(parsed) ? clone(parsed.records) : []; } catch { return []; } }
  private persist(records: UnderstandingHistoryEvent[]): void { const envelope: UnderstandingHistoryEnvelope = { schemaVersion: 1, records: clone(records).sort(sortUnderstandingHistory) }; this.storage.setItem(UNDERSTANDING_HISTORY_STORAGE_KEY, JSON.stringify(envelope)); }
}
