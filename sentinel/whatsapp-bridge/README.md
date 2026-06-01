# WhatsApp Bridge — Setup Guide

The bridge takes a Sentinel advisory, renders it as a leader-friendly WhatsApp message, and sends it via Twilio. Below is the path from zero-to-working on your phone.

## What you need from Twilio

The cheapest, fastest start is the **Twilio WhatsApp Sandbox**. Free, no Meta verification, but you can only send to phones that have opted in by texting a magic word to a shared sandbox number. Perfect for the first demo with your own phone.

When you're ready for real clients, you upgrade to a **WhatsApp Business** number — that needs Meta business verification (1–3 days) and a Twilio-purchased number (~$5/month).

## Step 1 — Twilio account (5 minutes)

1. Sign up: https://www.twilio.com/try-twilio
2. From the console, grab two things from the dashboard:
   - **Account SID** (looks like `ACxxxx...`)
   - **Auth Token** (click "Show" to reveal)
3. Save them somewhere safe. The auth token is a password — don't commit it.

## Step 2 — Activate the Sandbox (2 minutes)

1. In the Twilio console, go to **Messaging → Try it out → Send a WhatsApp message**.
2. You'll see a sandbox number (e.g. `+1 415 523 8886`) and a join code (e.g. `join silver-mountain`).
3. On your own WhatsApp, send the join code as a message to the sandbox number. You'll get a confirmation.
4. **From now on, any phone that wants to receive WhatsApp from your Sentinel must send that same join code first.** Sandbox limitation — gone once you upgrade.

## Step 3 — Configure the bridge

Create `sentinel/.env` (do not commit — already in `.gitignore` when we add one) with:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

The `FROM` value is Twilio's shared sandbox number until you upgrade.

## Step 4 — Tell Sentinel where to send your messages

For now (local SQLite), open a database client against `sentinel/data/sentinel.db` and insert your phone number into the `channels` table:

```sql
INSERT INTO channels (tenant_id, kind, whatsapp_to, enabled)
VALUES ('st-marys-demo', 'whatsapp', '256701234567', 1);
```

Replace `256701234567` with your actual WhatsApp number (country code + number, no plus, no spaces).

When we move to Supabase, this becomes a row in the `channels` table created by `supabase/002_channels.sql`.

## Step 5 — Run the bridge

```powershell
cd sentinel
npm run build
npm run whatsapp
```

In a separate terminal, generate an advisory (e.g. by running the financial-leak demo or inserting directly). The bridge polls every 1.5 seconds, renders, sends.

Successful output looks like:

```
{"service":"whatsapp-bridge","status":"running"}
{"service":"whatsapp-bridge","advisoryId":"adv_001","to":"256701234567","success":true,"twilioSid":"SMxxxx..."}
```

Your phone gets the message within a few seconds.

## Going to production (later — for real client deployments)

Three things change:

1. **Buy a WhatsApp Business number from Twilio** (~$5/month). Tied to your real business.
2. **Submit message templates to Meta for approval.** For session messages (within 24 hours of the leader messaging you), no template is needed. For cold pings, every reusable message template must be pre-approved by Meta. We'll prepare 3–5 standard templates ("financial-leak", "enrollment-warning", "donor-drought", etc.) and submit them once.
3. **Move the bridge into Supabase Edge Functions** so it runs in the cloud, not on a local terminal. The code is structured to make this a small change — `fetch` and Buffer.from work unchanged.

## Cost reality

- Twilio WhatsApp Sandbox: **free**, demo only.
- Twilio production: roughly **$0.005–$0.05 per WhatsApp message** depending on country/category, plus the monthly number rental.
- For a school with one advisory per day per leader, you're looking at ~$2/month per school. Buildable into the SaaS pricing easily.

## When something goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| `errorCode: 21211` | The `To` number isn't in E.164 format | Use `256701234567`, no spaces, no plus |
| `errorCode: 63007` | Recipient hasn't joined the Sandbox | Have them text the join code first |
| `errorCode: 20003` | Bad Twilio credentials | Re-check Account SID + Auth Token |
| No messages appearing, but bridge running | No matching row in `channels` table | Insert the row from Step 4 |
| `errorMessage: "WhatsApp bridge requires..."` on startup | Missing env vars | Source the `.env` file before `npm run whatsapp` |

The `whatsapp_deliveries` table logs every attempt — `SELECT * FROM whatsapp_deliveries ORDER BY id DESC LIMIT 10;` to see what actually happened.
