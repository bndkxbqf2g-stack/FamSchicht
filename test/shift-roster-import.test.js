import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractRosterPage,
  mergeRosterPages,
  parseRosterPeriod,
} from '../src/shift-roster-import.js';

function word(text, x, y) {
  return {text, bbox:{x0:x-8, x1:x+8, y0:y-5, y1:y+5}};
}

test('detects German month and year from the roster header', () => {
  assert.equal(parseRosterPeriod('Dienstplan Monat November Jahr 2026'), '2026-11');
  assert.equal(parseRosterPeriod('März 2027'), '2027-03');
  assert.equal(parseRosterPeriod('unbekannter Zeitraum'), null);
});

test('maps recognized codes to the nearest employee row and calendar day', () => {
  const words = [
    word('Name', 80, 120),
    word('Ada', 80, 160), word('Beispiel', 132, 160),
    word('F1', 256, 160), word('OZ', 256, 165),
    word('Lina', 80, 220), word('Muster', 130, 220),
    word('Z1', 1052, 220),
  ];
  const result = extractRosterPage({words, width:1280, height:960, period:'2026-11'});
  assert.deepEqual(result, [
    {name:'Ada Beispiel', date:'2026-11-01', code:'F1', title:'Frühdienst', start:'06:00', end:'14:12', notCounted:true},
    {name:'Lina Muster', date:'2026-11-30', code:'Z1', title:'Zwischendienst', start:'11:48', end:'20:00', notCounted:false},
  ]);
});

test('merges duplicate rows from page images by employee and date', () => {
  const standard = {name:'Ada Beispiel', date:'2026-11-02', code:'F1', title:'Frühdienst', start:'06:00', end:'14:12', notCounted:false};
  const marked = {...standard, notCounted:true};
  assert.deepEqual(mergeRosterPages([[standard], [marked]]), [marked]);
});
