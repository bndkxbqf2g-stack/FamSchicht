import {load, save} from './storage.js';
import {dateKey, SHIFT_NAMES, shiftTimes, nextShiftCaptureDate, changedShift} from './dates.js';
import {escapeHtml as h, canSee} from './security.js';
import {generateCustodyDates, missingCustodyDates} from './custody.js';
import {supabase} from './auth.js';
import {
  bootstrapHouseholdMembers,
  memberFilterOptions,
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
import {extractBestRosterPage, mergeRosterPages, parseRosterMonth, parseRosterPeriod, parseRosterYear} from './shift-roster-import.js';
import {recognizeRosterImages} from './shift-roster-ocr.js';
import {loadShiftRosters, replaceShiftRosterMonth, saveShiftRosters} from './shift-roster-storage.js';
import {
  importedRosterCalendarEntries as projectRosterEntries,
  suggestedRosterMemberId,
} from './shift-roster-calendar.js';
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

let entries = load();
let month = new Date();
let focusedDate = new Date();
let calendarMode = 'month';
let view = 'home';
let personFilter = 'all';
let categoryFilter = 'all';
let cloud = null;
let shiftCaptureDate = null;
let dayDialogDate = null;
let dayDialogEventId = null;
let shiftDialogEventId = null;
let householdMembers = [...bootstrapHouseholdMembers];
let shiftMembers = shiftEligibleMembers(householdMembers);
let householdMemberNames = memberNamesById(householdMembers);
let shiftOwnerId = shiftMembers[0]?.id || '';
let shiftRosters = loadShiftRosters();
let rosterImport = null;
let rosterImportBusy = false;
let rosterImportError = '';

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
month.setDate(1);

const app = document.querySelector('#app');

async function connectCloud() {
  const {data} = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) {
    cloud = null;
    applyHouseholdMembers(bootstrapHouseholdMembers);
    entries = load();
    render();
    return;
  }

  const {data: homes, error} = await supabase
    .from('households')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1);

  if (error || !homes?.length) {
    cloud = null;
    applyHouseholdMembers(bootstrapHouseholdMembers);
    entries = load();
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
    applyHouseholdMembers(bootstrapHouseholdMembers);
  }

  try {
    entries = await loadOwnerEvents(supabase, cloud.householdId);
    render();
  } catch (err) {
    console.error('Kalender konnte nicht synchronisiert werden', err);
  }
}

