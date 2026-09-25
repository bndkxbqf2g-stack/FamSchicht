export function entriesForDay(entries, date) {
  return entries
    .filter(entry => entry.date === date)
    .slice()
    .sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99') || a.title.localeCompare(b.title));
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
