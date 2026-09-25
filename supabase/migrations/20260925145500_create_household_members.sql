-- Persist calendar-domain people separately from authenticated memberships.
-- This remains owner-only until the invitation/RLS matrix is explicitly ready.
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  member_key text not null check (length(member_key) between 1 and 64),
  name text not null check (length(name) between 1 and 80),
  member_type text not null check (member_type in ('adult','child','guest')),
  color_key text not null check (length(color_key) between 1 and 64),
  shift_eligible boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (household_id, member_key)
);

alter table public.household_members enable row level security;

revoke all on table public.household_members from anon;
revoke all on table public.household_members from authenticated;
grant select, insert, update, delete on table public.household_members to authenticated;

create policy household_members_owner_read
on public.household_members for select
to authenticated
using (exists (
  select 1 from public.households h
  where h.id = household_members.household_id
    and h.owner_id = (select auth.uid())
));

create policy household_members_owner_insert
on public.household_members for insert
to authenticated
with check (exists (
  select 1 from public.households h
  where h.id = household_members.household_id
    and h.owner_id = (select auth.uid())
));

create policy household_members_owner_update
on public.household_members for update
to authenticated
using (exists (
  select 1 from public.households h
  where h.id = household_members.household_id
    and h.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.households h
  where h.id = household_members.household_id
    and h.owner_id = (select auth.uid())
));

create policy household_members_owner_delete
on public.household_members for delete
to authenticated
using (exists (
  select 1 from public.households h
  where h.id = household_members.household_id
    and h.owner_id = (select auth.uid())
));
