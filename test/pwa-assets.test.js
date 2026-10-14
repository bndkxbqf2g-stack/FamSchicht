import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('PWA manifest points at the installable FamSchicht shell', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public', 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.name, 'FamSchicht – Familienplaner');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.icons[0].src, './apple-touch-icon.png');
});

test('app viewport enables iPhone safe-area layout', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /name="viewport" content="[^"]*viewport-fit=cover/);
});

test('app shell exposes keyboard navigation and account dialog semantics', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /class="skip-link" href="#app"/);
  assert.match(html, /id="account-shell" role="dialog" aria-modal="true"/);
  assert.match(html, /<main id="app" tabindex="-1" aria-label="Familienkalender">/);
});

test('calendar cards keep edit and delete as separate interactive controls', () => {
  const source = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(source, /class="entry-edit"/);
  assert.match(source, /class="entry-remove"/);
  assert.match(source, /class="today-item-edit"/);
  assert.match(source, /class="today-item-remove"/);
  assert.match(source, /role="group" aria-label="Eintrag:/);
  assert.doesNotMatch(source, /data-edit="' \+ h\(e\.id\) \+ '" role="button"/);
  assert.doesNotMatch(source, /data-edit="' \+ h\(entry\.id\) \+ '" role="button"/);
});

test('calendar exposes touch and desktop move semantics', () => {
  const source = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(source, /data-move-id/);
  assert.match(source, /draggable="true"/);
  assert.match(source, /text\/famschicht-entry/);
  assert.match(source, /pointerdown/);
  assert.match(source, /calendar-hint/);
  assert.match(source, /data-move-open/);
  assert.match(source, /move-dialog-form/);
  assert.match(source, /moveCalendarEntry/);
});

test('external calendar imports keep a read-only source contract', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'src', 'calendar-sources.js'), 'utf8');
  assert.match(main, /mergeReadOnlyCalendarEvents/);
  assert.match(main, /read-only importiert/);
  assert.match(source, /calendarProviderCatalog/);
  assert.match(source, /same-external-id/);
  assert.match(main, /ics-import-member/);
  assert.match(main, /memberId: selectedMember/);
});

test('JSON backup restore is exposed next to the existing export', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'src', 'data-transfer.js'), 'utf8');
  assert.match(main, /import-json/);
  assert.match(main, /mergeJsonBackupEvents/);
  assert.match(source, /famschicht-json/);
  assert.match(source, /same-id/);
});

test('holiday settings expose a local read-only calendar source', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'src', 'holidays.js'), 'utf8');
  assert.match(main, /holiday-settings-form/);
  assert.match(main, /configuredHolidayEntries/);
  assert.match(source, /holiday-calendar/);
  assert.match(source, /germanHolidayEntries/);
});

test('display preferences expose a reversible read-only wall mode', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'src', 'display-preferences.js'), 'utf8');
  assert.match(main, /display-settings-form/);
  assert.match(main, /exit-wall-mode/);
  assert.match(main, /isWallMode/);
  assert.match(source, /Wandmodus/);
});

test('runtime errors remain visible and dialogs restore keyboard focus', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const storage = fs.readFileSync(path.join(root, 'src', 'storage.js'), 'utf8');
  assert.match(main, /id="app-notice"/);
  assert.match(main, /id="storage-notice"/);
  assert.match(main, /restoreDialogFocus/);
  assert.match(main, /closeDayDialog/);
  assert.match(main, /app\.setAttribute\('aria-hidden'/);
  assert.match(main, /app\.setAttribute\('inert'/);
  assert.match(storage, /loadState/);
  assert.match(main, /write-error/);
});

test('calendar days expose semantic keyboard targets', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.match(main, /data-day-select/);
  assert.match(main, /aria-current="date"/);
  assert.match(main, /selectCalendarDay/);
  assert.match(styles, /\.day-select:focus-visible/);
});

test('auth errors stay in an accessible non-blocking status message', () => {
  const auth = fs.readFileSync(path.join(root, 'src', 'auth-ui.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.doesNotMatch(auth, /\balert\(/);
  assert.match(auth, /setAuthMessage/);
  assert.match(auth, /role.*alert/);
  assert.match(auth, /Anmeldung derzeit nicht möglich\. Bitte später erneut versuchen\./);
  assert.match(styles, /\.auth-error/);
});

test('Supabase client reads only the intended build configuration', () => {
  const auth = fs.readFileSync(path.join(root, 'src', 'auth.js'), 'utf8');
  const runtime = fs.readFileSync(path.join(root, 'src', 'runtime-config.js'), 'utf8');
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'pages.yml'), 'utf8');
  const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.match(auth, /runtime-config\.js/);
  assert.match(auth, /supabaseConfig\.url/);
  assert.doesNotMatch(auth, /https:\/\/[^'"\s]+\.supabase\.co/);
  assert.doesNotMatch(auth, /sb_publishable_[A-Za-z0-9_-]{12,}/);
  assert.match(runtime, /VITE_SUPABASE_URL/);
  assert.match(runtime, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(workflow, /FAMSCHICHT_SUPABASE_URL/);
  assert.match(workflow, /FAMSCHICHT_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(example, /VITE_SUPABASE_URL=https:\/\/your-project-ref\.supabase\.co/);
  assert.match(example, /VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me/);
});

test('modal dialogs isolate the calendar background from keyboard focus', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.match(main, /id="app-content"/);
  assert.match(main, /appContent\.setAttribute\('aria-hidden'/);
  assert.match(main, /appContent\.setAttribute\('inert'/);
  assert.match(main, /skipLink\.setAttribute\('inert'/);
  assert.match(styles, /#app-content\{display:contents\}/);
});

test('modal dialogs keep Tab focus inside the active dialog', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(html, /id="account-shell"[^>]*tabindex="-1"/);
  assert.match(main, /event\.key === 'Tab'/);
  assert.match(main, /trapDialogFocus\(event\)/);
  assert.match(main, /dialog\.querySelectorAll\(/);
  assert.match(main, /event\.shiftKey/);
  assert.match(main, /tabindex="-1"/);
});

test('roster upload advertises and enforces the supported image boundary', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const ocr = fs.readFileSync(path.join(root, 'src', 'shift-roster-ocr.js'), 'utf8');
  assert.match(main, /accept="\.jpg,\.jpeg,\.png,image\/jpeg,image\/png"/);
  assert.match(main, /validateRosterFiles/);
  assert.match(ocr, /validateRosterFiles\(files\)/);
});

test('roster preview and storage share the date and service validation contract', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const storage = fs.readFileSync(path.join(root, 'src', 'shift-roster-storage.js'), 'utf8');
  assert.match(main, /validateRosterDraft/);
  assert.match(storage, /isRosterDateInMonth/);
  assert.match(storage, /parseRosterCell\(entry\.code\)/);
});

test('local points and rewards stay separate from the cloud calendar path', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const rewards = fs.readFileSync(path.join(root, 'src', 'rewards.js'), 'utf8');
  assert.match(main, /Punkte & Belohnungen/);
  assert.match(main, /reward-form/);
  assert.match(main, /pointsByMember/);
  assert.match(rewards, /famschicht-rewards-v1/);
  assert.match(rewards, /pointsForCompletedTask/);
  assert.doesNotMatch(rewards, /supabase|calendar_events/i);
});

test('service worker has a network-first cache fallback for the app shell', () => {
  const source = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');
  assert.match(source, /famschicht-shell-v1/);
  assert.match(source, /networkFirst/);
  assert.match(source, /index\.html/);
  assert.match(source, /status: 503/);
});

