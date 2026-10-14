const DISPLAY_MODE_KEY = 'famschicht-display-mode-v1';

const DISPLAY_MODES = [
  ['standard', 'Standard'],
  ['wall', 'Wandmodus'],
];

const DISPLAY_MODE_CODES = new Set(DISPLAY_MODES.map(([code]) => code));

export function displayModeOptions() {
  return DISPLAY_MODES.map(([code, label]) => [code, label]);
}

export function loadDisplayMode(storage = defaultStorage()) {
  try {
    const value = String(storage?.getItem(DISPLAY_MODE_KEY) || '').trim();
    return DISPLAY_MODE_CODES.has(value) ? value : 'standard';
  } catch {
    return 'standard';
  }
}

export function saveDisplayMode(mode, storage = defaultStorage()) {
  const value = normalizeDisplayMode(mode);
  try {
    storage?.setItem(DISPLAY_MODE_KEY, value);
  } catch {
    // A blocked localStorage must not prevent the current-session preference.
  }
  return value;
}

export function isWallMode(mode) {
  return mode === 'wall';
}

function normalizeDisplayMode(mode) {
  const value = String(mode || '').trim().toLowerCase();
  if (!DISPLAY_MODE_CODES.has(value)) throw new Error('unsupported display mode');
  return value;
}

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

