-- Removing an unsent attachment's message must also remove its notification.
create or replace function public.remove_deleted_chat_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.trip_notifications
    where trip_id = old.trip_id and source_id = old.id
      and kind in ('chat', 'mention');
  return old;
end;
$$;
create trigger remove_deleted_chat_notifications after delete on public.trip_messages
  for each row execute function public.remove_deleted_chat_notifications();
