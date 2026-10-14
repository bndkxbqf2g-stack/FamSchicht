import {supabase} from './auth.js';
import {
  createHouseholdMember,
  memberColorOptions,
  memberInitials,
} from './household-members.js';
import {
  ensureOwnerHouseholdMembers,
  saveOwnerHouseholdMembers,
} from './household-member-service.js';
import {
  createHouseholdInvitation,
  revokeHouseholdInvitation,
} from './invitation-service.js';
import {buildInvitationLink} from './invitation-link.js';
import {invitationRevocationOutcome} from './invitation-ui.js';
import {escapeHtml} from './security.js';

const root = document.querySelector('#household');
let requestId = 0;
const memberTypeOptions = [
  ['adult', 'Erwachsene Person'],
  ['child', 'Kind'],
  ['guest', 'Gast'],
];

function message(text) {
  root.innerHTML = '<p class="note">' + escapeHtml(text) + '</p>';
}

function reportHouseholdError(context, error) {
  console.warn(context, error);
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

function optionMarkup(options, selected) {
  return options.map(([value, label]) =>
    '<option value="' + escapeHtml(value) + '"' + (value === selected ? ' selected' : '') + '>' +
    escapeHtml(label) + '</option>').join('');
}

function colorOptionsFor(member) {
  return memberColorOptions.some(([value]) => value === member.colorKey)
    ? memberColorOptions
    : [[member.colorKey, member.colorKey], ...memberColorOptions];
}

function memberManagementMarkup(members, errorMessage = '') {
  if (errorMessage) {
    return '<section class="member-management"><h3>Haushaltsmitglieder</h3><p class="note" role="alert">' +
      escapeHtml(errorMessage) + '</p></section>';
  }

  const rows = members.map((member, index) =>
    '<fieldset class="member-editor-row"><legend><span class="member-avatar ' + escapeHtml(member.colorKey) +
    '" aria-hidden="true">' + escapeHtml(memberInitials(member)) + '</span>' + escapeHtml(member.name) + '</legend>' +
    '<label>Name<input name="member-name-' + index + '" maxlength="80" required value="' + escapeHtml(member.name) + '"></label>' +
    '<label>Typ<select name="member-type-' + index + '">' + optionMarkup(memberTypeOptions, member.type) + '</select></label>' +
    '<label>Farbe<select name="member-color-' + index + '">' + optionMarkup(colorOptionsFor(member), member.colorKey) + '</select></label>' +
    '<label class="member-shift-toggle"><input name="member-shift-' + index + '" type="checkbox"' +
    (member.shiftEligible ? ' checked' : '') + '> Für Dienste auswählbar</label></fieldset>').join('');

  return '<section class="member-management"><h3>Haushaltsmitglieder</h3>' +
    '<p class="note">Kalenderpersonen bleiben vom Login getrennt. Nur der Owner kann Namen, Typ, Farbe und Dienstberechtigung ändern.</p>' +
    '<form id="household-members-form" class="member-editor-form">' + rows +
    '<button class="primary" type="submit">Änderungen speichern</button>' +
    '<p id="member-save-message" class="note" role="status"></p></form>' +
    '<form id="household-member-add-form" class="member-add-form">' +
    '<h4>Weitere Person hinzufügen</h4>' +
    '<label>Name<input name="name" maxlength="80" required placeholder="z. B. Kind oder Oma"></label>' +
    '<label>Typ<select name="type">' + optionMarkup(memberTypeOptions, 'child') + '</select></label>' +
    '<label>Farbe<select name="colorKey">' + optionMarkup(memberColorOptions, 'blue') + '</select></label>' +
    '<label class="member-shift-toggle"><input name="shiftEligible" type="checkbox"> Für Dienste auswählbar</label>' +
    '<button class="primary" type="submit">Person hinzufügen</button>' +
    '<p id="member-add-message" class="note" role="status"></p></form></section>';
}

function householdMarkup(household, members, memberError = '') {
  return '<p class="household-name">Dein Familienhaushalt: <strong>' +
    escapeHtml(household.name) + '</strong></p>' +
    '<p class="note">Kalendersynchronisierung bleibt bis zur geprüften Zugriffsfreigabe owner-only.</p>' +
    memberManagementMarkup(members, memberError) + invitationMarkup();
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
    reportHouseholdError('Haushalt konnte nicht geladen werden.', error);
    message('Datenbank derzeit nicht erreichbar. Der lokale Kalender bleibt verfügbar.');
    return;
  }
  if (data?.length) {
    const household = data[0];
    let members = [];
    let memberError = '';
    try {
      members = await ensureOwnerHouseholdMembers(supabase, household.id);
    } catch (memberLoadError) {
      console.warn('Haushaltsmitglieder konnten nicht geladen werden.', memberLoadError);
      memberError = 'Mitgliederverwaltung derzeit nicht erreichbar. Der Kalender bleibt owner-only.';
    }
    if (current !== requestId) return;
    root.innerHTML = householdMarkup(household, members, memberError);
    bindMemberForms(household.id, members, user);
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
    try {
      const {error: insertError} = await supabase.from('households')
        .insert({name, owner_id: user.id});
      if (insertError) {
        reportHouseholdError('Privater Haushalt konnte nicht erstellt werden.', insertError);
        form.querySelector('#household-message').textContent =
          'Privater Haushalt konnte derzeit nicht erstellt werden. Bitte später erneut versuchen.';
        button.disabled = false;
        return;
      }
    } catch (error) {
      reportHouseholdError('Privater Haushalt konnte nicht erstellt werden.', error);
      form.querySelector('#household-message').textContent =
        'Privater Haushalt konnte derzeit nicht erstellt werden. Bitte später erneut versuchen.';
      button.disabled = false;
      return;
    }
    window.dispatchEvent(new CustomEvent('famschicht:household-created'));
    void safeRefresh(user);
  };
}

