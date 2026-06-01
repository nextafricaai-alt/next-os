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
