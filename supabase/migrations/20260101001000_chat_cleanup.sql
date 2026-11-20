-- Allow the sender to clean up a message when a media upload cannot finish.

grant delete on public.trip_messages to authenticated;

drop policy if exists trip_messages_delete_own on public.trip_messages;
create policy trip_messages_delete_own
  on public.trip_messages for delete
  to authenticated
  using (public.can_edit_trip(trip_id) and sender_id = auth.uid());
