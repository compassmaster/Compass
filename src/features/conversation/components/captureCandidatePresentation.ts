import type { CaptureCandidate } from '../types/captureCandidate.ts';
const statusLabels = { PROPOSED: '保存候補・未保存', EDITING: '編集中', READY: '確認済み・未保存', COMMITTING: '操作無効・保存処理待ち', FAILED: '保存に失敗しました', COMMITTED: '保存済み', REJECTED: '却下済み', CANCELLED: '取消済み' } as const;
export function presentCaptureCandidateReview(candidate: CaptureCandidate) {
  return { statusLabel: statusLabels[candidate.status], isUnsaved: !['COMMITTED', 'REJECTED', 'CANCELLED'].includes(candidate.status), saveAllowed: candidate.status === 'READY' && candidate.sensitivity === 'NON_SENSITIVE', controlsDisabled: candidate.status === 'COMMITTING', fatigueHelp: '疲労は高いほど疲れている', originLabel: '本人が明示した値' };
}
