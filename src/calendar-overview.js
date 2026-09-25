import {calendarDays, dateKey} from './dates.js';

export function entriesForDay(entries, date) {
  return entries
    .filter(entry => entry.date === date)
    .slice()
    .sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99') || a.title.localeCompare(b.title));
}

export function calendarDates(referenceDate, monthDate, mode = 'month') {
  if (mode === 'month') return calendarDays(monthDate);
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
  );
  if (mode === 'day') return [dateKey(start)];
  if (mode !== 'week') throw new Error(`Unsupported calendar mode: ${mode}`);

  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({length: 7}, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return dateKey(day);
  });
}

export function calendarTitle(referenceDate, monthDate, mode = 'month') {
  if (mode === 'month') {
    return monthDate.toLocaleDateString('de-DE', {month: 'long', year: 'numeric'});
  }
  if (mode === 'day') {
    return referenceDate.toLocaleDateString('de-DE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  const week = calendarDates(referenceDate, monthDate, 'week');
  const first = new Date(`${week[0]}T12:00:00`);
  const last = new Date(`${week[6]}T12:00:00`);
  const shortDate = date => date.toLocaleDateString('de-DE', {day: '2-digit', month: 'short'});
  const sameYear = first.getFullYear() === last.getFullYear();
  const sameMonth = sameYear && first.getMonth() === last.getMonth();
  const range = sameMonth
    ? `${first.toLocaleDateString('de-DE', {day: '2-digit'})}–${shortDate(last)}`
    : `${shortDate(first)}–${shortDate(last)}`;
  return `${range} ${last.getFullYear()}`;
}

export function shiftCalendarDate(date, mode, direction) {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  if (mode === 'month') shifted.setMonth(shifted.getMonth() + direction);
  else shifted.setDate(shifted.getDate() + direction * (mode === 'week' ? 7 : 1));
  return shifted;
}

export function eventTimeLabel(entry) {
  if (!entry.start) return 'Ganztägig';
  return entry.end ? `${entry.start}–${entry.end}` : entry.start;
}

export function monthSummary(entries, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthEntries = entries.filter(entry => {
    const date = new Date(entry.date + 'T12:00:00');
    return date.getFullYear() === year && date.getMonth() === month;
  });
  return {
    total: monthEntries.length,
    shifts: monthEntries.filter(entry => entry.type === 'shift').length,
    family: monthEntries.filter(entry => entry.type !== 'shift').length,
  };
}
