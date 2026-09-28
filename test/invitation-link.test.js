import test from 'node:test';
import assert from 'node:assert/strict';
import {clearInvitationParam} from '../src/invitation-link.js';

test('clearing an invite keeps auth callback parameters and hash', () => {
  assert.equal(
    clearInvitationParam('https://example.test/?invite=secret&code=abc#access_token=xyz'),
    '/?code=abc#access_token=xyz',
  );
});

test('clearing an invite is idempotent', () => {
  assert.equal(clearInvitationParam('https://example.test/?code=abc'), '/?code=abc');
});
