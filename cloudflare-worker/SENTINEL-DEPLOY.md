# Nia Free — Deploy the Sentinel Worker

This is a separate worker from the website chatbot. It powers the NEXT OS
Sentinel agent's free tier (Llama 3.3 70B via Cloudflare Workers AI).

## One-time setup

Already done if you deployed the website chatbot worker:
- Cloudflare account active
- `wrangler` CLI installed and logged in

If not, run once in PowerShell:

```powershell
npm install -g wrangler
wrangler login
```

## Deploy the Sentinel worker

From inside the NEXT_OS folder:

```powershell
cd "C:\Users\LIZ\Downloads\NEXT_OS (2)\NEXT_OS\cloudflare-worker"
wrangler deploy --config sentinel-wrangler.toml
```

Wrangler prints the deployed URL — something like
`https://nextos-sentinel.<your-subdomain>.workers.dev`.

## Wire the URL into the OS

If your worker URL is different from the default in `os-agent.jsx`
(`https://nextos-sentinel.nextafricaai.workers.dev`), do ONE of:

**Option A — quick override (per browser):**
Open NEXT OS, then in DevTools console:
```js
window.NEXT_OS_SENTINEL_ENDPOINT = 'https://nextos-sentinel.YOUR-SUB.workers.dev';
location.reload();
```

**Option B — permanent (recommended):**
Open `os-agent.jsx`, change line:
```js
const NIA_FREE_ENDPOINT = 'https://nextos-sentinel.nextafricaai.workers.dev';
```
to your real URL, then re-inline into `NEXT OS.html`.

## Cost

Free tier: ~10,000 neurons/day on Cloudflare Workers AI.
Each Sentinel call is roughly 1–5 neurons depending on tool loops.
That's ~2,000–10,000 conversations per day at zero cost.

## Test it

1. Open `NEXT OS.html` in your browser
2. Click "Talk to Sentinel" in the sidebar
3. The provider should already be **Nia Free (Llama 3.3 · no key)**
4. Type: `What's happening at Peak Primary?`
5. She should call `read_tenant("peak-primary")` then summarise the
   fee/attendance signals back to you.

## Falling back to Claude

If Nia Free gives you weak answers on a high-stakes task, click
**SWITCH AGENT** → choose **Claude (Anthropic)** → paste your
`sk-ant-...` key. Same tools, sharper reasoning.

---

## Self-healing: one-time setup (needs your credentials, can't be scripted for you)

These steps touch your GitHub account and your live Supabase project, so
they have to be run by you — an agent shouldn't hold write access to your
GitHub repo or execute schema changes against a database with real student
records without you reviewing them first.

### 1. Rescue KABSLILY (and the rest of the fleet directory)

Open the Supabase SQL editor for this project and run, in order:
- `cloudflare-worker/supabase-seed-tenants-directory.sql` — this is the fix
  for the actual bug: the `tenants` directory table is empty in production,
  so the Fleet Dashboard only ever shows its two hardcoded fallback rows and
  KABSLILY never appears, even though its 148 students/12 teachers/fees rows
  have been live in Supabase for days. This seeds real directory rows
  (KPIs computed from the live child tables, not fabricated) and opens
  anon SELECT on the directory table.
- `cloudflare-worker/supabase-sync-errors-webhook.sql` — creates the
  `sync_errors` table used by step 3 below.

### 2. Give the worker a GitHub PAT

Create a fine-grained GitHub Personal Access Token scoped to just this repo
(`nextafricaai-alt/next-os`) with **Contents: read/write** and
**Pull requests: read/write** permissions. Then:

```powershell
cd cloudflare-worker
wrangler secret put GITHUB_PAT --config sentinel-wrangler.toml
wrangler secret put GITHUB_REPO --config sentinel-wrangler.toml   # value: nextafricaai-alt/next-os
wrangler deploy --config sentinel-wrangler.toml
```

Self-healing (`triggerSelfHealing` in `sentinel-worker.js`) never pushes to
`main` directly — it creates a `sentinel/self-heal-<incident>` branch and
opens a pull request for you to review and merge. If `GITHUB_PAT` or
`GITHUB_REPO` isn't set, it silently no-ops (crashes still get logged to
`BRIEFS_KV`, nothing is attempted against GitHub).

### 3. Wire the Supabase → Sentinel failure webhook

In the Supabase Dashboard: **Database → Webhooks → Create a new webhook**
- Table: `sync_errors`
- Events: `INSERT`
- Type: HTTP Request, POST
- URL: `https://nextos-sentinel.<your-subdomain>.workers.dev/webhook/db-error`
- Headers: `Content-Type: application/json`

The frontend already writes to `sync_errors` on any failed Supabase insert
(via `logSyncError` in `os-data.jsx`, and the CSV importer's error path).
The webhook turns those into the same crash-payload shape `/telemetry`
uses, and feeds the same self-healing pipeline.
