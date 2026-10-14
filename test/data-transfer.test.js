import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeJsonBackupEvents, parseJsonBackup} from '../src/data-transfer.js';

const event = {
  id: 'backup-1',
  type: 'family',
  title: 'Synthetischer Elternabend',
  date: '2026-10-14',
  start: '18:00',
  end: '19:00',
  eventKind: 'school',
};

function backup(events = [event]) {
  return JSON.stringify({format:'famschicht-json', version:1, events});
}

test('JSON backup parser validates the envelope and keeps supported event fields', () => {
  const parsed = parseJsonBackup(backup([{...event, unexpected:'discarded'}]));
  assert.deepEqual(parsed, [event]);
});

test('JSON backup rejects foreign envelopes, invalid dates and invalid times', () => {
  assert.throws(() => parseJsonBackup(JSON.stringify({format:'other', version:1, events:[]})), /stammt nicht aus FamSchicht/);
  assert.throws(() => parseJsonBackup(backup([{...event, date:'2026-02-30'}])), /ungültigen Termin/);
  assert.throws(() => parseJsonBackup(backup([{...event, start:'25:00'}])), /ungültige Uhrzeit/);
});

test('JSON backup merge skips exact duplicates and reports changed IDs as conflicts', () => {
  const exact = mergeJsonBackupEvents([event], [event]);
  assert.equal(exact.added.length, 0);
  assert.equal(exact.duplicates.length, 1);

  const changed = mergeJsonBackupEvents([event], [{...event, title:'Geänderter Termin'}]);
  assert.equal(changed.added.length, 0);
  assert.equal(changed.conflicts[0].reason, 'same-id');
});

test('JSON backup merge keeps new events and detects same-content duplicates', () => {
  const result = mergeJsonBackupEvents([event], [
    {...event, id:'backup-copy'},
    {...event, id:'backup-2', date:'2026-10-15'},
  ]);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.added.length, 1);
  assert.equal(result.events.length, 2);
  assert.equal(result.added[0].date, '2026-10-15');
});

