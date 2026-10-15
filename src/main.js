import {loadState, save} from './storage.js';
import {dateKey, SHIFT_NAMES, shiftTimes, nextShiftCaptureDate, changedShift} from './dates.js';
import {escapeHtml as h, canSee} from './security.js';
import {generateCustodyDates, missingCustodyDates} from './custody.js';
import {supabase} from './auth.js';
import {
  bootstrapHouseholdMembers,
  memberFilterOptions,
  memberInitials,
  memberNamesById,
  shiftEligibleMembers,
} from './household-members.js';
import {ensureOwnerHouseholdMembers} from './household-member-service.js';
import {
  compareAgendaItems,
  calendarDates,
  calendarTitle,
  entriesForDay,
  entryOccursOnDate,
  eventTimeLabel,
  filterCalendarEntries,
  visibleEntriesForDay,
  monthSummary,
  shiftCalendarDate,
  shiftOwnerDisplayName,
  shiftOwnerStyleKey,
  entryOwnerStyleKey,
} from './calendar-overview.js';
import {
  loadOwnerEvents,
  saveOwnerEvent,
  saveOwnerEvents,
  updateOwnerEvent,
  deleteOwnerEvent,
} from './calendar-service.js';
import {firstName, normalizeRosterName, parseRosterCell, shiftsOverlap} from './shift-roster.js';
import {extractBestRosterPage, mergeRosterPages, parseRosterMonth, parseRosterPeriod, parseRosterYear, validateRosterDraft, validateRosterFiles} from './shift-roster-import.js';
import {rosterImportErrorMessage} from './shift-roster-errors.js';
import {loadShiftRosters, replaceShiftRosterMonth, saveShiftRosters} from './shift-roster-storage.js';
import {
  importedRosterCalendarEntries as projectRosterEntries,
  suggestedRosterMemberId,
} from './shift-roster-calendar.js';
import {buildShiftSeries, findShiftConflicts, summarizeShiftMonth} from './shift-planning.js';
import {
  loadShiftTargets,
  normalizeShiftTargetHours,
  saveShiftTargets,
  shiftTargetDifference,
} from './shift-hours.js';
import {
  loadShiftTemplates,
  normalizeShiftTemplate,
  saveShiftTemplates,
  upsertShiftTemplate,
} from './shift-templates.js';
import {eventsToIcs, parseIcs} from './calendar-ics.js';
import {mergeJsonBackupEvents, parseJsonBackup} from './data-transfer.js';
import {
  createReadOnlyCalendarSource,
  isReadOnlyCalendarEntry,
  mergeReadOnlyCalendarEvents,
} from './calendar-sources.js';
import {
  germanHolidayEntries,
  holidayRegionLabel,
  holidayRegionOptions,
  loadHolidayRegion,
  saveHolidayRegion,
} from './holidays.js';
import {
  displayModeOptions,
  isWallMode,
  loadDisplayMode,
  saveDisplayMode,
} from './display-preferences.js';
import {
  isTaskCompletedOnDate,
  isTaskLikeEntry,
  setTaskOccurrenceCompleted,
  taskOccurrences,
  toggleTaskOccurrence,
} from './task-planning.js';
import {
  loadRewardState,
  normalizePoints,
  pointsByMember,
  removeReward,
  rewardProgress,
  saveRewardState,
  upsertReward,
} from './rewards.js';
import {syncStatusClass, syncStatusLabel} from './sync-status.js';
import {moveCalendarEntry} from './event-move.js';
import {getPwaInstallState, initPwaInstall, promptPwaInstall} from './pwa-install.js';
import {userError} from './user-error.js';
import './styles.css';

