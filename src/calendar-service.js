export function toDatabaseEvent(event, householdId, userId) {
  const startsAt = localDateTime(event.date, event.start || '00:00');
  let endsAt = localDateTime(event.date, event.end || endFallback(event.start));
  if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1);
  return {
    id: event.id,
    household_id: householdId,
    creator_id: userId,
    title: event.title,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    category: event.type === 'shift' ? 'shift' : 'family',
    visibility: event.type === 'shift' ? 'self' : 'home',
  };
}

export function fromDatabaseEvent(row) {
  const start = new Date(row.starts_at);
  const end = new Date(row.ends_at);
  return {
    id: row.id,
    type: row.category === 'shift' ? 'shift' : 'family',
    title: row.title,
    date: localDateKey(start),
    start: hasMeaningfulTime(start) ? localTime(start) : '',
    end: hasMeaningfulTime(end) ? localTime(end) : '',
    source: 'supabase',
  };
}

export async function loadOwnerEvents(supabase, householdId) {
  const {data, error} = await supabase.from('calendar_events')
    .select('id,title,starts_at,ends_at,category,visibility')
    .eq('household_id', householdId)
    .order('starts_at');
  if (error) throw error;
  return (data || []).map(fromDatabaseEvent);
}

export async function saveOwnerEvent(supabase, event, householdId, userId) {
  const payload = toDatabaseEvent(event, householdId, userId);
  const {error} = await supabase.from('calendar_events').insert(payload);
  if (error) throw error;
  return event;
}

export async function deleteOwnerEvent(supabase, eventId) {
  const {error} = await supabase.from('calendar_events').delete().eq('id', eventId);
  if (error) throw error;
}

function localDateTime(date, time) {
  return new Date(date + 'T' + time + ':00');
}
function endFallback(start) {
  if (!start) return '23:59';
  const d = new Date('2000-01-01T' + start + ':00');
  d.setMinutes(d.getMinutes() + 60);
  return localTime(d);
}
function localDateKey(d) {
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
}
function localTime(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function pad(n) { return String(n).padStart(2, '0'); }
function hasMeaningfulTime(d) { return d.getHours() !== 0 || d.getMinutes() !== 0; }
