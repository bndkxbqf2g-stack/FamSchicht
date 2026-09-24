import test from 'node:test';
import assert from 'node:assert/strict';
import {toDatabaseEvent, fromDatabaseEvent} from '../src/calendar-service.js';

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
  assert.ok(new Date(row.ends_at) > new Date(row.starts_at));
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
