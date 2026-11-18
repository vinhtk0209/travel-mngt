-- Trip assistant: per-trip default mode, per-user override, and server-side usage log.

alter table public.trips
  add column if not exists assistant_mode text not null default 'basic'
  check (assistant_mode in ('basic', 'gemini'));

create table if not exists public.trip_assistant_preferences (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('basic', 'gemini')),
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

alter table public.trip_assistant_preferences enable row level security;

drop policy if exists trip_assistant_preferences_select_self on public.trip_assistant_preferences;
create policy trip_assistant_preferences_select_self
  on public.trip_assistant_preferences for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists trip_assistant_preferences_insert_self on public.trip_assistant_preferences;
create policy trip_assistant_preferences_insert_self
  on public.trip_assistant_preferences for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));

drop policy if exists trip_assistant_preferences_update_self on public.trip_assistant_preferences;
create policy trip_assistant_preferences_update_self
  on public.trip_assistant_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));

grant select, insert, update on public.trip_assistant_preferences to authenticated;
revoke all on public.trip_assistant_preferences from anon;

drop trigger if exists trip_assistant_preferences_set_updated_at
  on public.trip_assistant_preferences;
create trigger trip_assistant_preferences_set_updated_at
  before update on public.trip_assistant_preferences
  for each row execute function public.set_updated_at();

-- Only the owner may change a trip's default assistant mode. Editors can still
-- edit the rest of the trip through the existing trips UPDATE policy.
create or replace function public.guard_assistant_mode_change()
returns trigger
language plpgsql
as $$
begin
  if new.assistant_mode is distinct from old.assistant_mode
     and not public.is_trip_owner(new.id) then
    raise exception 'Only the trip owner can change the assistant mode';
  end if;
  return new;
end;
$$;

drop trigger if exists trips_guard_assistant_mode on public.trips;
create trigger trips_guard_assistant_mode
  before update of assistant_mode on public.trips
  for each row execute function public.guard_assistant_mode_change();

-- Server-side rate limiting for the Gemini proxy. Service-role only.
create table if not exists public.assistant_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists assistant_requests_user_created_idx
  on public.assistant_requests (user_id, created_at desc);

alter table public.assistant_requests enable row level security;
revoke all on public.assistant_requests from anon;
revoke all on public.assistant_requests from authenticated;
