import {supabase} from './auth.js';
import {createHouseholdInvitation} from './invitation-service.js';
import {escapeHtml} from './security.js';

const root = document.querySelector('#household');
let requestId = 0;

function message(text) {
  root.innerHTML = '<p class="note">' + escapeHtml(text) + '</p>';
}

function invitationMarkup() {
  return `
    <div class="invitation-panel">
      <div>
        <h3>Familie einladen</h3>
        <p class="note">Die Einladung ist sieben Tage gültig und kann nur von der angegebenen E-Mail-Adresse angenommen werden.</p>
      </div>
      <form id="invitation-form" class="invitation-form">
        <label class="wide">E-Mail-Adresse
          <input name="email" type="email" autocomplete="email" required placeholder="name@beispiel.de">
        </label>
        <label>Rolle
          <select name="role">
            <option value="partner">Partner/in</option>
            <option value="coparent">Coparent</option>
          </select>
        </label>
        <button class="primary" type="submit">Einladung erstellen</button>
        <p id="invitation-message" class="note wide" aria-live="polite"></p>
      </form>
    </div>`;
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
    const household = data[0];
    root.innerHTML = '<p class="household-name">Dein Familienhaushalt: <strong>' +
      escapeHtml(household.name) + '</strong></p>' +
      '<p class="note">Kalendersynchronisierung bleibt bis zur geprüften Zugriffsfreigabe owner-only.</p>' +
      invitationMarkup();
    bindInvitationForm(household.id);
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
    window.dispatchEvent(new CustomEvent('famschicht:household-created'));
    refresh(user);
  };
}

function bindInvitationForm(householdId) {
  const form = root.querySelector('#invitation-form');
  const messageEl = root.querySelector('#invitation-message');
  form.onsubmit = async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    const email = String(new FormData(form).get('email') || '').trim();
    const role = String(new FormData(form).get('role') || '');
    button.disabled = true;
    messageEl.textContent = 'Einladung wird sicher erstellt …';
    try {
      const result = await createHouseholdInvitation(supabase, {
        householdId,
        email,
        role,
      });
      const link = new URL(window.location.href);
      link.searchParams.set('invite', result.token);
      messageEl.textContent = 'Einladung erstellt. Teile diesen persönlichen Link nur mit der eingeladenen Person.';
      const resultBox = document.createElement('div');
      resultBox.className = 'invitation-result';
      resultBox.innerHTML = '<label class="wide">Persönlicher Einladungslink<input class="invitation-link" readonly value="' +
        escapeHtml(link.href) + '"></label><button type="button" class="copy-invitation">Link kopieren</button>' +
        (result.expiresAt ? '<span class="note">Gültig bis ' + escapeHtml(new Date(result.expiresAt).toLocaleDateString('de-DE')) + '.</span>' : '');
      form.append(resultBox);
      resultBox.querySelector('.copy-invitation').onclick = async () => {
        try {
          await navigator.clipboard.writeText(link.href);
          resultBox.querySelector('.copy-invitation').textContent = 'Kopiert';
        } catch {
          resultBox.querySelector('.copy-invitation').textContent = 'Bitte Link manuell kopieren';
        }
      };
      form.reset();
    } catch (error) {
      messageEl.textContent = error.message || 'Einladung konnte nicht erstellt werden.';
    } finally {
      button.disabled = false;
    }
  };
}

supabase.auth.onAuthStateChange((_event, session) => {
  // Do not await Supabase queries inside the auth callback.
  void refresh(session?.user || null);
});
void supabase.auth.getUser().then(({data}) => refresh(data?.user || null));
