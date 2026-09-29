import {dateKey} from './dates.js';

/** Generates alternating, freely configurable custody blocks without assuming a family's actual schedule. */
export function generateCustodyDates(anchor, months = 12, endAnchor = null) {
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
  const last = endAnchor ? parseValidDate(endAnchor, 'Enddatum') : new Date(first);
  if (!endAnchor) last.setDate(last.getDate() + 2);
  if (last < first) throw Error('Das Enddatum darf nicht vor dem Startdatum liegen.');
  const durationDays = Math.round((last - first) / 86400000);

  const until = new Date(year, month - 1 + months, day, 12);
  const result = [];
  for (
    let block = new Date(first);
    block < until;
    block.setDate(block.getDate() + 14)
  ) {
    for (let offset = 0; offset <= durationDays; offset += 1) {
      const date = new Date(block);
      date.setDate(date.getDate() + offset);
      if (date < until) result.push(dateKey(date));
    }
  }
  return result;
}

function parseValidDate(value, label) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) throw Error(`Bitte ein gültiges ${label} auswählen.`);
  const [year, month, day] = value.split('-').map(Number);
  const result = new Date(year, month - 1, day, 12);
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
    throw Error('Ungültiges Datum.');
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
