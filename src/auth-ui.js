import {supabase,sendLoginLink,signOut} from './auth.js';
import {acceptHouseholdInvitation} from './invitation-service.js';
import {clearInvitationParam} from './invitation-link.js';
import {accountStatusText} from './account-status.js';
import {escapeHtml} from './security.js';

const root = document.querySelector('#auth');
const COOLDOWN_MS = 5 * 60 * 1000;
const pendingInvite = new URLSearchParams(window.location.search).get('invite');
let lastRequest = 0;
let inviteHandled = false;
let inviteStatus = '';

function showInviteMessage(text) {
  inviteStatus = text;
  const message = root.querySelector('#account-status');
  if (message) message.textContent = text;
}

async function acceptPendingInvitation(user) {
  if (!user || !pendingInvite || inviteHandled) return;
  inviteHandled = true;
  try {
    await acceptHouseholdInvitation(supabase, pendingInvite);
    const cleanUrl = clearInvitationParam(window.location.href);
    window.history.replaceState({}, '', cleanUrl);
    showInviteMessage('Einladung angenommen. Dein Familienzugang ist vorbereitet.');
  } catch {
    showInviteMessage('Einladung konnte nicht angenommen werden. Prüfe den Link oder melde dich mit der eingeladenen E-Mail-Adresse an.');
  }
}

function show(user) {
  if (!root) return;
  if (user) {
    root.innerHTML = `<div class="auth-status">Angemeldet: <strong>${escapeHtml(user.email || 'Konto')}</strong>
      <button id="logout">Abmelden</button>
      <p id="account-status" class="note" aria-live="polite">${escapeHtml(accountStatusText({hasInvite: Boolean(pendingInvite), inviteStatus}))}</p></div>`;
    root.querySelector('#logout').onclick = async () => {
      const {error} = await signOut();
      if (error) alert(error.message);
    };
    void acceptPendingInvitation(user);
    return;
  }
  root.innerHTML = `<form id="login">
    <label>E-Mail für deinen persönlichen Anmeldelink
      <input type="email" name="email" autocomplete="email" required>
    </label>
    <button class="primary">Anmeldelink senden</button>
    <p id="login-message" class="note" aria-live="polite">
      Falls du bereits angemeldet bist, brauchst du keinen neuen Link.
      ${escapeHtml(accountStatusText({hasInvite: Boolean(pendingInvite), inviteStatus}))}
    </p>
  </form>`;
  const form = root.querySelector('#login');
  form.onsubmit = async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    const msg = form.querySelector('#login-message');
    if (Date.now() - lastRequest < COOLDOWN_MS) {
      msg.textContent = 'Bitte warte einige Minuten, bevor du erneut einen Link anforderst.';
      return;
    }
    button.disabled = true;
    const email = String(new FormData(form).get('email') || '').trim();
    try {
      const {error} = await sendLoginLink(email);
      if (error) {
        const limited = error.status === 429 || /rate limit/i.test(error.message);
        msg.textContent = limited
          ? 'Supabase hat das E-Mail-Limit erreicht. Bitte später erneut versuchen. Mehrfaches Klicken hilft nicht.'
          : 'Anmeldung derzeit nicht möglich: ' + error.message;
        if (limited) lastRequest = Date.now();
      } else {
        lastRequest = Date.now();
        msg.textContent = 'Anmeldelink angefordert. Bitte prüfe dein Postfach und auch den Spam-Ordner.';
      }
    } catch {
      msg.textContent = 'Verbindungsfehler. Bitte später erneut versuchen.';
    } finally {
      button.disabled = false;
    }
  };
}
supabase.auth.onAuthStateChange((_event, session) => show(session?.user));
void supabase.auth.getUser().then(({data, error}) => {
  if (error) console.warn('Auth session:', error.message);
  show(data?.user);
});
