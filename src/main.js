import {load, save} from './storage.js';
import {dateKey, SHIFT_NAMES, shiftTimes, nextShiftCaptureDate} from './dates.js';
import {escapeHtml as h, canSee} from './security.js';
import {generateCustodyDates, missingCustodyDates} from './custody.js';
import {supabase} from './auth.js';
import {
  calendarDates,
  calendarTitle,
  entriesForDay,
  entryOccursOnDate,
  eventTimeLabel,
  filterCalendarEntries,
  monthSummary,
  shiftCalendarDate,
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
let shiftOwner = 'Martin';
month.setDate(1);

const app = document.querySelector('#app');

async function connectCloud() {
  const {data} = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) {
    cloud = null;
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
    entries = load();
    render();
    return;
  }

  cloud = {householdId: homes[0].id, userId: user.id};
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
    {person: personFilter, category: categoryFilter},
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
    '</div><button id="go-today">Heute</button><button id="quick-event" class="primary">+ Termin</button><button id="shift-capture">+ Dienstplan</button></div></div>' +
    '<div class="calendar-summary"><span><strong>' + summary.total + '</strong> Einträge</span><span><strong>' + summary.family +
    '</strong> Familie</span><span><strong>' + summary.shifts + '</strong> Dienste</span></div>' +
    '<div class="calendar-filters"><div class="filter-group" aria-label="Personenfilter">' +
    [['all', 'Alle'], ['Martin', 'Martin'], ['Steffi', 'Steffi']].map(([id, label]) =>
      '<button data-person-filter="' + id + '" class="' + (personFilter === id ? 'active' : '') + '">' + label + '</button>').join('') +
    '</div><div class="filter-group" aria-label="Kategoriefilter">' +
    [['all', 'Alle'], ['family', 'Familie'], ['shift', 'Dienste']].map(([id, label]) =>
      '<button data-category-filter="' + id + '" class="' + (categoryFilter === id ? 'active' : '') + '">' +
      '<span class="filter-dot ' + id + '"></span>' + label + '</button>').join('') +
    '</div></div>' +
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
          .map(e => '<div class="entry ' + h(e.type) + (e.type === 'shift' ? ' owner-' + h(e.owner || 'unknown').toLowerCase() : '') + '" title="' + h(e.type === 'shift' ? (e.owner || 'Unbekannt') + ': ' + e.title : e.title) + '"' +
            (e.type === 'family' ? ' data-edit="' + h(e.id) + '"' : '') + '>' +
            (e.start ? '<span class="entry-time">' + h(e.start) + '</span>' : '') + h(e.title) +
            '<button data-remove="' + h(e.id) + '" aria-label="Eintrag löschen">×</button></div>')
          .join('') +
        '</div>'
      : '<div class="day empty" aria-hidden="true"></div>')
      .join('') +
    '</div><p class="calendar-hint">Tag antippen, um einen Termin einzutragen.</p></section>';

  const todayMarkup = todayOverviewMarkup(today);
  const body = view === 'today' ? todayMarkup : calendarMarkup;

  app.innerHTML =
    '<div class="familycal-shell">' +
    '<aside class="app-sidebar"><div class="brand"><span class="brand-mark">F</span><div><strong>FamSchicht</strong><small>Familienplaner</small></div></div>' +
    '<nav class="side-nav">' +
    [['all', '▦', 'Kalender'], ['today', '◷', 'Heute'], ['family', '⌂', 'Familie'], ['shift', '↔', 'Dienste']]
      .map(([id, icon, label]) => '<button data-view="' + id + '" class="' + (view === id ? 'active' : '') + '"><span>' + icon + '</span>' + label + '</button>')
      .join('') +
    '</nav><div class="sidebar-status"><span class="status-dot ' + (cloud ? 'online' : '') + '"></span>' +
    (cloud ? 'Synchronisiert' : 'Nur dieses Gerät') + '</div></aside>' +
    '<section class="app-workspace"><header class="app-topbar"><div><p class="eyebrow">Gemeinsamer Familienkalender</p><h1>' +
    (view === 'today' ? 'Heute' : view === 'shift' ? 'Dienstplan' : view === 'family' ? 'Familie' : 'Kalender') +
    '</h1></div><div class="member-legend"><span class="member martin">Martin</span><span class="member steffi">Steffi</span></div></header>' +
    body +
    (shiftCaptureDate ? shiftCaptureMarkup() : '') +
    (dayDialogDate ? dayDialogMarkup() : '') +
    (view === 'family' ? custodyMarkup() : '') +
    '</section></div>';

  bindControls();
}

