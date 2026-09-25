import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDates,
  calendarTitle,
  entriesForDay,
  eventTimeLabel,
  monthSummary,
  shiftCalendarDate,
} from '../src/calendar-overview.js';

test('week view starts on Monday and crosses month and year boundaries', () => {
  const days = calendarDates(new Date(2027, 0, 1, 12), new Date(2027, 0, 1), 'week');

  assert.deepEqual(days, [
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
    '2027-01-01', '2027-01-02', '2027-01-03',
  ]);
  assert.equal(calendarTitle(new Date(2027, 0, 1, 12), new Date(2027, 0, 1), 'week'), '28. Dez.–03. Jan. 2027');
});

test('day view is a single local calendar date and advances across leap day', () => {
  const leapDay = new Date(2028, 1, 29, 12);

  assert.deepEqual(calendarDates(leapDay, leapDay, 'day'), ['2028-02-29']);
  assert.equal(calendarDates(leapDay, leapDay, 'month').length, 30);
  assert.equal(shiftCalendarDate(leapDay, 'day', 1).toISOString().slice(0, 10), '2028-03-01');
});

test('month navigation starts from the first day to avoid skipping short months', () => {
  const january = new Date(2027, 0, 1, 12);

  assert.equal(shiftCalendarDate(january, 'month', 1).toISOString().slice(0, 10), '2027-02-01');
});

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
