-- ============================================================================
--  Stripe billing columns for user_credits (added August 29 2026).
--  The plan model itself does NOT change: trial = 2 lifetime, paid = 15/month,
--  unlimited = comped. All Stripe does is flip `plan` between 'trial' and
--  'paid' and keep the billing period aligned. These columns are the link
--  between a Supabase account and its Stripe customer/subscription, written
--  ONLY by the webhook (service role). Teachers still have SELECT-only access
--  and no way to change their own plan.
--  Run AFTER migration-credits.sql. Safe to re-run.
-- ============================================================================
alter table public.user_credits
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  -- Stripe's own status string: active | trialing | past_due | canceled | ...
  -- Kept for support questions ("did their card fail?"); the app reads `plan`.
  add column if not exists subscription_status    text,
  -- True once a teacher cancels but is still inside the period they paid for.
  -- They stay on 'paid' until Stripe says the subscription is actually deleted.
  add column if not exists cancel_at_period_end   boolean not null default false,
  add column if not exists current_period_end     timestamptz;

-- The webhook looks a teacher up by Stripe customer id on renewal/cancel
-- events (those carry no Supabase id of their own).
create index if not exists user_credits_stripe_customer_idx
  on public.user_credits (stripe_customer_id);

-- Who is paying, and what state is their subscription in. Same security
-- posture as the other metrics views (see views-metrics.sql): runs as the
-- caller and is unreadable through the API keys — Will reads it in the
-- Supabase console, which uses the service role.
create or replace view public.metrics_subscriptions as
select
  u.email,
  c.plan,
  c.subscription_status,
  c.cancel_at_period_end,
  c.current_period_end,
  c.used,
  c.period_start,
  c.stripe_customer_id,
  c.updated_at as last_change
from public.user_credits c
join auth.users u on u.id = c.user_id
where c.stripe_customer_id is not null
order by c.updated_at desc;

alter view public.metrics_subscriptions set (security_invoker = on);
revoke all on public.metrics_subscriptions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Handy checks (run in the SQL editor):
--   select * from public.metrics_subscriptions;              -- paying teachers
--   select plan, count(*) from public.user_credits group by 1;
--
-- Comped accounts are protected: the webhook never touches a row whose plan is
-- 'unlimited', so granting someone unlimited by hand survives any Stripe event.
