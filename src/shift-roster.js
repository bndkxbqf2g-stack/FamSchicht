const SERVICE_TYPES = {
  F1: {title: 'Frühdienst', start: '06:00', end: '14:12'},
  S1: {title: 'Spätdienst', start: '13:30', end: '21:42'},
  N5: {title: 'Nachtdienst', start: '21:15', end: '06:30'},
  NX: {title: 'Nachtdienst', start: '21:15', end: '06:30'},
  Z1: {title: 'Zwischendienst', start: '11:48', end: '20:00'},
};

const CODE_PATTERN = /\b(OZ|F1|S1|N5|NX|Z1|FA|SL|SG|U|O)\b/gi;

export function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/u)[0] || '';
}

export function normalizeRosterName(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-DE')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseRosterCell(value) {
  const codes = [...String(value || '').matchAll(CODE_PATTERN)]
    .map(match => match[0].toUpperCase());
  const serviceCode = codes.find(code => SERVICE_TYPES[code]);

  if (!serviceCode) {
    const code = codes.find(item => item !== 'OZ');
    return code ? {code, kind: ignoredKind(code)} : null;
  }

  const service = SERVICE_TYPES[serviceCode];
  return {
    code: serviceCode === 'NX' ? 'Nx' : serviceCode,
    title: service.title,
    start: service.start,
    end: service.end,
    notCounted: codes.includes('OZ'),
    ignoredForRoster: false,
  };
}

export function rosterShiftInterval(shift) {
  if (!shift?.date || !shift?.start || !shift?.end || shift.ignoredForRoster) return null;
  const start = parseLocalDateTime(shift.date, shift.start);
  let end = parseLocalDateTime(shift.date, shift.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (end <= start) end += 24 * 60 * 60 * 1000;
  return {start, end};
}

export function shiftsOverlap(first, second) {
  const firstInterval = rosterShiftInterval(first);
  const secondInterval = rosterShiftInterval(second);
  return Boolean(firstInterval && secondInterval &&
    firstInterval.start < secondInterval.end &&
    secondInterval.start < firstInterval.end);
}

export function coworkersOnOverlappingShift(myShift, roster) {
  const ownName = normalizeRosterName(myShift?.name);
  const names = new Map();
  for (const item of roster || []) {
    const personKey = normalizeRosterName(item?.name);
    if (!item || !personKey || personKey === ownName || !shiftsOverlap(myShift, item)) continue;
    const name = firstName(item.name);
    if (name && !names.has(personKey)) names.set(personKey, name);
  }
  return [...names.values()];
}

function ignoredKind(code) {
  if (code === 'O') return 'wish-free';
  if (code === 'U') return 'vacation';
  if (code === 'FA') return 'comp-time';
  if (code === 'SG') return 'home-office-or-training';
  if (code === 'SL') return 'leadership-service';
  return 'no-service';
}

function parseLocalDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return NaN;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) ||
      hour > 23 || minute > 59) return NaN;
  const value = new Date(date + 'T' + time + ':00Z');
  return value.getTime();
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
