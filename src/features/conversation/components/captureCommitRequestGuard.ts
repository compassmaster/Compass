import type { CaptureCandidate } from '../types/captureCandidate.ts';

export type CaptureCommitRequestGuard = { candidateId: string | null; consentedAt: string | null; requestIssued: boolean };
export const emptyCaptureCommitRequestGuard = (): CaptureCommitRequestGuard => ({ candidateId: null, consentedAt: null, requestIssued: false });

export function synchronizeCaptureCommitRequestGuard(
  guard: CaptureCommitRequestGuard,
  candidate: CaptureCandidate | null,
): CaptureCommitRequestGuard {
  if (!candidate || candidate.id !== guard.candidateId || candidate.status !== 'COMMITTING' || candidate.updatedAt !== guard.consentedAt) {
    return emptyCaptureCommitRequestGuard();
  }
  return guard;
}

export function recordCaptureCommitRequest(candidateId: string, consentedAt: string): CaptureCommitRequestGuard {
  return { candidateId, consentedAt, requestIssued: true };
}
