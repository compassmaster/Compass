import assert from 'node:assert/strict';
import { LocalStorageUnderstandingHistoryRepository, UNDERSTANDING_HISTORY_STORAGE_KEY, isUnderstandingHistoryEnvelope, isUnderstandingHistoryEvent } from '../src/features/understanding/services/localStorageUnderstandingHistoryRepository.ts';
import { UnderstandingCandidateApplicationService } from '../src/features/understanding/services/understandingCandidateApplicationService.ts';
import { UnderstandingCandidateService } from '../src/features/understanding/services/understandingCandidateService.ts';
import { LocalStorageUnderstandingCandidateRepository } from '../src/features/understanding/services/localStorageUnderstandingCandidateRepository.ts';
import { LocalStorageUnderstandingCandidateResponseRepository } from '../src/features/understanding/services/localStorageUnderstandingCandidateResponseRepository.ts';
import type { UnderstandingCandidate, UnderstandingCandidateId } from '../src/features/understanding/types/understandingCandidate.ts';
import type { UnderstandingHistoryEvent } from '../src/features/understanding/types/understandingHistory.ts';
import type { UnderstandingObject } from '../src/features/understanding/types/understandingObject.ts';

class MemoryStorage implements Storage { private values=new Map<string,string>();get length(){return this.values.size}clear(){this.values.clear()}getItem(k:string){return this.values.get(k)??null}key(i:number){return [...this.values.keys()][i]??null}removeItem(k:string){this.values.delete(k)}setItem(k:string,v:string){this.values.set(k,v)} }
const storage=new MemoryStorage();
const history=new LocalStorageUnderstandingHistoryRepository(storage);
const candidates=new LocalStorageUnderstandingCandidateRepository(storage);
const responses=new LocalStorageUnderstandingCandidateResponseRepository(storage);
const candidate:UnderstandingCandidate={id:'candidate-1' as UnderstandingCandidateId,type:'SLEEP_FATIGUE_PATTERN',generatorId:'g',title:'睡眠',statement:'短い睡眠と疲労に関係があるかもしれません。',explanation:'根拠',evidenceIds:['e' as never],dedupeKey:'d',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'};
const object:UnderstandingObject={id:'understanding-1' as never,type:'SLEEP_FATIGUE_RELATIONSHIP',layer:'LONG_TERM',categories:['INTERNAL_STATE'],statement:candidate.statement,sourceCandidateIds:[candidate.id],evidenceIds:['e' as never],status:{maturity:'HYPOTHESIS',confidence:.5,evidenceCount:1,lastUpdatedAt:'2026-01-02T00:00:00Z',nextQuestions:[]},createdAt:'2026-01-02T00:00:00Z',updatedAt:'2026-01-02T00:00:00Z'};

candidates.save(candidate);
const app=new UnderstandingCandidateApplicationService(new UnderstandingCandidateService([]),candidates,responses,history);
const first=app.respond(candidate.id,'AGREE','2026-01-02T00:00:00Z');
assert.equal(first.action,'CREATED');
const firstEvent=history.list()[0];
assert.equal(firstEvent.type,'CANDIDATE_RESPONSE_CHANGED');
if(firstEvent.type==='CANDIDATE_RESPONSE_CHANGED'){assert.equal(firstEvent.previousAnswer,null);assert.equal(firstEvent.answer,'AGREE');assert.equal(firstEvent.candidateTitle,candidate.title);assert.equal(firstEvent.candidateStatement,candidate.statement)}
const rawBefore=storage.getItem(UNDERSTANDING_HISTORY_STORAGE_KEY);
const unchanged=app.respond(candidate.id,'AGREE','2026-01-03T00:00:00Z');
assert.equal(unchanged.action,'UNCHANGED');assert.equal(responses.list()[0].respondedAt,'2026-01-02T00:00:00Z');assert.equal(storage.getItem(UNDERSTANDING_HISTORY_STORAGE_KEY),rawBefore);
app.respond(candidate.id,'UNSURE','2026-01-04T00:00:00Z');
assert.equal(history.list().length,2);
const newest=history.list()[0];
if(newest.type==='CANDIDATE_RESPONSE_CHANGED'){assert.equal(newest.previousAnswer,'AGREE');assert.equal(newest.answer,'UNSURE')}

const sameTimeCreated:UnderstandingHistoryEvent={id:'z-event' as never,type:'UNDERSTANDING_CREATED',candidateId:candidate.id,understandingId:object.id,after:object,reason:'USER_AGREED',occurredAt:'2026-01-05T00:00:00Z'};
const sameTimeRemoved:UnderstandingHistoryEvent={id:'a-event' as never,type:'UNDERSTANDING_REMOVED',candidateId:candidate.id,understandingId:object.id,before:object,reason:'USER_RESPONSE_CHANGED',occurredAt:'2026-01-05T00:00:00Z'};
history.append(sameTimeRemoved);history.append(sameTimeCreated);
assert.deepEqual(history.list().slice(0,2).map((event)=>event.id),['z-event','a-event'],'同時刻はevent IDで決定的にtie-breakする');
(object as {statement:string}).statement='呼び出し側で変更';
const storedCreated=history.list().find((event)=>event.id==='z-event');assert.equal(storedCreated?.type==='UNDERSTANDING_CREATED'&&storedCreated.after.statement,candidate.statement,'append時にsnapshotを防御的コピーする');
const listed=history.list();if(listed[0].type==='UNDERSTANDING_CREATED')(listed[0].after as {statement:string}).statement='list結果を変更';
assert.equal((history.list()[0] as typeof sameTimeCreated).after.statement,candidate.statement,'list結果を防御的コピーする');
const countBeforeInvalid=history.list().length;history.append({...sameTimeRemoved,id:'invalid' as never,understandingId:'mismatch' as never});assert.equal(history.list().length,countBeforeInvalid,'不正eventを保存しない');
assert.equal(isUnderstandingHistoryEvent({...firstEvent,previousAnswer:'AGREE',answer:'AGREE'}),false,'同じ回答の変更eventを拒否する');
assert.equal(isUnderstandingHistoryEnvelope({schemaVersion:1,records:[sameTimeCreated,sameTimeCreated]}),false,'重複event IDを拒否する');
history.clear();assert.deepEqual(history.list(),[]);assert.deepEqual(JSON.parse(storage.getItem(UNDERSTANDING_HISTORY_STORAGE_KEY)!),{schemaVersion:1,records:[]});
storage.setItem(UNDERSTANDING_HISTORY_STORAGE_KEY,JSON.stringify({schemaVersion:1,records:[{bad:true}]}));assert.deepEqual(history.list(),[],'不正な保存データを読み込まない');
assert.equal(isUnderstandingHistoryEnvelope({schemaVersion:1,records:[]}),true);assert.equal(isUnderstandingHistoryEnvelope({schemaVersion:1,records:[],extra:true}),false,'envelopeの余分なfieldを拒否');
console.log('Understanding history tests passed');
