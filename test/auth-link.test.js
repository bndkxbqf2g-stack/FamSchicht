import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLoginLink} from '../src/auth-link.js';

test('extracts a Supabase token hash from a copied magic link', () => {
  assert.deepEqual(
    parseLoginLink('https://kryxhpklrugceiwlrofm.supabase.co/auth/v1/verify?token=abc123&type=magiclink'),
    {kind: 'token_hash', value: 'abc123'}
  );
});

test('extracts a PKCE code from an authentication URL', () => {
  assert.deepEqual(
    parseLoginLink('https://bndkxbqf2g-stack.github.io/FamSchicht/?code=pkce123'),
    {kind: 'code', value: 'pkce123'}
  );
});

test('rejects malformed login links', () => {
  assert.equal(parseLoginLink('not-a-url'), null);
  assert.equal(parseLoginLink('https://example.com/'), null);
});