if ('serviceWorker' in navigator) {
  const appBase = import.meta.env.BASE_URL;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.location.reload();
  }, {once: true});

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${appBase}sw.js`, {
        scope: appBase,
        updateViaCache: 'none',
      });
      await registration.update();
    } catch (error) {
      console.warn('App-Updates konnten nicht aktiviert werden', error);
    }
  }, {once: true});
}

const initialLocalState = loadState();
let entries = initialLocalState.events;
let month = new Date();
let focusedDate = new Date();
let calendarMode = 'month';
let view = 'home';
let personFilter = 'all';
let categoryFilter = 'all';
let cloud = null;
let syncState = 'local';
let cloudConnectionId = 0;
let settingsReturnFocus = null;
let shiftCaptureDate = null;
let dayDialogDate = null;
let dayDialogEventId = null;
let shiftDialogEventId = null;
let moveDialog = null;
let deleteDialog = null;
let confirmationDialog = null;
let householdMembers = [...bootstrapHouseholdMembers];
let shiftMembers = shiftEligibleMembers(householdMembers);
let householdMemberNames = memberNamesById(householdMembers);
let shiftOwnerId = shiftMembers[0]?.id || '';
let shiftRosters = loadShiftRosters();
let shiftTemplates = loadShiftTemplates();
let shiftTargets = loadShiftTargets();
let holidayRegion = loadHolidayRegion();
let displayMode = loadDisplayMode();
const initialRewardState = loadRewardState();
let rewards = initialRewardState.rewards;
let rewardStorageStatus = initialRewardState.status;
let rewardStatus = '';
let icsSourceMemberId = '';
let rosterImport = null;
let rosterImportBusy = false;
let rosterImportError = '';
let rosterOcrModulePromise = null;
let shiftConflict = null;
let shiftSeriesStatus = '';
let shiftTargetStatus = '';
let dataTransferStatus = '';
let holidayStatus = '';
let displayStatus = '';
let localStorageStatus = initialLocalState.status;
let storageNoticeDismissed = false;
let appNotice = null;
let pwaState = getPwaInstallState();
let pwaInstallStatus = '';
let dialogReturnFocus = null;
let suppressMoveClickId = null;
let suppressMoveClickUntil = 0;

function applyHouseholdMembers(members) {
  householdMembers = members?.length
    ? [...members]
    : [...bootstrapHouseholdMembers];
  shiftMembers = shiftEligibleMembers(householdMembers);
  householdMemberNames = memberNamesById(householdMembers);
  if (!shiftMembers.some(member => member.id === shiftOwnerId)) {
    shiftOwnerId = shiftMembers[0]?.id || '';
  }
  if (personFilter !== 'all' &&
      !householdMembers.some(member => member.id === personFilter)) {
    personFilter = 'all';
  }
}

function openAccountSettings(trigger) {
  settingsReturnFocus = trigger || document.activeElement;
  view = 'settings';
  render();
  document.querySelector('#close-account-settings')?.focus();
}

function closeAccountSettings() {
  const focusSelector = settingsReturnFocus?.classList?.contains('mobile-settings')
    ? '#app .mobile-settings'
    : '#app .side-nav [data-view="settings"]';
  settingsReturnFocus = null;
  view = 'all';
  render();
  window.setTimeout(() => document.querySelector(focusSelector)?.focus(), 0);
}
month.setDate(1);

const app = document.querySelector('#app');

initPwaInstall(() => {
  pwaState = getPwaInstallState();
  if (pwaState.kind === 'installed') pwaInstallStatus = 'FamSchicht ist jetzt auf diesem Gerät installiert.';
  render();
});

function loadLocalEntries() {
  const state = loadState();
  localStorageStatus = state.status;
  storageNoticeDismissed = false;
  return state.events;
}

function saveLocalEntries(nextEntries) {
  try {
    save(nextEntries);
    localStorageStatus = 'loaded';
    storageNoticeDismissed = false;
  } catch (error) {
    localStorageStatus = 'write-error';
    storageNoticeDismissed = false;
    throw error;
  }
}

function showAppNotice(message, kind = 'error') {
  appNotice = {message: String(message || '').trim(), kind};
  render();
}

function closeDialogAndRestoreFocus(clearDialog) {
  clearDialog();
  render();
  restoreDialogFocus();
}

function rememberDialogFocus(element) {
  if (!element) return null;
  return {
    id: element.id || '',
    editId: element.dataset?.edit || '',
    moveOpenId: element.dataset?.moveOpen || '',
    removeId: element.dataset?.remove || '',
    removeDate: element.dataset?.removeDate || element.closest?.('[data-day]')?.dataset?.day || '',
    rewardRemoveId: element.dataset?.rewardRemove || '',
    taskNew: element.hasAttribute?.('data-task-new') || false,
  };
}

function resolveDialogFocus(target) {
  if (!target) return null;
  if (target.id) return document.getElementById(target.id);
  if (target.editId) {
    return [...document.querySelectorAll('[data-edit]')]
      .find(element => element.dataset.edit === target.editId) || null;
  }
  if (target.moveOpenId) {
    return [...document.querySelectorAll('[data-move-open]')]
      .find(element => element.dataset.moveOpen === target.moveOpenId) || null;
  }
  if (target.removeId) {
    return [...document.querySelectorAll('[data-remove]')]
      .find(element => element.dataset.remove === target.removeId) ||
      [...document.querySelectorAll('[data-edit]')]
        .find(element => element.dataset.edit === target.removeId) ||
      (target.removeDate
        ? [...document.querySelectorAll('[data-day-select]')]
          .find(element => element.dataset.daySelect === target.removeDate)
        : null) || document.querySelector('#app');
  }
  if (target.rewardRemoveId) {
    return [...document.querySelectorAll('[data-reward-remove]')]
      .find(element => element.dataset.rewardRemove === target.rewardRemoveId) ||
      document.querySelector('#reward-form [name="title"]') || document.querySelector('#app');
  }
  if (target.taskNew) return document.querySelector('[data-task-new]');
  return null;
}

function restoreDialogFocus() {
  const returnTarget = dialogReturnFocus;
  dialogReturnFocus = null;
  const fallback = () => view === 'settings'
    ? document.querySelector('#close-account-settings')
    : document.querySelector('#view-title') || document.querySelector('#app');
  const focusTarget = () => (resolveDialogFocus(returnTarget) || fallback())?.focus?.();
  focusTarget();
  window.setTimeout(focusTarget, 0);
}

function readScrollPosition() {
  return {x: window.scrollX, y: window.scrollY};
}

function restoreScrollPosition(position) {
  if (!position) return;
  const restore = () => window.scrollTo(position.x, position.y);
  restore();
  window.requestAnimationFrame?.(() => {
    restore();
    window.requestAnimationFrame?.(restore);
  });
}

function focusAfterRender(selector, {preventScroll = false, scrollPosition = null} = {}) {
  window.setTimeout(() => {
    const element = document.querySelector(selector);
    element?.closest('details')?.setAttribute('open', '');
    const preservedScroll = scrollPosition || (preventScroll ? readScrollPosition() : null);
    element?.focus(preventScroll ? {preventScroll: true} : undefined);
    restoreScrollPosition(preservedScroll);
  }, 0);
}

function focusFirstAfterRender(...selectors) {
  window.setTimeout(() => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        element.focus();
        break;
      }
    }
  }, 0);
}

function focusDatasetControl(attribute, value) {
  const datasetKey = attribute.replace(/^data-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  window.setTimeout(() => {
    const element = [...document.querySelectorAll('[' + attribute + ']')]
      .find(candidate => candidate.dataset?.[datasetKey] === value);
    element?.closest('details')?.setAttribute('open', '');
    element?.focus();
  }, 0);
}

function focusViewHeading() {
  focusAfterRender('#view-title');
}

function appNoticeMarkup() {
  if (!appNotice?.message) return '';
  const role = appNotice.kind === 'error' ? 'alert' : 'status';
  return '<div id="app-notice" class="app-notice ' + h(appNotice.kind) + '" role="' + role + '" aria-live="assertive">' +
    '<span>' + h(appNotice.message) + '</span><button type="button" id="dismiss-app-notice" aria-label="Meldung schließen">Schließen</button></div>';
}

function storageNoticeMarkup() {
  if (storageNoticeDismissed) return '';
  const messages = {
    corrupt: 'Lokale Kalenderdaten konnten nicht gelesen werden. Stelle in den Einstellungen eine JSON-Sicherung wieder her; die beschädigten Daten wurden nicht überschrieben.',
    unavailable: 'Der lokale Speicher ist in diesem Browser nicht verfügbar. Nutze eine aktive Browser-Sitzung oder die Cloud-Persistenz.',
    'write-error': 'Lokale Kalenderdaten konnten nicht gespeichert werden. Prüfe den freien Speicher oder stelle eine JSON-Sicherung wieder her.',
  };
  const message = messages[localStorageStatus];
  if (!message) return '';
  return '<div id="storage-notice" class="app-notice warning" role="alert" aria-live="assertive">' +
    '<span>' + h(message) + '</span><button type="button" id="dismiss-storage-notice" aria-label="Speicherhinweis schließen">Schließen</button></div>';
}

async function connectCloud() {
  const current = ++cloudConnectionId;
  syncState = navigator.onLine === false ? 'offline' : 'connecting';
  render();
  if (navigator.onLine === false) {
    cloud = null;
    applyHouseholdMembers(bootstrapHouseholdMembers);
    entries = loadLocalEntries();
    return;
  }

  const {data, error: authError} = await supabase.auth.getUser();
  if (authError) throw authError;
  if (current !== cloudConnectionId) return;
  const user = data?.user;
  if (!user) {
    cloud = null;
    syncState = 'local';
    applyHouseholdMembers(bootstrapHouseholdMembers);
    entries = loadLocalEntries();
    render();
    return;
  }

  const {data: homes, error} = await supabase
    .from('households')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1);

  if (current !== cloudConnectionId) return;
  if (error || !homes?.length) {
    cloud = null;
    syncState = error ? 'error' : 'local';
    applyHouseholdMembers(bootstrapHouseholdMembers);
    entries = loadLocalEntries();
    render();
    return;
  }

  cloud = {householdId: homes[0].id, userId: user.id};
  try {
    const persistedMembers = await ensureOwnerHouseholdMembers(
      supabase,
      cloud.householdId,
    );
    applyHouseholdMembers(persistedMembers);
  } catch (err) {
    console.error('Haushaltsmitglieder konnten nicht synchronisiert werden', err);
    syncState = 'error';
    applyHouseholdMembers(bootstrapHouseholdMembers);
  }

  try {
    entries = await loadOwnerEvents(supabase, cloud.householdId);
  } catch (err) {
    console.error('Kalender konnte nicht synchronisiert werden', err);
    syncState = 'error';
    render();
    return;
  }
  if (current !== cloudConnectionId) return;
  if (syncState !== 'error') syncState = 'synced';
  render();
}

function render() {
  if (isWallMode(displayMode) && !['all', 'settings'].includes(view)) view = 'all';
  const days = calendarDates(focusedDate, month, calendarMode);
  const today = dateKey(new Date());
  const displayEntries = [...entries, ...importedRosterCalendarEntries(), ...configuredHolidayEntries()];
  const visibleEntries = filterCalendarEntries(
    displayEntries.filter(entry => canSee(entry, view)),
    {
      person: personFilter,
      category: categoryFilter,
      personNamesById: householdMemberNames,
    },
  );
  const summary = monthSummary(visibleEntries, month);
  const monthLabel = calendarTitle(focusedDate, month, calendarMode);
  const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const calendarHint = isWallMode(displayMode)
    ? 'Wandmodus: Die Kalenderkarten sind read-only. Zum Bearbeiten den Wandmodus beenden.'
    : 'Termine kannst du mit Maus oder Touch auf einen anderen Tag ziehen. Für Tastaturbedienung den Eintrag öffnen und das Datum ändern.';
  const calendarMarkup =
    '<section class="panel calendar-panel"><div class="calendar-toolbar">' +
    '<div class="month"><button type="button" id="prev" aria-label="Vorherige ' +
    (calendarMode === 'month' ? 'Monat' : calendarMode === 'week' ? 'Woche' : 'Tag') + '">‹</button><h2>' + monthLabel +
    '</h2><button type="button" id="next" aria-label="Nächste ' +
    (calendarMode === 'month' ? 'Monat' : calendarMode === 'week' ? 'Woche' : 'Tag') + '">›</button></div>' +
    '<div class="calendar-actions"><div class="calendar-modes" role="group" aria-label="Kalenderansicht">' +
    [['day', 'Tag'], ['week', 'Woche'], ['month', 'Monat']]
      .map(([mode, label]) => '<button type="button" data-calendar-mode="' + mode + '" aria-pressed="' +
        (calendarMode === mode) + '" class="' + (calendarMode === mode ? 'active' : '') + '">' + label + '</button>')
      .join('') +
    '</div><button type="button" id="go-today">Heute</button>' +
    (isWallMode(displayMode) ? '' : '<button type="button" id="quick-event" class="primary">+ Termin</button>') +
    (view === 'shift' && !isWallMode(displayMode) ? '<button type="button" id="shift-capture">+ Schnell erfassen</button>' : '') + '</div></div>' +
    '<div class="calendar-summary"><span><strong>' + summary.total + '</strong> Einträge</span><span><strong>' + summary.family +
    '</strong> Familie</span><span><strong>' + summary.shifts + '</strong> Dienste</span></div>' +
    '<details class="calendar-filter-details"><summary>Filter · Personen und Bereiche</summary><div class="calendar-filters"><div class="filter-block"><span class="filter-heading">Personen</span><div class="filter-group" aria-label="Personenfilter">' +
    memberFilterOptions(householdMembers).map(([id, label]) =>
      '<button type="button" data-person-filter="' + id + '" class="' + (personFilter === id ? 'active' : '') + '" aria-pressed="' + (personFilter === id) + '">' + label + '</button>').join('') +
    '</div></div><div class="filter-block"><span class="filter-heading">Bereich</span><div class="filter-group" aria-label="Kategoriefilter">' +
    [['all', 'Alle'], ['family', 'Familie'], ['shift', 'Dienste'], ['school', 'Schule'], ['sport', 'Sport'], ['doctor', 'Arzt'], ['holiday', 'Urlaub'], ['task', 'Aufgaben'], ['routine', 'Routinen']].map(([id, label]) =>
      '<button type="button" data-category-filter="' + id + '" class="' + (categoryFilter === id ? 'active' : '') + '" aria-pressed="' + (categoryFilter === id) + '">' +
      '<span class="filter-dot ' + id + '"></span>' + label + '</button>').join('') +
    '</div></div></div></details>' +
    '<p class="calendar-hint" id="calendar-hint">' + h(calendarHint) + '</p>' +
    '<div class="calendar ' + calendarMode + '-view">' +
    (calendarMode === 'day' ? '' : calendarMode === 'month'
      ? weekdayLabels.map(d => '<b>' + d + '</b>').join('')
      : days.map(day => {
        const date = new Date(day + 'T12:00:00');
        return '<b>' + weekdayLabels[(date.getDay() + 6) % 7] +
          (calendarMode === 'week' ? ' ' + date.getDate() : '') + '</b>';
      }).join('')) +
    days.map(day => day
      ? '<div class="day ' + (day === today ? 'today' : '') + '" data-day="' + day + '"><b><button type="button" class="day-select' +
        (day === dateKey(focusedDate) ? ' selected' : '') + '" data-day-select="' + day + '"' +
        (day === dateKey(focusedDate) ? ' aria-current="date"' : '') + ' tabindex="' + (day === dateKey(focusedDate) ? '0' : '-1') + '" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End" aria-label="' + h(new Date(day + 'T12:00:00').toLocaleDateString('de-DE', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }) + (day === today ? ' · Heute' : '')) + '">' + Number(day.slice(-2)) + '</button></b>' +
        visibleEntries.filter(e => entryOccursOnDate(e, day))
          .map(e => {
            const readOnly = isWallMode(displayMode) || isReadOnlyCalendarEntry(e);
            const editMarkup = readOnly
              ? (e.start ? '<span class="entry-time">' + h(e.start) + '</span>' : '') +
                '<span class="entry-label">' + h(e.title) + '</span>'
              : '<button type="button" class="entry-edit" data-edit="' + h(e.id) + '" aria-label="' + h(e.title) + ' bearbeiten">' +
                (e.start ? '<span class="entry-time">' + h(e.start) + '</span>' : '') +
                '<span class="entry-label">' + h(e.title) + '</span></button>';
            const removeMarkup = readOnly ? '' : '<button type="button" class="entry-remove" data-remove="' + h(e.id) + '" data-remove-date="' + h(day) + '" aria-label="' + h(e.title + ' löschen') + '">×</button>';
            const moveMarkup = readOnly ? '' : '<button type="button" class="entry-move" data-move-open="' + h(e.id) + '" data-move-date="' + h(day) + '" aria-label="' + h(e.title) + ' verschieben">↕</button>';
            return '<div class="entry ' + h(e.type) + ' owner-' + h(entryOwnerStyleKey(e, householdMemberNames)) + (e.type === 'shift' ? '' : ' ' + h(e.eventKind || 'event')) + (isTaskCompletedOnDate(e, day) ? ' completed' : '') + '" title="' + h(e.type === 'shift' ? (shiftOwnerDisplayName(e, householdMemberNames) || 'Unbekannt') + ': ' + e.title : e.title) + '"' +
            (readOnly ? '' : ' role="group" data-move-id="' + h(e.id) + '" data-move-date="' + h(day) + '" draggable="true" aria-label="Eintrag: ' + h(e.title) + '. Ziehen zum Verschieben."') + '>' +
            editMarkup + moveMarkup + removeMarkup + '</div>';
          })
          .join('') +
        '</div>'
      : '<div class="day empty" aria-hidden="true"></div>')
      .join('') +
    '</div><div class="selected-day"><strong>' + h(focusedDate.toLocaleDateString('de-DE', {weekday:'long',day:'2-digit',month:'long'})) + '</strong>' +
    (visibleEntriesForDay(visibleEntries, dateKey(focusedDate)).map(e => isWallMode(displayMode) || isReadOnlyCalendarEntry(e)
      ? '<span class="selected-day-entry"><span class="day-dot owner-' + h(entryOwnerStyleKey(e, householdMemberNames)) + '"></span>' + h(e.title) + (e.start ? ' · ' + h(e.start) : '') + '</span>'
      : '<button type="button" data-edit="' + h(e.id) + '"><span class="day-dot owner-' + h(entryOwnerStyleKey(e, householdMemberNames)) + '"></span>' + h(e.title) + (e.start ? ' · ' + h(e.start) : '') + '</button>').join('') || '<span>Keine Einträge</span>') + '</div></section>';

  const todayMarkup = todayOverviewMarkup(today, displayEntries);
  const body = view === 'home' ? homeOverviewMarkup(today, displayEntries) :
    view === 'today' ? todayMarkup :
    (view === 'shift' ? shiftRosterMarkup(today) : '') +
    (view === 'shift' && shiftCaptureDate ? shiftCaptureMarkup() : '') + calendarMarkup;

  const displayAction = isWallMode(displayMode)
    ? '<button class="wall-exit" id="exit-wall-mode" type="button">Wandmodus beenden</button>'
    : '';
  const dialogOpen = Boolean(dayDialogDate || shiftDialogEventId || moveDialog || deleteDialog || confirmationDialog);
  app.innerHTML =
    '<div class="familycal-shell view-' + view + ' display-' + h(displayMode) + '">' +
    '<div id="app-content">' +
    '<aside class="app-sidebar" aria-label="Seitennavigation"><div class="brand"><span class="brand-mark">F</span><div><strong>FamSchicht</strong><small>Familienplaner · v0.3.17</small></div></div>' +
    '<nav class="side-nav" aria-label="Hauptbereiche">' +
    [['home', '⌂', 'Übersicht'], ['all', '▦', 'Kalender'], ['today', '◷', 'Heute'], ['family', '⌂', 'Familie'], ['shift', '↔', 'Dienste'], ['settings', '⚙', 'Einstellungen']]
      .map(([id, icon, label]) => '<button type="button" data-view="' + id + '" class="' + (view === id ? 'active' : '') + '"' + (view === id ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + icon + '</span>' + label + '</button>')
      .join('') +
    '</nav><div class="sidebar-status" role="status" aria-live="polite"><span class="status-dot ' + syncStatusClass(syncState) + '"></span>' +
    h(syncStatusLabel(syncState)) + '</div></aside>' +
    '<section class="app-workspace"><header class="app-topbar"><div><p class="eyebrow">Gemeinsamer Familienkalender</p><h1 id="view-title" tabindex="-1">' +
    (view === 'home' ? 'Übersicht' : view === 'today' ? 'Heute' : view === 'shift' ? 'Dienstplan' : view === 'family' ? 'Familie' : view === 'settings' ? 'Einstellungen' : 'Kalender') +
    '</h1></div><button class="mobile-settings" type="button" data-view="settings" aria-label="Einstellungen öffnen" title="Einstellungen">⚙</button>' + displayAction + '<div class="member-legend" aria-label="Haushaltsmitglieder">' +
    householdMembers.map(member => '<span class="member ' + h(member.colorKey) + '"><span class="member-avatar" aria-hidden="true">' + h(memberInitials(member)) + '</span><span>' + h(member.name) + '</span></span>').join('') +
    '</div><div class="mobile-sync-status" role="status" aria-live="polite"><span class="status-dot ' + syncStatusClass(syncState) + '"></span>' + h(syncStatusLabel(syncState)) + '</div></header>' +
    appNoticeMarkup() + storageNoticeMarkup() + body + '</section></div>' +
    (dayDialogDate ? dayDialogMarkup() : '') +
    (shiftDialogEventId ? shiftDialogMarkup() : '') +
    (moveDialog ? moveDialogMarkup() : '') +
    (deleteDialog ? deleteDialogMarkup() : '') +
    '</div>';

  const confirmationRoot = document.querySelector('#confirmation-root');
  if (confirmationRoot) confirmationRoot.innerHTML = confirmationDialog ? confirmationDialogMarkup() : '';
  document.body.classList.toggle('settings-open', view === 'settings');
  const accountShell = document.querySelector('#account-shell');
  accountShell?.setAttribute('aria-hidden', String(view !== 'settings'));
  if (accountShell) {
    if (view === 'settings' && dialogOpen) accountShell.setAttribute('inert', '');
    else accountShell.removeAttribute('inert');
  }
  app.setAttribute('aria-hidden', String(view === 'settings'));
  if (view === 'settings') app.setAttribute('inert', '');
  else app.removeAttribute('inert');
  const appContent = app.querySelector('#app-content');
  if (appContent) {
    appContent.setAttribute('aria-hidden', String(dialogOpen));
    if (dialogOpen) appContent.setAttribute('inert', '');
    else appContent.removeAttribute('inert');
  }
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) {
    skipLink.setAttribute('aria-hidden', String(dialogOpen));
    if (dialogOpen) skipLink.setAttribute('inert', '');
    else skipLink.removeAttribute('inert');
  }
  document.querySelector('#custody-settings').innerHTML = view === 'settings' ? custodyMarkup() : '';
  document.querySelector('#dismiss-app-notice')?.addEventListener('click', () => {
    appNotice = null;
    render();
  });
  document.querySelector('#dismiss-storage-notice')?.addEventListener('click', () => {
    storageNoticeDismissed = true;
    render();
  });
  bindControls();
}

function startCloudConnection() {
  void connectCloud().catch(error => {
    console.warn('Cloud-Synchronisierung nicht verfügbar; lokaler Plan bleibt aktiv.', error);
    syncState = navigator.onLine === false ? 'offline' : 'error';
    cloud = null;
    applyHouseholdMembers(bootstrapHouseholdMembers);
    entries = loadLocalEntries();
    render();
  });
}

window.addEventListener('online', startCloudConnection);
window.addEventListener('offline', () => {
  syncState = 'offline';
  render();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    trapDialogFocus(event);
    return;
  }
  if (event.key !== 'Escape') return;
  if (confirmationDialog) {
    closeConfirmationDialog();
    return;
  }
  if (view === 'settings') {
    closeAccountSettings();
    return;
  }
  if (dayDialogDate) {
    closeDayDialog();
    return;
  }
  if (moveDialog) {
    closeMoveDialog();
    return;
  }
  if (deleteDialog) {
    closeDeleteDialog();
    return;
  }
  if (shiftDialogEventId) {
    closeShiftDialog();
  }
});

function trapDialogFocus(event) {
  const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
    .filter(dialog => dialog.getAttribute('aria-hidden') !== 'true' &&
      !dialog.hasAttribute('inert') && dialog.getClientRects().length);
  const dialog = dialogs.at(-1);
  if (!dialog) return;

  const focusable = [...dialog.querySelectorAll(
    'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
  )].filter(element => element.getAttribute('aria-hidden') !== 'true' &&
    !element.closest('[inert]') && element.getClientRects().length);
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const outsideDialog = !dialog.contains(document.activeElement);
  if (event.shiftKey && (document.activeElement === first || outsideDialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || outsideDialog)) {
    event.preventDefault();
    first.focus();
  }
}

function todayOverviewMarkup(today, displayEntries = entries) {
  const items = visibleEntriesForDay(displayEntries, today, {
    person: personFilter,
    category: categoryFilter,
    personNamesById: householdMemberNames,
  });
  const label = new Date(today + 'T12:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
  return '<section class="today-board"><div class="today-hero"><div><p class="eyebrow">' + label + '</p><h2>Was steht heute an?</h2></div>' +
    '<div class="today-actions"><button type="button" id="add-today" class="primary">+ Termin</button></div></div>' +
    '<div class="today-list">' +
    (items.length
      ? items.map(entry => {
        const readOnly = isReadOnlyCalendarEntry(entry);
        const content = '<time>' + h(eventTimeLabel(entry)) + '</time><span class="today-item-copy"><strong>' + h(entry.title) + '</strong><small>' +
          h(entry.type === 'shift' ? (shiftOwnerDisplayName(entry, householdMemberNames) || 'Nicht zugeordnet') : 'Familie') + '</small></span>';
        return '<article class="today-item ' + h(entry.type) + ' owner-' + h(entryOwnerStyleKey(entry, householdMemberNames)) + (entry.type === 'shift' ? '' : ' ' + h(entry.eventKind || 'event')) + (isTaskCompletedOnDate(entry, today) ? ' completed' : '') + '"' +
          (readOnly ? '' : ' role="group" aria-label="Eintrag: ' + h(entry.title) + '"') + '>' +
          (readOnly ? content : '<button type="button" class="today-item-edit" data-edit="' + h(entry.id) + '" aria-label="' + h(entry.title) + ' bearbeiten">' + content + '</button>') +
          (readOnly ? '' : '<button type="button" class="today-item-remove" data-remove="' + h(entry.id) + '" data-remove-date="' + h(today) + '" aria-label="' + h(entry.title + ' löschen') + '">×</button>') + '</article>';
      }).join('')
      : '<div class="empty-state"><strong>Heute ist noch nichts eingetragen.</strong><span>Termin direkt hinzufügen.</span></div>') +
    '</div></section>';
}

function homeOverviewMarkup(today, displayEntries = entries) {
  const base = new Date(today + 'T12:00:00');
  const upcoming = [];
  for (let offset = 0; offset < 21; offset += 1) {
    const date = new Date(base);
    date.setDate(base.getDate() + offset);
    const key = dateKey(date);
    const dayEntries = visibleEntriesForDay(displayEntries, key, {
      person: personFilter,
      category: categoryFilter,
      personNamesById: householdMemberNames,
    });
    dayEntries.forEach(entry => upcoming.push({entry, date: key, offset}));
  }
  upcoming.sort(compareAgendaItems);
  const nextShift = upcoming.find(item => item.entry.type === 'shift');
  const appointments = upcoming.filter(item => item.entry.type !== 'shift' && !isTaskLikeEntry(item.entry)).slice(0, 4);
  const dateLabel = (key, offset) => offset === 0 ? 'Heute' : offset === 1 ? 'Morgen' :
    new Date(key + 'T12:00:00').toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'short'});
  const nextShiftMarkup = nextShift
    ? '<article class="next-shift-card owner-' + h(entryOwnerStyleKey(nextShift.entry, householdMemberNames)) + '"' +
      (isReadOnlyCalendarEntry(nextShift.entry) ? '' : ' data-edit="' + h(nextShift.entry.id) + '" role="button" tabindex="0"') + '>' +
      '<div class="next-shift-copy"><span class="home-kicker">Dein nächster Dienst</span><h2>' + h(nextShift.entry.title) + '</h2>' +
      '<p>' + h(dateLabel(nextShift.date, nextShift.offset)) + (nextShift.entry.start ? ' · ' + h(eventTimeLabel(nextShift.entry)) : '') + '</p></div>' +
      '<span class="shift-owner-chip">' + h(shiftOwnerDisplayName(nextShift.entry, householdMemberNames) || 'Nicht zugeordnet') + '</span></article>'
    : '<article class="next-shift-card next-shift-empty"><span class="home-kicker">Dein nächster Dienst</span><h2>Kein Dienst eingetragen</h2><p>Deine nächsten Dienste erscheinen hier.</p></article>';
  const appointmentMarkup = appointments.length
    ? appointments.map(item => '<article class="home-agenda-item ' + h(item.entry.type) + ' owner-' + h(entryOwnerStyleKey(item.entry, householdMemberNames)) +
      (item.entry.type === 'shift' ? '' : ' ' + h(item.entry.eventKind || 'event')) + '"' +
      (isReadOnlyCalendarEntry(item.entry) ? '' : ' data-edit="' + h(item.entry.id) + '" role="button" tabindex="0"') + '>' +
      '<time><strong>' + h(dateLabel(item.date, item.offset)) + '</strong><span>' + h(eventTimeLabel(item.entry)) + '</span></time>' +
      '<span class="agenda-marker" aria-hidden="true"></span><span class="agenda-copy"><strong>' + h(item.entry.title) + '</strong>' +
      '<small>' + h(item.entry.type === 'shift' ? (shiftOwnerDisplayName(item.entry, householdMemberNames) || 'Dienst') : 'Familie') + '</small></span><span class="agenda-arrow">›</span></article>').join('')
    : '<div class="home-empty"><span class="home-empty-mark">✓</span><strong>Alles im Blick</strong><span>Es stehen noch keine Termine an.</span></div>';
  return '<section class="home-dashboard"><div class="home-welcome"><div><p class="home-kicker">' +
    h(new Date(today + 'T12:00:00').toLocaleDateString('de-DE', {weekday:'long', day:'numeric', month:'long'})) +
    '</p><h2>Hallo zusammen.</h2><p>Hier ist euer Familienplan auf einen Blick.</p></div>' +
    '<button id="home-add-event" class="home-add-button" type="button"><span>＋</span> Termin</button></div>' +
    '<div class="home-highlights">' + nextShiftMarkup + '</div>' +
    '<section class="home-agenda"><div class="home-section-heading"><div><span class="home-kicker">Die nächsten Tage</span><h2>Anstehende Termine</h2></div>' +
    '<button type="button" data-view="all" class="home-text-button">Kalender ansehen <span>›</span></button></div>' +
    '<div class="home-agenda-list">' + appointmentMarkup + '</div></section>' +
    taskOverviewMarkup(today, displayEntries) +
    rewardsOverviewMarkup(displayEntries) +
    '<div class="home-footer-note"><span class="home-sync-dot"></span>' +
    h(syncState === 'synced' ? 'Euer Plan ist synchronisiert' : syncStatusLabel(syncState)) + '</div></section>';
}

function taskOverviewMarkup(today, displayEntries = entries) {
  const priorityOrder = {high: 0, normal: 1, low: 2};
  const rangeStart = shiftCalendarDate(new Date(today + 'T12:00:00'), 'day', -14);
  const rangeEnd = shiftCalendarDate(new Date(today + 'T12:00:00'), 'day', 21);
  const tasks = taskOccurrences(displayEntries, dateKey(rangeStart), dateKey(rangeEnd))
    .filter(occurrence => !occurrence.completed)
    .slice()
    .sort((first, second) => first.date.localeCompare(second.date) ||
      (priorityOrder[first.entry.priority] ?? 1) - (priorityOrder[second.entry.priority] ?? 1) ||
      String(first.entry.title).localeCompare(String(second.entry.title), 'de'))
    .slice(0, 6);
  const dueLabel = date => date < today ? 'Überfällig' : date === today ? 'Heute' :
    new Date(date + 'T12:00:00').toLocaleDateString('de-DE', {weekday: 'short', day: '2-digit', month: 'short'});
  const priorityLabel = {high: 'Hoch', normal: 'Normal', low: 'Niedrig'};
  const content = tasks.length
    ? tasks.map(occurrence => {
      const task = occurrence.entry;
      const kindLabel = task.eventKind === 'routine' ? 'Routine' : 'Aufgabe';
      return '<article class="home-task-item priority-' + h(task.priority || 'normal') + '">' +
      '<button type="button" data-task-toggle="' + h(task.id) + '" data-task-date="' + h(occurrence.date) + '" aria-pressed="false" aria-label="' +
      h(task.title + ' (' + kindLabel + ') als erledigt markieren') + '"><span aria-hidden="true">○</span></button><div><strong>' +
      h(task.title) + '</strong><small>' + h(dueLabel(occurrence.date)) + ' · ' + kindLabel + ' · ' +
      (task.points ? h(task.points + ' Punkte · ') : '') +
      h(householdMemberNames[task.ownerId] || 'Familie') + '</small></div><span class="task-priority">' +
      h(priorityLabel[task.priority] || priorityLabel.normal) + '</span></article>';
    }).join('')
    : '<div class="home-task-empty"><strong>Keine offenen Aufgaben</strong><span>Aufgaben erscheinen hier, sobald du sie im Termineditor anlegst.</span></div>';
  return '<section class="home-tasks"><div class="home-section-heading"><div><span class="home-kicker">Gemeinsam erledigen</span><h2>Aufgaben & Routinen</h2></div>' +
    '<button type="button" data-task-new="true" class="home-text-button">＋ Aufgabe <span>›</span></button></div>' +
    '<div class="home-task-list">' + content + '</div></section>';
}

function rewardsOverviewMarkup(displayEntries = entries) {
  const totals = pointsByMember(displayEntries, householdMembers);
  const activeTotals = totals.filter(item => item.points > 0);
  if (!rewards.length && !activeTotals.length) return '';

  const pointsMarkup = activeTotals.length
    ? '<div class="reward-points-grid">' + activeTotals.map(item =>
      '<article class="reward-points-card"><span class="home-kicker">Punkte</span><strong>' + h(item.points) + '</strong><small>' + h(item.name) + '</small></article>').join('') + '</div>'
    : '<p class="reward-empty">Erledigte Aufgaben oder Routinen mit Punktwert erscheinen hier.</p>';

  const goalMarkup = rewards.length && activeTotals.length
    ? '<div class="reward-goal-list">' + rewards.flatMap(reward => activeTotals.map(item => {
      const progress = rewardProgress(item.points, reward);
      return '<article class="reward-goal"><div class="reward-goal-heading"><strong>' + h(reward.title) + '</strong><small>' +
        h(item.name) + ' · ' + h(progress.points + ' / ' + progress.target + ' Punkte') + '</small></div>' +
        '<div class="reward-progress" role="progressbar" aria-label="' + h(item.name + ': ' + reward.title) + '" aria-valuemin="0" aria-valuemax="' +
        h(progress.target) + '" aria-valuenow="' + h(progress.points) + '"><span style="width:' + progress.percent + '%"></span></div>' +
        '<small class="reward-goal-status">' + h(progress.complete ? 'Belohnung erreicht' : progress.remaining + ' Punkte bis zum Ziel') + '</small></article>';
    })).join('') + '</div>'
    : rewards.length
      ? '<p class="reward-empty">Lege Punktwerte bei Aufgaben fest, damit der Fortschritt je Person sichtbar wird.</p>'
      : '';

  return '<section class="home-rewards" aria-label="Punkte und Belohnungen"><div class="home-section-heading"><div><span class="home-kicker">Motivation</span><h2>Punkte & Belohnungen</h2></div>' +
    '<button type="button" data-view="settings" class="home-text-button">Verwalten <span>›</span></button></div>' + pointsMarkup + goalMarkup + '</section>';
}

function shiftRosterMarkup(today) {
  const monthKey = today.slice(0, 7);
  const roster = shiftRosters.find(item => item.month === monthKey) ||
    shiftRosters.find(item => item.month > monthKey);
  const allRosterEntries = shiftRosters.flatMap(item => item.entries);
  const monthShiftEntries = [...entries, ...importedRosterCalendarEntries()];
  const shiftSummary = summarizeShiftMonth(monthShiftEntries, monthKey, shiftMembers);
  const input = '<input id="roster-files" class="visually-hidden" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple aria-label="Dienstplanfotos auswählen">';
  const upload = '<button id="roster-upload" type="button" class="primary">Dienstplanfoto hochladen</button>';
  const privacy = '<p class="roster-privacy">Das Foto wird auf diesem Gerät ausgewertet und nicht gespeichert. Die bestätigten Dienstzeiten bleiben lokal. Die OCR-Komponente wird bei Bedarf aus dem Internet geladen.</p>';

  if (rosterImportBusy) {
    return '<section class="panel shift-roster"><h2>Dienstplan wird gelesen …</h2>' +
      '<p id="roster-progress" role="status" tabindex="-1">' + h(rosterImportError || 'Bitte einen Moment warten.') + '</p>' +
      '<progress class="roster-progress" max="1" value="0"></progress>' + privacy + '</section>';
  }

  if (rosterImport) return rosterReviewMarkup(rosterImport, input, privacy);

  const anchor = roster ? nextRosterAnchor(roster, today, allRosterEntries) : null;
  const colleagues = anchor ? overlappingRosterPeople(anchor, allRosterEntries) : {counted:[], extras:[]};
  const tile = anchor
    ? '<div class="roster-team"><p class="roster-kicker">' +
      (isRosterShiftActive(anchor, new Date()) ? 'Gerade mit dir im Dienst' : 'Mit dir beim nächsten Dienst') +
      '</p><h3>' + h(anchor.title) + ' · ' + h(anchor.start) + '–' + h(anchor.end) + '</h3>' +
      '<p>' + h(new Date(anchor.date + 'T12:00:00').toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'long'})) + '</p>' +
      (colleagues.counted.length ? '<div class="roster-names"><strong>Im Dienst</strong><span>' + colleagues.counted.map(h).join(', ') + '</span></div>' : '') +
      (colleagues.extras.length ? '<div class="roster-names roster-extras"><strong>Zusätzlich · nicht angerechnet</strong><span>' + colleagues.extras.map(h).join(', ') + '</span></div>' : '') +
      (!colleagues.counted.length && !colleagues.extras.length ? '<p>Keine überlappenden Dienste erkannt.</p>' : '') +
      '</div>'
    : '<div class="roster-empty"><strong>' +
      (roster ? 'Kein eigener Dienst im Plan gefunden.' : 'Noch kein Dienstplan importiert.') +
      '</strong><span>Lade ein oder mehrere Fotos des Monatsplans hoch. Du kannst die Erkennung prüfen und korrigieren, bevor etwas gespeichert wird.</span></div>';

  const summary = '<section class="shift-month-summary" aria-label="Monatsübersicht Dienste"><div class="roster-heading"><div><p class="roster-kicker">Monatsübersicht · ' +
    h(monthLabel(monthKey)) + '</p><h3>Stunden und Dienste</h3></div></div><div class="shift-summary-grid">' +
    shiftSummary.map(shiftSummaryCardMarkup).join('') + '</div>' + shiftTargetSettingsMarkup() + '</section>';

  return '<section class="panel shift-roster"><div class="roster-heading"><div><p class="roster-kicker">Teamübersicht' +
    (roster ? ' · ' + h(monthLabel(roster.month)) : '') + '</p><h2>Mit im Dienst</h2></div>' + upload + input + '</div>' +
    shiftSeriesMarkup(today) + summary + tile + (roster ? '<button id="roster-replace" type="button" class="roster-text-button">Diesen Monat neu importieren</button>' : '') + privacy +
    (rosterImportError ? '<p class="roster-error" role="alert">' + h(rosterImportError) + '</p>' : '') + '</section>';
}

function shiftSeriesMarkup(today) {
  const defaultTemplate = shiftTemplates[0] || {id: 'custom', name: 'Eigener Dienst', title: 'Frühdienst', start: '06:00', end: '14:12'};
  const monthEnd = new Date(`${today.slice(0, 7)}-01T12:00:00`);
  monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
  const days = [[1, 'Mo'], [2, 'Di'], [3, 'Mi'], [4, 'Do'], [5, 'Fr'], [6, 'Sa'], [0, 'So']];
  return '<details class="shift-series-panel"><summary>Serie planen oder Vorlage nutzen</summary>' +
    '<form id="shift-series-form" class="shift-series-form">' +
    '<label>Vorlage<select name="templateId">' + shiftTemplates.map(template =>
      '<option value="' + h(template.id) + '">' + h(template.name) + '</option>').join('') + '</select></label>' +
    '<label>Vorlagenname für eigene Vorlage<input name="templateName" maxlength="60" placeholder="z. B. Bereitschaft"></label>' +
    '<label>Dienst<input name="title" maxlength="120" required value="' + h(defaultTemplate.title) + '"></label>' +
    '<label>Person<select name="ownerId" required>' + shiftMembers.map(member =>
      '<option value="' + h(member.id) + '">' + h(member.name) + '</option>').join('') + '</select></label>' +
    '<label>Beginn<input name="start" type="time" value="' + h(defaultTemplate.start) + '"></label>' +
    '<label>Ende<input name="end" type="time" value="' + h(defaultTemplate.end) + '"></label>' +
    '<label>Von<input name="startDate" type="date" required value="' + h(today) + '"></label>' +
    '<label>Bis<input name="endDate" type="date" required value="' + h(dateKey(monthEnd)) + '"></label>' +
    '<fieldset class="weekday-grid wide"><legend>Wochentage</legend>' + days.map(([value, label]) =>
      '<label><input type="checkbox" name="weekday" value="' + value + '"' + (value >= 1 && value <= 5 ? ' checked' : '') + '> ' + label + '</label>').join('') + '</fieldset>' +
    '<div class="wide dialog-actions"><button type="button" id="shift-template-save">Vorlage speichern</button><button type="submit" id="shift-series-submit" class="primary">Serie eintragen</button></div>' +
    (shiftSeriesStatus ? '<p class="shift-series-status wide" role="status">' + h(shiftSeriesStatus) + '</p>' : '') +
    '</form></details>';
}

function formatHours(hours) {
  if (!hours) return '0:00 h';
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')} h`;
}