function render() {
  const days = calendarDates(focusedDate, month, calendarMode);
  const today = dateKey(new Date());
  const displayEntries = [...entries, ...importedRosterCalendarEntries()];
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
  const calendarMarkup =
    '<section class="panel calendar-panel"><div class="calendar-toolbar">' +
    '<div class="month"><button id="prev" aria-label="Vorherige ' +
    (calendarMode === 'month' ? 'Monat' : calendarMode === 'week' ? 'Woche' : 'Tag') + '">‹</button><h2>' + monthLabel +
    '</h2><button id="next" aria-label="Nächste ' +
    (calendarMode === 'month' ? 'Monat' : calendarMode === 'week' ? 'Woche' : 'Tag') + '">›</button></div>' +
    '<div class="calendar-actions"><div class="calendar-modes" role="group" aria-label="Kalenderansicht">' +
    [['day', 'Tag'], ['week', 'Woche'], ['month', 'Monat']]
      .map(([mode, label]) => '<button data-calendar-mode="' + mode + '" aria-pressed="' +
        (calendarMode === mode) + '" class="' + (calendarMode === mode ? 'active' : '') + '">' + label + '</button>')
      .join('') +
    '</div><button id="go-today">Heute</button><button id="quick-event" class="primary">+ Termin</button>' +
    (view === 'shift' ? '<button id="shift-capture">+ Schnell erfassen</button>' : '') + '</div></div>' +
    '<div class="calendar-summary"><span><strong>' + summary.total + '</strong> Einträge</span><span><strong>' + summary.family +
    '</strong> Familie</span><span><strong>' + summary.shifts + '</strong> Dienste</span></div>' +
    '<details class="calendar-filter-details"><summary>Filter · Personen und Bereiche</summary><div class="calendar-filters"><div class="filter-block"><span class="filter-heading">Personen</span><div class="filter-group" aria-label="Personenfilter">' +
    memberFilterOptions(householdMembers).map(([id, label]) =>
      '<button data-person-filter="' + id + '" class="' + (personFilter === id ? 'active' : '') + '">' + label + '</button>').join('') +
    '</div></div><div class="filter-block"><span class="filter-heading">Bereich</span><div class="filter-group" aria-label="Kategoriefilter">' +
    [['all', 'Alle'], ['family', 'Familie'], ['shift', 'Dienste'], ['school', 'Schule'], ['sport', 'Sport'], ['doctor', 'Arzt'], ['holiday', 'Urlaub'], ['task', 'Aufgaben']].map(([id, label]) =>
      '<button data-category-filter="' + id + '" class="' + (categoryFilter === id ? 'active' : '') + '">' +
      '<span class="filter-dot ' + id + '"></span>' + label + '</button>').join('') +
    '</div></div></div></details>' +
    '<div class="calendar ' + calendarMode + '-view">' +
    (calendarMode === 'day' ? '' : calendarMode === 'month'
      ? weekdayLabels.map(d => '<b>' + d + '</b>').join('')
      : days.map(day => {
        const date = new Date(day + 'T12:00:00');
        return '<b>' + weekdayLabels[(date.getDay() + 6) % 7] +
          (calendarMode === 'week' ? ' ' + date.getDate() : '') + '</b>';
      }).join('')) +
    days.map(day => day
      ? '<div class="day ' + (day === today ? 'today' : '') + '" data-day="' + day + '"><b>' +
        Number(day.slice(-2)) + '</b>' +
        visibleEntries.filter(e => entryOccursOnDate(e, day))
          .map(e => {
            const imported = e.source === 'shift-roster-import';
            return '<div class="entry ' + h(e.type) + ' owner-' + h(entryOwnerStyleKey(e, householdMemberNames)) + (e.type === 'shift' ? '' : ' ' + h(e.eventKind || 'event')) + '" title="' + h(e.type === 'shift' ? (shiftOwnerDisplayName(e, householdMemberNames) || 'Unbekannt') + ': ' + e.title : e.title) + '"' +
            (imported ? '' : ' data-edit="' + h(e.id) + '" role="button" tabindex="0" aria-label="' + h(e.title) + ' bearbeiten"') + '>' +
            (e.start ? '<span class="entry-time">' + h(e.start) + '</span>' : '') +
            '<span class="entry-label">' + h(calendarMode === 'month' ? (e.type === 'shift' ? shiftShortLabel(e.title) : e.source === 'custody' ? 'Papa' : e.title) : e.title) + '</span>' +
            (imported ? '' : '<button data-remove="' + h(e.id) + '" aria-label="Eintrag löschen">×</button>') + '</div>';
          })
          .join('') +
        '</div>'
      : '<div class="day empty" aria-hidden="true"></div>')
      .join('') +
    '</div><div class="selected-day"><strong>' + h(focusedDate.toLocaleDateString('de-DE', {weekday:'long',day:'2-digit',month:'long'})) + '</strong>' +
    (visibleEntriesForDay(visibleEntries, dateKey(focusedDate)).map(e => e.source === 'shift-roster-import'
      ? '<span class="selected-day-entry"><span class="day-dot owner-' + h(entryOwnerStyleKey(e, householdMemberNames)) + '"></span>' + h(e.title) + (e.start ? ' · ' + h(e.start) : '') + '</span>'
      : '<button type="button" data-edit="' + h(e.id) + '"><span class="day-dot owner-' + h(entryOwnerStyleKey(e, householdMemberNames)) + '"></span>' + h(e.title) + (e.start ? ' · ' + h(e.start) : '') + '</button>').join('') || '<span>Keine Einträge</span>') + '</div></section>';

  const todayMarkup = todayOverviewMarkup(today, displayEntries);
  const body = view === 'home' ? homeOverviewMarkup(today, displayEntries) :
    view === 'today' ? todayMarkup :
    (view === 'shift' ? shiftRosterMarkup(today) : '') +
    (view === 'shift' && shiftCaptureDate ? shiftCaptureMarkup() : '') + calendarMarkup;

  app.innerHTML =
    '<div class="familycal-shell view-' + view + '">' +
    '<aside class="app-sidebar"><div class="brand"><span class="brand-mark">F</span><div><strong>FamSchicht</strong><small>Familienplaner · v0.3.2</small></div></div>' +
    '<nav class="side-nav">' +
    [['home', '⌂', 'Übersicht'], ['all', '▦', 'Kalender'], ['today', '◷', 'Heute'], ['family', '⌂', 'Familie'], ['shift', '↔', 'Dienste'], ['settings', '⚙', 'Einstellungen']]
      .map(([id, icon, label]) => '<button data-view="' + id + '" class="' + (view === id ? 'active' : '') + '"><span>' + icon + '</span>' + label + '</button>')
      .join('') +
    '</nav><div class="sidebar-status"><span class="status-dot ' + (cloud ? 'online' : '') + '"></span>' +
    (cloud ? 'Synchronisiert' : 'Nur dieses Gerät') + '</div></aside>' +
    '<section class="app-workspace"><header class="app-topbar"><div><p class="eyebrow">Gemeinsamer Familienkalender</p><h1>' +
    (view === 'home' ? 'Übersicht' : view === 'today' ? 'Heute' : view === 'shift' ? 'Dienstplan' : view === 'family' ? 'Familie' : view === 'settings' ? 'Einstellungen' : 'Kalender') +
    '</h1></div><button class="mobile-settings" type="button" data-view="settings" aria-label="Einstellungen öffnen" title="Einstellungen">⚙</button><div class="member-legend">' +
    householdMembers.map(member => '<span class="member ' + h(member.colorKey) + '">' + h(member.name) + '</span>').join('') +
    '</div><div class="mobile-sync-status"><span class="status-dot ' + (cloud ? 'online' : '') + '"></span>' + (cloud ? 'Synchronisiert' : 'Nur dieses Gerät') + '</div></header>' +
    body +
    (dayDialogDate ? dayDialogMarkup() : '') +
    (shiftDialogEventId ? shiftDialogMarkup() : '') +
    '</section></div>';

  document.body.classList.toggle('settings-open', view === 'settings');
  document.querySelector('#custody-settings').innerHTML = view === 'settings' ? custodyMarkup() : '';
  bindControls();
}

