import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SHIFT_TEMPLATES,
  loadShiftTemplates,
  normalizeShiftTemplate,
  removeShiftTemplate,
  saveShiftTemplates,
  upsertShiftTemplate,
} from '../src/shift-templates.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('default shift templates include timed, overnight and status entries', () => {
  assert.equal(DEFAULT_SHIFT_TEMPLATES.find(item => item.id === 'night').start, '21:15');
  assert.equal(DEFAULT_SHIFT_TEMPLATES.find(item => item.id === 'sick').start, '');
  assert.equal(DEFAULT_SHIFT_TEMPLATES.find(item => item.id === 'sick').end, '');
});

test('custom shift templates round-trip through local storage', () => {
  const storage = memoryStorage();
  let templates = loadShiftTemplates(storage);
  templates = upsertShiftTemplate(templates, {
    id: 'custom-oncall', name: 'Bereitschaft', title: 'Bereitschaft', start: '18:00', end: '22:00',
  });
  templates = saveShiftTemplates(templates, storage);
  assert.equal(loadShiftTemplates(storage).find(item => item.id === 'custom-oncall').start, '18:00');
  assert.equal(removeShiftTemplate(templates, 'custom-oncall').some(item => item.id === 'custom-oncall'), false);
});

test('shift template validation rejects invalid time values and preserves clean labels', () => {
  assert.equal(normalizeShiftTemplate({id: 'bad', name: 'x', title: 'x', start: '25:00', end: ''}), null);
  assert.deepEqual(normalizeShiftTemplate({id: 'ok', name: '  Kurz  ', title: '  Kurzarbeit  ', start: '', end: ''}), {
    id: 'ok', name: 'Kurz', title: 'Kurzarbeit', start: '', end: '',
  });
});
