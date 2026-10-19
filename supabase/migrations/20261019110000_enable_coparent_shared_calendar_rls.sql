-- Enable Anna's explicitly approved shared calendar scope.
-- Administrative tables remain owner-only. Coparent deletes stay owner/creator-only
-- until deletion is explicitly included in the product permission contract.

create or replace function public.is_household_coparent(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.household_id = hid
      and m.user_id = (select auth.uid())
      and m.role = 'coparent'
  );
$$;

revoke all on function public.is_household_coparent(uuid) from public;
revoke all on function public.is_household_coparent(uuid) from anon;
revoke all on function public.is_household_coparent(uuid) from authenticated;
grant execute on function public.is_household_coparent(uuid) to authenticated;

create or replace function public.get_my_household_context()
returns table (
  household_id uuid,
  household_name text,
  membership_role text
)
language sql
stable
security definer
set search_path = ''
as $$
  select h.id, h.name, m.role
  from public.memberships m
  join public.households h on h.id = m.household_id
  where m.user_id = (select auth.uid())
  order by h.created_at, h.id
  limit 1;
$$;

revoke all on function public.get_my_household_context() from public;
revoke all on function public.get_my_household_context() from anon;
revoke all on function public.get_my_household_context() from authenticated;
grant execute on function public.get_my_household_context() to authenticated;

create or replace function public.prevent_calendar_event_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'calendar_event_household_immutable' using errcode = '42501';
  end if;
  if new.creator_id is distinct from old.creator_id then
    raise exception 'calendar_event_creator_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_calendar_event_identity_change() from public;
revoke all on function public.prevent_calendar_event_identity_change() from anon;
revoke all on function public.prevent_calendar_event_identity_change() from authenticated;
grant execute on function public.prevent_calendar_event_identity_change() to authenticated, service_role;

drop trigger if exists trg_calendar_event_identity on public.calendar_events;
create trigger trg_calendar_event_identity
before update on public.calendar_events
for each row
execute function public.prevent_calendar_event_identity_change();

create policy event_coparent_read
on public.calendar_events for select
to authenticated
using (
  public.is_household_coparent(household_id)
  and visibility <> 'self'
  and category not in ('shift', 'private')
);

create policy event_coparent_insert
on public.calendar_events for insert
to authenticated
with check (
  public.is_household_coparent(household_id)
  and creator_id = (select auth.uid())
  and visibility <> 'self'
  and category not in ('shift', 'private')
);

create policy event_coparent_update
on public.calendar_events for update
to authenticated
using (
  public.is_household_coparent(household_id)
  and visibility <> 'self'
  and category not in ('shift', 'private')
)
with check (
  public.is_household_coparent(household_id)
  and visibility <> 'self'
  and category not in ('shift', 'private')
);
