import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarKeyboardOffset} from '../src/calendar-keyboard.js';

const date = (value) => new Date(value + 'T12:00:00');

test('mobile month keyboard navigation follows two-column rows', () => {
  const mobileWidth = 390;
  assert.equal(calendarKeyboardOffset('ArrowUp', date('2026-10-19'), 'month', mobileWidth), -2);
  assert.equal(calendarKeyboardOffset('ArrowDown', date('2026-10-19'), 'month', mobileWidth), 2);
  assert.equal(calendarKeyboardOffset('Home', date('2026-10-20'), 'month', mobileWidth), -1);
  assert.equal(calendarKeyboardOffset('End', date('2026-10-19'), 'month', mobileWidth), 1);
  assert.equal(calendarKeyboardOffset('End', date('2026-10-31'), 'month', mobileWidth), 0);
  assert.equal(calendarKeyboardOffset('End', date('2026-10-30'), 'month', mobileWidth), 0);
  assert.equal(calendarKeyboardOffset('PageDown', date('2026-10-19'), 'month', mobileWidth), null);
});

test('desktop month, week and day keyboard offsets retain their established semantics', () => {
  const desktopWidth = 1280;
  const monday = date('2026-10-19');
  assert.equal(calendarKeyboardOffset('ArrowUp', monday, 'month', desktopWidth), -7);
  assert.equal(calendarKeyboardOffset('ArrowDown', monday, 'month', desktopWidth), 7);
  assert.equal(calendarKeyboardOffset('Home', monday, 'month', desktopWidth), 0);
  assert.equal(calendarKeyboardOffset('End', monday, 'week', desktopWidth), 6);
  assert.equal(calendarKeyboardOffset('ArrowUp', monday, 'day', desktopWidth), -1);
  assert.equal(calendarKeyboardOffset('ArrowRight', monday, 'day', desktopWidth), 1);
});
