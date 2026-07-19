# SOCRATES — Session Handoff Document

**Purpose:** Complete context for continuing work on this project in a new
session. Read this whole file before making changes. Last updated: July 12 2026.

## What this is

**RENAMED July 4 2026: the product is now "SocratesIQ"** (was Socrates /
Socrates Studio). All visible UI, tab title, and PDF/DOCX export headers say
SocratesIQ; internal code identifiers, localStorage keys, and model personas
("You are Socrates") were deliberately NOT renamed. The old
hello@socratesmuse.com contact email WAS replaced July 12 2026 — every
user-facing contact/mailto (Get in touch, share your feedback, Contact,
Privacy/Terms/Help pages, School-District pricing) now uses
socratesiqed@gmail.com, the official account. **Domain: socratesiq.com** — bought via Netlify July 4 2026, set
as primary (www redirects to apex), DNS/HTTPS were still propagating at
purchase. Supabase auth updated: Site URL = https://socratesiq.com, redirect
list has BOTH https://socratesiq.com/** and the old netlify.app/** entry.

SocratesIQ helps teachers redesign assignments so AI
can't do the work for students. Teacher pastes/uploads an assignment → gets a
0–100 "resilience" score, an AI-failure breakdown, and Bronze/Silver/Gold
redesigns (steered by three AI strategies) → optionally revises them via a
chat box → aligns to uploaded SCOS standards → generates a CCSS-template
lesson plan + student-facing directions, all downloadable as PDF/Word/Google
Doc. Applying a redesign and re-analyzing shows a before→after score jump.

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
  `pdf.ts` (bundled pdf.js worker — do NOT use CDN workerSrc), `google.ts`
  (client-side Google Drive: Picker import + create-Google-Doc export,
  drive.file scope, NO backend functions — see "Google Drive integration")

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

- `main` = the live site.
- `feature/scos-lesson-plan` = SCOS standards + lesson plan + student
  directions pipeline. **MERGED INTO main on July 4 2026** at Will's explicit
  request ("publish straight to live now"), overriding the earlier hold.
  TESTED: Will ran 3 assignments end-to-end through the deploy preview before
  publishing — all completed with no timeouts. Frontend build + generate.ts
  esbuild bundle both passed pre-merge; needs `ANTHROPIC_API_KEY` only (already
  set). The old Draft PR #2 / deploy-preview-2 is now superseded.

## Hard-won technical lessons (do not regress these)

1. **Netlify functions die silently at 30s.** All model calls MUST: use
   `client.messages.stream()` + `finalMessage()` (non-streaming stalls), model
   `claude-haiku-4-5`, small max_tokens, concise-output prompts, `withTimeout`
   wrappers (26s) + SDK timeout 27s/maxRetries 0, and per-step function logs
   (`console.log("analyze v3: ...")`). Debug via Netlify → Logs & metrics →
   Functions → analyze. Structured outputs (json_schema) caused timeouts — the
   functions ask for plain JSON and parse it leniently instead.
2. **Model JSON sometimes malformed** → parse failure ("unexpected format").
   Both functions have a repairJSON pass — keep it when editing. Hardened
   July 4 2026 to also escape STRAY INNER DOUBLE-QUOTES (a quote only closes a
   string if the next non-space char is a structural delimiter `, } ] :`),
   plus prompts now tell the model to avoid `"` inside string values. This was
   the cause of a live lesson-plan "unexpected format" failure.
3. **pdf.js worker must come from the bundle** (`src/lib/pdf.ts`, Vite `?url`
   import). CDN workerSrc 404s (v4 ships .mjs). All three uploaders
   (FileUploader, AdminResearch, StandardsManager) import from pdf.ts.
4. Analysis quality was deliberately traded down (Haiku, ~short outputs) to
   fit the timeout. "Quality tuning" is a parked task — any attempt must be
   tested against the 30s ceiling on a deploy preview first.
