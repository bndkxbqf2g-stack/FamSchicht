import {normalizeRosterName, parseRosterCell} from './shift-roster.js';

const MONTH_NAMES = {
  januar:1, februar:2, maerz:3, marz:3, april:4, mai:5, juni:6,
  juli:7, august:8, september:9, oktober:10, november:11, dezember:12,
};
const MAX_ROSTER_FILES = 4;
const MAX_ROSTER_BYTES = 35 * 1024 * 1024;
export const ROSTER_FILE_VALIDATION_ERROR = 'Bitte höchstens vier JPEG-, PNG- oder PDF-Dateien mit zusammen maximal 35 MB auswählen.';

export function validateRosterFiles(files) {
  const selected = [...(files || [])];
  const unsupported = selected.some(file => {
    const type = String(file?.type || '').toLowerCase();
    const name = String(file?.name || '').toLowerCase();
    const hasExtension = /\.[a-z0-9]+$/.test(name);
    const supportedExtension = /\.(?:jpe?g|png|pdf)$/.test(name);
    if (hasExtension && !supportedExtension) return true;
    return !['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(type) &&
      !(type === '' && supportedExtension);
  });
  const totalBytes = selected.reduce((total, file) => total + Math.max(0, Number(file?.size) || 0), 0);
  if (selected.length > MAX_ROSTER_FILES || unsupported || totalBytes > MAX_ROSTER_BYTES) {
    return ROSTER_FILE_VALIDATION_ERROR;
  }
  return '';
}

export function validateRosterDraft(roster) {
  const month = String(roster?.month || '');
  const selfName = String(roster?.selfName || '').trim();
  const entries = roster?.entries;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !selfName || !Array.isArray(entries) || !entries.length) {
    return 'Bitte Monat, deine Planzeile und mindestens einen Dienst prüfen.';
  }
  if (entries.some(entry => !String(entry?.name || '').trim())) {
    return 'Jede erkannte Dienstzeile braucht einen Namen.';
  }
  if (entries.some(entry => !isRosterDateInMonth(entry?.date, month) || !parseRosterCell(entry?.code)?.start)) {
    return 'Mindestens ein Dienst hat ein ungültiges Datum oder Kürzel. Bitte korrigiere die Vorschau.';
  }
  return '';
}

export function isRosterDateInMonth(date, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(String(date || '')) ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))) return false;
  const [year, monthNumber, day] = String(date).split('-').map(Number);
  const [monthYear, monthValue] = String(month).split('-').map(Number);
  if (year !== monthYear || monthNumber !== monthValue) return false;
  return day >= 1 && day <= new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

export function parseRosterPeriod(text) {
  const year = parseRosterYear(text);
  const month = parseRosterMonth(text);
  return year && month ? `${year}-${String(month).padStart(2, '0')}` : null;
}

export function parseRosterYear(text) {
  const normalized = normalizeRosterName(text);
  return Number(normalized.match(/\b(20\d{2})\b/)?.[1]) || null;
}

export function parseRosterMonth(text) {
  const normalized = normalizeRosterName(text);
  return Object.entries(MONTH_NAMES)
    .find(([name]) => normalized.includes(name))?.[1] || null;
}

export function extractRosterPage({words, width, height, period}) {
  if (!Array.isArray(words) || !width || !height || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) {
    return [];
  }

  const [year, month] = period.split('-').map(Number);
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const nameWords = words.filter(word => /\p{L}/u.test(wordText(word)) && word.bbox &&
    centerX(word) < width * 0.19 && centerY(word) > height * 0.12 && centerY(word) < height * 0.86);
  const rows = groupNameWords(nameWords, height)
    .filter(row => row.name.length >= 4 && normalizeRosterName(row.name) !== 'name')
    .sort((a, b) => a.y - b.y);
  const rosterRows = inferRosterRows(rows, height);
  if (!rosterRows.length) return [];

  const firstColumnCenter = width * 0.2;
  const lastColumnCenter = width * 0.822;
  const recognizedWords = words.filter(word => {
    const text = wordText(word);
    return text && word.bbox &&
      centerX(word) >= width * 0.17 && centerX(word) <= width * 0.85 &&
      centerY(word) >= height * 0.13 &&
      (parseRosterCell(text) || parseRosterOcrCell(text) || /^OZ$/i.test(text));
  });
  const cells = new Map();

  for (const word of recognizedWords) {
    const y = centerY(word);
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    rosterRows.forEach((row, index) => {
      const distance = Math.abs(y - row.y);
      if (distance < nearestDistance) {
        nearestIndex = index;
        nearestDistance = distance;
      }
    });
    if (nearestIndex < 0 || nearestDistance > height * 0.033) continue;

    const column = Math.round((centerX(word) - firstColumnCenter) /
      (lastColumnCenter - firstColumnCenter) * (dayCount - 1));
    if (column < 0 || column >= dayCount) continue;
    const key = `${nearestIndex}:${column}`;
    const values = cells.get(key) || [];
    values.push(normalizeRosterOcrToken(wordText(word)) || wordText(word));
    cells.set(key, values);
  }

  const entries = [];
  for (const [key, values] of cells) {
    const [rowIndex, column] = key.split(':').map(Number);
    const parsed = parseRosterCell(values.join(' '));
    if (!parsed?.start || !parsed?.end) continue;
    const date = `${period}-${String(column + 1).padStart(2, '0')}`;
    entries.push({
      name: rosterRows[rowIndex].name,
      date,
      code: parsed.code,
      title: parsed.title,
      start: parsed.start,
      end: parsed.end,
      notCounted: parsed.notCounted,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'de'));
}

export function extractBestRosterPage(page, period) {
  const candidates = [page?.words, ...(page?.alternatives || []).map(item => item?.words)]
    .filter(Array.isArray)
    .map(words => extractRosterPage({...page, words, period}));
  return candidates.reduce((best, entries) => entries.length > best.length ? entries : best, []);
}

export function parseRosterOcrCell(value) {
  const direct = parseRosterCell(value);
  if (direct) return direct;
  const normalized = normalizeRosterOcrToken(value);
  return normalized && normalized !== 'OZ' ? parseRosterCell(normalized) : null;
}

export function mergeRosterPages(pages) {
  const byIdentity = new Map();
  for (const entry of pages.flat()) {
    const key = `${normalizeRosterName(entry.name)}:${entry.date}`;
    const previous = byIdentity.get(key);
    if (!previous || (entry.notCounted && !previous.notCounted)) byIdentity.set(key, entry);
  }
  return [...byIdentity.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'de'));
}

