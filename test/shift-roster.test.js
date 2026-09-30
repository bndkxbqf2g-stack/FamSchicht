import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coworkersOnOverlappingShift,
  firstName,
  normalizeRosterName,
  parseRosterCell,
  rosterShiftInterval,
  shiftsOverlap,
} from '../src/shift-roster.js';

test('maps roster codes to the agreed shift times', () => {
  assert.deepEqual(parseRosterCell('F1'), {
    code: 'F1', title: 'Frühdienst', start: '06:00', end: '14:12',
    notCounted: false, ignoredForRoster: false,
  });
  assert.deepEqual(parseRosterCell('S1'), {
    code: 'S1', title: 'Spätdienst', start: '13:30', end: '21:42',
    notCounted: false, ignoredForRoster: false,
  });
  assert.deepEqual(parseRosterCell('Z1'), {
    code: 'Z1', title: 'Zwischendienst', start: '11:48', end: '20:00',
    notCounted: false, ignoredForRoster: false,
  });
  assert.deepEqual(parseRosterCell('N5'), {
    code: 'N5', title: 'Nachtdienst', start: '21:15', end: '06:30',
    notCounted: false, ignoredForRoster: false,
  });
  assert.deepEqual(parseRosterCell('Nx'), {
    code: 'Nx', title: 'Nachtdienst', start: '21:15', end: '06:30',
    notCounted: false, ignoredForRoster: false,
  });
});

test('OZ marks a real duty as not counted without removing it from overlap results', () => {
  assert.deepEqual(parseRosterCell('OZ + F1'), {
    code: 'F1', title: 'Frühdienst', start: '06:00', end: '14:12',
    notCounted: true, ignoredForRoster: false,
  });
});

test('O, U, FA, SG, and SL do not create working shift intervals', () => {
  assert.equal(parseRosterCell('O').kind, 'wish-free');
  assert.equal(parseRosterCell('U').kind, 'vacation');
  assert.equal(parseRosterCell('FA').kind, 'comp-time');
  assert.equal(parseRosterCell('SG').kind, 'home-office-or-training');
  assert.equal(parseRosterCell('SL').kind, 'leadership-service');
  assert.equal(parseRosterCell('OZ'), null);
  assert.equal(rosterShiftInterval({date:'2026-11-01', ...parseRosterCell('SG')}), null);
});

test('overnight intervals overlap shifts on the following calendar date', () => {
  assert.equal(shiftsOverlap(
    {date:'2026-11-01', ...parseRosterCell('N5')},
    {date:'2026-11-02', ...parseRosterCell('F1')},
  ), true);
  assert.equal(shiftsOverlap(
    {date:'2026-11-01', ...parseRosterCell('N5')},
    {date:'2026-11-02', ...parseRosterCell('S1')},
  ), false);
});

test('Zwischendienst matches any shift with real time overlap', () => {
  const middle = {date:'2026-11-02', ...parseRosterCell('Z1')};
  assert.equal(shiftsOverlap(middle, {date:'2026-11-02', ...parseRosterCell('F1')}), true);
  assert.equal(shiftsOverlap(middle, {date:'2026-11-02', ...parseRosterCell('S1')}), true);
  assert.equal(shiftsOverlap(middle, {date:'2026-11-02', ...parseRosterCell('N5')}), false);
  assert.equal(rosterShiftInterval({date:'2026-02-30', ...parseRosterCell('F1')}), null);
});

test('coworker tile shows only first names, preserves same-first-name coworkers, and omits own row and non-service days', () => {
  const mine = {name:'Martin Eitner', date:'2026-11-02', ...parseRosterCell('F1')};
  const roster = [
    mine,
    {name:'Lena Beispiel', date:'2026-11-02', ...parseRosterCell('Z1')},
    {name:'Lena Beispiel', date:'2026-11-02', ...parseRosterCell('S1')},
    {name:'Lena Muster', date:'2026-11-02', ...parseRosterCell('S1')},
    {name:'Tim Demo', date:'2026-11-02', ...parseRosterCell('N5')},
    {name:'Ria Test', date:'2026-11-02', ...parseRosterCell('SG')},
  ];
  assert.deepEqual(coworkersOnOverlappingShift(mine, roster), ['Lena', 'Lena']);
});

test('names compare without accents or case differences and display their first name', () => {
  assert.equal(normalizeRosterName('Mártin Eitner'), 'martin eitner');
  assert.equal(firstName('Léa Beispiel'), 'Léa');
  assert.equal(firstName('   '), '');
});