4b. **"Analysis service is busy" = HTTP 429 rate limit.** The parallel split
   (below) doubled the per-analysis request AND token rate against the Anthropic
   tier (the full system prompt — research base + catalog — is sent in BOTH
   halves), so back-to-back analyses trip a low tier's per-minute limit.
   gemini.ts `call()` retries 429/502/503/529 with backoff (1.2s, 2.8s), but a
   per-MINUTE limit needs ~60s to clear, so retries alone don't fully fix it.
   REAL FIX: raise the Anthropic account tier (console.anthropic.com → Plans &
   Billing → add credits / auto-reload bumps the tier). Optional code
   mitigation: trim each half's system prompt to only the parts it needs
   (diagnosis doesn't need the full redesign catalog; redesigns don't need all
   scoring guidance) to cut ~40% of input tokens. Not yet done.
   July 12 2026 — ROOT CAUSE CONFIRMED from Netlify logs: `Analysis failed:
   This request would exceed your organization's rate limit of 10,000 input
   tokens per minute (model: claude-haiku-4-5)`. That's Anthropic TIER 1 —
   one analysis (two halves × full system prompt) nearly fills the minute.
   It is NOT Netlify throttling. REAL FIX: Will is bumping the org to Tier 2
   (console.anthropic.com → Plans & Billing → bring total deposits to $40).
   CODE MITIGATIONS SHIPPED July 12 2026: (a) standards.ts callGenerate now
   retries 429/502/503/529 (backoff 2s/6s/15s); (b) gemini.ts analyze backoff
   lengthened to 2s/8s/20s (per-minute window needs real waits); (c) each
   analyze half's system prompt trimmed to only what it needs — diagnosis
   drops the strategy catalog + permission categories (gets a compact A-G
   index for fix mapping), redesigns drop scoring guidance (~40% fewer input
   tokens/half); (d) uploaded research capped 4000 chars/paper, 8000 total
   (was UNCAPPED at 8000/paper — a growing research library would silently
   re-break the token budget).
   ALSO SPOTTED July 12 2026: five `analyze v3: JSON parse failed` errors in
   ~3 minutes of live logs (shows as "unexpected format" to the teacher, and
   the retry-clicks worsen the rate limit). Parse failures now log part,
   length, stop_reason, and a head/tail snippet of the raw model output —
   NEXT TIME IT HAPPENS read that log line; if stop=max_tokens it's
   truncation (raise that half's max_tokens or tighten length targets),
   otherwise inspect the snippet for a new malformation to teach repairJSON.
   MITIGATIONS DONE July 4 2026: client retries transient statuses (above);
   analyzer system prompt is prompt-CACHED (ephemeral) so re-analyses reuse the
   big research-base prefix at ~0.1x. STATUS (checked July 11): Netlify function
   logs showed analyses SUCCEEDING cleanly (~10-14s each, NO `Analysis failed`
   line, no 429 captured), so the "busy" is INTERMITTENT, not constant, and was
   NOT reproducing. NOTE: the two parallel halves start ~6s apart in the logs,
   hinting the bottleneck may be NETLIFY function concurrency/cold-start rather
   than an Anthropic rate limit — a tier bump might NOT be the fix. UNRESOLVED
   but parked: Will is monitoring over the next few days and will revisit ONLY
   if it recurs. IF IT RETURNS: reproduce the "busy" error, then check Netlify →
   Logs → Functions → analyze at that timestamp — an `Analysis failed: <detail>`
   line = Anthropic (read the detail for the exact limit); NO log line for that
   click = Netlify throttling the invocation (different fix, e.g. make the two
   analyze halves sequential or upgrade the Netlify plan).
4c. **Progress bar never showed on first analysis (FIXED July 4 2026).** The
   render checked `!result` before `isAnalyzing`, so during the first analysis
   (result still null) it kept showing the input form with an "Analyzing..."
   button and never reached the StreamingProgress branch. Reordered so
   `isAnalyzing` wins first. StreamingProgress now also trickles the % upward.
   Redesigns max_tokens tuned 2400→1800 and length targets trimmed to cut the
   ~23s time back toward ~15s while keeping the concreteness quality bar.
5. **Analyze is SPLIT into two parallel calls (July 4 2026):** the client
   (gemini.ts) fires `part: "diagnosis"` (score/summary/failures/dimensions,
   max_tokens 1100) and `part: "redesigns"` (three suggestions, max_tokens
   1700) simultaneously and merges them. This halved wall time (~25s → ~13s)
   and fixed timeouts on page-long assignments (incl. re-analyzing redesigns,
   which are longer than what teachers first paste). No `part` = full response
   (backward compat). Keep BOTH halves small when editing prompts.
6. **"Analyze twice" bug (fixed):** applyVersion's toast action called
   handleAnalyze() which read stale React state — first click re-analyzed the
   OLD text. handleAnalyze now takes an optional overrideText; keep that
   pattern for any analyze-right-after-setText flow.
7. **Lesson plan is template-locked to the SocratesIQ CCSS-aligned template**
   (Will's CORRECTED SocratesIQ_Lesson_Plan.docx, July 12 2026 — it replaced
   both the July-4 Section I-VI template AND the first SCOE variant he
   uploaded the same day; the first variant had a "Student-Friendly
   Translation" column, the corrected one has a narrow blank "Notes" column
   instead, and NO student translations are generated). Structure:
   Subject(s)/Grade/Teacher/School header (Teacher/School stay blank), a
   two-column table (LESSON ELEMENT 9582 dxa | Notes 1208 dxa — Notes stays
   EMPTY), eight elements (Standards, Targets, Relevance, Assessment
   Criteria, Activities/Tasks incl. the AI-permission rules, Resources,
   Access for All, Modifications), then "Common Core Aligned Lesson:
   Reflection" (UPDATED later July 12: AI answers the shifts question AND
   picks ONE post-teaching question from the list, answering it in
   ANTICIPATED terms; the full question list still renders verbatim).
   HEADER AUTOFILL (July 12 2026, Will's decisions): Subject(s)/Grade/
   Teacher(s)/School are stamped CLIENT-SIDE from the teacher's profile
   (name, schoolName, joined subjects/gradeLevels — list-all when multiple);
   name/school are NEVER sent to the model; empty profile fields stay as
   blank ________ lines. See SCOE_LESSON_PLAN_TEMPLATE in
   _shared/research-base.ts, the JSON spec in generate.ts, the LessonPlan
   type in standards.ts, and exportLessonPlanDocx/exportLessonPlanToGoogle
   in export.ts (Word clones the .docx exactly; PDF is linear). The old
   Section I-VI template is RETIRED but kept in research-base.ts
   (LESSON_PLAN_TEMPLATE) for restorability. Do not loosen the template lock.

## Product decisions already made (don't relitigate)

- **Positioning sharpen (July 13 2026, from a CPO-style review Will shared):**
  hero is now "Transform Yesterday's Assignments into Tomorrow's Learning" +
  "Wisdom in the Age of Artificial Intelligence" tagline + "Curriculum
  Transformation Platform" badge; the three homepage steps are Analyze /
  Transform / Teach under "Your curriculum already has value — we strengthen
  it"; the score is branded "AI Resilience Score(TM)" (pursue real trademark
  via attorney — parked); the saved-work area is "Curriculum Library"; a
  teacher-trust block ("Your expertise comes first… built by a teacher, not a
  tech company") sits under the steps. Category to own: Curriculum
  Transformation Platform. Full rationale in the Positioning & Messaging Guide
  doc. DECISION STILL OPEN: "AI-Free Learning" (shipped, clearer) vs the CPO's
  warmer "Human-Centered Learning".
- **Before/after score moment (July 13 2026):** applying a redesign stashes
  the original analysis (previousResult); re-analyzing shows a "Your
  Transformation" card at the top of results — Original → Redesigned scores,
  the +delta, and a "What Improved" chip row derived from which dimensions
  actually rose. Cleared on New Assignment or manual textarea edits.
- **Competitive note:** Anthropic launched free "Claude for Teachers" (a
  lesson GENERATOR, auto-aligned to all 50 states) July 14 2026. SocratesIQ's
  wedge is the opposite job — TRANSFORMING existing assignments, with the AI
  Resilience Score as the diagnosis they don't offer. Lean into
  transformation + teacher-built credibility; don't try to out-generate them.

- **AI strategy names (July 12 2026, from the ChatGPT SaaS-strategy doc Will
  shared):** display labels are now "AI-Free Learning" / "AI-Assisted
  Learning" / "AI-Integrated Learning" (picker, results badge, Settings chips,
  Help page). The internal keys 'avoid'/'augment'/'embrace' are UNCHANGED
  everywhere (state, API, prompts, share links) — only labels changed.
