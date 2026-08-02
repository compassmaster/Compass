import type { CaptureCandidate } from '../types/captureCandidate.ts';

export type CaptureCommitRequestGuard = { candidateId: string | null; requestIssued: boolean };
export const emptyCaptureCommitRequestGuard = (): CaptureCommitRequestGuard => ({ candidateId: null, requestIssued: false });

export function synchronizeCaptureCommitRequestGuard(
  guard: CaptureCommitRequestGuard,
  candidate: CaptureCandidate | null,
): CaptureCommitRequestGuard {
  if (!candidate || candidate.id !== guard.candidateId || candidate.status !== 'COMMITTING') {
    return emptyCaptureCommitRequestGuard();
  }
  return guard;
}

export function recordCaptureCommitRequest(candidateId: string): CaptureCommitRequestGuard {
  return { candidateId, requestIssued: true };
}