function shiftSummaryLabel(item) {
  const labels = [];
  if (item.countedShifts) labels.push(`${item.countedShifts} ${item.countedShifts === 1 ? 'Dienst' : 'Dienste'} angerechnet`);
  if (item.statusShifts) labels.push(`${item.statusShifts} ${item.statusShifts === 1 ? 'Status' : 'Statuswerte'}`);
  if (item.notCountedShifts) labels.push(`${item.notCountedShifts} OZ`);
  return labels.join(' · ') || 'Keine Dienste';
}

function shiftSummaryCardMarkup(item) {
  const target = shiftTargets[item.memberId];
  const difference = shiftTargetDifference(item.hours, target);
  const targetLine = difference === null ? '' : '<small class="shift-target-line">Soll ' + h(formatHours(target)) + ' · ' +
    h(shiftTargetDifferenceLabel(difference)) + '</small>';
  return '<article class="shift-summary-card"><strong>' + h(item.name) + '</strong><span>' +
    shiftSummaryLabel(item) + ' · ' + formatHours(item.hours) + '</span>' + (item.notCountedHours
      ? '<small>+' + formatHours(item.notCountedHours) + ' OZ nicht angerechnet</small>'
      : '') + targetLine + '</article>';
}

function shiftTargetDifferenceLabel(difference) {
  if (difference === 0) return 'Soll erreicht';
  return difference > 0
    ? '+' + formatHours(difference) + ' über Soll'
    : formatHours(Math.abs(difference)) + ' unter Soll';
}

