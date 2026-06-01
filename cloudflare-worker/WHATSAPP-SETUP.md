# Wire Real WhatsApp Sending — Path B (Meta Cloud API)

Path A (`open_whatsapp`) works out of the box — Nia opens WhatsApp on your
device with the message pre-filled, you tap Send.

Path B (`send_whatsapp`) makes Nia actually press Send for you through
Meta's WhatsApp Cloud API. Free for the first 1,000 conversations a month.
This guide gets you there in ~30 minutes.

## 1. Create a Meta Business account

1. Go to https://business.facebook.com and sign in with your personal
   Facebook account (you don't need to use Facebook personally — this is
   just for ownership).
2. Click **Create Account** in the top right.
3. Business name: `NEXT` (or `Charis Creations`). Use your real name and
   work email.

## 2. Create a Meta App for WhatsApp

1. Go to https://developers.facebook.com/apps and click **Create App**.
2. Pick **Other** → **Business** → name it `NEXT Sentinel`.
3. Attach the business account you just made.
4. On the app dashboard, find **WhatsApp** → click **Set up**.

## 3. Get your three secrets

On the WhatsApp setup page you now see:

- **Phone number ID** — a long number near the top. Copy it. This is your
  `WHATSAPP_PHONE_ID`.
- **Temporary access token** — a long string starting with `EAA...`.
  Copy it. This is your `WHATSAPP_TOKEN`. It expires in 24 hours — fine
  for testing. For permanent use, generate a System User token in
  **Business Settings → Users → System Users** (60-day or never-expiring).
- **Test recipient phone number** — add your own number to the verified
  list so Meta lets you send to it.

## 4. Add the secrets to your worker

In PowerShell:

```powershell
cd "C:\Users\LIZ\Downloads\NEXT_OS (2)\NEXT_OS\cloudflare-worker"

wrangler secret put WHATSAPP_TOKEN --config sentinel-wrangler.toml
# paste the EAA... token, press Enter

wrangler secret put WHATSAPP_PHONE_ID --config sentinel-wrangler.toml
# paste the numeric phone ID, press Enter
```

Then redeploy:

```powershell
wrangler deploy --config sentinel-wrangler.toml
```

## 5. Test it

Open NEXT OS → Talk to Sentinel → ask:

> *Send a WhatsApp to 256772XXXXXX saying "NEXT OS test — Nia just sent
> her first real message."*

Replace `256772XXXXXX` with the number you verified in step 3 (your own).
Nia will call `send_whatsapp` and you should see:
1. A green success toast pop up in NEXT OS
2. The WhatsApp on your phone

## 6. (Later) Get out of "test mode"

While in test mode you can only send to numbers you've verified. To send
to anyone (parents, clients, donors):

1. In your Meta app → **App Review → Permissions** → request
   `whatsapp_business_messaging`.
2. Submit your business documents (business registration, website,
   privacy policy).
3. Add a real "display name" to your WhatsApp business number.

Once approved, you get the free 1,000 conversations/month and pay
~$0.005 per extra conversation.

## What "conversation" means in Meta's pricing

A *conversation* is a 24-hour window with one contact. Send 50 messages
to Mrs. Asiimwe in one day — that's 1 conversation. So 1,000 free
conversations means up to 1,000 distinct parent/client threads per month,
not 1,000 messages.

For Peak Primary (286 students, ~250 active parent contacts) this is
plenty of room.

## If something goes wrong

| Symptom | Fix |
|---|---|
| Nia says "WhatsApp Cloud API not configured" | Secrets not set or wrong worker. Re-run step 4. |
| Meta returns `(#131030) Recipient phone number not in allowed list` | You're still in test mode. Add the recipient to verified list, OR finish step 6. |
| Meta returns `(#190) Invalid OAuth token` | Token expired (24h limit). Regenerate, or generate a permanent System User token. |
| Worker returns 503 | `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_ID` missing. Run `wrangler secret list --config sentinel-wrangler.toml` to verify. |

Once Path B is working, Nia can autonomously send fee reminders,
attendance alerts, and event notifications across Peak Primary — at zero
marginal cost up to 1,000 conversations/month.
