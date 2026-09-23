-- FamSchicht: run in a NEW Supabase project via SQL editor.
-- Only the authenticated owner can create a household. Members join through
-- an admin-mediated invitation workflow (not implemented in the browser).
create extension if not exists pgcrypto;

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
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  creator_id uuid not null default auth.uid() references auth.users(id),
  title text not null check(length(title) between 1 and 180),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  category text not null check(category in ('kids','family','shift','private')),
  visibility text not null check(visibility in ('all','home','self')),
  check (ends_at > starts_at),
  check (category not in ('shift','private') or visibility <> 'all')
);
create index if not exists idx_events_household_start on public.calendar_events(household_id,starts_at);

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
alter table public.calendar_events enable row level security;

create policy households_read on public.households for select to authenticated using (public.is_household_member(id));
create policy households_create on public.households for insert to authenticated with check (owner_id=(select auth.uid()));
create policy memberships_read on public.memberships for select to authenticated using (public.is_household_member(household_id));
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