function shiftTargetSettingsMarkup() {
  return '<details class="shift-targets-panel"><summary>Monatliches Soll hinterlegen</summary>' +
    '<p class="shift-targets-note">Optional: Das Soll wird nur auf diesem Gerät gespeichert. Die Ist-Stunden stammen aus den bestätigten Diensten.</p>' +
    '<form id="shift-targets-form" class="shift-targets-form"><div class="shift-target-grid">' +
    shiftMembers.map(member => '<label>' + h(member.name) + '<span class="field-hint">Stunden / Monat</span><input type="number" min="0" max="744" step="0.25" inputmode="decimal" data-shift-target="' +
      h(member.id) + '" value="' + h(shiftTargets[member.id] ?? '') + '" placeholder="z. B. 160"></label>').join('') +
    '</div><div class="dialog-actions"><button type="submit" class="primary">Soll speichern</button></div>' +
    (shiftTargetStatus ? '<p class="shift-target-status" role="status">' + h(shiftTargetStatus) + '</p>' : '') +
    '</form></details>';
}

function rosterReviewMarkup(importData, fileInput, privacy) {
  const names = [...new Set(importData.entries.map(entry => entry.name))].sort((a, b) => a.localeCompare(b, 'de'));
  const groups = new Map();
  importData.entries.forEach((entry, index) => {
    const values = groups.get(entry.name) || [];
    values.push({entry, index});
    groups.set(entry.name, values);
  });
  return '<section class="panel shift-roster roster-review"><div class="roster-heading"><div><p class="roster-kicker">Erkennung prüfen · ' +
    importData.entries.length + ' Dienste</p><h2>Vor dem Speichern prüfen</h2></div></div>' +
    '<form id="roster-review-form"><div class="roster-review-fields">' +
    '<label>Monat des Plans<input name="month" type="month" required value="' + h(importData.month) + '"></label>' +
    '<label>Deine Person in FamSchicht<select name="selfMemberId" required><option value="">Person auswählen</option>' +
    shiftMembers.map(member => '<option value="' + h(member.id) + '"' +
      ((importData.selfMemberId || suggestedRosterMemberId(importData.selfName, shiftMembers)) === member.id ? ' selected' : '') + '>' + h(member.name) + '</option>').join('') +
    '</select></label><label>Deine Zeile im Plan<input name="selfName" list="roster-name-options" required value="' + h(importData.selfName || '') + '" placeholder="Name wie im Dienstplan"><datalist id="roster-name-options">' +
    names.map(name => '<option value="' + h(name) + '"></option>').join('') + '</datalist></label></div>' +
    '<p class="roster-review-note">Die Erkennung kann einzelne Dienste oder Personen übersehen. Vergleiche die Vorschau vollständig mit dem Foto und ergänze fehlende Dienste. Prüfe besonders Datum, Kürzel und „nicht angerechnet“. Fotos werden nach der Erkennung verworfen.</p>' +
    '<div class="roster-add-row"><label>Person<input id="roster-new-name" type="text" placeholder="Name im Plan"></label>' +
    '<label>Datum<input id="roster-new-date" type="date" value="' + h(importData.month + '-01') + '"></label>' +
    '<label>Dienst<select id="roster-new-code">' + ['F1','S1','N5','Nx','Z1'].map(code =>
      '<option value="' + code + '">' + code + ' · ' + h(parseRosterCell(code).title) + '</option>').join('') + '</select></label>' +
    '<button id="roster-add-duty" type="button">Dienst ergänzen</button></div>' +
    '<div class="roster-people">' + [...groups.entries()].map(([name, items]) =>
      '<details class="roster-person"><summary>' + h(name) + ' · ' + items.length + ' Dienste</summary>' +
      '<label class="roster-person-name">Erkannte Person<input type="text" data-roster-person-name="' + h(name) + '" required value="' + h(name) + '"></label><div class="roster-table">' +
      items.map(({entry, index}) => '<div class="roster-row" data-roster-row="' + index + '">' +
        '<label>Datum<input type="date" data-roster-field="date" required value="' + h(entry.date) + '"></label>' +
        '<label>Dienst<select data-roster-field="code">' + ['F1','S1','N5','Nx','Z1'].map(code =>
          '<option value="' + code + '"' + (entry.code === code ? ' selected' : '') + '>' + code + ' · ' + h(parseRosterCell(code).title) + '</option>').join('') + '</select></label>' +
        '<label class="roster-checkbox"><input type="checkbox" data-roster-field="notCounted"' + (entry.notCounted ? ' checked' : '') + '> Nicht angerechnet</label>' +
        '<button type="button" class="roster-remove" data-roster-remove="' + index + '" aria-label="Dienst entfernen">×</button></div>').join('') +
      '</div></details>').join('') + '</div>' +
    '<div class="roster-actions"><button id="roster-cancel" type="button">Abbrechen</button><button id="roster-review-submit" class="primary" type="submit">Prüfen und lokal speichern</button></div></form>' +
    fileInput + privacy + '</section>';
}

function monthLabel(month) {
  return new Date(month + '-01T12:00:00').toLocaleDateString('de-DE', {month:'long', year:'numeric'});
}

function importedRosterCalendarEntries() {
  return projectRosterEntries(shiftRosters, shiftMembers, entries);
}

function configuredHolidayEntries() {
  const currentYear = new Date().getFullYear();
  const years = new Set([
    currentYear - 1,
    currentYear,
    currentYear + 1,
    month.getFullYear(),
    focusedDate.getFullYear(),
  ]);
  return [...years].flatMap(year => germanHolidayEntries(year, holidayRegion));
}

function nextRosterAnchor(roster, today, allRosterEntries) {
  const ownName = normalizeRosterName(roster.selfName);
  if (!ownName) return null;
  const ownShifts = allRosterEntries.filter(entry => normalizeRosterName(entry.name) === ownName)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const now = new Date();
  return ownShifts.find(entry => isRosterShiftActive(entry, now)) ||
    ownShifts.find(entry => entry.date >= today) || null;
}

function isRosterShiftActive(entry, now) {
  const today = dateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeMinutes(entry.start);
  const end = timeMinutes(entry.end);
  if (entry.date === today) return end > start
    ? nowMinutes >= start && nowMinutes < end
    : nowMinutes >= start;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
  return entry.date === dateKey(yesterday) && end < start && nowMinutes < end;
}

function overlappingRosterPeople(anchor, entriesForRoster) {
  const ownName = normalizeRosterName(anchor.name);
  const people = new Map();
  for (const entry of entriesForRoster) {
    const identity = normalizeRosterName(entry.name);
    if (!identity || identity === ownName || !shiftsOverlap(anchor, entry)) continue;
    const current = people.get(identity) || {name:firstName(entry.name), counted:false};
    if (!entry.notCounted) current.counted = true;
    people.set(identity, current);
  }
  const matches = [...people.values()];
  return {
    counted:matches.filter(person => person.counted).map(person => person.name),
    extras:matches.filter(person => !person.counted).map(person => person.name),
  };
}

function timeMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function custodyMarkup() {
  const holidayOptions = holidayRegionOptions().map(([value, label]) =>
    '<option value="' + h(value) + '"' + (holidayRegion === value ? ' selected' : '') + '>' + h(label) + '</option>').join('');
  const displayOptions = displayModeOptions().map(([value, label]) =>
    '<option value="' + h(value) + '"' + (displayMode === value ? ' selected' : '') + '>' + h(label) + '</option>').join('');
  const icsMemberOptions = [['', 'Gemeinsamer Kalender'], ...householdMembers.map(member => [member.id, member.name])].map(([value, label]) =>
    '<option value="' + h(value) + '"' + (icsSourceMemberId === value ? ' selected' : '') + '>' + h(label) + '</option>').join('');
  return '<section class="panel custody-card"><h2>Umgangsrhythmus</h2>' +
    '<p>Start- und Endtag frei wählen; standardmäßig Freitag bis Sonntag. Danach wird der Rhythmus alle 14 Tage für 12 Monate eingetragen. Einzelne Wochenenden kannst du anschließend im Kalender verschieben.</p>' +
    '<form id="custody-form"><label>Erster Tag<input name="anchor" type="date" required></label><label>Letzter Tag <span class="field-hint">(optional · standardmäßig +2 Tage)</span><input name="endAnchor" type="date"></label>' +
    '<label>Bezeichnung<input name="title" value="Kinder bei Papa" required></label>' +
    '<button type="submit" id="custody-submit" class="primary wide">Rhythmus eintragen</button></form></section>' +
    '<section class="panel data-tools-card"><h2>Daten sichern und austauschen</h2>' +
    '<p>Exportiere deinen aktuellen Plan als JSON-Sicherung oder als ICS-Datei für andere Kalender. JSON- und ICS-Importe werden vor dem Speichern bestätigt und auf Duplikate geprüft.</p>' +
    '<label class="data-tools-source-label">ICS-Quelle zuordnen<select id="ics-import-member" aria-label="ICS-Quelle zuordnen">' + icsMemberOptions + '</select></label>' +
    '<div class="data-tools-actions"><button type="button" id="export-json">JSON sichern</button><button type="button" id="import-json">JSON wiederherstellen</button><button type="button" id="export-ics">ICS exportieren</button><button type="button" id="import-ics">ICS importieren</button></div>' +
    '<input id="json-import-file" class="visually-hidden" type="file" accept=".json,application/json" aria-label="JSON-Sicherung auswählen">' +
    '<input id="ics-import-file" class="visually-hidden" type="file" accept=".ics,text/calendar" aria-label="ICS-Datei auswählen">' +
    (dataTransferStatus ? '<p class="data-transfer-status" role="status">' + h(dataTransferStatus) + '</p>' : '') +
    '</section>' +
    '<section class="panel display-tools-card"><h2>Darstellung</h2>' +
    '<p>Der Wandmodus zeigt den Kalender groß und ruhig für Wand- oder Tablet-Displays. Inhalte bleiben read-only, bis du den Modus wieder beendest.</p>' +
    '<form id="display-settings-form" class="display-settings-form"><label>Ansicht<select name="mode">' + displayOptions + '</select></label><button class="primary" type="submit">Übernehmen</button></form>' +
    (displayStatus ? '<p class="data-transfer-status" role="status">' + h(displayStatus) + '</p>' : '') +
    '</section>' +
    pwaInstallMarkup() +
    rewardsSettingsMarkup() +
    '<section class="panel holiday-tools-card"><h2>Feiertage</h2>' +
    '<p>Lokale Feiertage werden automatisch als read-only Termine angezeigt. Wähle dafür das passende Bundesland oder nur die bundesweiten Feiertage.</p>' +
    '<form id="holiday-settings-form" class="holiday-settings-form"><label>Bundesland<select name="region">' + holidayOptions + '</select></label><button class="primary" type="submit">Übernehmen</button></form>' +
    (holidayStatus ? '<p class="data-transfer-status" role="status">' + h(holidayStatus) + '</p>' : '') +
    '</section>';
}

function pwaInstallMarkup() {
  const action = pwaState.kind === 'prompt'
    ? '<button type="button" class="primary" id="pwa-install">App installieren</button>'
    : '';
  const status = pwaInstallStatus
    ? '<p class="data-transfer-status" role="status">' + h(pwaInstallStatus) + '</p>'
    : '';
  return '<section class="panel pwa-tools-card" aria-labelledby="pwa-install-title"><h2 id="pwa-install-title">' +
    h(pwaState.title) + '</h2><p>' + h(pwaState.message) + '</p>' + action + status + '</section>';
}

function rewardsSettingsMarkup() {
  const storageNote = rewardStorageStatus === 'corrupt'
    ? '<p class="data-transfer-status warning" role="alert">Lokale Belohnungen konnten nicht gelesen werden und wurden nicht überschrieben.</p>'
    : rewardStorageStatus === 'unavailable'
      ? '<p class="data-transfer-status warning" role="alert">Der lokale Speicher ist für Belohnungsziele nicht verfügbar.</p>'
      : '';
  const rewardList = rewards.length
    ? '<ul class="reward-settings-list">' + rewards.map(reward =>
      '<li><span><strong>' + h(reward.title) + '</strong><small>' + h(reward.points + ' Punkte') + '</small></span>' +
      '<button type="button" data-reward-remove="' + h(reward.id) + '" aria-label="Belohnung ' + h(reward.title) + ' löschen">Löschen</button></li>').join('') + '</ul>'
    : '<p class="reward-empty">Noch keine Belohnungsziele angelegt.</p>';
  return '<section class="panel rewards-tools-card"><h2>Punkte & Belohnungen</h2>' +
    '<p>Vergib bei Aufgaben oder Routinen einen Punktwert. Die Punkte und Belohnungsziele bleiben nur auf diesem Gerät und werden nicht in Supabase gespeichert.</p>' +
    '<form id="reward-form" class="reward-form"><label>Belohnung<input name="title" maxlength="120" required placeholder="z. B. Ausflug aussuchen"></label>' +
    '<label>Punkte<input name="points" type="number" min="1" max="10000" step="1" required placeholder="z. B. 50"></label>' +
    '<button type="submit" class="primary">Belohnung anlegen</button></form>' + storageNote + rewardList +
    (rewardStatus ? '<p class="data-transfer-status" role="status">' + h(rewardStatus) + '</p>' : '') + '</section>';
}

