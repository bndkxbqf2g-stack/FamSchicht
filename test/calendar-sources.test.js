import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarEventFingerprint,
  calendarProviderCatalog,
  createReadOnlyCalendarSource,
  isReadOnlyCalendarEntry,
  mergeReadOnlyCalendarEvents,
} from '../src/calendar-sources.js';

const source = createReadOnlyCalendarSource({id:'ics-file', provider:'ics', memberId:'anna'});

test('provider catalog keeps Google and Microsoft as read-only adapter contracts', () => {
  assert.deepEqual(calendarProviderCatalog().map(item => item.id), ['ics', 'google', 'microsoft']);
  assert.equal(calendarProviderCatalog().find(item => item.id === 'google').mode, 'read-only');
});

test('read-only source requires a supported provider and stable id', () => {
  assert.throws(() => createReadOnlyCalendarSource({provider:'unknown'}), /source id is required/);
  assert.throws(() => createReadOnlyCalendarSource({id:'x', provider:'unknown'}), /unsupported calendar provider/);
});

test('read-only import assigns deterministic source metadata and member ownership', () => {
  const result = mergeReadOnlyCalendarEvents([], [{
    id:'uid-1', type:'family', title:'Schule', date:'2026-10-02', eventKind:'school',
  }], source);
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].id, 'calendar-ics-file-uid-1');
  assert.equal(result.added[0].readOnly, true);
  assert.equal(result.added[0].source, 'calendar-import');
  assert.equal(result.added[0].calendarSourceId, 'ics-file');
  assert.equal(result.added[0].calendarProvider, 'ics');
  assert.equal(result.added[0].ownerId, 'anna');
  assert.equal(isReadOnlyCalendarEntry(result.added[0]), true);
});

test('same external identity with changed content becomes a conflict', () => {
  const existing = mergeReadOnlyCalendarEvents([], [{
    id:'uid-1', type:'family', title:'Schule', date:'2026-10-02', eventKind:'school',
  }], source).events;
  const result = mergeReadOnlyCalendarEvents(existing, [{
    id:'uid-1', type:'family', title:'Schule verschoben', date:'2026-10-03', eventKind:'school',
  }], source);
  assert.equal(result.added.length, 0);
  assert.equal(result.conflicts[0].reason, 'same-external-id');
});

test('exact repeats are skipped while a same-slot different event is reported', () => {
  const existing = [{id:'local', type:'family', title:'Arzt', date:'2026-10-03', start:'10:00', end:'11:00'}];
  const result = mergeReadOnlyCalendarEvents(existing, [
    {id:'uid-2', type:'family', title:'Arzt', date:'2026-10-03', start:'10:00', end:'11:00'},
    {id:'uid-3', type:'family', title:'Elternabend', date:'2026-10-03', start:'10:00', end:'11:00'},
  ], source);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.events.length, 1);
});

test('fingerprint normalizes title case and keeps timing fields', () => {
  assert.equal(
    calendarEventFingerprint({type:'family', title:' Schule ', date:'2026-10-02', start:'09:00', end:'10:00'}),
    calendarEventFingerprint({type:'family', title:'schule', date:'2026-10-02', start:'09:00', end:'10:00'}),
  );
});

