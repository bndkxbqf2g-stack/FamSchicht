import test from 'node:test';
import assert from 'node:assert/strict';
import {rosterImportErrorMessage} from '../src/shift-roster-errors.js';
import {recognizeRosterImages} from '../src/shift-roster-ocr.js';

test('maps image decoding failures to an actionable retry message', () => {
  assert.equal(
    rosterImportErrorMessage(new Error('Error attempting to read image.')),
    'Das Bild konnte nicht gelesen werden. Bitte ein JPEG- oder PNG-Foto auswählen und es erneut versuchen.',
  );
});

test('maps OCR loading failures without exposing provider details', () => {
  assert.equal(
    rosterImportErrorMessage(new Error('OCR konnte nicht geladen werden. Bitte Internetverbindung prüfen und erneut versuchen.')),
    'Die deutsche Texterkennung konnte nicht geladen werden. Bitte die Internetverbindung prüfen und es erneut versuchen.',
  );
});

test('keeps the safe domain message for an unreadable roster', () => {
  const message = 'Ich konnte keine Schichtkürzel sicher erkennen. Bitte ein gerades, gut beleuchtetes Foto wählen.';
  assert.equal(rosterImportErrorMessage(new Error(message)), message);
});

test('falls back to a safe retry message for unknown OCR errors', () => {
  assert.equal(
    rosterImportErrorMessage(new Error('provider internals: worker 7 failed')),
    'Der Dienstplan konnte nicht gelesen werden. Bitte ein gut beleuchtetes JPEG- oder PNG-Foto auswählen und es erneut versuchen.',
  );
});

test('rejects unsupported roster files before loading the OCR worker', async () => {
  await assert.rejects(
    () => recognizeRosterImages([{name:'plan.svg', type:'image/svg+xml', size:1024}]),
    /JPEG- oder PNG/,
  );
});