function startCloudConnection() {
  void connectCloud().catch(error => {
    console.warn('Cloud-Synchronisierung nicht verfügbar; lokaler Plan bleibt aktiv.', error);
    cloud = null;
    applyHouseholdMembers(bootstrapHouseholdMembers);
    entries = load();
    render();
  });
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
    '<div class="today-actions"><button id="add-today" class="primary">+ Termin</button></div></div>' +
    '<div class="today-list">' +
    (items.length
      ? items.map(entry => '<article class="today-item ' + h(entry.type) + ' owner-' + h(entryOwnerStyleKey(entry, householdMemberNames)) + (entry.type === 'shift' ? '' : ' ' + h(entry.eventKind || 'event')) + '"' +
          (entry.source === 'shift-roster-import' ? '' : ' data-edit="' + h(entry.id) + '" role="button" tabindex="0"') + '>' +
          '<time>' + h(eventTimeLabel(entry)) + '</time><div><strong>' + h(entry.title) + '</strong><small>' +
          h(entry.type === 'shift' ? (shiftOwnerDisplayName(entry, householdMemberNames) || 'Nicht zugeordnet') : 'Familie') +
          '</small></div>' + (entry.source === 'shift-roster-import' ? '' : '<button data-remove="' + h(entry.id) + '" aria-label="Eintrag löschen">×</button>') + '</article>').join('')
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
  const appointments = upcoming.filter(item => item.entry.type !== 'shift').slice(0, 4);
  const dateLabel = (key, offset) => offset === 0 ? 'Heute' : offset === 1 ? 'Morgen' :
    new Date(key + 'T12:00:00').toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'short'});
  const nextShiftMarkup = nextShift
    ? '<article class="next-shift-card owner-' + h(entryOwnerStyleKey(nextShift.entry, householdMemberNames)) + '"' +
      (nextShift.entry.source === 'shift-roster-import' ? '' : ' data-edit="' + h(nextShift.entry.id) + '" role="button" tabindex="0"') + '>' +
      '<div class="next-shift-copy"><span class="home-kicker">Dein nächster Dienst</span><h2>' + h(nextShift.entry.title) + '</h2>' +
      '<p>' + h(dateLabel(nextShift.date, nextShift.offset)) + (nextShift.entry.start ? ' · ' + h(eventTimeLabel(nextShift.entry)) : '') + '</p></div>' +
      '<span class="shift-owner-chip">' + h(shiftOwnerDisplayName(nextShift.entry, householdMemberNames) || 'Nicht zugeordnet') + '</span></article>'
    : '<article class="next-shift-card next-shift-empty"><span class="home-kicker">Dein nächster Dienst</span><h2>Kein Dienst eingetragen</h2><p>Deine nächsten Dienste erscheinen hier.</p></article>';
  const appointmentMarkup = appointments.length
    ? appointments.map(item => '<article class="home-agenda-item ' + h(item.entry.type) + ' owner-' + h(entryOwnerStyleKey(item.entry, householdMemberNames)) +
      (item.entry.type === 'shift' ? '' : ' ' + h(item.entry.eventKind || 'event')) + '"' +
      (item.entry.source === 'shift-roster-import' ? '' : ' data-edit="' + h(item.entry.id) + '" role="button" tabindex="0"') + '>' +
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
    '<div class="home-footer-note"><span class="home-sync-dot"></span>' + (cloud ? 'Euer Plan ist synchronisiert' : 'Dein Plan auf diesem Gerät') + '</div></section>';
}

