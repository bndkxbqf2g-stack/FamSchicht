import test from 'node:test';
import assert from 'node:assert/strict';
import {toDatabaseEvent, fromDatabaseEvent, saveOwnerEvents, updateOwnerEvent, deleteOwnerEvent, loadOwnerEvents} from '../src/calendar-service.js';
import {nextShiftCaptureDate, SHIFT_NAMES, shiftTimes} from '../src/dates.js';

test('all-day family event remains on the same calendar date after round trip', () => {
  const row=toDatabaseEvent({id:'all-day',type:'family',title:'Ferien',date:'2026-09-24'},'h1','u1');
  const restored=fromDatabaseEvent(row);
  assert.equal(restored.date,'2026-09-24');
  assert.equal(restored.start,'');
  assert.equal(restored.title,'Ferien');
});

test('multi-day family event keeps its end date through database round trip', () => {
  const row=toDatabaseEvent({
    id:'trip',type:'family',title:'Kurzurlaub',
    date:'2026-09-24',endDate:'2026-09-27',start:'',end:'',
  },'h1','u1');
  const restored=fromDatabaseEvent(row);

  assert.equal(restored.date,'2026-09-24');
  assert.equal(restored.endDate,'2026-09-27');
  assert.equal(restored.start,'');
});

test('multi-day family event rejects an end before its start date', () => {
  assert.throws(
    () => toDatabaseEvent({
      id:'bad-range',type:'family',title:'Fehler',
      date:'2026-09-24',endDate:'2026-09-23',
    },'h1','u1'),
    /endDate must not be before date/,
  );
});

test('maps family event to owner-safe database payload', () => {
  const row=toDatabaseEvent({id:'1',type:'family',title:'Elternabend',date:'2026-09-24',start:'18:00',end:'19:00'},'h1','u1');
  assert.equal(row.household_id,'h1');
  assert.equal(row.creator_id,'u1');
  assert.equal(row.category,'family');
  assert.equal(row.visibility,'home');
  assert.ok(row.ends_at > row.starts_at);
});

test('shift stays private and overnight end moves to next day', () => {
  const row=toDatabaseEvent({id:'2',type:'shift',title:'Nachtdienst',date:'2026-09-24',start:'21:15',end:'06:30',owner:'Martin'},'h1','u1');
  assert.equal(row.category,'shift');
  assert.equal(row.visibility,'self');
  assert.equal(row.metadata.owner,'Martin');
  assert.ok(new Date(row.ends_at) > new Date(row.starts_at));
});

