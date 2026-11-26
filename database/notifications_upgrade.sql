-- TrackPoints: notification fixes + notifications for every important account/project change.
-- Safe for the Android app: it only adds one optional column and new triggers.
-- Every new trigger is wrapped so a notification problem can NEVER block the real change
-- (log-in, password change, project update, etc. still succeed).

------------------------------------------------------------------
-- 0. Fixes
------------------------------------------------------------------
-- check_upcoming_deadlines() saves notifications.commission_id, which didn't exist
alter table public.notifications
  add column if not exists commission_id uuid references public.commissions(id) on delete set null;

-- Freelancers got 2 notifications when a project was approved (notify_client_status_change already sends one)
drop trigger if exists tr_on_commission_pending_freelancer on public.commissions;

-- Small helper used by all triggers below
create or replace function public.tp_notify(p_user uuid, p_message text, p_commission uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_message is null then return; end if;
  insert into public.notifications (user_id, message, commission_id) values (p_user, p_message, p_commission);
end $$;

create or replace function public.tp_when(ts timestamptz)
returns text language sql stable as $$
  select to_char(ts at time zone 'Asia/Manila', 'Mon DD, YYYY HH12:MI AM')
$$;

------------------------------------------------------------------
-- 1. Account changes (public.users)
------------------------------------------------------------------
create or replace function public.tp_notify_account_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  role_name text;
begin
  -- Account still being set up during sign-up: don't spam the new user
  if old.role is null then
    if new.role is not null then
      perform public.tp_notify(a.id, 'New ' || initcap(new.role) || ' sign-up: ' || coalesce(new.fullname, new.email) || ' is waiting for approval.')
      from public.users a where a.role = 'ADMIN';
    end if;
    return new;
  end if;

  -- Approval / rejection
  if coalesce(old.is_approved, false) = false and new.is_approved = true then
    perform public.tp_notify(new.id, 'Your account has been approved. Welcome to TrackPoints!');
  elsif coalesce(old.is_rejected, false) = false and new.is_rejected = true then
    perform public.tp_notify(new.id, 'Your account request was rejected by the Admin.');
  else
    -- ID verification (only when it is not part of the approval above)
    if trim(coalesce(old.verification_status, '')) is distinct from trim(coalesce(new.verification_status, '')) then
      if trim(new.verification_status) = 'VERIFIED' then
        perform public.tp_notify(new.id, 'Your ID has been verified. Your account now shows a Verified badge.');
      elsif trim(new.verification_status) = 'REJECTED' then
        perform public.tp_notify(new.id, 'Your ID was rejected. Please upload a clearer photo of a valid ID.');
      elsif trim(new.verification_status) = 'PENDING' then
        perform public.tp_notify(new.id, 'Your ID was submitted. The Admin will review it soon.');
        perform public.tp_notify(a.id, coalesce(new.fullname, new.email) || ' submitted an ID for verification.')
        from public.users a where a.role = 'ADMIN' and a.id <> new.id;
      end if;
    end if;
  end if;

  -- Role change
  if new.role is distinct from old.role and new.role is not null then
    role_name := case new.role when 'ADMIN' then 'Admin' when 'CLIENT' then 'Client' when 'FREELANCER' then 'Freelancer' else new.role end;
    perform public.tp_notify(new.id, 'Your account role was changed to ' || role_name || '.');
  end if;

  -- Penalties
  if coalesce(new.is_permanently_banned, false) and not coalesce(old.is_permanently_banned, false) then
    perform public.tp_notify(new.id, 'Your account has been permanently banned due to repeated violations.');
  elsif new.ban_until is not null and new.ban_until > now()
        and (old.ban_until is null or new.ban_until is distinct from old.ban_until) then
    perform public.tp_notify(new.id, 'Your account is suspended until ' || public.tp_when(new.ban_until) || '.');
  elsif coalesce(new.offense_count, 0) > coalesce(old.offense_count, 0) then
    perform public.tp_notify(new.id, 'Warning: a violation was recorded on your account (' || new.offense_count || ' total). Further violations may lead to suspension.');
  end if;

  if (coalesce(old.is_permanently_banned, false) and not coalesce(new.is_permanently_banned, false))
     or (old.ban_until is not null and old.ban_until > now() and new.ban_until is null) then
    perform public.tp_notify(new.id, 'Your suspension/ban has been lifted. You can use TrackPoints again.');
  end if;

  -- Profile details
  if new.fullname is distinct from old.fullname or new.phone_number is distinct from old.phone_number
     or new.specialty is distinct from old.specialty or new.hourly_rate is distinct from old.hourly_rate then
    perform public.tp_notify(new.id, 'Your profile details were updated.');
  end if;
  if new.photo is distinct from old.photo then
    perform public.tp_notify(new.id, 'Your profile photo was changed.');
  end if;
  if new.portfolio is distinct from old.portfolio then
    perform public.tp_notify(new.id, 'Your portfolio was updated.');
  end if;

  return new;
exception when others then
  return new; -- never block the update because of a notification
end $$;

drop trigger if exists tr_tp_notify_account_changes on public.users;
create trigger tr_tp_notify_account_changes
after update on public.users
for each row
when (
  old.is_approved is distinct from new.is_approved or old.is_rejected is distinct from new.is_rejected
  or old.verification_status is distinct from new.verification_status or old.role is distinct from new.role
  or old.offense_count is distinct from new.offense_count or old.ban_until is distinct from new.ban_until
  or old.is_permanently_banned is distinct from new.is_permanently_banned
  or old.fullname is distinct from new.fullname or old.phone_number is distinct from new.phone_number
  or old.specialty is distinct from new.specialty or old.hourly_rate is distinct from new.hourly_rate
  or old.photo is distinct from new.photo or old.portfolio is distinct from new.portfolio
)
execute function public.tp_notify_account_changes();

------------------------------------------------------------------
-- 2. Password / email changes (auth.users)
------------------------------------------------------------------
create or replace function public.tp_notify_auth_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password and old.encrypted_password is not null then
    perform public.tp_notify(new.id, 'Your password was changed on ' || public.tp_when(now()) || '. If this wasn''t you, use Forgot Password right away.');
  end if;
  if new.email is distinct from old.email and old.email is not null then
    perform public.tp_notify(new.id, 'Your account email was changed to ' || new.email || '.');
  end if;
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists tr_tp_notify_auth_changes on auth.users;
create trigger tr_tp_notify_auth_changes
after update of encrypted_password, email on auth.users
for each row execute function public.tp_notify_auth_changes();

------------------------------------------------------------------
-- 3. Projects (public.commissions)
------------------------------------------------------------------
create or replace function public.tp_notify_commission_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.tp_notify(new.client_id, 'Your request "' || coalesce(new.name, 'Untitled') || '" was sent and is waiting for Admin approval.', new.id);
  return new;
exception when others then return new;
end $$;

drop trigger if exists tr_tp_notify_commission_created on public.commissions;
create trigger tr_tp_notify_commission_created
after insert on public.commissions
for each row execute function public.tp_notify_commission_created();

create or replace function public.tp_notify_commission_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fl_name text;
  cl_name text;
begin
  select fullname into fl_name from public.users where id = new.freelancer_id;
  select fullname into cl_name from public.users where id = new.client_id;

  -- progress updates -> client
  if new.progress_percentage is distinct from old.progress_percentage and new.status = 'IN_PROGRESS' then
    if new.progress_percentage >= 100 then
      perform public.tp_notify(new.client_id, coalesce(fl_name, 'Your freelancer') || ' finished "' || coalesce(new.name, 'your project') || '" (100%). Send the points to complete it.', new.id);
    else
      perform public.tp_notify(new.client_id, coalesce(fl_name, 'Your freelancer') || ' updated "' || coalesce(new.name, 'your project') || '" to ' || new.progress_percentage || '%.', new.id);
    end if;
  end if;

  -- status changes the existing trigger doesn't send to the freelancer
  if new.status is distinct from old.status then
    if new.status = 'DONE' then
      perform public.tp_notify(new.freelancer_id, coalesce(cl_name, 'The client') || ' marked "' || coalesce(new.name, 'the project') || '" as done. You earned ' || coalesce(new.points, 0)::bigint || ' points'
        || case when new.rating is not null then ' and a ' || new.rating || '-star rating.' else '.' end, new.id);
    elsif new.status = 'IN_PROGRESS' then
      perform public.tp_notify(new.freelancer_id, 'You accepted "' || coalesce(new.name, 'the project') || '". It is now in progress.', new.id);
    elsif new.status = 'REJECTED_BY_FREELANCER' then
      perform public.tp_notify(new.freelancer_id, 'You declined "' || coalesce(new.name, 'the project') || '".', new.id);
    end if;
  end if;

  -- details edited
  if (new.name is distinct from old.name or new.due_date is distinct from old.due_date or new.points is distinct from old.points)
     and new.status is not distinct from old.status then
    perform public.tp_notify(new.freelancer_id, 'Project details changed for "' || coalesce(new.name, 'a project') || '".', new.id);
    perform public.tp_notify(new.client_id, 'Project details changed for "' || coalesce(new.name, 'a project') || '".', new.id);
  end if;

  return new;
exception when others then return new;
end $$;

drop trigger if exists tr_tp_notify_commission_changes on public.commissions;
create trigger tr_tp_notify_commission_changes
after update on public.commissions
for each row execute function public.tp_notify_commission_changes();

-- Deadline reminders now go to BOTH the freelancer and the client (and work, thanks to the new column)
create or replace function public.check_upcoming_deadlines()
returns void language plpgsql security definer set search_path = public as $$
declare
  comm record;
  days_left integer;
  msg text;
  who uuid;
begin
  for comm in
    select id, client_id, freelancer_id, name, due_date
    from public.commissions
    where status = 'IN_PROGRESS' and due_date is not null
      and due_date <= (current_date + interval '3 days') and due_date >= current_date
  loop
    days_left := (comm.due_date::date - current_date);
    msg := case
      when days_left = 0 then '"' || comm.name || '" is due today!'
      when days_left = 1 then '"' || comm.name || '" is due tomorrow!'
      else '"' || comm.name || '" is due in ' || days_left || ' days.'
    end;
    foreach who in array array[comm.freelancer_id, comm.client_id] loop
      if who is not null and not exists (
        select 1 from public.notifications
        where user_id = who and commission_id = comm.id and created_at::date = current_date and message like '%due%'
      ) then
        insert into public.notifications (user_id, message, commission_id) values (who, msg, comm.id);
      end if;
    end loop;
  end loop;
end $$;

------------------------------------------------------------------
-- 4. Messages -> one "new message" notice per conversation until it is read
------------------------------------------------------------------
create or replace function public.tp_notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sender_name text;
  proj text;
begin
  if exists (
    select 1 from public.messages m
    where m.commission_id is not distinct from new.commission_id
      and m.receiver_id = new.receiver_id and m.read_at = false and m.id <> new.id
  ) then
    return new; -- they already have unread messages here; don't spam
  end if;
  select fullname into sender_name from public.users where id = new.sender_id;
  select name into proj from public.commissions where id = new.commission_id;
  perform public.tp_notify(new.receiver_id, 'New message from ' || coalesce(sender_name, 'someone')
    || case when proj is not null then ' about "' || proj || '".' else '.' end, new.commission_id);
  return new;
exception when others then return new;
end $$;

drop trigger if exists tr_tp_notify_new_message on public.messages;
create trigger tr_tp_notify_new_message
after insert on public.messages
for each row execute function public.tp_notify_new_message();

------------------------------------------------------------------
-- 5. Concerns (public.reports) -> keep the reporter informed
------------------------------------------------------------------
create or replace function public.tp_notify_report_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.tp_notify(new.reporter_id, 'Your concern "' || coalesce(new.sub_type, 'concern') || '" was submitted. The Admin will review it.', new.commission_id);
  elsif new.status is distinct from old.status then
    if new.status = 'RESOLVED' then
      perform public.tp_notify(new.reporter_id, 'Your concern "' || coalesce(new.sub_type, 'concern') || '" was resolved by the Admin.', new.commission_id);
    elsif new.status = 'DISMISSED' then
      perform public.tp_notify(new.reporter_id, 'Your concern "' || coalesce(new.sub_type, 'concern') || '" was reviewed and dismissed.', new.commission_id);
    end if;
  end if;
  return new;
exception when others then return new;
end $$;

drop trigger if exists tr_tp_notify_report_changes on public.reports;
create trigger tr_tp_notify_report_changes
after insert or update on public.reports
for each row execute function public.tp_notify_report_changes();
