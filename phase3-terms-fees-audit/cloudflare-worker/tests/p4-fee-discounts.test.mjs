// Audit P4: bursaries are stored as kind 'discount' and must lower the balance
// (and what was charged) without counting as money received.
const DB = { fees: [
  { tenant_id: 'kl', student_id: 1, kind: 'charge', amount: 450000 }, { tenant_id: 'kl', student_id: 1, kind: 'charge', amount: 300000 },
  { tenant_id: 'kl', student_id: 1, kind: 'discount', amount: 375000 }, { tenant_id: 'kl', student_id: 1, kind: 'payment', amount: 100000 },
  { tenant_id: 'kl', student_id: 2, kind: 'charge', amount: 520000 }, { tenant_id: 'kl', student_id: 2, kind: 'payment', amount: -520000 },
] };
globalThis.fetch = async (u, o = {}) => { u = decodeURIComponent(String(u)); const J = x => new Response(JSON.stringify(x), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const m = u.match(/\/rest\/v1\/([a-z_]+)\??(.*)$/); if (!m) return J({});
  const q = new URLSearchParams(m[2]);
  return J((DB[m[1]] || []).filter(r => [...q].every(([k, v]) => !/^eq\./.test(v) || String(r[k]) === v.slice(3)))); };
console.log = () => {}; console.warn = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const r = await (await worker.fetch(new Request('https://w.test/fees-balances?tenant=kl'), { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'k' })).json();
process.stdout.write('pupil 1 (750k fees, 375k bursary, 100k paid): balance=' + r.balances[1] + ' charged=' + r.charged[1] + ' paid=' + r.paid[1] + '\n');
process.stdout.write('pupil 2 (paid in full, payment stored negative): balance=' + r.balances[2] + ' charged=' + r.charged[2] + ' paid=' + r.paid[2] + '\n');
