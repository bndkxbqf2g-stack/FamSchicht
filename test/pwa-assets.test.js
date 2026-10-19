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
  assert.match(html, /src="\.\/src\/auth-ui\.js\?v=0\.3\.22"/);
  assert.match(html, /src="\.\/src\/household-ui\.js\?v=0\.3\.22"/);
  assert.match(html, /src="\.\/src\/main\.js\?v=0\.3\.22"/);
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const install = fs.readFileSync(path.join(root, 'src', 'pwa-install.js'), 'utf8');
  assert.match(main, /pwaInstallMarkup/);
  assert.match(main, /id="pwa-install"/);
  assert.match(main, /import\('\.\/shift-roster-ocr\.js'\)/);
  assert.doesNotMatch(main, /import \{recognizeRosterImages\}/);
  assert.match(install, /beforeinstallprompt/);
  assert.match(install, /Zum Home-Bildschirm/);
});

test('visible application version matches the current cache-bust release', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(main, /Familienplaner · v0\.3\.22/);
});

test('release metadata stays aligned across the app shell', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const serviceWorker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');
  assert.equal(packageJson.version, '0.3.22');
  assert.match(html, new RegExp('\\?v=' + packageJson.version, 'g'));
  assert.match(main, new RegExp('Familienplaner · v' + packageJson.version));
  assert.match(serviceWorker, new RegExp('famschicht-shell-v' + packageJson.version));
});

test('app shell exposes keyboard navigation and account dialog semantics', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /class="skip-link" href="#app"/);
  assert.match(html, /id="account-shell" role="dialog" aria-modal="true"/);
  assert.match(html, /<main id="app" tabindex="-1" aria-label="Familienkalender">/);
});

