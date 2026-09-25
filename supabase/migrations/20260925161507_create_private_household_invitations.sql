create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

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
