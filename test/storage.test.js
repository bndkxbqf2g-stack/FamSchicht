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
  save([{id: 'synthetic-1', type: 'family', title: 'Synthetischer Termin', date: '2026-10-14'}], storage);
  assert.deepEqual(loadState(storage), {
    events: [{id: 'synthetic-1', type: 'family', title: 'Synthetischer Termin', date: '2026-10-14'}],
    status: 'loaded',
  });
});

test('local storage exposes corrupt and unavailable states for recovery UI', () => {
  assert.deepEqual(loadState(storageWith('{not-json')), {events: [], status: 'corrupt'});
  assert.deepEqual(loadState(storageWith(JSON.stringify([
    {id: 'bad-date', type: 'family', title: 'Synthetisch', date: '2026-02-29'},
  ]))), {events: [], status: 'corrupt'});
  assert.deepEqual(loadState(null), {events: [], status: 'unavailable'});
});

test('local storage keeps write failures actionable', () => {
  const storage = {getItem() { return null; }, setItem() { throw new Error('quota'); }};
  assert.throws(() => save([], storage), /JSON-Sicherung/);
});

test('local storage refuses malformed event records before writing', () => {
  const storage = storageWith(null);
  assert.throws(() => save([{id: 'missing-type', title: 'Synthetisch', date: '2026-10-14'}], storage), /ungültig/);
  assert.throws(() => save([{id: 'bad-time', type: 'shift', title: 'Nachtdienst', date: '2026-10-14', start: '25:00'}], storage), /ungültig/);
  assert.equal(storage.getItem(), null);
});

