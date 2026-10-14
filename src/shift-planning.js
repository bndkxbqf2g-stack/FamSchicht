import {entryOccursOnDate} from './calendar-overview.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Return the duration of a timed shift in minutes. Overnight shifts are
 * allowed; all-day statuses intentionally contribute zero hours.
 */
export function shiftDurationMinutes(shift) {
  if (!shift?.start || !shift?.end) return 0;
  const start = timeToMinutes(shift.start);
  const end = timeToMinutes(shift.end);
  if (start === null || end === null) return 0;
  return end > start ? end - start : end + 24 * 60 - start;
}

/**
 * Summarize local and imported shifts for one calendar month. The summary is
 * deliberately based on stable member IDs and keeps OZ (not counted) hours
 * visible without adding them to the regular total.
 */
export function summarizeShiftMonth(entries, month, members = []) {
  const monthKey = typeof month === 'string'
    ? month.slice(0, 7)
    : `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const byMember = new Map((members || []).map(member => [member.id, {
    memberId: member.id,
    name: member.name,
    shifts: 0,
    countedShifts: 0,
    statusShifts: 0,
    notCountedShifts: 0,
    hours: 0,
    notCountedHours: 0,
  }]));
  const names = new Map((members || []).map(member => [member.name, member.id]));

  for (const entry of entries || []) {
    if (entry?.type !== 'shift' || !entry.date?.startsWith(monthKey + '-')) continue;
    const memberId = entry.ownerId || names.get(entry.owner);
    if (!memberId || !byMember.has(memberId)) continue;
    const summary = byMember.get(memberId);
    const notCounted = Boolean(entry.notCounted);
    const minutes = shiftDurationMinutes(entry);
    summary.shifts += 1;
    if (!entry.start || !entry.end) {
      summary.statusShifts += 1;
    } else if (notCounted) {
      summary.notCountedShifts += 1;
      summary.notCountedHours += minutes / 60;
    } else {
      summary.countedShifts += 1;
      summary.hours += minutes / 60;
    }
  }

  return [...byMember.values()];
}

/**
 * Find family entries that overlap a candidate shift. The result includes the
 * date on which the overlap was found, so overnight shifts can explain a
 * conflict on the following day. All-day and multi-day entries are treated as
 * conflicts for the complete affected day.
 */
export function findShiftConflicts(shift, entries, {ignoreId = ''} = {}) {
  const candidate = shiftInterval(shift);
  if (!candidate) return [];

  const days = [shift.date];
  if (candidate.end > startOfDay(shift.date) + DAY_MS) {
    days.push(addDays(shift.date, 1));
  }
  const conflicts = [];
  const seen = new Set();

  for (const day of days) {
    for (const entry of entries || []) {
      if (!entry || entry.type !== 'family' || entry.id === ignoreId ||
          !entryOccursOnDate(entry, day)) continue;
      const interval = familyIntervalOnDate(entry, day);
      if (!interval || candidate.start >= interval.end || interval.start >= candidate.end) continue;
      const key = `${entry.id || entry.title}:${day}`;
      if (seen.has(key)) continue;
      seen.add(key);
      conflicts.push({entry, date: day});
    }
  }

  return conflicts.sort((first, second) =>
    first.date.localeCompare(second.date) ||
    (first.entry.start || '').localeCompare(second.entry.start || '') ||
    String(first.entry.title || '').localeCompare(String(second.entry.title || ''), 'de'),
  );
}

/**
 * Expand a weekday-based shift series into independent calendar entries.
 * Shifts stay as concrete rows so editing one date never mutates the series
 * or another owner's duty. Existing equivalent rows are skipped.
 */
export function buildShiftSeries({
  startDate,
  endDate,
  weekdays = [],
  title,
  start = '',
  end = '',
  ownerId,
  owner,
  existing = [],
  idFactory = defaultId,
}) {
  if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
    throw new Error('Die Serie braucht einen gültigen Datumsbereich.');
  }
  if (!String(title || '').trim() || !ownerId) {
    throw new Error('Dienst und Person sind für eine Serie erforderlich.');
  }
  if (!validTimeOrEmpty(start) || !validTimeOrEmpty(end)) {
    throw new Error('Die Dienstzeiten sind ungültig.');
  }

  const selectedDays = new Set((weekdays || []).map(Number).filter(day => day >= 0 && day <= 6));
  if (!selectedDays.size) throw new Error('Bitte mindestens einen Wochentag auswählen.');

  const known = new Set((existing || []).filter(entry => entry?.type === 'shift').map(shiftKey));
  const result = [];
  let current = startDate;
  while (current <= endDate) {
    const weekday = new Date(`${current}T12:00:00`).getDay();
    const candidate = {type: 'shift', title: String(title).trim(), date: current, start, end, ownerId, owner};
    if (selectedDays.has(weekday) && !known.has(shiftKey(candidate))) {
      const entry = {id: idFactory(), ...candidate};
      result.push(entry);
      known.add(shiftKey(entry));
    }
    current = addDays(current, 1);
  }
  return result;
}

function shiftInterval(shift) {
  if (!shift?.date || !shift.start || !shift.end) return null;
  const start = localDateTime(shift.date, shift.start);
  const end = localDateTime(shift.date, shift.end);
  if (!start || !end) return null;
  if (end <= start) end.setTime(end.getTime() + DAY_MS);
  return {start: start.getTime(), end: end.getTime()};
}

function familyIntervalOnDate(entry, day) {
  const dayStart = startOfDay(day);
  const dayEnd = dayStart + DAY_MS;
  if (!entry.start) return {start: dayStart, end: dayEnd};

  const isMultiDay = entry.date && entry.endDate && entry.endDate > entry.date &&
    !entry.recurrence;
  if (isMultiDay) {
    if (day > entry.date && day < entry.endDate) return {start: dayStart, end: dayEnd};
    if (day > entry.date) {
      const end = entry.end ? localDateTime(day, entry.end) : null;
      return {start: dayStart, end: end?.getTime() || dayEnd};
    }
    if (day < entry.endDate) {
      return {start: localDateTime(day, entry.start).getTime(), end: dayEnd};
    }
  }

  const start = localDateTime(day, entry.start);
  const end = localDateTime(day, entry.end || addMinutes(entry.start, 60));
  if (!start || !end) return null;
  if (end <= start) end.setTime(end.getTime() + DAY_MS);
  return {start: start.getTime(), end: end.getTime()};
}

function localDateTime(day, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day)) || timeToMinutes(time) === null) return null;
  const value = new Date(`${day}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function startOfDay(day) {
  const value = new Date(`${day}T00:00:00`);
  return value.getTime();
}

function addDays(day, amount) {
  const value = new Date(`${day}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return value.toISOString().slice(0, 10);
}

function addMinutes(time, amount) {
  const minutes = timeToMinutes(time);
  if (minutes === null) return '23:59';
  const value = new Date(`2000-01-01T${time}:00`);
  value.setMinutes(value.getMinutes() + amount);
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function timeToMinutes(value) {
  if (!/^\d{2}:\d{2}$/.test(String(value))) return null;
  const [hours, minutes] = String(value).split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function shiftKey(entry) {
  return [entry.date, entry.ownerId || entry.owner || '', entry.title, entry.start || '', entry.end || ''].join('|');
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function validTimeOrEmpty(value) {
  return value === '' || timeToMinutes(value) !== null;
}

function defaultId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `shift-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
