-- Live migration 20260925105820: minimize the public Data API surface.
revoke all on table public.households from anon;
revoke all on table public.memberships from anon;
revoke all on table public.calendar_events from anon;

revoke all on table public.households from authenticated;
revoke all on table public.memberships from authenticated;
revoke all on table public.calendar_events from authenticated;

grant select, insert, update on table public.households to authenticated;
grant select on table public.memberships to authenticated;
grant select, insert, update, delete on table public.calendar_events to authenticated;