function groupNameWords(words, height) {
  const sorted = [...words].sort((a, b) => centerY(a) - centerY(b) || centerX(a) - centerX(b));
  const lines = [];
  for (const word of sorted) {
    const y = centerY(word);
    let line = lines.find(candidate => Math.abs(candidate.y - y) <= height * 0.02);
    if (!line) {
      line = {y, words: []};
      lines.push(line);
    }
    line.words.push(word);
    line.y = line.words.reduce((sum, item) => sum + centerY(item), 0) / line.words.length;
  }
  return lines.map(line => ({
    y: line.y,
    name: line.words.sort((a, b) => centerX(a) - centerX(b)).map(wordText).join(' ').trim(),
  }));
}

function inferRosterRows(rows, height) {
  if (rows.length < 2) return rows;
  const gaps = rows.slice(1)
    .map((row, index) => row.y - rows[index].y)
    .filter(gap => gap > height * 0.02 && gap < height * 0.2);
  if (!gaps.length) return rows;

  const spacing = median(gaps);
  if (!Number.isFinite(spacing) || spacing <= 0) return rows;

  const expanded = [];
  rows.forEach((row, index) => {
    if (index === 0) {
      expanded.push(row);
      return;
    }
    const previous = rows[index - 1];
    const gap = row.y - previous.y;
    const multiples = Math.round(gap / spacing);
    const canFillGap = multiples >= 2 && multiples <= 4 &&
      Math.abs(gap - multiples * spacing) <= spacing * 0.28;
    if (canFillGap) {
      for (let missing = 1; missing < multiples; missing += 1) {
        expanded.push({
          y: previous.y + spacing * missing,
          name: `Unbekannte Zeile ${expanded.length + 1}`,
        });
      }
    }
    expanded.push(row);
  });
  return expanded;
}

function normalizeRosterOcrToken(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const compact = raw
    .normalize('NFKD')
    .toUpperCase()
    .replace(/\u0131/g, 'I')
    .replace(/\$/g, '5')
    .replace(/[^A-Z0-9]/g, '');
  if (!compact) return null;

  const hasNotCounted = compact.includes('OZ');
  const withoutMarker = compact.replace(/OZ/g, '');
  const code = resolveRosterOcrCode(withoutMarker);
  if (!code) return hasNotCounted ? 'OZ' : null;
  return `${hasNotCounted ? 'OZ ' : ''}${code}`;
}

function resolveRosterOcrCode(value) {
  const variants = [
    ['FRI', 'F1'], ['IS1', 'S1'], ['NIX', 'Nx'], ['N1X', 'Nx'],
    ['F1', 'F1'], ['FI', 'F1'], ['FL', 'F1'], ['FR', 'F1'], ['RI', 'F1'], ['IR', 'F1'], ['R1', 'F1'],
    ['S1', 'S1'], ['SI', 'S1'], ['SL', 'S1'], ['51', 'S1'], ['IS', 'S1'],
    ['N5', 'N5'], ['NS', 'N5'], ['NX', 'Nx'], ['NR', 'Nx'], ['N7', 'Nx'],
    ['Z1', 'Z1'], ['ZI', 'Z1'], ['ZL', 'Z1'], ['ZR', 'Z1'],
  ];
  for (const [variant, code] of variants) {
    if (value === variant) return code;
    if (value.length > variant.length && value.length % variant.length === 0 &&
        value === variant.repeat(value.length / variant.length)) return code;
  }
  if (value.startsWith('I')) return resolveRosterOcrCode(value.slice(1));
  return null;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function wordText(word) {
  return String(word?.text || '').trim();
}
function centerX(word) { return (word.bbox.x0 + word.bbox.x1) / 2; }
function centerY(word) { return (word.bbox.y0 + word.bbox.y1) / 2; }

