const PROVIDERS = [
  {id: 'ics', label: 'ICS-Datei', mode: 'read-only'},
  {id: 'google', label: 'Google Calendar', mode: 'read-only'},
  {id: 'microsoft', label: 'Outlook / Microsoft Calendar', mode: 'read-only'},
];

const READ_ONLY_SOURCE_NAMES = new Set([
  'calendar-import',
  'holiday-calendar',
  'ics-import',
  'shift-roster-import',
]);

export function calendarProviderCatalog() {
  return PROVIDERS.map(provider => ({...provider}));
}

export function createReadOnlyCalendarSource({id, provider = 'ics', memberId = '', label = ''} = {}) {
  const sourceId = String(id || '').trim();
  const definition = PROVIDERS.find(item => item.id === provider);
  if (!sourceId) throw new Error('calendar source id is required');
  if (!definition) throw new Error('unsupported calendar provider');
  return {
    id: sourceId,
    provider: definition.id,
    label: String(label || definition.label).trim() || definition.label,
    memberId: String(memberId || '').trim() || null,
    mode: 'read-only',
  };
}

export function isReadOnlyCalendarEntry(event) {
  return Boolean(event?.readOnly) || READ_ONLY_SOURCE_NAMES.has(event?.source);
}

export function calendarEventFingerprint(event) {
  return [
    event?.type || 'family',
    String(event?.title || '').trim().toLocaleLowerCase('de-DE'),
    event?.date || '',
    event?.endDate || '',
    event?.start || '',
    event?.end || '',
    event?.eventKind || 'event',
    event?.recurrence || 'none',
  ].join('|');
}

export function mergeReadOnlyCalendarEvents(existing = [], incoming = [], source, {idFactory} = {}) {
  const normalizedSource = source?.id ? source : createReadOnlyCalendarSource(source);
  const current = Array.isArray(existing) ? existing : [];
  const added = [];
  const duplicates = [];
  const conflicts = [];

  for (const candidate of incoming || []) {
    if (!candidate?.date || !candidate?.title) continue;
    const item = normalizeImportedEvent(candidate, normalizedSource, idFactory);
    const comparable = [...current, ...added];
    const identityMatch = item.externalId
      ? comparable.find(entry => entry.calendarSourceId === item.calendarSourceId &&
        entry.externalId === item.externalId)
      : null;
    if (identityMatch) {
      if (calendarEventFingerprint(identityMatch) === calendarEventFingerprint(item)) {
        duplicates.push({incoming: item, existing: identityMatch});
      } else {
        conflicts.push({incoming: item, existing: identityMatch, reason: 'same-external-id'});
      }
      continue;
    }

    const exactMatch = comparable.find(entry =>
      calendarEventFingerprint(entry) === calendarEventFingerprint(item));
    if (exactMatch) {
      duplicates.push({incoming: item, existing: exactMatch});
      continue;
    }

    const timingConflict = comparable.find(entry => sameCalendarSlot(entry, item));
    if (timingConflict) {
      conflicts.push({incoming: item, existing: timingConflict, reason: 'same-calendar-slot'});
      continue;
    }
    added.push(item);
  }

  return {
    events: [...current, ...added],
    added,
    duplicates,
    conflicts,
  };
}

function normalizeImportedEvent(event, source, idFactory) {
  const externalId = String(event.externalId || event.uid || event.id || '').trim() || null;
  const seed = externalId || calendarEventFingerprint(event);
  const id = idFactory?.(source, event, seed) || `calendar-${safeToken(source.id)}-${safeToken(seed)}`;
  const item = {
    ...event,
    id,
    source: 'calendar-import',
    readOnly: true,
    calendarSourceId: source.id,
    calendarProvider: source.provider,
    calendarSourceLabel: source.label,
  };
  if (externalId) item.externalId = externalId;
  if (source.memberId && !item.ownerId) item.ownerId = source.memberId;
  return item;
}

function sameCalendarSlot(first, second) {
  return first?.date === second?.date &&
    (first?.endDate || '') === (second?.endDate || '') &&
    (first?.start || '') === (second?.start || '') &&
    (first?.end || '') === (second?.end || '');
}

function safeToken(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'event';
}

