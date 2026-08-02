import assert from 'node:assert/strict';
import { DailyLogApplicationService } from '../src/features/daily-log/services/dailyLogApplicationService.ts';
import type { ILogRepository } from '../src/features/daily-log/services/logRepository.ts';
import type { DailyLog, DateString, EntryId } from '../src/features/daily-log/types/log.ts';
import { DailyLogCaptureCommitAdapter } from '../src/features/conversation/application/dailyLogCaptureCommitAdapter.ts';
import { LocalStorageLogRepository } from '../src/features/daily-log/services/localStorageLogRepository.ts';
import type { CaptureCommitRequest } from '../src/features/conversation/types/captureCandidate.ts';

class MemoryRepository implements ILogRepository {
  logs: DailyLog[]=[]; fail=false;
  getAll(){return this.logs} getByDate(d:DateString){return this.logs.filter(x=>x.date===d)} getById(id:EntryId){return this.logs.find(x=>x.id===id)??null}
  getByRange(f:DateString,t:DateString){return this.logs.filter(x=>x.date>=f&&x.date<=t)} save(x:DailyLog){if(this.fail)throw Error('secret');this.logs.push(x)} update(x:DailyLog){this.logs[this.logs.findIndex(y=>y.id===x.id)]=x} delete(id:EntryId){this.logs=this.logs.filter(x=>x.id!==id)} exportAll(){return JSON.stringify(this.logs)} importAll(v:string){this.logs=JSON.parse(v)}
}
const storedAt='2026-08-02T12:00:00.000Z'; const repo=new MemoryRepository();
const service=new DailyLogApplicationService(repo,()=>storedAt,()=> 'record-1' as EntryId);
const base={mood:4 as const,fatigue:2 as const,sleepHours:null,note:'note',events:['event']};
assert.equal(service.saveDailyLogForDate({date:'bad' as DateString,draft:base}).ok,false);
assert.equal(service.saveDailyLogForDate({date:'2026-07-30' as DateString,draft:base}).ok,true);
assert.equal(service.saveDailyLogForDate({date:'2026-07-30' as DateString,draft:base}).ok,true,'same-day records are allowed');
assert.equal(service.saveDailyLogForDate({date:'2026-07-30' as DateString,draft:{...base,sleepHours:7.5}}).ok,true,'legacy numeric sleepHours remains valid');
for(const sleepHours of [Number.NaN,Number.POSITIVE_INFINITY,'7'] as unknown[]) assert.equal(service.saveDailyLogForDate({date:'2026-07-30' as DateString,draft:{...base,sleepHours} as never}).ok,false,'invalid sleepHours');
assert.equal(repo.logs[0].date,'2026-07-30'); assert.equal(repo.logs[0].createdAt,storedAt); assert.equal(repo.logs[0].id,'record-1');
const request:CaptureCommitRequest={candidateId:'candidate-1' as never,destinationType:'DAILY_LOG',targetDate:'2026-07-29' as DateString,payload:{date:'2026-07-29' as DateString,mood:{value:5,origin:'USER_EXPLICIT'},fatigue:{value:3,origin:'USER_EXPLICIT'},note:'captured note',events:['work']},purpose:'record',sourceMessageId:'message-1',sourceExcerpt:'記録して',conversationOccurredAt:'2026-07-29T09:00:00.000Z',extraction:{method:'USER_STRUCTURED_INPUT',version:'1'},sensitivity:'NON_SENSITIVE',consentedAt:'2026-08-02T11:00:00.000Z'};
const adapter=new DailyLogCaptureCommitAdapter(service,()=>storedAt); const outcome=adapter.commit(request); assert.equal(outcome.ok,true);
const saved=repo.logs.at(-1)!; assert.equal(saved.date,'2026-07-29'); assert.equal(saved.sleepHours,null); assert.equal(saved.note,'captured note'); assert.deepEqual(saved.events,['work']);
assert.deepEqual(saved.captureProvenance,{source:'CONVERSATION_CAPTURE',capturedAt:request.conversationOccurredAt,consentedAt:request.consentedAt,extraction:{method:'USER_STRUCTURED_INPUT',version:'1'},sourceExcerpt:'記録して'});
request.payload.events.push('mutation'); request.extraction.version='changed'; assert.deepEqual(saved.events,['work']); assert.equal(saved.captureProvenance!.extraction.version,'1');
assert.equal(adapter.commit({...request,consentedAt:'invalid'}).ok,false); assert.equal(adapter.commit({...request,sensitivity:'SENSITIVE_REQUIRES_SEPARATE_CONSENT'}).ok,false); assert.equal(adapter.commit({...request,payload:{...request.payload,mood:{value:5,origin:'COMPASS_INFERRED'}}}).ok,false);
const applicationFailure=adapter.commit({...request,targetDate:'invalid' as DateString,payload:{...request.payload,date:'invalid' as DateString}});assert.equal(applicationFailure.ok,false);if(!applicationFailure.ok)assert.equal(applicationFailure.failure.retryable,false,'Application validation failures are not retryable');
for(const invalid of [
 {...request,destinationType:'OTHER'}, {...request,payload:{...request.payload,fatigue:{value:3,origin:'UNSPECIFIED'}}},
 {...request,payload:{...request.payload,date:'2026-07-28'}}, {...request,extraction:{method:'DETERMINISTIC_RULE',version:'1'}},
 {...request,extraction:{method:'USER_STRUCTURED_INPUT',version:''}}, {...request,sourceExcerpt:' '}, {...request,conversationOccurredAt:'bad'},
] as unknown as CaptureCommitRequest[]) assert.equal(adapter.commit(invalid).ok,false,'adapter mismatch is rejected');
repo.fail=true; const failure=adapter.commit({...request,extraction:{method:'USER_STRUCTURED_INPUT',version:'1'}}); assert.equal(failure.ok,false); if(!failure.ok){assert.equal(failure.failure.retryable,true);assert.doesNotMatch(failure.failure.message,/secret/)}
class Storage { value:string|null=null;getItem(){return this.value}setItem(_k:string,v:string){this.value=v}removeItem(){this.value=null} }
const storage=new Storage();Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});const local=new LocalStorageLogRepository();
const localLog=structuredClone(saved);local.save(localLog);localLog.captureProvenance!.extraction.version='mutated';assert.equal(local.getById(localLog.id)!.captureProvenance!.extraction.version,'1','save does not share provenance');
const fetched=local.getById(localLog.id)!;fetched.captureProvenance!.extraction.version='fetched mutation';assert.equal(local.getById(localLog.id)!.captureProvenance!.extraction.version,'1','get does not share provenance');
const localService=new DailyLogApplicationService(local,()=>storedAt,()=> 'unused' as EntryId);const updated=localService.updateDailyLog(localLog.id,{date:localLog.date,mood:3,fatigue:4,note:'updated',events:[]});assert.equal(updated.ok,true);if(updated.ok)assert.equal(updated.log.captureProvenance!.sourceExcerpt,'記録して','update preserves provenance');
assert.equal(localService.deleteDailyLog(localLog.id).ok,true);assert.equal(local.getAll().length,0,'delete removes record and dependent provenance');
console.log('daily log capture commit tests passed');
