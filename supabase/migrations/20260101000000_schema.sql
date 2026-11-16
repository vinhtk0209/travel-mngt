-- Wanderlist core schema
-- Enums, tables, constraints, indexes, triggers and RPCs.

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.trip_role as enum ('owner', 'editor', 'viewer');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.invitation_status as enum ('pending', 'accepted', 'rejected', 'expired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.item_status as enum ('todo', 'completed');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Traveler' check (length(trim(display_name)) > 0),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  destination text not null default '',
  description text,
  start_date date,
  end_date date,
  cover_image text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates_check check (
    start_date is null or end_date is null or end_date >= start_date
  )
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.trip_role not null default 'viewer',
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table if not exists public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  email text not null check (email = lower(email)),
  role public.trip_role not null default 'editor',
  invited_by uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint trip_invitations_role_check check (role <> 'owner')
);

create table if not exists public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  address text,
  google_maps_url text,
  latitude double precision,
  longitude double precision,
  notes text,
  status public.item_status not null default 'todo',
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_items_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint trip_items_longitude_check check (longitude is null or longitude between -180 and 180)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  color text not null default '#FFD9C9' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (trip_id, name)
);

create table if not exists public.trip_item_tags (
  id uuid primary key default gen_random_uuid(),
  trip_item_id uuid not null references public.trip_items (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  unique (trip_item_id, tag_id)
);

create table if not exists public.trip_item_images (
  id uuid primary key default gen_random_uuid(),
  trip_item_id uuid not null references public.trip_items (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists trips_owner_id_idx on public.trips (owner_id);
create index if not exists trips_created_at_idx on public.trips (created_at desc);
create index if not exists trip_members_user_id_idx on public.trip_members (user_id);
create unique index if not exists trip_members_one_owner_idx
  on public.trip_members (trip_id) where role = 'owner';
create index if not exists trip_invitations_trip_id_idx on public.trip_invitations (trip_id);
create index if not exists trip_invitations_email_idx on public.trip_invitations (lower(email));
create unique index if not exists trip_invitations_pending_unique_idx
  on public.trip_invitations (trip_id, lower(email)) where status = 'pending';
create index if not exists trip_items_trip_sort_idx on public.trip_items (trip_id, sort_order);
create index if not exists trip_items_trip_status_idx on public.trip_items (trip_id, status);
create unique index if not exists tags_trip_name_unique_idx
  on public.tags (trip_id, lower(name));
create index if not exists trip_item_tags_item_idx on public.trip_item_tags (trip_item_id);
create index if not exists trip_item_tags_tag_idx on public.trip_item_tags (tag_id);
create index if not exists trip_item_images_item_idx on public.trip_item_images (trip_item_id, sort_order);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

drop trigger if exists trip_items_set_updated_at on public.trip_items;
create trigger trip_items_set_updated_at
  before update on public.trip_items
  for each row execute function public.set_updated_at();

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members m
    where m.trip_id = p_trip_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.trip_role_for(p_trip_id uuid)
returns public.trip_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.trip_members m
  where m.trip_id = p_trip_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_edit_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members m
    where m.trip_id = p_trip_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  );
$$;

create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and t.owner_id = auth.uid()
  );
$$;

create or replace function public.shares_trip_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id = auth.uid()
    or exists (
      select 1
      from public.trip_members me
      join public.trip_members them on them.trip_id = me.trip_id
      where me.user_id = auth.uid()
        and them.user_id = p_user_id
    );
$$;

create or replace function public.safe_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bootstrap triggers
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Traveler'
    )
  )
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_new_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (trip_id, user_id) do update set role = 'owner';

  insert into public.tags (trip_id, name, color)
  values
    (new.id, 'Đi chơi', '#FFD9C9'),
    (new.id, 'Đi ăn', '#FFE6B7'),
    (new.id, 'Check-in', '#CFE6FF'),
    (new.id, 'Di tích lịch sử', '#E4D9FF'),
    (new.id, 'Quán ăn', '#FFC8B8'),
    (new.id, 'Khách sạn', '#B8EADF'),
    (new.id, 'Hình ảnh', '#FFD3E8'),
    (new.id, 'Hoạt động', '#D8F3C4')
  on conflict (trip_id, lower(name)) do nothing;

  return new;
end;
$$;

drop trigger if exists on_trip_created on public.trips;
create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_trip_item_sort_order()
returns trigger
language plpgsql
as $$
begin
  if new.sort_order is null or new.sort_order <= 0 then
    select coalesce(max(sort_order), -1) + 1
    into new.sort_order
    from public.trip_items
    where trip_id = new.trip_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trip_items_set_sort_order on public.trip_items;
create trigger trip_items_set_sort_order
  before insert on public.trip_items
  for each row execute function public.set_trip_item_sort_order();

create or replace function public.validate_trip_item_tag()
returns trigger
language plpgsql
as $$
declare
  v_item_trip uuid;
  v_tag_trip uuid;
begin
  select trip_id into v_item_trip from public.trip_items where id = new.trip_item_id;
  select trip_id into v_tag_trip from public.tags where id = new.tag_id;

  if v_item_trip is null or v_tag_trip is null or v_item_trip <> v_tag_trip then
    raise exception 'Tag and place must belong to the same trip';
  end if;

  return new;
end;
$$;

drop trigger if exists trip_item_tags_validate on public.trip_item_tags;
create trigger trip_item_tags_validate
  before insert or update on public.trip_item_tags
  for each row execute function public.validate_trip_item_tag();

