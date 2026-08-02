import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DailyLogApplicationService } from '../src/features/daily-log/services/dailyLogApplicationService.ts';
import type { ILogRepository } from '../src/features/daily-log/services/logRepository.ts';
import type { DailyLog, DateString, EntryId } from '../src/features/daily-log/types/log.ts';
import { dailyLogNavigationCommandIdentity, evaluateDailyLogNavigationCommand, resolveDailyLogNavigationTarget, type DailyLogNavigationTarget } from '../src/features/daily-log/types/navigation.ts';

const original = [log('b','2026-07-28','2026-07-28T09:00:00Z'), log('c','2026-07-29','2026-07-29T08:00:00Z'), log('a','2026-07-28','2026-07-28T10:00:00Z')];
original[2].captureProvenance = { source:'CONVERSATION_CAPTURE',capturedAt:'2026-07-28T09:59:00Z',consentedAt:'2026-07-28T10:00:00Z',extraction:{method:'USER_STRUCTURED_INPUT',version:'v1'},sourceExcerpt:'確認した範囲' };
const baseline = structuredClone(original);
const repository = memoryRepository(original);
const service = new DailyLogApplicationService(repository, () => '2026-07-30T12:00:00.000Z');
assert.deepEqual(service.listDailyLogs().map(x => x.id), ['c','a','b'], 'date then createdAt descending is deterministic');
assert.deepEqual(original, baseline, 'listing does not mutate repository-derived arrays or records');
const listed = service.listDailyLogs(); listed[0].events.push('mutation');
assert.deepEqual(original, baseline, 'returned logs are defensive copies');

const updateInput = { date:'2026-07-27' as DateString, mood:5 as const, fatigue:1 as const, note:'updated', events:[' work ',''] };
const inputBaseline = structuredClone(updateInput);
const updated = service.updateDailyLog('a' as EntryId, updateInput);
assert.equal(updated.ok, true);
if (updated.ok) {
  assert.equal(updated.log.id, 'a'); assert.equal(updated.log.createdAt, '2026-07-28T10:00:00Z'); assert.equal(updated.log.schemaVersion, 1);
  assert.equal(updated.log.updatedAt, '2026-07-30T12:00:00.000Z'); assert.equal(updated.log.date, '2026-07-27');
  assert.deepEqual(updated.log.events, ['work']); assert.equal(updated.log.sleepHours, 7, 'legacy sleepHours remains unchanged');
  assert.equal(updated.log.mood, 5, 'mood is updated');
  assert.equal(updated.log.fatigue, 1, 'fatigue is updated');
  assert.equal(updated.log.note, 'updated', 'note is updated');
  assert.deepEqual(updated.log.captureProvenance, baseline.find((log) => log.id === 'a')?.captureProvenance, 'update preserves CaptureProvenance');
}
assert.deepEqual(updateInput, inputBaseline, 'update input is unchanged');
const afterUpdate = service.listDailyLogs();
assert.deepEqual(afterUpdate.map((value) => value.id), ['c', 'b', 'a'], 'list is reloaded and reordered after changing the date');
assert.deepEqual(
  afterUpdate.find((value) => value.id === 'a'),
  updated.ok ? updated.log : null,
  'listDailyLogs returns the persisted update'
);
assert.deepEqual(service.updateDailyLog('a' as EntryId, { ...updateInput, date:'2026-02-30' as DateString }), { ok:false, reason:'INVALID_INPUT' });
assert.deepEqual(service.updateDailyLog('missing' as EntryId, updateInput), { ok:false, reason:'NOT_FOUND' });
assert.deepEqual(service.getDailyLog('missing' as EntryId), { ok:false, reason:'NOT_FOUND' });
assert.deepEqual(service.deleteDailyLog('missing' as EntryId), { ok:false, reason:'NOT_FOUND' });
assert.deepEqual(service.deleteDailyLog('b' as EntryId), { ok:true });
assert.equal(service.getDailyLog('b' as EntryId).ok, false, 'successful delete immediately changes the list source');

