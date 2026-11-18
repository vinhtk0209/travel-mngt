-- Private avatar storage. Path convention: <user_id>/avatar-<uuid>.<ext>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists avatars_select_shared on storage.objects;
create policy avatars_select_shared
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.shares_trip_with(
      public.safe_uuid((storage.foldername(name))[1])
    )
  );

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and public.safe_uuid((storage.foldername(name))[1]) = auth.uid()
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.safe_uuid((storage.foldername(name))[1]) = auth.uid()
  )
  with check (
    bucket_id = 'avatars'
    and public.safe_uuid((storage.foldername(name))[1]) = auth.uid()
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.safe_uuid((storage.foldername(name))[1]) = auth.uid()
  );
