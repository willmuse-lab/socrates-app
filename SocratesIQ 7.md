# SocratesIQ 7: Session Handoff Document

**Purpose:** Complete context for continuing work on this project in a new
session. Read this whole file before making changes. Last updated: August 29 2026.

**Naming / versioning:** this handoff is versioned by its FILENAME — `SocratesIQ 7.md`
now, and the number bumps by one on every update (next update renames it to
`SocratesIQ 8.md`, and so on). To continue in a new session, read the HIGHEST-numbered
`SocratesIQ N.md` in the repo root (or just tell the agent "read the latest SocratesIQ
handoff and continue"). The old top-level `HANDOFF.md` is RETIRED — this versioned
file replaces it; if you still see a `HANDOFF.md` on `main`, it is stale and this
`SocratesIQ N.md` wins.

## Session status (August 29 2026, evening) — PAYMENTS ARE LIVE. Two PRs merged.

**SocratesIQ now takes real money.** Stripe is wired up in **LIVE mode** (not a
sandbox), the account is activated, and the ToS lawyer review that had been
blocking revenue since July is **done** (Will confirmed). PR #18 and PR #19 are
both merged to `main`.

### Where things actually stand
- **PR #18** (`ce4b450`) — MERGED and DEPLOYED. Redesign version history, Stripe
  billing, real last-updated dates on Terms/Privacy, brand icon exports.
- **PR #19** (`4c82f6f`) — MERGED, **needs a Netlify deploy** at time of writing.
  The inert-page fix, credit error logging, scroll reset, sidebar fill, header
  allowance counter. If the live site still freezes after clicking through
  Settings, this simply has not been deployed yet — Trigger deploy.
- **Stripe live config, all done by Will:** product `SocratesIQ Teacher` with two
  live prices ($9.99/mo, $99.99/yr), `sk_live_…`, Customer Portal saved in live
  mode, all six Netlify env vars set (same value across every deploy context),
  `migration-stripe.sql` run, webhook endpoint live at
  `https://socratesiq.com/api/stripe/webhook` with the six events.
- ⚠️ **NOT yet verified end to end.** No real purchase has been put through. The
  next session should confirm: checkout completes → the webhook shows a green 200
  in Stripe → `select * from metrics_subscriptions;` shows the row as `paid`
  → Settings → Manage billing opens the portal. To rehearse without moving real
  money, make a 99%-off coupon + promotion code (checkout already passes
  `allow_promotion_codes: true`) and buy with a real card for ~10¢.

### ⚠️ TWO separate bugs looked like one. Both are fixed. Read this.

**Bug A — `consume_assignment_credit()` never worked, from July 20 to Aug 30.**
The function declares `returns table (plan, used, allowance, remaining, allowed,
period_start)`, which puts `used` in scope as an OUT parameter. Its increment
statement read `update public.user_credits set used = used + 1` — and Postgres
refuses that as ambiguous, error **42702**, because the right-hand `used` could
be the column or the variable. It threw on every single call. The client fails
OPEN by design, so the analysis went through and nothing surfaced: **no teacher
was ever charged a credit, and the trial wall never fired for anyone.** That is
why every `user_credits` row read `used = 0` — the rows were created lazily by
the READ function (`get_assignment_credits`, whose only write is `set used = 0`,
a literal, hence unambiguous) and never touched again.

The fix is one table alias: `update public.user_credits as uc set used =
uc.used + 1`. It is in `supabase/migration-credits.sql` with a comment saying why
the alias must stay. Verified against a local Postgres 16 — the bug reproduces
exactly on the old function, and the fixed one spends twice on trial then walls
without incrementing, resets a rolled-over paid month, never walls a comped
account, creates-and-charges a new teacher, and refuses a signed-out caller
without creating a row. **This was found only because the credit helpers now log
the Postgres error instead of failing silently.**

### Bug B — the page went inert (this is what made Bug A so hard to see)
Symptom: the app "hung up", and the free-assignment counter sat at 2 of 2 and
never counted down. `user_credits` showed `used = 0` for every teacher, which
looks exactly like the credit RPC being broken. **It was not.** Two wrong
theories were chased first (a Postgres cached plan invalidated by the new Stripe
columns; then a PostgREST schema-cache miss). Re-running the functions fixed
nothing, because nothing was broken.

The real cause was in the DOM: `<body>` was left with `pointer-events: none` and
`data-scroll-locked="1"` with **no dialog open**. That is Radix's modal lock. It
is cleaned up when a dialog CLOSES, but not when a dialog is UNMOUNTED before it
can — which is what happens when a dialog closes and the whole view swaps in the
same tick (Settings → "See plans" → pricing does it). After that the page
swallows every click until a reload. Analyze never fired, so no analysis ran, so
no credit was ever spent. **One cause, both symptoms.** The database had been
telling the truth all along.

Fixed in PR #19: `App.tsx` watches `<body>` and lifts the lock whenever it is set
while no dialog is actually mounted (a real one always has `[role="dialog"]` in
the DOM, so genuine locks are untouched). If it ever catches one, the console
logs `[ui] cleared a stale modal lock` — that means the safety net worked but a
root cause is still there worth finding.

**Lesson for next time:** the credit helpers fail OPEN by design (an
infrastructure hiccup must never block a teacher) and used to fail SILENTLY.
They now log the Postgres error. Before theorising about the database, look at
the browser: Network tab for the RPC call, Console for `[credits]` lines. If
there is no request at all, the bug is in the app, not the DB. Three separate
theories were chased on this before the console line named the cause in one
sentence — the logging paid for itself the same day it shipped.

**Also worth internalising:** fail-open plus silence is how a revenue bug hides
for six weeks. Anywhere else the app swallows an error to keep a teacher moving,
make sure it still says something to the console.

### Other fixes in PR #19
- **Scroll reset on navigation.** There was none at any of the ~20 `setViewMode`
  call sites. Footer links live at the BOTTOM of a long page, so clicking Pricing
  or Terms dropped you into the new page already scrolled past its heading. One
  effect covers all of them; Apply This Version and New Assignment also return to
  the Analyze box.
- **Results sidebar** (the hole left by removing the AIAS table): context chips
  under the score (subject · grade · AI strategy) and the allowance with an
  upgrade link. Both are about THIS analysis — that is the bar, since generic
  reference material is what made the old panel worth cutting. A score-movement
  card was considered and dropped: the before/after block in the main column
  already covers it.
- **Allowance in the header**, under the teacher's name: `1 of 2 free left` /
  `11 of 15 left` / `Unlimited`, amber at zero, nothing while loading. Credits
  now load on sign-in rather than only when Settings opens, and the analyzer
  reports changes upward via `onCreditsChange` so the header updates immediately.

### Pricing: keep 15/month (recommendation, not yet a change)
Will asked whether to drop the paid allowance from 15 to 10. Recommendation was
**keep 15**, for three reasons: (1) there is nowhere to upgrade TO — the only
step up is School/District at "call for pricing", which an individual teacher
will not buy, so hitting the wall means churn rather than revenue; (2) a full
transformation costs ~4¢, so 15 of them is ~60¢ against $9.99 — dropping to 10
saves about twenty cents a month per subscriber; (3) the teachers who would hit
10 are the enthusiasts who tell their department about you. Caps are easy to
RAISE later and a broken promise to LOWER on existing subscribers, so err high.
**Decide it with data in ~60 days** — `usage_events` has been logging since July;
look at the distribution in `metrics_by_user`. If the 95th percentile is well
under 15 the cap is decoration; if teachers genuinely hit it, that is a signal to
build the tier above, not to shrink this one.

### Open / next
1. ~~Deploy `main`~~ DONE Aug 30 2026 — PR #19 is live (the header counter is
   the visible marker that this build is deployed).
1b. **Run the fixed `consume_assignment_credit()`** in Supabase if it has not
   been run yet — paste from `supabase/migration-credits.sql`. Until it is run,
   nobody is charged for anything.
