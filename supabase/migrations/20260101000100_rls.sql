-- Row Level Security for Wanderlist.
-- Helpers live in the schema migration and are SECURITY DEFINER to avoid policy recursion.

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke all on all tables in schema public from anon;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invitations enable row level security;
alter table public.trip_items enable row level security;
alter table public.tags enable row level security;
alter table public.trip_item_tags enable row level security;
alter table public.trip_item_images enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_self_or_shared on public.profiles;
create policy profiles_select_self_or_shared
  on public.profiles for select
  to authenticated
  using (public.shares_trip_with(id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- trips
-- ---------------------------------------------------------------------------

drop policy if exists trips_select_members on public.trips;
create policy trips_select_members
  on public.trips for select
  to authenticated
  using (owner_id = auth.uid() or public.is_trip_member(id));

drop policy if exists trips_insert_own on public.trips;
create policy trips_insert_own
  on public.trips for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists trips_update_editors on public.trips;
create policy trips_update_editors
  on public.trips for update
  to authenticated
  using (public.can_edit_trip(id))
  with check (public.can_edit_trip(id));

drop policy if exists trips_delete_owner on public.trips;
create policy trips_delete_owner
  on public.trips for delete
  to authenticated
  using (public.is_trip_owner(id));

-- ---------------------------------------------------------------------------
-- trip_members
-- ---------------------------------------------------------------------------

drop policy if exists trip_members_select_members on public.trip_members;
create policy trip_members_select_members
  on public.trip_members for select
  to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists trip_members_insert_owner on public.trip_members;
create policy trip_members_insert_owner
  on public.trip_members for insert
  to authenticated
  with check (public.is_trip_owner(trip_id) and role <> 'owner');

drop policy if exists trip_members_update_owner on public.trip_members;
create policy trip_members_update_owner
  on public.trip_members for update
  to authenticated
  using (public.is_trip_owner(trip_id))
  with check (public.is_trip_owner(trip_id) and role <> 'owner');

drop policy if exists trip_members_delete_owner_or_self on public.trip_members;
create policy trip_members_delete_owner_or_self
  on public.trip_members for delete
  to authenticated
  using (
    public.is_trip_owner(trip_id)
    or (user_id = auth.uid() and role <> 'owner')
  );

-- ---------------------------------------------------------------------------
-- trip_invitations
-- ---------------------------------------------------------------------------

drop policy if exists trip_invitations_select_owner_or_invitee on public.trip_invitations;
create policy trip_invitations_select_owner_or_invitee
  on public.trip_invitations for select
  to authenticated
  using (
    public.is_trip_owner(trip_id)
    or lower(email) = public.current_user_email()
  );

-- Intentionally no INSERT/UPDATE policies: invitations are created by the
-- `invite-member` Edge Function (service role) and responded to via RPCs.

drop policy if exists trip_invitations_delete_owner on public.trip_invitations;
create policy trip_invitations_delete_owner
  on public.trip_invitations for delete
  to authenticated
  using (public.is_trip_owner(trip_id));

-- ---------------------------------------------------------------------------
-- trip_items
-- ---------------------------------------------------------------------------

drop policy if exists trip_items_select_members on public.trip_items;
create policy trip_items_select_members
  on public.trip_items for select
  to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists trip_items_insert_editors on public.trip_items;
create policy trip_items_insert_editors
  on public.trip_items for insert
  to authenticated
  with check (public.can_edit_trip(trip_id) and created_by = auth.uid());

drop policy if exists trip_items_update_editors on public.trip_items;
create policy trip_items_update_editors
  on public.trip_items for update
  to authenticated
  using (public.can_edit_trip(trip_id))
  with check (public.can_edit_trip(trip_id));

drop policy if exists trip_items_delete_editors on public.trip_items;
create policy trip_items_delete_editors
  on public.trip_items for delete
  to authenticated
  using (public.can_edit_trip(trip_id));

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------

drop policy if exists tags_select_members on public.tags;
create policy tags_select_members
  on public.tags for select
  to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists tags_insert_editors on public.tags;
create policy tags_insert_editors
  on public.tags for insert
  to authenticated
  with check (public.can_edit_trip(trip_id));

drop policy if exists tags_update_editors on public.tags;
create policy tags_update_editors
  on public.tags for update
  to authenticated
  using (public.can_edit_trip(trip_id))
  with check (public.can_edit_trip(trip_id));

drop policy if exists tags_delete_editors on public.tags;
create policy tags_delete_editors
  on public.tags for delete
  to authenticated
  using (public.can_edit_trip(trip_id));

-- ---------------------------------------------------------------------------
-- trip_item_tags
-- ---------------------------------------------------------------------------

drop policy if exists trip_item_tags_select_members on public.trip_item_tags;
create policy trip_item_tags_select_members
  on public.trip_item_tags for select
  to authenticated
  using (
    exists (
      select 1
      from public.trip_items i
      where i.id = trip_item_id and public.is_trip_member(i.trip_id)
    )
  );

drop policy if exists trip_item_tags_insert_editors on public.trip_item_tags;
create policy trip_item_tags_insert_editors
  on public.trip_item_tags for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.trip_items i
      where i.id = trip_item_id and public.can_edit_trip(i.trip_id)
    )
  );

drop policy if exists trip_item_tags_delete_editors on public.trip_item_tags;
create policy trip_item_tags_delete_editors
  on public.trip_item_tags for delete
  to authenticated
  using (
    exists (
      select 1
      from public.trip_items i
      where i.id = trip_item_id and public.can_edit_trip(i.trip_id)
    )
  );

-- ---------------------------------------------------------------------------
-- trip_item_images
-- ---------------------------------------------------------------------------

drop policy if exists trip_item_images_select_members on public.trip_item_images;
create policy trip_item_images_select_members
  on public.trip_item_images for select
  to authenticated
  using (
    exists (
      select 1
      from public.trip_items i
      where i.id = trip_item_id and public.is_trip_member(i.trip_id)
    )
  );

drop policy if exists trip_item_images_insert_editors on public.trip_item_images;
create policy trip_item_images_insert_editors
  on public.trip_item_images for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.trip_items i
      where i.id = trip_item_id and public.can_edit_trip(i.trip_id)
    )
  );

drop policy if exists trip_item_images_delete_editors on public.trip_item_images;
create policy trip_item_images_delete_editors
  on public.trip_item_images for delete
  to authenticated
  using (
    exists (
      select 1
      from public.trip_items i
      where i.id = trip_item_id and public.can_edit_trip(i.trip_id)
    )
  );
