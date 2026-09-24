import {load, save} from './storage.js';
import {dateKey, calendarDays, shiftTimes} from './dates.js';
import {escapeHtml as h, canSee} from './security.js';
import {generateCustodyDates, missingCustodyDates} from './custody.js';
import {supabase} from './auth.js';
import {
  loadOwnerEvents,
  saveOwnerEvent,
  saveOwnerEvents,
  deleteOwnerEvent,
} from './calendar-service.js';
import './styles.css';

let entries = load();
let month = new Date();
let view = 'all';
let cloud = null;
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
  const days = calendarDays(month);
  app.innerHTML =
    '<header><h1>FamSchicht</h1><p>Familie und Uni im Blick</p></header>' +
    '<nav>' +
    [['all', 'Gesamt'], ['family', 'Familie'], ['shift', 'Schichten']]
      .map(([id, label]) => '<button data-view="' + id + '" class="' + (view === id ? 'active' : '') + '">' + label + '</button>')
      .join('') +
    '</nav>' +
    '<section class="panel"><div class="month"><button id="prev">‹</button><h2>' +
    month.toLocaleDateString('de-DE', {month: 'long', year: 'numeric'}) +
    '</h2><button id="next">›</button></div><div class="calendar">' +
    ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => '<b>' + d + '</b>').join('') +
    days.map(day => day
      ? '<div class="day ' + (day === dateKey(new Date()) ? 'today' : '') + '"><b>' +
        Number(day.slice(-2)) + '</b>' +
        entries.filter(e => e.date === day && canSee(e, view))
          .map(e => '<div class="entry ' + h(e.type) + '">' + h(e.title) +
            (e.start ? ' · ' + h(e.start) : '') +
            '<button data-remove="' + h(e.id) + '" aria-label="Eintrag löschen">×</button></div>')
          .join('') +
        '</div>'
      : '<div></div>')
      .join('') +
    '</div></section>' +
    '<section class="panel"><h2>Neuer Eintrag</h2><form id="entry-form">' +
    '<label>Kalender<select name="type" id="type"><option value="family">Familie</option><option value="shift">Schichten</option></select></label>' +
    '<label>Datum<input type="date" name="date" value="' + dateKey(new Date()) + '" required></label>' +
    '<label class="wide">Termin oder Schicht<input name="title" id="title" required placeholder="z. B. Fußball Levin"></label>' +
    '<label>Beginn<input type="time" name="start"></label><label>Ende<input type="time" name="end"></label>' +
    '<button class="primary wide">Speichern</button></form></section>' +
    '<section class="panel"><h2>Umgangsrhythmus</h2>' +
    '<p>Wähle den ersten Donnerstag, an dem die Kinder bei dir sind. Der Kalender erzeugt dann für 12 Monate jeden zweiten Donnerstag bis Sonntag einen Eintrag. Prüfe die Vorschau vor dem Speichern.</p>' +
    '<form id="custody-form"><label>Erster Donnerstag<input name="anchor" type="date" required></label>' +
    '<label>Bezeichnung<input name="title" value="Kinder bei Papa" required></label>' +
    '<button class="primary wide">Rhythmus eintragen</button></form></section>' +
    '<section class="panel"><p class="note">Angemeldet werden Kalenderdaten synchronisiert. Ohne Anmeldung bleiben Einträge nur auf diesem Gerät.</p></section>';

  bindControls();
}

function bindControls() {
  app.querySelector('#prev').onclick = () => {
    month.setMonth(month.getMonth() - 1);
    render();
  };
  app.querySelector('#next').onclick = () => {
    month.setMonth(month.getMonth() + 1);
    render();
  };
  app.querySelectorAll('[data-view]').forEach(button => {
    button.onclick = () => {
      view = button.dataset.view;
      render();
    };
  });
  app.querySelectorAll('[data-remove]').forEach(button => {
    button.onclick = async () => {
      if (!confirm('Eintrag löschen?')) return;
      const id = button.dataset.remove;
      try {
        if (cloud) await deleteOwnerEvent(supabase, id);
        entries = entries.filter(entry => entry.id !== id);
        if (!cloud) save(entries);
        render();
      } catch (err) {
        alert('Löschen fehlgeschlagen: ' + err.message);
      }
    };
  });

  app.querySelector('#type').onchange = event => {
    const form = app.querySelector('#entry-form');
    if (event.target.value === 'shift') {
      form.querySelector('#title').outerHTML =
        '<select name="title" id="title">' +
        Object.keys({Frühdienst: 1, Spätdienst: 1, Nachtdienst: 1})
          .map(name => '<option>' + name + '</option>').join('') +
        '</select>';
      form.querySelector('#title').onchange = () => fill(form);
      fill(form);
    } else {
      form.querySelector('#title').outerHTML =
        '<input name="title" id="title" required placeholder="z. B. Fußball Levin">';
      form.elements.start.value = '';
      form.elements.end.value = '';
    }
  };

  app.querySelector('#custody-form').onsubmit = handleCustodySubmit;
  app.querySelector('#entry-form').onsubmit = handleEntrySubmit;
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
  view = 'family';
  render();
}

async function handleEntrySubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const item = Object.fromEntries(formData);
  item.id = crypto.randomUUID();

  try {
    if (cloud) await saveOwnerEvent(supabase, item, cloud.householdId, cloud.userId);
    entries.push(item);
    if (!cloud) save(entries);
    month = new Date(item.date + 'T12:00:00');
    month.setDate(1);
    render();
  } catch (err) {
    alert('Speichern fehlgeschlagen: ' + err.message);
  }
}

function fill(form) {
  const [start, end] = shiftTimes(form.elements.title.value);
  form.elements.start.value = start;
  form.elements.end.value = end;
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
