create table public.trip_notifications (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null,
  kind text not null check (kind in ('chat', 'mention', 'comment', 'reaction')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, source_id)
);
create index trip_notifications_user_created_idx on public.trip_notifications (user_id, created_at desc);
alter table public.trip_notifications enable row level security;
grant select on public.trip_notifications to authenticated;
grant update (read_at) on public.trip_notifications to authenticated;
create policy trip_notifications_select on public.trip_notifications for select to authenticated
  using (user_id = auth.uid() and public.is_trip_member(trip_id));
create policy trip_notifications_update on public.trip_notifications for update to authenticated
  using (user_id = auth.uid() and public.is_trip_member(trip_id))
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));
create or replace function public.notify_trip_chat()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.trip_notifications (trip_id, user_id, actor_id, source_id, kind)
  select new.trip_id, m.user_id, new.sender_id, new.id, 'chat'
  from public.trip_members m
  left join public.trip_chat_reads r on r.trip_id = new.trip_id and r.user_id = m.user_id
  where m.trip_id = new.trip_id and m.user_id <> new.sender_id
    and coalesce(r.notifications_enabled, true);
  return new;
end;
$$;
create trigger notify_trip_chat after insert on public.trip_messages
  for each row execute function public.notify_trip_chat();

create or replace function public.promote_trip_mention()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.trip_notifications n set kind = 'mention'
  from public.trip_messages m
  where m.id = new.message_id and n.source_id = m.id and n.user_id = new.user_id;
  return new;
end;
$$;
create trigger promote_trip_mention after insert on public.trip_message_mentions
  for each row execute function public.promote_trip_mention();

create or replace function public.notify_trip_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.trip_notifications (trip_id, user_id, actor_id, source_id, kind)
  select p.trip_id, p.author_id, new.author_id, new.id, 'comment'
  from public.trip_posts p where p.id = new.post_id and p.author_id <> new.author_id;
  if new.parent_comment_id is not null then
    insert into public.trip_notifications (trip_id, user_id, actor_id, source_id, kind)
    select p.trip_id, c.author_id, new.author_id, new.id, 'comment'
    from public.trip_post_comments c join public.trip_posts p on p.id = c.post_id
    where c.id = new.parent_comment_id and c.author_id <> new.author_id
    on conflict (user_id, source_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger notify_trip_comment after insert on public.trip_post_comments
  for each row execute function public.notify_trip_comment();

create or replace function public.notify_trip_reaction()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.trip_notifications (trip_id, user_id, actor_id, source_id, kind)
  select p.trip_id, p.author_id, new.user_id, gen_random_uuid(), 'reaction'
  from public.trip_posts p where p.id = new.post_id and p.author_id <> new.user_id;
  return new;
end;
$$;
create trigger notify_trip_reaction after insert on public.trip_post_reactions
  for each row execute function public.notify_trip_reaction();

alter publication supabase_realtime add table public.trip_notifications;
