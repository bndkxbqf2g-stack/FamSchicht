drop function if exists public.create_household_invitation(uuid, text, text, integer);
drop function if exists public.accept_household_invitation(text);
drop function if exists public.revoke_household_invitation(uuid);

grant usage on schema private to service_role;
grant select, insert, update, delete on table private.household_invitations to service_role;

create or replace function public.edge_create_household_invitation(
  p_actor_id uuid,
  p_household_id uuid,
  p_recipient_email text,
  p_role text,
  p_ttl_seconds integer default 604800
)
returns table (
  invitation_id uuid,
  invitation_token text,
  invitation_expires_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_recipient_email, '')));
  v_owner_email text;
  v_token text;
  v_expires timestamptz;
  v_id uuid;
begin
  if p_actor_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_role not in ('partner', 'coparent') then
    raise exception 'invalid_invitation' using errcode = '22023';
  end if;
  if p_ttl_seconds < 3600 or p_ttl_seconds > 2592000 then
    raise exception 'invalid_invitation' using errcode = '22023';
  end if;
  if length(v_email) < 3
      or length(v_email) > 254
      or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_invitation' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.households h
    where h.id = p_household_id and h.owner_id = p_actor_id
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select lower(u.email) into v_owner_email
  from auth.users u where u.id = p_actor_id;
  if v_owner_email is null or v_owner_email = v_email then
    raise exception 'invalid_invitation' using errcode = '22023';
  end if;

  update private.household_invitations i
  set revoked_at = now()
  where i.household_id = p_household_id
    and i.recipient_email = v_email
    and i.revoked_at is null
    and i.accepted_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + make_interval(secs => p_ttl_seconds);

  insert into private.household_invitations (
    household_id, recipient_email, role, token_hash, created_by, expires_at
  ) values (
    p_household_id, v_email, p_role,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    p_actor_id, v_expires
  )
  returning id into v_id;

  return query select v_id, v_token, v_expires;
end;
$$;

create or replace function public.edge_accept_household_invitation(
  p_actor_id uuid,
  p_actor_email text,
  p_token text
)
returns table (accepted_household_id uuid, accepted_role text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_actor_email, '')));
  v_hash text;
  v_inv private.household_invitations%rowtype;
begin
  if p_actor_id is null
      or v_email = ''
      or p_token is null
      or length(btrim(p_token)) < 32
      or length(btrim(p_token)) > 512
      or btrim(p_token) ~ '[[:space:]]' then
    raise exception 'invitation_not_available' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_actor_id and lower(u.email) = v_email
  ) then
    raise exception 'invitation_not_available' using errcode = 'P0001';
  end if;

  v_hash := encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');
  select i.* into v_inv
  from private.household_invitations i
  where i.token_hash = v_hash
  for update;

  if not found
      or v_inv.revoked_at is not null
      or v_inv.accepted_at is not null
      or v_inv.expires_at <= now()
      or v_inv.recipient_email <> v_email then
    raise exception 'invitation_not_available' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.memberships m
    where m.household_id = v_inv.household_id and m.user_id = p_actor_id
  ) then
    raise exception 'invitation_not_available' using errcode = 'P0001';
  end if;

  insert into public.memberships(household_id, user_id, role)
  values (v_inv.household_id, p_actor_id, v_inv.role);

  update private.household_invitations i
  set accepted_at = now(), accepted_by = p_actor_id
  where i.id = v_inv.id;

  return query select v_inv.household_id, v_inv.role;
end;
$$;

create or replace function public.edge_revoke_household_invitation(
  p_actor_id uuid,
  p_invitation_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated boolean := false;
begin
  if p_actor_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update private.household_invitations i
  set revoked_at = now()
  where i.id = p_invitation_id
    and i.revoked_at is null
    and i.accepted_at is null
    and exists (
      select 1 from public.households h
      where h.id = i.household_id and h.owner_id = p_actor_id
    );
  v_updated := found;
  return v_updated;
end;
$$;

revoke all on function public.edge_create_household_invitation(uuid, uuid, text, text, integer) from public;
revoke all on function public.edge_create_household_invitation(uuid, uuid, text, text, integer) from anon;
revoke all on function public.edge_create_household_invitation(uuid, uuid, text, text, integer) from authenticated;
revoke all on function public.edge_accept_household_invitation(uuid, text, text) from public;
revoke all on function public.edge_accept_household_invitation(uuid, text, text) from anon;
revoke all on function public.edge_accept_household_invitation(uuid, text, text) from authenticated;
revoke all on function public.edge_revoke_household_invitation(uuid, uuid) from public;
revoke all on function public.edge_revoke_household_invitation(uuid, uuid) from anon;
revoke all on function public.edge_revoke_household_invitation(uuid, uuid) from authenticated;

grant execute on function public.edge_create_household_invitation(uuid, uuid, text, text, integer) to service_role;
grant execute on function public.edge_accept_household_invitation(uuid, text, text) to service_role;
grant execute on function public.edge_revoke_household_invitation(uuid, uuid) to service_role;