function shiftRosterMarkup(today) {
  const monthKey = today.slice(0, 7);
  const roster = shiftRosters.find(item => item.month === monthKey) ||
    shiftRosters.find(item => item.month > monthKey);
  const allRosterEntries = shiftRosters.flatMap(item => item.entries);
  const input = '<input id="roster-files" class="visually-hidden" type="file" accept="image/*" multiple aria-label="Dienstplanfotos auswählen">';
  const upload = '<button id="roster-upload" type="button" class="primary">Dienstplanfoto hochladen</button>';
  const privacy = '<p class="roster-privacy">Das Foto wird auf diesem Gerät ausgewertet und nicht gespeichert. Die bestätigten Dienstzeiten bleiben lokal. Die OCR-Komponente wird bei Bedarf aus dem Internet geladen.</p>';

  if (rosterImportBusy) {
    return '<section class="panel shift-roster"><h2>Dienstplan wird gelesen …</h2>' +
      '<p id="roster-progress" role="status">' + h(rosterImportError || 'Bitte einen Moment warten.') + '</p>' +
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

  return '<section class="panel shift-roster"><div class="roster-heading"><div><p class="roster-kicker">Teamübersicht' +
    (roster ? ' · ' + h(monthLabel(roster.month)) : '') + '</p><h2>Mit im Dienst</h2></div>' + upload + input + '</div>' +
    tile + (roster ? '<button id="roster-replace" type="button" class="roster-text-button">Diesen Monat neu importieren</button>' : '') + privacy +
    (rosterImportError ? '<p class="roster-error" role="alert">' + h(rosterImportError) + '</p>' : '') + '</section>';
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
    '<div class="roster-actions"><button id="roster-cancel" type="button">Abbrechen</button><button class="primary" type="submit">Prüfen und lokal speichern</button></div></form>' +
    fileInput + privacy + '</section>';
}

function monthLabel(month) {
  return new Date(month + '-01T12:00:00').toLocaleDateString('de-DE', {month:'long', year:'numeric'});
}

function importedRosterCalendarEntries() {
  return projectRosterEntries(shiftRosters, shiftMembers, entries);
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
  return '<section class="panel custody-card"><h2>Umgangsrhythmus</h2>' +
    '<p>Start- und Endtag frei wählen; standardmäßig Freitag bis Sonntag. Danach wird der Rhythmus alle 14 Tage für 12 Monate eingetragen. Einzelne Wochenenden kannst du anschließend im Kalender verschieben.</p>' +
    '<form id="custody-form"><label>Erster Tag<input name="anchor" type="date" required></label><label>Letzter Tag <span class="field-hint">(optional · standardmäßig +2 Tage)</span><input name="endAnchor" type="date"></label>' +
    '<label>Bezeichnung<input name="title" value="Kinder bei Papa" required></label>' +
    '<button class="primary wide">Rhythmus eintragen</button></form></section>';
}

const shiftAbbreviations = {
  'Frühdienst': 'F', 'Spätdienst': 'S', 'Zwischendienst': 'Z',
  'Nachtdienst': 'N', 'SG-Tag': 'SG', 'Urlaub': 'U', 'Fortbildung': 'FB',
};
function shiftShortLabel(title) { return shiftAbbreviations[title] || title; }

function bindControls() {
  app.querySelectorAll('#roster-upload, #roster-replace').forEach(button => {
    button.addEventListener('click', () => app.querySelector('#roster-files')?.click());
  });
  app.querySelector('#roster-files')?.addEventListener('change', handleRosterFilesChange);
  app.querySelector('#roster-cancel')?.addEventListener('click', () => {
    rosterImport = null;
    rosterImportError = '';
    render();
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
    });
  });
  app.querySelector('#prev')?.addEventListener('click', () => {
    focusedDate = shiftCalendarDate(calendarMode === 'month' ? month : focusedDate, calendarMode, -1);
    month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
    render();
  });
  app.querySelector('#next')?.addEventListener('click', () => {
    focusedDate = shiftCalendarDate(calendarMode === 'month' ? month : focusedDate, calendarMode, 1);
    month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
    render();
  });
  app.querySelector('#go-today')?.addEventListener('click', () => {
    const now = new Date();
    month = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    focusedDate = now;
    render();
  });
  app.querySelector('#add-today')?.addEventListener('click', () => {
    openDayDialog(dateKey(new Date()));
  });
  app.querySelector('#home-add-event')?.addEventListener('click', () => {
    openDayDialog(dateKey(new Date()));
  });
  app.querySelector('#quick-event')?.addEventListener('click', () => {
    openDayDialog(dateKey(focusedDate));
  });
  app.querySelectorAll('[data-view]').forEach(button => {
    button.onclick = () => {
      view = button.dataset.view;
      if (view === 'shift') {
        startShiftCapture();
      } else {
        render();
      }
    };
  });
  document.querySelector('#close-account-settings')?.addEventListener('click', () => {
    view = 'all';
    render();
  });
  app.querySelectorAll('[data-calendar-mode]').forEach(button => {
    button.onclick = () => {
      calendarMode = button.dataset.calendarMode;
      render();
    };
  });
  app.querySelectorAll('[data-person-filter]').forEach(button => {
    button.onclick = () => {
      personFilter = button.dataset.personFilter;
      render();
    };
  });
  app.querySelectorAll('[data-category-filter]').forEach(button => {
    button.onclick = () => {
      categoryFilter = button.dataset.categoryFilter;
      render();
    };
  });
  app.querySelectorAll('[data-day]').forEach(day => {
    day.onclick = event => {
      if (event.target.closest('[data-remove], [data-edit]')) return;
      focusedDate = new Date(day.dataset.day + 'T12:00:00');
      month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
      render();
    };
  });
  app.querySelector('#shift-capture')?.addEventListener('click', startShiftCapture);
  app.querySelectorAll('[data-owner]').forEach(button => {
    button.onclick = () => { shiftOwnerId = button.dataset.owner; render(); };
  });
  app.querySelectorAll('[data-shift]').forEach(button => {
    button.onclick = () => handleShiftChoice(button.dataset.shift);
  });

  app.querySelector('#day-dialog-form')?.addEventListener('submit', handleDayDialogSubmit);
  app.querySelector('#day-dialog-cancel')?.addEventListener('click', () => {
    dayDialogDate = null;
    dayDialogEventId = null;
    render();
  });

  app.querySelectorAll('[data-edit]').forEach(element => {
    const activate = event => {
      if (event.target.closest('[data-remove]')) return;
      event.stopPropagation();
      const item = entries.find(entry => entry.id === element.dataset.edit);
      if (item?.type === 'family') openDayDialog(item.date, item.id);
      if (item?.type === 'shift') { shiftDialogEventId = item.id; render(); }
    };
    element.onclick = activate;
    element.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(event); }
    };
  });

  app.querySelectorAll('[data-remove]').forEach(button => {
    button.onclick = async () => {
      if (!confirm('Eintrag löschen?')) return;
      const id = button.dataset.remove;
      try {
        if (cloud) await deleteOwnerEvent(supabase, id, cloud.householdId);
        entries = entries.filter(entry => entry.id !== id);
        if (!cloud) save(entries);
        render();
      } catch (err) {
        alert('Löschen fehlgeschlagen: ' + err.message);
      }
    };
  });

  document.querySelector('#custody-form')?.addEventListener('submit', handleCustodySubmit);
  app.querySelector('#shift-edit-form')?.addEventListener('submit', handleShiftEditSubmit);
  app.querySelector('#shift-edit-cancel')?.addEventListener('click', () => { shiftDialogEventId = null; render(); });
  app.querySelector('#capture-date')?.addEventListener('change', event => {
    if (event.target.value) {
      shiftCaptureDate = event.target.value;
      focusedDate = new Date(shiftCaptureDate + 'T12:00:00');
      month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
      render();
    }
  });
}