function moveEntryToDate(id, sourceDate, targetDate) {
  const item = entries.find(entry => entry.id === id);
  if (!item || !targetDate || isReadOnlyCalendarEntry(item) || sourceDate === targetDate) return;
  try {
    const moved = moveCalendarEntry(item, sourceDate, targetDate);
    suppressMoveClickId = id;
    suppressMoveClickUntil = Date.now() + 500;
    void updateEntry(moved);
  } catch (error) {
    showAppNotice(userError(error, 'Der Eintrag konnte nicht verschoben werden.'));
  }
}

function bindMoveControls() {
  const clearTargets = () => {
    app.querySelectorAll('.day.move-target').forEach(day => day.classList.remove('move-target'));
  };
  const dayAtPoint = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-day]');
  const showTarget = day => {
    clearTargets();
    if (day) day.classList.add('move-target');
  };

  app.querySelectorAll('[data-day]').forEach(day => {
    day.addEventListener('dragover', event => {
      const types = [...(event.dataTransfer?.types || [])];
      if (!types.includes('text/famschicht-entry')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      showTarget(day);
    });
    day.addEventListener('dragleave', event => {
      if (!event.relatedTarget || !day.contains(event.relatedTarget)) day.classList.remove('move-target');
    });
    day.addEventListener('drop', event => {
      const payload = event.dataTransfer?.getData('text/famschicht-entry');
      if (!payload) return;
      event.preventDefault();
      clearTargets();
      try {
        const move = JSON.parse(payload);
        moveEntryToDate(move.id, move.sourceDate, day.dataset.day);
      } catch (error) {
        showAppNotice(userError(error, 'Der Eintrag konnte nicht verschoben werden.'));
      }
    });
  });

  app.querySelectorAll('[data-move-id]').forEach(entry => {
    const movePayload = () => JSON.stringify({
      id: entry.dataset.moveId,
      sourceDate: entry.dataset.moveDate,
    });
    entry.addEventListener('dragstart', event => {
      if (!event.dataTransfer) return;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/famschicht-entry', movePayload());
      entry.classList.add('moving');
      suppressMoveClickId = entry.dataset.moveId;
      suppressMoveClickUntil = Date.now() + 500;
    });
    entry.addEventListener('dragend', () => {
      entry.classList.remove('moving');
      clearTargets();
    });

    let pointerState = null;
    entry.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || event.button > 0 || event.target.closest('[data-remove]')) return;
      pointerState = {
        id: entry.dataset.moveId,
        sourceDate: entry.dataset.moveDate,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        targetDate: null,
      };
      entry.setPointerCapture?.(event.pointerId);
    });
    entry.addEventListener('pointermove', event => {
      if (!pointerState || pointerState.pointerId !== event.pointerId) return;
      const distance = Math.hypot(event.clientX - pointerState.startX, event.clientY - pointerState.startY);
      if (!pointerState.moved && distance < 8) return;
      if (!pointerState.moved) {
        pointerState.moved = true;
        entry.classList.add('moving');
        suppressMoveClickId = pointerState.id;
        suppressMoveClickUntil = Date.now() + 500;
      }
      event.preventDefault();
      const day = dayAtPoint(event.clientX, event.clientY);
      pointerState.targetDate = day?.dataset.day || null;
      showTarget(day);
    });
    const finishPointerMove = event => {
      if (!pointerState || pointerState.pointerId !== event.pointerId) return;
      const current = pointerState;
      pointerState = null;
      entry.classList.remove('moving');
      clearTargets();
      entry.releasePointerCapture?.(event.pointerId);
      if (!current.moved) return;
      event.preventDefault();
      const targetDate = current.targetDate || dayAtPoint(event.clientX, event.clientY)?.dataset.day;
      moveEntryToDate(current.id, current.sourceDate, targetDate);
    };
    entry.addEventListener('pointerup', finishPointerMove);
    entry.addEventListener('pointercancel', finishPointerMove);
  });
}

const shiftAbbreviations = {
  'Frühdienst': 'F', 'Spätdienst': 'S', 'Zwischendienst': 'Z',
  'Nachtdienst': 'N', 'SG-Tag': 'SG', 'Urlaub': 'U', 'Fortbildung': 'FB', 'Krank': 'K',
};
function shiftShortLabel(title) { return shiftAbbreviations[title] || title; }

function selectCalendarDay(day, {restoreFocus = false} = {}) {
  if (!day) return;
  focusedDate = new Date(day + 'T12:00:00');
  month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
  render();
  if (restoreFocus) {
    window.setTimeout(() => document.querySelector('[data-day-select="' + day + '"]')?.focus(), 0);
  }
}

function moveCalendarDayByKeyboard(event) {
  const day = event.currentTarget?.dataset?.daySelect;
  if (!day) return;
  const key = event.key;
  const date = new Date(day + 'T12:00:00');
  const boundaryKey = key === 'Home' || key === 'End';
  let offset = 0;
  if (calendarMode === 'day') {
    if (key === 'ArrowLeft' || key === 'ArrowUp') offset = -1;
    if (key === 'ArrowRight' || key === 'ArrowDown') offset = 1;
  } else {
    if (key === 'ArrowLeft') offset = -1;
    if (key === 'ArrowRight') offset = 1;
    if (key === 'ArrowUp') offset = -7;
    if (key === 'ArrowDown') offset = 7;
  }
  if (key === 'Home') {
    offset = -((date.getDay() + 6) % 7);
  } else if (key === 'End') {
    offset = 6 - ((date.getDay() + 6) % 7);
  }
  if (!offset && !boundaryKey) return;
  event.preventDefault();
  if (!offset) return;
  date.setDate(date.getDate() + offset);
  selectCalendarDay(dateKey(date), {restoreFocus: true});
}

function bindControls() {
  app.querySelectorAll('#roster-upload, #roster-replace').forEach(button => {
    button.addEventListener('click', () => app.querySelector('#roster-files')?.click());
  });
  app.querySelector('#roster-files')?.addEventListener('change', handleRosterFilesChange);
  app.querySelector('#shift-series-form')?.addEventListener('submit', handleShiftSeriesSubmit);
  app.querySelector('#shift-template-save')?.addEventListener('click', handleShiftTemplateSave);
  app.querySelector('#shift-series-form [name="templateId"]')?.addEventListener('change', event => {
    applyShiftTemplate(event.currentTarget.value);
  });
  app.querySelector('#shift-targets-form')?.addEventListener('submit', handleShiftTargetsSubmit);
  app.querySelector('#roster-cancel')?.addEventListener('click', () => {
    rosterImport = null;
    rosterImportError = '';
    render();
    focusAfterRender('#roster-upload');
  });
  app.querySelector('#roster-review-form')?.addEventListener('submit', handleRosterImportSubmit);
  app.querySelector('#roster-review-form [name="selfName"]')?.addEventListener('change', event => {
    rosterImport.selfName = event.currentTarget.value.trim();
    const suggested = suggestedRosterMemberId(rosterImport.selfName, shiftMembers);
    if (suggested) app.querySelector('#roster-review-form [name="selfMemberId"]').value = suggested;
  });
  app.querySelector('#roster-review-form [name="selfMemberId"]')?.addEventListener('change', event => {
    rosterImport.selfMemberId = event.currentTarget.value;
  });
  app.querySelector('#roster-add-duty')?.addEventListener('click', addRosterPreviewDuty);
  app.querySelectorAll('[data-roster-row]').forEach(row => {
    row.querySelectorAll('[data-roster-field]').forEach(field => {
      field.addEventListener('change', () => updateRosterPreviewField(row, field));
    });
  });
  app.querySelectorAll('[data-roster-person-name]').forEach(input => {
    input.addEventListener('change', () => {
      const previousName = normalizeRosterName(input.dataset.rosterPersonName);
      const nextName = input.value.trim();
      if (!nextName) return;
      rosterImport.entries.forEach(entry => {
        if (normalizeRosterName(entry.name) === previousName) entry.name = nextName;
      });
      input.dataset.rosterPersonName = nextName;
    });
  });
  app.querySelectorAll('[data-roster-remove]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.rosterRemove);
      rosterImport.entries.splice(index, 1);
      render();
      focusAfterRender('#roster-add-duty');
    });
  });
  app.querySelector('#prev')?.addEventListener('click', () => {
    focusedDate = shiftCalendarDate(calendarMode === 'month' ? month : focusedDate, calendarMode, -1);
    month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
    render();
    focusAfterRender('#prev');
  });
  app.querySelector('#next')?.addEventListener('click', () => {
    focusedDate = shiftCalendarDate(calendarMode === 'month' ? month : focusedDate, calendarMode, 1);
    month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
    render();
    focusAfterRender('#next');
  });
  app.querySelector('#go-today')?.addEventListener('click', () => {
    const now = new Date();
    month = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    focusedDate = now;
    render();
    focusAfterRender('#go-today');
  });
  app.querySelector('#add-today')?.addEventListener('click', () => {
    openDayDialog(dateKey(new Date()));
  });
  app.querySelector('#home-add-event')?.addEventListener('click', () => {
    openDayDialog(dateKey(new Date()));
  });
  app.querySelector('[data-task-new]')?.addEventListener('click', () => {
    openDayDialog(dateKey(new Date()));
    const kind = app.querySelector('#day-dialog-form [name="eventKind"]');
    if (kind) kind.value = 'task';
    const options = app.querySelector('[data-task-options]');
    if (options) options.hidden = false;
  });
  app.querySelector('#quick-event')?.addEventListener('click', () => {
    openDayDialog(dateKey(focusedDate));
  });
  app.querySelectorAll('[data-view]').forEach(button => {
    button.onclick = () => {
      if (button.dataset.view === 'settings') {
        openAccountSettings(button);
        return;
      }
      view = button.dataset.view;
      if (view === 'shift') {
        startShiftCapture();
      } else {
        render();
        focusViewHeading();
      }
    };
  });
  const closeSettingsButton = document.querySelector('#close-account-settings');
  if (closeSettingsButton) closeSettingsButton.onclick = closeAccountSettings;
  app.querySelectorAll('[data-calendar-mode]').forEach(button => {
    button.onclick = () => {
      calendarMode = button.dataset.calendarMode;
      render();
      focusDatasetControl('data-calendar-mode', button.dataset.calendarMode);
    };
  });
  app.querySelectorAll('[data-person-filter]').forEach(button => {
    button.onclick = () => {
      personFilter = button.dataset.personFilter;
      render();
      focusDatasetControl('data-person-filter', button.dataset.personFilter);
    };
  });
  app.querySelectorAll('[data-category-filter]').forEach(button => {
    button.onclick = () => {
      categoryFilter = button.dataset.categoryFilter;
      render();
      focusDatasetControl('data-category-filter', button.dataset.categoryFilter);
    };
  });
  app.querySelectorAll('[data-day]').forEach(day => {
    day.onclick = event => {
      if (event.target.closest('[data-remove], [data-edit], [data-move-open], [data-day-select]')) return;
      selectCalendarDay(day.dataset.day);
    };
  });
  app.querySelectorAll('[data-day-select]').forEach(button => {
    button.addEventListener('click', () => selectCalendarDay(button.dataset.daySelect, {restoreFocus: true}));
    button.addEventListener('keydown', moveCalendarDayByKeyboard);
  });
  app.querySelector('#shift-capture')?.addEventListener('click', startShiftCapture);
  app.querySelectorAll('[data-owner]').forEach(button => {
    button.onclick = () => {
      shiftOwnerId = button.dataset.owner;
      shiftConflict = null;
      render();
      focusDatasetControl('data-owner', button.dataset.owner);
    };
  });
  app.querySelectorAll('[data-shift]').forEach(button => {
    button.onclick = () => handleShiftChoice(button.dataset.shift);
  });
  app.querySelector('[data-shift-confirm="cancel"]')?.addEventListener('click', () => {
    shiftConflict = null;
    render();
  });
  app.querySelector('[data-shift-confirm="save"]')?.addEventListener('click', () => {
    const choice = shiftConflict?.choice;
    if (choice) handleShiftChoice(choice, {skipCollision: true});
  });

  app.querySelector('#day-dialog-form')?.addEventListener('submit', handleDayDialogSubmit);
  app.querySelector('#day-dialog-form [name="eventKind"]')?.addEventListener('change', event => {
    const options = app.querySelector('[data-task-options]');
    if (options) options.hidden = !['task', 'routine'].includes(event.currentTarget.value);
  });
  app.querySelector('#day-dialog-cancel')?.addEventListener('click', () => {
    closeDayDialog();
  });
  app.querySelector('#move-dialog-form')?.addEventListener('submit', handleMoveDialogSubmit);
  app.querySelector('#move-dialog-cancel')?.addEventListener('click', closeMoveDialog);
  app.querySelector('#delete-dialog-form')?.addEventListener('submit', handleDeleteDialogSubmit);
  app.querySelector('#delete-dialog-cancel')?.addEventListener('click', closeDeleteDialog);
  document.querySelector('#confirmation-dialog-form')?.addEventListener('submit', handleConfirmationSubmit);
  document.querySelector('#confirmation-dialog-cancel')?.addEventListener('click', closeConfirmationDialog);

  app.querySelectorAll('[data-move-open]').forEach(button => {
    button.onclick = () => openMoveDialog(button.dataset.moveOpen, button.dataset.moveDate, button);
  });

  app.querySelectorAll('[data-edit]').forEach(element => {
    const activate = event => {
      if (event.target.closest('[data-remove]')) return;
      event.stopPropagation();
      const item = entries.find(entry => entry.id === element.dataset.edit);
      if (item?.type === 'family') openDayDialog(item.date, item.id, element);
      if (item?.type === 'shift') {
        dialogReturnFocus = rememberDialogFocus(element);
        shiftDialogEventId = item.id;
        render();
        window.setTimeout(() => document.querySelector('#shift-edit-form [name="date"]')?.focus(), 0);
      }
    };
    element.onclick = activate;
    element.onkeydown = event => {
      if (element.tagName === 'BUTTON') return;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(event); }
    };
  });

  app.querySelectorAll('[data-remove]').forEach(button => {
    button.onclick = () => openDeleteDialog(button.dataset.remove, button);
  });

  app.querySelectorAll('[data-task-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const item = entries.find(entry => entry.id === button.dataset.taskToggle && isTaskLikeEntry(entry));
      if (!item) return;
      void updateEntry(toggleTaskOccurrence(item, button.dataset.taskDate));
    });
  });

  document.querySelector('#custody-form')?.addEventListener('submit', handleCustodySubmit);
  document.querySelector('#export-json')?.addEventListener('click', exportJsonData);
  document.querySelector('#import-json')?.addEventListener('click', () => document.querySelector('#json-import-file')?.click());
  document.querySelector('#json-import-file')?.addEventListener('change', handleJsonImport);
  document.querySelector('#export-ics')?.addEventListener('click', exportIcsData);
  document.querySelector('#import-ics')?.addEventListener('click', () => document.querySelector('#ics-import-file')?.click());
  document.querySelector('#ics-import-file')?.addEventListener('change', handleIcsImport);
  document.querySelector('#ics-import-member')?.addEventListener('change', event => {
    icsSourceMemberId = event.currentTarget.value;
  });
  document.querySelector('#holiday-settings-form')?.addEventListener('submit', handleHolidaySettingsSubmit);
  document.querySelector('#display-settings-form')?.addEventListener('submit', handleDisplaySettingsSubmit);
  document.querySelector('#pwa-install')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    const result = await promptPwaInstall();
    pwaState = getPwaInstallState();
    pwaInstallStatus = result.outcome === 'accepted'
      ? 'Installation bestätigt. Du kannst FamSchicht jetzt vom Home-Bildschirm starten.'
      : result.outcome === 'dismissed'
        ? 'Installation abgebrochen. Du kannst sie später erneut starten.'
        : 'Dieser Browser bietet gerade keinen Installationsdialog an.';
    render();
    focusAfterRender('#pwa-install');
  });
  document.querySelector('#reward-form')?.addEventListener('submit', handleRewardSubmit);
  document.querySelectorAll('[data-reward-remove]').forEach(button => {
    button.addEventListener('click', () => handleRewardRemove(button.dataset.rewardRemove, button));
  });
  app.querySelector('#exit-wall-mode')?.addEventListener('click', () => {
    displayMode = saveDisplayMode('standard');
    displayStatus = 'Wandmodus wurde beendet.';
    render();
    focusViewHeading();
  });
  app.querySelector('#shift-edit-form')?.addEventListener('submit', handleShiftEditSubmit);
  app.querySelector('#shift-edit-cancel')?.addEventListener('click', closeShiftDialog);
  app.querySelector('#capture-date')?.addEventListener('change', event => {
    if (event.target.value) {
      shiftCaptureDate = event.target.value;
      shiftConflict = null;
      focusedDate = new Date(shiftCaptureDate + 'T12:00:00');
      month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
      render();
      focusAfterRender('#capture-date');
    }
  });
}

