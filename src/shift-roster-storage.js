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
    roster.entries.every(entry => entry && typeof entry.name === 'string' &&
      typeof entry.date === 'string' && typeof entry.code === 'string'));
}