async function handleRosterFilesChange(event) {
  const files = [...(event.currentTarget.files || [])];
  if (!files.length) return;
  if (files.length > 4 || files.some(file => !file.type.startsWith('image/')) ||
      files.reduce((total, file) => total + file.size, 0) > 35 * 1024 * 1024) {
    rosterImportError = 'Bitte höchstens vier Bilddateien mit zusammen maximal 35 MB auswählen.';
    render();
    return;
  }

  rosterImport = null;
  rosterImportBusy = true;
  rosterImportError = 'OCR wird auf diesem Gerät gestartet …';
  render();
  try {
    const pages = await recognizeRosterImages(files, updateRosterOcrProgress);
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
    rosterImportError = error.message || 'Der Dienstplan konnte nicht gelesen werden.';
  } finally {
    rosterImportBusy = false;
    render();
  }
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

function addRosterPreviewDuty() {
  if (!rosterImport) return;
  const name = app.querySelector('#roster-new-name')?.value.trim();
  const date = app.querySelector('#roster-new-date')?.value;
  const code = app.querySelector('#roster-new-code')?.value;
  const service = parseRosterCell(code);
  if (!name || !date?.startsWith(rosterImport.month + '-') || !service?.start) {
    alert('Bitte Person, Datum im importierten Monat und Dienst wählen.');
    return;
  }
  rosterImport.entries.push({name, date, code:service.code, title:service.title,
    start:service.start, end:service.end, notCounted:false});
  rosterImport.entries.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'de'));
  render();
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
    alert('Bitte Monat, deine Person in FamSchicht und deine Zeile im Plan auswählen.');
    return;
  }

  const entries = rosterImport.entries.filter(entry => entry.name.trim());
  if (!entries.some(entry => normalizeRosterName(entry.name) === normalizeRosterName(selfName))) {
    alert('Deine ausgewählte Zeile enthält keine erkannten Dienste. Prüfe den Namen oder die OCR-Erkennung.');
    return;
  }
  if (entries.some(entry => !entry.date.startsWith(monthValue + '-') || !parseRosterCell(entry.code)?.start)) {
    alert('Mindestens ein Dienst hat ein ungültiges Datum oder Kürzel. Bitte korrigiere die Vorschau.');
    return;
  }

  const existing = shiftRosters.find(roster => roster.month === monthValue);
  if (existing && !confirm('Der Dienstplan für ' + monthLabel(monthValue) + ' ist bereits gespeichert. Soll er ersetzt werden?')) return;
  const replacement = {month:monthValue, selfName, selfMemberId, entries};
  try {
    shiftRosters = saveShiftRosters(replaceShiftRosterMonth(shiftRosters, replacement));
    rosterImport = null;
    rosterImportError = '';
    render();
  } catch (error) {
    alert('Dienstplan konnte nicht lokal gespeichert werden: ' + error.message);
  }
}