async function handleRosterFilesChange(event) {
  const input = event.currentTarget;
  const files = [...(input.files || [])];
  // Keep the File objects for the current run, but allow selecting the same
  // photo again after an OCR error or an explicitly cancelled import.
  input.value = '';
  if (!files.length) return;
  const validationError = validateRosterFiles(files);
  if (validationError) {
    rosterImportError = validationError;
    render();
    focusAfterRender('#roster-upload');
    return;
  }

  rosterImport = null;
  rosterImportBusy = true;
  rosterImportError = 'OCR wird auf diesem Gerät gestartet …';
  render();
  focusAfterRender('#roster-progress');
  try {
    const pages = await recognizeRosterImagesOnDemand(files, updateRosterOcrProgress);
    const ocrTexts = pages.flatMap(page => [page.text, ...(page.alternatives || []).map(item => item.text)]);
    const detectedPeriods = ocrTexts.map(parseRosterPeriod).filter(Boolean);
    const detectedYear = mostCommon(ocrTexts.map(parseRosterYear).filter(Boolean));
    const detectedMonth = mostCommon(ocrTexts.map(parseRosterMonth).filter(Boolean));
    const period = detectedYear && detectedMonth
      ? `${detectedYear}-${String(detectedMonth).padStart(2, '0')}`
      : mostCommon(detectedPeriods) || dateKey(new Date()).slice(0, 7);
    const entriesByPage = pages.map(page => extractBestRosterPage(page, period));
    const entries = mergeRosterPages(entriesByPage);
    if (!entries.length) {
      throw new Error('Ich konnte keine Schichtkürzel sicher erkennen. Bitte ein gerades, gut beleuchtetes Foto wählen.');
    }
  rosterImport = {month:period, selfName:'', selfMemberId:'', entries};
    rosterImportError = '';
  } catch (error) {
    rosterImportError = rosterImportErrorMessage(error);
  } finally {
    rosterImportBusy = false;
    render();
    focusFirstAfterRender('#roster-review-form [name="month"]', '#roster-upload');
  }
}

async function recognizeRosterImagesOnDemand(files, onProgress) {
  if (!rosterOcrModulePromise) {
    rosterOcrModulePromise = import('./shift-roster-ocr.js').catch(error => {
      rosterOcrModulePromise = null;
      throw error;
    });
  }
  const {recognizeRosterImages} = await rosterOcrModulePromise;
  return recognizeRosterImages(files, onProgress);
}

function updateRosterOcrProgress(message) {
  const status = app.querySelector('#roster-progress');
  const progress = app.querySelector('.roster-progress');
  if (!status || !message) return;
  if (message.status === 'recognizing') {
    status.textContent = `Foto ${message.page} von ${message.pages} wird ausgewertet …`;
  } else if (message.status === 'enhancing') {
    status.textContent = `Foto ${message.page} von ${message.pages}: Schriftbild wird verbessert …`;
  } else if (message.status === 'loading language traineddata') {
    status.textContent = 'Deutsche Texterkennung wird geladen …';
  }
  if (progress && typeof message.progress === 'number') progress.value = message.progress;
}

function mostCommon(values) {
  const counts = new Map();
  values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function updateRosterPreviewField(row, field) {
  const index = Number(row.dataset.rosterRow);
  const entry = rosterImport?.entries[index];
  if (!entry) return;
  const key = field.dataset.rosterField;
  if (key === 'date') entry.date = field.value;
  if (key === 'notCounted') entry.notCounted = field.checked;
  if (key === 'code') {
    const parsed = parseRosterCell(field.value);
    if (parsed?.start) Object.assign(entry, parsed);
  }
}

function shiftSeriesFormData() {
  const form = app.querySelector('#shift-series-form');
  return form ? new FormData(form) : null;
}

function applyShiftTemplate(templateId) {
  const template = shiftTemplates.find(item => item.id === templateId);
  const form = app.querySelector('#shift-series-form');
  if (!template || !form) return;
  form.elements.title.value = template.title;
  form.elements.start.value = template.start;
  form.elements.end.value = template.end;
}

function handleShiftTemplateSave() {
  const data = shiftSeriesFormData();
  if (!data) return;
  const title = String(data.get('title') || '').trim();
  const start = String(data.get('start') || '');
  const end = String(data.get('end') || '');
  const name = String(data.get('templateName') || title).trim();
  try {
    const template = normalizeShiftTemplate({
      id: `custom-${Date.now()}`,
      name,
      title,
      start,
      end,
    });
    if (!template) throw new Error('Bitte Vorlagenname, Dienst und gültige Zeiten eingeben.');
    shiftTemplates = saveShiftTemplates(upsertShiftTemplate(shiftTemplates, template));
    shiftSeriesStatus = `Vorlage „${template.name}“ wurde auf diesem Gerät gespeichert.`;
    render();
    focusAfterRender('#shift-template-save');
  } catch (error) {
    showAppNotice(userError(error, 'Vorlage konnte nicht gespeichert werden.'));
    focusAfterRender('#shift-series-form [name="title"]');
  }
}

function handleShiftTargetsSubmit(event) {
  event.preventDefault();
  const targets = {};
  for (const input of event.currentTarget.querySelectorAll('[data-shift-target]')) {
    const raw = String(input.value || '').trim();
    const normalized = normalizeShiftTargetHours(raw);
    if (raw && normalized === null) {
      showAppNotice('Bitte pro Person ein Soll zwischen 0 und 744 Stunden eingeben.');
      focusDatasetControl('data-shift-target', input.dataset.shiftTarget);
      return;
    }
    if (normalized !== null) targets[input.dataset.shiftTarget] = normalized;
  }
  try {
    shiftTargets = saveShiftTargets(targets);
    shiftTargetStatus = 'Sollstunden wurden auf diesem Gerät gespeichert.';
    render();
    focusAfterRender('#shift-targets-form button[type="submit"]');
  } catch (error) {
    showAppNotice(userError(error, 'Sollstunden konnten nicht gespeichert werden.'));
    focusAfterRender('#shift-targets-form [data-shift-target]');
  }
}

async function persistShiftSeries(series) {
  if (cloud) await saveOwnerEvents(supabase, series, cloud.householdId, cloud.userId);
  const nextEntries = [...entries, ...series];
  if (!cloud) saveLocalEntries(nextEntries);
  entries = nextEntries;
  shiftSeriesStatus = `${series.length} Dienste wurden als Serie eingetragen.`;
}

async function handleShiftSeriesSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const ownerId = String(data.get('ownerId') || '');
  const owner = shiftMembers.find(member => member.id === ownerId);
  let series;
  try {
    series = buildShiftSeries({
      startDate: String(data.get('startDate') || ''),
      endDate: String(data.get('endDate') || ''),
      weekdays: data.getAll('weekday'),
      title: String(data.get('title') || ''),
      start: String(data.get('start') || ''),
      end: String(data.get('end') || ''),
      ownerId,
      owner: owner?.name,
      existing: entries,
    });
  } catch (error) {
    showAppNotice(userError(error, 'Die Serie ist ungültig.'));
    focusAfterRender('#shift-series-form [name="startDate"]');
    return;
  }
  if (!series.length) {
    shiftSeriesStatus = 'Alle ausgewählten Dienste existieren in diesem Zeitraum bereits.';
    render();
    focusAfterRender('#shift-series-submit');
    return;
  }

  const conflicts = series.flatMap(shift => findShiftConflicts(shift, entries)
    .map(conflict => `${conflict.date}: ${conflict.entry.title}`));
  if (conflicts.length) {
    openConfirmationDialog({
      title: 'Familienkonflikte erkannt',
      message: `${series.length} Dienste werden angelegt. ${conflicts.length} Familienkonflikt(e) wurden erkannt. Trotzdem eintragen?`,
      confirmLabel: 'Trotzdem eintragen',
      trigger: event.submitter || event.currentTarget,
      onConfirm: () => persistShiftSeries(series),
      errorMessage: 'Serie konnte nicht gespeichert werden.',
    });
    return;
  }

  try {
    await persistShiftSeries(series);
    render();
    focusAfterRender('#shift-series-submit');
  } catch (error) {
    showAppNotice(userError(error, 'Serie konnte nicht gespeichert werden.'));
    focusAfterRender('#shift-series-form [name="title"]');
  }
}

function addRosterPreviewDuty() {
  if (!rosterImport) return;
  const name = app.querySelector('#roster-new-name')?.value.trim();
  const date = app.querySelector('#roster-new-date')?.value;
  const code = app.querySelector('#roster-new-code')?.value;
  const service = parseRosterCell(code);
  if (!name || !date?.startsWith(rosterImport.month + '-') || !service?.start) {
    showAppNotice('Bitte Person, Datum im importierten Monat und Dienst wählen.');
    focusAfterRender('#roster-new-name');
    return;
  }
  rosterImport.entries.push({name, date, code:service.code, title:service.title,
    start:service.start, end:service.end, notCounted:false});
  rosterImport.entries.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'de'));
  render();
  focusAfterRender('#roster-add-duty');
}

function persistRosterReplacement(replacement) {
  shiftRosters = saveShiftRosters(replaceShiftRosterMonth(shiftRosters, replacement));
  rosterImport = null;
  rosterImportError = '';
}

function handleRosterImportSubmit(event) {
  event.preventDefault();
  if (!rosterImport) return;
  const form = event.currentTarget;
  const monthValue = String(new FormData(form).get('month') || '');
  const selfName = String(new FormData(form).get('selfName') || '').trim();
  const selfMemberId = String(new FormData(form).get('selfMemberId') || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthValue) || !selfName ||
      !shiftMembers.some(member => member.id === selfMemberId)) {
    showAppNotice('Bitte Monat, deine Person in FamSchicht und deine Zeile im Plan auswählen.');
    focusFirstAfterRender('#roster-review-form [name="month"]', '#roster-review-form [name="selfMemberId"]', '#roster-review-form [name="selfName"]');
    return;
  }

  const entries = rosterImport.entries.map(entry => ({...entry, name:String(entry.name || '').trim()}));
  const draftError = validateRosterDraft({month:monthValue, selfName, selfMemberId, entries});
  if (draftError) {
    showAppNotice(draftError);
    focusAfterRender('#roster-review-form [data-roster-field]');
    return;
  }
  if (!entries.some(entry => normalizeRosterName(entry.name) === normalizeRosterName(selfName))) {
    showAppNotice('Deine ausgewählte Zeile enthält keine erkannten Dienste. Prüfe den Namen oder die OCR-Erkennung.');
    focusAfterRender('#roster-review-form [name="selfName"]');
    return;
  }

  const existing = shiftRosters.find(roster => roster.month === monthValue);
  const replacement = {month:monthValue, selfName, selfMemberId, entries};
  if (existing) {
    openConfirmationDialog({
      title: 'Dienstplan ersetzen?',
      message: 'Der Dienstplan für ' + monthLabel(monthValue) + ' ist bereits gespeichert. Soll er ersetzt werden?',
      confirmLabel: 'Ersetzen',
      trigger: event.submitter || event.currentTarget,
      onConfirm: () => persistRosterReplacement(replacement),
      errorMessage: 'Dienstplan konnte nicht lokal gespeichert werden.',
    });
    return;
  }
  try {
    persistRosterReplacement(replacement);
    render();
    focusAfterRender('#roster-upload');
  } catch (error) {
    showAppNotice(userError(error, 'Dienstplan konnte nicht lokal gespeichert werden.'));
    focusAfterRender('#roster-review-submit');
  }
}

function shiftDialogMarkup() {
  const item = entries.find(entry => entry.id === shiftDialogEventId && entry.type === 'shift');
  if (!item) return '';
  return '<div class="dialog-backdrop"><section id="shift-dialog" class="day-dialog panel" role="dialog" aria-modal="true" aria-labelledby="shift-dialog-title" aria-describedby="shift-dialog-description" tabindex="-1">' +
    '<h2 id="shift-dialog-title">Dienst bearbeiten</h2><p id="shift-dialog-description" class="note">Datum, Dienstzeit und zuständige Kalenderperson prüfen.</p><form id="shift-edit-form">' +
    '<label>Datum<input name="date" type="date" required value="' + h(item.date) + '"></label>' +
    '<label>Beginn<input name="start" type="time" value="' + h(item.start || '') + '"></label>' +
    '<label>Ende<input name="end" type="time" value="' + h(item.end || '') + '"></label>' +
    '<details class="editor-more"><summary>Weitere Optionen · Dienst und Person</summary>' +
    '<label>Dienst<select name="title">' + SHIFT_NAMES.map(name => '<option value="' + h(name) + '"' + (name === item.title ? ' selected' : '') + '>' + h(name) + '</option>').join('') + '</select></label>' +
    '<label>Person<select name="ownerId">' + shiftMembers.map(member => '<option value="' + h(member.id) + '"' + (member.id === item.ownerId ? ' selected' : '') + '>' + h(member.name) + '</option>').join('') + '</select></label></details>' +
    '<div class="wide dialog-actions"><button id="shift-edit-cancel" type="button">Abbrechen</button><button type="submit" class="primary">Speichern</button></div></form></section></div>';
}

function handleShiftEditSubmit(event) {
  event.preventDefault();
  const previous = entries.find(entry => entry.id === shiftDialogEventId && entry.type === 'shift');
  if (!previous) return;
  const data = new FormData(event.currentTarget);
  const title = String(data.get('title'));
  const ownerId = String(data.get('ownerId'));
  const owner = shiftMembers.find(member => member.id === ownerId);
  if (!SHIFT_NAMES.includes(title) || !owner) return;
  const item = changedShift(previous, {title, date: String(data.get('date')), ownerId, owner: owner.name,
    start: String(data.get('start') || ''), end: String(data.get('end') || '')});
  if (!item.date) return;
  shiftDialogEventId = null;
  void updateEntry(item);
}

