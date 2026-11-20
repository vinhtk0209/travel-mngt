-- Trip chat media: per-trip wallpaper, image/GIF attachments, and reactions.

alter table public.trips
  add column if not exists chat_background text not null default 'default',
  add column if not exists chat_background_path text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.trips'::regclass
      and conname = 'trips_chat_background_check'
  ) then
    alter table public.trips
      add constraint trips_chat_background_check
      check (chat_background in ('default', 'sunset', 'mint', 'lavender'));
  end if;
end;
$$;

-- Image-only messages have empty text; text messages still cap at 2000 chars.
alter table public.trip_messages
  drop constraint if exists trip_messages_content_check;

alter table public.trip_messages
  add constraint trip_messages_content_check
  check (char_length(btrim(content)) <= 2000);

drop policy if exists trip_messages_insert_members on public.trip_messages;
create policy trip_messages_insert_members
  on public.trip_messages for insert
  to authenticated
  with check (public.can_edit_trip(trip_id) and sender_id = auth.uid());

create table if not exists public.trip_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.trip_messages(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null default 'image',
  mime_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists trip_message_attachments_message_idx
  on public.trip_message_attachments (message_id);

alter table public.trip_message_attachments enable row level security;

grant select, insert on public.trip_message_attachments to authenticated;

drop policy if exists trip_message_attachments_select_members on public.trip_message_attachments;
create policy trip_message_attachments_select_members
  on public.trip_message_attachments for select
  to authenticated
  using (
    exists (
      select 1
      from public.trip_messages message
      where message.id = message_id
        and public.is_trip_member(message.trip_id)
    )
  );

drop policy if exists trip_message_attachments_insert_senders on public.trip_message_attachments;
create policy trip_message_attachments_insert_senders
  on public.trip_message_attachments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.trip_messages message
      where message.id = message_id
        and message.sender_id = auth.uid()
        and public.can_edit_trip(message.trip_id)
    )
  );

create table if not exists public.trip_message_reactions (
  message_id uuid not null references public.trip_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists trip_message_reactions_message_idx
  on public.trip_message_reactions (message_id);

alter table public.trip_message_reactions enable row level security;

grant select, insert, update, delete on public.trip_message_reactions to authenticated;

drop policy if exists trip_message_reactions_select_members on public.trip_message_reactions;
create policy trip_message_reactions_select_members
  on public.trip_message_reactions for select
  to authenticated
  using (
    exists (
      select 1
      from public.trip_messages message
      where message.id = message_id
        and public.is_trip_member(message.trip_id)
    )
  );

drop policy if exists trip_message_reactions_insert_editors on public.trip_message_reactions;
create policy trip_message_reactions_insert_editors
  on public.trip_message_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.trip_messages message
      where message.id = message_id
        and public.can_edit_trip(message.trip_id)
    )
  );

drop policy if exists trip_message_reactions_update_own on public.trip_message_reactions;
create policy trip_message_reactions_update_own
  on public.trip_message_reactions for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.trip_messages message
      where message.id = message_id
        and public.can_edit_trip(message.trip_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.trip_messages message
      where message.id = message_id
        and public.can_edit_trip(message.trip_id)
    )
  );

drop policy if exists trip_message_reactions_delete_own on public.trip_message_reactions;
create policy trip_message_reactions_delete_own
  on public.trip_message_reactions for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.trip_messages message
      where message.id = message_id
        and public.can_edit_trip(message.trip_id)
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_message_attachments'
  ) then
    alter publication supabase_realtime add table public.trip_message_attachments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_message_reactions'
  ) then
    alter publication supabase_realtime add table public.trip_message_reactions;
  end if;
end;
$$;
