import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadRewardState,
  normalizePoints,
  pointsByMember,
  pointsForCompletedTask,
  removeReward,
  rewardProgress,
  saveRewardState,
  upsertReward,
} from '../src/rewards.js';

const members = [
  {id: 'anna', name: 'Anna'},
  {id: 'martin', name: 'Martin'},
];

const task = {
  id: 'task-1',
  type: 'family',
  eventKind: 'task',
  title: 'Synthetische Aufgabe',
  date: '2026-10-14',
  ownerId: 'anna',
  points: 5,
  completed: true,
};

test('points normalize safe integer values and reject invalid limits', () => {
  assert.equal(normalizePoints('12'), 12);
  assert.equal(normalizePoints('12,5'), null);
  assert.equal(normalizePoints(0), null);
  assert.equal(normalizePoints(0, {allowZero: true}), 0);
  assert.equal(normalizePoints(10001), null);
});

test('completed task points support one-off and recurring occurrence completion', () => {
  assert.equal(pointsForCompletedTask(task), 5);
  assert.equal(pointsForCompletedTask({...task, completed: false}), 0);
  assert.equal(pointsForCompletedTask({
    ...task,
    recurrence: 'weekly',
    completed: false,
    completedDates: ['2026-10-14', '2026-10-21'],
  }), 10);
  assert.equal(pointsForCompletedTask({...task, eventKind: 'event', completed: true}), 0);
});

test('points are grouped by stable member id and keep unassigned points shared', () => {
  const totals = pointsByMember([
    task,
    {...task, id: 'task-2', ownerId: 'martin', points: 3},
    {...task, id: 'task-3', ownerId: 'missing', points: 2},
  ], members);
  assert.deepEqual(totals, [
    {memberId: 'anna', name: 'Anna', points: 5},
    {memberId: 'martin', name: 'Martin', points: 3},
    {memberId: 'shared', name: 'Gemeinsam', points: 2},
  ]);
});

test('reward goals expose progress and local storage round-trip', () => {
  const storage = {
    value: null,
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
  };
  const reward = {id: 'reward-1', title: 'Synthetischer Ausflug', points: 10};
  const rewards = upsertReward([], reward);
  assert.deepEqual(saveRewardState(rewards, storage), [reward]);
  assert.deepEqual(loadRewardState(storage), {rewards: [reward], status: 'loaded'});
  assert.deepEqual(rewardProgress(7, reward), {
    points: 7, target: 10, remaining: 3, complete: false, percent: 70,
  });
  assert.equal(rewardProgress(10, reward).complete, true);
  assert.deepEqual(removeReward(rewards, reward.id), []);
});

