export function toDatabaseEvent(event, householdId, userId) {
  if (!householdId) throw new Error('householdId is required for database events');
  if (!userId) throw new Error('userId is required for database events');
  if (event.endDate && event.endDate < event.date) {
    throw new Error('endDate must not be before date');
  }
  const startsAt = localDateTime(event.date, event.start || '00:00');
  const endDate = event.endDate || event.date;
  let endsAt = localDateTime(endDate, event.end || endFallback(event.start));
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
    metadata: event.source === 'custody'
      ? {source: 'custody', anchor: event.anchor || null}
      : event.type === 'shift'
        ? (event.owner ? {owner: event.owner} : {})
        : (event.recurrence && event.recurrence !== 'none'
            ? {recurrence: event.recurrence}
            : {}),
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
    endDate: row.category !== 'shift' && localDateKey(end) !== localDateKey(start)
      ? localDateKey(end)
      : undefined,
    start: hasMeaningfulTime(start) ? localTime(start) : '',
    end: hasMeaningfulTime(end) ? localTime(end) : '',
    source: row.metadata?.source || 'supabase',
    anchor: row.metadata?.anchor || undefined,
    owner: row.category === 'shift' ? (row.metadata?.owner || undefined) : undefined,
    recurrence: row.category !== 'shift' && row.metadata?.recurrence
      ? row.metadata.recurrence
      : undefined,
  };
}

export async function loadOwnerEvents(supabase, householdId) {
  if (!householdId) throw new Error('householdId is required for cloud loading');
  const {data, error} = await supabase.from('calendar_events')
    .select('id,title,starts_at,ends_at,category,visibility,metadata')
    .eq('household_id', householdId)
    .order('starts_at');
  if (error) throw error;
  return (data || []).map(fromDatabaseEvent);
}

export async function saveOwnerEvents(supabase, events, householdId, userId) {
  if (!events.length) return [];
  if (!householdId) throw new Error('householdId is required for cloud saving');
  const payload = events.map(event => toDatabaseEvent(event, householdId, userId));
  const {error} = await supabase.from('calendar_events').insert(payload);
  if (error) throw error;
  return events;
}

export async function saveOwnerEvent(supabase, event, householdId, userId) {
  if (!householdId) throw new Error('householdId is required for cloud saving');
  const payload = toDatabaseEvent(event, householdId, userId);
  const {error} = await supabase.from('calendar_events').insert(payload);
  if (error) throw error;
  return event;
}

export async function updateOwnerEvent(supabase, event, householdId, userId) {
  if (!householdId) throw new Error('householdId is required for cloud updating');
  const payload = toDatabaseEvent(event, householdId, userId);
  const {id, household_id, ...changes} = payload;
  const query = supabase.from('calendar_events')
    .update(changes)
    .eq('id', id)
    .eq('household_id', household_id);
  const {error} = await query;
  if (error) throw error;
  return event;
}

export async function deleteOwnerEvent(supabase, eventId, householdId) {
  if (!householdId) throw new Error('householdId is required for cloud deletion');
  const query = supabase.from('calendar_events').delete().eq('id', eventId).eq('household_id', householdId);
  const {error} = await query;
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
