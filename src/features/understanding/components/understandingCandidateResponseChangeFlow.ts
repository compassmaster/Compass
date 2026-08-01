import type { UnderstandingCandidateAnswer } from '../types/understandingCandidate.ts';

export type ResponseChangeFlowState =
  | { step: 'VIEWING' }
  | { step: 'EDITING'; currentAnswer: UnderstandingCandidateAnswer; draftAnswer: UnderstandingCandidateAnswer }
  | { step: 'CONFIRMING'; currentAnswer: UnderstandingCandidateAnswer; draftAnswer: UnderstandingCandidateAnswer }
  | { step: 'SUBMITTING'; currentAnswer: UnderstandingCandidateAnswer; draftAnswer: UnderstandingCandidateAnswer };

export type ResponseChangeFlowEvent =
  | { type: 'BEGIN'; currentAnswer: UnderstandingCandidateAnswer }
  | { type: 'SELECT'; answer: UnderstandingCandidateAnswer }
  | { type: 'SAVE' }
  | { type: 'SELECT_AGAIN' }
  | { type: 'CANCEL' }
  | { type: 'CONFIRM' };

export interface ResponseChangeFlowTransition {
  state: ResponseChangeFlowState;
  confirmedAnswer: UnderstandingCandidateAnswer | null;
}

export const viewResponse = (): ResponseChangeFlowState => ({ step: 'VIEWING' });

export function transitionResponseChange(
  state: ResponseChangeFlowState,
  event: ResponseChangeFlowEvent,
): ResponseChangeFlowTransition {
  if (event.type === 'BEGIN' && state.step === 'VIEWING') {
    return {
      state: { step: 'EDITING', currentAnswer: event.currentAnswer, draftAnswer: event.currentAnswer },
      confirmedAnswer: null,
    };
  }
  if (event.type === 'SELECT' && state.step === 'EDITING') {
    return { state: { ...state, draftAnswer: event.answer }, confirmedAnswer: null };
  }
  if (event.type === 'SAVE' && state.step === 'EDITING' && state.draftAnswer !== state.currentAnswer) {
    return { state: { ...state, step: 'CONFIRMING' }, confirmedAnswer: null };
  }
  if (event.type === 'SELECT_AGAIN' && state.step === 'CONFIRMING') {
    return { state: { ...state, step: 'EDITING' }, confirmedAnswer: null };
  }
  if (event.type === 'CANCEL') return { state: viewResponse(), confirmedAnswer: null };
  if (event.type === 'CONFIRM' && state.step === 'CONFIRMING') {
    return { state: { ...state, step: 'SUBMITTING' }, confirmedAnswer: state.draftAnswer };
  }
  return { state, confirmedAnswer: null };
}

export function describeResponseChange(
  currentAnswer: UnderstandingCandidateAnswer,
  draftAnswer: UnderstandingCandidateAnswer,
): string {
  if (currentAnswer !== 'AGREE' && draftAnswer === 'AGREE') {
    return 'この回答に変更すると、この候補から理解が現在の理解として作成される可能性があります。';
  }
  if (currentAnswer === 'AGREE' && draftAnswer !== 'AGREE') {
    return 'この回答に変更すると、この候補から作られた理解が現在の理解から外れます。過去の履歴は削除されません。';
  }
  return '現在の理解への反映状態は変わりません。回答の変更は履歴に記録されます。';
}
