import test from 'node:test';
import assert from 'node:assert/strict';
import {userError} from '../src/user-error.js';

test('keeps short domain validation messages user-facing', () => {
  assert.equal(
    userError(new Error('Bitte wähle einen gültigen Zeitraum.'), 'Sichere Fehlermeldung.'),
    'Bitte wähle einen gültigen Zeitraum.',
  );
});

test('hides technical transport and database details behind the fallback', () => {
  for (const message of [
    'PostgREST: permission denied for relation calendar_events',
    'Failed to fetch https://example.invalid',
    'JWT expired while calling Supabase RPC',
    'row-level security policy rejected the request',
    'duplicate key value violates unique constraint calendar_events_pkey',
    'column owner_id does not exist (status code 500)',
  ]) {
    assert.equal(userError(new Error(message), 'Änderung konnte nicht gespeichert werden.'),
      'Änderung konnte nicht gespeichert werden.');
  }
});

test('uses the fallback for missing and oversized errors', () => {
  const fallback = 'Vorgang konnte nicht abgeschlossen werden.';
  assert.equal(userError(null, fallback), fallback);
  assert.equal(userError(new Error('x'.repeat(241)), fallback), fallback);
});

