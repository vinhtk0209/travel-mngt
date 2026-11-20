-- Mentions may only be changed during the message edit window.
drop policy if exists trip_message_mentions_insert on public.trip_message_mentions;
create policy trip_message_mentions_insert on public.trip_message_mentions for insert
  to authenticated with check (exists (
    select 1 from public.trip_messages m where m.id = message_id
      and m.sender_id = auth.uid() and public.is_trip_member(m.trip_id)
      and m.created_at > now() - interval '15 minutes'
      and exists (select 1 from public.trip_members tm
        where tm.trip_id = m.trip_id and tm.user_id = trip_message_mentions.user_id)
  ));

-- Updating an emoji cannot move a reaction to another post.
create or replace function public.guard_trip_post_reaction_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.post_id <> old.post_id or new.user_id <> old.user_id
     or new.created_at <> old.created_at then
    raise exception 'Reaction identity cannot change';
  end if;
  return new;
end;
$$;
create trigger guard_trip_post_reaction_update before update on public.trip_post_reactions
  for each row execute function public.guard_trip_post_reaction_update();
