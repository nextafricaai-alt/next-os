# Nia Always On — Setup Guide

Nia now runs on Cloudflare's edge 24/7. She supervises Peak Primary
without you opening NEXT OS, then WhatsApps you when something needs
attention.

## What's already wired

- ✅ **Server-side tenant state** in `sentinel-worker.js` (TENANTS_SEED)
- ✅ **Health evaluator** that scores each tenant for concerns
- ✅ **AI-composed briefs** in Nia's voice (uses Llama 3.3 70B for free)
- ✅ **WhatsApp delivery** via Meta Cloud API
- ✅ **Cron triggers** on three schedules

## The cron schedule

| When | What Nia does | Cron (UTC) |
|---|---|---|
| **6:30 AM EAT daily** | Morning brief — overnight signals, today's priorities | `30 3 * * *` |
| **9am, noon, 3pm EAT** (Mon-Fri) | School-day pulse check — only pings if something changed | `0 6,9,12 * * 1-5` |
| **Friday 6 PM EAT** | Weekly wrap — fee delta, attendance trend, top performers | `0 15 * * 5` |

EAT is Uganda time (UTC+3). All crons subtract 3 hours.

## What you need to deploy this

### Required for Nia to text you

You need three Cloudflare Worker secrets set:

| Secret | What it is | Where it comes from |
|---|---|---|
| `WHATSAPP_TOKEN` | Meta Cloud API access token | Meta App → WhatsApp setup page (see WHATSAPP-SETUP.md) |
| `WHATSAPP_PHONE_ID` | The numeric ID of your sender number | Meta App → WhatsApp setup page |
| `HUDSON_PHONE` | YOUR personal WhatsApp number (recipient) | Your phone, digits only, with country code |

### Set the secrets

In PowerShell:

```powershell
cd "C:\Users\LIZ\Downloads\NEXT_OS (2)\NEXT_OS\cloudflare-worker"

wrangler secret put WHATSAPP_TOKEN --config sentinel-wrangler.toml
# paste EAA... token

wrangler secret put WHATSAPP_PHONE_ID --config sentinel-wrangler.toml
# paste numeric phone ID

wrangler secret put HUDSON_PHONE --config sentinel-wrangler.toml
# paste YOUR WhatsApp number (e.g. 256772XXXXXX)
```

### Deploy the worker

```powershell
wrangler deploy --config sentinel-wrangler.toml
```

You should see:

```
Uploaded nextos-sentinel
Deployed nextos-sentinel triggers
  https://nextos-sentinel.nextafricaai.workers.dev
  schedule: 30 3 * * *
  schedule: 0 6,9,12 * * 1-5
  schedule: 0 15 * * 5
```

The three `schedule:` lines confirm cron is active.

## Test it RIGHT NOW (no waiting for cron)

Trigger a manual brief from PowerShell:

```powershell
curl -X POST https://nextos-sentinel.nextafricaai.workers.dev/supervise `
  -H "Content-Type: application/json" `
  -d '{\"kind\": \"morning\"}'
```

Replace `morning` with `pulse` or `weekly` to test the other formats.

What you'll see:

- If WhatsApp is configured → your phone buzzes within ~5 seconds with
  Nia's brief
- If WhatsApp is not configured → the response JSON includes the brief
  text under `text` so you can preview it before going live

## Watching it in production

To see Nia's autonomous activity in real time:

```powershell
wrangler tail nextos-sentinel
```

Leave that terminal open. Every time a cron fires (or you hit
`/supervise`), you'll see `[Nia Always On] morning brief — sent=true`.

## Behavior rules

- **If nothing's happening, Nia stays silent.** No pings for the sake
  of pinging. Only sends when concerns are flagged.
- **Pulse checks are quieter than morning briefs.** Pulse only fires
  on new signals; morning always runs.
- **Weekly wrap always sends** — even on a quiet week, Friday gets a
  one-line "all clear" summary.

## Multi-tenant extension (when you onboard tenant #2)

Right now `TENANTS_SEED` in `sentinel-worker.js` has one entry: Peak
Primary. To add a new tenant:

1. Edit `sentinel-worker.js`, add a new object to `TENANTS_SEED`
2. Re-deploy: `wrangler deploy --config sentinel-wrangler.toml`
3. Done — Nia now supervises both

When tenant count crosses ~5, we move TENANTS_SEED to Cloudflare KV or
Supabase so you can edit tenant state without re-deploying. That's a
30-min upgrade when you need it.

## Cost

Cloudflare Workers free tier:
- 100,000 requests/day → plenty for cron + manual triggers
- 10 million CPU ms/day → Llama brief composition uses ~500ms each
- Workers AI: 10,000 neurons/day → ~1,500 briefs/day possible

Meta WhatsApp Cloud API:
- Free for first 1,000 conversations/month
- A daily morning brief to one number = 30 conversations/month → free

**Total ongoing cost: $0/month** until Peak Primary scales to dozens
of parent threads/day or you onboard 50+ schools.

## When something breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| `wrangler tail` shows "whatsapp_not_configured" | Secrets not set | Run the three `wrangler secret put` commands |
| `wrangler tail` shows "(#131030) Recipient not in allowed list" | You're still in Meta test mode | Add HUDSON_PHONE to verified list in Meta App; or finish business verification |
| Cron never fires | Wrangler.toml `[triggers]` section missing | Confirm it's present, redeploy |
| Brief text feels off | Llama wrote weak prose | Tweak `sysPrompt` in `composeBrief()` |
