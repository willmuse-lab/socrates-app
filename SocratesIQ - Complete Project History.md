# SocratesIQ — Complete Project History

**What this document is:** one consolidated record of everything that has been
done on SocratesIQ across every working session (July 3 – August 26, 2026),
pulled together from all of the previous session handoff documents
(`HANDOFF.md` → `SocratesIQ 2/3/4.md`) and the full commit history. It is a
reference of work completed, decisions made, and what is still open. For the
live, forward-looking "read this before you continue" instructions, the
highest-numbered `SocratesIQ N.md` in the repo root remains the working
handoff; this file is the cumulative history behind it.

_Compiled August 26, 2026._

---

## 1. What SocratesIQ is

SocratesIQ helps teachers **redesign assignments so AI can't do the work for
students.** A teacher pastes or uploads an assignment and gets:

- a **0–100 "AI Resilience Score"** with an AI-failure breakdown (where the
  current assignment is easy to hand to AI),
- **three tiered redesigns** — **Quick Fix / Rebuild / Reinvent** (internally
  still Bronze/Silver/Gold) — steered by one of three AI strategies,
- a **"Revise" box** to tweak any redesign in plain language,
- **alignment** to the teacher's uploaded standards (SCOS),
- a **CCSS-aligned lesson plan** plus **student-facing directions**,
- **downloads** as PDF, Word, or Google Doc, and
- a **before → after score jump** when a redesign is applied and re-analyzed.

