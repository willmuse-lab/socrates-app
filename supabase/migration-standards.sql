-- ============================================================================
--  Migration: standards_documents — teacher-uploaded SCOS / standards docs
--  Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--  Safe to run alongside the existing schema; touches nothing else.
-- ============================================================================

create table if not exists public.standards_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,                 -- e.g. "NC SCOS — 7th Grade ELA"
  state       text,                          -- e.g. "NC"
  subject     text,                          -- e.g. "English Language Arts"
  grade_level text,                          -- e.g. "7"
  filename    text,
  content     text not null,                 -- extracted PDF text
  created_at  timestamptz not null default now()
);

alter table public.standards_documents enable row level security;

-- Owner-only, same pattern as assignments.
drop policy if exists "standards are owner-only (select)" on public.standards_documents;
create policy "standards are owner-only (select)"
  on public.standards_documents for select
  using (auth.uid() = user_id);

drop policy if exists "standards are owner-only (insert)" on public.standards_documents;
create policy "standards are owner-only (insert)"
  on public.standards_documents for insert
  with check (auth.uid() = user_id);

drop policy if exists "standards are owner-only (update)" on public.standards_documents;
create policy "standards are owner-only (update)"
  on public.standards_documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "standards are owner-only (delete)" on public.standards_documents;
create policy "standards are owner-only (delete)"
  on public.standards_documents for delete
  using (auth.uid() = user_id);
