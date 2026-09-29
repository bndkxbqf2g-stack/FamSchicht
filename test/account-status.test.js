import test from 'node:test';
import assert from 'node:assert/strict';
import {accountStatusText} from '../src/account-status.js';

test('account status does not claim a signed-in owner is local-only', () => {
  const status = accountStatusText();
  assert.match(status, /synchronisiert/);
  assert.doesNotMatch(status, /nur lokal gespeichert/);
});

test('invitation status remains the primary message across auth rerenders', () => {
  const status = 'Einladung angenommen. Dein Familienzugang ist vorbereitet.';
  assert.equal(accountStatusText({hasInvite: true, inviteStatus: status}), status);
  assert.match(accountStatusText({hasInvite: true}), /Einladung/);
});
