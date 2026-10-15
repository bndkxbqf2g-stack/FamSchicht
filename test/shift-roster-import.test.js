import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractRosterPage,
  extractBestRosterPage,
  mergeRosterPages,
  parseRosterMonth,
  parseRosterPeriod,
  parseRosterYear,
  ROSTER_FILE_VALIDATION_ERROR,
  isRosterDateInMonth,
  validateRosterDraft,
  validateRosterFiles,
} from '../src/shift-roster-import.js';

function word(text, x, y) {
  return {text, bbox:{x0:x-8, x1:x+8, y0:y-5, y1:y+5}};
}

test('detects German month and year from the roster header', () => {
  assert.equal(parseRosterPeriod('Dienstplan Monat November Jahr 2026'), '2026-11');
  assert.equal(parseRosterPeriod('März 2027'), '2027-03');
  assert.equal(parseRosterPeriod('unbekannter Zeitraum'), null);
});

test('extracts month and year independently when one OCR header pass is noisy', () => {
  assert.equal(parseRosterMonth('Monat November'), 11);
  assert.equal(parseRosterYear('Jahr 2026'), 2026);
});

test('accepts JPEG, PNG, and PDF roster files but rejects unsupported formats', () => {
  assert.equal(validateRosterFiles([{name:'plan.jpg', type:'image/jpeg', size:1024}]), '');
  assert.equal(validateRosterFiles([{name:'plan.png', type:'', size:1024}]), '');
  assert.equal(validateRosterFiles([{name:'plan.pdf', type:'application/pdf', size:1024}]), '');
  assert.equal(validateRosterFiles([{name:'plan.pdf', type:'', size:1024}]), '');
  assert.equal(validateRosterFiles([{name:'plan.svg', type:'image/svg+xml', size:1024}]), ROSTER_FILE_VALIDATION_ERROR);
  assert.equal(validateRosterFiles([{name:'plan.jpg', type:'image/jpeg', size:36 * 1024 * 1024}]), ROSTER_FILE_VALIDATION_ERROR);
  assert.equal(validateRosterFiles(Array.from({length:5}, (_, index) => ({
    name:'plan-' + index + '.png', type:'image/png', size:1024,
  }))), ROSTER_FILE_VALIDATION_ERROR);
});

test('validates the roster preview before local persistence', () => {
  const valid = {
    month:'2026-02', selfName:'Ada Beispiel', selfMemberId:'member-a',
    entries:[{name:'Ada Beispiel', date:'2026-02-28', code:'F1'}],
  };
  assert.equal(validateRosterDraft(valid), '');
  assert.equal(isRosterDateInMonth('2026-02-28', '2026-02'), true);
  assert.equal(isRosterDateInMonth('2026-02-29', '2026-02'), false);
  assert.match(validateRosterDraft({...valid, entries:[{...valid.entries[0], date:'2026-02-29'}]}), /ungültiges Datum/);
  assert.match(validateRosterDraft({...valid, entries:[{...valid.entries[0], code:'O'}]}), /ungültiges Datum oder Kürzel/);
  assert.match(validateRosterDraft({...valid, entries:[{...valid.entries[0], name:''}]}), /Namen/);
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

test('selects the OCR pass that recovers the most safely mapped roster entries', () => {
  const weak = [word('Ada', 80, 160), word('Beispiel', 132, 160)];
  const stronger = [
    ...weak,
    word('F1', 256, 160),
    word('S1', 280, 160),
  ];
  const result = extractBestRosterPage({
    width:1280,
    height:960,
    words:weak,
    alternatives:[{words:stronger}],
  }, '2026-11');
  assert.deepEqual(result.map(entry => entry.code), ['F1', 'S1']);
});

test('groups name words with modest vertical OCR baseline drift', () => {
  const words = [
    word('Ada', 80, 160), word('Beispiel', 132, 173),
    word('F1', 256, 160),
  ];
  const result = extractRosterPage({words, width:1280, height:960, period:'2026-11'});
  assert.equal(result[0]?.name, 'Ada Beispiel');
  assert.equal(result[0]?.code, 'F1');
});

test('normalizes common OCR variants of printed service codes', () => {
  const words = [
    word('Ada', 80, 160), word('Beispiel', 132, 160), word('ri', 256, 160),
    word('Lina', 80, 220), word('Muster', 132, 220), word('sı', 256, 220),
    word('Mia', 80, 280), word('Demo', 132, 280), word('Nix', 256, 280),
  ];
  const result = extractRosterPage({words, width:1280, height:960, period:'2026-11'});
  assert.deepEqual(result.map(entry => entry.code), ['F1', 'S1', 'Nx']);
});

test('keeps services from a name row that OCR skipped', () => {
  const words = [
    word('Ada', 80, 160), word('Beispiel', 132, 160), word('F1', 256, 160),
    word('Lina', 80, 280), word('Muster', 132, 280), word('S1', 256, 220),
    word('Mia', 80, 340), word('Demo', 132, 340), word('N5', 256, 340),
    word('Noa', 80, 400), word('Test', 132, 400), word('Z1', 256, 400),
  ];
  const result = extractRosterPage({words, width:1280, height:960, period:'2026-11'});
  assert.equal(result.some(entry => entry.name === 'Unbekannte Zeile 2' && entry.code === 'S1'), true);
});

