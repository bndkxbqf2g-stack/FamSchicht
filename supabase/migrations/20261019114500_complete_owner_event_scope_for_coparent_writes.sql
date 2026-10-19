-- Keep the household owner able to see and manage events created by
-- an explicitly authorized coparent. This preserves the owner round-trip
-- when the coparent creates a shared calendar event or task.

create policy event_household_owner_read
on public.calendar_events for select
to authenticated
using (
  exists (
    select 1
    from public.households h
    where h.id = calendar_events.household_id
      and h.owner_id = (select auth.uid())
  )
);

create policy event_household_owner_update
on public.calendar_events for update
to authenticated
using (
  exists (
    select 1
    from public.households h
    where h.id = calendar_events.household_id
      and h.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.households h
    where h.id = calendar_events.household_id
      and h.owner_id = (select auth.uid())
  )
);

create policy event_household_owner_delete
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
