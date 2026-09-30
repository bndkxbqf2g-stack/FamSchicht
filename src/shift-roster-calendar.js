import {firstName, normalizeRosterName, parseRosterCell} from './shift-roster.js';

const ROSTER_NAME_ALIASES = {stefanie:'steffi'};

export function suggestedRosterMemberId(rosterName, members) {
  const first = normalizeRosterName(firstName(rosterName));
  const memberList = members || [];
  const exactMatches = memberList.filter(member =>
    normalizeRosterName(firstName(member.name)) === first);
  if (exactMatches.length === 1) return exactMatches[0].id;
  if (exactMatches.length > 1) return '';
  const identity = ROSTER_NAME_ALIASES[first];
  if (!identity) return '';
  const matches = memberList.filter(member => normalizeRosterName(firstName(member.name)) === identity);
  return matches.length === 1 ? matches[0].id : '';
}

/**
 * Build calendar-only entries from the selected person's locally stored roster.
 * A stable household member match is required; ambiguous names are skipped.
 */
export function importedRosterCalendarEntries(rosters, members, existingEntries = []) {
  const result = [];
  for (const roster of rosters || []) {
    const selfKey = normalizeRosterName(roster.selfName);
    const memberId = roster.selfMemberId || suggestedRosterMemberId(roster.selfName, members);
    const matchingMembers = (members || []).filter(member => member.id === memberId);
    if (!selfKey || matchingMembers.length !== 1) continue;
    const member = matchingMembers[0];

    (roster.entries || []).forEach((row, index) => {
      if (normalizeRosterName(row.name) !== selfKey) return;
      const service = parseRosterCell(row.code);
      if (!service?.start) return;
      const duplicate = [...(existingEntries || []), ...result].some(entry =>
        entry.type === 'shift' && entry.date === row.date && entry.ownerId === member.id &&
        entry.start === service.start && entry.end === service.end && entry.title === service.title);
      if (duplicate) return;
      result.push({
        id: `roster-${roster.month}-${row.date}-${index}`,
        type: 'shift',
        title: service.title,
        date: row.date,
        start: service.start,
        end: service.end,
        ownerId: member.id,
        source: 'shift-roster-import',
        notCounted: Boolean(row.notCounted),
      });
    });
  }
  return result;
}
