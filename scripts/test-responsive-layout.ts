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
const narrowNavigation = appCss.match(/@media \(max-width: 600px\)\s*{([\s\S]*)$/)?.[1] ?? '';
assert.match(narrowNavigation, /\.app-nav\s*{[\s\S]*?display:\s*grid/);
assert.match(narrowNavigation, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, '360px and 390px navigation uses three equal columns');
assert.match(narrowNavigation, /\.app-nav\s*{[\s\S]*?overflow-x:\s*visible/, 'narrow navigation must not scroll horizontally');
assert.match(narrowNavigation, /\.tab-button\s*{[\s\S]*?width:\s*100%/);
assert.match(narrowNavigation, /\.tab-button\s*{[\s\S]*?white-space:\s*normal/, 'long labels remain fully visible by wrapping');
assert.match(appCss, /\.tab-button\s*{[\s\S]*?min-height:\s*44px/);
assert.match(appCss, /white-space:\s*nowrap/);
assert.match(appCss, /\.active-tab\s*{[\s\S]*?background-color:[\s\S]*?font-weight:\s*bold/, 'selected tab remains visually distinct');
assert.match(appCss, /\.tab-button:focus-visible\s*{[\s\S]*?outline:\s*3px/, 'keyboard focus remains visually distinct');
assert.match(globalCss, /\*,\s*\n\*::before,\s*\n\*::after[\s\S]*?box-sizing:\s*border-box/);
assert.match(globalCss, /color-scheme:\s*light/);
assert.match(globalCss, /button,[\s\S]*?min-height:\s*44px/);
assert.match(firstUseCss, /@media \(max-width: 600px\)[\s\S]*?\.first-use-steps\s*{\s*grid-template-columns:\s*1fr/);
assert.match(calendarCss, /@media \(max-width: 768px\)/, 'Calendar needs a tablet contract');
assert.match(calendarCss, /@media \(max-width: 600px\)/, 'Calendar needs a narrow contract');
assert.match(calendarCss, /@media \(max-width: 400px\)/, 'Calendar needs 360px and 390px contracts');
assert.match(calendarCss, /\.calendar-date-navigation[\s\S]*?grid-template-columns/, 'Calendar date navigation must reflow');
assert.match(calendarCss, /\.life-timeline-items\s*{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/, 'Life Timeline must stay one-column at desktop, 768px, 390px and 360px');
assert.match(calendarCss, /\.life-timeline-item-header\s*{[\s\S]*?flex-wrap:\s*wrap/, 'Life Timeline badges and metadata must reflow without overlap');
assert.match(calendarCss, /\.life-timeline-record-id\s*{[\s\S]*?overflow-wrap:\s*anywhere/, 'only long technical Record IDs may break anywhere');
assert.match(calendarCss, /\.life-timeline-technical summary\s*{[\s\S]*?min-height:\s*44px/, 'technical details need a sufficient touch target');
assert.match(calendarCss, /\.life-timeline-technical summary:focus-visible\s*{[\s\S]*?outline:/, 'technical details retain visible keyboard focus');
assert.match(calendarCss, /@media \(max-width: 768px\)[\s\S]*?\.life-timeline\s*{\s*max-width:\s*100%/, 'Life Timeline needs a 768px width boundary');
assert.match(calendarCss, /@media \(max-width: 400px\)[\s\S]*?\.life-timeline-item\s*{\s*min-width:\s*0/, 'Life Timeline needs explicit 360px and 390px shrink behavior');

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