async function handleCustodySubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const anchor = formData.get('anchor');
  const endAnchor = formData.get('endAnchor');
  const title = String(formData.get('title')).trim();
  if (!title) {
    showAppNotice('Bitte eine Bezeichnung eingeben.');
    focusAfterRender('#custody-form [name="title"]');
    return;
  }

  let dates;
  try {
    dates = generateCustodyDates(anchor, 12, endAnchor);
  } catch (err) {
    showAppNotice(userError(err, 'Der Umgangsrhythmus ist ungültig.'));
    focusAfterRender('#custody-form [name="anchor"]');
    return;
  }

  const added = missingCustodyDates(entries, anchor, dates)
    .map(date => ({
      id: crypto.randomUUID(),
      type: 'family',
      title,
      date,
      start: '',
      end: '',
      source: 'custody',
      anchor,
      endAnchor,
    }));

  const persistCustodyEntries = async () => {
    try {
      if (cloud) await saveOwnerEvents(supabase, added, cloud.householdId, cloud.userId);
      const nextEntries = [...entries, ...added];
      if (!cloud) saveLocalEntries(nextEntries);
      entries = nextEntries;
    } catch (err) {
      if (cloud) await connectCloud();
      throw err;
    }
    month = new Date(anchor + 'T12:00:00');
    month.setDate(1);
    focusedDate = new Date(anchor + 'T12:00:00');
    view = 'family';
  };
  if (dates.length) {
    openConfirmationDialog({
      title: 'Umgangsrhythmus eintragen?',
      message: dates.length + ' Umgangstage werden in den nächsten 12 Monaten eingetragen.',
      confirmLabel: 'Eintragen',
      trigger: event.submitter || event.currentTarget,
      onConfirm: persistCustodyEntries,
      errorMessage: 'Umgangsrhythmus konnte nicht vollständig gespeichert werden.',
    });
    return;
  }

  try {
    await persistCustodyEntries();
  } catch (err) {
    showAppNotice(userError(err, 'Umgangsrhythmus konnte nicht vollständig gespeichert werden.'));
    focusAfterRender('#custody-submit');
    return;
  }
  render();
  focusAfterRender('#custody-submit');
}

function exportJsonData() {
  downloadFile('famschicht-sicherung.json', JSON.stringify({
    format: 'famschicht-json',
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
  }, null, 2), 'application/json');
  dataTransferStatus = 'JSON-Sicherung wurde heruntergeladen.';
  render();
  focusAfterRender('#export-json');
}

async function persistJsonImport(restored, merged, conflictNote) {
  if (cloud) await saveOwnerEvents(supabase, restored, cloud.householdId, cloud.userId);
  const nextEntries = [...entries, ...restored];
  if (!cloud) saveLocalEntries(nextEntries);
  entries = nextEntries;
  dataTransferStatus = `${restored.length} Termine wurden aus der JSON-Sicherung wiederhergestellt.` +
    (merged.duplicates.length ? ` ${merged.duplicates.length} Duplikat(e) übersprungen.` : '') + conflictNote;
}

async function handleJsonImport(event) {
  const file = event.currentTarget.files?.[0];
  event.currentTarget.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    dataTransferStatus = 'Die JSON-Sicherung ist zu groß (maximal 5 MB).';
    render();
    focusAfterRender('#import-json');
    return;
  }
  try {
    const incoming = parseJsonBackup(await file.text());
    const merged = mergeJsonBackupEvents(entries, incoming);
    if (!merged.added.length) {
      dataTransferStatus = merged.conflicts.length
        ? `${merged.conflicts.length} JSON-Konflikt(e) benötigen eine manuelle Prüfung; vorhandene Termine wurden nicht überschrieben.`
        : 'Keine neuen Termine in der JSON-Sicherung gefunden.';
      render();
      focusAfterRender('#import-json');
      return;
    }
    const conflictNote = merged.conflicts.length
      ? `${merged.conflicts.length} Konflikt(e) wurden übersprungen.` : '';
    const restored = merged.added;
    openConfirmationDialog({
      title: 'JSON-Sicherung wiederherstellen?',
      message: merged.added.length + ' neue Termine werden aus der JSON-Sicherung wiederhergestellt.' + conflictNote,
      confirmLabel: 'Wiederherstellen',
      trigger: document.querySelector('#import-json') || event.currentTarget,
      onConfirm: () => persistJsonImport(restored, merged, conflictNote),
      errorMessage: 'Die JSON-Sicherung konnte nicht importiert werden.',
    });
    return;
  } catch (error) {
    dataTransferStatus = userError(error, 'Die JSON-Sicherung konnte nicht importiert werden.');
    render();
    focusAfterRender('#import-json');
  }
}

function exportIcsData() {
  const exportEntries = [...entries, ...importedRosterCalendarEntries()];
  downloadFile('famschicht.ics', eventsToIcs(exportEntries), 'text/calendar;charset=utf-8');
  dataTransferStatus = `${exportEntries.length} Einträge wurden als ICS exportiert.`;
  render();
  focusAfterRender('#export-ics');
}

async function persistIcsImport(imported, merged, conflictNote) {
  if (cloud) await saveOwnerEvents(supabase, imported, cloud.householdId, cloud.userId);
  const nextEntries = [...entries, ...imported];
  if (!cloud) saveLocalEntries(nextEntries);
  entries = nextEntries;
  dataTransferStatus = `${imported.length} Termine wurden read-only importiert.` +
    (merged.duplicates.length ? ` ${merged.duplicates.length} Duplikat(e) übersprungen.` : '') + conflictNote;
}

async function handleIcsImport(event) {
  const file = event.currentTarget.files?.[0];
  event.currentTarget.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    dataTransferStatus = 'Die ICS-Datei ist zu groß (maximal 5 MB).';
    render();
    focusAfterRender('#import-ics');
    return;
  }
  try {
    const parsed = parseIcs(await file.text());
    const selectedMember = householdMembers.find(member => member.id ===
      (app.querySelector('#ics-import-member')?.value || icsSourceMemberId));
    const source = createReadOnlyCalendarSource({
      id: selectedMember ? 'ics-file-' + selectedMember.id : 'ics-file',
      provider: 'ics',
      memberId: selectedMember?.id || '',
      label: selectedMember ? 'ICS-Datei · ' + selectedMember.name : 'ICS-Datei',
    });
    const merged = mergeReadOnlyCalendarEvents(entries, parsed, source);
    if (!merged.added.length) {
      dataTransferStatus = parsed.length
        ? merged.conflicts.length
          ? `${merged.conflicts.length} ICS-Konflikt(e) benötigen eine manuelle Prüfung; neue Termine wurden nicht übernommen.`
          : 'Keine neuen ICS-Termine gefunden.'
        : 'Die ICS-Datei enthält keine lesbaren Termine.';
      render();
      focusAfterRender('#import-ics');
      return;
    }
    const conflictNote = merged.conflicts.length
      ? ` ${merged.conflicts.length} Konflikt(e) wurden übersprungen.` : '';
    const imported = merged.added;
    openConfirmationDialog({
      title: 'ICS-Termine importieren?',
      message: merged.added.length + ' neue Termine werden read-only aus der ICS-Datei importiert.' + conflictNote,
      confirmLabel: 'Importieren',
      trigger: document.querySelector('#import-ics') || event.currentTarget,
      onConfirm: () => persistIcsImport(imported, merged, conflictNote),
      errorMessage: 'Die ICS-Datei konnte nicht importiert werden.',
    });
    return;
  } catch (error) {
    dataTransferStatus = userError(error, 'Die ICS-Datei konnte nicht importiert werden.');
    render();
    focusAfterRender('#import-ics');
  }
}

function handleHolidaySettingsSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  try {
    holidayRegion = saveHolidayRegion(formData.get('region'));
    holidayStatus = `Feiertage für ${holidayRegionLabel(holidayRegion)} sind aktiviert.`;
  } catch (error) {
    holidayStatus = userError(error, 'Die Feiertagsauswahl konnte nicht gespeichert werden.');
  }
  render();
  focusAfterRender('#holiday-settings-form button[type="submit"]');
}

function handleDisplaySettingsSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  try {
    displayMode = saveDisplayMode(formData.get('mode'));
    displayStatus = displayMode === 'wall'
      ? 'Wandmodus ist aktiv. Die Kalenderkarten sind read-only.'
      : 'Standardansicht ist aktiv.';
    if (isWallMode(displayMode)) view = 'all';
  } catch (error) {
    displayStatus = userError(error, 'Die Darstellung konnte nicht gespeichert werden.');
  }
  const focusSelector = isWallMode(displayMode) && view === 'all'
    ? '#exit-wall-mode'
    : '#display-settings-form button[type="submit"]';
  render();
  focusAfterRender(focusSelector);
}

function handleRewardSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const title = String(data.get('title') || '').trim();
  const points = normalizePoints(data.get('points'));
  if (!title || points === null) {
    rewardStatus = 'Bitte einen Namen und eine ganze Punktzahl zwischen 1 und 10000 eingeben.';
    render();
    focusAfterRender(!title ? '#reward-form [name="title"]' : '#reward-form [name="points"]');
    return;
  }
  try {
    rewards = saveRewardState(upsertReward(rewards, {
      id: rewardId(),
      title,
      points,
    }));
    rewardStorageStatus = 'loaded';
    rewardStatus = `Belohnung „${title}“ wurde auf diesem Gerät gespeichert.`;
  } catch (error) {
    rewardStatus = userError(error, 'Belohnung konnte nicht gespeichert werden.');
  }
  render();
  focusAfterRender('#reward-form [name="title"]');
}

function handleRewardRemove(id, trigger = document.activeElement) {
  const reward = rewards.find(item => item.id === id);
  if (!reward) return;
  openConfirmationDialog({
    title: 'Belohnung löschen?',
    message: `Belohnung „${reward.title}“ wird von diesem Gerät entfernt. Dieser Schritt kann nicht rückgängig gemacht werden.`,
    confirmLabel: 'Belohnung löschen',
    trigger,
    onConfirm: () => {
      rewards = saveRewardState(removeReward(rewards, id));
      rewardStorageStatus = 'loaded';
      rewardStatus = 'Belohnung wurde gelöscht.';
    },
    errorMessage: 'Belohnung konnte nicht gelöscht werden.',
  });
}

