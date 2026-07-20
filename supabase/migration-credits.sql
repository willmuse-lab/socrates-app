-- ============================================================================
--  user_credits — per-teacher monthly assignment allowance (added July 20 2026).
--  Model: TRIAL = 3 assignments (lifetime, no reset) → then a wall until they
--  upgrade. PAID = 20 assignments per month, resets monthly, NO rollover.
--  "1 assignment" = analyzing one new assignment; every follow-up for that same
--  assignment (re-analysis, revisions, lesson plan, directions, downloads) is
--  free. Enforced server-side via SECURITY DEFINER functions so a teacher can
--  never edit their own counter (they have SELECT only, no direct UPDATE).
--  Safe to re-run.
-- ============================================================================
create table if not exists public.user_credits (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  plan         text not null default 'trial',   -- trial | paid
  used         int  not null default 0,          -- assignments used in the current period
  period_start date not null default current_date, -- anchor for the monthly reset (paid)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.user_credits enable row level security;

-- Teachers may READ their own balance (for the on-screen counter). They may NOT
-- insert/update/delete directly — the functions below (which run as the table
-- owner) are the only way the counter changes, so it can't be tampered with.
drop policy if exists "user_credits self read" on public.user_credits;
create policy "user_credits self read"
  on public.user_credits for select
  to authenticated
  using (auth.uid() = user_id);

-- Allowance per plan, in one place.
create or replace function public.credit_allowance(p text)
returns int language sql immutable as $$
  select case when p = 'paid' then 20 else 3 end;
$$;

-- Read-only: current balance, creating the row on first call and applying a
-- monthly reset for paid plans whose period has elapsed. Used for display.
create or replace function public.get_assignment_credits()
returns table (plan text, used int, allowance int, remaining int, period_start date)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  rec public.user_credits;
  allow int;
begin
  if uid is null then return; end if;
  select * into rec from public.user_credits where user_id = uid;
  if not found then
    insert into public.user_credits(user_id) values (uid) returning * into rec;
  end if;
  if rec.plan = 'paid' and rec.period_start <= (current_date - interval '1 month')::date then
    update public.user_credits set used = 0, period_start = current_date, updated_at = now()
      where user_id = uid returning * into rec;
  end if;
  allow := public.credit_allowance(rec.plan);
  return query select rec.plan, rec.used, allow, greatest(allow - rec.used, 0), rec.period_start;
end; $$;

-- Atomically spend one assignment credit. Returns allowed=false WITHOUT
-- incrementing when the teacher is out of allowance (the app then shows the
-- wall). Applies the monthly reset first, same as the read function.
create or replace function public.consume_assignment_credit()
returns table (plan text, used int, allowance int, remaining int, allowed boolean, period_start date)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  rec public.user_credits;
  allow int;
begin
  if uid is null then
    return query select 'trial'::text, 0, 0, 0, false, current_date; return;
  end if;
  select * into rec from public.user_credits where user_id = uid for update;
  if not found then
    insert into public.user_credits(user_id) values (uid) returning * into rec;
  end if;
  if rec.plan = 'paid' and rec.period_start <= (current_date - interval '1 month')::date then
    update public.user_credits set used = 0, period_start = current_date, updated_at = now()
      where user_id = uid returning * into rec;
  end if;
  allow := public.credit_allowance(rec.plan);
  if rec.used >= allow then
    return query select rec.plan, rec.used, allow, 0, false, rec.period_start; return;
  end if;
  update public.user_credits set used = used + 1, updated_at = now()
    where user_id = uid returning * into rec;
  return query select rec.plan, rec.used, allow, greatest(allow - rec.used, 0), true, rec.period_start;
end; $$;

grant execute on function public.credit_allowance(text)          to authenticated;
grant execute on function public.get_assignment_credits()        to authenticated;
grant execute on function public.consume_assignment_credit()     to authenticated;

-- To upgrade a teacher to the paid plan by hand (until Stripe is wired up), run:
--   update public.user_credits set plan = 'paid', used = 0, period_start = current_date where user_id = '<their-uuid>';
-- Find the uuid in Authentication → Users, or the metrics_by_user view (email).
