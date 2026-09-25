import test from 'node:test';
import assert from 'node:assert/strict';
import {toDatabaseEvent, fromDatabaseEvent, saveOwnerEvents} from '../src/calendar-service.js';
import {nextShiftCaptureDate, SHIFT_NAMES, shiftTimes} from '../src/dates.js';

test('maps family event to owner-safe database payload', () => {
  const row=toDatabaseEvent({id:'1',type:'family',title:'Elternabend',date:'2026-09-24',start:'18:00',end:'19:00'},'h1','u1');
  assert.equal(row.household_id,'h1');
  assert.equal(row.creator_id,'u1');
  assert.equal(row.category,'family');
  assert.equal(row.visibility,'home');
  assert.ok(row.ends_at > row.starts_at);
});

test('shift stays private and overnight end moves to next day', () => {
  const row=toDatabaseEvent({id:'2',type:'shift',title:'Nachtdienst',date:'2026-09-24',start:'21:15',end:'06:30'},'h1','u1');
  assert.equal(row.category,'shift');
  assert.equal(row.visibility,'self');
  assert.equal(row.metadata.owner,'Martin');
  assert.ok(new Date(row.ends_at) > new Date(row.starts_at));
});

test('Steffi shift owner survives database round trip', () => {
  const row=toDatabaseEvent({id:'s1',type:'shift',title:'Spätdienst',date:'2026-09-24',start:'13:30',end:'21:42',owner:'Steffi'},'h1','u1');
  assert.equal(row.metadata.owner,'Steffi');
  const item=fromDatabaseEvent(row);
  assert.equal(item.owner,'Steffi');
});

test('maps database row back to calendar shape', () => {
  const item=fromDatabaseEvent({id:'3',title:'Termin',starts_at:'2026-09-24T16:00:00.000Z',ends_at:'2026-09-24T17:00:00.000Z',category:'family'});
  assert.equal(item.id,'3');
  assert.equal(item.type,'family');
  assert.equal(item.source,'supabase');
});


test('custody metadata survives database round trip', () => {
  const row=toDatabaseEvent({id:'4',type:'family',title:'Kinder bei Papa',date:'2026-09-24',start:'',end:'',source:'custody',anchor:'2026-09-24'},'h1','u1');
  assert.deepEqual(row.metadata,{source:'custody',anchor:'2026-09-24'});
  const item=fromDatabaseEvent({...row,starts_at:row.starts_at,ends_at:row.ends_at});
  assert.equal(item.source,'custody');
  assert.equal(item.anchor,'2026-09-24');
});


test('batch save inserts custody schedule in one request', async () => {
  let inserted;
  const supabase={from:()=>({insert:async payload=>{inserted=payload;return {error:null};}})};
  const events=[
    {id:'5',type:'family',title:'Kinder bei Papa',date:'2026-09-24',source:'custody',anchor:'2026-09-24'},
    {id:'6',type:'family',title:'Kinder bei Papa',date:'2026-09-25',source:'custody',anchor:'2026-09-24'},
  ];
  await saveOwnerEvents(supabase,events,'h1','u1');
  assert.equal(inserted.length,2);
  assert.equal(inserted[0].metadata.source,'custody');
  assert.equal(inserted[1].metadata.anchor,'2026-09-24');
});

test('supported shifts keep full labels and configured UKW times', () => {
  assert.deepEqual(SHIFT_NAMES, ['Frühdienst','Spätdienst','Nachtdienst']);
  assert.deepEqual(shiftTimes('Frühdienst'), ['06:00','14:12']);
  assert.deepEqual(shiftTimes('Spätdienst'), ['13:30','21:42']);
  assert.deepEqual(shiftTimes('Nachtdienst'), ['21:15','06:30']);
});

test('rapid shift entry stops after last day of displayed month', () => {
  assert.equal(nextShiftCaptureDate('2026-09-29', new Date(2026,8,1)), '2026-09-30');
  assert.equal(nextShiftCaptureDate('2026-09-30', new Date(2026,8,1)), null);
});

test('legacy shift without owner stays unassigned', () => {
  const item=fromDatabaseEvent({id:'legacy',title:'Frühdienst',starts_at:'2026-09-24T06:00:00.000Z',ends_at:'2026-09-24T14:12:00.000Z',category:'shift',metadata:{}});
  assert.equal(item.owner, undefined);
});
