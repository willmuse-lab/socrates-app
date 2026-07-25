-- ============================================================================
--  profiles — per-teacher profile (subjects, grades, school, onboarding done),
--  added July 22 2026. Previously the profile lived only in the browser's local
--  storage, so when that was cleared (Safari/iOS evicts it after ~7 days, or a
--  new device/browser) the teacher was forced through onboarding again. Storing
--  it on the account fixes that — onboarding happens once. The profile is the
--  teacher's own data (no student PII). Owner-only RLS. Safe to re-run.
-- ============================================================================
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb,                                   -- the TeacherProfile object
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select"
  on public.profiles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert"
  on public.profiles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
