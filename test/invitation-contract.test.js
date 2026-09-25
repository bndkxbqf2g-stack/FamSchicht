import test from 'node:test';
import assert from 'node:assert/strict';
import {
  invitationAcceptance,
  invitationRequest,
  normalizeInvitationEmail,
  validateInvitationRole,
} from '../src/invitation-contract.js';

test('invitation request normalizes recipient email and preserves allowed role', () => {
  assert.deepEqual(invitationRequest({
    householdId: 'house-1',
    email: ' Steffi@Example.DE ',
    role: 'partner',
  }), {
    householdId: 'house-1',
    email: 'steffi@example.de',
    role: 'partner',
  });
});

test('coparent is an explicit invitible role while owner cannot be invited', () => {
  assert.equal(validateInvitationRole('coparent'), 'coparent');
  assert.throws(() => validateInvitationRole('owner'), /unsupported invitation role/);
  assert.throws(() => validateInvitationRole('admin'), /unsupported invitation role/);
});

test('malformed invitation email is rejected before server submission', () => {
  assert.throws(() => normalizeInvitationEmail('not-an-email'), /valid invitation email/);
  assert.throws(() => normalizeInvitationEmail('a @example.de'), /valid invitation email/);
});

test('acceptance treats token as opaque bearer secret', () => {
  const token = 'AbCdEf0123456789_-AbCdEf0123456789_-';
  assert.deepEqual(invitationAcceptance({token}), {token});
  assert.throws(() => invitationAcceptance({token: 'short'}), /valid invitation token/);
  assert.throws(
    () => invitationAcceptance({token: 'A'.repeat(31) + ' bad'}),
    /valid invitation token/,
  );
});
