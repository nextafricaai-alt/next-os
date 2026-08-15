# NEXT Business OS — Provisioning a new business

This is step 2 of the pipeline. Step 1 is the onboarding wizard
(`web/prototypes/business/onboarding/index.html`), which produces a
`business-config.json`-shaped object — that's the input to everything below.

**Creating the Supabase project, applying the schema, and inviting the
owner are now fully automated** via `provision-business.js`, and can be
kicked off three ways — a button right in the onboarding wizard (Option A,
zero copy-pasting once set up), the GitHub Actions UI by hand (Option B),
or locally (Option C). The only thing left manual is deploying the stamped
output somewhere — see Step 3.

## What you need before you start

- The finished `business-config.json` from the onboarding wizard (Step 8 →
  "Copy Config JSON").
- A **Supabase Personal Access Token** (PAT) with project-creation rights —
  generate one at https://supabase.com/dashboard/account/tokens. Treat it
  like a password; it carries the same privileges as the account that made
  it.
- A **paid Supabase organization** (Pro or Team). The Free plan caps at 2
  projects total across your whole account, regardless of how many orgs you
  spread them across — real multi-business provisioning needs a paid org
  with billing already set up, or project creation will start failing after
  the 2nd business.
- Node.js 18+ (native `fetch`), if running this locally instead of via the
  GitHub Action.

## Option A — Click "Start Provisioning" in the wizard (no copying anything)

The onboarding wizard's last step has a **Start Provisioning** button
(next to Copy Config JSON) that skips the copy-paste entirely — it POSTs
the finished config straight to the `nextos-sentinel` Cloudflare Worker,
which triggers the GitHub Action below on your behalf and hands you back a
link to watch it run.

**One-time setup**, in addition to the `SUPABASE_ACCESS_TOKEN` GitHub
secret from Option B below:

1. Generate a GitHub token with `repo` scope (classic PAT, or a
   fine-grained token with "Actions: write" on this repo) — this is
   different from the Supabase token, and separate from whatever token this
   repo's own git remote uses. GitHub → Settings → Developer settings →
   Personal access tokens.
2. Add it as a secret on the `nextos-sentinel` Worker (not GitHub —
   `wrangler secret put GH_DISPATCH_TOKEN --name nextos-sentinel`, or via
   the Cloudflare dashboard → Workers → nextos-sentinel → Settings →
   Variables and Secrets).
3. Deploy the updated worker: `cd cloudflare-worker && wrangler deploy
   --name nextos-sentinel` (this doesn't happen automatically — there's no
   CI pipeline for this worker, someone has to run it).
4. The wizard's button is gated behind the same operator PIN the school
   onboarding form already uses (`GATE_PIN` on the worker, defaults to
   `1379` if unset — change it) — anyone who found the wizard page
   otherwise could trigger real, billable Supabase project creation with no
   gate at all.

Once that's done: fill out the wizard, click **Start Provisioning**, enter
the PIN, and it does everything Option B does — you never touch GitHub's
UI or copy any JSON.

**One limitation of this path specifically:** GitHub's `workflow_dispatch`
API has a real size cap on its inputs, and an uploaded logo's base64 data
blows through it (confirmed live — a config with a logo gets a 422 "inputs
are too large"). The worker strips the logo before dispatching so the run
still succeeds; the stamped app just falls back to a generated brand-color
initial badge instead of the real logo. CharisOS has no in-app way to add
a logo afterward, so if the real logo matters for this business right now,
use **Copy Config JSON** (which still has the logo — only the auto-trigger
path strips it) with Option B or C below instead of the button.

## Option B — Run the GitHub Action by hand

1. One-time setup: add the PAT as a repository secret named
   `SUPABASE_ACCESS_TOKEN` (Settings → Secrets and variables → Actions →
   New repository secret). This repo is public, so this is the only place
   the token should ever live — never paste it into an issue, a PR, or chat.
2. Actions tab → **Provision a new Business OS client** → **Run workflow**.
3. Paste the whole `business-config.json` block into the `business_config_json`
   field. Leave `org_slug` blank unless the token belongs to more than one
   organization (the run will tell you the choices if so).
4. Run it. It takes a few minutes — Supabase project creation alone is
   usually 1-2 minutes.
5. Download the `stamped-app` artifact from the finished run. That's the
   business's ready-to-deploy copy — go to Step 3 below.

The workflow log and the artifact are both public (this repo is public).
That's fine by design: `provision-business.js` never generates, prints, or
stores a real password anywhere — the owner is invited by email and sets
their own password directly with Supabase, and the only Supabase key baked
into the stamped output is the `anon` key, which is meant to be public
client-side (that's what "anon" means; it's not a secret, Row Level Security
is what actually protects the data).

## Option C — Run it locally

```bash
cd web/prototypes/business/provisioning
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx node provision-business.js \
  --config /path/to/business-config.json \
  --out /path/to/deployed/<business-slug> \
  [--org-slug your-org-slug] [--region us-east-1]
```

This does everything the manual version used to ask a human for:

1. Creates a dedicated Supabase project for the business (never Charis's own
   — `stamp-template.js`, which this calls internally, refuses to leave the
   output pointed at Charis's real production project).
2. Waits for the project to come online.
3. Runs `schema.sql` against it (copied over unmodified from the template —
   it's already business-agnostic).
4. Invites the owner (`business-config.json` → `owner.email`) by email —
   Supabase's built-in email service sends them a link to set their own
   password. It's rate-limited and can land in spam; tell them to check
   there if it doesn't arrive quickly.
5. Stamps the app template (company identity, pipeline stages, per-stage QC
   checklists, nav/header/button vocabulary — see `stamp-template.js`'s own
   header comment for the full list) with the new project's real URL and
   anon key, and empties every Charis-specific seed array (real crew names,
   real gear list, real service menu) so the business starts from zero.

**Known gap, unrelated to this automation:** a handful of print/report
templates deep in the codebase (WhatsApp invoice messages, monthly PDF
reports, a couple of print footers — about a dozen spots) still say "Charis
Creations Limited" / Charis's real contact details literally. Out of scope
for the "nav & headers only" vocabulary pass (see `business-presets.js`)
since they're rare, specific document generators rather than everyday UI —
check one before it goes to a client, if a business generates one early.

## Step 3 — Deploy the stamped folder

The output directory (from either option above) is a complete, static
site — no build step, same deployment shape as the rest of this repo's
prototypes. Upload it to whatever static host the business is going on
(same FTPS pipeline as the school product, a new subdomain, Netlify/Vercel,
etc.) and point them at the URL. This is the one remaining manual step —
automating it needs a deploy-target decision (one subdomain per business?
a folder per business under one domain? something else?) that hasn't been
made yet.

## Order of operations, summarized

```
onboarding wizard → business-config.json
        │
        ├─ Option A: click "Start Provisioning" in the wizard
        │     └─ nextos-sentinel Worker → triggers the GitHub Action below
        ├─ Option B: paste into the GitHub Actions "Run workflow" UI
        └─ Option C: pass --config to provision-business.js locally
                │
                ▼
     provision-business.js actually runs, either way:
       ├─ create Supabase project
       ├─ wait for it to come online
       ├─ run schema.sql
       ├─ invite the owner by email
       └─ stamp the app template with the real project's URL + anon key
                │
                ▼
     Step 3: deploy the stamped output as a static site (manual)
```
