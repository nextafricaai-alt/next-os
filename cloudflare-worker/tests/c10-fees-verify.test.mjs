// /fees/verify must record a real Flutterwave payment once, but only show the
// receipt / amount / balance to the caller holding that payment's tx_ref.
const REF = 'FEE-kl-11-1700000000000';
const DB = { receipts: [], fees: [{ tenant_id: 'kl', student_id: 11, kind: 'charge', amount: 500000 }], students: [{ id: 11, tenant_id: 'kl', name: 'Kato John', guardian_name: 'Mary', guardian_phone: '0700' }], tenants: [{ id: 'kl', name: 'Kabs Lily' }], os_records: [] };
let rid = 1;
globalThis.fetch = async (u, o = {}) => { u = decodeURIComponent(String(u)); const J = (x, s = 200, h = {}) => new Response(JSON.stringify(x), { status: s, headers: { 'Content-Type': 'application/json', ...h } });
  if (u.includes('flutterwave.com/v3/transactions')) return J({ status: 'success', data: { status: 'successful', tx_ref: REF, amount: 200000, currency: 'UGX' } });
  const m = u.match(/\/rest\/v1\/([a-z_]+)\??(.*)$/); if (!m) return J({});
  const t = m[1], q = new URLSearchParams(m[2]); const method = o.method || 'GET';
  let rows = (DB[t] || []).filter(r => [...q].every(([k, v]) => !/^eq\./.test(v) || String(r[k]) === v.slice(3)));
  if (method === 'GET') { const h = o.headers || {}; if (h.Range) return J([], 200, { 'content-range': '0-0/' + rows.length }); return J(rows); }
  if (method === 'POST') { const b = JSON.parse(o.body); if (t === 'receipts' && DB.receipts.some(r => r.reference === b.reference)) return J({ code: '23505' }, 409); b.id = rid++; DB[t].push(b); return J([b], 201); }
  if (method === 'PATCH') { const b = JSON.parse(o.body); rows.forEach(r => Object.assign(r, b)); return J([]); }
  return J([]); };
console.log = () => {}; console.warn = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'k', FLW_SECRET_KEY: 'f' };
const call = async q => (await worker.fetch(new Request('https://w.test/fees/verify?' + q), env)).json();
const out = (l, r) => process.stdout.write(l.padEnd(44) + JSON.stringify(r) + '\n');
out('stranger, tx id only', await call('tx=999&tenant=kl'));
out('  payments recorded', DB.fees.filter(f => f.kind === 'payment').length);
out('stranger, wrong tx_ref', await call('tx=999&tx_ref=FEE-kl-11-1&tenant=kl'));
out('paying parent, own tx_ref', await call('tx=999&tx_ref=' + REF + '&tenant=kl'));
out('  payments recorded (still once)', DB.fees.filter(f => f.kind === 'payment').length);
