import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  describeResponseChange,
  transitionResponseChange,
  viewResponse,
  type ResponseChangeFlowEvent,
  type ResponseChangeFlowState,
} from '../src/features/understanding/components/understandingCandidateResponseChangeFlow.ts';
import type { UnderstandingCandidateAnswer } from '../src/features/understanding/types/understandingCandidate.ts';

let state: ResponseChangeFlowState = viewResponse();
const respondedAnswers: UnderstandingCandidateAnswer[] = [];
const dispatch = (event: ResponseChangeFlowEvent) => {
  const transition = transitionResponseChange(state, event);
  state = transition.state;
  if (transition.confirmedAnswer) respondedAnswers.push(transition.confirmedAnswer);
};

dispatch({ type: 'BEGIN', currentAnswer: 'AGREE' });
assert.equal(state.step, 'EDITING');
dispatch({ type: 'SAVE' });
assert.equal(state.step, 'EDITING', 'the unchanged answer cannot advance');
assert.equal(respondedAnswers.length, 0);
dispatch({ type: 'SELECT', answer: 'UNSURE' });
assert.equal(state.step, 'EDITING', 'selection is temporary');
assert.equal(respondedAnswers.length, 0, 'temporary selection must not call onRespond');
dispatch({ type: 'SAVE' });
assert.equal(state.step, 'CONFIRMING');
assert.equal(respondedAnswers.length, 0, 'save must not call onRespond');
dispatch({ type: 'SELECT_AGAIN' });
assert.equal(state.step, 'EDITING');
dispatch({ type: 'SAVE' });
dispatch({ type: 'CONFIRM' });
assert.equal(state.step, 'SUBMITTING');
assert.deepEqual(respondedAnswers, ['UNSURE'], 'confirmation calls onRespond exactly once');
dispatch({ type: 'CONFIRM' });
assert.deepEqual(respondedAnswers, ['UNSURE'], 'repeat confirmation cannot call onRespond again');

state = viewResponse();
dispatch({ type: 'BEGIN', currentAnswer: 'UNSURE' });
dispatch({ type: 'SELECT', answer: 'PARTIALLY_DISAGREE' });
dispatch({ type: 'SAVE' });
dispatch({ type: 'CANCEL' });
assert.equal(state.step, 'VIEWING');
assert.equal(respondedAnswers.length, 1, 'cancel must not call onRespond');

assert.match(describeResponseChange('UNSURE', 'AGREE'), /理解が作られ/);
assert.match(describeResponseChange('AGREE', 'UNSURE'), /理解が現在の理解から外れ/);
assert.match(describeResponseChange('UNSURE', 'PARTIALLY_DISAGREE'), /反映状態は変わりません/);

const panel = readFileSync(new URL('../src/features/understanding/components/UnderstandingCandidatePanel.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/features/understanding/components/UnderstandingCandidatePanel.css', import.meta.url), 'utf8');
assert.match(panel, /changeFlow\.step === 'VIEWING'/);
assert.match(panel, /key=\{`\$\{candidate\.id\}:\$\{response\?\.answer/, 'external response changes remount and discard edits');
assert.match(panel, /event\.key !== 'Escape'/);
assert.match(panel, /moveFocusAfterRender/);
assert.match(panel, />キャンセル</);
assert.match(panel, /aria-busy=\{isSubmitting\}/);
assert.doesNotMatch(panel, /window\.confirm|confirm\(/);
assert.match(css, /@media \(max-width: 360px\)/);
assert.match(css, /min-height: 44px/);

console.log('Understanding Candidate response UI tests passed');
