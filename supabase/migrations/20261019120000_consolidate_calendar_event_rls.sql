-- Consolidate the owner and coparent calendar rules into one policy
-- per operation. The policy remains an OR only between the owner scope
-- and the explicitly approved shared coparent scope.

drop policy if exists event_owner_read on public.calendar_events;
drop policy if exists event_household_owner_read on public.calendar_events;
drop policy if exists event_coparent_read on public.calendar_events;
drop policy if exists event_owner_insert on public.calendar_events;
drop policy if exists event_coparent_insert on public.calendar_events;
drop policy if exists event_owner_update on public.calendar_events;
drop policy if exists event_household_owner_update on public.calendar_events;
drop policy if exists event_coparent_update on public.calendar_events;
drop policy if exists event_owner_delete on public.calendar_events;
drop policy if exists event_household_owner_delete on public.calendar_events;

create policy event_read
on public.calendar_events for select
to authenticated
using (
  exists (
    select 1
    from public.households h
    where h.id = calendar_events.household_id
      and h.owner_id = (select auth.uid())
  )
  or (
    public.is_household_coparent(household_id)
    and visibility <> 'self'
    and category not in ('shift', 'private')
  )
);

create policy event_insert
on public.calendar_events for insert
to authenticated
with check (
  (
    creator_id = (select auth.uid())
    and exists (
      select 1
      from public.households h
      where h.id = calendar_events.household_id
        and h.owner_id = (select auth.uid())
    )
  )
  or (
    public.is_household_coparent(household_id)
    and creator_id = (select auth.uid())
    and visibility <> 'self'
    and category not in ('shift', 'private')
  )
);

create policy event_update
on public.calendar_events for update
to authenticated
using (
  exists (
    select 1
    from public.households h
    where h.id = calendar_events.household_id
      and h.owner_id = (select auth.uid())
  )
  or (
    public.is_household_coparent(household_id)
    and visibility <> 'self'
    and category not in ('shift', 'private')
  )
)
with check (
  exists (
    select 1
    from public.households h
    where h.id = calendar_events.household_id
      and h.owner_id = (select auth.uid())
  )
  or (
    public.is_household_coparent(household_id)
    and visibility <> 'self'
    and category not in ('shift', 'private')
  )
);

create policy event_delete
on public.calendar_events for delete
to authenticated
using (
  exists (
    select 1
    from public.households h
    where h.id = calendar_events.household_id
      and h.owner_id = (select auth.uid())
  )
);
