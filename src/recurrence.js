const VALID_RECURRENCES = new Set(['daily', 'weekly', 'monthly', 'yearly']);

export function normalizeRecurrence(value) {
  return VALID_RECURRENCES.has(value) ? value : 'none';
}

export function recurringEntryOccursOnDate(entry, date) {
  const recurrence = normalizeRecurrence(entry.recurrence);
  if (recurrence === 'none') {
    const endDate = entry.endDate || entry.date;
    return entry.date <= date && date <= endDate;
  }
  if (date < entry.date) return false;

  const durationDays = dayDifference(entry.date, entry.endDate || entry.date);
  for (let offset = 0; offset <= durationDays; offset += 1) {
    const occurrenceStart = addDays(date, -offset);
    if (occurrenceStart < entry.date) continue;
    if (matchesRecurrence(entry.date, occurrenceStart, recurrence)) return true;
  }
  return false;
}

function matchesRecurrence(anchor, candidate, recurrence) {
  const start = parseDate(anchor);
  const current = parseDate(candidate);
  if (recurrence === 'daily') return true;
  if (recurrence === 'weekly') {
    return dayDifference(anchor, candidate) % 7 === 0;
  }
  if (recurrence === 'monthly') {
    return current.getUTCDate() === start.getUTCDate();
  }
  return current.getUTCMonth() === start.getUTCMonth() &&
    current.getUTCDate() === start.getUTCDate();
}

function dayDifference(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000);
}

function addDays(date, amount) {
  const value = parseDate(date);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function parseDate(value) {
  return new Date(value + 'T00:00:00Z');
}
