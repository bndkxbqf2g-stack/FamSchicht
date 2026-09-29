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
import './styles.css';

let entries = load();
let month = new Date();
let focusedDate = new Date();
let calendarMode = 'month';
let view = 'all';
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
  const visibleEntries = filterCalendarEntries(
    entries.filter(entry => canSee(entry, view)),
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
          .map(e => '<div class="entry ' + h(e.type) + ' owner-' + h(entryOwnerStyleKey(e, householdMemberNames)) + (e.type === 'shift' ? '' : ' ' + h(e.eventKind || 'event')) + '" title="' + h(e.type === 'shift' ? (shiftOwnerDisplayName(e, householdMemberNames) || 'Unbekannt') + ': ' + e.title : e.title) + '"' +
            ' data-edit="' + h(e.id) + '" role="button" tabindex="0" aria-label="' + h(e.title) + ' bearbeiten">' +
            (e.start ? '<span class="entry-time">' + h(e.start) + '</span>' : '') +
            '<span class="entry-label">' + h(calendarMode === 'month' ? (e.type === 'shift' ? shiftShortLabel(e.title) : e.source === 'custody' ? 'Papa' : e.title) : e.title) + '</span>' +
            '<button data-remove="' + h(e.id) + '" aria-label="Eintrag löschen">×</button></div>')
          .join('') +
        '</div>'
      : '<div class="day empty" aria-hidden="true"></div>')
      .join('') +
    '</div><div class="selected-day"><strong>' + h(focusedDate.toLocaleDateString('de-DE', {weekday:'long',day:'2-digit',month:'long'})) + '</strong>' +
    (visibleEntriesForDay(visibleEntries, dateKey(focusedDate)).map(e => '<button type="button" data-edit="' + h(e.id) + '"><span class="day-dot owner-' + h(entryOwnerStyleKey(e, householdMemberNames)) + '"></span>' + h(e.title) + (e.start ? ' · ' + h(e.start) : '') + '</button>').join('') || '<span>Keine Einträge</span>') + '</div></section>';

  const todayMarkup = todayOverviewMarkup(today);
  const body = view === 'today' ? todayMarkup :
    (view === 'shift' && shiftCaptureDate ? shiftCaptureMarkup() : '') + calendarMarkup;

  app.innerHTML =
    '<div class="familycal-shell view-' + h(view) + '">' +
    '<aside class="app-sidebar"><div class="brand"><span class="brand-mark">F</span><div><strong>FamSchicht</strong><small>Familienplaner · v0.3.0</small></div></div>' +
    '<nav class="side-nav">' +
    [['all', '▦', 'Kalender'], ['today', '◷', 'Heute'], ['family', '⌂', 'Familie'], ['shift', '↔', 'Dienste'], ['settings', '⚙', 'Einstellungen']]
      .map(([id, icon, label]) => '<button data-view="' + id + '" class="' + (view === id ? 'active' : '') + '"><span>' + icon + '</span>' + label + '</button>')
      .join('') +
    '</nav><div class="sidebar-status"><span class="status-dot ' + (cloud ? 'online' : '') + '"></span>' +
    (cloud ? 'Synchronisiert' : 'Nur dieses Gerät') + '</div></aside>' +
    '<section class="app-workspace"><header class="app-topbar"><div><p class="eyebrow">Gemeinsamer Familienkalender</p><h1>' +
    (view === 'today' ? 'Heute' : view === 'shift' ? 'Dienstplan' : view === 'family' ? 'Familie' : 'Kalender') +
    '</h1></div><div class="member-legend">' +
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

function todayOverviewMarkup(today) {
  const items = visibleEntriesForDay(entries, today, {
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
          ' data-edit="' + h(entry.id) + '" role="button" tabindex="0">' +
          '<time>' + h(eventTimeLabel(entry)) + '</time><div><strong>' + h(entry.title) + '</strong><small>' +
          h(entry.type === 'shift' ? (shiftOwnerDisplayName(entry, householdMemberNames) || 'Nicht zugeordnet') : 'Familie') +
          '</small></div><button data-remove="' + h(entry.id) + '" aria-label="Eintrag löschen">×</button></article>').join('')
      : '<div class="empty-state"><strong>Heute ist noch nichts eingetragen.</strong><span>Termin direkt hinzufügen.</span></div>') +
    '</div></section>';
}

function custodyMarkup() {
  return '<section class="panel custody-card"><h2>Umgangsrhythmus</h2>' +
    '<p>Start- und Endtag frei wählen; standardmäßig Freitag bis Sonntag. Danach wird der Rhythmus alle 14 Tage für 12 Monate eingetragen. Einzelne Wochenenden kannst du anschließend im Kalender verschieben.</p>' +
    '<form id="custody-form"><label>Erster Tag<input name="anchor" type="date" required></label><label>Letzter Tag<input name="endAnchor" type="date" required></label>' +
    '<label>Bezeichnung<input name="title" value="Kinder bei Papa" required></label>' +
    '<button class="primary wide">Rhythmus eintragen</button></form></section>';
}

const shiftAbbreviations = {
  'Frühdienst': 'F', 'Spätdienst': 'S', 'Zwischendienst': 'Z',
  'Nachtdienst': 'N', 'SG-Tag': 'SG', 'Urlaub': 'U', 'Fortbildung': 'FB',
};
function shiftShortLabel(title) { return shiftAbbreviations[title] || title; }

function bindControls() {
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
void connectCloud();
supabase.auth.onAuthStateChange(() => {
  void connectCloud();
});
window.addEventListener('famschicht:household-created', () => {
  void connectCloud();
});
window.__famschichtReady?.();
