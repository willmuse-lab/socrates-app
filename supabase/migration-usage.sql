-- ============================================================================
--  usage_events — analytics/usage tracking (added July 13 2026).
--  One row per AI call or download. Metadata + tokens ONLY — never any
--  assignment/lesson/student content. Append-only: anyone may INSERT, NOBODY
--  may SELECT via the API (RLS below). Will reads it in the Supabase console
--  (service role bypasses RLS) or through the metrics views (views-metrics.sql).
--  Safe to re-run.
-- ============================================================================
create table if not exists public.usage_events (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  user_id          uuid,                         -- signed-in account (null = anonymous/demo)
  anon_id          text,                          -- random browser id for not-signed-in users
  event_type       text not null,                 -- analyze | align | lesson_plan | directions | refine | download
  request_group    uuid,                          -- ties the two parallel analyze halves into one logical event
  model            text,                          -- e.g. claude-haiku-4-5 (null for downloads)
  input_tokens     integer,
  output_tokens    integer,
  cache_read_tokens  integer,
  cache_write_tokens integer,
  cost_usd         numeric,                       -- computed from Haiku 4.5 rates
  ai_strategy      text,                          -- avoid | augment | embrace
  subject          text,
  grade_level      text,
  duration_ms      integer,
  status           text not null default 'success', -- success | error
  error_detail     text,
  download_format  text                           -- pdf | docx | gdoc (download events)
);

create index if not exists usage_events_created_at_idx on public.usage_events (created_at);
create index if not exists usage_events_user_id_idx     on public.usage_events (user_id);
create index if not exists usage_events_event_type_idx  on public.usage_events (event_type);

alter table public.usage_events enable row level security;

-- Append-only from the app: allow INSERT for anon + authenticated, NO select/update/delete.
-- (No SELECT policy = the anon/auth API keys can never read the table. The
--  Supabase dashboard / service role bypasses RLS, so Will still sees everything.)
drop policy if exists "usage_events insert only" on public.usage_events;
create policy "usage_events insert only"
  on public.usage_events for insert
  to anon, authenticated
  with check (true);
