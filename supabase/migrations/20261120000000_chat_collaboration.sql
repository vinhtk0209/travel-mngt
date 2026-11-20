-- Every trip member may participate in chat. Read state survives reconnects;
-- typing stays ephemeral in a private Realtime channel.
drop policy if exists trip_messages_insert_members on public.trip_messages;
create policy trip_messages_insert_members on public.trip_messages for insert
  to authenticated with check (public.is_trip_member(trip_id) and sender_id = auth.uid());

alter table public.trip_messages add column if not exists edited_at timestamptz;
grant update on public.trip_messages to authenticated;
create policy trip_messages_update_own on public.trip_messages for update
  to authenticated
  using (sender_id = auth.uid() and public.is_trip_member(trip_id)
    and created_at > now() - interval '15 minutes')
  with check (sender_id = auth.uid() and public.is_trip_member(trip_id)
    and created_at > now() - interval '15 minutes');

create or replace function public.stamp_trip_message_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.trip_id <> old.trip_id
     or new.sender_id <> old.sender_id or new.created_at <> old.created_at then
    raise exception 'Message identity cannot change';
  end if;
  new.edited_at := now();
  return new;
end;
$$;
create trigger stamp_trip_message_edit before update on public.trip_messages
  for each row execute function public.stamp_trip_message_edit();

create table public.trip_chat_reads (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  notifications_enabled boolean not null default true,
  primary key (trip_id, user_id)
);
alter table public.trip_chat_reads enable row level security;
grant select, insert, update on public.trip_chat_reads to authenticated;
create policy trip_chat_reads_select on public.trip_chat_reads for select
  to authenticated using (public.is_trip_member(trip_id));
create policy trip_chat_reads_insert on public.trip_chat_reads for insert
  to authenticated with check (user_id = auth.uid() and public.is_trip_member(trip_id));
create policy trip_chat_reads_update on public.trip_chat_reads for update
  to authenticated using (user_id = auth.uid() and public.is_trip_member(trip_id))
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));

create or replace function public.prevent_read_regression()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.last_read_at := greatest(old.last_read_at, new.last_read_at);
  return new;
end;
$$;
create trigger prevent_read_regression before update on public.trip_chat_reads
  for each row execute function public.prevent_read_regression();

create or replace function public.mark_trip_chat_read(p_trip_id uuid, p_at timestamptz)
returns void language sql security invoker set search_path = '' as $$
  insert into public.trip_chat_reads (trip_id, user_id, last_read_at)
  values (p_trip_id, auth.uid(), p_at)
  on conflict (trip_id, user_id) do update
    set last_read_at = greatest(public.trip_chat_reads.last_read_at, excluded.last_read_at);
$$;
grant execute on function public.mark_trip_chat_read(uuid, timestamptz) to authenticated;

create or replace function public.set_trip_chat_notifications(p_trip_id uuid, p_enabled boolean)
returns void language sql security invoker set search_path = '' as $$
  insert into public.trip_chat_reads (trip_id, user_id, notifications_enabled)
  values (p_trip_id, auth.uid(), p_enabled)
  on conflict (trip_id, user_id) do update
    set notifications_enabled = excluded.notifications_enabled;
$$;
grant execute on function public.set_trip_chat_notifications(uuid, boolean) to authenticated;

create table public.trip_message_mentions (
  message_id uuid not null references public.trip_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (message_id, user_id)
);
alter table public.trip_message_mentions enable row level security;
grant select, insert, delete on public.trip_message_mentions to authenticated;
create policy trip_message_mentions_select on public.trip_message_mentions for select
  to authenticated using (exists (
    select 1 from public.trip_messages m where m.id = message_id
      and public.is_trip_member(m.trip_id)
  ));
create policy trip_message_mentions_insert on public.trip_message_mentions for insert
  to authenticated with check (exists (
    select 1 from public.trip_messages m where m.id = message_id
      and m.sender_id = auth.uid() and public.is_trip_member(m.trip_id)
      and exists (select 1 from public.trip_members tm
        where tm.trip_id = m.trip_id and tm.user_id = trip_message_mentions.user_id)
  ));
create policy trip_message_mentions_delete on public.trip_message_mentions for delete
  to authenticated using (exists (
    select 1 from public.trip_messages m where m.id = message_id
      and m.sender_id = auth.uid() and m.created_at > now() - interval '15 minutes'
  ));

drop policy if exists trip_message_attachments_insert_senders on public.trip_message_attachments;
create policy trip_message_attachments_insert_senders on public.trip_message_attachments for insert
  to authenticated with check (exists (
    select 1 from public.trip_messages m where m.id = message_id
      and m.sender_id = auth.uid() and public.is_trip_member(m.trip_id)
  ));
drop policy if exists trip_message_reactions_insert_editors on public.trip_message_reactions;
create policy trip_message_reactions_insert_editors on public.trip_message_reactions for insert
  to authenticated with check (user_id = auth.uid() and exists (
    select 1 from public.trip_messages m where m.id = message_id
      and public.is_trip_member(m.trip_id)
  ));
drop policy if exists trip_message_reactions_update_own on public.trip_message_reactions;
create policy trip_message_reactions_update_own on public.trip_message_reactions for update
  to authenticated using (user_id = auth.uid() and exists (
    select 1 from public.trip_messages m where m.id = message_id
      and public.is_trip_member(m.trip_id)
  )) with check (user_id = auth.uid() and exists (
    select 1 from public.trip_messages m where m.id = message_id
      and public.is_trip_member(m.trip_id)
  ));
drop policy if exists trip_message_reactions_delete_own on public.trip_message_reactions;
create policy trip_message_reactions_delete_own on public.trip_message_reactions for delete
  to authenticated using (user_id = auth.uid() and exists (
    select 1 from public.trip_messages m where m.id = message_id
      and public.is_trip_member(m.trip_id)
  ));

alter publication supabase_realtime add table public.trip_chat_reads;
alter publication supabase_realtime add table public.trip_message_mentions;

create policy trip_typing_receive on realtime.messages for select to authenticated
  using (extension = 'broadcast' and realtime.topic() like 'trip-typing-%'
    and public.is_trip_member(public.safe_uuid(substr(realtime.topic(), 13))));
create policy trip_typing_send on realtime.messages for insert to authenticated
  with check (extension = 'broadcast' and realtime.topic() like 'trip-typing-%'
    and public.is_trip_member(public.safe_uuid(substr(realtime.topic(), 13))));

-- Editors retain their broad storage rights; viewers can upload chat images.
create policy trip_chat_images_insert_members on storage.objects for insert
  to authenticated with check (bucket_id = 'trip-images'
    and (storage.foldername(name))[2] = 'chat'
    and public.is_trip_member(public.safe_uuid((storage.foldername(name))[1])));
create policy trip_chat_images_delete_own on storage.objects for delete
  to authenticated using (bucket_id = 'trip-images'
    and (storage.foldername(name))[2] = 'chat' and owner_id = auth.uid()::text);
