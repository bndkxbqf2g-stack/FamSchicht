import {supabase,sendLoginLink,signOut} from './auth.js';
import {escapeHtml} from './security.js';

const root = document.querySelector('#auth');
const COOLDOWN_MS = 5 * 60 * 1000;
let lastRequest = 0;

function show(user) {
  if (!root) return;
  if (user) {
    root.innerHTML = `<div class="auth-status">Angemeldet: <strong>${escapeHtml(user.email || 'Konto')}</strong>
      <button id="logout">Abmelden</button>
      <p class="note">Kalendereinträge sind weiterhin nur lokal gespeichert.</p></div>`;
    root.querySelector('#logout').onclick = async () => {
      const {error} = await signOut();
      if (error) alert(error.message);
    };
    return;
  }
  root.innerHTML = `<form id="login">
    <label>E-Mail für deinen persönlichen Anmeldelink
      <input type="email" name="email" autocomplete="email" required>
    </label>
    <button class="primary">Anmeldelink senden</button>
    <p id="login-message" class="note" aria-live="polite">
      Falls du bereits angemeldet bist, brauchst du keinen neuen Link.
      Deine persönlichen Termine werden noch nicht synchronisiert.
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
