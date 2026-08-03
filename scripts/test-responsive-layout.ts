import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/app/App.tsx');
const appCss = read('../src/app/App.css');
const globalCss = read('../src/index.css');
const firstUseCss = read('../src/features/first-use-guide/components/FirstUseGuide.css');
const calendarCss = read('../src/features/calendar/components/CalendarTab.css');

for (const label of ['会話', 'ホーム', '記録', 'カレンダー', 'ふりかえり', '関係', '明日の見通し', 'Compass Map', 'バックアップ']) {
  assert.ok(app.includes(label), `navigation must retain ${label}`);
}
assert.equal((app.match(/aria-current=/g) ?? []).length, 9, 'every tab exposes its current-page state');
assert.match(app, /aria-label="主要画面"/);
assert.match(appCss, /@media \(max-width: 600px\)/);
assert.match(appCss, /\.app-nav\s*{[\s\S]*?flex-wrap:\s*nowrap/);
assert.match(appCss, /overflow-x:\s*auto/);
assert.match(appCss, /\.tab-button\s*{[\s\S]*?min-height:\s*44px/);
assert.match(appCss, /white-space:\s*nowrap/);
assert.match(globalCss, /\*,\s*\n\*::before,\s*\n\*::after[\s\S]*?box-sizing:\s*border-box/);
assert.match(globalCss, /color-scheme:\s*light/);
assert.match(globalCss, /button,[\s\S]*?min-height:\s*44px/);
assert.match(firstUseCss, /@media \(max-width: 600px\)[\s\S]*?\.first-use-steps\s*{\s*grid-template-columns:\s*1fr/);
assert.match(calendarCss, /@media \(max-width: 768px\)/, 'Calendar needs a tablet contract');
assert.match(calendarCss, /@media \(max-width: 600px\)/, 'Calendar needs a narrow contract');
assert.match(calendarCss, /@media \(max-width: 400px\)/, 'Calendar needs 360px and 390px contracts');
assert.match(calendarCss, /\.calendar-date-navigation[\s\S]*?grid-template-columns/, 'Calendar date navigation must reflow');

for (const stylesheet of [
  '../src/features/backup/components/BackupPanel.css',
  '../src/features/daily-log/components/LogTab.css',
  '../src/features/relationship-explorer/components/RelationshipExplorerTab.css',
  '../src/features/compass-map/components/MapTab.css',
  '../src/features/calendar/components/CalendarTab.css',
]) {
  assert.match(read(stylesheet), /@media \(max-width: (?:560|600)px\)/, `${stylesheet} needs a narrow layout contract`);
}

console.log('responsive-layout tests passed');
