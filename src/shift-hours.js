const STORAGE_KEY = 'famschicht-shift-target-hours-v1';
const MAX_MONTHLY_HOURS = 744;

/**
 * Normalize an optional monthly target. Empty input means that no target is
 * configured; numeric strings with a German decimal comma are accepted.
 */
export function normalizeShiftTargetHours(value) {
  if (value === '' || value === null || value === undefined) return null;
  const normalizedValue = typeof value === 'string' ? value.trim() : value;
  if (normalizedValue === '') return null;
  const normalized = typeof normalizedValue === 'string' ? normalizedValue.replace(',', '.') : normalizedValue;
  const hours = Number(normalized);
  if (!Number.isFinite(hours) || hours < 0 || hours > MAX_MONTHLY_HOURS) return null;
  return Math.round(hours * 100) / 100;
}

/**
 * Load per-member monthly targets from device storage. Malformed or stale
 * values are ignored instead of preventing the shift view from rendering.
 */
export function loadShiftTargets(storage = globalThis.localStorage) {
  if (!storage) return {};
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw)
      .map(([memberId, value]) => [String(memberId), normalizeShiftTargetHours(value)])
      .filter(([, value]) => value !== null));
  } catch {
    return {};
  }
}

export function saveShiftTargets(targets, storage = globalThis.localStorage) {
  if (!storage) throw new Error('Lokaler Speicher ist nicht verfügbar.');
  const normalized = Object.fromEntries(Object.entries(targets || {})
    .map(([memberId, value]) => [String(memberId), normalizeShiftTargetHours(value)])
    .filter(([, value]) => value !== null));
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function shiftTargetDifference(actualHours, targetHours) {
  const target = normalizeShiftTargetHours(targetHours);
  if (target === null || !Number.isFinite(Number(actualHours))) return null;
  return Math.round((Number(actualHours) - target) * 100) / 100;
}
