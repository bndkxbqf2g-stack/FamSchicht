import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTaskCompletedOnDate,
  isTaskLikeEntry,
  normalizeCompletedDates,
  setTaskOccurrenceCompleted,
  taskOccurrenceDates,
  taskOccurrences,
  toggleTaskOccurrence,
} from '../src/task-planning.js';

const weeklyTask = {
  id: 'task-weekly',
  type: 'family',
  eventKind: 'task',
  title: 'Müll rausstellen',
  date: '2026-10-12',
  recurrence: 'weekly',
  completed: false,
};

test('recurring tasks produce independent occurrences in a date range', () => {
  const entries = taskOccurrences([
    {...weeklyTask, completedDates: ['2026-10-19']},
  ], '2026-10-12', '2026-10-26');

  assert.deepEqual(entries.map(item => [item.date, item.completed]), [
    ['2026-10-12', false],
    ['2026-10-19', true],
    ['2026-10-26', false],
  ]);
});

test('toggling a recurring task changes only the selected occurrence', () => {
  const completed = toggleTaskOccurrence(weeklyTask, '2026-10-19');
  assert.deepEqual(completed.completedDates, ['2026-10-19']);
  assert.equal(completed.completed, false);
  assert.equal(isTaskCompletedOnDate(completed, '2026-10-12'), false);
  assert.equal(isTaskCompletedOnDate(completed, '2026-10-19'), true);

  const reopened = toggleTaskOccurrence(completed, '2026-10-19');
  assert.equal(reopened.completedDates, undefined);
  assert.equal(isTaskCompletedOnDate(reopened, '2026-10-19'), false);
  assert.equal(weeklyTask.completedDates, undefined);
});

test('non-recurring task keeps the legacy boolean completion contract', () => {
  const task = {...weeklyTask, recurrence: 'none', date: '2026-10-14'};
  const completed = setTaskOccurrenceCompleted(task, '2026-10-14', true);
  assert.equal(completed.completed, true);
  assert.equal(completed.completedDates, undefined);
  assert.equal(isTaskCompletedOnDate(completed, '2026-10-14'), true);
});

test('legacy recurring completion applies only to its anchor date', () => {
  const task = {...weeklyTask, completed: true};
  assert.equal(isTaskCompletedOnDate(task, '2026-10-12'), true);
  assert.equal(isTaskCompletedOnDate(task, '2026-10-19'), false);
});

test('task date normalization removes invalid and duplicate completion dates', () => {
  assert.deepEqual(normalizeCompletedDates([
    '2026-10-19', 'invalid', '2026-10-12', '2026-10-19', 20261020,
  ]), ['2026-10-12', '2026-10-19']);
  assert.deepEqual(taskOccurrenceDates(weeklyTask, '2026-10-19', '2026-10-19'), ['2026-10-19']);
});

test('household routines reuse recurring occurrence and completion rules', () => {
  const routine = {...weeklyTask, id: 'routine-weekly', eventKind: 'routine', title: 'Küche aufräumen'};
  assert.equal(isTaskLikeEntry(routine), true);
  assert.deepEqual(taskOccurrenceDates(routine, '2026-10-12', '2026-10-26'), [
    '2026-10-12', '2026-10-19', '2026-10-26',
  ]);
  const completed = toggleTaskOccurrence(routine, '2026-10-19');
  assert.equal(isTaskCompletedOnDate(completed, '2026-10-19'), true);
  assert.equal(isTaskCompletedOnDate(completed, '2026-10-26'), false);
});
