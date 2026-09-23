import test from 'node:test';import assert from 'node:assert/strict';import {generateCustodyDates} from '../src/custody.js';
test('every second Thursday to Sunday',()=>{const days=generateCustodyDates('2026-09-24',1);assert.deepEqual(days.slice(0,8),['2026-09-24','2026-09-25','2026-09-26','2026-09-27','2026-10-08','2026-10-09','2026-10-10','2026-10-11'])});
test('rejects non-Thursday anchor',()=>assert.throws(()=>generateCustodyDates('2026-09-25',1),/Donnerstag/));
test('rejects invalid date',()=>assert.throws(()=>generateCustodyDates('2026-02-30',1),/Ungültiges Datum/));
