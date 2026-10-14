import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSyncState,
  syncStatusClass,
  syncStatusLabel,
} from '../src/sync-status.js';

test('sync status normalizes unknown states to local mode', () => {
  assert.equal(normalizeSyncState('unexpected'), 'local');
  assert.equal(syncStatusLabel('unexpected'), 'Nur dieses Gerät');
  assert.equal(syncStatusClass('unexpected'), 'sync-local');
});

test('sync status exposes clear labels and visual classes', () => {
  assert.equal(syncStatusLabel('connecting'), 'Synchronisierung läuft …');
  assert.equal(syncStatusLabel('synced'), 'Synchronisiert');
  assert.equal(syncStatusLabel('offline'), 'Offline · Nur dieses Gerät');
  assert.equal(syncStatusLabel('error'), 'Synchronisierung fehlgeschlagen · Lokal verfügbar');
  assert.equal(syncStatusClass('synced'), 'online');
  assert.equal(syncStatusClass('connecting'), 'sync-connecting');
  assert.equal(syncStatusClass('offline'), 'sync-offline');
  assert.equal(syncStatusClass('error'), 'sync-error');
});
