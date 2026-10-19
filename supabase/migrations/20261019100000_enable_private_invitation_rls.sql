-- Keep the invitation secret table behind the server-side boundary even if
-- table or schema grants are changed accidentally in a later migration.
alter table private.household_invitations enable row level security;

create policy household_invitations_service_role_only
  on private.household_invitations
  as permissive
  for all
  to service_role
  using (true)
  with check (true);
