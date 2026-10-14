import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShiftSeries,
  findShiftConflicts,
  shiftDurationMinutes,
  summarizeShiftMonth,
} from '../src/shift-planning.js';

const members = [
  {id: 'martin', name: 'Martin'},
  {id: 'steffi', name: 'Steffi'},
];

test('shift duration handles overnight and all-day statuses', () => {
  assert.equal(shiftDurationMinutes({start: '06:00', end: '14:12'}), 492);
  assert.equal(shiftDurationMinutes({start: '21:15', end: '06:30'}), 555);
  assert.equal(shiftDurationMinutes({start: '', end: ''}), 0);
});

test('monthly shift summary separates counted and OZ hours by stable owner ID', () => {
  const summary = summarizeShiftMonth([
    {type: 'shift', ownerId: 'martin', date: '2026-10-01', start: '06:00', end: '14:12'},
    {type: 'shift', ownerId: 'martin', date: '2026-10-02', start: '21:15', end: '06:30', notCounted: true},
    {type: 'shift', owner: 'Steffi', date: '2026-10-03', start: '', end: ''},
    {type: 'shift', ownerId: 'martin', date: '2026-11-01', start: '06:00', end: '14:12'},
  ], '2026-10', members);

  assert.deepEqual(summary, [
    {memberId: 'martin', name: 'Martin', shifts: 2, countedShifts: 1, statusShifts: 0, notCountedShifts: 1, hours: 8.2, notCountedHours: 9.25},
    {memberId: 'steffi', name: 'Steffi', shifts: 1, countedShifts: 0, statusShifts: 1, notCountedShifts: 0, hours: 0, notCountedHours: 0},
  ]);
});

test('collision hints include all-day and timed family events', () => {
  const conflicts = findShiftConflicts(
    {type: 'shift', date: '2026-10-04', start: '06:00', end: '14:12'},
    [
      {id: 'school', type: 'family', title: 'Schule', date: '2026-10-04', start: '08:00', end: '09:00'},
      {id: 'birthday', type: 'family', title: 'Geburtstag', date: '2026-10-04'},
      {id: 'later', type: 'family', title: 'Später', date: '2026-10-04', start: '18:00', end: '19:00'},
    ],
  );

  assert.deepEqual(conflicts.map(conflict => conflict.entry.title), ['Geburtstag', 'Schule']);
});

test('overnight collision checks the following date and ignores the edited shift', () => {
  const conflicts = findShiftConflicts(
    {id: 'night', type: 'shift', date: '2026-10-04', start: '21:15', end: '06:30'},
    [
      {id: 'morning', type: 'family', title: 'Kita', date: '2026-10-05', start: '06:00', end: '07:00'},
      {id: 'same-shift', type: 'shift', title: 'Nachtdienst', date: '2026-10-04', start: '21:15', end: '06:30'},
    ],
  );

  assert.deepEqual(conflicts.map(conflict => conflict.entry.title), ['Kita']);
  assert.deepEqual(findShiftConflicts(
    {id: 'same-shift', type: 'shift', date: '2026-10-04', start: '21:15', end: '06:30'},
    [{id: 'same-shift', type: 'family', title: 'Not this shift', date: '2026-10-04', start: '21:30', end: '22:00'}],
    {ignoreId: 'same-shift'},
  ), []);
});

test('multi-day family event remains a conflict on its middle day', () => {
  const conflicts = findShiftConflicts(
    {type: 'shift', date: '2026-10-05', start: '13:30', end: '21:42'},
    [{id: 'trip', type: 'family', title: 'Kurzurlaub', date: '2026-10-04', endDate: '2026-10-06'}],
  );

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].date, '2026-10-05');
});

test('shift series creates concrete weekday entries with stable ownership', () => {
  const entries = buildShiftSeries({
    startDate: '2026-10-05',
    endDate: '2026-10-16',
    weekdays: [1, 3, 5],
    title: 'Frühdienst',
    start: '06:00',
    end: '14:12',
    ownerId: 'martin',
    owner: 'Martin',
    idFactory: (() => { let index = 0; return () => `series-${++index}`; })(),
  });

  assert.deepEqual(entries.map(entry => [entry.id, entry.date, entry.ownerId]), [
    ['series-1', '2026-10-05', 'martin'],
    ['series-2', '2026-10-07', 'martin'],
    ['series-3', '2026-10-09', 'martin'],
    ['series-4', '2026-10-12', 'martin'],
    ['series-5', '2026-10-14', 'martin'],
    ['series-6', '2026-10-16', 'martin'],
  ]);
});

test('shift series skips equivalent existing rows and supports all-day statuses', () => {
  const entries = buildShiftSeries({
    startDate: '2026-10-05', endDate: '2026-10-07', weekdays: [1, 2, 3],
    title: 'Krank', start: '', end: '', ownerId: 'steffi',
    existing: [{type: 'shift', date: '2026-10-06', title: 'Krank', start: '', end: '', ownerId: 'steffi'}],
    idFactory: () => 'new-status',
  });
  assert.deepEqual(entries.map(entry => entry.date), ['2026-10-05', '2026-10-07']);
});
