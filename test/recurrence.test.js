import test from 'node:test';
import assert from 'node:assert/strict';
import {recurringEntryOccursOnDate} from '../src/recurrence.js';

test('daily recurrence starts at anchor and repeats every day', () => {
  const event = {date: '2026-09-25', recurrence: 'daily'};
  assert.equal(recurringEntryOccursOnDate(event, '2026-09-24'), false);
  assert.equal(recurringEntryOccursOnDate(event, '2026-09-25'), true);
  assert.equal(recurringEntryOccursOnDate(event, '2026-10-02'), true);
});

test('weekly recurrence stays anchored to seven-day intervals', () => {
  const event = {date: '2026-09-25', recurrence: 'weekly'};
  assert.equal(recurringEntryOccursOnDate(event, '2026-10-02'), true);
  assert.equal(recurringEntryOccursOnDate(event, '2026-10-01'), false);
});

test('monthly recurrence does not invent missing month-end dates', () => {
  const event = {date: '2026-01-31', recurrence: 'monthly'};
  assert.equal(recurringEntryOccursOnDate(event, '2026-02-28'), false);
  assert.equal(recurringEntryOccursOnDate(event, '2026-03-31'), true);
});

test('yearly recurrence matches month and day', () => {
  const event = {date: '2026-09-25', recurrence: 'yearly'};
  assert.equal(recurringEntryOccursOnDate(event, '2027-09-25'), true);
  assert.equal(recurringEntryOccursOnDate(event, '2027-09-24'), false);
});

test('multi-day weekly recurrence renders every day in each occurrence', () => {
  const event = {
    date: '2026-09-25',
    endDate: '2026-09-27',
    recurrence: 'weekly',
  };
  assert.equal(recurringEntryOccursOnDate(event, '2026-10-02'), true);
  assert.equal(recurringEntryOccursOnDate(event, '2026-10-03'), true);
  assert.equal(recurringEntryOccursOnDate(event, '2026-10-04'), true);
  assert.equal(recurringEntryOccursOnDate(event, '2026-10-05'), false);
});
