alter table public.trip_invitations
  alter column email drop not null;

create or replace function public.accept_trip_invitation_by_id(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.trip_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept an invitation';
  end if;

  select * into v_invitation
  from public.trip_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception 'This invitation is no longer pending';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'This invitation has expired';
  end if;
  if v_invitation.email is not null
     and lower(v_invitation.email) <> public.current_user_email() then
    raise exception 'This invitation belongs to a different email address';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_invitation.trip_id, auth.uid(), v_invitation.role)
  on conflict (trip_id, user_id) do nothing;

  update public.trip_invitations
  set status = 'accepted', responded_at = now()
  where id = v_invitation.id;

  return v_invitation.trip_id;
end;
$$;

create or replace function public.reject_trip_invitation_by_id(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.trip_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to reject an invitation';
  end if;

  select * into v_invitation
  from public.trip_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception 'This invitation is no longer pending';
  end if;
  if v_invitation.email is not null
     and lower(v_invitation.email) <> public.current_user_email() then
    raise exception 'This invitation belongs to a different email address';
  end if;

  update public.trip_invitations
  set status = 'rejected', responded_at = now()
  where id = v_invitation.id;
end;
$$;