function memberId() {
  return 'member-' + (globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
}

function bindMemberForms(householdId, members, user) {
  const form = root.querySelector('#household-members-form');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const messageEl = form.querySelector('#member-save-message');
    const data = new FormData(form);
    let updated;
    try {
      updated = members.map((member, index) => createHouseholdMember({
        id: member.id,
        name: String(data.get('member-name-' + index) || '').trim(),
        type: String(data.get('member-type-' + index) || member.type),
        colorKey: String(data.get('member-color-' + index) || member.colorKey),
        shiftEligible: data.get('member-shift-' + index) === 'on',
      }));
      button.disabled = true;
      messageEl.textContent = 'Mitglieder werden gespeichert …';
      const saved = await saveOwnerHouseholdMembers(supabase, updated, householdId);
      members.splice(0, members.length, ...saved);
      messageEl.textContent = 'Mitglieder gespeichert.';
      window.dispatchEvent(new CustomEvent('famschicht:household-members-changed'));
      void safeRefresh(user);
    } catch (error) {
      messageEl.textContent = error.message === 'member name is required'
        ? 'Bitte für jede Person einen Namen eingeben.'
        : 'Mitglieder konnten nicht gespeichert werden.';
    } finally {
      button.disabled = false;
    }
  });

  root.querySelector('#household-member-add-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const messageEl = form.querySelector('#member-add-message');
    const data = new FormData(form);
    try {
      const member = createHouseholdMember({
        id: memberId(),
        name: String(data.get('name') || '').trim(),
        type: String(data.get('type') || 'child'),
        colorKey: String(data.get('colorKey') || 'blue'),
        shiftEligible: data.get('shiftEligible') === 'on',
      });
      button.disabled = true;
      messageEl.textContent = 'Person wird gespeichert …';
      const saved = await saveOwnerHouseholdMembers(supabase, [...members, member], householdId);
      members.splice(0, members.length, ...saved);
      form.reset();
      messageEl.textContent = 'Person hinzugefügt.';
      window.dispatchEvent(new CustomEvent('famschicht:household-members-changed'));
      void safeRefresh(user);
    } catch (error) {
      messageEl.textContent = error.message === 'member name is required'
        ? 'Bitte einen Namen eingeben.'
        : 'Person konnte nicht hinzugefügt werden.';
    } finally {
      button.disabled = false;
    }
  });
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
      const link = buildInvitationLink(window.location.href, result.token);
      form.querySelector('.invitation-result')?.remove();
      messageEl.textContent = 'Einladung erstellt. Teile diesen persönlichen Link nur mit der eingeladenen Person.';
      const resultBox = document.createElement('div');
      resultBox.className = 'invitation-result';
      resultBox.innerHTML = '<label class="wide">Persönlicher Einladungslink<input class="invitation-link" readonly value="' +
        escapeHtml(link.href) + '"></label><button type="button" class="copy-invitation">Link kopieren</button>' +
        (result.expiresAt ? '<span class="note">Gültig bis ' + escapeHtml(new Date(result.expiresAt).toLocaleDateString('de-DE')) + '.</span>' : '') +
        (result.invitationId ? '<button type="button" class="revoke-invitation">Einladung widerrufen</button>' : '');
      form.append(resultBox);
      resultBox.querySelector('.copy-invitation').onclick = async () => {
        try {
          await navigator.clipboard.writeText(link.href);
          resultBox.querySelector('.copy-invitation').textContent = 'Kopiert';
        } catch {
          resultBox.querySelector('.copy-invitation').textContent = 'Bitte Link manuell kopieren';
        }
      };
      resultBox.querySelector('.revoke-invitation')?.addEventListener('click', async event => {
        const revokeButton = event.currentTarget;
        revokeButton.disabled = true;
        messageEl.textContent = 'Einladung wird widerrufen …';
        try {
          const revokeResult = await revokeHouseholdInvitation(supabase, result.invitationId);
          const outcome = invitationRevocationOutcome(revokeResult);
          if (!outcome.revoked) {
            messageEl.textContent = outcome.message;
            revokeButton.disabled = false;
            return;
          }
          resultBox.remove();
          messageEl.textContent = outcome.message;
        } catch (error) {
          messageEl.textContent = error.message || 'Einladung konnte nicht widerrufen werden.';
          revokeButton.disabled = false;
        }
      });
      form.reset();
    } catch (error) {
      messageEl.textContent = error.message || 'Einladung konnte nicht erstellt werden.';
    } finally {
      button.disabled = false;
    }
  };
}

async function safeRefresh(user) {
  try {
    await refresh(user);
  } catch (error) {
    console.warn('Haushalt konnte nicht geladen werden; lokaler Modus bleibt aktiv.', error);
    message(user
      ? 'Haushalt derzeit nicht erreichbar. Der lokale Kalender bleibt verfügbar.'
      : 'Melde dich an, um deinen privaten Familienhaushalt einzurichten.');
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  // Do not await Supabase queries inside the auth callback.
  void safeRefresh(session?.user || null);
});
void supabase.auth.getUser()
  .then(({data}) => safeRefresh(data?.user || null))
  .catch(error => {
    console.warn('Haushalt konnte nicht geprüft werden; lokaler Modus bleibt aktiv.', error);
    void safeRefresh(null);
  });
