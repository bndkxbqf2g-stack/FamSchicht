import {entryOccursOnDate} from './calendar-overview.js';
import {normalizeRecurrence} from './recurrence.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isTaskLikeEntry(entry) {
  return entry?.type === 'family' && (entry.eventKind === 'task' || entry.eventKind === 'routine');
}

export function normalizeCompletedDates(value) {
  const dates = Array.isArray(value) ? value : [];
  return [...new Set(dates.filter(date => DATE_PATTERN.test(String(date))))]
    .map(String)
    .sort();
}

export function taskOccurrenceDates(entry, fromDate, toDate) {
  if (!isTaskLikeEntry(entry) || !DATE_PATTERN.test(String(entry.date))) {
    return [];
  }

  const from = String(fromDate || entry.date);
  const to = String(toDate || from);
  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to) || from > to) return [];

  const recurrence = normalizeRecurrence(entry.recurrence);
  if (recurrence === 'none') {
    return entry.date >= from && entry.date <= to ? [entry.date] : [];
  }

  const dates = [];
  let current = from;
  while (current <= to) {
    if (entryOccursOnDate(entry, current)) dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export function isTaskCompletedOnDate(entry, date) {
  if (!isTaskLikeEntry(entry) || !entryOccursOnDate(entry, date)) {
    return false;
  }

  const recurrence = normalizeRecurrence(entry.recurrence);
  const completionDate = recurrence === 'none' ? entry.date : date;
  if (normalizeCompletedDates(entry.completedDates).includes(completionDate)) return true;

  // Legacy non-recurring tasks used one boolean. For old recurring tasks, keep
  // that boolean attached to the anchor only so future occurrences stay open.
  return entry.completed === true && (recurrence === 'none' || date === entry.date);
}

export function taskOccurrences(entries, fromDate, toDate) {
  return (entries || []).flatMap(entry => taskOccurrenceDates(entry, fromDate, toDate)
    .map(date => ({
      entry,
      date,
      completed: isTaskCompletedOnDate(entry, date),
    })));
}

export function setTaskOccurrenceCompleted(entry, date, completed) {
  if (!isTaskLikeEntry(entry)) return entry;

  const next = {...entry};
  if (normalizeRecurrence(entry.recurrence) === 'none') {
    next.completed = Boolean(completed);
    delete next.completedDates;
    return next;
  }

  const dates = normalizeCompletedDates(entry.completedDates)
    .filter(completedDate => completedDate !== date);
  if (completed) dates.push(date);
  dates.sort();
  next.completed = false;
  if (dates.length) next.completedDates = [...new Set(dates)];
  else delete next.completedDates;
  return next;
}

export function toggleTaskOccurrence(entry, date) {
  return setTaskOccurrenceCompleted(entry, date, !isTaskCompletedOnDate(entry, date));
}

function addDays(value, amount) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