2. **Verify the first real purchase end to end** (see the checklist above).
3. **Intermittent "The analysis came back in an unexpected format."** Seen once on
   the live site, succeeded on a later attempt. Note the client already retries a
   parse failure 3 times (502 is in `RETRYABLE` in `gemini.ts`, backoff
   2s/8s/20s), so that toast means FOUR attempts failed. To fix it properly, get
   the `analyze v3: JSON parse failed (part=… len=… stop=…) head: … tail: …` line
   from Netlify → Logs → Functions → `analyze`. `stop=max_tokens` means
   truncation (the Aug 28 fix not holding for that input); a clean-ending tail
   with stray characters is a different problem. Do not guess without the line.
4. Terms and Privacy now carry a hardcoded **May 31 2026** last-updated date
   (`TERMS_LAST_UPDATED` / `PRIVACY_LAST_UPDATED` in `StaticPages.tsx`). They used
   to render `new Date()`, so the date moved every day on its own and could never
   show when the documents actually changed. **Bump these by hand** with any
   substantive edit — section 12 of the Terms promises exactly that.

### Housekeeping worth knowing
- **The stale Supabase SQL tab is gone.** A saved query named "SocratesIQ –
  credits" still held the ORIGINAL July allowance (20 paid / 3 trial) and would
  have silently rolled pricing back if re-run. It was deleted. The canonical
  version is `supabase/migration-credits.sql` in this repo — paste from there,
  not from a saved tab.
- **Brand icons** for Stripe and any other square slot live in `marketing/brand/`
  with a README and the brand hex values (primary navy `#17213B`, accent slate
  `#3E5C86`, warm paper `#F4EFE4`, logo teal `#007880`).
- **How the Stripe code was tested**, for anyone extending it: two hermetic Node
  suites drive the real handlers using the Stripe SDK's own signature generator
  and an in-memory Supabase double (module doubles in a scratch `node_modules`,
  functions bundled with esbuild and `--external`). UI is driven in headless
  Chromium against the built app. Neither needs a Stripe account or a live DB.

## Session status (August 29 2026, later) — Stripe billing BUILT (MERGED in PR #18, now LIVE — see the evening block above)

Parked task 7 (payments). All of it is on the same branch
`claude/socrates-handoff-continue-z2f5c7`, and it is **inert until Will does the
dashboard setup below** — with no Stripe env vars the app behaves exactly as it
does today ("paid plans launching soon"). Nothing about the existing plan model
changed: trial = 2 lifetime, paid = 15/month, unlimited = comped.

✅ **ToS lawyer review: DONE** (Will confirmed Aug 29 2026). That was the last
pre-revenue blocker in parked task 7.

⚠️ **Will went straight to LIVE mode**, not the sandbox — the account was
activated and the two prices were created live. So the walkthrough below is
written test-mode-first, but the actual setup used live values throughout:
`sk_live_…`, live price ids, a live webhook endpoint with its own `whsec_…`,
and the Customer Portal saved in live mode (it is configured per-mode). To
rehearse anything later without moving money, use a 99%-off coupon +
promotion code — checkout already passes `allow_promotion_codes: true`.

