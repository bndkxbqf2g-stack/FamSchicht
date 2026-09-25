import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bootstrapHouseholdMembers,
  createHouseholdMember,
  memberFilterOptions,
  shiftEligibleMembers,
} from '../src/household-members.js';

test('household member model validates identity and type', () => {
  const child = createHouseholdMember({
    id: 'child-1',
    name: 'Kind',
    type: 'child',
    colorKey: 'Kind Eins',
  });
  assert.equal(child.type, 'child');
  assert.equal(child.colorKey, 'kind-eins');
  assert.equal(child.shiftEligible, false);
  assert.throws(
    () => createHouseholdMember({id: '', name: 'Ohne ID'}),
    /member id is required/,
  );
  assert.throws(
    () => createHouseholdMember({id: 'x', name: 'X', type: 'admin'}),
    /unsupported member type/,
  );
});

test('bootstrap adults drive filters and shift selection centrally', () => {
  assert.deepEqual(
    bootstrapHouseholdMembers.map(member => member.name),
    ['Martin', 'Steffi'],
  );
  assert.deepEqual(
    memberFilterOptions(),
    [['all', 'Alle'], ['Martin', 'Martin'], ['Steffi', 'Steffi']],
  );
  assert.deepEqual(
    shiftEligibleMembers().map(member => member.name),
    ['Martin', 'Steffi'],
  );
});
