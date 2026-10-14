const SYNC_STATES = new Set([
  'local',
  'connecting',
  'synced',
  'offline',
  'error',
]);

export function normalizeSyncState(state) {
  return SYNC_STATES.has(state) ? state : 'local';
}

export function syncStatusLabel(state) {
  switch (normalizeSyncState(state)) {
    case 'connecting':
      return 'Synchronisierung läuft …';
    case 'synced':
      return 'Synchronisiert';
    case 'offline':
      return 'Offline · Nur dieses Gerät';
    case 'error':
      return 'Synchronisierung fehlgeschlagen · Lokal verfügbar';
    default:
      return 'Nur dieses Gerät';
  }
}

export function syncStatusClass(state) {
  const normalized = normalizeSyncState(state);
  return normalized === 'synced' ? 'online' : `sync-${normalized}`;
}
