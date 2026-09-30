import test from 'node:test';
import assert from 'node:assert/strict';
import {
  importedRosterCalendarEntries,
  suggestedRosterMemberId,
} from '../src/shift-roster-calendar.js';

const roster = {
  month: '2026-04',
  selfName: 'Alex Example',
  selfMemberId: 'member-a',
  entries: [
    {name:'Alex Example', date:'2026-04-02', code:'F1'},
    {name:'Jamie Example', date:'2026-04-02', code:'S1'},
    {name:'Alex Example', date:'2026-04-03', code:'O'},
  ],
};
const members = [
  {id:'member-a', name:'Alex', shiftEligible:true},
  {id:'member-b', name:'Jamie', shiftEligible:true},
];

test('projects only the selected row into the local calendar with a stable owner ID', () => {
  assert.deepEqual(importedRosterCalendarEntries([roster], members), [{
    id:'roster-2026-04-2026-04-02-0', type:'shift', title:'Frühdienst',
    date:'2026-04-02', start:'06:00', end:'14:12', ownerId:'member-a',
    source:'shift-roster-import', notCounted:false,
  }]);
});

test('does not project ambiguous household names or duplicate calendar shifts', () => {
  const ambiguous = [...members, {id:'member-c', name:'Alex', shiftEligible:true}];
  const legacyRoster = {...roster, selfMemberId:''};
  assert.deepEqual(importedRosterCalendarEntries([legacyRoster], ambiguous), []);
  const existing = [{type:'shift', date:'2026-04-02', ownerId:'member-a',
    start:'06:00', end:'14:12', title:'Frühdienst'}];
  assert.deepEqual(importedRosterCalendarEntries([roster], members, existing), []);
});

test('suggests Steffi for a schedule row named Stefanie without storing its surname', () => {
  assert.equal(suggestedRosterMemberId('Stefanie Beispiel', [
    {id:'steffi', name:'Steffi', shiftEligible:true},
    {id:'martin', name:'Martin', shiftEligible:true},
  ]), 'steffi');
  assert.equal(suggestedRosterMemberId('Stefanie Beispiel', [
    {id:'steffi', name:'Steffi', shiftEligible:true},
    {id:'steffi-2', name:'Steffi', shiftEligible:true},
  ]), '');
});

test('uses the chosen partner identity even when the roster first name differs', () => {
  const steffiRoster = {...roster, selfName:'Stefanie Beispiel', selfMemberId:'member-b', entries:[
    {name:'Stefanie Beispiel', date:'2026-04-02', code:'S1'},
  ]};
  assert.deepEqual(importedRosterCalendarEntries([steffiRoster], members).map(entry => entry.ownerId), ['member-b']);
});

test('maps legacy Stefanie roster data to Steffi after the app update', () => {
  const legacyRoster = {
    month:'2026-04', selfName:'Stefanie Beispiel', entries:[
      {name:'Stefanie Beispiel', date:'2026-04-02', code:'S1'},
    ],
  };
  assert.deepEqual(importedRosterCalendarEntries([legacyRoster], [
    {id:'steffi', name:'Steffi', shiftEligible:true},
  ]).map(entry => entry.ownerId), ['steffi']);
});
