# SOCRATES — Session Handoff Document

**Purpose:** Complete context for continuing work on this project in a new
session. Read this whole file before making changes. Last updated: July 4 2026.

## What this is

Socrates (socratesmuse.com brand) helps teachers redesign assignments so AI
can't do the work for students. Teacher pastes/uploads an assignment → gets a
0–100 "resilience" score, an AI-failure breakdown, and Bronze/Silver/Gold
redesigns → (feature branch) aligns to uploaded SCOS standards → generates a
Section I–VI lesson plan + student-facing directions.

Owner: Will Muse (willmuse@greensboroday.org) — a teacher, NOT a developer.
**Explain things step-by-step, no jargon, one action at a time.** He clicks
through dashboards himself (Netlify/Supabase logins are his). Walk him through
every dashboard task with exact click paths, one step per message, and wait.

## Architecture

- React 18 + Vite + Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui (`components/ui/`)
  + `motion/react` (motion package, NOT framer-motion)
- Netlify functions (`netlify/functions/`): `analyze.ts` (scoring/redesigns),
  `generate.ts` (feature branch only: align / lesson_plan / directions modes),
  shared prompts in `_shared/research-base.ts` (feature branch)
- Supabase: auth (email/password, confirm-email OFF), tables `assignments`,
  `research_papers`, `standards_documents` (all with owner RLS). Schema files
  in `supabase/` (reset.sql, schema.sql, migration-standards.sql — ALL ALREADY RUN)
- Client libs: `src/lib/gemini.ts` (analyze API client — name is legacy, it
  calls Claude), `standards.ts` (feature branch), `supabase.ts`, `profile.ts`
  (multi-select subjects/grades), `comments.ts` (teacher testimonials),
  `pdf.ts` (bundled pdf.js worker — do NOT use CDN workerSrc)

## Deployment facts (IMPORTANT — non-obvious)

- **Live site:** Netlify project `brilliant-mandazi-3937f4`
  (https://brilliant-mandazi-3937f4.netlify.app), deploys from `main` of
  willmuse-lab/socrates-app.
- **Auto-deploy of main does NOT fire.** Every push to main requires Will to
  manually: Netlify → Deploys → Trigger deploy → Deploy site. Remind him.
- **PR Deploy Previews DO fire automatically** on every push to a PR branch.
- **A second stale Netlify site (`musesocrates`) is also linked to this repo**
  with NO env vars — its previews look broken (no Supabase → demo mode).
  Ignore/never test there. Parked task: unlink it.
- Env vars on brilliant-mandazi: `ANTHROPIC_API_KEY` (secret, all contexts),
  `VITE_SUPABASE_URL` = https://llvtiuhtjpprtwlvnauu.supabase.co,
  `VITE_SUPABASE_ANON_KEY`. VITE_ vars bake at build time → redeploy after changes.

## Branch state

- `main` = the live site. Has UNDEPLOYED commits (PDF-worker fix, JSON repair,
  7 UI changes below) — needs a manual Trigger deploy.
- `feature/scos-lesson-plan` = SCOS standards + lesson plan + student
  directions pipeline. **Draft PR #2** exists for the Deploy Preview:
  https://deploy-preview-2--brilliant-mandazi-3937f4.netlify.app
  **DO NOT merge PR #2 until Will says testing is done** (principal demo
  ~mid-July; decide by ~July 15). Keep feature branch synced by merging main
  into it after any main change.

## Hard-won technical lessons (do not regress these)

1. **Netlify functions die silently at 30s.** All model calls MUST: use
   `client.messages.stream()` + `finalMessage()` (non-streaming stalls), model
   `claude-haiku-4-5`, small max_tokens, concise-output prompts, `withTimeout`
   wrappers (26s) + SDK timeout 27s/maxRetries 0, and per-step function logs
   (`console.log("analyze v3: ...")`). Debug via Netlify → Logs & metrics →
   Functions → analyze. Structured outputs (json_schema) caused timeouts — the
   functions ask for plain JSON and parse it leniently instead.