test('Martin shift owner survives database round trip', () => {
  const row=toDatabaseEvent({id:'martin',type:'shift',title:'Spätdienst',date:'2026-09-24',start:'13:30',end:'21:42',owner:'Martin'},'h1','u1');
  assert.equal(row.metadata.owner,'Martin');
  assert.equal(fromDatabaseEvent(row).owner,'Martin');
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

test('overnight shift keeps next-day end through database round trip', () => {
  const row=toDatabaseEvent({id:'night',type:'shift',title:'Nachtdienst',date:'2026-09-24',start:'21:15',end:'06:30',owner:'Steffi'},'h1','u1');
  const restored=fromDatabaseEvent(row);
  assert.equal(restored.date,'2026-09-24');
  assert.equal(restored.start,'21:15');
  assert.equal(restored.end,'06:30');
  assert.equal(restored.owner,'Steffi');
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
  assert.equal(nextShiftCaptureDate('2026-12-31', new Date(2026,11,1)), null);
  assert.equal(nextShiftCaptureDate('2026-02-28', new Date(2026,1,1)), null);
});

test('saving an unassigned legacy shift does not invent Martin ownership', () => {
  const row=toDatabaseEvent({id:'legacy-save',type:'shift',title:'Frühdienst',date:'2026-09-24',start:'06:00',end:'14:12'},'h1','u1');
  assert.deepEqual(row.metadata, {});
});

test('legacy shift without owner stays unassigned', () => {
  const item=fromDatabaseEvent({id:'legacy',title:'Frühdienst',starts_at:'2026-09-24T06:00:00.000Z',ends_at:'2026-09-24T14:12:00.000Z',category:'shift',metadata:{}});
  assert.equal(item.owner, undefined);
});


test('cloud update is scoped and persists edited event fields', async () => {
  const filters=[];
  let updated;
  const query={
    eq(key,value){filters.push([key,value]);return this;},
    then(resolve){resolve({error:null});},
  };
  const supabase={from:()=>({update:payload=>{updated=payload;return query;}})};
  const event={
    id:'event-1',type:'family',title:'Elternabend verschoben',
    date:'2026-09-26',start:'19:00',end:'20:00',
  };

  await updateOwnerEvent(supabase,event,'house-1','user-1');

  assert.equal(updated.title,'Elternabend verschoben');
  assert.equal(updated.category,'family');
  assert.equal(updated.household_id, undefined);
  assert.deepEqual(filters,[['id','event-1'],['household_id','house-1']]);
});

test('cloud update refuses missing household scope', async () => {
  const supabase={from:()=>{throw new Error('database must not be called');}};
  await assert.rejects(
    () => updateOwnerEvent(
      supabase,
      {id:'event-1',type:'family',title:'x',date:'2026-09-25'},
      '',
      'user-1',
    ),
    /householdId is required/,
  );
});

test('cloud deletion is scoped to event id and household', async () => {
  const filters=[];
  const query={eq(key,value){filters.push([key,value]);return this;},then(resolve){resolve({error:null});}};
  const supabase={from:()=>({delete:()=>query})};
  await deleteOwnerEvent(supabase,'event-1','house-1');
  assert.deepEqual(filters,[['id','event-1'],['household_id','house-1']]);
});


test('loading events is scoped to the active household', async () => {
  const filters=[];
  const query={select(){return this;},eq(key,value){filters.push([key,value]);return this;},order(){return Promise.resolve({data:[],error:null});}};
  const supabase={from:()=>query};
  await loadOwnerEvents(supabase,'house-2');
  assert.deepEqual(filters,[['household_id','house-2']]);
});


test('cloud deletion refuses missing household scope', async () => {
  const supabase={from:()=>{throw new Error('database must not be called');}};
  await assert.rejects(() => deleteOwnerEvent(supabase,'event-1'), /householdId is required/);
});


test('cloud loading refuses missing household scope', async () => {
  const supabase={from:()=>{throw new Error('database must not be called');}};
  await assert.rejects(() => loadOwnerEvents(supabase,''), /householdId is required/);
});


test('single cloud save refuses missing household scope', async () => {
  const {saveOwnerEvent}=await import('../src/calendar-service.js');
  const supabase={from:()=>{throw new Error('database must not be called');}};
  await assert.rejects(() => saveOwnerEvent(supabase,{id:'x',type:'family',title:'x',date:'2026-09-25'},'', 'u1'), /householdId is required/);
});


test('batch cloud save refuses missing household scope', async () => {
  const supabase={from:()=>{throw new Error('database must not be called');}};
  await assert.rejects(() => saveOwnerEvents(supabase,[{id:'x',type:'family',title:'x',date:'2026-09-25'}],'','u1'), /householdId is required/);
});


test('database event serialization requires user identity', () => {
  assert.throws(() => toDatabaseEvent({id:'x',type:'family',title:'x',date:'2026-09-25'},'h1',''), /userId is required/);
});


test('single cloud save refuses missing user identity', async () => {
  const {saveOwnerEvent}=await import('../src/calendar-service.js');
  const supabase={from:()=>{throw new Error('database must not be called');}};
  await assert.rejects(() => saveOwnerEvent(supabase,{id:'x',type:'family',title:'x',date:'2026-09-25'},'h1',''), /userId is required/);
});


test('batch cloud save refuses missing user identity', async () => {
  const supabase={from:()=>{throw new Error('database must not be called');}};
  await assert.rejects(() => saveOwnerEvents(supabase,[{id:'x',type:'family',title:'x',date:'2026-09-25'}],'h1',''), /userId is required/);
});


test('cloud loading surfaces database failures', async () => {
  const query={select(){return this;},eq(){return this;},order(){return Promise.resolve({data:null,error:new Error('offline')});}};
  await assert.rejects(() => loadOwnerEvents({from:()=>query},'h1'), /offline/);
});


test('cloud deletion surfaces database failures', async () => {
  const query={eq(){return this;},then(resolve){resolve({error:new Error('offline')});}};
  await assert.rejects(() => deleteOwnerEvent({from:()=>({delete:()=>query})},'x','h1'), /offline/);
});


test('empty cloud save batch stays a database no-op', async () => {
  const supabase={from:()=>{throw new Error('database must not be called');}};
  assert.deepEqual(await saveOwnerEvents(supabase,[],'',''), []);
});
