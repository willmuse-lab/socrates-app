-- ============================================================================
--  Socrates — FULL RESET
--  This wipes the old tables (including leftovers from the previous app) and
--  rebuilds a clean schema. Run it once in your Supabase project:
--  Dashboard → SQL Editor → New query → paste this whole file → Run.
--
--  Note: this clears saved assignments and research papers. It does NOT delete
--  user logins — to remove test accounts, go to Authentication → Users and
--  delete them there.
-- ============================================================================

-- 1. Remove old tables and their data (cascade clears anything depending on them).
drop table if exists public.shared_assignments  cascade;
drop table if exists public.department_members  cascade;
drop table if exists public.departments         cascade;
drop table if exists public.research_papers     cascade;
drop table if exists public.assignments         cascade;

-- 2. Rebuild: assignments (each teacher's saved analyses).
create table public.assignments (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  full_text   text not null,
  status      text,
  resilience  integer,
  created_at  timestamptz not null default now()
);

alter table public.assignments enable row level security;

create policy "assignments are owner-only (select)"
  on public.assignments for select using (auth.uid() = user_id);
create policy "assignments are owner-only (insert)"
  on public.assignments for insert with check (auth.uid() = user_id);
create policy "assignments are owner-only (update)"
  on public.assignments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assignments are owner-only (delete)"
  on public.assignments for delete using (auth.uid() = user_id);

-- 3. Rebuild: research_papers (admin-uploaded PDFs fed into every analysis).
create table public.research_papers (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  authors     text,
  year        text,
  filename    text,
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table public.research_papers enable row level security;

create policy "research papers are world-readable"
  on public.research_papers for select using (true);
create policy "signed-in users can add research"
  on public.research_papers for insert to authenticated with check (true);
create policy "signed-in users can delete research"
  on public.research_papers for delete to authenticated using (true);