function todayOverviewMarkup(today) {
  const items = entriesForDay(entries, today);
  const label = new Date(today + 'T12:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
  return '<section class="today-board"><div class="today-hero"><div><p class="eyebrow">' + label + '</p><h2>Was steht heute an?</h2></div>' +
    '<div class="today-actions"><button id="add-today" class="primary">+ Termin</button><button id="shift-capture">+ Dienstplan</button></div></div>' +
    '<div class="today-list">' +
    (items.length
      ? items.map(entry => '<article class="today-item ' + h(entry.type) + (entry.type === 'shift' ? ' owner-' + h(entry.owner || 'unknown').toLowerCase() : '') + '"' +
          (entry.type === 'family' ? ' data-edit="' + h(entry.id) + '"' : '') + '>' +
          '<time>' + h(eventTimeLabel(entry)) + '</time><div><strong>' + h(entry.title) + '</strong><small>' +
          h(entry.type === 'shift' ? (entry.owner || 'Nicht zugeordnet') : 'Familie') +
          '</small></div><button data-remove="' + h(entry.id) + '" aria-label="Eintrag löschen">×</button></article>').join('')
      : '<div class="empty-state"><strong>Heute ist noch nichts eingetragen.</strong><span>Termin oder Dienst direkt hinzufügen.</span></div>') +
    '</div></section>';
}

function custodyMarkup() {
  return '<section class="panel custody-card"><h2>Umgangsrhythmus</h2>' +
    '<p>Ersten Donnerstag festlegen; FamSchicht trägt danach jeden zweiten Donnerstag bis Sonntag für 12 Monate ein.</p>' +
    '<form id="custody-form"><label>Erster Donnerstag<input name="anchor" type="date" required></label>' +
    '<label>Bezeichnung<input name="title" value="Kinder bei Papa" required></label>' +
    '<button class="primary wide">Rhythmus eintragen</button></form></section>';
}

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
      render();
    };
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
      if (event.target.closest('[data-remove]')) return;
      focusedDate = new Date(day.dataset.day + 'T12:00:00');
      month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1, 12);
      openDayDialog(day.dataset.day);
    };
  });
  app.querySelector('#shift-capture')?.addEventListener('click', startShiftCapture);
  app.querySelectorAll('[data-owner]').forEach(button => {
    button.onclick = () => { shiftOwner = button.dataset.owner; render(); };
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
    element.onclick = event => {
      if (event.target.closest('[data-remove]')) return;
      event.stopPropagation();
      const item = entries.find(entry => entry.id === element.dataset.edit);
      if (item?.type === 'family') openDayDialog(item.date, item.id);
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

  app.querySelector('#custody-form')?.addEventListener('submit', handleCustodySubmit);
}

async function handleCustodySubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const anchor = formData.get('anchor');
  const title = String(formData.get('title')).trim();
  if (!title) {
    alert('Bitte eine Bezeichnung eingeben.');
    return;
  }

  let dates;
  try {
    dates = generateCustodyDates(anchor, 12);
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
    '<label class="wide">Termin<input name="title" maxlength="120" required autofocus placeholder="z. B. Elternabend" value="' +
    h(existing?.title || '') + '"></label>' +
    '<label>Beginn<input name="start" type="time" value="' + h(existing?.start || '') + '"></label>' +
    '<label>Ende<input name="end" type="time" value="' + h(existing?.end || '') + '"></label>' +
    '<label class="wide">Wiederholung<select name="recurrence">' +
    [['none', 'Keine'], ['daily', 'Täglich'], ['weekly', 'Wöchentlich'], ['monthly', 'Monatlich'], ['yearly', 'Jährlich']]
      .map(([value, label]) => '<option value="' + value + '"' +
        ((existing?.recurrence || 'none') === value ? ' selected' : '') + '>' + label + '</option>').join('') +
    '</select></label>' +
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
  };
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
  return '<section class="panel shift-capture"><h2>' + label + '</h2>' +
    '<p class="note">Ein Tipp speichert den Dienst und springt automatisch zum nächsten Tag. Am Monatsende wird die Eingabe beendet.</p>' +
    '<p class="shift-owner-label">Dienstplan für</p><div class="shift-owner"><button data-owner="Martin" class="' + (shiftOwner === 'Martin' ? 'selected' : '') + '">Martin</button>' +
    '<button data-owner="Steffi" class="' + (shiftOwner === 'Steffi' ? 'selected' : '') + '">Steffi</button></div>' +
    '<div class="shift-buttons">' +
    SHIFT_NAMES.map(name => '<button data-shift="' + name + '"' + (shiftSavePending ? ' disabled' : '') + '>' + name + '</button>').join('') +
    '<button data-shift="skip"' + (shiftSavePending ? ' disabled' : '') + '>Frei</button>' +
    '<button data-shift="close">Beenden</button></div></section>';
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
  void saveEntry({
    id: crypto.randomUUID(),
    type: 'shift',
    title: choice,
    date: shiftCaptureDate,
    start,
    end,
    owner: shiftOwner,
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
    alert('Änderung konnte nicht gespeichert werden: ' + err.message);
  }
}

async function saveEntry(item, afterSave, afterError) {
  try {
    if (cloud) await saveOwnerEvent(supabase, item, cloud.householdId, cloud.userId);
    entries.push(item);
    if (!cloud) save(entries);
    render();
    afterSave?.();
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
