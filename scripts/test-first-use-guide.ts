import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FirstUseGuideQueryService } from '../src/features/first-use-guide/services/firstUseGuideQueryService.ts';

type Presence = { location?: boolean; daily?: boolean; sleep?: boolean };
const query = ({ location = false, daily = false, sleep = false }: Presence) => {
  const writes: string[] = [];
  const dailyRecords = Object.freeze(daily ? [Object.freeze({ id: 'daily' })] : []);
  const sleepRecords = Object.freeze(sleep ? [Object.freeze({ id: 'sleep' })] : []);
  const service = new FirstUseGuideQueryService(
    { get: () => location ? Object.freeze({ id: 'location' }) : null, save: () => writes.push('location.save'), delete: () => writes.push('location.delete') } as never,
    { getAll: () => dailyRecords, save: () => writes.push('daily.save'), update: () => writes.push('daily.update'), delete: () => writes.push('daily.delete') } as never,
    { getAll: () => sleepRecords, save: () => writes.push('sleep.save'), update: () => { writes.push('sleep.update'); return true; }, delete: () => { writes.push('sleep.delete'); return true; } } as never,
  );
  const result = service.get();
  assert.deepEqual(writes, [], 'query must not write');
  assert.equal(dailyRecords.length, daily ? 1 : 0, 'repository array must remain unchanged');
  assert.equal(sleepRecords.length, sleep ? 1 : 0, 'repository array must remain unchanged');
  return result;
};

for (const [presence, count] of [
  [{}, 0], [{ location: true }, 1], [{ daily: true }, 1], [{ sleep: true }, 1],
  [{ location: true, daily: true }, 2], [{ location: true, daily: true, sleep: true }, 3],
] as const) {
  const model = query(presence);
  assert.equal(model.completedStepCount, count);
  assert.equal(model.isComplete, count === 3);
  assert.equal(model.steps.length, 3);
}

const component = readFileSync(new URL('../src/features/first-use-guide/components/FirstUseGuide.tsx', import.meta.url), 'utf8');
for (const text of ['Compassを始める', '完了', '未完了', '欠損値を推測せず', '基本準備が整いました']) assert.ok(component.includes(text));
const serviceSource = readFileSync(new URL('../src/features/first-use-guide/services/firstUseGuideQueryService.ts', import.meta.url), 'utf8');
for (const text of ['疲労は5段階で、高いほど疲れています', '睡眠は起床した日を基準に記録します', '通常地域は天気情報の取得に使います']) assert.ok(serviceSource.includes(text));
const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
for (const text of ['onFirstUseNavigate={handleFirstUseNavigate}', 'onFirstUseDataChanged={refreshFirstUseGuide}', 'onSleepChanged={refreshFirstUseGuide}', 'setFirstUseGuide(firstUseGuideQueryService.get())']) assert.ok(app.includes(text));

console.log('first-use-guide tests passed');
