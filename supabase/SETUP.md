# Setting up Supabase for Socrates

Supabase is **optional**. Without it, Socrates runs in local/demo mode: anyone
can "log in" with any name, saved work lives only in that browser, the Research
Library upload won't persist, and the Admin Dashboard shows placeholder numbers.

Turn Supabase on to get **real teacher accounts, cloud-synced libraries, and a
working Research Library**. It takes about 10 minutes.

## 1. Create a project
1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine).
2. Click **New project**. Give it a name (e.g. "socrates"), set a database
   password (save it somewhere), pick a region close to your users, and create it.

## 2. Create the database tables
1. In your project, open **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this repo, copy the whole file, paste it in,
   and click **Run**. You should see "Success". This creates the `assignments`
   and `research_papers` tables with secure access rules.

## 3. Turn on email/password sign-in
1. Go to **Authentication → Providers → Email**.
2. Make sure **Email** is enabled.
3. For the smoothest teacher experience while testing, you can turn **off**
   "Confirm email" (Authentication → Providers → Email → "Confirm email"); turn
   it back on before a wide launch so accounts are verified.

## 4. Copy your keys
1. Go to **Settings → API**.
2. Copy the **Project URL** and the **anon public** key.

## 5. Add the keys to Netlify
1. In Netlify: **Site configuration → Environment variables**.
2. Add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
   - `ANTHROPIC_API_KEY` = your Anthropic key (this one powers the analyzer)
3. **Redeploy** the site. `VITE_*` variables are baked in at build time, so a
   new deploy is required for them to take effect.

## 6. Verify
- Sign up with a real email — you should get a real account.
- Save an analysis, then log in from another browser; it should sync.
- In the Admin → Research Library, upload a PDF; it should persist after reload
  and its text will be included in future analyses.

## Security note
The in-app admin password is bundled into the frontend, so it is **not** a real
secret. It's fine as a soft gate, but don't rely on it to protect sensitive
data. For stricter control, add a real admin role in Supabase and tighten the
`research_papers` policies in `schema.sql`.
