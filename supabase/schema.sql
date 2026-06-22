-- ============================================================================
--  Socrates — Supabase schema
--  Run this once in your Supabase project: Dashboard → SQL Editor → New query →
--  paste this whole file → Run. It creates the two tables the app uses and
--  secure row-level-security (RLS) policies. Email/password auth is built into
--  Supabase and needs no table.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  assignments — each teacher's saved analyses (cloud sync of their library)
-- ----------------------------------------------------------------------------
create table if not exists public.assignments (
  id          text primary key,                       -- app-generated id
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  full_text   text not null,
  status      text,                                    -- 'Bronze' | 'Silver' | 'Gold'
  resilience  integer,                                 -- 0–100 score
  created_at  timestamptz not null default now()
);

alter table public.assignments enable row level security;

-- A teacher can only see and manage their own assignments.
create policy "assignments are owner-only (select)"
  on public.assignments for select
  using (auth.uid() = user_id);

create policy "assignments are owner-only (insert)"
  on public.assignments for insert
  with check (auth.uid() = user_id);

create policy "assignments are owner-only (update)"
  on public.assignments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "assignments are owner-only (delete)"
  on public.assignments for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
--  research_papers — admin-uploaded PDFs whose text is fed into every analysis
-- ----------------------------------------------------------------------------
create table if not exists public.research_papers (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  authors     text,
  year        text,
  filename    text,
  content     text not null,                           -- extracted PDF text
  created_at  timestamptz not null default now()
);

alter table public.research_papers enable row level security;

-- The analyze function reads research papers with the public (anon) key, so
-- reads are open. Uploading/deleting requires being signed in.
-- NOTE: the in-app "admin password" is a convenience gate only — it is visible
-- in the browser bundle and is NOT real security. For stricter control, add a
-- dedicated admin role/claim and tighten the policies below.
create policy "research papers are world-readable"
  on public.research_papers for select
  using (true);

create policy "signed-in users can add research"
  on public.research_papers for insert
  to authenticated
  with check (true);

create policy "signed-in users can delete research"
  on public.research_papers for delete
  to authenticated
  using (true);
