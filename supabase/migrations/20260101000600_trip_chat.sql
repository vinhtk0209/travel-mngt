-- Shared trip chat. Messages are immutable and only visible to trip members.

create table if not exists public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists trip_messages_trip_created_idx
  on public.trip_messages (trip_id, created_at desc);

alter table public.trip_messages enable row level security;

grant select, insert on public.trip_messages to authenticated;

drop policy if exists trip_messages_select_members on public.trip_messages;
create policy trip_messages_select_members
  on public.trip_messages for select
  to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists trip_messages_insert_members on public.trip_messages;
create policy trip_messages_insert_members
  on public.trip_messages for insert
  to authenticated
  with check (public.is_trip_member(trip_id) and sender_id = auth.uid());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_messages'
  ) then
    alter publication supabase_realtime add table public.trip_messages;
  end if;
end;
$$;
