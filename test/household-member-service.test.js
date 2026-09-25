import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureOwnerHouseholdMembers,
  householdMemberFromDatabase,
  householdMemberToDatabase,
  loadOwnerHouseholdMembers,
  saveOwnerHouseholdMembers,
} from '../src/household-member-service.js';
import {
  bootstrapHouseholdMembers,
  createHouseholdMember,
} from '../src/household-members.js';

test('household member database mapping preserves stable domain identity', () => {
  const member = createHouseholdMember({
    id: 'steffi',
    name: 'Steffi',
    type: 'adult',
    colorKey: 'steffi',
    shiftEligible: true,
  });
  const row = householdMemberToDatabase(member, 'home-1', 2);

  assert.deepEqual(row, {
    household_id: 'home-1',
    member_key: 'steffi',
    name: 'Steffi',
    member_type: 'adult',
    color_key: 'steffi',
    shift_eligible: true,
    sort_order: 2,
  });
  assert.deepEqual(householdMemberFromDatabase(row), {
    id: 'steffi',
    name: 'Steffi',
    type: 'adult',
    colorKey: 'steffi',
    shiftEligible: true,
  });
});

test('loadOwnerHouseholdMembers reads scoped rows in persisted order', async () => {
  const rows = [
    {
      member_key: 'martin',
      name: 'Martin',
      member_type: 'adult',
      color_key: 'martin',
      shift_eligible: true,
      sort_order: 0,
    },
    {
      member_key: 'steffi',
      name: 'Steffi',
      member_type: 'adult',
      color_key: 'steffi',
      shift_eligible: true,
      sort_order: 1,
    },
  ];
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(['from', table]);
      return {
        select(columns) {
          calls.push(['select', columns]);
          return {
            eq(column, value) {
              calls.push(['eq', column, value]);
              return {
                order(first) {
                  calls.push(['order', first]);
                  return {
                    async order(second) {
                      calls.push(['order', second]);
                      return {data: rows, error: null};
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const members = await loadOwnerHouseholdMembers(supabase, 'home-1');
  assert.deepEqual(members.map(member => member.id), ['martin', 'steffi']);
  assert.deepEqual(calls, [
    ['from', 'household_members'],
    ['select', 'member_key,name,member_type,color_key,shift_eligible,sort_order'],
    ['eq', 'household_id', 'home-1'],
    ['order', 'sort_order'],
    ['order', 'member_key'],
  ]);
});

test('saveOwnerHouseholdMembers upserts stable keys within one household', async () => {
  let saved;
  let options;
  const supabase = {
    from(table) {
      assert.equal(table, 'household_members');
      return {
        async upsert(payload, config) {
          saved = payload;
          options = config;
          return {error: null};
        },
      };
    },
  };

  const result = await saveOwnerHouseholdMembers(
    supabase,
    bootstrapHouseholdMembers,
    'home-1',
  );

  assert.deepEqual(result.map(member => member.id), ['martin', 'steffi']);
  assert.deepEqual(saved.map(row => row.member_key), ['martin', 'steffi']);
  assert.deepEqual(saved.map(row => row.sort_order), [0, 1]);
  assert.deepEqual(options, {onConflict: 'household_id,member_key'});
});

test('ensureOwnerHouseholdMembers seeds bootstrap only when cloud is empty', async () => {
  let inserted = null;
  const supabase = {
    from(table) {
      assert.equal(table, 'household_members');
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return {
                    async order() {
                      return {data: [], error: null};
                    },
                  };
                },
              };
            },
          };
        },
        async upsert(payload) {
          inserted = payload;
          return {error: null};
        },
      };
    },
  };

  const members = await ensureOwnerHouseholdMembers(supabase, 'home-1');
  assert.deepEqual(members.map(member => member.id), ['martin', 'steffi']);
  assert.deepEqual(inserted.map(row => row.member_key), ['martin', 'steffi']);
});