function shiftDialogMarkup() {
  const item = entries.find(entry => entry.id === shiftDialogEventId && entry.type === 'shift');
  if (!item) return '';
  return '<div class="dialog-backdrop"><section class="day-dialog panel" role="dialog" aria-modal="true" aria-label="Dienst bearbeiten">' +
    '<h2>Dienst bearbeiten</h2><form id="shift-edit-form">' +
    '<label>Datum<input name="date" type="date" required value="' + h(item.date) + '"></label>' +
    '<label>Beginn<input name="start" type="time" value="' + h(item.start || '') + '"></label>' +
    '<label>Ende<input name="end" type="time" value="' + h(item.end || '') + '"></label>' +
    '<details class="editor-more"><summary>Weitere Optionen · Dienst und Person</summary>' +
    '<label>Dienst<select name="title">' + SHIFT_NAMES.map(name => '<option value="' + h(name) + '"' + (name === item.title ? ' selected' : '') + '>' + h(name) + '</option>').join('') + '</select></label>' +
    '<label>Person<select name="ownerId">' + shiftMembers.map(member => '<option value="' + h(member.id) + '"' + (member.id === item.ownerId ? ' selected' : '') + '>' + h(member.name) + '</option>').join('') + '</select></label></details>' +
    '<div class="wide dialog-actions"><button id="shift-edit-cancel" type="button">Abbrechen</button><button class="primary">Speichern</button></div></form></section></div>';
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
    alert('Bitte eine Bezeichnung eingeben.');
    return;
  }

  let dates;
  try {
    dates = generateCustodyDates(anchor, 12, endAnchor);
  } catch (err) {
    alert(err.message);
    return;
  }

  if (!confirm(dates.length + ' Umgangstage in den nächsten 12 Monaten eintragen?')) return;

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

  try {
    if (cloud) await saveOwnerEvents(supabase, added, cloud.householdId, cloud.userId);
    entries.push(...added);
    if (!cloud) save(entries);
  } catch (err) {
    alert('Umgangsrhythmus konnte nicht vollständig gespeichert werden: ' + err.message);
    await connectCloud();
    return;
  }

  month = new Date(anchor + 'T12:00:00');
  month.setDate(1);
  focusedDate = new Date(anchor + 'T12:00:00');
  view = 'family';
  render();
}