const navigationLogs = baseline;
const target = (recordId:string, action:DailyLogNavigationTarget['action']):DailyLogNavigationTarget => ({recordId:recordId as EntryId,action});
const view = resolveDailyLogNavigationTarget(navigationLogs,target('a','VIEW'));
assert.equal(view.kind,'VIEW'); if(view.kind==='VIEW') assert.equal(view.record.id,'a','VIEW resolves only the requested record');
const edit = resolveDailyLogNavigationTarget(navigationLogs,target('b','EDIT'));
assert.deepEqual(edit.kind==='EDIT' ? edit.editState : null,{id:'b',date:'2026-07-28',mood:3,fatigue:2,note:'note',events:'event'},'EDIT derives the correct state');
const deletion = resolveDailyLogNavigationTarget(navigationLogs,target('c','DELETE'));
assert.equal(deletion.kind,'DELETE'); if(deletion.kind==='DELETE') assert.equal(deletion.record.id,'c','DELETE confirms only the requested record');
assert.deepEqual(resolveDailyLogNavigationTarget(navigationLogs,target('missing','VIEW')),{kind:'NOT_FOUND'},'missing does not substitute another record');
assert.notEqual(dailyLogNavigationCommandIdentity(target('a','VIEW')),dailyLogNavigationCommandIdentity(target('a','EDIT')),'actions have distinct command identities');
let guard:string|null=null; let applied=0; let consumed=0;
for(let invocation=0;invocation<2;invocation++){const command=evaluateDailyLogNavigationCommand(guard,target('a','DELETE'));guard=command.nextIdentity;if(command.shouldHandle){applied++;consumed++;}}
assert.deepEqual({applied,consumed},{applied:1,consumed:1},'StrictMode-equivalent repeated effect handles and consumes once');
guard=evaluateDailyLogNavigationCommand(guard,null).nextIdentity;
assert.equal(evaluateDailyLogNavigationCommand(guard,target('a','DELETE')).shouldHandle,true,'null resets guard so a future identical command runs');

const ui = readFileSync('src/features/daily-log/components/DailyLogList.tsx','utf8');
const logTab = readFileSync('src/features/daily-log/components/LogTab.tsx','utf8');
const app = readFileSync('src/app/App.tsx','utf8');
assert.doesNotMatch(ui, /logRepository|localStorage/, 'DailyLog UI uses only the Application Service boundary');
assert.doesNotMatch(ui, /sleepHours/, 'sleepHours is not restored as an edit field');
assert.match(ui, /疲労は1=元気、5=とても疲れている/);
assert.match(ui, /過去に生成済みの分析結果は自動的に書き換わりません/);
assert.match(ui, /キャンセル/);
assert.match(logTab, /<DailyLogList revision=\{listRevision\} onChanged=\{onSaveSuccess\}/, 'edit/delete changes are connected to the parent reload callback');
for (const contract of [/navigationTarget/,/onNavigationTargetConsumed/,/onRecordChanged/,/role="alert"/,/firstEditFieldRef/,/deleteHeadingRef/,/recordRefs/]) assert.match(ui, contract);
assert.match(ui,/openDelete\(log\)/,'normal and target deletion share return-focus setup');
assert.match(ui,/deleteReturnRecordIdRef\.current = null/,'missing, success, and cancel clear stale return targets');
assert.match(ui,/daily-log-edit-heading-/,'editing article keeps a valid labelledby target');
assert.doesNotMatch(ui, /window\.location/, 'record navigation does not depend on window.location');
assert.doesNotMatch(app, /const refreshLogs = \(\) => \{[^}]*setActiveTab/s, 'parent reload keeps the current Record tab selected');
console.log('DailyLog management tests passed');

function log(id:string,date:string,createdAt:string): DailyLog { return { id:id as EntryId,date:date as DateString,createdAt,updatedAt:createdAt,schemaVersion:1,mood:3,fatigue:2,sleepHours:7,note:'note',events:['event'] }; }
function memoryRepository(records: DailyLog[]): ILogRepository {
 return { getAll:()=>records, getByDate:(date)=>records.filter(x=>x.date===date), getById:(id)=>records.find(x=>x.id===id)??null, getByRange:(from,to)=>records.filter(x=>x.date>=from&&x.date<=to), save:(value)=>{records.push(structuredClone(value));}, update:(value)=>{const i=records.findIndex(x=>x.id===value.id);if(i>=0)records[i]=structuredClone(value);}, delete:(id)=>{const i=records.findIndex(x=>x.id===id);if(i>=0)records.splice(i,1);}, exportAll:()=>JSON.stringify(records), importAll:()=>{} };
}
