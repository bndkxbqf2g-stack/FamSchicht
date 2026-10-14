import {isRosterDateInMonth} from './shift-roster-import.js';
import {parseRosterCell} from './shift-roster.js';

const STORAGE_KEY = 'famschicht-shift-rosters-v1';

export function loadShiftRosters(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(isStoredRoster) : [];
  } catch {
    return [];
  }
}

export function saveShiftRosters(rosters, storage = globalThis.localStorage) {
  if (!storage) throw new Error('Lokaler Speicher ist nicht verfügbar.');
  if (!Array.isArray(rosters) || !rosters.every(isStoredRoster)) {
    throw new Error('Der Dienstplan enthält ungültige Daten.');
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(rosters));
  return rosters;
}

export function replaceShiftRosterMonth(rosters, replacement) {
  if (!isStoredRoster(replacement)) throw new Error('Der Dienstplan ist unvollständig.');
  return [
    ...(rosters || []).filter(roster => roster.month !== replacement.month),
    replacement,
  ].sort((a, b) => a.month.localeCompare(b.month));
}

function isStoredRoster(roster) {
  return Boolean(roster &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(roster.month) &&
    Array.isArray(roster.entries) &&
    roster.entries.every(entry => entry && typeof entry.name === 'string' && entry.name.trim() &&
      typeof entry.date === 'string' && isRosterDateInMonth(entry.date, roster.month) &&
      typeof entry.code === 'string' && parseRosterCell(entry.code)?.start) &&
    (roster.selfMemberId === undefined || typeof roster.selfMemberId === 'string'));
}