function openDayDialog(date, eventId = null) {
  dayDialogDate = date;
  dayDialogEventId = eventId;
  render();
}

function dayDialogMarkup() {
  const existing = dayDialogEventId
    ? entries.find(entry => entry.id === dayDialogEventId && entry.type === 'family')
    : null;
  const selectedDate = existing?.date || dayDialogDate;
  const label = new Date(selectedDate + 'T12:00:00').toLocaleDateString(
    'de-DE', {weekday: 'long', day: '2-digit', month: 'long'},
  );
  return '<div class="dialog-backdrop"><section class="day-dialog panel">' +
    '<h2>' + (existing ? 'Termin bearbeiten' : 'Termin hinzufügen') + '</h2>' +
    '<p class="note">' + label + '</p><form id="day-dialog-form">' +
    '<label>Von<input name="date" type="date" required value="' + h(selectedDate) + '"></label>' +
    '<label>Bis<input name="endDate" type="date" value="' + h(existing?.endDate || selectedDate) + '"></label>' +
    (existing ? '<label>Beginn<input name="start" type="time" value="' + h(existing?.start || '') + '"></label>' +
      '<label>Ende<input name="end" type="time" value="' + h(existing?.end || '') + '"></label>' : '') +
    (existing ? '<details class="editor-more"><summary>Weitere Optionen · Titel, Person, Art</summary>' : '') +
    '<label class="wide">Termin<input name="title" maxlength="120" required placeholder="z. B. Elternabend" value="' +
    h(existing?.title || '') + '"></label>' +
    '<label>Person<select name="ownerId">' + householdMembers.map(member => '<option value="' + h(member.id) + '"' + ((existing?.ownerId || 'martin') === member.id ? ' selected' : '') + '>' + h(member.name) + '</option>').join('') + '</select></label>' +
    '<label class="wide">Art<select name="eventKind">' +
    [['event', 'Allgemeiner Termin'], ['birthday', 'Geburtstag'], ['school', 'Schule'], ['sport', 'Sport'], ['doctor', 'Arzt'], ['holiday', 'Urlaub'], ['task', 'Aufgabe']]
      .map(([value, label]) => '<option value="' + value + '"' +
        ((existing?.eventKind || 'event') === value ? ' selected' : '') + '>' + label + '</option>').join('') +
    '</select></label>' +
    (!existing ? '<label>Beginn<input name="start" type="time"></label><label>Ende<input name="end" type="time"></label>' : '') +
    '<label class="wide">Wiederholung<select name="recurrence">' +
    [['none', 'Keine'], ['daily', 'Täglich'], ['weekly', 'Wöchentlich'], ['monthly', 'Monatlich'], ['yearly', 'Jährlich']]
      .map(([value, label]) => '<option value="' + value + '"' +
        ((existing?.recurrence || 'none') === value ? ' selected' : '') + '>' + label + '</option>').join('') +
    '</select></label>' +
    (existing ? '</details>' : '') +
    '<div class="wide dialog-actions"><button type="button" id="day-dialog-cancel">Abbrechen</button>' +
    '<button class="primary">' + (existing ? 'Änderungen speichern' : 'Speichern') + '</button></div></form></section></div>';
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
    alert('Das Enddatum darf nicht vor dem Startdatum liegen.');
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
}

