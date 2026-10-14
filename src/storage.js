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
    if (!Array.isArray(events)) return {events: [], status: 'corrupt'};
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

