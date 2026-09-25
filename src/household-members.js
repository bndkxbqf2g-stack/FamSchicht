const MEMBER_TYPES = new Set(['adult', 'child', 'guest']);

export function createHouseholdMember({
  id,
  name,
  type = 'adult',
  colorKey,
  shiftEligible = false,
}) {
  const cleanId = String(id || '').trim();
  const cleanName = String(name || '').trim();
  if (!cleanId) throw new Error('member id is required');
  if (!cleanName) throw new Error('member name is required');
  if (!MEMBER_TYPES.has(type)) throw new Error('unsupported member type');

  return Object.freeze({
    id: cleanId,
    name: cleanName,
    type,
    colorKey: String(colorKey || cleanId)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-'),
    shiftEligible: Boolean(shiftEligible),
  });
}

export const bootstrapHouseholdMembers = Object.freeze([
  createHouseholdMember({
    id: 'martin',
    name: 'Martin',
    type: 'adult',
    colorKey: 'martin',
    shiftEligible: true,
  }),
  createHouseholdMember({
    id: 'steffi',
    name: 'Steffi',
    type: 'adult',
    colorKey: 'steffi',
    shiftEligible: true,
  }),
]);

export function shiftEligibleMembers(members = bootstrapHouseholdMembers) {
  return members.filter(member => member.shiftEligible);
}

export function memberFilterOptions(members = bootstrapHouseholdMembers) {
  return [
    ['all', 'Alle'],
    ...members.map(member => [member.name, member.name]),
  ];
}
