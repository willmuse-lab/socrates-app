-- ============================================================================
--  assignments.payload — full report snapshot for saved library items
--  (added July 22 2026). Stores the analysis report, lesson plan, and student
--  directions as JSON so a teacher can reopen a saved assignment as a read-only
--  report without re-running the AI. Nullable: rows saved before this feature
--  simply have no payload. Existing owner RLS on `assignments` covers it.
--  Safe to re-run.
-- ============================================================================
alter table public.assignments add column if not exists payload jsonb;
