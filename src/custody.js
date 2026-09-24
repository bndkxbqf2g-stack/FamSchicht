import {dateKey} from './dates.js';

/** Generates alternating Thursday-Sunday custody blocks without assuming a family's actual schedule. */
export function generateCustodyDates(anchor, months = 12) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(anchor)) {
    throw Error('Bitte ein gültiges Datum auswählen.');
  }

  const [year, month, day] = anchor.split('-').map(Number);
  const first = new Date(year, month - 1, day, 12);
  if (
    first.getFullYear() !== year ||
    first.getMonth() !== month - 1 ||
    first.getDate() !== day
  ) {
    throw Error('Ungültiges Datum.');
  }
  if (first.getDay() !== 4) {
    throw Error('Bitte einen Donnerstag als Start auswählen.');
  }

  const until = new Date(year, month - 1 + months, day, 12);
  const result = [];
  for (
    let block = new Date(first);
    block < until;
    block.setDate(block.getDate() + 14)
  ) {
    for (let offset = 0; offset < 4; offset += 1) {
      const date = new Date(block);
      date.setDate(date.getDate() + offset);
      if (date < until) result.push(dateKey(date));
    }
  }
  return result;
}

export function missingCustodyDates(entries, anchor, dates) {
  const existing = new Set(
    entries
      .filter(entry => entry.source === 'custody' && entry.anchor === anchor)
      .map(entry => entry.date),
  );
  return dates.filter(date => !existing.has(date));
}
