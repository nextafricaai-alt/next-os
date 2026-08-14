# NEXT Business OS — Provisioning a new business

This is step 2 of the pipeline. Step 1 is the onboarding wizard
(`web/prototypes/business/onboarding/index.html`), which produces a
`business-config.json`-shaped object — that's the input to everything below.

There is no confirmed API for creating Supabase projects programmatically, so
this flow is **semi-manual**: `stamp-template.js` automates everything inside
the app itself, but a person has to click through the Supabase dashboard for
the handful of steps that create real, billable cloud infrastructure. Budget
about 15–20 minutes per business the first few times you do this.

## What you need before you start

- The finished `business-config.json` from the onboarding wizard (Step 8 →
  "Create My Business OS" saves it to `localStorage['nextbiz.lastOnboarding']`
  in the browser that ran the wizard — copy it out from there, or have the
  wizard's owner send you the JSON block shown on that screen).
- Node.js (to run `stamp-template.js`).
- Access to create a new project in a Supabase organization.

## Step 1 — Create a dedicated Supabase project

**Do this manually in the Supabase dashboard — never skip it.** Every
business needs its own project. `supabase.js` in the shared template
currently points at Charis Creations' own real production database; if that
were ever deployed unchanged for another business, their data would land
directly in Charis's live database, mixed in with Charis's actual clients.
`stamp-template.js` refuses to leave that pointed at Charis's project — it
either stamps in the real credentials you supply or leaves obvious
`REPLACE_ME` placeholders that won't run.

1. https://supabase.com/dashboard → **New project**.
2. Name it after the business (e.g. `sunrise-fashion-house`). Pick a region
   close to the business.
3. Wait for provisioning to finish (~2 minutes).
4. **Settings → API** — copy the **Project URL** and the **anon / public**
   key. You'll pass both to `stamp-template.js` next.

## Step 2 — Stamp the app

```bash
node stamp-template.js \
  --config /path/to/business-config.json \
  --out /path/to/deployed/<business-slug> \
  --supabase-url https://xxxxxxxx.supabase.co \
  --supabase-anon sb_publishable_xxxxxxxx
```

This copies the template, then stamps: company name/tagline/contact/currency/
brand color/logo, the login screen (logo, tagline, email placeholder), the
pipeline stages and their per-stage QC checklists, nav/header/button
vocabulary, and `supabase.js` — all in one pass. It also empties every
Charis-specific seed array (real crew names, real gear list, real service
menu) so the business starts from zero, not from Charis's own roster. See the
comments at the top of `stamp-template.js` for the full list of what's
touched and why; `business-config.json` is written into the output folder
too, for your own reference.

**Known gap:** a handful of print/report templates deep in the codebase
(WhatsApp invoice messages, monthly PDF reports, a couple of print
footers — about a dozen spots) still say "Charis Creations Limited" /
Charis's real contact details literally. These weren't in scope for this
pass (see the "nav & headers only" vocabulary decision) since they're rare,
specific document generators rather than everyday UI. If a business
generates one of these documents before that gap is closed, check it before
sending it to a client.

## Step 3 — Run the schema against the new project

1. Open the new Supabase project → **SQL Editor**.
2. Paste the full contents of `<output-dir>/schema.sql` (copied over
   unmodified — it's already business-agnostic) and run it.

## Step 4 — Create the owner's login

There's no self-service signup screen — CharisOS only has a **Sign In**
button. Every other account gets created from inside the app (Settings →
Users), but that needs someone to already be logged in, so the very first
account has to be created directly:

1. New Supabase project → **Authentication → Users → Add user**.
2. Email: the owner's email from `business-config.json` (`owner.email`).
   Set a temporary password and share it with them out of band — never send
   real passwords in plain chat/email if you can help it.
3. That's their login for the app you deployed in Step 2. Once they're in,
   they can create logins for the rest of their team from Settings.

## Step 5 — Deploy the stamped folder

`<output-dir>` from Step 2 is a complete, static site — no build step,
same deployment shape as the rest of this repo's prototypes. Upload it to
whatever static host the business is going on (same FTPS pipeline as the
school product, a new subdomain, Netlify/Vercel, etc.) and point them at the
URL.

## Order of operations, summarized

```
onboarding wizard → business-config.json
        │
        ▼
Step 1: create Supabase project (manual) ──► project URL + anon key
        │
        ▼
Step 2: node stamp-template.js --config ... --out ... --supabase-url ... --supabase-anon ...
        │
        ▼
Step 3: run <output>/schema.sql in the new project's SQL Editor (manual)
        │
        ▼
Step 4: create the owner's auth user in the new project (manual)
        │
        ▼
Step 5: deploy <output-dir> as a static site
```
