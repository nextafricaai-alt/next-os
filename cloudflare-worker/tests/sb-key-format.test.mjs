// The Worker must work with a new-style sb_secret_ key (no Bearer header sent)
// and with a legacy JWT key that was pasted with stray spaces / a trailing "/".
const seen = [];
globalThis.fetch = async (u, o = {}) => { const h = new Headers(o.headers || {}); seen.push({ u: String(u), apikey: h.get('apikey'), auth: h.get('authorization') });
  return new Response(JSON.stringify([{ id: 1, tenant_id: 'kl', full_name: 'Okello Sam', email: 'o@x' }]), { headers: { 'Content-Type': 'application/json' } }); };
console.log = () => {}; console.warn = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const out = (l, r) => process.stdout.write(l.padEnd(44) + JSON.stringify(r) + '\n');
for (const [label, env] of [
  ['new sb_secret_ key', { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'sb_secret_abc' }],
  ['legacy key pasted with spaces + url "/"', { SUPABASE_URL: 'https://sb.test/ ', SUPABASE_KEY: ' eyJabc\n' }],
]) {
  seen.length = 0;
  const r = await (await worker.fetch(new Request('https://w.test/teachers?tenant=kl'), env)).json();
  const f = seen.find(x => x.u.includes('/rest/v1/teachers'));
  out(label, { teachers: (r.teachers || []).length, error: r.error || null, url_ok: !!f && f.u.startsWith('https://sb.test/rest/v1/'), apikey: f && f.apikey, bearer: f && f.auth });
}
