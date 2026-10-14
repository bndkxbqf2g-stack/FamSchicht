const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const EVENT_TYPES = new Set(['family', 'shift']);
const EVENT_FIELDS = [
  'id', 'type', 'title', 'date', 'endDate', 'start', 'end', 'owner', 'ownerId',
  'source', 'readOnly', 'calendarSourceId', 'calendarProvider', 'calendarSourceLabel',
  'externalId', 'eventKind', 'recurrence', 'priority', 'completed', 'completedDates',
  'holidayCode', 'personId', 'creatorId', 'anchor', 'notCounted',
];

export function parseJsonBackup(text) {
  if (typeof text !== 'string' || text.length > 5 * 1024 * 1024) {
    throw new Error('Die JSON-Sicherung ist zu groß oder nicht lesbar.');
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Die JSON-Sicherung ist nicht gültig.');
  }
  if (!payload || payload.format !== 'famschicht-json' || payload.version !== 1 ||
      !Array.isArray(payload.events)) {
    throw new Error('Die JSON-Sicherung stammt nicht aus FamSchicht oder ist veraltet.');
  }
  return payload.events.map(normalizeBackupEvent);
}

export function mergeJsonBackupEvents(existing = [], incoming = []) {
  const current = Array.isArray(existing) ? existing : [];
  const added = [];
  const duplicates = [];
  const conflicts = [];

  for (const candidate of incoming) {
    const comparable = [...current, ...added];
    const sameId = comparable.find(entry => entry.id === candidate.id);
    if (sameId) {
      if (backupEventFingerprint(sameId) === backupEventFingerprint(candidate)) {
        duplicates.push({incoming: candidate, existing: sameId});
      } else {
        conflicts.push({incoming: candidate, existing: sameId, reason: 'same-id'});
      }
      continue;
    }
    const sameContent = comparable.find(entry =>
      backupEventFingerprint(entry) === backupEventFingerprint(candidate));
    if (sameContent) {
      duplicates.push({incoming: candidate, existing: sameContent});
      continue;
    }
    added.push(candidate);
  }

  return {
    events: [...current, ...added],
    added,
    duplicates,
    conflicts,
  };
}

function normalizeBackupEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('Die JSON-Sicherung enthält einen ungültigen Termin.');
  }
  const normalized = Object.fromEntries(EVENT_FIELDS
    .filter(field => event[field] !== undefined)
    .map(field => [field, cloneValue(event[field])]));
  if (!normalized.id || typeof normalized.id !== 'string' || normalized.id.length > 200 ||
      !normalized.title || typeof normalized.title !== 'string' || normalized.title.length > 500 ||
      !EVENT_TYPES.has(normalized.type) || !isDateKey(normalized.date)) {
    throw new Error('Die JSON-Sicherung enthält einen ungültigen Termin.');
  }
  if (normalized.endDate !== undefined &&
      (!isDateKey(normalized.endDate) || normalized.endDate < normalized.date)) {
    throw new Error('Die JSON-Sicherung enthält einen ungültigen Terminbereich.');
  }
  if ((normalized.start !== undefined && normalized.start !== '' && !isTime(normalized.start)) ||
      (normalized.end !== undefined && normalized.end !== '' && !isTime(normalized.end))) {
    throw new Error('Die JSON-Sicherung enthält eine ungültige Uhrzeit.');
  }
  if (normalized.completedDates !== undefined && !Array.isArray(normalized.completedDates)) {
    throw new Error('Die JSON-Sicherung enthält ungültige Erledigungsdaten.');
  }
  return normalized;
}

function backupEventFingerprint(event) {
  return JSON.stringify(EVENT_FIELDS
    .filter(field => field !== 'id')
    .map(field => [field, event?.[field] ?? null]));
}

function isDateKey(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(value + 'T12:00:00');
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10));
}

function isTime(value) {
  if (!TIME_PATTERN.test(value)) return false;
  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(3, 5));
  return hours < 24 && minutes < 60;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