function shiftCaptureMarkup() {
  const current = new Date(shiftCaptureDate + 'T12:00:00');
  const label = current.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'});
  return '<section class="panel shift-capture"><h2>Schnellerfassung · ' + label + '</h2>' +
    '<label>Starttag wählen<input id="capture-date" type="date" value="' + h(shiftCaptureDate) + '"></label>' +
    '<p class="note">Ein Tipp speichert den Dienst und springt automatisch zum nächsten Tag. Am Monatsende wird die Eingabe beendet.</p>' +
    '<p class="shift-owner-label">Dienstplan für</p><div class="shift-owner">' +
    shiftMembers.map(member => '<button data-owner="' + h(member.id) + '" class="' +
      (shiftOwnerId === member.id ? 'selected' : '') + '">' + h(member.name) + '</button>').join('') +
    '</div>' +
    '<div class="shift-buttons">' +
    SHIFT_NAMES.map(name => '<button type="button" data-shift="' + h(name) + '"' + (shiftSavePending ? ' disabled' : '') + '>' + name + '</button>').join('') +
    '<button type="button" data-shift="skip"' + (shiftSavePending ? ' disabled' : '') + '>Frei</button>' +
    '<button type="button" data-shift="close">Beenden</button></div></section>';
}

let shiftSavePending = false;

function handleShiftChoice(choice) {
  if (choice === 'close') {
    shiftCaptureDate = null;
    render();
    return;
  }
  if (choice === 'skip') {
    advanceShiftCapture();
    return;
  }
  if (shiftSavePending) return;
  shiftSavePending = true;
  render();
  const [start, end] = shiftTimes(choice);
  const shiftOwner = shiftMembers.find(member => member.id === shiftOwnerId);
  if (!shiftOwner) {
    shiftSavePending = false;
    render();
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
    advanceShiftCapture();
  }, () => {
    shiftSavePending = false;
    render();
  });
}

function advanceShiftCapture() {
  const nextDate = nextShiftCaptureDate(shiftCaptureDate, month);
  shiftCaptureDate = nextDate;
  render();
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
    if (!cloud) save(entries);
    focusedDate = new Date(item.date + 'T12:00:00');
    month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
    render();
  } catch (err) {
    if (item.type === 'shift') shiftDialogEventId = item.id;
    render();
    alert('Änderung konnte nicht gespeichert werden: ' + err.message);
  }
}

async function saveEntry(item, afterSave, afterError) {
  try {
    if (cloud) await saveOwnerEvent(supabase, item, cloud.householdId, cloud.userId);
    entries.push(item);
    if (!cloud) save(entries);
    afterSave?.();
    render();
  } catch (err) {
    afterError?.();
    alert('Speichern fehlgeschlagen: ' + err.message);
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
window.__famschichtReady?.();
