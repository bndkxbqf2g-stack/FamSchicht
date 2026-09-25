-- FamSchicht: run in a NEW Supabase project via SQL editor.
-- Only the authenticated owner can create a household. Members join through
-- an admin-mediated invitation workflow (not implemented in the browser).
create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.memberships (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','partner','coparent')),
  primary key (household_id,user_id)
);
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
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  creator_id uuid not null default auth.uid() references auth.users(id),
  title text not null check(length(title) between 1 and 180),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  category text not null check(category in ('kids','family','shift','private')),
  visibility text not null check(visibility in ('all','home','self')),
  metadata jsonb not null default '{}'::jsonb,
  check (ends_at > starts_at),
  check (category not in ('shift','private') or visibility <> 'all')
);
create index if not exists idx_events_household_start on public.calendar_events(household_id,starts_at);
create index if not exists idx_events_creator on public.calendar_events(creator_id);
create index if not exists idx_households_owner on public.households(owner_id);
create index if not exists idx_memberships_user on public.memberships(user_id);

-- Invitation secrets stay outside the exposed Data API. Only the later
-- server-side invitation operations may access this table.
create table if not exists private.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipient_email text not null
    check (
      length(recipient_email) between 3 and 254
      and recipient_email = lower(btrim(recipient_email))
    ),
  role text not null check (role in ('partner','coparent')),
  token_hash text not null unique check (length(token_hash) = 64),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (
    (accepted_at is null and accepted_by is null)
    or
    (accepted_at is not null and accepted_by is not null)
  )
);
revoke all on table private.household_invitations from public;
revoke all on table private.household_invitations from anon;
revoke all on table private.household_invitations from authenticated;
create index if not exists idx_household_invitations_household
  on private.household_invitations(household_id);
create index if not exists idx_household_invitations_created_by
  on private.household_invitations(created_by);
create index if not exists idx_household_invitations_accepted_by
  on private.household_invitations(accepted_by)
  where accepted_by is not null;
create index if not exists idx_household_invitations_expires_at
  on private.household_invitations(expires_at);
create index if not exists idx_household_invitations_recipient_email
  on private.household_invitations(recipient_email);


-- SECURITY DEFINER membership checks avoid recursive RLS policies.
create or replace function public.is_household_member(hid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.memberships m where m.household_id=hid and m.user_id=(select auth.uid()));
$$;
create or replace function public.is_household_owner(hid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.households h where h.id=hid and h.owner_id=(select auth.uid()));
$$;
create or replace function public.can_read_event(hid uuid, owner uuid, vis text)
returns boolean language sql stable security definer set search_path = '' as $$
 select (select public.is_household_member(hid)) and (
 vis='all' or (vis='self' and owner=(select auth.uid())) or
 (vis='home' and exists(select 1 from public.memberships m where m.household_id=hid and m.user_id=(select auth.uid()) and m.role in ('owner','partner')))
 );
$$;
revoke all on function public.is_household_member(uuid),public.is_household_owner(uuid),public.can_read_event(uuid,uuid,text) from public;
grant execute on function public.is_household_member(uuid),public.is_household_owner(uuid),public.can_read_event(uuid,uuid,text) to authenticated;

alter table public.households enable row level security;
alter table public.memberships enable row level security;
alter table public.household_members enable row level security;
alter table public.calendar_events enable row level security;

-- Keep the public Data API surface minimal. Anonymous users never need direct
-- table access; authenticated users receive only the operations backed by RLS.
revoke all on table public.households from anon;
revoke all on table public.memberships from anon;
revoke all on table public.household_members from anon;
revoke all on table public.calendar_events from anon;
revoke all on table public.households from authenticated;
revoke all on table public.memberships from authenticated;
revoke all on table public.household_members from authenticated;
revoke all on table public.calendar_events from authenticated;
grant select, insert, update on table public.households to authenticated;
grant select on table public.memberships to authenticated;
grant select, insert, update, delete on table public.household_members to authenticated;
grant select, insert, update, delete on table public.calendar_events to authenticated;

create policy households_read on public.households for select to authenticated using (public.is_household_member(id));
create policy households_create on public.households for insert to authenticated with check (owner_id=(select auth.uid()));
create policy memberships_read on public.memberships for select to authenticated using (public.is_household_member(household_id));

-- Calendar-domain people are distinct from authenticated memberships and stay
-- owner-only until the invitation and multi-account RLS matrix are ready.
create policy household_members_owner_read on public.household_members for select to authenticated
using (public.is_household_owner(household_id));
create policy household_members_owner_insert on public.household_members for insert to authenticated
with check (public.is_household_owner(household_id));
create policy household_members_owner_update on public.household_members for update to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));
create policy household_members_owner_delete on public.household_members for delete to authenticated
using (public.is_household_owner(household_id));
-- A trigger creates owner membership; no client membership writes.
create or replace function public.add_household_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.memberships(household_id,user_id,role) values(new.id,new.owner_id,'owner');
 return new;
end; $$;
drop trigger if exists trg_household_owner on public.households;
create trigger trg_household_owner after insert on public.households for each row execute function public.add_household_owner();

create policy events_read on public.calendar_events for select to authenticated
using (public.can_read_event(household_id,creator_id,visibility));
create policy events_insert on public.calendar_events for insert to authenticated
with check (creator_id=(select auth.uid()) and public.is_household_member(household_id)
and (visibility <> 'home' or exists(select 1 from public.memberships m where m.household_id=calendar_events.household_id and m.user_id=(select auth.uid()) and m.role in ('owner','partner'))));
create policy events_update on public.calendar_events for update to authenticated
using (creator_id=(select auth.uid()) and public.is_household_member(household_id))
with check (creator_id=(select auth.uid()) and public.is_household_member(household_id)
and (visibility <> 'home' or exists(select 1 from public.memberships m where m.household_id=calendar_events.household_id and m.user_id=(select auth.uid()) and m.role in ('owner','partner'))));
create policy events_delete on public.calendar_events for delete to authenticated
using (creator_id=(select auth.uid()) and public.is_household_member(household_id));

-- Backfill for projects created before custody sync metadata was introduced.
alter table public.calendar_events add column if not exists metadata jsonb not null default '{}'::jsonb;
