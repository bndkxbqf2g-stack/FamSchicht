import test from 'node:test';
import assert from 'node:assert/strict';
import {
  displayModeOptions,
  isWallMode,
  loadDisplayMode,
  saveDisplayMode,
} from '../src/display-preferences.js';

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

test('display mode defaults to standard and persists locally', () => {
  const storage = fakeStorage();
  assert.equal(loadDisplayMode(storage), 'standard');
  assert.equal(saveDisplayMode('wall', storage), 'wall');
  assert.equal(loadDisplayMode(storage), 'wall');
  assert.equal(isWallMode(loadDisplayMode(storage)), true);
});

test('display mode options expose a safe standard fallback and wall mode', () => {
  const storage = fakeStorage();
  assert.deepEqual(displayModeOptions(), [['standard', 'Standard'], ['wall', 'Wandmodus']]);
  assert.throws(() => saveDisplayMode('unknown', storage), /unsupported display mode/);
  assert.equal(loadDisplayMode(storage), 'standard');
  assert.equal(isWallMode('standard'), false);
});

