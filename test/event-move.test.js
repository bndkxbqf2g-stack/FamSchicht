import test from 'node:test';
import assert from 'node:assert/strict';
import {dateDifference, moveCalendarEntry} from '../src/event-move.js';

test('moving a single event preserves identity, owner and times', () => {
  const event = {
    id: 'event-1', type: 'family', title: 'Elternabend', date: '2026-10-14',
    start: '18:00', end: '19:30', ownerId: 'steffi', eventKind: 'school',
  };
  const moved = moveCalendarEntry(event, '2026-10-14', '2026-10-16');
  assert.deepEqual(moved, {...event, date: '2026-10-16'});
  assert.notStrictEqual(moved, event);
});

test('moving a multi-day event shifts the complete range', () => {
  const moved = moveCalendarEntry({
    id: 'trip', type: 'family', title: 'Kurzurlaub', date: '2026-10-14', endDate: '2026-10-17',
  }, '2026-10-15', '2026-10-20');
  assert.equal(moved.date, '2026-10-19');
  assert.equal(moved.endDate, '2026-10-22');
});

test('moving an overnight shift keeps owner and overnight times', () => {
  const shift = {
    id: 'night', type: 'shift', title: 'Nachtdienst', date: '2026-10-14',
    start: '21:15', end: '06:30', ownerId: 'martin',
  };
  assert.deepEqual(moveCalendarEntry(shift, '2026-10-14', '2026-10-13'), {
    ...shift, date: '2026-10-13',
  });
});

test('moving a recurring task shifts its completed occurrences with the anchor', () => {
  const moved = moveCalendarEntry({
    id: 'task', type: 'family', title: 'Müll', date: '2026-10-14', recurrence: 'weekly',
    completedDates: ['2026-10-14', '2026-10-21'],
  }, '2026-10-14', '2026-10-16');
  assert.deepEqual(moved.completedDates, ['2026-10-16', '2026-10-23']);
});

test('moving one custody weekend keeps its original rhythm anchor', () => {
  const moved = moveCalendarEntry({
    id: 'custody-1', type: 'family', title: 'Kinder bei Papa', date: '2026-10-16',
    source: 'custody', anchor: '2026-10-16',
  }, '2026-10-16', '2026-10-17');
  assert.equal(moved.date, '2026-10-17');
  assert.equal(moved.anchor, '2026-10-16');
});

test('date difference rejects malformed dates', () => {
  assert.equal(dateDifference('2026-10-14', '2026-10-20'), 6);
  assert.throws(() => dateDifference('14.10.2026', '2026-10-20'), /gültige Datumswerte/);
});
