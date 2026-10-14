import test from 'node:test';
import assert from 'node:assert/strict';
import {loadState, save} from '../src/storage.js';

function storageWith(value) {
  let current = value;
  return {
    getItem() { return current; },
    setItem(_key, next) { current = next; },
  };
}

test('local storage reports empty and loaded states without changing event data', () => {
  const storage = storageWith(null);
  assert.deepEqual(loadState(storage), {events: [], status: 'empty'});
  save([{id: 'synthetic-1', title: 'Synthetischer Termin'}], storage);
  assert.deepEqual(loadState(storage), {
    events: [{id: 'synthetic-1', title: 'Synthetischer Termin'}],
    status: 'loaded',
  });
});

test('local storage exposes corrupt and unavailable states for recovery UI', () => {
  assert.deepEqual(loadState(storageWith('{not-json')), {events: [], status: 'corrupt'});
  assert.deepEqual(loadState(null), {events: [], status: 'unavailable'});
});

test('local storage keeps write failures actionable', () => {
  const storage = {getItem() { return null; }, setItem() { throw new Error('quota'); }};
  assert.throws(() => save([], storage), /JSON-Sicherung/);
});

