// School app smoke test (audit Phase 1).
//
// Serves web/ the way .htaccess does, signs in as a head teacher (and a
// teacher, and a driver) with every network call to Supabase / the NEXT
// Worker answered by small fakes, opens every screen, and FAILS if the page
// throws a JavaScript error, a screen shows the crash fallback, or a page
// that should load is missing.
//
// Run locally (needs Node 20+):
//   npm i --no-save playwright@1.48.2 && npx playwright install chromium
//   node tools/smoke-test.mjs
// GitHub runs it before every deploy (.github/workflows/deploy-hostinger.yml).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const PP = '/prototypes/schools/peak-primary/';
const TENANT = 'smoke-test-school';
const PORT = 8765;
// Optional: serve CDN libraries from a local folder (offline machines).
const LOCAL_LIBS = process.env.SMOKE_LOCAL_LIBS || '';

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.jsx': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
function rewrite(p) {
  let m;
  if ((m = p.match(/^\/s\/([A-Za-z0-9_-]+)\/?$/))) return PP + 'login.html';
  if ((m = p.match(/^\/school\/([A-Za-z0-9_-]+)\/login\/?$/))) return PP + 'login.html';
  if ((m = p.match(/^\/school\/([A-Za-z0-9_-]+)\/parent\/?$/))) return PP + 'parent-dashboard.html';
  if ((m = p.match(/^\/school\/([A-Za-z0-9_-]+)\/driver\/?$/))) return PP + 'driver-dashboard.html';
  if ((m = p.match(/^\/school\/([A-Za-z0-9_-]+)\/?$/))) return PP + 'index.built.html';
  return p;
}
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const f = path.join(ROOT, rewrite(decodeURIComponent(u.pathname)));
  if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, r));

const LIBS = LOCAL_LIBS ? [
  [/react@18\.3\.1\/umd\/react\.production/, 'react/umd/react.production.min.js'],
  [/react-dom@18\.3\.1\/umd/, 'react-dom/umd/react-dom.production.min.js'],
  [/@babel\/standalone/, '@babel/standalone/babel.min.js'],
  [/supabase-js@2/, '@supabase/supabase-js/dist/umd/supabase.js'],
  [/leaflet@1\.9\.4\/dist\/leaflet\.js/, 'leaflet/dist/leaflet.js'],
  [/jspdf/, 'jspdf/dist/jspdf.umd.min.js'],
] : [];

const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const json = (route, body, status) => route.fulfill({ status: status || 200, contentType: 'application/json', headers: H, body: JSON.stringify(body) });

async function run(role, startPath, checks) {
  const browser = await chromium.launch(process.env.SMOKE_CHROMIUM ? { executablePath: process.env.SMOKE_CHROMIUM } : {});
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1400, height: 900 }, geolocation: { latitude: 0.35, longitude: 32.6 }, permissions: ['geolocation'] });
  const errors = [];
  await ctx.route('**/*', async (route) => {
    const req = route.request(); const url = req.url();
    if (url.startsWith('http://127.0.0.1:' + PORT)) return route.continue();
    for (const [re, f] of LIBS) if (re.test(url)) return route.fulfill({ path: path.join(LOCAL_LIBS, f), contentType: 'application/javascript' });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    if (/supabase\.co\/auth\/v1\/user/.test(url)) return json(route, { id: 'u-smoke', email: 'smoke@example.test', aud: 'authenticated' });
    if (/supabase\.co\/rest\/v1\/users/.test(url)) return json(route, [{ tenant_id: TENANT, role, full_name: 'Smoke ' + role }]);
    if (/supabase\.co\/rest\/v1/.test(url)) return json(route, req.method() === 'POST' ? { id: 1 } : []);
    if (/supabase\.co/.test(url)) return route.fulfill({ status: 404, body: '' });
    if (/workers\.dev\/transport\/live/.test(url)) return json(route, { vans: [], fleet: [], students: [], stops: [], settings: {}, myVans: null, mapsKey: '' });
    if (/workers\.dev/.test(url)) return json(route, {});
    if (/unpkg\.com|jsdelivr\.net|cdnjs|fonts\.(googleapis|gstatic)\.com|html2canvas/.test(url) && !LOCAL_LIBS) return route.continue();
    return route.fulfill({ status: 404, body: '' }); // map tiles, analytics, etc.
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(role + ' ' + page.url().replace(/^https?:\/\/[^/]+/, '') + ': ' + e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/build.txt');
  await page.evaluate(() => localStorage.setItem('sb-llxhvqkkgftqwefmrofn-auth-token', JSON.stringify({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: 'u-smoke', email: 'smoke@example.test', aud: 'authenticated' } })));
  await page.goto('http://127.0.0.1:' + PORT + startPath, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(6000);
  await checks(page, errors);
  await browser.close();
  return errors;
}

const failures = [];
const CRASH = /something went wrong|screen render recovery|failed to render/i;

// 1) Head teacher: every screen in the sidebar.
failures.push(...await run('head', '/school/' + TENANT, async (page, errors) => {
  const labels = await page.$$eval('nav button, aside button, [role=navigation] button', els => els.map(e => e.innerText.split('\n')[0].trim()).filter(Boolean));
  const screens = [...new Set(labels)].filter(l => l.length < 30);
  if (screens.length < 8) errors.push('head: sidebar has only ' + screens.length + ' items — app did not render');
  for (const l of screens) {
    try { await page.getByText(l, { exact: true }).first().click({ timeout: 3000 }); } catch (e) { continue; }
    await page.waitForTimeout(700);
    const body = await page.evaluate(() => document.body.innerText);
    if (CRASH.test(body)) errors.push('head: screen "' + l + '" shows the crash fallback');
  }
  for (const g of ['PEAK_FORMS', 'PEAK_SCREENS', 'HeadBoardingPanel', 'SchoolReportCard']) {
    if (!(await page.evaluate(n => !!window[n], g))) errors.push('head: window.' + g + ' did not load');
  }
  console.log('head: visited ' + screens.length + ' screens');
}));

// 2) Teacher portal.
failures.push(...await run('teacher', '/school/' + TENANT, async (page, errors) => {
  const body = await page.evaluate(() => document.body.innerText);
  if (!/TEACHER PORTAL/i.test(body)) errors.push('teacher: teacher portal did not render');
  console.log('teacher: portal rendered');
}));

// 3) Driver app.
failures.push(...await run('driver', '/school/' + TENANT + '/driver', async (page, errors) => {
  const body = await page.evaluate(() => document.body.innerText);
  if (!/Start pickup|No children|No van assigned/i.test(body)) errors.push('driver: driver app did not render');
  console.log('driver: app rendered');
}));

// 4) Parent sign-in page (no staff session needed).
failures.push(...await run('parent', '/school/' + TENANT + '/parent', async (page, errors) => {
  const ok = await page.locator('#nx-parent-phone').count();
  if (!ok) errors.push('parent: phone sign-in form missing');
  console.log('parent: sign-in rendered');
}));

server.close();
if (failures.length) {
  console.error('\nSMOKE TEST FAILED (' + failures.length + '):\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\nSmoke test passed.');
