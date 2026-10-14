import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadShiftTargets,
  normalizeShiftTargetHours,
  saveShiftTargets,
  shiftTargetDifference,
} from '../src/shift-hours.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('monthly shift targets accept decimal commas and reject impossible hours', () => {
  assert.equal(normalizeShiftTargetHours('160,25'), 160.25);
  assert.equal(normalizeShiftTargetHours(''), null);
  assert.equal(normalizeShiftTargetHours('   '), null);
  assert.equal(normalizeShiftTargetHours('-1'), null);
  assert.equal(normalizeShiftTargetHours('745'), null);
});

test('shift targets round-trip through local storage and ignore malformed values', () => {
  const storage = memoryStorage();
  assert.deepEqual(saveShiftTargets({martin: '160', steffi: '', broken: 'nope'}, storage), {martin: 160});
  assert.deepEqual(loadShiftTargets(storage), {martin: 160});
  storage.setItem('famschicht-shift-target-hours-v1', '{broken');
  assert.deepEqual(loadShiftTargets(storage), {});
});

test('target difference reports under, exact and over target hours', () => {
  assert.equal(shiftTargetDifference(152.5, 160), -7.5);
  assert.equal(shiftTargetDifference(160, 160), 0);
  assert.equal(shiftTargetDifference(168.25, 160), 8.25);
  assert.equal(shiftTargetDifference(160, ''), null);
});
