const REGION_STORAGE_KEY = 'famschicht-holiday-region-v1';

const REGION_OPTIONS = [
  ['DE', 'Nur bundesweite Feiertage'],
  ['BW', 'Baden-Württemberg'],
  ['BY', 'Bayern'],
  ['BE', 'Berlin'],
  ['BB', 'Brandenburg'],
  ['HB', 'Bremen'],
  ['HH', 'Hamburg'],
  ['HE', 'Hessen'],
  ['MV', 'Mecklenburg-Vorpommern'],
  ['NI', 'Niedersachsen'],
  ['NW', 'Nordrhein-Westfalen'],
  ['RP', 'Rheinland-Pfalz'],
  ['SL', 'Saarland'],
  ['SN', 'Sachsen'],
  ['ST', 'Sachsen-Anhalt'],
  ['SH', 'Schleswig-Holstein'],
  ['TH', 'Thüringen'],
];

const REGION_CODES = new Set(REGION_OPTIONS.map(([code]) => code));
const EPIPHANY_STATES = new Set(['BW', 'BY', 'ST']);
const WOMENS_DAY_STATES = new Set(['BE', 'MV']);
const CORPUS_CHRISTI_STATES = new Set(['BW', 'BY', 'HE', 'NW', 'RP', 'SL']);
const REFORMATION_DAY_STATES = new Set(['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH']);
const ALL_SAINTS_STATES = new Set(['BW', 'BY', 'NW', 'RP', 'SL']);

export function holidayRegionOptions() {
  return REGION_OPTIONS.map(([code, label]) => [code, label]);
}

export function holidayRegionLabel(region) {
  return REGION_OPTIONS.find(([code]) => code === String(region || '').trim())?.[1] || REGION_OPTIONS[0][1];
}

export function loadHolidayRegion(storage = defaultStorage()) {
  try {
    const value = String(storage?.getItem(REGION_STORAGE_KEY) || '').trim();
    return REGION_CODES.has(value) ? value : 'DE';
  } catch {
    return 'DE';
  }
}

export function saveHolidayRegion(region, storage = defaultStorage()) {
  const value = normalizeRegion(region);
  try {
    storage?.setItem(REGION_STORAGE_KEY, value);
  } catch {
    // A private browsing context can reject localStorage. The selected value
    // still remains active for the current session.
  }
  return value;
}

export function germanHolidayEntries(year, region = 'DE') {
  const normalizedYear = normalizeYear(year);
  const normalizedRegion = normalizeRegion(region);
  const entries = [];
  const add = (code, title, date) => {
    entries.push({
      id: `holiday-${normalizedRegion}-${normalizedYear}-${code}`,
      type: 'family',
      eventKind: 'holiday',
      title,
      date,
      holidayCode: code,
      source: 'holiday-calendar',
      readOnly: true,
      calendarSourceId: `holidays-${normalizedRegion}`,
      calendarProvider: 'holiday',
      calendarSourceLabel: `Feiertage · ${holidayRegionLabel(normalizedRegion)}`,
      externalId: `${normalizedYear}-${code}`,
    });
  };

  add('new-year', 'Neujahr', dateOf(normalizedYear, 1, 1));
  add('labour-day', 'Tag der Arbeit', dateOf(normalizedYear, 5, 1));
  add('german-unity-day', 'Tag der Deutschen Einheit', dateOf(normalizedYear, 10, 3));
  add('christmas-day', '1. Weihnachtstag', dateOf(normalizedYear, 12, 25));
  add('boxing-day', '2. Weihnachtstag', dateOf(normalizedYear, 12, 26));

  const easter = easterSunday(normalizedYear);
  add('good-friday', 'Karfreitag', offsetDate(easter, -2));
  add('easter-monday', 'Ostermontag', offsetDate(easter, 1));
  add('ascension-day', 'Christi Himmelfahrt', offsetDate(easter, 39));
  add('whit-monday', 'Pfingstmontag', offsetDate(easter, 50));

  if (EPIPHANY_STATES.has(normalizedRegion)) {
    add('epiphany', 'Heilige Drei Könige', dateOf(normalizedYear, 1, 6));
  }
  if (WOMENS_DAY_STATES.has(normalizedRegion)) {
    add('womens-day', 'Internationaler Frauentag', dateOf(normalizedYear, 3, 8));
  }
  if (CORPUS_CHRISTI_STATES.has(normalizedRegion)) {
    add('corpus-christi', 'Fronleichnam', offsetDate(easter, 60));
  }
  if (normalizedRegion === 'SL') {
    add('assumption-day', 'Mariä Himmelfahrt', dateOf(normalizedYear, 8, 15));
  }
  if (normalizedRegion === 'TH') {
    add('world-childrens-day', 'Weltkindertag', dateOf(normalizedYear, 9, 20));
  }
  if (REFORMATION_DAY_STATES.has(normalizedRegion)) {
    add('reformation-day', 'Reformationstag', dateOf(normalizedYear, 10, 31));
  }
  if (ALL_SAINTS_STATES.has(normalizedRegion)) {
    add('all-saints-day', 'Allerheiligen', dateOf(normalizedYear, 11, 1));
  }
  if (normalizedRegion === 'SN') {
    add('day-of-prayer-and-repentance', 'Buß- und Bettag', sachsenDayOfPrayer(normalizedYear));
  }

  return entries.sort((first, second) => first.date.localeCompare(second.date) || first.id.localeCompare(second.id));
}

function normalizeRegion(region) {
  const value = String(region || '').trim().toUpperCase();
  if (!REGION_CODES.has(value)) throw new Error('unsupported German holiday region');
  return value;
}

function normalizeYear(year) {
  const value = Number(year);
  if (!Number.isInteger(value) || value < 1900 || value > 2200) {
    throw new Error('holiday year must be between 1900 and 2200');
  }
  return value;
}

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function dateOf(year, month, day) {
  const date = new Date(year, month - 1, day, 12);
  return dateKey(date);
}

function offsetDate(date, days) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return dateKey(shifted);
}

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

function sachsenDayOfPrayer(year) {
  const date = new Date(year, 10, 22, 12);
  while (date.getDay() !== 3) date.setDate(date.getDate() - 1);
  return dateKey(date);
}

