import {
  bootstrapHouseholdMembers,
  householdMemberToRecord,
  householdMembersFromRecords,
} from './household-members.js';

export function householdMemberToDatabase(member, householdId, sortOrder = 0) {
  if (!householdId) throw new Error('householdId is required for household members');
  const record = householdMemberToRecord(member);
  return {
    household_id: householdId,
    member_key: record.id,
    name: record.name,
    member_type: record.type,
    color_key: record.colorKey,
    shift_eligible: record.shiftEligible,
    sort_order: sortOrder,
  };
}

export function householdMemberFromDatabase(row) {
  return {
    id: row?.member_key,
    name: row?.name,
    type: row?.member_type,
    colorKey: row?.color_key,
    shiftEligible: row?.shift_eligible,
  };
}

export async function loadOwnerHouseholdMembers(supabase, householdId) {
  if (!householdId) throw new Error('householdId is required for member loading');
  const {data, error} = await supabase
    .from('household_members')
    .select('member_key,name,member_type,color_key,shift_eligible,sort_order')
    .eq('household_id', householdId)
    .order('sort_order')
    .order('member_key');
  if (error) throw error;
  return householdMembersFromRecords(
    (data || []).map(householdMemberFromDatabase),
  );
}

export async function saveOwnerHouseholdMembers(
  supabase,
  members,
  householdId,
) {
  if (!householdId) throw new Error('householdId is required for member saving');
  const records = householdMembersFromRecords(
    members.map(householdMemberToRecord),
  );
  if (!records.length) return [];
  const payload = records.map((member, index) =>
    householdMemberToDatabase(member, householdId, index));
  const {error} = await supabase
    .from('household_members')
    .upsert(payload, {onConflict: 'household_id,member_key'});
  if (error) throw error;
  return records;
}

export async function ensureOwnerHouseholdMembers(
  supabase,
  householdId,
  fallback = bootstrapHouseholdMembers,
) {
  const persisted = await loadOwnerHouseholdMembers(supabase, householdId);
  if (persisted.length) return persisted;
  await saveOwnerHouseholdMembers(supabase, fallback, householdId);
  return [...fallback];
}