2. **Model JSON sometimes has literal newlines inside strings** → parse
   failure ("unexpected format"). Both functions have a repairJSON pass —
   keep it when editing.
3. **pdf.js worker must come from the bundle** (`src/lib/pdf.ts`, Vite `?url`
   import). CDN workerSrc 404s (v4 ships .mjs). All three uploaders
   (FileUploader, AdminResearch, StandardsManager) import from pdf.ts.
4. Analysis quality was deliberately traded down (Haiku, ~short outputs) to
   fit the timeout. "Quality tuning" is a parked task — any attempt must be
   tested against the 30s ceiling on a deploy preview first.

## Product decisions already made (don't relitigate)

- Pricing: Teacher $9.99/mo or $99.99/yr only; School/District = "Call for
  pricing" → mailto hello@socratesmuse.com. No payment processing exists yet —
  "Get started" is a stub.
- Testimonials are anonymized (generic role tags only, no names/grades/
  subjects). Source of truth: `src/lib/comments.ts` (feeds the analyzing-screen
  rotation AND the Feedback page). Will adds quotes by giving them in chat.
- While analyzing: rotating testimonials + slim progress bar (no status text).
- IEP/ELL/Gifted differentiation is HIDDEN everywhere (backend doesn't
  generate it since the timeout fix). Code kept (DifferentiationPanel unused).
- Teacher profile: multi-select subjects AND grade levels (Onboarding),
  editable via Settings; old single-select profiles migrate in profile.ts.
- Public research content is trimmed: source names only + "proprietary
  methodology" notes (About/Scoring pages). Full research/prompts live
  server-side only. Departments/sharing feature was removed entirely.
  Google Drive/Docs buttons are commented out (no backend functions exist).
- **Social login (Google + Microsoft):** "Continue with Google/Microsoft"
  buttons are LIVE on the login dialog (`LoginDialog.tsx`), backed by Supabase
  `signInWithOAuth` (`signInWithProvider` in `supabase.ts`, provider `google` /
  `azure`). Login only; no Drive access. The existing `onAuthStateChange`
  listener completes the session on redirect back (redirectTo =
  window.location.origin).
  - **GOOGLE = DONE & TESTED LIVE (July 4 2026).** Provider enabled in Supabase
    with real Client ID/Secret; verified end-to-end (Will logged in with Google
    on the live site).
  - **MICROSOFT = NOT YET.** Button is live but the Azure provider is not
    enabled in Supabase — see "Social login setup" step 2. Same process as
    Google. Do this next.
- Standards (SCOS) upload appears in: onboarding profile step, Settings
  dialog, and the post-analysis results card (where the doc is SELECTED for
  alignment). Requires login + Supabase.

## Social login setup (Google + Microsoft) — Will's dashboard steps

Code is done; these are the one-time dashboard tasks to make the buttons work.
Walk Will through them one step at a time. Test on the LIVE/preview site (not
localhost) — OAuth needs the real web address.

0. **Get the callback URL:** Supabase → Authentication → Providers → click
   Google (or Microsoft) → copy the "Callback URL (redirect URI)"
   (`https://llvtiuhtjpprtwlvnauu.supabase.co/auth/v1/callback`). Same URL for both.
1. **Google:** console.cloud.google.com → project → APIs & Services →
   Credentials → Create Credentials → OAuth client ID → type "Web application"
   → paste callback URL under Authorized redirect URIs → copy Client ID +
   Secret → Supabase → Providers → Google → toggle on, paste both, Save.
2. **Microsoft:** portal.azure.com → "App registrations" → New registration →
   Redirect URI type "Web" + paste callback URL → copy Application (client) ID
   → Certificates & secrets → New client secret → copy the Value → Supabase →
   Providers → **Azure** (Microsoft = Azure in Supabase) → toggle on, paste
   both, Save.
