-- Insert a chat message and its mention recipients in the same transaction.
create or replace function public.send_trip_message(
  p_trip_id uuid, p_content text, p_mentioned_user_ids uuid[] default '{}'
)
returns public.trip_messages
language plpgsql security invoker set search_path = '' as $$
declare
  v_message public.trip_messages;
  v_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if length(btrim(coalesce(p_content, ''))) > 2000 then
    raise exception 'Message content must be at most 2000 characters';
  end if;

  select coalesce(array_agg(distinct recipient.user_id), '{}') into v_ids
    from unnest(coalesce(p_mentioned_user_ids, '{}')) as recipient(user_id);
  if exists (
    select 1 from unnest(v_ids) as candidate(user_id)
    where not exists (
      select 1 from public.trip_members tm
      where tm.trip_id = p_trip_id and tm.user_id = candidate.user_id
    )
  ) then
    raise exception 'Mention recipient is not a trip member';
  end if;

  insert into public.trip_messages (trip_id, sender_id, content)
    values (p_trip_id, auth.uid(), btrim(coalesce(p_content, '')))
    returning * into v_message;

  insert into public.trip_message_mentions (message_id, user_id)
    select v_message.id, recipient.user_id from unnest(v_ids) as recipient(user_id);
  return v_message;
end;
$$;
revoke all on function public.send_trip_message(uuid, text, uuid[]) from public, anon;
grant execute on function public.send_trip_message(uuid, text, uuid[]) to authenticated;

-- A member can remove their own recent message if an attachment upload fails.
drop policy if exists trip_messages_delete_own on public.trip_messages;
create policy trip_messages_delete_own on public.trip_messages for delete
  to authenticated using (
    sender_id = auth.uid() and public.is_trip_member(trip_id)
    and created_at > now() - interval '15 minutes'
  );