### How it works (three functions, one webhook)
- `netlify/functions/billing-checkout.ts` → `POST /api/billing/checkout`
  `{plan:"monthly"|"annual"}` with the teacher's Supabase access token. Verifies
  that token with Supabase (so a forged id can't buy for someone else), then
  returns a **hosted Stripe Checkout** URL. No card form and no card data ever
  touches this app.
- `netlify/functions/billing-portal.ts` → `POST /api/billing/portal`. Stripe's
  Customer Portal: update card, invoices, cancel.
- `netlify/functions/stripe-webhook.ts` → `POST /api/stripe/webhook`. **The only
  thing that changes a teacher's plan.** Verifies Stripe's signature on the RAW
  body, then: `checkout.session.completed` → plan='paid', used=0;
  `invoice.paid` (renewal) → used=0, new period; `customer.subscription.deleted`
  → back to 'trial'; `invoice.payment_failed` / `past_due` → keep access while
  Stripe retries the card (losing the tool mid-lesson over a temporary decline is
  the wrong call). Answers 500 on an internal error so Stripe RETRIES — a dropped
  event would strand a paying teacher behind the wall.
- Two rules live in `_shared/billing.ts` and nowhere else: a **'unlimited'
  (comped) account is never demoted** by any Stripe event, and a **downgrade never
  resets `used`** (otherwise cancel + re-subscribe farms free redesigns).
- The webhook writes with the **service-role key**, because teachers have
  SELECT-only RLS on `user_credits` — they still cannot upgrade themselves.

### Front end
- `src/lib/billing.ts` — `startCheckout()`, `openBillingPortal()`,
  `consumeCheckoutReturn()`. `billingEnabled` = `VITE_BILLING_ENABLED === 'true'`
  AND Supabase configured. **This is the master switch.**
- Pricing page Teacher CTA now has five states: comped → "Your account is comped";
  paid → "Manage billing"; billing off → "Launching soon" (disabled, today's
  behaviour); signed out → "Get started" → sign-up; otherwise → Stripe Checkout at
  whichever of monthly/annual the toggle is on.
- The out-of-credits wall gets an "Upgrade — $9.99/mo" button (replacing "Notify
  me") only when billing is on.
- Settings → the allowance card gets "Manage billing" for paid teachers.
- Returning from Stripe, `?checkout=success` polls the balance for ~12s (the
  webhook usually lands first, but not always) then confirms with a toast; the
  analyzer's counter is re-read via a new `creditsRefreshKey` prop.

### WILL'S STRIPE STEPS — do these IN TEST MODE FIRST (one at a time)
1. **Create the account.** stripe.com → sign up as **will@socratesiq.com**
   (the business account, per the account-migration note above). Keep the
   **Test mode** toggle ON, top right, for everything below.
2. **Make the product.** Product catalogue → Add product → name `SocratesIQ
   Teacher`. Add TWO recurring prices on that one product: **$9.99 USD monthly**
   and **$99.99 USD yearly**. Copy both price ids (they look like
   `price_1ABC...`) — NOT the product id (`prod_...`).
3. **Get the secret key.** Developers → API keys → Secret key → Reveal → copy
   (`sk_test_...`). This is a password: paste it into Netlify, nowhere else.
4. **Turn on the Customer Portal.** Settings → Billing → Customer portal → allow
   "cancel subscription" and "update payment method" → **Save**. Skipping this is
   the #1 cause of "Manage billing" failing later. (It must be saved separately
   in test mode and in live mode.)
5. **Netlify env vars** (Site configuration → Environment variables → all
   contexts). Mark the first two **secret**:
   `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API →
   `service_role` — NEVER prefix it with VITE_, that would publish it in the
   browser bundle), `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, and
   `VITE_BILLING_ENABLED` = `true`.
6. **Run the SQL.** Supabase → SQL Editor → New query → paste + run
   `supabase/migration-stripe.sql`. Expect "Success. No rows returned." (Adds the
   Stripe columns to `user_credits` plus a `metrics_subscriptions` view.)
   Must happen BEFORE the first test payment: without those columns the webhook's
   write fails. It answers 500 in that case, so Stripe keeps retrying for ~3 days
   and the upgrade lands once the SQL is run — but the teacher sits behind the
   wall until then, and the failures show up red in Stripe → Webhooks.
7. **Deploy**, then **add the webhook**: Stripe → Developers → Webhooks → Add
   endpoint → URL `https://socratesiq.com/api/stripe/webhook` (or the
   netlify.app address) → select events: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` →
   Add. Copy its **Signing secret** (`whsec_...`) into Netlify as
   `STRIPE_WEBHOOK_SECRET`, then **trigger another deploy** (env changes only take
   effect on a new build).
8. **Test end to end** with Stripe's test card `4242 4242 4242 4242`, any future
   expiry, any CVC, any ZIP: sign in as a trial teacher → Pricing → Get the
   monthly plan → pay → you should land back on the site with "You're on the
   Teacher plan" and the counter reading 15. Check Supabase →
   `select * from metrics_subscriptions;`. Then cancel from Settings → Manage
   billing and confirm the account drops back to trial at period end.
9. **Going live** (only after the ToS review): Stripe → activate the account
   (business details, bank account) → flip OFF test mode → **redo steps 2, 3, 4
   and 7 in live mode** (live prices, `sk_live_...`, portal save, a live webhook
   endpoint with its own `whsec_...`) → update the Netlify vars → deploy.
   Test-mode ids do not work in live mode and vice versa.

### Verified this session
`npx tsc --noEmit` and `npx vite build` clean; all three functions bundle with
esbuild. Two hermetic test suites were run against the real handlers with the
Stripe SDK's own signature generator and an in-memory stand-in for Supabase:
- webhook (9 scenarios): forged signature rejected with 400 and no write;
  checkout completion upgrades and stores the customer/subscription ids; a
  replayed event (Stripe retries) is a no-op; a failed payment keeps access;
  cancel-at-period-end keeps them paid; renewal resets the month; a real deletion
  drops to trial WITHOUT resetting `used`; a comped account survives a
  cancellation; an unknown customer is ignored, not crashed.
- checkout/portal (7 scenarios): no token and forged token both 401 with Stripe
  never called; monthly and annual map to the right price ids; the session is
  tied to the Supabase account; **a hostile `Origin` header cannot redirect the
  teacher off-site** (deploy-preview origins are still allowed back to
  themselves); a returning subscriber reuses their Stripe customer; the portal
  404s for someone who never subscribed.
Also drove the Pricing CTA in headless Chromium through all five states plus the
billing-off "Launching soon" fallback.

### Not done / decisions left
- **School & District plans stay "Contact us"** — no Stripe prices for them.
- No proration/upgrade path between monthly and annual: a teacher switches by
  cancelling and re-subscribing, or Will does it from the Stripe dashboard.
- Stripe Tax is OFF. Turn it on in the dashboard if sales tax becomes a question.
- Dunning emails (failed-card reminders) are Stripe's own — enable them in
  Settings → Billing → Subscriptions and emails.

## Session status (August 29 2026) — redesign version history (MERGED in PR #18)

Picked up the top of the parked backlog (task 0, requested July 13 2026):
**version history in the Revise box**. On branch
`claude/socrates-handoff-continue-z2f5c7`, one commit, NOT merged — needs Will's
look on the Deploy Preview first (previews auto-build; `main` does not).

### What changed
`src/components/AssignmentAnalyzer.tsx` only — no API, no DB, no prompt changes.
- Each redesign now keeps a **version chain**: entry 0 is the model's original
  text, every later entry is either an AI revision or a banked inline edit.
  Chips (`Original` `Rev 1` `Rev 2` …) render above the redesign body once there
  is more than one; clicking one shows it.
- **Revise APPENDS instead of overwriting.** Before, `handleRefine` wrote
  straight into `editedTexts[i]` and the previous text was gone; now it appends
  and selects. The revise instruction is stored on the version and shown under
  the chips ("Showing Rev 1 — "make it a group project"") and as the chip's
  tooltip, so two revisions are tellable apart.
- **Inline edit banks a version.** Typing still updates the live preview
  keystroke by keystroke; clicking Done adds it to the chain as `Rev N ✏️`.
- **Compare**: a `Compare` toggle opens a two-column side-by-side — a dropdown
  picks the left version, the right is whatever is selected.
- **The selected version is the one that counts.** Implementation keeps
  `editedTexts[i]` as the single source of truth (selecting a version mirrors its
  text into it), so downloads, the lesson plan, Copy, and Apply This Version /
  re-analysis all picked this up with no changes of their own.
- The `~NN Est. if re-analyzed` badge now reads **`Est. for Original`** when a
  later version is on screen — that number came from the call that wrote the
  original redesign and does not describe a revision.
- History rides along in the existing local **draft autosave** (`siq_draft_v1`),
  so a reload restores the chain. Nothing extra is stored server-side and the
  library snapshot is unchanged — matches "all in-browser for the session".
- **Fixed a latent leak while in there:** `editedTexts` was never cleared when a
  NEW analysis came back, so a previous assignment's edited text could render
  over a fresh redesign. Now cleared (with the new history state) on a new
  analysis, on New Assignment, and when the parent hands in a library item.

### Verified
`npx tsc --noEmit` clean, `npx vite build` clean. Drove the real component in
headless Chromium against a stubbed `/api/analyze` + `/api/generate`: analyze →
revise ×2 → chips `Original / Rev 1 / Rev 2` → click back to `Original` (text
reverts, badge label flips back) → Compare dropdown lists all three → inline edit
→ `Rev 3 ✏️` → reload restores the chain from the draft. No console errors. The
chain is per-redesign (switching Quick Fix / Rebuild / Reinvent does not leak
versions between tiers).

### Next
1. Will: open the branch's Deploy Preview, try Revise twice on a real
   assignment, then say merge or change.
2. Still pending from Aug 26/28 and NOT done here: **trigger a Netlify deploy of
   `main`** (auto-deploy does not fire) so the already-merged copy/fix work is live.

## Session status (August 28 2026) — PR #11 (EPOCH) MERGED to main, with 3 fixes found while testing

**PR #11 `claude/epoch-redesigns` is MERGED to `main`** (merge commit `3d39dbd`,
merged over base `b753647`). **NEEDS a Netlify deploy to reach the live site** — see
Deployment facts below; auto-deploy of `main` does NOT fire.

### What's in this merge
1. **EPOCH redesigns** (the original point of PR #11): redesigns must now build one
   human capability AI can't replicate; a "Strengthens: ..." tag renders on each
   Quick Fix/Rebuild/Reinvent card. `Loaiza & Rigobón, MIT (2025)` was added to
   server-side `RESEARCH_NOTES` only — the About-page citation chip PR #11 originally
   proposed was DROPPED during the merge (see below, it conflicted with PR #16).
2. **Fix: stale "Gold" label** (commit `9e49c62`) — two spots still printed the raw
   internal tier value instead of the Aug 6 display names (Quick Fix/Rebuild/Reinvent):
   the "Align the Gold redesign..." line above the lesson-plan panel, and the
   "Bronze/Silver/Gold redesigns" line in the score-info dialog. Both now read through
   `TIER_LABELS`. File: `src/components/AssignmentAnalyzer.tsx`.
3. **Fix: redesign JSON truncation on re-analysis** (commit `5307f77`) — root cause of
   a live 32% error rate on `/api/analyze` (502s), confirmed from Netlify function logs
   (`stop_reason=max_tokens`). Re-analyzing an already-long redesign (e.g. an AP-level,
   rubric-heavy assignment) let the model balloon each `modifiedAssignment` toward the
   source's own length/rubric detail, blowing the 1800-token ceiling on the "redesigns"
   half. Added a hard 120-word cap per redesign + told the model to compress any rubric
   to one clause, and bumped that call's `max_tokens` 1800→2200 as headroom. File:
   `netlify/functions/analyze.ts`.
4. **Fix: teacher quote attribution** (commit `618d822`) — the 6 rotating testimonials
   in `src/lib/comments.ts` were tagged with generic roles ("Pilot program teacher",
   "High school teacher"). Matched each quote back to its real source in
   `Socrates_Feedback_Responses.xlsx` (a Google Form export Will provided) and re-tagged
   with subject + grade band, no names: 4 quotes → "High School English Teacher"
   (source: Dorsett Davis, English/grade 10), 2 quotes → "Middle & High School Math
   Teacher" (source: Brian Muse, Math/middle & high school). **Do not add real names to
   these quotes** — subject/grade band only, per Will's explicit instruction.
5. **Merge conflict resolved** in `src/components/StaticPages.tsx` (About page): PR #11
   was based on a pre-PR-#16 `main`, so its added EPOCH citation chip collided with
   PR #16's removal of ALL named citation chips (the rights/usage consultation decision
   — see the Aug 26 status block below). Resolved in favor of `main`'s generalized,
   no-named-citations wording; the EPOCH chip was dropped as a result. If a citation
   chip needs to come back later for any source, that is a NEW decision to make with
   Will, not a revert of this resolution.
6. **Fix: off-center analyzing-screen icon** (commit `dc326a5`, pushed directly to
   `main` right after the merge, not part of PR #11) — `public/owl.png` had a large
   asymmetric transparent margin baked into the file itself (189px left vs 82px right
   of the actual artwork within its 512x462 canvas), so the owl always rendered small
   and shifted right wherever it's used (analyzing-screen badge, nav mark, favicon) no
   matter how the surrounding CSS centered the box. Cropped to the artwork's true
   bounds and re-padded symmetrically into a 373x373 canvas. Also enlarged the
   pulsing analyzing-screen badge (`StreamingProgress.tsx`: container w-16→w-24, icon
   w-10→w-16) per Will's request — the ping/pulse animation itself is unchanged, he
   likes it, just wanted the icon bigger and actually centered.

### Brand assets Will shared this session (Aug 28) — decision + open question
Will pasted 9 logo images (individual owl+wordmark lockups, plus a brand-kit
comparison sheet showing "Design 1 – Abstract Owl" vs "Design 2 – Geometric Owl")
and uploaded a PDF titled "SocratesIQ Brand Kit Folder." **Decision: going with
Design 1 (Abstract Owl) — do NOT use Design 2 (Geometric Owl) anywhere.** This
matches what's already live (`public/owl.png`/`public/logo.png`), so no code
change was needed. Notes for next time:
- The pasted images never reached this session's filesystem (pasted images are
  visible but don't land on disk here — only files uploaded with a real path do).
  They still looked like the same style of AI-generated raster art already in the
  app (soft edges, not crisp vector), so they do NOT resolve the long-open "need a
  true vector SVG from a designer" item. If Will wants them actually used as
  assets, they need to come in via a real file upload or a GitHub URL, not a paste.
- The PDF turned out to be a 10-page WRITTEN brand-strategy guide (voice, tagline,
  marketing collateral list, icon/illustration rules, a Canva Pro setup
  walkthrough) — no embedded logo art at all.
- **Color palette: LEAVE AS-IS for now (Will's decision, Aug 28).** That PDF's
  palette is close but NOT identical to what's coded live — Navy `#1D3557` (PDF)
  vs `#0F1B2E` (code), Teal `#00A8C8` (PDF) vs `#00A8E8` (code), Light Gray
  `#EEF2F5` (PDF) vs `#E6EBF1` (code); Emerald `#2EBB57` matches. Will may change
  the palette later and will explicitly say "pull these colors" when ready — do
  NOT change the live palette on your own initiative before then.

### Progress bar pacing + redesign score estimates (commit `a788390`, Aug 28)
Two more fixes from live feedback after the deploy, NOT part of the PR #11 merge:
1. **Progress bar "counts to 99% quickly, then hangs"** — root cause: the old
   trickle in `StreamingProgress.tsx` was a fixed per-tick fraction (`(95-p)*0.05`
   every 180ms), which converges almost independent of real elapsed time — it
   raced to ~95-99% in a couple seconds no matter how long the actual `/api/analyze`
   call took (13-30s+), then sat pinned looking hung. Replaced with an
   elapsed-time-based exponential curve (tau=14s, ceiling 97%) so the pace roughly
   tracks how long a typical analysis actually takes. Also softened the real
   checkpoint in `gemini.ts` (one of the two PARALLEL calls finishing isn't 60% of
   the total wait — the slower half still governs). Still an approximation, not a
   true stream — the client makes one fetch and waits for the full JSON response;
   real granular progress would need the Netlify function to stream partial output
   back (SSE/chunked), which is a bigger change not done here.
2. **Redesign score pre-grading** — each Bronze/Silver/Gold suggestion now carries
   an `estimatedScore` (0-100), generated by the SAME model call that writes the
   redesign (`analyze.ts`, "redesigns" half). That half previously had
   `SCORING_GUIDANCE` stripped from its system prompt to save input tokens (July 12
   rate-limit fix) — it's now included unconditionally (only ~210 tokens) since the
   estimate needs to be grounded in the same rubric bands the diagnosis half uses.
   Shown in `AssignmentAnalyzer.tsx` next to the redesign title (tab view) and in
   the compare-levels cards, same color bands as the main score. Framed as a
   planning preview everywhere ("Est. if re-analyzed") — re-analyzing the applied
   redesign is still the authoritative score; this is a same-call self-estimate,
   not a second scoring pass, so expect it to drift a few points from the real
   re-analysis sometimes.

### Removed the AI Assessment Scale sidebar accordion (commit `a4a5a3a`, Aug 28)
The results sidebar's "Framework Reference" panel had two accordions: Bloom's/
Triple-A (tied to a real Settings toggle -- kept) and a static AIAS L1-L5
reference table (Perkins et al.) that wasn't connected to anything the teacher
controls -- orphaned clutter. Will asked to remove it for a clean sidebar.
Removed the accordion from `AssignmentAnalyzer.tsx`. Also updated
`SCORING_GUIDANCE` in `research-base.ts` so the model no longer cites "AIAS" or
an AIAS level by name in a visible score explanation (AIAS stays as background
research context in the system prompt, just not a thing it names on-screen
anymore, since there's no longer a decoder for the term).

### If you see issues and need to revert
The pre-merge state of `main` was commit `b753647` (tip before this PR). To back out
the WHOLE merge: `git revert -m 1 3d39dbd` (keeps history, adds a revert commit) or, if
nothing has been built on top of it yet, `git reset --hard b753647` + force-push (only
with Will's explicit OK — this rewrites `main`). To back out ONE piece instead of the
whole merge: `9e49c62` (Gold-label fix), `5307f77` (truncation fix), `618d822` (quote
attribution), `dc326a5` (owl icon centering + badge size), `a788390` (progress
bar pacing + redesign score estimates), `a4a5a3a` (removed AIAS sidebar
accordion) are each self-contained
commits — `git revert <sha>` any one of them individually. After any revert, remember
to Trigger deploy again (see Deployment facts).

## Session status (August 26 2026) — post-launch copy tweaks + marketing rundown + Claude-account note

Since the Aug 23 launch: a batch of post-launch copy tweaks is MERGED to `main`
(needs a deploy to go live), a marketing rundown was produced for Will's team, and
Will is about to move his Claude login to the business email.

### Copy tweaks (PR #16, on main — NEEDS a Netlify deploy to reach the live site)
- **Research wording softened to "informed by"** everywhere (landing, About, Scoring,
  and the in-app score-info dialog). Was "grounded in / built on / research-based."
  Reason: a rights/usage consultation, avoid implying research backs/endorses the product.
- **Named research citations REMOVED from the About page** (the 10-source chip list:
  UNESCO, Bearman & Luckin, Mollick, TEQSA, Sperber, etc.). The About "research base"
  section now speaks only generally, with a generalized non-endorsement note. Per the
  consultation, naming specific researchers/institutions could invite claims.
  ⚠️ The **landing-page Furze et al. (2024) pilot reference is intentionally KEPT** —
  Will frames it as what the redesign APPROACH can achieve (cited to the study), not
  what SocratesIQ itself did. Do not remove it without asking.
- **Assignment allowance lowered to 15/month (paid) and 2 free (trial)** — was 20/3.
  Paid dollar amounts UNCHANGED ($9.99/mo, $99.99/yr). Updated in the copy
  (Pricing/landing/analyzer plan card) AND in `credit_allowance()` in
  `supabase/migration-credits.sql`. **Will already RAN the SQL in Supabase**, so the
  live DB limit is 15/2 now. ⚠️ MISMATCH until deploy: the live site's on-screen copy
  still says 20/3 until PR #16 is deployed — trigger a Netlify deploy to sync them.

### Marketing rundown (deliverable, not code)
A one-page SocratesIQ product + brand rundown for Will's AI social/marketing team.
Published as an Artifact: https://claude.ai/code/artifact/77d8e4c6-1947-4b91-8ef1-314fe6ba4851
(private to Will's Claude account; share via the page's Share menu). Also delivered as a
Sora-embedded 6-page PDF. Covers: what it is, the problem, audience, how it works,
features, differentiators, pricing (2 free / $9.99 = 15/mo), post angles, and do/don't
guardrails (no invented stats, no naming specific studies, no em dashes, no AI-generated
fake people). NOTE for Will's team: they do NOT need special access — the public landing
page + the free trial let them see the product directly at socratesiq.com.

### ⚠️ Claude account email change (in progress, continuity risk)
Will is losing access to the email he currently uses to log into Claude and wants it on
the business account. **Anthropic does NOT support changing a Claude account's email in
place** (confirmed via support.claude.com). Plan: create a NEW Claude account on
**will@socratesiq.com**, save/export anything needed from the old account, cancel its
billing, optionally delete it. CONTINUITY RISK: a future session may run under a DIFFERENT
Claude account than the one that did this work; the **rundown artifact (link above) is
published under the CURRENT account** and will NOT move automatically (re-publish it from
the new account if wanted). The code is safe in GitHub regardless of the account switch.

### PR state (Aug 26)
#10 / #13 / #14 / #15 / #16 all MERGED to main. #12 CLOSED. **#11 `claude/epoch-redesigns`
(EPOCH) still OPEN** — rebased on main, on its Deploy Preview, NOT yet tested/signed-off
or merged (see the PR-#11 block below).

### Open / next
1. **Deploy `main` to Netlify** (Deploys → Trigger deploy → Deploy site) to push the
   informed-by wording, the removed citations, and the 15/2 copy live (and sync the copy
   with the DB limit already changed).
2. Will to test **EPOCH (#11)** on its preview, then decide whether to merge.
3. Google **app verification** (drop the "unverified app" warning) is deferred — later task.

## Session status (August 23 2026) — LAUNCHED (brand refresh LIVE) + Google rebuilt on the business account

The whole brand refresh is now MERGED to `main` and DEPLOYED LIVE on socratesiq.com
(Will triggered the Netlify deploy). This session also rebuilt the entire Google
integration from scratch after the old Google account was suspended. Live now:
editorial reskin (navy + warm paper, Sora, owl logo), the public landing page, the
fixed splash (new logo lockup, old owl fly-in video removed), Quick Fix / Rebuild /
Reinvent tiers, student-time woven into redesigns, analyzer draft autosave, the
Welcome Back first-visitor fix, em-dash cleanup, the editorial inner pages, the new
contact emails, and Google sign-in + Drive on a fresh, durable Google account.

PR STATE: #10 (brand refresh), #13 (splash video removal), #14 (contact emails) all
MERGED to main and live. #12 (old handoff rename) CLOSED as redundant. **#11
`claude/epoch-redesigns` (EPOCH) is still OPEN** — it was rebased on top of main and
is on its Deploy Preview for Will to test; NOT merged. See its own PR-#11 block below.

### ⚠️ GOOGLE ACCOUNT REBUILD (Aug 23 2026) — READ THIS, it supersedes older Google notes
The old **SocratesIQEd@gmail.com** account was **SUSPENDED by Google for "suspicious
activity" and is GONE.** It owned the Google Cloud project behind Google sign-in and
Drive, so both broke site-wide ("Error 401: disabled_client" on the login button).
Everything was rebuilt on Will's new business account. CURRENT, CORRECT setup:
- **Official Google account is now `will@socratesiq.com`** — a Google WORKSPACE account
  on the socratesiq.com domain (Will is the super admin / Organization Administrator).
  Google Cloud **organization = socratesiq.com** (org ID `951116669540`). Do NOT use any
  personal Gmail or the dead SocratesIQEd account for anything again.
- New Google Cloud **project "SocratesIQ"** (project ID `socratesiq-505023`, project
  **NUMBER `462738908920`**). Created UNDER the socratesiq.com org (not "No organization"
  — a Workspace account can only create projects inside its org, which was the initial
  wall; Will already has Project Creator via the domain binding + Org Admin).
- New OAuth **client "SocratesIQ Web"** (Web application). **Client ID
  `462738908920-nu01...apps.googleusercontent.com`.** Authorized JS origins:
  https://socratesiq.com + https://brilliant-mandazi-3937f4.netlify.app. Authorized
  redirect URI: https://llvtiuhtjpprtwlvnauu.supabase.co/auth/v1/callback (the Supabase
  callback). Client SECRET is NOT recorded here (it lives in Supabase only).
- New restricted **API key** for the **Google Picker API** (value NOT recorded here; it
  lives in Netlify `VITE_GOOGLE_API_KEY`). Drive API + Picker API enabled in the project.
- **Consent screen:** Audience = EXTERNAL, **Published (In production)**. App is
  UNVERIFIED — teachers see a one-time "Google hasn't verified this app" screen and click
  through (Advanced → continue). Formal verification (Verification Center) is DEFERRED;
  fine for now with the non-sensitive login + drive.file scopes.
- **Supabase** (project `llvtiuhtjpprtwlvnauu`) → Authentication → Providers → Google:
  Client ID + Secret REPLACED with the new ones. This is what actually turned login back
  on (login runs through Supabase server-side — no redeploy needed for the login half).
  Site URL / redirect allow-list were already correct and unchanged.
- **Netlify** (brilliant-mandazi-3937f4) env vars UPDATED to the new values, all
  contexts, NOT marked secret: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`,
  `VITE_GOOGLE_APP_ID` = `462738908920`. These bake at build time → the Drive half needed
  the redeploy (which also shipped the whole reskin). TESTED LIVE: Google login works,
  "Save to Google Doc" works.
- GOTCHA that ate time: the browser kept defaulting to Will's PERSONAL Google account. If
  any Google screen offers a personal email, you're on the wrong account — switch to
  will@socratesiq.com (a private window signed in ONLY as will@socratesiq.com avoids the
  mixing entirely).
- STILL OPEN on Google (low priority): formal app verification to drop the "unverified"
  warning; add deploy-preview origins to the OAuth client if login must be tested on a
  preview URL (only socratesiq.com + the main netlify domain are authorized today).

### Contact emails changed (Aug 23 2026)
The dead SocratesIQEd@gmail.com was ALSO the site's contact address, so every "contact
us" link was broken. Now (PR #14, live): **support@socratesiq.com** on the Help page
(troubleshooting), **hello@socratesiq.com** everywhere else (About, Pricing, Privacy,
Terms, Feedback). Both are aliases that forward to will@socratesiq.com; info@ is a third
alias that exists but is not shown on the site. Replace any remaining socratesiqed@gmail.com
references (they are DEAD).

## Session status (August 6 2026) — "Welcome Back" greeting fix (on PR #10)

Small, self-contained fix added to the reskin branch (PR #10
`claude/handoff-continuation-w2g10j`). PROBLEM Will reported: a brand-new or
incognito visitor sometimes saw "Welcome Back" — the auth dialog always opened
in login mode, so clicking "Get started" greeted a first-timer like a returning
user. FIX (2 files, wiring only, no functionality change):
- `LoginDialog.tsx` — new optional `initialMode?: 'login' | 'signup' | 'forgot'`
  prop (default 'login'); the internal `mode` seeds from it, and a `useEffect`
  re-applies `initialMode` (and clears stale error/reset state) every time the
  dialog opens. So "Welcome Back" now appears ONLY on the actual sign-in form.
- `App.tsx` — new `loginMode` state + an `openLogin(mode)` helper. Header
  "Get started" and the landing-page CTA → `openLogin('signup')` (Create Account);
  header "Sign in" and post-logout → `openLogin('login')` (Welcome Back);
  `<LoginDialog>` gets `initialMode={loginMode}`.
Verified: `npx tsc --noEmit` clean + `npx vite build` passes. Committed + pushed
to PR #10 (will show on the deploy-preview-10 build). Confirm in a fresh
incognito window: header "Get started" should read "Create Account"; only
signing in shows "Welcome Back".

ALSO SHIPPED Aug 6 on PR #10 (Will's decisions, four changes + inner-page polish):
- **Redesign tiers renamed Bronze/Silver/Gold -> Quick Fix / Rebuild / Reinvent.**
  The medals read as a ranking (Gold = "best"), but the tiers are levels of CHANGE,
  not quality. DISPLAY-ONLY rename: the internal level values stay 'Bronze'/'Silver'/
  'Gold' everywhere (API contract in analyze.ts, saved library `status`, share links)
  so nothing breaks; only labels changed, via `TIER_LABELS` (AssignmentAnalyzer),
  `STATUS_LABELS` (LibraryView, SavedReportView), and updated plain-copy in Pricing,
  Onboarding, LandingPage, StaticPages. Same pattern as the AI-strategy rename. Medals
  (emoji) were removed from the tabs, compare view, Onboarding demo, and Library badges.
- **Student time is now WOVEN INTO each redesign** (Will: "no [separate badge] but
  include that in the redesign for each tier"). analyze.ts redesign prompt now tells the
  model to STATE the expected completion time inside the assignment text, scaled by
  level (Quick Fix ~10-20 min, Rebuild ~one class period, Reinvent up to two). No new
  UI field; it reads as part of the handout.
- **Draft autosave in the analyzer** (AssignmentAnalyzer.tsx). Inline edits/revisions
  lived only in React memory and were lost on navigation. A debounced localStorage draft
  (`siq_draft_v1`) now saves text/result/editedTexts/activeLevel/aiPreference/lessonPlan/
  directions and restores on mount (skipped when `initialText` is passed, e.g. opening a
  library item). Small "Draft autosaved" note under the New/Save buttons; cleared on New
  Assignment. "Save to Library" is still the deliberate keep-forever snapshot. Local-only
  for now (a cloud draft table is a possible future enhancement).
- **Cloud/Local sync pill HIDDEN** in the header (App.tsx) at Will's request (it read as
  clutter in the top-right corner). Commented out, not deleted; `cloudSynced` state and
  the `Cloud`/`HardDrive` imports were removed since they were now unused. Sync still runs.
- **Inner pages polished to the landing's editorial layout** (StaticPages.tsx +
  Pricing.tsx): shared `BackLink`/`PageHeader`/`ProseSections` helpers, `.eyebrow` labels
  over large Sora `font-semibold` headings, a dark `.ink-card` philosophy accent on About,
  eyebrow'd section intros. Copy preserved (legal text verbatim); the Library/sync Help
  topic was updated to mention autosave and drop the now-hidden cloud badge.
All four builds/type-checks pass (vite + tsc + esbuild on analyze.ts). Three commits on
PR #10.

BRANCH/HANDOFF HOUSEKEEPING done this session: the versioned handoff
(`SocratesIQ 1.md`, which lived only on PR #12 `claude/handoff-update-aug4`) was
brought onto the reskin branch as `SocratesIQ 2.md`, and the stale top-level
`HANDOFF.md` was removed here so there is ONE canonical handoff. NOTE: because
PR #12's whole job was the `HANDOFF.md → SocratesIQ 1.md` rename, PR #10 now
supersedes it — when PR #10 merges, PR #12 can be closed without merging (or
will merge cleanly as a no-op). Don't merge both expecting two separate handoff
files.

## Session status (August 4 2026) — UI reskin + EPOCH IN PROGRESS (branches, NOT merged)

Nothing from this session is live or on `main` yet — it is all on branches / draft
PRs. Will's live site is UNCHANGED. Two workstreams plus decisions:

OPEN BRANCHES / PRs:
- **PR #10 `claude/handoff-continuation-w2g10j` — UI RESKIN (ON HOLD; do NOT merge
  without Will's explicit OK).** Why: a hired marketing team said the old UI "looks
  too AI" (cream bg + four pastel corner-glow radial gradients + coral accent +
  Georgia-italic headlines = a generic AI-default look). On the branch: warm-paper +
  deep-navy + slate-blue editorial palette (`src/index.css` tokens), corner-glows
  removed, ALL headings flipped italic→upright (38 spots), navy pill buttons, `.eyebrow`
  labels + `.section-ink` dark bands, a dark "Built by a teacher" section on the
  landing. THEN per the brand kit the font was switched Fraunces→**Sora** (whole UI is
  Sora; `--font-serif` token repurposed to Sora so headings render in it; fonts load
  via <link> in index.html). Also here: the **new owl brand logo** (`public/logo.png`,
  transparent PNG, replaces the old; used by header, splash, favicon, onboarding,
  loading). Design DIRECTION = the marketing team's Lovable mockup
  https://socrates-spark-redo.lovable.app (editorial navy/paper, photography).
  ADDED TO PR #10 SINCE (Aug 5): (a) PUBLIC LANDING PAGE — new
  `src/components/LandingPage.tsx`; logged-out visitors now see a marketing homepage
  instead of a forced login (App.tsx: splash no longer force-opens login; header is
  auth-aware with Sign in / Get started; LoginDialog gained `onClose` and is
  dismissable); login gates ONLY the tool; honest copy + a real before→after score
  visual, no fabricated stats. Solves the "marketers can't get past sign-in" blocker.
  (b) OWL-ONLY nav mark — `public/owl.png` (cropped + optimized from Will's upload to
  70KB) shown beside a "SocratesIQ" Sora wordmark; favicon + streaming loading icon use
  it; the full stacked lockup `public/logo.png` stays on splash + onboarding.
  (c) EM-DASH CLEANUP — em dashes read as an AI tell, so ~100 across 17 user-facing
  files became commas/periods/colons/parens (en-dash ranges like 0-100 and internal
  split-delimiters left alone).
  (d) WELCOME-BACK FIX (Aug 6) — the auth dialog now opens on the right form so a
  first-time/incognito visitor never sees "Welcome Back" (see the Aug 6 status block
  at the top for details).
  (e) MORE Aug 6 (see the Aug 6 status block): redesign tiers renamed Bronze/Silver/Gold
  -> Quick Fix / Rebuild / Reinvent (display only), student time woven into each redesign,
  draft autosave in the analyzer, cloud sync pill hidden, and the inner pages (About/
  Scoring/Pricing/Help/Privacy/Terms/Feedback) polished to the landing's editorial layout.
- **PR #11 `claude/epoch-redesigns` — EPOCH redesigns (draft, ready to test).**
  Folds the MIT Sloan EPOCH paper (Loaiza & Rigobón 2025) into the redesign engine,
  ADDITIVE: one entry added to `RESEARCH_NOTES`, reinforcing — NOT replacing — the
  existing strategies. Every redesign must now build a human capability AI can't
  replicate; a short "Strengthens: …" tag renders on each Bronze/Silver/Gold card
  (new optional `strengthens` field on the suggestion type in gemini.ts + analyze.ts
  prompt bullet + OUTPUT FORMAT). About page gets ONE citation chip
  (`Loaiza & Rigobón, MIT (2025)`) in the sources list. WILL'S RULES: MIT/EPOCH
  appears ONLY in the research base + About citation, NEVER in redesign output (prompt:
  "never name any framework, study, or acronym"); redesigns ONLY (0–100 score +
  failure breakdown unchanged); always on; learning-and-thinking voice. Kept on a
  SEPARATE branch from the reskin so it can ship independently. Builds pass (vite +
  esbuild).

ENVIRONMENT NOTE: the agent cannot reach lovable.app, socratesiq.com, or the netlify
site (org network policy returns 403 CONNECT). Will must paste screenshots / publish
for the agent to see anything external. Pasted IMAGES are visible to the agent but do
NOT land on its filesystem — binary assets (logos, photos) must come in via GitHub
upload; SVG/text can be pasted.

DECISIONS MADE (don't relitigate):
- **Font = Sora** (brand kit), NOT the Lovable serif. Brand kit: Sora typeface; palette
  navy #0F1B2E / slate #33455E / blue #00A8E8 / green #2EBB57 / grey #E6EBF1; owl =
  "Design 1 – Abstract" (navy→teal). Kit also has horizontal / owl-only / reversed
  lockups.
- **The app's OWN copy is CLEAN** — audited: no fabricated stats/testimonials
  (testimonials already anonymized; pricing "Save %" is computed). The fake proof
  ("87%→0%", "300+ institutions", "Dr. Sarah Jenkins") is ONLY in the Lovable draft
  (marketing's to fix). NUANCE: "87%→0%" traces to REAL data in `RESEARCH_NOTES` (the
  BUV / Furze et al. 2024 pilot) but Lovable misworded it (misconduct CASES → zero, not
  "87% of students"); "300+ institutions" & "Dr. Sarah Jenkins" are AI-invented.
- **Imagery:** no real classroom photos (no schools/pilots yet). Plan: PRODUCT
  SCREENSHOTS + brand graphics + honest "materials" shots Will can take; licensed stock
  only as honest mood, never captioned as real users; NO AI-generated people.
- **Logo format:** the new logo is an AI-generated RASTER (PNG). Will's "Owllogo.svg"
  upload was a WRAPPED BITMAP (a PNG embedded in an SVG, ~470KB, zero vector paths) —
  removed it. A true vector needs a designer to redraw the owl; the PNG is fine for web.
- A marketing **punch-list** was delivered to Will (scratchpad file) covering: strip the
  Lovable draft's fake proof, use Sora, use product screenshots not classroom photos,
  brand-kit colors/contrast, extend the design into the app (not just the homepage).

NEXT STEPS:
1. DONE (Aug 5): the logo owl-mark in the nav AND the public landing page (both in
   PR #10, described above). STILL OPEN on the logo: a TRUE vector SVG from a designer
   (the current owl is an AI-generated raster; a wrapped-bitmap "svg" was rejected).
2. **Will to REVIEW the PR #10 preview**
   (deploy-preview-10--brilliant-mandazi-3937f4.netlify.app) and share it with the
   marketing companies — they can now see the site WITHOUT signing in. Everything
   downstream keys off his reaction. (Ignore the stale `musesocrates` preview.)
3. **Polish the inner pages** (Pricing / About / FAQ / Scoring / Help) to match the
   landing's editorial layout. They already inherit the new colors + Sora, but their
   layouts are plainer than the homepage (punch-list: extend the look beyond the front
   page). This is the recommended next BUILD the agent can do solo.
4. Drop real PRODUCT SCREENSHOTS into the landing when Will has them (imagery decision:
   product shots + brand graphics, NOT fake classroom photos).
5. Decide on merging PR #10 (reskin + landing) and PR #11 (EPOCH), then trigger a
   Netlify deploy (auto-deploy of main does NOT fire — see Deployment facts).

PAUSED / UNFINISHED: a `/content-coach` social post — 5 viral angles were offered
(AI-detectors-are-a-trap / a real number / teacher origin story / a classroom
transformation / "stop telling students not to use AI"); Will never picked one.

## Session status (July 22–25 2026) — all LIVE on main

Everything below shipped and is merged to `main` (PRs #3–#8). The full teacher
journey works in production: analyze → transform → re-analyze (before→after) →
lesson plan + student directions → save → reopen as a read-only report.

SHIPPED THIS SESSION:
- **Monthly assignment credits** — $9.99/mo = 20 assignment redesigns (trial = 3
  free → wall; unlimited = comp accounts). Tamper-proof (SECURITY DEFINER RPCs).
  See "Assignment credits" section. Stripe not built — "Get started"/wall are
  informational; grant plans by hand via SQL in migration-credits.sql.
- **Saved assignment reports** — library items open read-only (report + lesson
  plan + directions + downloads). See that section.
- **Legal notices** — non-endorsement disclaimer (About/Scoring) + FERPA "no
  student data" note under the analyzer inputs.
- **Analytics hardened** — metrics views set to security_invoker + revoked from
  the API (console-only); credit functions search_path-pinned + execute limited
  to authenticated. Supabase advisor CRITICALs cleared.
- **Analyze reliability** — REMOVED structured outputs (it truncated JSON →
  consistent failures); back on the free-text + repair path. DO NOT re-add it —
  see "Analyze reliability" section. Speed trims kept (compact strategy index,
  shorter redesigns). Remaining latency is Haiku's own speed → lever is the
  Anthropic account TIER.
- **Pricing copy** — now says "$9.99 = 20 assignment redesigns a month" (was a
  stale "Unlimited assignment analyses"); trial FAQ fixed to "3 free redesigns".
- **Profile persistence** — teacher profile now saved to a per-account
  `profiles` table so onboarding runs ONCE (was localStorage-only → Safari/iOS
  evicts after ~7 days → re-onboarding; a pilot teacher hit this). Falls back to
  local if cloud unavailable.

SUPABASE MIGRATIONS RUN THIS SESSION (all applied to live by Will): migration-usage.sql,
views-metrics.sql (+ the security-hardening block), migration-credits.sql (+ the
search_path/execute hardening), migration-assignment-report.sql (assignments.payload),
migration-profiles.sql. Will's own account granted plan='unlimited'.

REMINDER: after ANY push to main, Will must Netlify → Deploys → Trigger deploy.
Confirm the profile fix (PR #8) was deployed.

OPEN / NEXT (see Parked tasks for full list): Stripe checkout (unlocks real
payment; ToS needs a lawyer first); Anthropic tier bump if analysis speed needs
improving; get real beta teachers on it (comp them unlimited) to fill the
investor metrics; leaked-password protection (Pro plan); tighten research_papers
RLS.

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

## Analyze reliability — DO NOT re-add structured outputs (July 22 2026)

Hard-won lesson. The analyze function returns JSON as free text, then parses it
with a control-char/stray-quote repair pass + client retry (gemini.ts backoffs).
This is the KNOWN-GOOD path. During this session structured outputs
(`output_config.format` / json_schema) were tried to kill `json_parse_failed`,
but combined with a lowered `max_tokens` it TRUNCATED the JSON on every call →
CONSISTENT "unexpected format" + minute-long stacked retries on live. It was
removed (PR #5). If you revisit structured outputs: use the proper
`client.messages.parse()` path (NOT `stream()` + reading the text block), keep
`max_tokens` generous (diagnosis 1100 / redesigns 1800) so nothing truncates,
and test on a PREVIEW against the real API before deploying — you cannot judge
latency/format from the sandbox (no API key + Anthropic reachable but unauth).
Speed levers that ARE safe & shipped: compact STRATEGY_INDEX instead of the full
catalog on the redesign half, halved uploaded-research cap (2500/3500), tighter
redesign lengths (Bronze 2-3 / Silver 3-4 / Gold 4-5). The remaining latency is
Haiku's own output speed — if more speed is needed, the lever is the Anthropic
account TIER (higher = faster/priority), not the prompt. Research Library is
EMPTY (no uploaded papers) so research size is not the bottleneck.

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
  Stripe adds five more once billing is switched on (`STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`,
  `SUPABASE_SERVICE_ROLE_KEY` — the first two and the service-role key marked
  SECRET) plus `VITE_BILLING_ENABLED`. See the Aug 29 Stripe block.

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

## ⭐ OFFICIAL GOOGLE ACCOUNT

> **SUPERSEDED Aug 23 2026 — DO NOT USE SocratesIQEd@gmail.com.** That account was
> SUSPENDED by Google and is gone; the Cloud project + OAuth client described in this
> section are DEAD. The official Google account is now **will@socratesiq.com** (Workspace
> on the socratesiq.com domain), with a fresh project/OAuth client/API key. See the
> "GOOGLE ACCOUNT REBUILD (Aug 23 2026)" block near the top of this file for the current,
> correct setup. The text below is kept only as history of the July 12 migration.

### (Historical, July 12 2026) — the now-dead SocratesIQEd setup

**SocratesIQEd@gmail.com WAS the official Google account for everything**
(Google Cloud, Drive integration, and eventually all Google login OAuth).
Will's explicit decision at the time. The OLD account `socratesaiedu@gmail.com` — which
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

## Assignment credits / monthly allowance (built July 20 2026)

Goal: move teachers toward a paid plan — **$9.99/month = 20 assignments**, resets
monthly, NO rollover. Because signup/login is already REQUIRED (LoginDialog is
non-dismissable), every user is a known account with an email on file (Will's
follow-up list). The plan Will chose:
- **Trial = 3 assignments (lifetime, no reset)** → then a WALL: "You've used your
  3 free assignments. $9.99/mo plans launching soon — we'll email you." (Payments
  aren't live yet, so the wall collects interest; email already captured at signup.)
- **Paid = 20/month, resets monthly, no rollover.** No teacher is on 'paid' until
  Stripe is wired OR Will manually upgrades them (SQL snippet at the bottom of
  migration-credits.sql).
- **Unlimited = comp/staff/beta accounts** that never wall. There is NO special
  login for these — the person signs up normally, then Will flips their plan with
  one email-matched SQL line (upsert snippet at the bottom of migration-credits.sql).
  `credit_allowance('unlimited')` = 1,000,000 so it never runs out; the UI and the
  metrics_credits view special-case it to show "Unlimited"/null rather than a number.
- **"1 assignment" = analyzing ONE new assignment.** Every follow-up for that same
  assignment — re-analysis, revisions, lesson plan, student directions, downloads
  — is FREE. Detected client-side by a 120-char prefix of the assignment text
  (lastChargedRef); applyVersion + New Assignment + opening from library reset it.

BUILT (code shipped):
- `supabase/migration-credits.sql` — `user_credits` table (user_id, plan, used,
  period_start) + two SECURITY DEFINER functions: `get_assignment_credits()`
  (read balance, auto-creates the row, applies monthly reset for paid) and
  `consume_assignment_credit()` (atomically spends 1, returns allowed=false at 0
  WITHOUT charging). RLS = teacher can SELECT own row only; NO direct update, so
  **the counter can't be tampered with** — the functions (run as owner) are the
  only writers. `credit_allowance(plan)` = 3 trial / 20 paid, in one place.
- `src/lib/supabase.ts` — `getCredits()` / `consumeCredit()` call those RPCs;
  fail OPEN (return null → analyzer lets the run through) so an infra hiccup or a
  not-yet-migrated DB never blocks a teacher.
- `AssignmentAnalyzer.tsx` — spends a credit only on a NEW assignment; shows a
  live "X of N assignments left" counter under the Analyze button; a wall Dialog
  at 0 (trial: "launching soon / Notify me"; paid: "resets next month").
- `App.tsx` Settings — a counter card under the teacher's profile (remaining /
  allowance, progress bar, "See plans" link, reset rules).
- `supabase/views-metrics.sql` — new `metrics_credits` view (email, plan, used,
  allowance, remaining) for the behind-the-scenes dashboard.

GRACEFUL ROLLOUT: before Will runs the migration the RPCs 404 → getCredits/
consumeCredit return null → app behaves exactly as before (no counter, no limit).
Limits switch on the moment `migration-credits.sql` is run. So the code is safe to
deploy first and activate later.

WILL'S STEPS (do IN THIS ORDER, walk him through one at a time):
1. Supabase → SQL Editor → New query → paste + run `supabase/migration-credits.sql`
   (creates user_credits + the 3 functions). Expect "Success. No rows returned."
2. Re-run `supabase/views-metrics.sql` (now includes metrics_credits). Same result.
3. Trigger a Netlify deploy so the counter/wall UI goes live.
KNOWN LIMIT (acceptable pre-revenue): enforcement is the DB functions, but a teacher
can't edit their own counter (SELECT-only RLS). Real billing lands with Stripe;
see parked task. To hand-upgrade a teacher to paid: run the update statement at the
bottom of migration-credits.sql with their uuid (Authentication → Users).

## Saved assignment reports (built July 22 2026)

Problem Will hit: opening a saved library item just dumped the redesigned text
back into the analyzer input (inviting a pointless second redesign). Fix: a
saved item is now a full SNAPSHOT, and opening it shows a READ-ONLY report.
- On "Save to Library", AssignmentAnalyzer now stores `report` (the AnalysisResult),
  `lessonPlan`, `directions`, `aiStrategy`, `subject`, `gradeLevel` alongside the
  existing title/fullText/score/level. Lesson plan + directions are lifted out of
  LessonPlanPanel via a new `onGenerated` callback (and can be re-hydrated with the
  new `initialPlan`/`initialDirections` props).
- `SavedReportView.tsx` (new) renders it read-only: redesigned assignment (+PDF/Word/
  GDoc), the report (summary + AIFailureBreakdown + dimensions, +PDF/Word), and the
  lesson plan + student directions. If the plan/directions weren't generated before
  saving, LessonPlanPanel shows its Generate button — FREE (lesson plans never cost a
  credit; only a new analyze does). A "Redesign again" button loads it back into the
  analyzer (which would count as a new assignment / 1 credit).
- App.tsx: new `report` viewMode + `openedReport` state. LibraryView `onOpen` branches:
  items WITH a `report` open the read-only view; older items without one fall back to
  the analyzer input (backward compatible).
- Storage: cloud `assignments` gets a `payload jsonb` column (the snapshot). saveAssignmentToCloud
  writes it and FALLS BACK to a base-only upsert if the column doesn't exist yet, so
  saving never breaks pre-migration. fetchAssignmentsFromCloud spreads `row.payload`.
  localStorage just serializes the extra fields.
- WILL'S STEP: run `supabase/migration-assignment-report.sql` (one line —
  `alter table assignments add column if not exists payload jsonb`). Until then, newly
  saved items store the snapshot only in the browser (cloud saves the base row).

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

WILL'S DASHBOARD STEPS — IN PROGRESS (walk him through, one step per message):
- Step 1 of 3 (DELIVERED July 19 2026, awaiting his "Success"): Supabase → SQL
  Editor → New query → paste + run `supabase/migration-usage.sql`. Expected
  result: "Success. No rows returned." Creates the `usage_events` table.
- Step 2 of 3 (NEXT): SQL Editor → New query → paste + run
  `supabase/views-metrics.sql`. Creates the 5 metrics views.
- Step 3 of 3: Trigger a Netlify deploy (Deploys → Trigger deploy → Deploy site)
  so the logging code goes live. Data starts accumulating immediately.
OBJECT NAMES (already set by the SQL — Will does NOT type these; they're created
automatically): table = `usage_events`; views = `metrics_overview`,
`metrics_growth`, `metrics_unit_economics`, `metrics_by_user`,
`metrics_by_subject`. The only thing Will names is the cosmetic SQL Editor
"query" tab label (suggested: "SocratesIQ – usage table" and "SocratesIQ –
metrics views") — purely for his own reference, affects nothing. To view later:
Supabase → Table Editor → click any `metrics_*` view.
NOTE: no new env var needed — the functions log with the existing anon key
(RLS insert policy). START LOGGING ASAP — history can't be backfilled.
OPEN QUESTIONS for Will: (a) also want a weekly EMAIL digest (push, zero login)?
(b) any field changes? Phase 3 (retention cohorts, CSV export, optional PostHog)
is future work.

## Parked tasks (Will's backlog, roughly by priority)

0. ~~**Redesign version history in the "Revise" box**~~ BUILT Aug 29 2026 on
   `claude/socrates-handoff-continue-z2f5c7` (chips + compare + inline-edit
   versions; see the Aug 29 block at the top) — awaiting Will's preview test and
   merge. Original ask, for reference:
   Before, the Revise box under each redesign OVERWROTE the current version
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
7. ~~Payments (Stripe)~~ **DONE and LIVE Aug 29 2026** — merged in PR #18,
   configured in Stripe LIVE mode, ToS review cleared, dashboard wiring finished
   (env vars, SQL, webhook). The only thing left is putting a real purchase
   through end to end; see the evening block at the top of this file.
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
12. Security-advisor follow-ups (July 22 2026): the CRITICAL findings are fixed
    (metrics views set to security_invoker + revoked from anon/authenticated;
    credit functions have pinned search_path + execute restricted to authenticated).
    REMAINING (low priority): (a) "Leaked Password Protection" — Pro-plan only, so
    deferred until Will upgrades (not a hole; passwords are already hashed). (b)
    `research_papers` has "RLS Policy Always True" policies from the old admin
    Research Library — not user/student data, low risk, but tighten the read/write
    rules when convenient. (c) "Signed-in users can execute" the credit functions
    and the `usage_events` insert-only `true` policy are BY DESIGN — safe to dismiss.

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