- Reuse the SAME Google Cloud project when the Drive feature returns — Drive
  just needs extra scopes added to it (which then triggers Google verification,
  the slow part — see task 10). Google project is named "Socrates", owned by
  socratesaiedu@gmail.com; OAuth client "Socrates Web" already created.

**Gotchas hit during Google setup (apply to Microsoft too):**
- After entering Client ID + Secret in the Supabase provider panel, the toggle
  AND a **Save** must both stick. A first save didn't persist → login threw
  `provider is not enabled`. Re-opening the panel and saving again fixed it.
- **Supabase Site URL was `http://localhost:3000`** (dev default). After OAuth,
  Supabase returns the user to the Site URL / an allow-listed Redirect URL; the
  localhost value dead-ended at "site can't be reached" even though login
  succeeded (access_token was in the URL). FIX (done): Authentication → URL
  Configuration → Site URL = `https://brilliant-mandazi-3937f4.netlify.app`,
  and add Redirect URL `https://brilliant-mandazi-3937f4.netlify.app/**`.
- The Google consent screen shows "Sign in to llvtiuhtjpprtwlvnauu.supabase.co"
  (the Supabase project domain), not "Socrates". Purely cosmetic; login works.
  To brand it you need Supabase's paid Custom Domain add-on (run auth on
  auth.<yourdomain>) — bundle with the custom-domain task (#6) and Google
  verification (#10). Do NOT chase this standalone.

## Parked tasks (Will's backlog, roughly by priority)

1. Test the full SCOS → lesson plan flow on deploy-preview-2 (in progress;
   fixes for timeout/format just pushed).
2. Trigger deploy of main — DONE July 4 2026 (shipped the pending pricing/
   testimonials/feedback/profile batch + Google login). Re-do after future
   main pushes; auto-deploy still doesn't fire.
3. **Rotate the Anthropic API key** — Will pasted screenshots showing the full
   key in chat. Create new key in console.anthropic.com, swap in Netlify,
   delete old. Walk him through it.
4. Quality tuning of analyzer output (see lesson #4).
5. Unlink the stale `musesocrates` Netlify site.
6. Custom domain (he wanted "socrates.ai.com" — explained invalid; choose
   socrates.ai (~$70-100/yr) vs socratesai.com (~$12/yr); not decided).
7. Payments (Stripe) when ready to charge; ToS page exists but needs lawyer
   review before charging.
8. Admin password is a soft gate (VITE_ADMIN_PASSWORD, default socrates2025,
   visible in bundle — known limitation).
9. Four-role buyer review exercise (teacher/principal/head/acquirer) was
   paused at the Principal's questions.
10. Google Drive/Docs backend (five functions) if that feature returns.
    NOTE: reading Drive is a Google "sensitive scope" → requires Google app
    verification (privacy policy + review, days-to-weeks). Start that clock
    early. Drive UI already built (`GoogleDrivePicker.tsx`, commented out) and
    netlify.toml already has the /api/google/* redirects; the 5 functions and
    OAuth token refresh are what's missing.
11b. **NEXT UP:** Enable MICROSOFT (Azure) social login in Supabase — Google is
    done/tested. Follow "Social login setup" step 2. Button already live.
11. `marketing/brand-brief.md` exists for Claude.ai marketing Projects.

## Working conventions

- Develop features on branches with a draft PR (preview auto-builds); merge to
  main only with Will's explicit OK ("yes, merge it").
- After changing main, merge main into open feature branches to keep synced.
- Verify functions with: `npx esbuild netlify/functions/<f>.ts --bundle
  --platform=node --format=esm --external:@anthropic-ai/sdk
  --external:@supabase/supabase-js --outfile=/tmp/x.mjs`
- Verify frontend with `npx vite build`. Commit messages: plain, no model IDs.
- Research sources: summarized entries in `_shared/research-base.ts`
  (RESEARCH_NOTES + STRATEGY_CATALOG). Full-text PDFs go via admin Research
  Library (Supabase `research_papers`, injected into analyze prompts).
