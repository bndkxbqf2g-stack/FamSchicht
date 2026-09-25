create index if not exists idx_events_household_start
  on public.calendar_events(household_id, starts_at);

create index if not exists idx_events_creator
  on public.calendar_events(creator_id);

create index if not exists idx_households_owner
  on public.households(owner_id);

create index if not exists idx_memberships_user
  on public.memberships(user_id);
