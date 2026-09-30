import {firstName, normalizeRosterName, parseRosterCell} from './shift-roster.js';

/**
 * Build calendar-only entries from the selected person's locally stored roster.
 * A stable household member match is required; ambiguous names are skipped.
 */
export function importedRosterCalendarEntries(rosters, members, existingEntries = []) {
  const result = [];
  for (const roster of rosters || []) {
    const selfKey = normalizeRosterName(roster.selfName);
    const matchingMembers = (members || []).filter(member =>
      normalizeRosterName(member.name) === normalizeRosterName(firstName(roster.selfName)));
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