**Owner:** Will Muse (willmuse@greensboroday.org) — a teacher, not a developer.
Everything dashboard-related is walked through step by step, one action at a
time. **Live at [socratesiq.com](https://socratesiq.com).**

**Naming history:** the product was originally "Socrates / Socrates Studio"
(socratesmuse.com brand), renamed to **SocratesIQ** on July 4, 2026. The
domain **socratesiq.com** was bought via Netlify on July 4, 2026 and set as
primary. Internal code identifiers, localStorage keys, and the model persona
("You are Socrates") were deliberately NOT renamed.

---

## 2. Timeline — every session, in order

### July 3, 2026 — first handoff written
The project's first session handoff document was created, capturing the app as
it then stood: the analyzer (score + Bronze/Silver/Gold redesigns) live, the
SCOS standards + lesson-plan pipeline on a feature branch (Draft PR #2, not yet
merged), and the core deployment facts and technical lessons.

### July 4, 2026 — rename, domain, lesson-plan pipeline goes live
- **Rebranded to SocratesIQ** across all visible UI, tab title, and export
  headers. Bought **socratesiq.com** and set it primary (www → apex redirect);
  updated Supabase auth Site URL and redirect list.
- **Merged the SCOS lesson-plan pipeline to `main`** (`feature/scos-lesson-plan`)
  at Will's explicit request — tested end-to-end 3× on the deploy preview with
  no timeouts before publishing.
- **Made the AI-strategy choice actually steer the three redesigns.**
- **Hardened JSON repair against stray inner double-quotes** (fixed a live
  lesson-plan "unexpected format" failure).
- **Google login shipped and tested live**; **Microsoft (Azure) login parked**
  — a brand-new consumer Microsoft account had no Entra/Azure AD tenant, so the
  app couldn't be registered (tenant errors AADSTS16000 / 50058).
- **Password reset flow**, **searchable in-app Help page**, and **prompt
  caching** on the analyzer system prompt were added around this window.

### July 10–11, 2026 — reliability, speed, and the "busy" errors
- **Rebranded visible UI to SocratesIQ**, added **self-service password reset**
  and the **Help & How-To page**.
- **Halved analysis time**, fixed page-long-assignment timeouts and stale
  re-analyze, and **locked the lesson plan to the school template.**
- **Split analyze into two parallel calls** (diagnosis + redesigns) to cut wall
  time (~25s → ~13s).
- **Raised redesign quality** (concrete, class-grounded, grade-fit rewrites)
  and added a **continuously climbing progress bar**; fixed the progress screen
  never showing on the first analysis.
- **Diagnosed intermittent "Analysis service is busy" errors** as Anthropic
  rate-limiting (HTTP 429); added retry/backoff. Parked for monitoring.

### July 12, 2026 — Google Drive, template correction, hides, account migration
- **Google Drive integration shipped** (client-side, `drive.file` scope, no
  backend, no Google verification needed): import from Drive via the Picker, and
  export the report / each redesign / the lesson plan / directions to Google
  Docs, plus Word/PDF downloads everywhere.
- **Replaced the lesson plan with the SCOE/SocratesIQ CCSS-aligned template**;
  Word export clones the .docx layout exactly. Then **corrected the template**
  (narrow blank "Notes" column, no student-translation column) and **autofilled
  the header from the teacher's profile.**
- **Rotated the leaked Anthropic API key** and **bumped the Anthropic org to
  Tier 2** (deposits to $40) to clear the 10k-input-tokens/min limit that caused
  the "busy" errors. **Cut analyze token load ~40%.**
- **Hid the Admin dashboard, Research Library, and Microsoft login** from all
  users (kept in code, not deleted).
- **Migrated the official Google account** to SocratesIQEd@gmail.com and rebuilt
  the Cloud project / OAuth client / Drive setup there (this account was later
  suspended — see Aug 23).
- Added the **Kharbach (2026) critical-thinking activities** to the research base.

### July 13–16, 2026 — positioning, strategies, before/after, collapse to 3
- **Sharpened positioning:** "Transform Yesterday's Assignments into Tomorrow's
  Learning," the **AI Resilience Score**, and the **Curriculum Library** naming.
  (The trademark symbol on the score was removed for now.)
- **Renamed the AI strategies** to AI-Free / AI-Assisted / AI-Integrated
  Learning (display only; internal keys avoid/augment/embrace unchanged) and
  added a **"Revise" box** on each redesign.
- **Added the before/after "Your Transformation" score moment** on re-analysis,
  and included it in report downloads.
- **Collapsed the six AI-permission categories into the three strategies**
  (one choice now drives analysis, redesigns, lesson plan, and student
  directions); analyze now **auto-scrolls to top.**
- **Backlogged** redesign version history in the Revise box.

### July 19–20, 2026 — analytics and paid credits
- **Phase 1 usage analytics** shipped: a `usage_events` table (metadata only,
  no assignment content), a best-effort `logUsage()` helper with Haiku pricing
  constants, and five `metrics_*` views for investor metrics — all read via the
  Supabase console, no in-app UI.
- **Monthly assignment credits** shipped: tamper-proof counter (SECURITY
  DEFINER RPCs), **3 free trial → wall**, **20/month paid**, and an
  **"unlimited" comp plan** granted by email via one SQL line.

### July 21–25, 2026 — legal notices, saved reports, security, launch prep (PRs #3–#9)
- **Legal notices:** non-endorsement disclaimer (About/Scoring) and a FERPA "no
  student data" note under the analyzer inputs.
- **Saved assignment reports:** a saved library item is now a full snapshot that
  **opens read-only** (report + lesson plan + directions + downloads) instead of
  dumping text back into the analyzer.
- **Analyze reliability lesson learned:** structured outputs (JSON schema) were
  tried to kill parse failures but **truncated the JSON on every call** — they
  were **removed** and the known-good free-text + repair path restored. _Do not
  re-add structured outputs_ without the guardrails documented in the handoff.
- **Security hardened:** metrics views set to `security_invoker` and revoked
  from the API (console-only); credit functions given pinned `search_path` and
  execute restricted to authenticated users. Supabase advisor CRITICALs cleared.
- **Pricing copy fixed** ("$9.99 = 20 assignment redesigns a month") and
  **teacher profile persisted to the account** so onboarding runs once (was
  localStorage-only, which Safari/iOS evicted after ~7 days).
- Merged as PRs #3–#9. The full teacher journey now works in production.

### August 6–9, 2026 — brand refresh (PR #10 + #13 + #14)
The marketing team said the old UI "looked too AI." A full editorial reskin was
built and merged:
- **New palette** (warm paper + deep navy + slate blue), corner-glow gradients
  removed, all headings flipped italic → upright, navy pill buttons, editorial
  `.eyebrow` labels and dark accent bands.
- **Font switched to Sora** (brand kit) across the whole UI.
- **New owl brand logo** (`public/logo.png`) and an owl-only nav mark.
- **Public landing page** — logged-out visitors now see a real marketing
  homepage instead of a forced login; login gates only the tool. This unblocked
  the marketing team, who could not previously get past sign-in.
- **Em-dash cleanup** (~100 across 17 files — em dashes read as an "AI tell").
- **Redesign tiers renamed** Bronze/Silver/Gold → Quick Fix / Rebuild / Reinvent
  (display only), **student time woven into each redesign**, **draft autosave**
  in the analyzer, the **cloud/local sync pill hidden**, and **inner pages
  polished** to the landing's editorial layout.
- **"Welcome Back" bug fixed** — the auth dialog now opens on the right form so
  a first-time/incognito visitor is greeted as a new user, not a returning one.
- **Removed the old-branding owl fly-in splash video** (#13).
- **Fixed the dead contact email across the site** (#14).

### August 23, 2026 — LAUNCHED + Google account rebuilt
- **The brand refresh went LIVE on socratesiq.com** (Netlify deploy triggered).
- **⚠️ The SocratesIQEd@gmail.com account was SUSPENDED by Google** for
  "suspicious activity," which broke Google sign-in and Drive site-wide
  ("Error 401: disabled_client"). The **entire Google integration was rebuilt
  from scratch** on Will's business Workspace account **will@socratesiq.com**
  (see §6 for the current, correct setup).
- **New contact emails** live: **support@socratesiq.com** (Help page) and
  **hello@socratesiq.com** (everywhere else), both forwarding to
  will@socratesiq.com.
- Handoff renamed to `SocratesIQ 3.md`.

### August 26, 2026 — post-launch copy tweaks + marketing rundown (PR #16)
- **Research wording softened to "informed by"** everywhere (was "grounded in /
  built on / research-based"), per a rights/usage consultation.
- **Named research citations removed from the About page** (the 10-source chip
  list). The landing-page **Furze et al. (2024) pilot reference is intentionally
  KEPT** — framed as what the redesign approach can achieve, not what SocratesIQ
  itself did.
- **Assignment allowance lowered to 15/month (paid) and 2 free (trial)** — was
  20/3. Dollar amounts unchanged ($9.99/mo, $99.99/yr). The SQL was already run
  in Supabase, so the live DB limit is 15/2. _(Copy shows 15/2 once PR #16 is
  deployed.)_
- **Marketing rundown** produced for Will's social/marketing team (a one-page
  product + brand rundown; published as a private Claude Artifact and a
  Sora-embedded PDF).
- **Claude account email change in progress** — moving Will's Claude login to
  the business email (Anthropic can't change an account email in place, so a new
  account on will@socratesiq.com is planned). The code in GitHub is safe
  regardless.
- Handoff renamed to `SocratesIQ 4.md`.

---

## 3. Current feature inventory (what exists in the app today)

**Core analyzer**
- Paste or upload (PDF/DOCX/TXT) an assignment → **0–100 AI Resilience Score**,
  an **AI-failure breakdown**, and scored dimensions.
- **Three tiered redesigns** (Quick Fix / Rebuild / Reinvent) steered by the
  chosen AI strategy, each stating its expected student completion time.
- **"Revise" box** under each redesign for plain-language tweaks (free, not
  metered).
- **Before → after "Your Transformation" card** when a redesign is applied and
  re-analyzed.
- **Draft autosave** (localStorage) so in-progress work survives navigation.

**AI strategies (one choice drives everything)**
- **AI-Free / AI-Assisted / AI-Integrated Learning** (internal keys
  avoid/augment/embrace). Drives analysis, redesigns, lesson-plan AI guidance,
  and student-direction AI rules.

**Standards, lesson plans, directions**
- Upload **SCOS standards** (onboarding, Settings, and post-analysis results
  card) → redesigns align to them.
- **CCSS-aligned lesson plan** locked to the corrected SocratesIQ template
  (eight elements + reflection; header autofilled from the teacher's profile,
  name/school never sent to the model).
- **Student-facing directions.**

**Saving & exporting**
- **Curriculum Library** — save a full read-only snapshot (report + lesson plan
  + directions + downloads).
- **Downloads** as PDF, Word (clones the .docx layout), and **Google Doc**.
- **Google Drive import** via the Picker.

**Accounts & access**
- Email/password auth (confirm-email off), **Google sign-in** (live),
  **password reset**, and a **teacher profile** (multi-select subjects + grade
  levels) persisted to the account.
- **Public landing page** for logged-out visitors; login gates only the tool.

**Plans & metering**
- **Trial = 2 free assignments → wall**; **Paid = 15/month** ($9.99/mo or
  $99.99/yr); **Unlimited** comp accounts granted by email. One assignment =
  one new analysis; every follow-up on it (re-analysis, revisions, lesson plan,
  directions, downloads) is free.

**Behind the scenes**
- **Usage analytics** (metadata only) with five `metrics_*` views for
  investor/unit-economics reporting, read via the Supabase console.

**Hidden but kept in code:** Admin dashboard, Research Library, Microsoft login,
IEP/ELL/Gifted differentiation, and the in-app Drive browser (drive.readonly
upgrade path).

---

## 4. Architecture & technical facts

**Stack**
- React 18 + Vite + Tailwind v4 + shadcn/ui + `motion/react`.
- **Netlify functions:** `analyze.ts` (scoring/redesigns), `generate.ts`
  (align / lesson_plan / directions / refine), shared prompts in
  `_shared/research-base.ts`.
- **Supabase:** auth + tables `assignments`, `research_papers`,
  `standards_documents`, `profiles`, `user_credits`, `usage_events` (all with
  owner RLS), plus the `metrics_*` views.
- **Client libs:** `gemini.ts` (analyze client — legacy name, calls Claude),
  `standards.ts`, `supabase.ts`, `profile.ts`, `comments.ts`, `pdf.ts`
  (bundled pdf.js worker), `google.ts` (client-side Drive), `export.ts`.

**Deployment (non-obvious)**
- **Live site:** Netlify project `brilliant-mandazi-3937f4`, deploys from `main`.
- **Auto-deploy of `main` does NOT fire** — every push to main needs a manual
  **Netlify → Deploys → Trigger deploy**. PR deploy previews DO fire
  automatically.
- A **stale second Netlify site (`musesocrates`)** is also linked with no env
  vars — ignore it (parked task: unlink).

**Hard-won lessons (do not regress)**
1. **Netlify functions die silently at 30s.** All model calls use
   `messages.stream()` + `finalMessage()`, model `claude-haiku-4-5`, small
   `max_tokens`, concise prompts, `withTimeout` wrappers, and per-step logs.
2. **Model JSON is sometimes malformed** → a `repairJSON` pass handles literal
   newlines and stray inner double-quotes. Keep it.
3. **pdf.js worker must come from the bundle** (Vite `?url` import) — the CDN
   worker 404s.
4. **Analyze is split into two parallel calls** (diagnosis + redesigns) to beat
   the timeout; keep both halves small.
5. **"Analysis service is busy" = HTTP 429 rate limit.** Root cause was
   Anthropic Tier 1's 10k-input-tokens/min ceiling; real fix was the **Tier 2
   bump** plus a ~40% token trim and longer backoff. Speed is otherwise Haiku's
   own output speed — the lever is the account tier, not the prompt.
6. **DO NOT re-add structured outputs (JSON schema)** to analyze — they
   truncated the JSON and caused consistent failures. The free-text + repair
   path is the known-good one.

---

## 5. Product decisions already made (don't relitigate)

- **Tiers** are levels of *change*, not quality: Quick Fix / Rebuild / Reinvent
  (display only; internal Bronze/Silver/Gold preserved for the API contract).
- **Positioning:** "Curriculum Transformation Platform"; the wedge vs.
  Anthropic's free "Claude for Teachers" (a lesson *generator*) is
  **transforming existing assignments** with the AI Resilience Score diagnosis,
  plus teacher-built credibility.
- **Research wording is "informed by"**, no named researchers/institutions on
  the About page (rights/usage consultation); the landing-page Furze et al.
  (2024) pilot reference is intentionally kept.
- **Pricing:** Teacher $9.99/mo or $99.99/yr; School/District = "Call for
  pricing." No Stripe yet — "Get started"/the wall are informational and collect
  interest (email already captured at signup).
- **No fabricated proof** — the app's own copy is audited clean (anonymized
  testimonials, computed "Save %"). Fake stats/people ("300+ institutions,"
  "Dr. Sarah Jenkins") existed only in a marketing mockup, not the app.
- **Imagery:** product screenshots + brand graphics + honest materials shots;
  licensed stock only as honest mood; **no AI-generated people**, no fake
  classroom photos.
- **Differentiation (IEP/ELL/Gifted) hidden** since the timeout fix; code kept.
- **A support chatbot was deferred** until real support volume exists (the Help
  page is written to become its future knowledge base).

---

## 6. Accounts & infrastructure (current, correct)

**⭐ Google — current setup (rebuilt Aug 23, 2026). Do NOT use the dead
SocratesIQEd@gmail.com account.**
- **Official Google account: `will@socratesiq.com`** — a Google Workspace
  account on the socratesiq.com domain (Will is super admin / Org Admin). Google
  Cloud **organization = socratesiq.com** (org ID `951116669540`).
- **Project "SocratesIQ"** (project ID `socratesiq-505023`, project **number
  `462738908920`**), created under the org.
- **OAuth client "SocratesIQ Web"** — Client ID
  `462738908920-nu01…apps.googleusercontent.com`. JS origins: socratesiq.com +
  the main Netlify domain. Redirect URI: the Supabase auth callback. Secret
  lives in Supabase only.
- **Restricted API key** for the Google Picker API (in Netlify
  `VITE_GOOGLE_API_KEY`). Drive API + Picker API enabled.
- **Consent screen:** External, Published (In production), **unverified** —
  teachers see a one-time "Google hasn't verified this app" screen and click
  through. Formal verification is deferred.
- **Supabase** Google provider Client ID/Secret replaced with the new ones (this
  is what turned login back on — server-side, no redeploy needed). **Netlify**
  `VITE_GOOGLE_*` env vars updated (these bake at build time → the Drive half
  needed the redeploy).
- _Gotcha:_ the browser tends to default to Will's personal Google account —
  always confirm `will@socratesiq.com` is the signed-in account for any Google
  dashboard work.

**Supabase**
- Project `llvtiuhtjpprtwlvnauu`. Auth Site URL = https://socratesiq.com;
  redirect list includes both socratesiq.com/** and the netlify.app/** entry.
- Uses the built-in mailer for password reset (low rate limit; custom SMTP on
  @socratesiq.com is a later task).

**Netlify**
- Project `brilliant-mandazi-3937f4`, deploys from `main`. Env vars:
  `ANTHROPIC_API_KEY` (secret), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  and the three `VITE_GOOGLE_*` vars (not marked secret, so they reach the
  client bundle).

**Anthropic**
- Org on **Tier 2** (10× the Tier 1 input-token/min limit). API key rotated
  July 12, 2026 (old leaked key deleted). Model: `claude-haiku-4-5`.

**Migrations run in Supabase (all applied to live):** `migration-usage.sql`,
`views-metrics.sql` (+ security-hardening block), `migration-credits.sql`
(+ search_path/execute hardening; allowance later changed to 15/2),
`migration-assignment-report.sql`, `migration-profiles.sql`, plus the earlier
`reset.sql` / `schema.sql` / `migration-standards.sql`.

---

## 7. Open items & parked tasks

**Immediate (as of Aug 26, 2026)**
1. **Deploy `main` to Netlify** to push the "informed-by" wording, removed
   citations, and 15/2 copy live (and sync on-screen copy with the DB limit).
2. **Will to test EPOCH (PR #11)** on its deploy preview and decide whether to
   merge. _(PR #11 `claude/epoch-redesigns` folds the MIT Sloan EPOCH paper into
   the redesign engine additively — a "Strengthens: …" tag per redesign and one
   About citation; MIT/EPOCH never named in redesign output. Rebased on main,
   open, not yet signed off.)_
3. **Finish the Claude account move** to will@socratesiq.com (continuity note:
   the marketing rundown Artifact was published under the current account and
   won't move automatically).

**Backlog (roughly by priority)**
- **Redesign version history** in the Revise box (view/compare/revert versions).
- **Stripe payments** — the credit system it plugs into is already built; Stripe
  just needs to flip a teacher's `user_credits` row to `plan='paid'` on
  successful checkout. ToS needs lawyer review before charging.
- **Google formal app verification** to drop the "unverified app" warning
  (deferred; fine for now with non-sensitive scopes).
- **Get real beta teachers on it** (comp them unlimited) to fill investor
  metrics.
- **Unlink the stale `musesocrates` Netlify site.**
- **Custom domain / auth branding** polish (Supabase custom-domain add-on).
- **Microsoft (Azure) login** — deprioritized and hidden; Google covers most
  teachers.
- **Security follow-ups (low priority):** enable Leaked-Password Protection
  (Pro-plan feature, deferred), tighten `research_papers` RLS.
- **Admin password** is a soft gate (`VITE_ADMIN_PASSWORD`, visible in bundle —
  known limitation).
- **Quality tuning** — optional lever is moving the redesign half to Sonnet 5
  (~5¢ vs ~2¢ per analysis); must be tested against the 30s ceiling on a preview.

---

## 8. Working conventions

- Develop features on branches with a draft PR (preview auto-builds); merge to
  `main` only with Will's explicit OK. After changing `main`, merge it into open
  feature branches to keep them synced. **After any push to `main`, remind Will
  to trigger a Netlify deploy** (auto-deploy doesn't fire).
- Verify functions with `esbuild` bundling and the frontend with `npx vite
  build`. Commit messages are plain (no model IDs).
- Research sources are summarized into `_shared/research-base.ts`
  (`RESEARCH_NOTES` + `STRATEGY_CATALOG`); full-text PDFs would go through the
  (currently hidden) admin Research Library.
- Will is a teacher, not a developer: **explain step by step, one action per
  message, and wait.**
