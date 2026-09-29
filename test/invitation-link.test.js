import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInvitationLink, clearInvitationParam} from '../src/invitation-link.js';

test('clearing an invite keeps auth callback parameters and hash', () => {
  assert.equal(
    clearInvitationParam('https://example.test/?invite=secret&code=abc#access_token=xyz'),
    '/?code=abc#access_token=xyz',
  );
});

test('clearing an invite is idempotent', () => {
  assert.equal(clearInvitationParam('https://example.test/?code=abc'), '/?code=abc');
});


test('invitation link strips auth callback and existing URL secrets', () => {
  const link = buildInvitationLink(
    'https://example.test/FamSchicht/?code=auth-code&invite=old#access_token=secret',
    'new-token',
  );
  assert.equal(link.href, 'https://example.test/FamSchicht/?invite=new-token');
});