test('startup failures keep technical details out of the visible shell', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /console\.warn\('FamSchicht-Laufzeitfehler:',message\)/);
  assert.match(html, /detail\.textContent='Die App konnte nicht geladen werden\. Bitte erneut laden\.'/);
  assert.doesNotMatch(html, /detail\.textContent='Startfehler: '\+message/);
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
  assert.match(main, /dataTransferStatus = userError\(error, 'Die JSON-Sicherung konnte nicht importiert werden\.'/);
  assert.match(main, /dataTransferStatus = userError\(error, 'Die ICS-Datei konnte nicht importiert werden\.'/);
  assert.match(main, /holidayStatus = userError\(error, 'Die Feiertagsauswahl konnte nicht gespeichert werden\.'/);
  assert.match(main, /displayStatus = userError\(error, 'Die Darstellung konnte nicht gespeichert werden\.'/);
  assert.match(main, /rewardStatus = userError\(error, 'Belohnung konnte nicht gespeichert werden\.'/);
  assert.doesNotMatch(main, /(?:dataTransferStatus|holidayStatus|displayStatus|rewardStatus) = error\.message \|\|/);
  assert.match(main, /restoreDialogFocus/);
  assert.match(main, /function updateEntry\(item\)[\s\S]+const reopenShift = item\.type === 'shift'[\s\S]+focusAfterRender\('#shift-edit-form \[name="date"\]'\)[\s\S]+restoreDialogFocus\(\)/);
  assert.match(main, /async function saveEntry\(item, afterSave, afterError\)[\s\S]+afterError\?\.\(\);[\s\S]+showAppNotice\([\s\S]+restoreDialogFocus\(\)/);
  assert.match(main, /closeDayDialog/);
  assert.match(main, /app\.setAttribute\('aria-hidden'/);
  assert.match(main, /app\.setAttribute\('inert'/);
  assert.match(storage, /loadState/);
  assert.match(main, /write-error/);
});

test('entry deletion uses an accessible in-app confirmation dialog', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(main, /function openDeleteDialog\(id/);
  assert.match(main, /id="delete-dialog-form"/);
  assert.match(main, /aria-describedby="delete-dialog-description"/);
  assert.match(main, /data-remove-date/);
  assert.match(main, /h\(e\.title \+ ' löschen'\)/);
  assert.match(main, /h\(entry\.title \+ ' löschen'\)/);
  assert.doesNotMatch(main, /if \(!confirm\('Eintrag löschen\?'\)\)/);
});

test('all destructive and import confirmations use the shared modal contract', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(main, /function openConfirmationDialog\(/);
  assert.match(main, /id="confirmation-dialog-form"/);
  assert.match(main, /const dialogOpen = Boolean\([^\n]*confirmationDialog/);
  assert.match(html, /id="confirmation-root"/);
  assert.match(main, /confirmationRoot\.innerHTML/);
  assert.match(main, /document\.querySelector\('#confirmation-dialog-form'\)/);
  assert.match(main, /onConfirm: \(\) =>/);
  assert.doesNotMatch(main, /\bconfirm\(/);
});

test('modal shells expose descriptions and retain focus while busy', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(html, /id="account-shell"[^>]*aria-describedby="account-description"/);
  assert.match(main, /id="day-dialog"[^>]*aria-describedby="day-dialog-description"/);
  assert.match(main, /id="move-dialog"[^>]*aria-describedby="move-dialog-description"/);
  assert.match(main, /id="shift-dialog"[^>]*aria-describedby="shift-dialog-description"/);
  assert.match(main, /id="confirmation-dialog"[^>]*aria-busy="' \+ busy \+ '"/);
  assert.match(main, /id="delete-dialog"[^>]*aria-busy="' \+ busy \+ '"/);
  assert.match(main, /document\.querySelector\('#confirmation-dialog'\)\?\.focus\(\)/);
  assert.match(main, /document\.querySelector\('#delete-dialog'\)\?\.focus\(\)/);
});

test('dialog focus restoration survives rerendered trigger nodes', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(main, /function rememberDialogFocus\(element\)/);
  assert.match(main, /function resolveDialogFocus\(target\)/);
  assert.match(main, /const returnTarget = dialogReturnFocus/);
  assert.match(main, /resolveDialogFocus\(returnTarget\)/);
  assert.match(main, /dialogReturnFocus = rememberDialogFocus\(element\)/);
  assert.match(main, /dialogReturnFocus = rememberDialogFocus\(trigger\)/);
});

test('calendar days expose semantic keyboard targets', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.match(main, /data-day-select/);
  assert.match(main, /aria-current="date"/);
  assert.match(main, /selectCalendarDay/);
  assert.match(styles, /\.day-select:focus-visible/);
});

test('mobile month cards show full-text entries and one-line shift names', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  const fullTextStyles = styles.slice(styles.lastIndexOf('/* Full-text monthly calendar:'));
  assert.match(main, /class="day-weekday" aria-hidden="true"/);
  assert.match(fullTextStyles, /\.calendar\.month-view \.day\{[\s\S]+height:auto;[\s\S]+overflow:visible/);
  assert.match(fullTextStyles, /\.calendar\.month-view \.entry\{[\s\S]+height:auto !important[\s\S]+white-space:normal !important[\s\S]+overflow:visible !important/);
  assert.match(fullTextStyles, /\.calendar\.month-view \.entry-label\{[\s\S]+white-space:normal !important[\s\S]+overflow-wrap:anywhere/);
  assert.match(fullTextStyles, /\.calendar\.month-view \.entry-time\{[\s\S]+display:block !important/);
  assert.match(fullTextStyles, /\.calendar\.month-view\{[\s\S]+grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(fullTextStyles, /\.calendar\.month-view > \.day\.empty\{display:none\}/);
  assert.match(fullTextStyles, /\.calendar\.month-view \.entry\.shift \.entry-label\{[\s\S]+white-space:nowrap !important[\s\S]+overflow:visible !important[\s\S]+overflow-wrap:normal !important[\s\S]+word-break:normal !important[\s\S]+text-overflow:clip !important/);
  assert.doesNotMatch(fullTextStyles, /\.calendar\.month-view \.entry\{[\s\S]+overflow-x:auto/);
  assert.doesNotMatch(fullTextStyles, /\.calendar\.month-view \.entry\.shift \.entry-label\{[^}]*text-overflow:ellipsis/);
  assert.doesNotMatch(main, /entry\.matches\('\.calendar\.month-view \.entry'\)/);
  assert.doesNotMatch(main, /entry\.scrollWidth > entry\.clientWidth/);
  assert.match(main, /const mobileMonthGrid = calendarMode === 'month' && window\.innerWidth <= 700/);
  assert.match(main, /offset = mobileMonthGrid \? -2 : -7/);
  assert.match(main, /offset = mobileMonthGrid \? 2 : 7/);
});
test('calendar day targets provide roving keyboard navigation', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(main, /aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"/);
  assert.match(main, /tabindex="' \+ \(day === dateKey\(focusedDate\) \? '0' : '-1'\)/);
  assert.match(main, /function moveCalendarDayByKeyboard\(event\)/);
  assert.match(main, /key === 'ArrowUp'/);
  assert.match(main, /key === 'ArrowDown'/);
  assert.match(main, /key === 'Home'/);
  assert.match(main, /key === 'End'/);
  assert.match(main, /const boundaryKey = key === 'Home' \|\| key === 'End'/);
  assert.match(main, /if \(!offset && !boundaryKey\) return/);
  assert.match(main, /event\.preventDefault\(\);\s+if \(!offset\) return/);
  assert.match(main, /selectCalendarDay\(dateKey\(date\), \{restoreFocus: true\}\)/);
});

test('calendar rerenders preserve a meaningful keyboard context', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(main, /id="view-title" tabindex="-1"/);
  assert.match(main, /const fallback = \(\) => view === 'settings'[\s\S]+document\.querySelector\('#view-title'\) \|\| document\.querySelector\('#app'\)/);
  assert.match(main, /function focusAfterRender\(selector, \{preventScroll = false, scrollPosition = null\} = \{\}\)/);
  assert.match(main, /function focusDatasetControl\(attribute, value\)/);
  assert.match(main, /element\?\.closest\('details'\)\?\.setAttribute\('open', ''\)/);
  assert.match(main, /function focusViewHeading\(\)/);
  assert.match(main, /focusAfterRender\('#prev'\)/);
  assert.match(main, /focusAfterRender\('#next'\)/);
  assert.match(main, /focusDatasetControl\('data-calendar-mode'/);
  assert.match(main, /focusDatasetControl\('data-person-filter'/);
  assert.match(main, /focusDatasetControl\('data-category-filter'/);
});

test('shift capture rerenders preserve a meaningful keyboard context', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(main, /if \(view === 'shift'\) \{\s+startShiftCapture\(\);\s+\} else \{\s+render\(\);\s+focusViewHeading\(\);/);
  assert.match(main, /function startShiftCapture\(\)[\s\S]+render\(\);\s+focusAfterRender\('#capture-date'\)/);
  assert.match(main, /data-owner[\s\S]+focusDatasetControl\('data-owner'/);
  assert.match(main, /shiftConflict = \{choice, conflicts\};\s+render\(\);\s+focusAfterRender\('\[data-shift-confirm="save"\]'\)/);
  assert.match(main, /button\.onclick = event => handleShiftChoice\(button\.dataset\.shift, \{\s+preserveFocus: event\.detail === 0,/);
  assert.match(main, /function handleShiftChoice\(choice, \{skipCollision = false, preserveFocus = true\} = \{\}\)/);
  assert.match(main, /if \(!preserveFocus\) document\.activeElement\?\.blur\?\.\(\);/);
  assert.match(main, /function advanceShiftCapture\(\{renderNow = true, scrollPosition = null, preserveFocus = true\} = \{\}\)[\s\S]+if \(preserveFocus\) \{\s+focusAfterRender\(focusSelector, \{preventScroll: true, scrollPosition\}\)/);
  assert.match(main, /function readScrollPosition\(\)[\s\S]+return \{x: window\.scrollX, y: window\.scrollY\}/);
  assert.match(main, /function restoreScrollPosition\(position\)[\s\S]+const restore = \(\) => window\.scrollTo\(position\.x, position\.y\);[\s\S]+requestAnimationFrame\?\.\(restore\)/);
  assert.match(main, /const shiftCaptureScroll = readScrollPosition\(\);\s+if \(!preserveFocus\) document\.activeElement\?\.blur\?\.\(\);\s+shiftSavePending = true;\s+render\(\);\s+restoreScrollPosition\(shiftCaptureScroll\)/);
  assert.match(main, /const focusSelector = advanceShiftCapture\(\{renderNow: false\}\);\s+return \{\s+focusSelector: preserveFocus \? focusSelector : null,\s+skipFocus: !preserveFocus,\s+scrollPosition: shiftCaptureScroll,/);
  assert.match(main, /const afterSaveResult = afterSave\?\.\(\);[\s\S]+restoreScrollPosition\(afterSaveResult\?\.scrollPosition\)/);
  assert.match(main, /if \(afterSaveResult\?\.skipFocus\) return;/);
  assert.match(main, /const afterSaveFocus = typeof afterSaveResult === 'string'[\s\S]+focusAfterRender\(afterSaveFocus, \{[\s\S]+scrollPosition: afterSaveResult\?\.scrollPosition \|\| null,[\s\S]+\}\)/);
  assert.match(main, /function focusAfterRender\(selector, \{preventScroll = false, scrollPosition = null\} = \{\}\)[\s\S]+const preservedScroll = scrollPosition \|\| \(preventScroll \? readScrollPosition\(\) : null\)[\s\S]+focus\(preventScroll \? \{preventScroll: true\} : undefined\)/);
});

test('settings and import rerenders preserve a meaningful keyboard context', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(main, /function focusFirstAfterRender\(\.\.\.selectors\)/);
  assert.match(main, /shiftSeriesStatus = `Vorlage[\s\S]+render\(\);\s+focusAfterRender\('#shift-template-save'\)/);
  assert.match(main, /shiftTargetStatus = 'Sollstunden wurden auf diesem Gerät gespeichert\.';\s+render\(\);\s+focusAfterRender\('#shift-targets-form button\[type="submit"\]'\)/);
  assert.match(main, /function handleRosterFilesChange[\s\S]+focusAfterRender\('#roster-progress'\)[\s\S]+focusFirstAfterRender\('#roster-review-form \[name="month"\]', '#roster-upload'\)/);
  assert.match(main, /dataTransferStatus = 'JSON-Sicherung wurde heruntergeladen\.';\s+render\(\);\s+focusAfterRender\('#export-json'\)/);
  assert.match(main, /dataTransferStatus = `\$\{exportEntries.length\} Einträge wurden als ICS exportiert\.`;\s+render\(\);\s+focusAfterRender\('#export-ics'\)/);
  assert.match(main, /function handleHolidaySettingsSubmit[\s\S]+focusAfterRender\('#holiday-settings-form button\[type="submit"\]'\)/);
  assert.match(main, /function handleDisplaySettingsSubmit[\s\S]+const focusSelector = isWallMode\(displayMode\) && view === 'all'[\s\S]+focusAfterRender\(focusSelector\)/);
  assert.match(main, /function handleRewardSubmit[\s\S]+focusAfterRender\('#reward-form \[name="title"\]'\)/);
  assert.match(main, /id="roster-progress" role="status" tabindex="-1"/);
  assert.match(main, /function focusAfterRender\(selector, \{preventScroll = false, scrollPosition = null\} = \{\}\)[\s\S]+element\?\.closest\('details'\)\?\.setAttribute\('open', ''\)/);
  assert.match(main, /focusDatasetControl\('data-shift-target', input\.dataset\.shiftTarget\)/);
  assert.match(main, /function handleCustodySubmit[\s\S]+focusAfterRender\('#custody-submit'\)/);
  assert.match(main, /function handleDayDialogSubmit[\s\S]+focusAfterRender\('#day-dialog-form \[name="endDate"\]'\)/);
});

test('household actions preserve focus across async owner refreshes', () => {
  const household = fs.readFileSync(path.join(root, 'src', 'household-ui.js'), 'utf8');
  assert.match(household, /function focusHouseholdControl\(selector\)/);
  assert.match(household, /safeRefresh\(user\)\.then\(\(\) => focusHouseholdControl\('#household-members-form button\[type="submit"\]'\)\)/);
  assert.match(household, /safeRefresh\(user\)\.then\(\(\) => focusHouseholdControl\('#household-member-add-form \[name="name"\]'\)\)/);
  assert.match(household, /resultBox\.querySelector\('\.invitation-link'\)\?\.focus\(\)/);
  assert.match(household, /form\.querySelector\('\[name="email"\]'\)\?\.focus\(\)/);
});

test('non-submit navigation controls declare their button type', () => {
  const auth = fs.readFileSync(path.join(root, 'src', 'auth-ui.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  assert.match(auth, /id="logout" type="button"/);
  assert.match(main, /<button type="button" id="prev"/);
  assert.match(main, /<button type="button" id="next"/);
  assert.match(main, /<button type="button" data-calendar-mode=/);
  assert.match(main, /<button type="button" data-person-filter=/);
  assert.match(main, /<button type="button" data-category-filter=/);
  assert.match(main, /<button type="button" data-view=/);
  assert.match(main, /<button type="button" data-owner=/);
});

test('all rendered button markup declares explicit submit semantics', () => {
  const sources = [
    fs.readFileSync(path.join(root, 'src', 'auth-ui.js'), 'utf8'),
    fs.readFileSync(path.join(root, 'src', 'household-ui.js'), 'utf8'),
    fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8'),
  ];
  for (const source of sources) assert.doesNotMatch(source, /<button(?![^>]*\btype=)[^>]*>/);
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

test('invitation acceptance can retry without duplicating an in-flight request', () => {
  const auth = fs.readFileSync(path.join(root, 'src', 'auth-ui.js'), 'utf8');
  assert.match(auth, /let inviteRequestInFlight = false/);
  assert.match(auth, /inviteRequestInFlight = true/);
  assert.match(auth, /inviteRequestInFlight = false/);
  assert.match(auth, /id="retry-invitation"/);
  assert.match(auth, /Erneut versuchen/);
  assert.match(auth, /inviteHandled = true/);
});

test('household database errors stay user-safe in the settings UI', () => {
  const household = fs.readFileSync(path.join(root, 'src', 'household-ui.js'), 'utf8');
  assert.match(household, /function setHouseholdMessage\(element, text, kind = 'status'\)/);
  assert.match(household, /function invitationErrorMessage\(context, error, fallback\)/);
  assert.match(household, /kind === 'error' \? 'alert' : 'status'/);
  assert.match(household, /Datenbank derzeit nicht erreichbar\. Der lokale Kalender bleibt verfügbar\./);
  assert.match(household, /Privater Haushalt konnte derzeit nicht erstellt werden\. Bitte später erneut versuchen\./);
  assert.match(household, /reportHouseholdError/);
  assert.match(household, /focusHouseholdControl\('#household-form \[name="name"\]'\)/);
  assert.match(household, /focusHouseholdControl\('#household-member-add-form \[name="name"\]'\)/);
  assert.doesNotMatch(household, /setHouseholdMessage\(messageEl, error\.message\s*\|\|/);
  assert.doesNotMatch(household, /Datenbank derzeit nicht erreichbar:\s*'\s*\+\s*error\.message/);
  assert.doesNotMatch(household, /Erstellung fehlgeschlagen:\s*'\s*\+\s*(?:insertError|error)\.message/);
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
  assert.match(main, /name="date" type="date" required autofocus/);
});

test('roster upload advertises and enforces the supported image and PDF boundary', () => {
  const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
  const ocr = fs.readFileSync(path.join(root, 'src', 'shift-roster-ocr.js'), 'utf8');
  const pdf = fs.readFileSync(path.join(root, 'src', 'shift-roster-pdf.js'), 'utf8');
  assert.match(main, /accept="\.jpg,\.jpeg,\.png,\.pdf,image\/jpeg,image\/png,application\/pdf"/);
  assert.match(main, /validateRosterFiles/);
  assert.match(ocr, /validateRosterFiles\(files\)/);
  assert.match(ocr, /isUsablePdfTextPage/);
  assert.match(pdf, /reading-pdf/);
  assert.match(pdf, /rendering-pdf/);
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
  assert.match(source, /famschicht-shell-v0.3.22/);
  assert.match(source, /networkFirst/);
  assert.match(source, /index\.html/);
  assert.match(source, /status: 503/);
});
