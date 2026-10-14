const RECURRENCE_TO_ICS = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
};
const ICS_TO_RECURRENCE = Object.fromEntries(
  Object.entries(RECURRENCE_TO_ICS).map(([key, value]) => [value, key]),
);
const EVENT_KINDS = new Set(['birthday', 'school', 'sport', 'doctor', 'holiday', 'task', 'routine']);
const TASK_LIKE_KINDS = new Set(['task', 'routine']);
const COMPLETED_DATE_PROPERTY = 'X-FAMSCHICHT-COMPLETED-DATES';

export function eventsToIcs(events, {
  calendarName = 'FamSchicht',
  timezone = 'Europe/Berlin',
  now = new Date(),
} = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FamSchicht//Family calendar//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    `X-WR-TIMEZONE:${escapeIcs(timezone)}`,
  ];

  for (const event of events || []) {
    if (!event?.date || !event.title) continue;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcs(`${event.id || `${event.date}-${event.title}`}@famschicht`)}`);
    lines.push(`DTSTAMP:${formatUtc(now)}`);
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    lines.push(`CATEGORIES:${escapeIcs(categoryForEvent(event))}`);
    if (event.start) {
      const start = localDateTime(event.date, event.start);
      const endDate = event.endDate || event.date;
      const end = localDateTime(endDate, event.end || addMinutes(event.start, 60));
      if (!start || !end) {
        lines.pop();
        lines.pop();
        lines.pop();
        lines.pop();
        lines.pop();
        continue;
      }
      if (end <= start) end.setDate(end.getDate() + 1);
      lines.push(`DTSTART;TZID=${timezone}:${formatLocal(start)}`);
      lines.push(`DTEND;TZID=${timezone}:${formatLocal(end)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${dateToken(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${dateToken(addDays(event.endDate || event.date, 1))}`);
    }
    const recurrence = RECURRENCE_TO_ICS[event.recurrence];
    if (recurrence) lines.push(`RRULE:FREQ=${recurrence}`);
    if (TASK_LIKE_KINDS.has(event.eventKind) && event.completed) {
      lines.push('STATUS:COMPLETED');
    }
    if (TASK_LIKE_KINDS.has(event.eventKind) && Array.isArray(event.completedDates) && event.completedDates.length) {
      lines.push(`${COMPLETED_DATE_PROPERTY}:${escapeIcs(event.completedDates.join(','))}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function parseIcs(text) {
  const lines = unfold(String(text || '').replace(/^\uFEFF/, ''));
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      const event = parseEvent(current);
      if (event) events.push(event);
      current = null;
      continue;
    }
    if (!current) continue;
    const property = parseProperty(line);
    if (property) current[property.name] = property;
  }
  return events;
}

function parseEvent(properties) {
  const start = parseDateProperty(properties.DTSTART);
  if (!start?.date) return null;
  const end = parseDateProperty(properties.DTEND);
  const category = String(properties.CATEGORIES?.value || '').split(',')[0].toLowerCase();
  const isShift = category === 'shift';
  const eventKind = isShift ? undefined : EVENT_KINDS.has(category) ? category : 'event';
  const result = {
    id: String(properties.UID?.value || `${start.date}-${properties.SUMMARY?.value || 'event'}`),
    type: isShift ? 'shift' : 'family',
    title: unescapeIcs(properties.SUMMARY?.value || 'Importierter Termin'),
    date: start.date,
    start: start.time || '',
    end: end?.time || '',
  };
  if (eventKind) result.eventKind = eventKind;

  if (start.isDateOnly) {
    result.start = '';
    result.end = '';
    if (end?.date && end.date !== addDays(start.date, 1)) {
      result.endDate = addDays(end.date, -1);
    }
  }
  if (properties.STATUS?.value?.toUpperCase() === 'COMPLETED' && TASK_LIKE_KINDS.has(eventKind)) {
    result.completed = true;
  }
  const recurrence = parseRecurrence(properties.RRULE?.value);
  if (recurrence !== 'none') result.recurrence = recurrence;
  if (TASK_LIKE_KINDS.has(eventKind) && properties[COMPLETED_DATE_PROPERTY]?.value) {
    const completedDates = unescapeIcs(properties[COMPLETED_DATE_PROPERTY].value)
      .split(',')
      .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value));
    if (completedDates.length) result.completedDates = [...new Set(completedDates)].sort();
  }
  if (!TASK_LIKE_KINDS.has(eventKind)) {
    delete result.completed;
    delete result.completedDates;
  }
  return result;
}

function parseDateProperty(property) {
  if (!property?.value) return null;
  const value = property.value.trim();
  if (/^\d{8}$/.test(value) || property.params.VALUE === 'DATE') {
    if (!/^\d{8}$/.test(value)) return null;
    return {date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, isDateOnly: true};
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return null;
  if (match[7]) {
    const utc = new Date(Date.UTC(
      Number(match[1]), Number(match[2]) - 1, Number(match[3]),
      Number(match[4]), Number(match[5]), Number(match[6]),
    ));
    return {
      date: localDatePart(utc),
      time: localTimePart(utc),
      isDateOnly: false,
    };
  }
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
    isDateOnly: false,
  };
}

function parseProperty(line) {
  const separator = line.indexOf(':');
  if (separator < 1) return null;
  const [name, ...parameterParts] = line.slice(0, separator).split(';');
  const params = {};
  parameterParts.forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) params[key.toUpperCase()] = value.replace(/^"|"$/g, '').toUpperCase();
  });
  return {name: name.toUpperCase(), params, value: line.slice(separator + 1)};
}

function unfold(text) {
  return text.split(/\r?\n/).reduce((lines, line) => {
    if (/^[ \t]/.test(line) && lines.length) lines[lines.length - 1] += line.slice(1);
    else lines.push(line);
    return lines;
  }, []);
}

function categoryForEvent(event) {
  if (event.type === 'shift') return 'SHIFT';
  return String(event.eventKind || 'family').toUpperCase();
}

function parseRecurrence(value) {
  const frequency = String(value || '').split(';')
    .map(part => part.split('='))
    .find(([key]) => key.toUpperCase() === 'FREQ')?.[1]?.toUpperCase();
  return ICS_TO_RECURRENCE[frequency] || 'none';
}

function escapeIcs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;')
    .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function unescapeIcs(value) {
  return String(value || '').replace(/\\n/gi, '\n').replace(/\\([\\;,])/g, '$1');
}

function dateToken(value) { return String(value).replaceAll('-', ''); }

function addDays(value, amount) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(time))) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function addMinutes(time, amount) {
  const value = new Date(`2000-01-01T${time}:00`);
  value.setMinutes(value.getMinutes() + amount);
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function formatLocal(value) {
  return `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, '0')}${String(value.getDate()).padStart(2, '0')}T${String(value.getHours()).padStart(2, '0')}${String(value.getMinutes()).padStart(2, '0')}00`;
}

function formatUtc(value) {
  return `${value.getUTCFullYear()}${String(value.getUTCMonth() + 1).padStart(2, '0')}${String(value.getUTCDate()).padStart(2, '0')}T${String(value.getUTCHours()).padStart(2, '0')}${String(value.getUTCMinutes()).padStart(2, '0')}${String(value.getUTCSeconds()).padStart(2, '0')}Z`;
}

function localDatePart(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function localTimePart(value) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}
