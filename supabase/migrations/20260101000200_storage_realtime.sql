-- Private image storage + realtime publication.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-images',
  'trip-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Object path convention: <trip_id>/<item_id|cover>/<uuid>.<ext>

drop policy if exists trip_images_select_members on storage.objects;
create policy trip_images_select_members
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'trip-images'
    and public.is_trip_member(
      public.safe_uuid((storage.foldername(name))[1])
    )
  );

drop policy if exists trip_images_insert_editors on storage.objects;
create policy trip_images_insert_editors
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trip-images'
    and public.can_edit_trip(
      public.safe_uuid((storage.foldername(name))[1])
    )
  );

drop policy if exists trip_images_update_editors on storage.objects;
create policy trip_images_update_editors
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'trip-images'
    and public.can_edit_trip(
      public.safe_uuid((storage.foldername(name))[1])
    )
  )
  with check (
    bucket_id = 'trip-images'
    and public.can_edit_trip(
      public.safe_uuid((storage.foldername(name))[1])
    )
  );

drop policy if exists trip_images_delete_editors on storage.objects;
create policy trip_images_delete_editors
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trip-images'
    and public.can_edit_trip(
      public.safe_uuid((storage.foldername(name))[1])
    )
  );

-- Realtime: every trip-scoped table emits changes so members can invalidate caches.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'trips',
    'trip_members',
    'trip_invitations',
    'trip_items',
    'tags',
    'trip_item_tags',
    'trip_item_images'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
