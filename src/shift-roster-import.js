import {normalizeRosterName, parseRosterCell} from './shift-roster.js';

const MONTH_NAMES = {
  januar:1, februar:2, maerz:3, marz:3, april:4, mai:5, juni:6,
  juli:7, august:8, september:9, oktober:10, november:11, dezember:12,
};

export function parseRosterPeriod(text) {
  const normalized = normalizeRosterName(text);
  const year = Number(normalized.match(/\b(20\d{2})\b/)?.[1]) || null;
  const month = Object.entries(MONTH_NAMES)
    .find(([name]) => normalized.includes(name))?.[1] || null;
  return year && month ? `${year}-${String(month).padStart(2, '0')}` : null;
}

export function extractRosterPage({words, width, height, period}) {
  if (!Array.isArray(words) || !width || !height || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) {
    return [];
  }

  const [year, month] = period.split('-').map(Number);
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const nameWords = words.filter(word => wordText(word) && word.bbox &&
    centerX(word) < width * 0.19 && centerY(word) > height * 0.12 && centerY(word) < height * 0.86);
  const rows = groupNameWords(nameWords, height)
    .filter(row => row.name.length >= 4 && normalizeRosterName(row.name) !== 'name')
    .sort((a, b) => a.y - b.y);
  if (!rows.length) return [];

  const firstColumnCenter = width * 0.2;
  const lastColumnCenter = width * 0.822;
  const recognizedWords = words.filter(word => wordText(word) && word.bbox &&
    centerX(word) >= width * 0.17 && centerX(word) <= width * 0.85 &&
    (parseRosterCell(wordText(word)) || /^OZ$/i.test(wordText(word))));
  const cells = new Map();

  for (const word of recognizedWords) {
    const y = centerY(word);
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    rows.forEach((row, index) => {
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
    values.push(wordText(word));
    cells.set(key, values);
  }

  const entries = [];
  for (const [key, values] of cells) {
    const [rowIndex, column] = key.split(':').map(Number);
    const parsed = parseRosterCell(values.join(' '));
    if (!parsed?.start || !parsed?.end) continue;
    const date = `${period}-${String(column + 1).padStart(2, '0')}`;
    entries.push({
      name: rows[rowIndex].name,
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

function wordText(word) {
  return String(word?.text || '').trim();
}
function centerX(word) { return (word.bbox.x0 + word.bbox.x1) / 2; }
function centerY(word) { return (word.bbox.y0 + word.bbox.y1) / 2; }
