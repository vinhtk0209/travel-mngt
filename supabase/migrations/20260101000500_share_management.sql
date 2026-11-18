-- Link-based sharing replaces email invitations.
--  * `share_token` is null until the owner explicitly enables sharing.
--  * `share_role` is the role granted to anyone who joins through the link.
--  * RPCs are SECURITY DEFINER because anonymous visitors need a tiny preview
--    and signed-in visitors must be able to join without a broad trip policy.

alter table public.trips
  add column if not exists share_token uuid unique,
  add column if not exists share_role public.trip_role not null default 'editor';

comment on column public.trips.share_token is
  'Opaque link token. Null means link sharing is disabled.';
comment on column public.trips.share_role is
  'Role granted to members who join with the share link.';

-- Editors can update trips, so guard the sharing columns at the row level.
create or replace function public.trips_guard_share_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.share_token is distinct from old.share_token
      or new.share_role is distinct from old.share_role)
     and auth.uid() is not null
     and not public.is_trip_owner(old.id) then
    raise exception 'Only the trip owner can manage sharing';
  end if;
  return new;
end;
$$;

drop trigger if exists trips_guard_share_columns on public.trips;
create trigger trips_guard_share_columns
  before update on public.trips
  for each row execute function public.trips_guard_share_columns();

-- Owner: read or create the link without ever exposing it to other members.
create or replace function public.get_or_create_trip_share(
  p_trip_id uuid,
  p_role public.trip_role default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_role public.trip_role;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to manage sharing';
  end if;
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can manage sharing';
  end if;

  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'Trip not found';
  end if;

  v_role := coalesce(p_role, v_trip.share_role, 'editor');
  if v_role not in ('editor', 'viewer') then
    raise exception 'Share role must be editor or viewer';
  end if;

  update public.trips
  set share_token = coalesce(share_token, gen_random_uuid()),
      share_role = v_role
  where id = p_trip_id
  returning * into v_trip;

  return jsonb_build_object('token', v_trip.share_token, 'role', v_trip.share_role);
end;
$$;

create or replace function public.set_trip_share_role(
  p_trip_id uuid,
  p_role public.trip_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can manage sharing';
  end if;
  if p_role not in ('editor', 'viewer') then
    raise exception 'Share role must be editor or viewer';
  end if;

  update public.trips set share_role = p_role where id = p_trip_id;
end;
$$;

create or replace function public.regenerate_trip_share_token(p_trip_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can manage sharing';
  end if;

  update public.trips
  set share_token = gen_random_uuid()
  where id = p_trip_id
  returning share_token into v_token;

  return v_token;
end;
$$;

create or replace function public.disable_trip_share(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can manage sharing';
  end if;

  update public.trips set share_token = null where id = p_trip_id;
end;
$$;

-- Public preview. Only presentational fields leave the database.
create or replace function public.resolve_trip_share(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_owner_name text;
  v_member_count integer;
  v_result jsonb;
begin
  select * into v_trip
  from public.trips
  where share_token = p_token;

  if not found then
    return null;
  end if;

  select coalesce(nullif(display_name, ''), 'A traveler')
  into v_owner_name
  from public.profiles
  where id = v_trip.owner_id;

  select count(*) into v_member_count
  from public.trip_members
  where trip_id = v_trip.id;

  v_result := jsonb_build_object(
    'id', v_trip.id,
    'name', v_trip.name,
    'destination', v_trip.destination,
    'description', v_trip.description,
    'start_date', v_trip.start_date,
    'end_date', v_trip.end_date,
    'share_role', v_trip.share_role,
    'owner_name', coalesce(v_owner_name, 'A traveler'),
    'member_count', v_member_count,
    'already_member', case
      when auth.uid() is null then false
      else exists (
        select 1 from public.trip_members m
        where m.trip_id = v_trip.id and m.user_id = auth.uid()
      ) or v_trip.owner_id = auth.uid()
    end
  );

  return v_result;
end;
$$;

create or replace function public.join_trip_by_share(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join this trip';
  end if;

  select * into v_trip
  from public.trips
  where share_token = p_token;

  if not found then
    raise exception 'This share link is invalid or has been turned off';
  end if;

  if v_trip.owner_id = auth.uid() then
    return v_trip.id;
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip.id, auth.uid(), v_trip.share_role)
  on conflict (trip_id, user_id) do nothing;

  return v_trip.id;
end;
$$;

revoke all on function public.get_or_create_trip_share(uuid, public.trip_role) from public;
revoke all on function public.set_trip_share_role(uuid, public.trip_role) from public;
revoke all on function public.regenerate_trip_share_token(uuid) from public;
revoke all on function public.disable_trip_share(uuid) from public;
revoke all on function public.resolve_trip_share(uuid) from public;
revoke all on function public.join_trip_by_share(uuid) from public;

grant execute on function public.get_or_create_trip_share(uuid, public.trip_role) to authenticated;
grant execute on function public.set_trip_share_role(uuid, public.trip_role) to authenticated;
grant execute on function public.regenerate_trip_share_token(uuid) to authenticated;
grant execute on function public.disable_trip_share(uuid) to authenticated;
grant execute on function public.resolve_trip_share(uuid) to anon, authenticated;
grant execute on function public.join_trip_by_share(uuid) to authenticated;
