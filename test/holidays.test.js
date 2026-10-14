import test from 'node:test';
import assert from 'node:assert/strict';
import {
  germanHolidayEntries,
  holidayRegionLabel,
  holidayRegionOptions,
  loadHolidayRegion,
  saveHolidayRegion,
} from '../src/holidays.js';

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

test('nationwide German holidays include movable holidays with stable read-only metadata', () => {
  const entries = germanHolidayEntries(2026);
  assert.deepEqual(entries.map(entry => entry.date), [
    '2026-01-01',
    '2026-04-03',
    '2026-04-06',
    '2026-05-01',
    '2026-05-14',
    '2026-05-25',
    '2026-10-03',
    '2026-12-25',
    '2026-12-26',
  ]);
  assert.ok(entries.every(entry => entry.readOnly && entry.source === 'holiday-calendar'));
  assert.equal(entries[0].calendarSourceId, 'holidays-DE');
});

test('state selection adds only the relevant regional holidays', () => {
  const dates = germanHolidayEntries(2026, 'BY').map(entry => entry.date);
  assert.ok(dates.includes('2026-01-06'));
  assert.ok(dates.includes('2026-06-04'));
  assert.ok(dates.includes('2026-11-01'));
  assert.equal(dates.filter(date => date === '2026-03-08').length, 0);
  assert.equal(germanHolidayEntries(2026, 'BY').length, 12);
});

test('Saxony includes the Wednesday of repentance and prayer', () => {
  const entry = germanHolidayEntries(2026, 'SN').find(item => item.holidayCode === 'day-of-prayer-and-repentance');
  assert.equal(entry.date, '2026-11-18');
  assert.equal(entry.calendarSourceId, 'holidays-SN');
  assert.equal(entry.calendarProvider, 'holiday');
});

test('holiday region options persist locally and reject unknown regions', () => {
  const storage = fakeStorage();
  assert.equal(loadHolidayRegion(storage), 'DE');
  assert.equal(saveHolidayRegion('by', storage), 'BY');
  assert.equal(loadHolidayRegion(storage), 'BY');
  assert.equal(holidayRegionLabel('BY'), 'Bayern');
  assert.ok(holidayRegionOptions().some(([code]) => code === 'TH'));
  assert.throws(() => saveHolidayRegion('XX', storage), /unsupported German holiday region/);
});

