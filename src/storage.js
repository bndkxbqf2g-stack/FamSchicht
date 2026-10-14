const KEY = 'famschicht-events-v2';

/**
 * Read local calendar data without hiding storage failures from the UI.
 * A corrupt payload is never overwritten automatically so that a later
 * backup/import flow can still be offered to the user.
 */
export function loadState(storage = defaultStorage()) {
  if (!storage) return {events: [], status: 'unavailable'};
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return {events: [], status: 'empty'};
    const events = JSON.parse(raw);
    if (!Array.isArray(events) || !events.every(isStoredEvent)) {
      return {events: [], status: 'corrupt'};
    }
    return {events, status: 'loaded'};
  } catch {
    return {events: [], status: 'corrupt'};
  }
}

export function load(storage = defaultStorage()) {
  return loadState(storage).events;
}

export function save(events, storage = defaultStorage()) {
  if (!Array.isArray(events)) throw new Error('Lokale Kalenderdaten sind ungültig.');
  if (!events.every(isStoredEvent)) throw new Error('Lokale Kalenderdaten sind ungültig.');
  if (!storage) throw new Error('Lokaler Speicher ist in diesem Browser nicht verfügbar.');
  try {
    storage.setItem(KEY, JSON.stringify(events));
  } catch {
    throw new Error('Lokale Kalenderdaten konnten nicht gespeichert werden. Prüfe den freien Speicher oder stelle eine JSON-Sicherung wieder her.');
  }
  return events;
}

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function isStoredEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return false;
  if (typeof event.id !== 'string' || !event.id.trim()) return false;
  if (!['family', 'shift'].includes(event.type)) return false;
  if (typeof event.title !== 'string' || !event.title.trim() || event.title.length > 180) return false;
  if (!isDateKey(event.date)) return false;
  if (event.endDate !== undefined &&
      (!isDateKey(event.endDate) || event.endDate < event.date)) return false;
  if (event.start !== undefined && !isTime(event.start)) return false;
  if (event.end !== undefined && !isTime(event.end)) return false;
  return true;
}

function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function isTime(value) {
  return value === '' || (typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));
}

