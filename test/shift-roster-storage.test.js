import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadShiftRosters,
  replaceShiftRosterMonth,
  saveShiftRosters,
} from '../src/shift-roster-storage.js';

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem() { return value; },
    setItem(_key, next) { value = next; },
    value() { return value; },
  };
}

test('shift roster storage round-trips a month through device storage', () => {
  const storage = memoryStorage();
  const roster = {month:'2026-11', entries:[{name:'Person Beispiel', date:'2026-11-02', code:'F1'}]};
  saveShiftRosters([roster], storage);
  assert.deepEqual(loadShiftRosters(storage), [roster]);
});

test('reimport replaces only the same month and keeps other months ordered', () => {
  const older = {month:'2026-10', entries:[]};
  const current = {month:'2026-11', entries:[{name:'Alt Beispiel', date:'2026-11-02', code:'S1'}]};
  const replacement = {month:'2026-11', entries:[{name:'Neu Beispiel', date:'2026-11-02', code:'F1'}]};
  assert.deepEqual(replaceShiftRosterMonth([current, older], replacement), [older, replacement]);
});

test('malformed device storage is treated as an empty roster list', () => {
  assert.deepEqual(loadShiftRosters(memoryStorage('{')), []);
});

test('invalid roster payloads are rejected before saving', () => {
  assert.throws(() => saveShiftRosters([{month:'2026-13', entries:[]}], memoryStorage()), /ungültige Daten/);
});
