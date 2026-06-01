# NEXT OS — How To Run

Two parts run independently: the **frontend** (HTML pages opened in a browser) and the **Sentinel backend** (Node + Rust services that power the supervisor advisories). The frontend works on its own; Sentinel only needs to be running if you want the supervisor panel to show live advisories instead of "OFFLINE."

---

## 1. Frontend only (fastest path)

The HTML files load React, ReactDOM, and Babel from `vendor/` and inline all components as `<script type="text/babel">` blocks. They need an HTTP server because browsers won't load local `.jsx` files over `file://`.

```powershell
cd "NEXT_OS"
cd runtime
npm install        # only the first time
npm run serve
```

Then open: `http://127.0.0.1:8085/NEXT%20OS.html`

The sidebar gives you Dashboard, Members, Projects, Finance, AI Tools, Sentinel, Onboarding.

The Sentinel panel will show **OFFLINE** until you start the backend (next section). That is expected.

### Dev-only UI

The Tweaks panel (theme/layout sliders) only shows when:
- you're on `localhost` / `127.0.0.1`, **or**
- the URL has `?tweaks=1` (e.g. `http://your-hostinger-domain/?tweaks=1`)

This keeps it out of the production deployment.

---

## 2. Start the Sentinel backend

The Sentinel WebSocket bridge pushes advisories into the frontend Sentinel page. Source is in `sentinel/`.

```powershell
cd sentinel
npm install        # only the first time
npm run build      # compile TypeScript → dist/   (already compiled in this repo)
npm run ws         # starts the WebSocket bridge on ws://127.0.0.1:8787
```

Leave that terminal open. Reload the frontend — the Sentinel panel status should flip from **OFFLINE** to **CONNECTED**.

### Run a full institution onboarding

```powershell
# From sentinel/
npm run onboard -- templates/schools/sample-school-profile.json
npm run aggregator -- data/onboarding/st-marys-demo
```

Output lands in `sentinel/data/onboarding/<institution-id>/`. The repo already includes five completed demos (st-marys, grace-chapel, hope-program, next-services, community-association).

### Rust observability daemon (optional)

```powershell
cd sentinel/sentinel-daemon
cargo run --release
```

Writes CPU / memory / storage / DB-integrity samples into `sentinel/data/sentinel.db`. The Node services read from that database.

---

## 3. Three HTML files — which one to use?

| File | Use it for |
|---|---|
| `NEXT OS.html` | **Primary entry. Use this.** Plain readable HTML with inline JSX blocks. |
| `NEXT OS Standalone.html` | Same app, marked up for an external bundler. Keep around if you need to re-bundle. |
| `NEXT Digital OS.html` | A 3.2 MB self-extracting single-file build (base64 manifest). Portable but unreadable — produced by a bundler. Do not edit by hand. |

For Hostinger upload: ship `NEXT OS.html`, `vendor/`, `uploads/`, and the `.jsx` files. Sentinel backend does **not** go on Hostinger — it runs on your local machine or a small VPS.

---

## 4. Frontend QA helpers (runtime/)

| Command | What it does |
|---|---|
| `npm run serve` | Static HTTP server on port 8085. Run this first; the others depend on it. |
| `npm run check:jsx` | Babel-transforms every `<script type="text/babel">` block in the HTML files. Fails loudly on syntax errors. **Run this after any JSX edit.** |
| `npm run check:dom` | Opens the page in headless Chrome and prints whether React mounted. |
| `npm run screenshot` | Saves `puppeteer_screenshot.png` of the rendered page at 1920×1080. |

---

## 5. Deployment targets

- **GitHub** — version control, source of truth.
- **Hostinger** — serves the frontend (`NEXT OS.html`, `vendor/`, `uploads/`, `.jsx` files) as static hosting.
- **Supabase** — to be wired in next: auth + database + realtime channel that can replace the local WebSocket bridge for a cloud-mode Sentinel.

The current Sentinel architecture is **local-first by design** — it makes no external network calls and writes to a local SQLite. When we wire Supabase, the WebSocket payload shape (`{ type: 'sentinel.advisory', advisory: {...} }`) stays the same; only the transport changes.

---

## 6. What was fixed in this pass

- Favicon now loads (was 404 on every page).
- Sentinel WebSocket no longer tries to connect to localhost from production (Hostinger). Override with `?sentinel=host:port` if running a remote bridge.
- TweaksPanel hidden from production (only on localhost or `?tweaks=1`).
- Runtime scripts now have npm scripts so you don't have to manually start a server.
- This README, so we both stop guessing how to run the thing.
