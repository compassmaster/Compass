import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beginResponseChange, confirmedResponse, requestResponseChangeConfirmation, returnToResponseSelection, selectDraftResponse, viewResponse } from '../src/features/understanding/components/understandingCandidateResponseChangeFlow.ts';

let state = viewResponse();
assert.equal(confirmedResponse(state), null, 'viewing must not produce a response');
state = beginResponseChange('AGREE');
assert.equal(requestResponseChangeConfirmation(state).step, 'EDITING', 'unchanged selection cannot advance');
state = selectDraftResponse(state, 'UNSURE');
assert.equal(confirmedResponse(state), null, 'temporary selection must not produce a response');
state = requestResponseChangeConfirmation(state);
assert.equal(state.step, 'CONFIRMING', 'save advances to the testable confirmation UI');
assert.equal(confirmedResponse(state), 'UNSURE', 'only confirmed state exposes the changed answer');
state = returnToResponseSelection(state);
assert.equal(state.step, 'EDITING', 'the user can return and select again');

const panel = readFileSync(new URL('../src/features/understanding/components/UnderstandingCandidatePanel.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/features/understanding/components/UnderstandingCandidatePanel.css', import.meta.url), 'utf8');
for (const label of ['回答を変更する', '変更を保存', '回答の変更を確認', '選び直す', '変更する']) assert.match(panel, new RegExp(label));
assert.match(panel, /role="alertdialog"/);
assert.match(panel, /aria-labelledby=/);
assert.match(panel, /disabled=\{Boolean\(response\) && !isEditing\}/);
assert.doesNotMatch(panel, /window\.confirm|confirm\(/);
assert.match(css, /@media \(max-width: 360px\)/);
assert.match(css, /min-height: 44px/);

console.log('Understanding Candidate response UI tests passed');
