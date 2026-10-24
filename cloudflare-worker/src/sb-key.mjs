// Make the Worker work with any Supabase key format (audit follow-up, 24 Oct 2026).
//  • New-style keys (sb_secret_… / sb_publishable_…) are not JWTs: Supabase
//    rejects them in "Authorization: Bearer …" with 401. For those, the Bearer
//    header that only repeats the key is dropped; `apikey` alone is enough.
//  • Stray spaces/newlines from copy-paste in SUPABASE_KEY / SUPABASE_URL, and
//    a trailing "/" on the URL, are cleaned up before the request goes out.
let RAW_KEY = '', KEY = '', RAW_URL = '', URL0 = '';
let installed = false;

export function useSupabaseEnv(env) {
  RAW_KEY = String((env && env.SUPABASE_KEY) || '');
  KEY = RAW_KEY.trim().replace(/^["']|["']$/g, '');
  RAW_URL = String((env && env.SUPABASE_URL) || '');
  URL0 = RAW_URL.trim().replace(/\/+$/, '');
  if (installed || typeof globalThis.fetch !== 'function') return;
  installed = true;
  const orig = globalThis.fetch.bind(globalThis);
  globalThis.fetch = function (input, init) {
    try {
      let u = typeof input === 'string' ? input : (input && input.url) || '';
      if (RAW_URL && URL0 && typeof input === 'string' && u.startsWith(RAW_URL) && RAW_URL !== URL0) {
        let rest = u.slice(RAW_URL.length);
        if (!rest.startsWith('/')) rest = '/' + rest;
        input = u = URL0 + rest.replace(/^\/+/, '/');
      }
      const dirty = RAW_KEY !== KEY || KEY.startsWith('sb_');
      if (dirty && URL0 && u.startsWith(URL0) && init && init.headers) {
        const h = new Headers(init.headers);
        const k = h.get('apikey');
        if (k != null && k !== KEY && k.trim().replace(/^["']|["']$/g, '') === KEY) h.set('apikey', KEY);
        const a = h.get('authorization');
        if (a != null) {
          const tok = a.replace(/^Bearer\s+/i, '');
          const isOurKey = tok === RAW_KEY || tok.trim().replace(/^["']|["']$/g, '') === KEY;
          if (isOurKey) { if (KEY.startsWith('sb_')) h.delete('authorization'); else h.set('authorization', 'Bearer ' + KEY); }
        }
        init = { ...init, headers: Object.fromEntries(h.entries()) };
      }
    } catch (e) { /* never block a request over this */ }
    return orig(input, init);
  };
}
