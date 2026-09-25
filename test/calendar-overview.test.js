import test from 'node:test';
import assert from 'node:assert/strict';
import {entriesForDay, eventTimeLabel, monthSummary} from '../src/calendar-overview.js';

test('day overview sorts timed entries before all-day entries', () => {
  const entries = entriesForDay([
    {date: '2026-09-25', title: 'Ohne Zeit', start: ''},
    {date: '2026-09-25', title: 'Spätdienst', start: '13:30'},
    {date: '2026-09-25', title: 'Frühdienst', start: '06:00'},
    {date: '2026-09-26', title: 'Morgen', start: '08:00'},
  ], '2026-09-25');

  assert.deepEqual(entries.map(entry => entry.title), ['Frühdienst', 'Spätdienst', 'Ohne Zeit']);
});

test('event time label keeps all-day events calm and compact', () => {
  assert.equal(eventTimeLabel({start: '', end: ''}), 'Ganztägig');
  assert.equal(eventTimeLabel({start: '06:00', end: '14:12'}), '06:00–14:12');
  assert.equal(eventTimeLabel({start: '09:30', end: ''}), '09:30');
});

test('month summary separates shifts from family events', () => {
  const summary = monthSummary([
    {date: '2026-09-01', type: 'shift'},
    {date: '2026-09-02', type: 'family'},
    {date: '2026-09-03', type: 'family'},
    {date: '2026-10-01', type: 'shift'},
  ], new Date(2026, 8, 1));

  assert.deepEqual(summary, {total: 3, shifts: 1, family: 2});
});