- **"Revise" box on each redesign (July 12 2026):** under every Bronze/
  Silver/Gold version, "Anything you'd like to change before the lesson
  plan?" + input → generate.ts mode "refine" (small Haiku call, revises just
  that assignment per the teacher's request, plain-text output). The revision
  lands in editedTexts so it flows into the display box, Copy, downloads,
  lesson plan, and re-analysis. Deliberately NOT metered as a separate
  "transformation" (per the credit-model decision: 1 credit = 1 complete
  transformation; refining is free polish). The display box now always shows
  editedTexts[i] ?? original, with an "edited" note when revised.

- Pricing: Teacher $9.99/mo or $99.99/yr only; School/District = "Call for
  pricing" → mailto socratesiqed@gmail.com (changed from hello@socratesmuse.com
  July 12 2026). No payment processing exists yet — "Get started" is a stub.
- **AI choice collapsed 6 → 3 (July 13 2026, Will's decision):** the six AI
  permission categories are GONE from the UI. The teacher's ONE choice at the
  start — the three strategies (AI-Free / AI-Assisted / AI-Integrated, keys
  avoid/augment/embrace) — now drives EVERYTHING: analysis, redesigns, the
  lesson plan's AI guidance, and the student directions' AI rules. Each
  strategy carries a rich rule definition in AI_STRATEGY_RULES (standards.ts);
  generateLessonPlan/generateStudentDirections take the strategy key and pass
  that rule text to generate.ts (which still receives it in its
  `permissionCategory` field — unchanged server-side). LessonPlanPanel shows
  the chosen strategy READ-ONLY (no picker); to change it the teacher re-picks
  at the top and re-analyzes. The old six categories (PermissionCategory /
  PERMISSION_CATEGORIES) are kept dormant in standards.ts for restorability.
- **Analyze auto-scrolls to top (July 13 2026):** handleAnalyze does
  window.scrollTo top so the progress screen is visible instead of leaving the
  viewport mid-page where the Analyze button was clicked.
- **HIDDEN from all users (Will, July 12 2026):** the Microsoft login button
  (LoginDialog.tsx — commented out; Azure was never enabled so it only errored),
  and the Admin dashboard + Research Library menu items (App.tsx — the
  onViewAdmin/onViewDashboard props to UserMenu are commented out; restore the
  props to bring the Admin section back). All three are hidden, not deleted.
  NOTE: with the Research Library hidden, new research goes into
  _shared/research-base.ts via chat (see Working conventions) — e.g. the
  Kharbach (2026) critical-thinking activities guide was distilled into
  RESEARCH_NOTES + STRATEGY_CATALOG category E on July 12 2026.
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
- **Google Drive integration (built July 12 2026, client-side, no backend):**
  see the dedicated section below. Import from Drive + export to Google Docs,
  plus Word/PDF downloads for redesigns, lesson plans, and student directions.
- **Social login (Google + Microsoft):** "Continue with Google/Microsoft"
  buttons are LIVE on the login dialog (`LoginDialog.tsx`), backed by Supabase
  `signInWithOAuth` (`signInWithProvider` in `supabase.ts`, provider `google` /
  `azure`). Login only; no Drive access. The existing `onAuthStateChange`
  listener completes the session on redirect back (redirectTo =
  window.location.origin).
  - **GOOGLE = DONE & TESTED LIVE (July 4 2026).** Provider enabled in Supabase
    with real Client ID/Secret; verified end-to-end (Will logged in with Google
    on the live site).
  - **MICROSOFT = BLOCKED (July 4 2026), parked.** Button is live but the Azure
    provider is NOT enabled in Supabase. Will created a personal Microsoft
    account (logs in via `socratesaiedu@gmail.com`, uses a PASSKEY, no
    password). Could NOT reach the Azure portal to register the app: every
    sign-in to portal.azure.com / entra.microsoft.com returned tenant errors
    (`AADSTS16000` / `50058` — "account from identity provider live.com does
    not exist in tenant 'Microsoft Services'"). ROOT CAUSE: a brand-new
    consumer Microsoft account has no Azure AD / Entra tenant ("Default
    Directory") provisioned yet — common in the first ~hour, sometimes never
    auto-creates. RESUME PLAN: wait, then in a NORMAL (non-incognito, non-Edge)
    window sign in fresh at entra.microsoft.com; if a directory now exists,
    go to App registrations → New registration and follow "Social login setup"
    step 2. If it STILL errors, the account may need a directory created
    manually (Entra ID → Manage tenants → Create) or a different owner account.
    The passkey is fine — not the cause. Google login already covers most
    teachers, so this is low priority.
- Standards (SCOS) upload appears in: onboarding profile step, Settings
  dialog, and the post-analysis results card (where the doc is SELECTED for
  alignment). Requires login + Supabase.
- **Password reset (added July 4 2026):** "Forgot password?" on the login
  dialog → `requestPasswordReset` (redirectTo = window.location.origin) →
  Supabase emails a link → returning visit fires the PASSWORD_RECOVERY auth
  event (surfaced via onAuthStateChange's second arg) → App shows
  `ResetPasswordDialog` → `updatePassword`. Uses Supabase's BUILT-IN mailer
  (generic sender, low hourly rate limit — don't mass-test; custom SMTP on
  @socratesiq.com is a later task). Google-only users have no password; the
  sent-confirmation copy points them back to the Google button.

## ⭐ OFFICIAL GOOGLE ACCOUNT (decided July 12 2026)

**SocratesIQEd@gmail.com is THE official Google account for everything**
(Google Cloud, Drive integration, and eventually all Google login OAuth).
Will's explicit decision. The OLD account `socratesaiedu@gmail.com` — which
owns the original "Socrates" Cloud project and the "Socrates Web" OAuth
client that Google login currently runs through — is DEPRECATED; do not add
anything new there. CAUTION: the two addresses look nearly identical
("socratesIQED" vs "socratesAIEDU") — double-check which one is signed in
before any dashboard work. Migration plan: build everything fresh in
SocratesIQEd's Cloud project (consent screen, new OAuth client with the
Supabase callback, Drive + Picker APIs, API key), swap the new Client
ID/Secret into Supabase's Google provider, verify login on the live site,
then the old account can be abandoned. Status: **MIGRATION DONE July 12
2026.** In SocratesIQEd's project ("My First Project", ID
lateral-origin-502217-c2, project NUMBER 594395270830): Drive + Picker APIs
enabled; consent screen configured (app "SocratesIQ", External); OAuth
client "SocratesIQ Web" created (Client ID
594395270830-1bm1abjtec2mrnt70gkd5hhjev45a2jq.apps.googleusercontent.com)
with both site origins + the Supabase callback redirect; Supabase Google
provider swapped to the new Client ID/Secret and login TESTED WORKING on the
live site; restricted Picker API key created; all three VITE_GOOGLE_* env
vars set in Netlify (API key saved "without marking as secret" — Netlify's
secret handling would block it from the client bundle where it belongs).
The old socratesaiedu OAuth client is now unused. Remaining: none for setup —
the Drive feature just needs the code merged to main + deploy.

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
- The Drive feature (shipped July 12 2026) uses the SAME Cloud project and
  OAuth client as Google login — it only adds the non-sensitive `drive.file`
  scope, which does NOT trigger Google verification. As of July 12 2026 that
  project is being migrated to SocratesIQEd@gmail.com (see the OFFICIAL
  GOOGLE ACCOUNT section above); the socratesaiedu "Socrates" project is
  deprecated. Setup steps: "Google Drive integration" section.

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

## Google Drive integration (built July 12 2026) — how it works

**Decision (Will's):** use Google's own Picker with the `drive.file` scope —
per-file access only, which is a NON-SENSITIVE scope, so NO Google app
verification/review is needed. The fancier in-app Drive file list (needs
`drive.readonly`, a sensitive scope + formal review) was deliberately NOT
chosen; its UI is kept unused in `GoogleDriveBrowser.tsx` for a possible
future upgrade. This choice is reversible later.

**Architecture: 100% client-side.** No Netlify functions, no token storage.
`src/lib/google.ts` lazy-loads Google Identity Services + the Picker script,
gets a popup OAuth token (cached in memory ~55 min), and calls the Drive REST
API directly from the browser:
- IMPORT: `GoogleDrivePicker.tsx` ("Select from Google Drive" on the input
  screen) → Picker → reads Google Docs (export text/plain) or PDF/DOCX/TXT
  stored in Drive (alt=media + the same pdf.js/mammoth parsing FileUploader uses).
- EXPORT ("Save as Google Doc"): multipart upload of HTML with
  mimeType application/vnd.google-apps.document — Drive converts HTML → Doc.
  Available for the full analysis report, each Bronze/Silver/Gold redesign
  ("Download this version" row, includes inline edits), and the lesson plan +
  student directions (buttons next to "Copy all" in LessonPlanPanel).
- Word/PDF downloads for redesigns/lesson plan/directions are pure client-side
  (generic `DocBlock` exporters in `export.ts`) and work with NO Google setup.
- The stale `/api/google/*` redirects in netlify.toml and the old 5-function
  backend plan are OBSOLETE for this feature (only relevant if the
  GoogleDriveBrowser upgrade ever happens).

**ALL Google buttons are hidden until env vars exist** (`googleConfigured`
in google.ts). Will's one-time dashboard steps — ALL in the NEW official
account **SocratesIQEd@gmail.com**, project "My First Project"
(lateral-origin-502217-c2); walk him through one at a time; VITE_ vars bake
at build → trigger deploy after:
1. APIs & Services → Library → enable **Google Drive API** and **Google
   Picker API**. DONE July 12 2026 (they were enabled in this account).
2. Google Auth Platform: configure the consent screen (app name SocratesIQ,
   support email, Audience External → Publish), then Clients → create a Web
   application client. Authorized JavaScript origins:
   `https://socratesiq.com` and
   `https://brilliant-mandazi-3937f4.netlify.app` (add a deploy-preview
   origin temporarily when testing on a preview). Authorized redirect URI:
   `https://llvtiuhtjpprtwlvnauu.supabase.co/auth/v1/callback` (so this SAME
   client also serves Google login). Copy Client ID + Secret.
3. Supabase → Authentication → Providers → Google → replace Client ID +
   Secret with the new ones, Save (re-open to confirm it stuck — see
   gotchas). Then TEST Google login on the live site.
4. Credentials → Create credentials → **API key** → restrict it: Application
   restrictions = Websites (same origins), API restrictions = Picker API.
5. Cloud console home → note the **project NUMBER** (not name/ID).
6. Netlify (brilliant-mandazi) → Environment variables, all contexts:
   `VITE_GOOGLE_CLIENT_ID` (from 2), `VITE_GOOGLE_API_KEY` (from 4),
   `VITE_GOOGLE_APP_ID` (project number from 5) → Trigger deploy.
Privacy page + Help page already describe the feature accurately.

- **Help page (added July 4 2026):** searchable in-app Help & How-To
  (`HelpPage` in StaticPages.tsx, viewMode 'help', first footer link). Covers
  all features incl. strategies, lesson plans, password reset, troubleshooting.
  DECISION: a support CHATBOT was considered and deliberately DEFERRED until
  real support volume exists — the Help page content is written to become the
  bot's knowledge base later. Keep the Help page updated when features change.

## Usage analytics / investor metrics (Phase 1 built July 13 2026)

Goal: track users, usage, tokens, and cost for investor metrics — "behind the
scenes," no app UI (Will's requirement). Data lives in Supabase; Will reads it
via his existing Supabase console. Metadata ONLY — no assignment/lesson/student
content is ever logged.

BUILT (code shipped):
- `supabase/migration-usage.sql` — `usage_events` table (one row per AI call or
  download): id, created_at, user_id, anon_id, event_type
  (analyze/align/lesson_plan/directions/refine/download), request_group, model,
  input/output/cache tokens, cost_usd, ai_strategy, subject, grade_level,
  duration_ms, status, error_detail, download_format. RLS = INSERT-only for
  anon/authenticated, NO select (so the API keys can't read it; Will reads via
  the console/service role which bypasses RLS).
- `netlify/functions/_shared/usage.ts` — best-effort `logUsage()` (2.5s cap, all
  errors swallowed, never blocks a request) + Haiku 4.5 pricing constants
  (input $1.00 / output $5.00 per 1M; cache read 0.1x, cache write 1.25x).
  `usageFromResponse()` reads Claude's `usage` object (incl. cache tokens).
- analyze.ts logs each half (success/parse-fail/error) with response.usage +
  request_group + user_id + anon_id + strategy/subject/grade. generate.ts logs
  each mode (align/lesson_plan/directions/refine) via logGen().
- Client: gemini.ts sends user_id/anon_id/request_group; standards.ts
  setUsageUserId()+anon_id on every generate call (AssignmentAnalyzer sets the
  user id in an effect); download events logged client-side via
  supabase.ts logClientUsage() (RLS insert policy allows it). anon_id stored in
  localStorage 'siq_anon_id'.
- `supabase/views-metrics.sql` — Phase 2 read views (open in Supabase Table
  Editor): metrics_overview (headline KPIs), metrics_growth (weekly),
  metrics_unit_economics (cost + implied margin at $9.99), metrics_by_user
  (retention), metrics_by_subject. Real cost check: a full transformation
  (~4 calls) ≈ $0.04 → ~99% margin on one $9.99, ~92% at 20/month.

WILL'S DASHBOARD STEPS (not yet done — walk him through):
1. Supabase → SQL Editor → paste + run `supabase/migration-usage.sql` (creates
   the table). Then paste + run `supabase/views-metrics.sql` (creates the views).
2. Trigger a Netlify deploy so the logging code goes live. Data starts
   accumulating immediately. To view: Supabase → Table Editor → open a
   `metrics_*` view.
NOTE: no new env var needed — the functions log with the existing anon key
(RLS insert policy). START LOGGING ASAP — history can't be backfilled.
OPEN QUESTIONS for Will: (a) also want a weekly EMAIL digest (push, zero login)?
(b) any field changes? Phase 3 (retention cohorts, CSV export, optional PostHog)
is future work.

## Parked tasks (Will's backlog, roughly by priority)

0. **Redesign version history in the "Revise" box (requested July 13 2026).**
   Today the Revise box under each redesign OVERWRITES the current version
   (handleRefine sets editedTexts[i]); no history, no compare, no undo. Build:
   keep a running list of versions per redesign (Original → Rev 1 → Rev 2…),
   each Revise ADDS a version instead of overwriting; teacher clicks chips (or
   a dropdown) to view/compare/revert; the selected version flows into
   downloads + lesson plan + re-analysis. All in-browser for the session,
   nothing extra stored. Moderate front-end change. Will leaned chips for the
   first few versions. Also enables "give me two different takes" comparisons.

1. SCOS → lesson plan flow: tested 3x on preview (no timeouts) and published
   live July 4 2026. Optional: one confirmation run on the LIVE site after the
   Netlify deploy, just to be sure the production build behaves like preview.
2. Trigger deploy of main — DONE July 4 2026 (shipped the pending pricing/
   testimonials/feedback/profile batch + Google login). Re-do after future
   main pushes; auto-deploy still doesn't fire.
3. ~~Rotate the Anthropic API key~~ DONE July 12 2026: new key
   `socratesiq-netlify-july2026` created, swapped into Netlify, deploy
   confirmed working live; old (leaked) key deleted. Same day Will bumped
   Anthropic deposits to $40 → Tier 2 (10x the 10k input-tokens/min limit
   that caused the live "busy" errors).
4. Quality tuning of analyzer output — FIRST PASS DONE July 4 2026: the
   redesign prompt now enforces a "quality bar" (concrete mechanics + timing +
   exact deliverable, class-grounded self-sourced evidence, subject/grade fit,
   preserve original topic; Bronze ~3-5 / Silver ~5-8 / Gold ~6-10 sentences),
   redesigns max_tokens raised to 2400 (separate parallel call, timeout-safe).
   NEXT lever if more quality wanted: move the redesigns half to Sonnet 5
   (~5¢/analysis vs ~2¢ on Haiku — still trivial vs $9.99/mo). See lesson #5.
5. Unlink the stale `musesocrates` Netlify site.
6. Custom domain (he wanted "socrates.ai.com" — explained invalid; choose
   socrates.ai (~$70-100/yr) vs socratesai.com (~$12/yr); not decided).
7. Payments (Stripe) when ready to charge; ToS page exists but needs lawyer
   review before charging.
8. Admin password is a soft gate (VITE_ADMIN_PASSWORD, default socrates2025,
   visible in bundle — known limitation).
9. Four-role buyer review exercise (teacher/principal/head/acquirer) was
   paused at the Principal's questions.
10. ~~Google Drive/Docs backend~~ SUPERSEDED July 12 2026: Drive import +
    Google Doc export shipped client-side with the Picker (`drive.file`, no
    verification needed) — see "Google Drive integration" section. Remaining:
    Will's Google Cloud/Netlify dashboard steps (listed there), then test on
    a deploy preview. The old five-function backend plan only returns if the
    in-app Drive browsing upgrade (GoogleDriveBrowser.tsx + drive.readonly +
    Google verification) is ever wanted.
11b. Enable MICROSOFT (Azure) social login — DEPRIORITIZED July 12 2026: the
    button is now HIDDEN (Will's call) and Google login covers most teachers.
    If revived: un-comment the button in LoginDialog.tsx, then follow "Social
    login setup" step 2 — but note the official account is now SocratesIQEd
    (the old socratesaiedu Microsoft/Azure attempts are moot).
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
