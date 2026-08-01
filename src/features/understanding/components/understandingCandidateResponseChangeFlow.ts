import type { UnderstandingCandidateAnswer } from '../types/understandingCandidate.ts';

export type ResponseChangeFlowState =
  | { step: 'VIEWING' }
  | { step: 'EDITING'; currentAnswer: UnderstandingCandidateAnswer; draftAnswer: UnderstandingCandidateAnswer }
  | { step: 'CONFIRMING'; currentAnswer: UnderstandingCandidateAnswer; draftAnswer: UnderstandingCandidateAnswer };

export const viewResponse = (): ResponseChangeFlowState => ({ step: 'VIEWING' });

export const beginResponseChange = (currentAnswer: UnderstandingCandidateAnswer): ResponseChangeFlowState => ({
  step: 'EDITING', currentAnswer, draftAnswer: currentAnswer,
});

export function selectDraftResponse(state: ResponseChangeFlowState, answer: UnderstandingCandidateAnswer): ResponseChangeFlowState {
  return state.step === 'EDITING' ? { ...state, draftAnswer: answer } : state;
}

export function requestResponseChangeConfirmation(state: ResponseChangeFlowState): ResponseChangeFlowState {
  if (state.step !== 'EDITING' || state.draftAnswer === state.currentAnswer) return state;
  return { ...state, step: 'CONFIRMING' };
}

export function returnToResponseSelection(state: ResponseChangeFlowState): ResponseChangeFlowState {
  return state.step === 'CONFIRMING' ? { ...state, step: 'EDITING' } : state;
}

export function confirmedResponse(state: ResponseChangeFlowState): UnderstandingCandidateAnswer | null {
  return state.step === 'CONFIRMING' ? state.draftAnswer : null;
}
