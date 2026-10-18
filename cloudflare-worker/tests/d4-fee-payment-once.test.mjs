const DB = { receipts: [], fees: [{ tenant_id: 'kl', student_id: 11, kind: 'charge', amount: 500000 }], students: [{ id: 11, tenant_id: 'kl', name: 'Kato John' }], tenants: [{ id: 'kl', name: 'Kabs Lily' }], os_records: [] };
let UNIQUE = true; let rid = 1;
const delay = ms => new Promise(r => setTimeout(r, ms));
globalThis.fetch = async (u, o = {}) => { u = decodeURIComponent(String(u)); const J = (x, s = 200, h = {}) => new Response(JSON.stringify(x), { status: s, headers: { 'Content-Type': 'application/json', ...h } });
  await delay(5 + Math.random() * 10);
  if (u.includes('flutterwave.com/v3/transactions')) return J({ status: 'success', data: { status: 'successful', tx_ref: 'FEE-kl-11-1700000000000', amount: 200000, currency: 'UGX' } });
  const m = u.match(/\/rest\/v1\/([a-z_]+)\??(.*)$/); if (!m) return J({});
  const t = m[1], q = new URLSearchParams(m[2]); const method = o.method || 'GET';
  let rows = (DB[t] || []).filter(r => [...q].every(([k, v]) => ['select', 'order', 'limit', 'offset'].includes(k) || !/^eq\./.test(v) || String(r[k]) === v.slice(3)));
  if (method === 'GET') { const h = o.headers || {}; if (h.Range) return J([], 200, { 'content-range': '0-0/' + rows.length }); return J(rows); }
  if (method === 'POST') { const b = JSON.parse(o.body); if (t === 'receipts' && UNIQUE && DB.receipts.some(r => r.tenant_id === b.tenant_id && r.reference === b.reference)) return J({ code: '23505' }, 409); b.id = rid++; DB[t].push(b); return J([b], 201); }
  if (method === 'PATCH') { const b = JSON.parse(o.body); rows.forEach(r => Object.assign(r, b)); return J([]); }
  if (method === 'DELETE') { DB[t] = DB[t].filter(r => !rows.includes(r)); return J([]); }
  return J([]); };
console.log = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const out = s => process.stdout.write(s + '\n');
const KVM = new Map(); const KV = { get: async k => { await delay(3); return KVM.get(k) ?? null; }, put: async (k, v) => { await delay(3); KVM.set(k, v); }, delete: async k => KVM.delete(k) };
async function race(label, env) {
  DB.receipts = []; DB.fees = DB.fees.filter(f => f.kind === 'charge'); KVM.clear();
  const call = () => worker.fetch(new Request('https://w.test/fees/verify?tx=999&tenant=kl'), env).then(r => r.json());
  const res = await Promise.all([call(), call(), call()]);
  const pays = DB.fees.filter(f => f.kind === 'payment');
  out(label.padEnd(40) + 'payments recorded=' + pays.length + ' receipts=' + DB.receipts.length + ' balance_after=' + (DB.receipts[0] && DB.receipts[0].balance_after) + ' student_id=' + (DB.receipts[0] && DB.receipts[0].student_id));
}
const base = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'k', FLW_SECRET_KEY: 'f' };
UNIQUE = true;  await race('3 at once, unique index, no KV', base);
UNIQUE = true;  await race('3 at once, unique index + KV', { ...base, BRIEFS_KV: KV });