create or replace function public.guard_trip_owner_change()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id <> old.owner_id
     and current_setting('app.owner_transfer', true) is distinct from 'on' then
    raise exception 'Trip ownership can only be changed through transfer_trip_ownership';
  end if;
  return new;
end;
$$;

drop trigger if exists trips_guard_owner_change on public.trips;
create trigger trips_guard_owner_change
  before update of owner_id on public.trips
  for each row execute function public.guard_trip_owner_change();

create or replace function public.protect_trip_owner()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if (old.role = 'owner' or new.role = 'owner')
       and current_setting('app.owner_transfer', true) is distinct from 'on' then
      raise exception 'The trip owner role cannot be changed directly';
    end if;
    if new.trip_id <> old.trip_id or new.user_id <> old.user_id then
      raise exception 'Membership identity cannot be changed';
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.role = 'owner'
       and exists (select 1 from public.trips t where t.id = old.trip_id) then
      raise exception 'The trip owner cannot be removed; transfer ownership or delete the trip';
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trip_members_protect_owner on public.trip_members;
create trigger trip_members_protect_owner
  before update or delete on public.trip_members
  for each row execute function public.protect_trip_owner();

-- ---------------------------------------------------------------------------
-- Invitations (privileged RPCs)
-- ---------------------------------------------------------------------------

create or replace function public.accept_trip_invitation_by_id(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.trip_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept an invitation';
  end if;

  select * into v_invitation
  from public.trip_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception 'This invitation is no longer pending';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'This invitation has expired';
  end if;
  if lower(v_invitation.email) <> public.current_user_email() then
    raise exception 'This invitation belongs to a different email address';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_invitation.trip_id, auth.uid(), v_invitation.role)
  on conflict (trip_id, user_id) do nothing;

  update public.trip_invitations
  set status = 'accepted', responded_at = now()
  where id = v_invitation.id;

  return v_invitation.trip_id;
end;
$$;

create or replace function public.accept_trip_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if p_token is null or length(p_token) < 16 then
    raise exception 'Invalid invitation token';
  end if;

  select id into v_id
  from public.trip_invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  limit 1;

  if v_id is null then
    raise exception 'Invitation not found';
  end if;

  return public.accept_trip_invitation_by_id(v_id);
end;
$$;

create or replace function public.reject_trip_invitation_by_id(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.trip_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to reject an invitation';
  end if;

  select * into v_invitation
  from public.trip_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception 'This invitation is no longer pending';
  end if;
  if lower(v_invitation.email) <> public.current_user_email() then
    raise exception 'This invitation belongs to a different email address';
  end if;

  update public.trip_invitations
  set status = 'rejected', responded_at = now()
  where id = v_invitation.id;
end;
$$;

create or replace function public.reject_trip_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if p_token is null or length(p_token) < 16 then
    raise exception 'Invalid invitation token';
  end if;

  select id into v_id
  from public.trip_invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  limit 1;

  if v_id is null then
    raise exception 'Invitation not found';
  end if;

  perform public.reject_trip_invitation_by_id(v_id);
end;
$$;

create or replace function public.list_my_invitations()
returns table (
  invitation_id uuid,
  trip_id uuid,
  trip_name text,
  trip_destination text,
  inviter_name text,
  role public.trip_role,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.trip_id,
    t.name,
    t.destination,
    coalesce(p.display_name, 'A traveler'),
    i.role,
    i.created_at,
    i.expires_at
  from public.trip_invitations i
  join public.trips t on t.id = i.trip_id
  left join public.profiles p on p.id = i.invited_by
  where i.status = 'pending'
    and lower(i.email) = public.current_user_email()
    and i.expires_at > now()
    and not exists (
      select 1 from public.trip_members m
      where m.trip_id = i.trip_id and m.user_id = auth.uid()
    )
  order by i.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Ownership transfer & ordering
-- ---------------------------------------------------------------------------

create or replace function public.transfer_trip_ownership(p_trip_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can transfer ownership';
  end if;
  if p_new_owner_id = auth.uid() then
    return;
  end if;
  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_new_owner_id
  ) then
    raise exception 'The new owner must already be a trip member';
  end if;

  perform set_config('app.owner_transfer', 'on', true);

  update public.trip_members
  set role = 'editor'
  where trip_id = p_trip_id and user_id = auth.uid();

  update public.trip_members
  set role = 'owner'
  where trip_id = p_trip_id and user_id = p_new_owner_id;

  update public.trips
  set owner_id = p_new_owner_id
  where id = p_trip_id;

  perform set_config('app.owner_transfer', 'off', true);
end;
$$;

create or replace function public.reorder_trip_items(p_trip_id uuid, p_item_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_index integer;
  v_count integer;
  v_total integer;
begin
  if not public.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to reorder this trip';
  end if;

  v_count := coalesce(array_length(p_item_ids, 1), 0);
  if v_count = 0 then
    return;
  end if;

  select count(*) into v_total
  from public.trip_items
  where trip_id = p_trip_id and id = any (p_item_ids);

  if v_total <> v_count then
    raise exception 'One or more places do not belong to this trip';
  end if;

  for v_index in 1..v_count loop
    update public.trip_items
    set sort_order = v_index
    where id = p_item_ids[v_index] and trip_id = p_trip_id;
  end loop;
end;
$$;
