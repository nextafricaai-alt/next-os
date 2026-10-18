

// ──────────────────────────────────────────────────────────────────────
// SUPABASE READER — replaces TENANTS_SEED with live data when secrets set
// ──────────────────────────────────────────────────────────────────────
// Set via: wrangler secret put SUPABASE_URL --config sentinel-wrangler.toml
//          wrangler secret put SUPABASE_KEY --config sentinel-wrangler.toml
// SUPABASE_KEY must be the service_role key (bypasses RLS).
// Falls back to TENANTS_SEED if either secret is missing.

// Supabase returns at most 1000 rows per request (API "max rows"), so a
// query asking for more (limit=20000 etc.) used to come back silently cut
// at 1000 — fee balances and attendance for bigger schools were wrong
// (audit D1). Queries with limit > 1000 are now fetched page by page.
const SB_PAGE = 1000;
async function sbFetch(env, path) {
  const lm = path.match(/[?&]limit=(\d+)/);
  const want = lm ? Number(lm[1]) : 0;
  if (want > SB_PAGE && !/[?&]offset=/.test(path)) {
    let base = path.replace(/([?&])limit=\d+&?/, '$1').replace(/[?&]$/, '');
    if (!/[?&]order=/.test(base)) base += (base.indexOf('?') >= 0 ? '&' : '?') + 'order=id.asc';
    const out = [];
    try {
      for (let off = 0; off < want; off += SB_PAGE) {
        const n = Math.min(SB_PAGE, want - off);
        const page = await sbFetchOne(env, base + (base.indexOf('?') >= 0 ? '&' : '?') + 'limit=' + n + '&offset=' + off);
        if (!Array.isArray(page)) return page;
        out.push(...page);
        if (page.length < n) break;
      }
      return out;
    } catch (e) {
      if (/order=id\.asc/.test(base) && !/[?&]order=/.test(path)) return sbFetchOne(env, path); // table has no id column
      throw e;
    }
  }
  return sbFetchOne(env, path);
}
async function sbFetchOne(env, path) {
  const url = env.SUPABASE_URL + '/rest/v1' + path;
  const res = await fetch(url, {
    headers: {
      'apikey':        env.SUPABASE_KEY,
      'Authorization': 'Bearer ' + env.SUPABASE_KEY,
      'Accept':        'application/json',
    },
  });
  if (!res.ok) throw new Error('Supabase ' + path + ' → ' + res.status);
  return res.json();
}

// Write to Supabase via PostgREST (service_role bypasses RLS).
async function sbWrite(env, path, body, method, prefer) {
  const res = await fetch(env.SUPABASE_URL + '/rest/v1' + path, {
    method: method || 'POST',
    headers: {
      'apikey': env.SUPABASE_KEY,
      'Authorization': 'Bearer ' + env.SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': prefer || 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text(); throw new Error('Supabase write ' + path + ' → ' + res.status + ' ' + t.slice(0, 240)); }
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;   // empty body (return=minimal / 201) → null, no crash
}

// ── CMS engine: generic, schema-driven content store (one table set, all sites) ──
function sbHeaders(env, prefer) { return { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': prefer || 'return=representation' }; }

// Fulfil a parent fee payment: insert the payment (so balances drop), write a receipt (so the live OS updates), notify the school.
// Number of rows matching a PostgREST filter, without downloading them.
async function sbCount(env, path) {
  const r = await fetch(env.SUPABASE_URL + '/rest/v1' + path, { headers: { ...sbHeaders(env), Prefer: 'count=exact', Range: '0-0' } });
  const cr = r.headers.get('content-range') || '';
  const n = Number(cr.split('/')[1]);
  return isFinite(n) ? n : 0;
}

export { SB_PAGE, sbCount, sbFetch, sbFetchOne, sbHeaders, sbWrite };
