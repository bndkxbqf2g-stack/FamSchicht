const STORAGE_KEY = 'famschicht-shift-templates-v1';

export const DEFAULT_SHIFT_TEMPLATES = [
  {id: 'early', name: 'Frühdienst', title: 'Frühdienst', start: '06:00', end: '14:12', system: true},
  {id: 'late', name: 'Spätdienst', title: 'Spätdienst', start: '13:30', end: '21:42', system: true},
  {id: 'intermediate', name: 'Zwischendienst', title: 'Zwischendienst', start: '11:48', end: '20:00', system: true},
  {id: 'night', name: 'Nachtdienst', title: 'Nachtdienst', start: '21:15', end: '06:30', system: true},
  {id: 'sg', name: 'SG-Tag', title: 'SG-Tag', start: '', end: '', system: true},
  {id: 'vacation', name: 'Urlaub', title: 'Urlaub', start: '', end: '', system: true},
  {id: 'training', name: 'Fortbildung', title: 'Fortbildung', start: '', end: '', system: true},
  {id: 'sick', name: 'Krank', title: 'Krank', start: '', end: '', system: true},
];

export function loadShiftTemplates(storage = globalThis.localStorage) {
  const custom = readCustomTemplates(storage);
  return [...DEFAULT_SHIFT_TEMPLATES.map(template => ({...template})), ...custom];
}

export function saveShiftTemplates(templates, storage = globalThis.localStorage) {
  if (!storage) throw new Error('Lokaler Speicher ist nicht verfügbar.');
  const custom = (templates || [])
    .filter(template => !template?.system)
    .map(normalizeTemplate)
    .filter(Boolean);
  if (custom.length !== (templates || []).filter(template => !template?.system).length) {
    throw new Error('Die Schichtvorlage ist unvollständig.');
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(custom));
  return loadShiftTemplates(storage);
}

export function upsertShiftTemplate(templates, template) {
  const next = normalizeTemplate(template);
  if (!next) throw new Error('Die Schichtvorlage ist unvollständig oder ungültig.');
  const list = [...(templates || [])];
  const index = list.findIndex(item => item.id === next.id);
  if (index >= 0) list[index] = next;
  else list.push(next);
  return list;
}

export function removeShiftTemplate(templates, templateId) {
  return (templates || []).filter(template => template.id !== templateId || template.system);
}

export function normalizeShiftTemplate(template) {
  return normalizeTemplate(template);
}

function readCustomTemplates(storage) {
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.map(normalizeTemplate).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeTemplate(template) {
  if (!template || template.system || !String(template.name || '').trim() ||
      !String(template.title || '').trim() || !validTime(template.start) || !validTime(template.end)) {
    return null;
  }
  return {
    id: String(template.id || `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: String(template.name).trim().slice(0, 60),
    title: String(template.title).trim().slice(0, 120),
    start: String(template.start || ''),
    end: String(template.end || ''),
  };
}

function validTime(value) {
  if (value === '') return true;
  if (!/^\d{2}:\d{2}$/.test(String(value))) return false;
  const [hours, minutes] = String(value).split(':').map(Number);
  return hours <= 23 && minutes <= 59;
}