function rewardId() {
  return 'reward-' + (globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function openDayDialog(date, eventId = null, trigger = document.activeElement) {
  dialogReturnFocus = rememberDialogFocus(trigger);
  dayDialogDate = date;
  dayDialogEventId = eventId;
  render();
  const focusSelector = '#day-dialog-form [name="date"]';
  const focusField = () => document.querySelector(focusSelector)?.focus();
  focusField();
  window.setTimeout(focusField, 0);
}

function closeDayDialog() {
  if (!dayDialogDate) return;
  closeDialogAndRestoreFocus(() => {
    dayDialogDate = null;
    dayDialogEventId = null;
  });
}

function openMoveDialog(id, sourceDate, trigger = document.activeElement) {
  if (!entries.some(entry => entry.id === id) || !sourceDate) return;
  dialogReturnFocus = rememberDialogFocus(trigger);
  moveDialog = {id, sourceDate};
  render();
  document.querySelector('#move-dialog-form [name="targetDate"]')?.focus();
}

function closeMoveDialog() {
  if (!moveDialog) return;
  closeDialogAndRestoreFocus(() => { moveDialog = null; });
}

function openDeleteDialog(id, trigger = document.activeElement) {
  const item = entries.find(entry => entry.id === id);
  if (!item || isReadOnlyCalendarEntry(item)) return;
  dialogReturnFocus = rememberDialogFocus(trigger);
  deleteDialog = {id, busy: false};
  render();
  document.querySelector('#delete-dialog-cancel')?.focus();
}

function closeDeleteDialog() {
  if (!deleteDialog || deleteDialog.busy) return;
  closeDialogAndRestoreFocus(() => { deleteDialog = null; });
}

function openConfirmationDialog({
  title,
  message,
  confirmLabel = 'Bestätigen',
  trigger = document.activeElement,
  onConfirm,
  errorMessage = 'Die Aktion konnte nicht abgeschlossen werden.',
}) {
  if (typeof onConfirm !== 'function') return;
  dialogReturnFocus = rememberDialogFocus(trigger);
  confirmationDialog = {title, message, confirmLabel, onConfirm, errorMessage, busy: false};
  render();
  document.querySelector('#confirmation-dialog-cancel')?.focus();
}

function closeConfirmationDialog() {
  if (!confirmationDialog || confirmationDialog.busy) return;
  closeDialogAndRestoreFocus(() => { confirmationDialog = null; });
}

function confirmationDialogMarkup() {
  const current = confirmationDialog;
  if (!current) return '';
  const busy = Boolean(current.busy);
  return '<div class="dialog-backdrop"><section id="confirmation-dialog" class="day-dialog panel" role="dialog" aria-modal="true" aria-labelledby="confirmation-dialog-title" aria-describedby="confirmation-dialog-description" aria-busy="' + busy + '" tabindex="-1">' +
    '<h2 id="confirmation-dialog-title">' + h(current.title) + '</h2>' +
    '<p id="confirmation-dialog-description">' + h(current.message) + '</p>' +
    '<form id="confirmation-dialog-form"><div class="wide dialog-actions">' +
    '<button type="button" id="confirmation-dialog-cancel"' + (busy ? ' disabled' : '') + '>Abbrechen</button>' +
    '<button type="submit" class="primary" id="confirmation-dialog-confirm"' + (busy ? ' disabled' : '') + '>' +
    (busy ? 'Wird verarbeitet …' : h(current.confirmLabel)) + '</button></div></form></section></div>';
}

async function handleConfirmationSubmit(event) {
  event.preventDefault();
  const current = confirmationDialog;
  if (!current || current.busy) return;
  confirmationDialog = {...current, busy: true};
  render();
  document.querySelector('#confirmation-dialog')?.focus();
  try {
    await current.onConfirm();
    confirmationDialog = null;
    render();
    restoreDialogFocus();
  } catch (error) {
    confirmationDialog = null;
    render();
    showAppNotice(userError(error, current.errorMessage));
    restoreDialogFocus();
  }
}

function deleteDialogMarkup() {
  const item = entries.find(entry => entry.id === deleteDialog?.id);
  if (!item) return '';
  const busy = Boolean(deleteDialog.busy);
  return '<div class="dialog-backdrop"><section id="delete-dialog" class="day-dialog panel" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" aria-busy="' + busy + '" tabindex="-1">' +
    '<h2 id="delete-dialog-title">Eintrag löschen?</h2>' +
    '<p id="delete-dialog-description">„' + h(item.title) + '“ wird aus deinem Kalender entfernt. Dieser Schritt kann nicht rückgängig gemacht werden.</p>' +
    '<form id="delete-dialog-form"><div class="wide dialog-actions">' +
    '<button type="button" id="delete-dialog-cancel"' + (busy ? ' disabled' : '') + '>Abbrechen</button>' +
    '<button type="submit" class="primary" id="delete-dialog-confirm"' + (busy ? ' disabled' : '') + '>' +
    (busy ? 'Wird gelöscht …' : 'Eintrag löschen') + '</button></div></form></section></div>';
}

async function handleDeleteDialogSubmit(event) {
  event.preventDefault();
  const current = deleteDialog;
  const item = entries.find(entry => entry.id === current?.id);
  if (!current || current.busy || !item) return;
  const nextEntries = entries.filter(entry => entry.id !== item.id);
  deleteDialog = {...current, busy: true};
  render();
  document.querySelector('#delete-dialog')?.focus();
  try {
    if (cloud) await deleteOwnerEvent(supabase, item.id, cloud.householdId);
    else saveLocalEntries(nextEntries);
    entries = nextEntries;
    deleteDialog = null;
    render();
    restoreDialogFocus();
  } catch (error) {
    deleteDialog = null;
    if (cloud) syncState = 'error';
    render();
    showAppNotice(userError(error, 'Löschen fehlgeschlagen.'));
    restoreDialogFocus();
  }
}

function closeShiftDialog() {
  if (!shiftDialogEventId) return;
  closeDialogAndRestoreFocus(() => { shiftDialogEventId = null; });
}

function moveDialogMarkup() {
  const item = entries.find(entry => entry.id === moveDialog?.id);
  if (!item) return '';
  const sourceDate = moveDialog.sourceDate;
  const label = new Date(sourceDate + 'T12:00:00').toLocaleDateString(
    'de-DE', {weekday: 'long', day: '2-digit', month: 'long'},
  );
  return '<div class="dialog-backdrop"><section id="move-dialog" class="day-dialog panel move-dialog" role="dialog" aria-modal="true" aria-labelledby="move-dialog-title" aria-describedby="move-dialog-description" tabindex="-1">' +
    '<h2 id="move-dialog-title">Termin verschieben</h2><p id="move-dialog-description" class="note">' + h(item.title) + ' · aktuell ' + h(label) + '</p>' +
    '<form id="move-dialog-form"><label>Neuer Tag<input name="targetDate" type="date" required value="' + h(sourceDate) + '"></label>' +
    '<div class="wide dialog-actions"><button type="button" id="move-dialog-cancel">Abbrechen</button><button type="submit" class="primary">Verschieben</button></div></form></section></div>';
}

function handleMoveDialogSubmit(event) {
  event.preventDefault();
  const targetDate = String(new FormData(event.currentTarget).get('targetDate') || '');
  const current = moveDialog;
  if (current) {
    closeDialogAndRestoreFocus(() => { moveDialog = null; });
    moveEntryToDate(current.id, current.sourceDate, targetDate);
  } else render();
}

function dayDialogMarkup() {
  const existing = dayDialogEventId
    ? entries.find(entry => entry.id === dayDialogEventId && entry.type === 'family')
    : null;
  const selectedDate = existing?.date || dayDialogDate;
  const label = new Date(selectedDate + 'T12:00:00').toLocaleDateString(
    'de-DE', {weekday: 'long', day: '2-digit', month: 'long'},
  );
  const taskCompleted = isTaskLikeEntry(existing) && isTaskCompletedOnDate(existing, selectedDate);
  const taskCompletionLabel = existing?.recurrence && existing.recurrence !== 'none'
    ? 'Erledigt (dieses Vorkommen)' : 'Erledigt';
  return '<div class="dialog-backdrop"><section id="day-dialog" class="day-dialog panel" role="dialog" aria-modal="true" aria-labelledby="day-dialog-title" aria-describedby="day-dialog-description" tabindex="-1">' +
    '<h2 id="day-dialog-title">' + (existing ? 'Termin bearbeiten' : 'Termin hinzufügen') + '</h2>' +
    '<p id="day-dialog-description" class="note">' + label + '</p><form id="day-dialog-form">' +
    '<label>Von<input name="date" type="date" required autofocus value="' + h(selectedDate) + '"></label>' +
    '<label>Bis<input name="endDate" type="date" value="' + h(existing?.endDate || selectedDate) + '"></label>' +
    (existing ? '<label>Beginn<input name="start" type="time" value="' + h(existing?.start || '') + '"></label>' +
      '<label>Ende<input name="end" type="time" value="' + h(existing?.end || '') + '"></label>' : '') +
    (existing ? '<details class="editor-more"><summary>Weitere Optionen · Titel, Person, Art</summary>' : '') +
    '<label class="wide">Termin<input name="title" maxlength="120" required placeholder="z. B. Elternabend" value="' +
    h(existing?.title || '') + '"></label>' +
    '<label>Person<select name="ownerId">' + householdMembers.map(member => '<option value="' + h(member.id) + '"' + ((existing?.ownerId || 'martin') === member.id ? ' selected' : '') + '>' + h(member.name) + '</option>').join('') + '</select></label>' +
    '<label class="wide">Art<select name="eventKind">' +
    [['event', 'Allgemeiner Termin'], ['birthday', 'Geburtstag'], ['school', 'Schule'], ['sport', 'Sport'], ['doctor', 'Arzt'], ['holiday', 'Urlaub'], ['task', 'Aufgabe'], ['routine', 'Routine']]
      .map(([value, label]) => '<option value="' + value + '"' +
        ((existing?.eventKind || 'event') === value ? ' selected' : '') + '>' + label + '</option>').join('') +
    '</select></label>' +
    '<div class="task-options wide" data-task-options' + (isTaskLikeEntry(existing) ? '' : ' hidden') + '><label>Priorität<select name="priority">' +
    [['low', 'Niedrig'], ['normal', 'Normal'], ['high', 'Hoch']].map(([value, label]) =>
      '<option value="' + value + '"' + ((existing?.priority || 'normal') === value ? ' selected' : '') + '>' + label + '</option>').join('') +
    '</select></label><label>Punkte<input name="points" type="number" min="0" max="10000" step="1" value="' + h(existing?.points ?? 0) + '" inputmode="numeric"></label>' +
    '<label class="task-checkbox"><input name="completed" type="checkbox"' + (taskCompleted ? ' checked' : '') + '> ' + h(taskCompletionLabel) + '</label></div>' +
    (!existing ? '<label>Beginn<input name="start" type="time"></label><label>Ende<input name="end" type="time"></label>' : '') +
    '<label class="wide">Wiederholung<select name="recurrence">' +
    [['none', 'Keine'], ['daily', 'Täglich'], ['weekly', 'Wöchentlich'], ['monthly', 'Monatlich'], ['yearly', 'Jährlich']]
      .map(([value, label]) => '<option value="' + value + '"' +
        ((existing?.recurrence || 'none') === value ? ' selected' : '') + '>' + label + '</option>').join('') +
    '</select></label>' +
    (existing ? '</details>' : '') +
    '<div class="wide dialog-actions"><button type="button" id="day-dialog-cancel">Abbrechen</button>' +
    '<button type="submit" class="primary">' + (existing ? 'Änderungen speichern' : 'Speichern') + '</button></div></form></section></div>';
}

function handleDayDialogSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const existing = dayDialogEventId
    ? entries.find(entry => entry.id === dayDialogEventId && entry.type === 'family')
    : null;
  const date = String(data.get('date') || dayDialogDate);
  const rawEndDate = String(data.get('endDate') || date);
  if (rawEndDate < date) {
    showAppNotice('Das Enddatum darf nicht vor dem Startdatum liegen.');
    focusAfterRender('#day-dialog-form [name="endDate"]');
    return;
  }
  const item = {
    ...(existing || {}),
    id: existing?.id || crypto.randomUUID(),
    type: 'family',
    title: String(data.get('title') || '').trim(),
    date,
    endDate: rawEndDate === date ? undefined : rawEndDate,
    start: String(data.get('start') || ''),
    end: String(data.get('end') || ''),
    recurrence: String(data.get('recurrence') || 'none'),
    eventKind: String(data.get('eventKind') || 'event'),
    ownerId: String(data.get('ownerId') || 'martin'),
  };
  if (item.eventKind === 'birthday') {
    item.start = '';
    item.end = '';
    item.endDate = undefined;
    item.recurrence = 'yearly';
  }
  if (isTaskLikeEntry(item)) {
    item.priority = String(data.get('priority') || 'normal');
    const points = normalizePoints(data.get('points'), {allowZero: true});
    if (points === null) {
      showAppNotice('Bitte für Punkte eine ganze Zahl zwischen 0 und 10000 eingeben.');
      focusAfterRender('#day-dialog-form [name="points"]');
      return;
    }
    if (points) item.points = points;
    else delete item.points;
    const completed = data.get('completed') === 'on';
    const completedItem = setTaskOccurrenceCompleted(item, date, completed);
    item.completed = completedItem.completed;
    if (completedItem.completedDates) item.completedDates = completedItem.completedDates;
    else delete item.completedDates;
  } else {
    delete item.priority;
    delete item.points;
    delete item.completed;
    delete item.completedDates;
  }
  if (!item.title || !item.date) return;
  dayDialogDate = null;
  dayDialogEventId = null;
  if (existing) void updateEntry(item);
  else void saveEntry(item);
}

function startShiftCapture() {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth();
  shiftCaptureDate = dateKey(isCurrentMonth
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
    : new Date(month.getFullYear(), month.getMonth(), 1, 12));
  render();
  focusAfterRender('#capture-date');
}

function shiftCaptureMarkup() {
  const current = new Date(shiftCaptureDate + 'T12:00:00');
  const label = current.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'});
  const conflictMarkup = shiftConflict
    ? '<div class="shift-conflict" role="alert"><strong>Überschneidung mit Familienplan</strong><p>Der ' +
      h(shiftConflict.choice) + ' kollidiert mit:</p><ul>' + shiftConflict.conflicts.map(conflict =>
        '<li><strong>' + h(conflict.entry.title) + '</strong> · ' +
        h(new Date(conflict.date + 'T12:00:00').toLocaleDateString('de-DE', {weekday: 'short', day: '2-digit', month: '2-digit'})) +
        ' · ' + h(eventTimeLabel(conflict.entry)) + '</li>').join('') +
      '</ul><div class="dialog-actions"><button type="button" data-shift-confirm="cancel">Auswahl ändern</button>' +
      '<button type="button" class="primary" data-shift-confirm="save">Trotzdem speichern</button></div></div>'
    : '';
  const choiceDisabled = shiftSavePending || Boolean(shiftConflict);
  return '<section class="panel shift-capture"><h2>Schnellerfassung · ' + label + '</h2>' +
    '<label>Starttag wählen<input id="capture-date" type="date" value="' + h(shiftCaptureDate) + '"></label>' +
    '<p class="note">Ein Tipp speichert den Dienst und springt automatisch zum nächsten Tag. Am Monatsende wird die Eingabe beendet.</p>' +
    '<p class="shift-owner-label">Dienstplan für</p><div class="shift-owner">' +
      shiftMembers.map(member => '<button type="button" data-owner="' + h(member.id) + '" class="' +
      (shiftOwnerId === member.id ? 'selected' : '') + '">' + h(member.name) + '</button>').join('') +
    '</div>' +
    conflictMarkup +
    '<div class="shift-buttons">' +
    SHIFT_NAMES.map(name => '<button type="button" data-shift="' + h(name) + '"' + (choiceDisabled ? ' disabled' : '') + '>' + name + '</button>').join('') +
    '<button type="button" data-shift="skip"' + (choiceDisabled ? ' disabled' : '') + '>Frei</button>' +
    '<button type="button" data-shift="close">Beenden</button></div></section>';
}

let shiftSavePending = false;

function handleShiftChoice(choice, {skipCollision = false} = {}) {
  if (choice === 'close') {
    shiftCaptureDate = null;
    shiftConflict = null;
    render();
    focusAfterRender('#shift-capture');
    return;
  }
  if (choice === 'skip') {
    shiftConflict = null;
    advanceShiftCapture({scrollPosition: readScrollPosition()});
    return;
  }
  if (shiftSavePending) return;
  const [start, end] = shiftTimes(choice);
  if (!skipCollision) {
    const conflicts = findShiftConflicts({
      type: 'shift',
      date: shiftCaptureDate,
      start,
      end,
    }, entries);
    if (conflicts.length) {
      shiftConflict = {choice, conflicts};
      render();
      focusAfterRender('[data-shift-confirm="save"]');
      return;
    }
  }
  shiftConflict = null;
  const shiftCaptureScroll = readScrollPosition();
  shiftSavePending = true;
  render();
  restoreScrollPosition(shiftCaptureScroll);
  const shiftOwner = shiftMembers.find(member => member.id === shiftOwnerId);
  if (!shiftOwner) {
    shiftSavePending = false;
    render();
    restoreScrollPosition(shiftCaptureScroll);
    focusAfterRender('[data-owner]', {preventScroll: true, scrollPosition: shiftCaptureScroll});
    return;
  }
  void saveEntry({
    id: crypto.randomUUID(),
    type: 'shift',
    title: choice,
    date: shiftCaptureDate,
    start,
    end,
    ownerId: shiftOwner.id,
    owner: shiftOwner.name,
  }, () => {
    shiftSavePending = false;
    return {
      focusSelector: advanceShiftCapture({renderNow: false}),
      scrollPosition: shiftCaptureScroll,
    };
  }, () => {
    shiftSavePending = false;
    shiftConflict = null;
    return {
      focusSelector: '#capture-date',
      scrollPosition: shiftCaptureScroll,
    };
  });
}

function advanceShiftCapture({renderNow = true, scrollPosition = null} = {}) {
  const nextDate = nextShiftCaptureDate(shiftCaptureDate, month);
  shiftCaptureDate = nextDate;
  const focusSelector = shiftCaptureDate ? '[data-shift]' : '#shift-capture';
  if (renderNow) {
    render();
    focusAfterRender(focusSelector, {preventScroll: true, scrollPosition});
  }
  return focusSelector;
}

async function updateEntry(item) {
  try {
    if (cloud) {
      await updateOwnerEvent(
        supabase,
        item,
        cloud.householdId,
        cloud.userId,
      );
    }
    entries = entries.map(entry => entry.id === item.id ? item : entry);
    if (!cloud) saveLocalEntries(entries);
    focusedDate = new Date(item.date + 'T12:00:00');
    month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
    render();
    restoreDialogFocus();
  } catch (err) {
    syncState = 'error';
    const reopenShift = item.type === 'shift';
    if (reopenShift) shiftDialogEventId = item.id;
    showAppNotice(userError(err, 'Änderung konnte nicht gespeichert werden.'));
    if (reopenShift) focusAfterRender('#shift-edit-form [name="date"]');
    else restoreDialogFocus();
  }
}

async function saveEntry(item, afterSave, afterError) {
  try {
    if (cloud) await saveOwnerEvent(supabase, item, cloud.householdId, cloud.userId);
    entries.push(item);
    if (!cloud) saveLocalEntries(entries);
    const afterSaveResult = afterSave?.();
    render();
    restoreScrollPosition(afterSaveResult?.scrollPosition);
    const afterSaveFocus = typeof afterSaveResult === 'string'
      ? afterSaveResult
      : afterSaveResult?.focusSelector;
    if (afterSaveFocus) {
      focusAfterRender(afterSaveFocus, {
        preventScroll: true,
        scrollPosition: afterSaveResult?.scrollPosition || null,
      });
    } else {
      restoreDialogFocus();
    }
  } catch (err) {
    syncState = 'error';
    const afterErrorResult = afterError?.();
    showAppNotice(userError(err, 'Speichern fehlgeschlagen.'));
    restoreScrollPosition(afterErrorResult?.scrollPosition);
    const afterErrorFocus = typeof afterErrorResult === 'string'
      ? afterErrorResult
      : afterErrorResult?.focusSelector;
    if (afterErrorFocus) {
      focusAfterRender(afterErrorFocus, {
        preventScroll: true,
        scrollPosition: afterErrorResult?.scrollPosition || null,
      });
    } else {
      restoreDialogFocus();
    }
  }
}

render();
startCloudConnection();
supabase.auth.onAuthStateChange(() => {
  startCloudConnection();
});
window.addEventListener('famschicht:household-created', () => {
  startCloudConnection();
});
window.addEventListener('famschicht:household-members-changed', () => {
  startCloudConnection();
});
window.__famschichtReady?.();

