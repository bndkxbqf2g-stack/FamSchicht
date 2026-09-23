import {supabase} from './auth.js';
import {escapeHtml} from './security.js';

const root = document.querySelector('#household');
let requestId = 0;

function message(text) {
  root.innerHTML = '<p class="note">' + escapeHtml(text) + '</p>';
}

async function refresh(user) {
  const current = ++requestId;
  if (!user) {
    message('Melde dich an, um deinen privaten Familienhaushalt einzurichten.');
    return;
  }
  message('Familienhaushalt wird geprüft …');
  const {data, error} = await supabase
    .from('households')
    .select('id,name')
    .eq('owner_id', user.id)
    .limit(1);
  if (current !== requestId) return;
  if (error) {
    message('Datenbank derzeit nicht erreichbar: ' + error.message);
    return;
  }
  if (data?.length) {
    root.innerHTML = '<p>Dein Familienhaushalt: <strong>' +
      escapeHtml(data[0].name) + '</strong></p>' +
      '<p class="note">Noch keine automatische Kalender-Synchronisierung. ' +
      'Einladungen folgen erst nach Prüfung der Zugriffsrechte.</p>';
    return;
  }
  root.innerHTML = `<form id="household-form">
    <label>Name deines Familienkalenders
      <input name="name" maxlength="80" required value="Unser Familienkalender">
    </label>
    <button class="primary">Privaten Haushalt erstellen</button>
    <p class="note" id="household-message">Zunächst hast ausschließlich du Zugriff.</p>
  </form>`;
  const form = root.querySelector('#household-form');
  form.onsubmit = async event => {
    event.preventDefault();
    const name = String(new FormData(form).get('name') || '').trim();
    if (!name) return;
    const button = form.querySelector('button');
    button.disabled = true;
    const {error: insertError} = await supabase.from('households')
      .insert({name, owner_id: user.id});
    if (insertError) {
      form.querySelector('#household-message').textContent =
        'Erstellung fehlgeschlagen: ' + insertError.message;
      button.disabled = false;
      return;
    }
    refresh(user);
  };
}

supabase.auth.onAuthStateChange((_event, session) => {
  // Do not await Supabase queries inside the auth callback.
  void refresh(session?.user || null);
});
void supabase.auth.getUser().then(({data}) => refresh(data?.user || null));
