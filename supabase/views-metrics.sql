-- ============================================================================
--  Metrics views (Phase 2) — read these in the Supabase console (Table Editor
--  → click the view). Safe to re-run. Built on usage_events + auth.users.
--  These are the "behind the scenes" dashboard: no app UI, no login beyond
--  Will's existing Supabase account.
-- ============================================================================

-- Headline KPIs, one row.
create or replace view public.metrics_overview as
select
  (select count(*) from auth.users)                                                     as total_users,
  (select count(*) from auth.users where created_at > now() - interval '7 days')        as signups_7d,
  (select count(*) from auth.users where created_at > now() - interval '30 days')       as signups_30d,
  (select count(distinct user_id) from public.usage_events
     where user_id is not null and created_at > now() - interval '7 days')              as active_users_7d,
  (select count(distinct user_id) from public.usage_events
     where user_id is not null and created_at > now() - interval '30 days')             as active_users_30d,
  (select count(distinct anon_id) from public.usage_events
     where anon_id is not null and created_at > now() - interval '30 days')             as anon_visitors_30d,
  (select count(distinct request_group) from public.usage_events
     where event_type = 'analyze' and status = 'success')                               as total_analyses,
  (select count(*) from public.usage_events
     where event_type = 'lesson_plan' and status = 'success')                           as total_lesson_plans,
  (select count(*) from public.usage_events
     where event_type = 'lesson_plan' and status = 'success')                           as total_transformations,
  (select count(*) from public.usage_events where model is not null)                    as total_ai_calls,
  (select coalesce(sum(input_tokens), 0) from public.usage_events)                      as total_input_tokens,
  (select coalesce(sum(output_tokens), 0) from public.usage_events)                     as total_output_tokens,
  round((select coalesce(sum(cost_usd), 0) from public.usage_events)::numeric, 4)       as total_cost_usd,
  round((select coalesce(avg(cost_usd), 0) from public.usage_events
     where event_type = 'analyze' and status = 'success')::numeric, 5)                  as avg_cost_per_analysis,
  round((select coalesce(sum(cost_usd), 0) / nullif(count(distinct request_group), 0)
     from public.usage_events where created_at > now() - interval '30 days')::numeric, 5) as avg_cost_per_workflow_30d,
  round(100.0 * (select count(*) from public.usage_events where status = 'error')
     / nullif((select count(*) from public.usage_events where model is not null), 0), 1) as error_rate_pct;

-- Weekly trend (for growth charts).
create or replace view public.metrics_growth as
with weeks as (
  select date_trunc('week', created_at) as week from public.usage_events
  union select date_trunc('week', created_at) from auth.users
)
select distinct
  w.week,
  (select count(*) from auth.users u where date_trunc('week', u.created_at) = w.week)                          as new_signups,
  (select count(distinct e.user_id) from public.usage_events e
     where date_trunc('week', e.created_at) = w.week and e.user_id is not null)                                as active_users,
  (select count(distinct e.request_group) from public.usage_events e
     where date_trunc('week', e.created_at) = w.week and e.event_type = 'analyze' and e.status = 'success')    as analyses,
  (select count(*) from public.usage_events e
     where date_trunc('week', e.created_at) = w.week and e.event_type = 'lesson_plan' and e.status = 'success') as lesson_plans,
  round((select coalesce(sum(e.cost_usd),0) from public.usage_events e
     where date_trunc('week', e.created_at) = w.week)::numeric, 4)                                             as cost_usd
from weeks w order by w.week desc;

-- Unit economics (last 30 days) with the $9.99 pricing assumption.
create or replace view public.metrics_unit_economics as
select
  (select count(*) from public.usage_events
     where event_type = 'lesson_plan' and status = 'success' and created_at > now() - interval '30 days') as transformations_30d,
  round((select coalesce(sum(cost_usd),0) from public.usage_events
     where created_at > now() - interval '30 days')::numeric, 4)                                          as total_cost_usd_30d,
  round((select coalesce(sum(cost_usd),0) / nullif(count(distinct request_group),0)
     from public.usage_events where created_at > now() - interval '30 days')::numeric, 5)                 as avg_cost_per_workflow_30d,
  9.99                                                                                                    as revenue_per_user_assumed,
  round(100.0 * (9.99 - (select coalesce(sum(cost_usd),0) / nullif(count(distinct user_id),0)
     from public.usage_events where user_id is not null and created_at > now() - interval '30 days'))
     / 9.99, 1)                                                                                           as implied_gross_margin_pct,
  -- Token columns added July 19 2026 (appended at the end — create or replace
  -- view only allows NEW columns after the existing ones).
  (select coalesce(sum(input_tokens),0) from public.usage_events
     where created_at > now() - interval '30 days')                                                       as input_tokens_30d,
  (select coalesce(sum(output_tokens),0) from public.usage_events
     where created_at > now() - interval '30 days')                                                       as output_tokens_30d,
  (select coalesce(sum(cache_read_tokens),0) from public.usage_events
     where created_at > now() - interval '30 days')                                                       as cached_tokens_30d,
  (select (coalesce(sum(input_tokens),0) + coalesce(sum(output_tokens),0))
       / nullif(count(distinct request_group),0)
     from public.usage_events where created_at > now() - interval '30 days')                              as avg_tokens_per_workflow_30d;

-- Per-account engagement (retention).
create or replace view public.metrics_by_user as
select
  u.email,
  u.created_at::date                                                        as signup_date,
  count(distinct e.request_group) filter (where e.event_type = 'analyze')   as analyses,
  count(*) filter (where e.event_type = 'lesson_plan')                      as lesson_plans,
  round(coalesce(sum(e.cost_usd),0)::numeric, 4)                            as total_cost_usd,
  max(e.created_at)                                                         as last_active
from auth.users u
left join public.usage_events e on e.user_id = u.id
group by u.email, u.created_at order by last_active desc nulls last;

-- Assignment-allowance / plan mix (added July 20 2026). One row per teacher who
-- has a credits record, plus their plan and how much of the allowance is used.
-- Depends on user_credits (migration-credits.sql). Safe to skip if not created.
create or replace view public.metrics_credits as
select
  u.email,
  c.plan,
  c.used,
  case when c.plan = 'unlimited' then null else public.credit_allowance(c.plan) end                       as allowance,
  case when c.plan = 'unlimited' then null else greatest(public.credit_allowance(c.plan) - c.used, 0) end as remaining,
  c.period_start,
  c.updated_at                                          as last_change
from public.user_credits c
join auth.users u on u.id = c.user_id
order by c.updated_at desc;

-- Segmentation by subject.
create or replace view public.metrics_by_subject as
select
  coalesce(nullif(subject, ''), '(unspecified)')                           as subject,
  count(distinct request_group) filter (where event_type = 'analyze')      as analyses,
  count(*) filter (where event_type = 'lesson_plan')                       as lesson_plans,
  round(coalesce(sum(cost_usd),0)::numeric, 4)                             as cost_usd
from public.usage_events group by 1 order by analyses desc nulls last;
