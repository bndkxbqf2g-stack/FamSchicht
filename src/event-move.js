const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function moveCalendarEntry(entry, sourceDate, targetDate) {
  if (!entry || typeof entry !== 'object') throw new Error('Eintrag ist erforderlich');
  const offset = dateDifference(sourceDate, targetDate);
  if (offset === 0) return {...entry};
  if (!DATE_PATTERN.test(entry.date)) throw new Error('Eintrag besitzt kein gültiges Datum');

  const moved = {
    ...entry,
    date: shiftDate(entry.date, offset),
  };
  if (entry.endDate) moved.endDate = shiftDate(entry.endDate, offset);
  if (Array.isArray(entry.completedDates)) {
    moved.completedDates = entry.completedDates.map(date => shiftDate(date, offset));
  }
  // A moved custody weekend keeps its original series identity so the other
  // generated weekends remain grouped under the original rhythm.
  if (entry.anchor && entry.source !== 'custody') {
    moved.anchor = shiftDate(entry.anchor, offset);
  }
  return moved;
}

export function dateDifference(fromDate, toDate) {
  if (!DATE_PATTERN.test(fromDate) || !DATE_PATTERN.test(toDate)) {
    throw new Error('Verschiebung benötigt gültige Datumswerte');
  }
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  return Math.round((to - from) / 86400000);
}

function shiftDate(value, offset) {
  if (!DATE_PATTERN.test(value)) throw new Error('Ungültiges Datum');
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function parseDate(value) {
  const date = new Date(value + 'T12:00:00Z');
  if (Number.isNaN(date.getTime())) throw new Error('Ungültiges Datum');
  return date;
}
