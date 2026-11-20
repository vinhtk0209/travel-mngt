-- Private trip feed. All members can post; authors and owners moderate content.
create table public.trip_posts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  trip_item_id uuid references public.trip_items(id) on delete set null,
  content text not null default '' check (char_length(btrim(content)) <= 5000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trip_posts_trip_order_idx on public.trip_posts (trip_id, pinned desc, created_at desc);
alter table public.trip_posts enable row level security;
grant select, insert, update, delete on public.trip_posts to authenticated;
create policy trip_posts_select on public.trip_posts for select to authenticated
  using (public.is_trip_member(trip_id));
create policy trip_posts_insert on public.trip_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_trip_member(trip_id)
    and (not pinned or public.is_trip_owner(trip_id))
    and (trip_item_id is null or exists (select 1 from public.trip_items i
      where i.id = trip_item_id and i.trip_id = trip_id)));
create policy trip_posts_update on public.trip_posts for update to authenticated
  using ((author_id = auth.uid() or public.is_trip_owner(trip_id)) and public.is_trip_member(trip_id))
  with check ((author_id = auth.uid() or public.is_trip_owner(trip_id)) and public.is_trip_member(trip_id)
    and (trip_item_id is null or exists (select 1 from public.trip_items i
      where i.id = trip_item_id and i.trip_id = trip_id)));
create policy trip_posts_delete on public.trip_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_trip_owner(trip_id));
create or replace function public.guard_trip_post_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.trip_id <> old.trip_id or new.author_id <> old.author_id
    or new.created_at <> old.created_at then raise exception 'Post identity cannot change'; end if;
  if new.pinned is distinct from old.pinned and not public.is_trip_owner(old.trip_id) then
    raise exception 'Only owners can pin posts';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger guard_trip_post_update before update on public.trip_posts
  for each row execute function public.guard_trip_post_update();

create table public.trip_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.trip_posts(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index trip_post_images_post_idx on public.trip_post_images (post_id, sort_order);
alter table public.trip_post_images enable row level security;
grant select, insert, delete on public.trip_post_images to authenticated;
create policy trip_post_images_select on public.trip_post_images for select to authenticated
  using (exists (select 1 from public.trip_posts p where p.id = post_id and public.is_trip_member(p.trip_id)));
create policy trip_post_images_insert on public.trip_post_images for insert to authenticated
  with check (exists (select 1 from public.trip_posts p where p.id = post_id
    and p.author_id = auth.uid() and public.is_trip_member(p.trip_id)
    and storage_path like p.trip_id::text || '/posts/%'));
create policy trip_post_images_delete on public.trip_post_images for delete to authenticated
  using (exists (select 1 from public.trip_posts p where p.id = post_id
    and (p.author_id = auth.uid() or public.is_trip_owner(p.trip_id))));

create table public.trip_post_reactions (
  post_id uuid not null references public.trip_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '😮', '😢')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.trip_post_reactions enable row level security;
grant select, insert, update, delete on public.trip_post_reactions to authenticated;
create policy trip_post_reactions_select on public.trip_post_reactions for select to authenticated
  using (exists (select 1 from public.trip_posts p where p.id = post_id and public.is_trip_member(p.trip_id)));
create policy trip_post_reactions_insert on public.trip_post_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.trip_posts p
    where p.id = post_id and public.is_trip_member(p.trip_id)));
create policy trip_post_reactions_update on public.trip_post_reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy trip_post_reactions_delete on public.trip_post_reactions for delete to authenticated
  using (user_id = auth.uid());

create table public.trip_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.trip_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.trip_post_comments(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trip_post_comments_post_idx on public.trip_post_comments (post_id, created_at);
alter table public.trip_post_comments enable row level security;
grant select, insert, update, delete on public.trip_post_comments to authenticated;
create policy trip_post_comments_select on public.trip_post_comments for select to authenticated
  using (exists (select 1 from public.trip_posts p where p.id = post_id and public.is_trip_member(p.trip_id)));
create policy trip_post_comments_insert on public.trip_post_comments for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.trip_posts p
    where p.id = post_id and public.is_trip_member(p.trip_id)));
create policy trip_post_comments_update on public.trip_post_comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy trip_post_comments_delete on public.trip_post_comments for delete to authenticated
  using (author_id = auth.uid() or exists (select 1 from public.trip_posts p
    where p.id = post_id and public.is_trip_owner(p.trip_id)));
create or replace function public.guard_trip_comment()
returns trigger language plpgsql set search_path = '' as $$
declare parent public.trip_post_comments;
begin
  if tg_op = 'UPDATE' and (new.id <> old.id or new.post_id <> old.post_id
    or new.author_id <> old.author_id or new.parent_comment_id is distinct from old.parent_comment_id
    or new.created_at <> old.created_at) then raise exception 'Comment identity cannot change'; end if;
  if new.parent_comment_id is not null then
    select * into parent from public.trip_post_comments where id = new.parent_comment_id;
    if parent.id is null or parent.post_id <> new.post_id or parent.parent_comment_id is not null then
      raise exception 'Replies must belong to a top-level comment on the same post';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger guard_trip_comment before insert or update on public.trip_post_comments
  for each row execute function public.guard_trip_comment();

create policy trip_post_images_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-images' and (storage.foldername(name))[2] = 'posts'
    and public.is_trip_member(public.safe_uuid((storage.foldername(name))[1])));
create policy trip_post_images_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'trip-images' and (storage.foldername(name))[2] = 'posts'
    and owner_id = auth.uid()::text);

alter publication supabase_realtime add table public.trip_posts;
alter publication supabase_realtime add table public.trip_post_images;
alter publication supabase_realtime add table public.trip_post_reactions;
alter publication supabase_realtime add table public.trip_post_comments;
