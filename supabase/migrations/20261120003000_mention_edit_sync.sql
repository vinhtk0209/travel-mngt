-- Keep message content and mention recipients in one transaction.
create or replace function public.edit_trip_message(
  p_message_id uuid, p_content text, p_mentioned_user_ids uuid[] default '{}'
)
returns public.trip_messages
language plpgsql security invoker set search_path = '' as $$
declare
  v_message public.trip_messages;
  v_ids uuid[];
begin
  if length(btrim(coalesce(p_content, ''))) = 0
     or length(btrim(p_content)) > 2000 then
    raise exception 'Message content must be 1 to 2000 characters';
  end if;

  -- RLS and the edit-window policy must allow this update before mentions change.
  update public.trip_messages
    set content = btrim(p_content)
    where id = p_message_id
    returning * into v_message;
  if not found then
    raise exception 'Message cannot be edited';
  end if;

  select coalesce(array_agg(distinct id), '{}') into v_ids
  from unnest(coalesce(p_mentioned_user_ids, '{}')) as id;

  if exists (
    select 1 from unnest(v_ids) as id
    where not exists (
      select 1 from public.trip_members tm
      where tm.trip_id = v_message.trip_id and tm.user_id = id
    )
  ) then
    raise exception 'Mention recipient is not a trip member';
  end if;

  delete from public.trip_message_mentions
    where message_id = p_message_id and not (user_id = any(v_ids));

  insert into public.trip_message_mentions (message_id, user_id)
    select p_message_id, id from unnest(v_ids) as id
    on conflict do nothing;

  return v_message;
end;
$$;
revoke all on function public.edit_trip_message(uuid, text, uuid[]) from public, anon;
grant execute on function public.edit_trip_message(uuid, text, uuid[]) to authenticated;
