# Deploy Schools OS to peakprimary.nextschools.app

This is the playbook for getting the Schools OS onto a real domain on the
internet. One-time setup. Subsequent schools onboard in 3 minutes (see
ONBOARDING-ENGINE.md when that's built).

Total time: ~30 minutes.

---

## Step 1 — Buy `nextschools.app` at Cloudflare Registrar (5 min, ~$10)

Why Cloudflare Registrar:
- Cheapest .app domain (no markup, ~$10/yr)
- DNS is automatically at Cloudflare — no nameserver migration step
- Integrates one-click with Cloudflare Pages later

Steps:
1. Go to https://dash.cloudflare.com/?to=/:account/registrar/register
2. Search for `nextschools.app`
3. If available: add to cart → checkout. Use a credit card.
4. If taken: try `nextschools.education` (~$30/yr), `nextschools.co` (~$25), or `nextschoolsapp.com`
5. After purchase, confirm in Cloudflare dashboard → Domains → you see your new domain listed.

You don't need to set up DNS yet. Cloudflare does it automatically.

---

## Step 2 — Create the Cloudflare Pages project (5 min)

We use Direct Upload mode so no Git setup is needed.

1. In Cloudflare dashboard → left sidebar → **Workers & Pages**
2. Click **Create** → **Pages** tab → **Upload assets**
3. Project name: `nextos-schools`
4. Click **Create project**
5. Cloudflare prompts you to upload a folder. Open File Explorer to:
   `C:\Users\LIZ\Downloads\NEXT_OS (2)\NEXT_OS\prototypes\schools\peak-primary\`
6. **Select ALL files inside that folder** (Ctrl+A) and drag them into the upload zone.
   ⚠ Important: drag the FILES, not the folder itself. The upload target should
   look like: `index.html`, `login.html`, `session-guard.js`, `teacher-view.jsx`,
   `head-staff-panel.jsx`, `head-timetable-panel.jsx`, `role-router.jsx`, and any
   `assets/` subfolder.
7. After upload finishes, click **Deploy site**.
8. Wait ~30 seconds. You'll get a temporary URL like:
   `https://nextos-schools.pages.dev` — open it, login.html should load.

---

## Step 3 — Hook the wildcard subdomain (5 min)

This is where the magic happens. One Pages project serves infinite schools.

1. Inside your Pages project (`nextos-schools`) → **Custom domains** tab → **Set up a custom domain**
2. Enter: `peakprimary.nextschools.app`
3. Click **Continue**. Cloudflare detects the domain is yours and offers to create the DNS record automatically — click **Activate domain**.
4. Wait 1-2 minutes. Once SSL provisioning completes, you'll see a green checkmark.
5. Visit `https://peakprimary.nextschools.app/login.html` — you should see the Peak login screen.

**Optional but recommended:** Add a wildcard so future schools don't need this step.
1. Go to Cloudflare dashboard → your `nextschools.app` domain → DNS
2. Add record: Type=`CNAME`, Name=`*`, Target=`nextos-schools.pages.dev`, Proxy=ON
3. Now `harambee.nextschools.app`, `goodfoundation.nextschools.app`, anything.nextschools.app — all point to the same Pages deploy.

---

## Step 4 — Tell Supabase the new URL is allowed (3 min)

Supabase Auth needs to know which URLs can complete sign-in flows. Without this, login will succeed but the user won't stay logged in.

1. Supabase dashboard → your `next-os` project → **Authentication** → **URL Configuration**
2. **Site URL:** set to `https://peakprimary.nextschools.app`
3. **Redirect URLs:** add these one per line:
   ```
   https://peakprimary.nextschools.app/**
   https://*.nextschools.app/**
   http://localhost:3000/**
   ```
   (Last one keeps your local file:// dev still working.)
4. Save.

---

## Step 5 — Test live (5 min)

Open `https://peakprimary.nextschools.app/login.html` in an incognito window.

Sign in as each role:

| Email | Password | Should land on |
|---|---|---|
| `head@peakprimary.test` | (Sarah's password) | Full head dashboard with sidebar including Staff Today + Timetable |
| `patrick@peakprimary.test` | (Patrick's password) | Teacher dashboard — Nia coach card, check-in, classes, etc. |
| `bursar@peakprimary.test` | (Kim's password) | Bursar dashboard — limited sidebar (Fees + Reports only) |

If any step fails: check browser console (F12). Most likely causes:
- **CORS error from Supabase** → Site URL not set correctly in Step 4
- **Login succeeds but redirects to login.html again** → Redirect URLs wildcard missing the `/**`
- **Page loads but shows "no session"** → Auth cookie blocked. Try opening in regular (not incognito) window.

---

## What you can now do that you couldn't before

- **Share a URL** with anyone in Uganda — they can sign in from their phone
- **Onboard a new school** — they get their own `theirslug.nextschools.app`
  automatically (wildcard DNS handles it). No new Pages project needed.
- **Update the app** — every time you redeploy via the Pages dashboard, ALL
  subdomains get the update instantly.

---

## What's still on the local-only side

- The "Onboard New School" form doesn't exist yet (Sprint 2 work). For now,
  onboarding still requires you to manually add the tenant row + create
  Auth users + seed data via SQL.
- Logo upload for each tenant — currently the green "P" badge is hardcoded.
  Sprint 2 will read `tenants.logo_url` and skin the header per tenant.

These don't block the deploy — they're enhancements for the next sprint.
