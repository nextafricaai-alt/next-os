const T = 'kl';
const USERS = {
  'tok-head': { user: { id: 'u-h', email: 'head@kl.ug' }, rows: [{ tenant_id: T, role: 'head' }] },
  'tok-d1': { user: { id: 'u-d1', email: 'd1@kl.ug' }, rows: [{ tenant_id: T, role: 'driver' }] },
  'tok-d2': { user: { id: 'u-d2', email: 'd2@kl.ug' }, rows: [{ tenant_id: T, role: 'driver' }] },
  'tok-teacher': { user: { id: 'u-t', email: 't@kl.ug' }, rows: [{ tenant_id: T, role: 'teacher' }] },
  'tok-other': { user: { id: 'u-o', email: 'h@zz.ug' }, rows: [{ tenant_id: 'zz', role: 'head' }] },
};
const DB = {
  transport_vans: [{ tenant_id: T, van_id: 'van-01', name: 'Van 1', driver_email: 'd1@kl.ug', fuel_type: 'diesel', l_per_100km: 12 }, { tenant_id: T, van_id: 'van-02', name: 'Van 2', driver_email: 'd2@kl.ug', fuel_type: 'petrol', l_per_100km: 10 }],
  transport_students: [{ id: 1, tenant_id: T, van_id: 'van-01', student_id: 11, student_name: 'Kato', status: 'waiting', pickup_lat: 0.35, pickup_lng: 32.6, pickup_order: 1 }, { id: 2, tenant_id: T, van_id: 'van-02', student_id: 12, student_name: 'Mary', status: 'waiting', stop_name: 'Kira', pickup_order: 1 }],
  transport_stops: [{ tenant_id: T, stop_name: 'Kira', lat: 0.4, lng: 32.64 }],
  transport_positions: [], transport_trips: [], transport_settings: [],
  students: [{ id: 11, tenant_id: T, name: 'Kato John', stream: 'P3', guardian_phone: '0772123456' }, { id: 12, tenant_id: T, name: 'Nakato Mary', stream: 'P1', guardian_phone: '0701' }, { id: 99, tenant_id: 'zz', name: 'Foreign' }],
};
const PUSH = [];
function filt(table, qs) {
  let r = (DB[table] || []).slice();
  for (const [k, v] of qs) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue;
    const m = v.match(/^(eq|in)\.(.*)$/); if (!m) continue;
    if (m[1] === 'eq') r = r.filter(x => String(x[k]) === m[2]);
    else { const set = m[2].replace(/[()]/g, '').split(','); r = r.filter(x => set.includes(String(x[k]))); }
  }
  return r;
}
globalThis.fetch = async (u, o = {}) => {
  u = String(u); const h = o.headers || {}; const J = (x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('/auth/v1/user')) { const t = (h.Authorization || '').replace('Bearer ', ''); return USERS[t] ? J(USERS[t].user) : J({}, 401); }
  if (u.includes('/rest/v1/users?auth_id')) { const id = decodeURIComponent(u.match(/auth_id=eq\.([^&]+)/)[1]); const e = Object.values(USERS).find(x => x.user.id === id); return J(e ? e.rows : []); }
  if (u.includes('/rest/v1/tenants')) return J([]);
  if (u.includes('/rest/v1/os_records')) { if (o.method === 'POST') return J([]); return J([{ id: 1, payload: { role: 'parent', student_ids: [11, 12], endpoint: 'x' } }]); }
  const m = u.match(/\/rest\/v1\/([a-z_]+)\??(.*)$/);
  if (m) {
    const table = m[1]; const qs = [...new URLSearchParams(m[2])];
    const method = o.method || 'GET';
    if (method === 'GET') return J(filt(table, qs));
    if (method === 'PATCH') { const body = JSON.parse(o.body); const rows = filt(table, qs); rows.forEach(r => Object.assign(r, body)); return J(rows); }
    if (method === 'DELETE') { const rows = filt(table, qs); DB[table] = DB[table].filter(r => !rows.includes(r)); return J([]); }
    if (method === 'POST') { const body = JSON.parse(o.body); const arr = Array.isArray(body) ? body : [body]; arr.forEach(b => { if (table === 'transport_trips' || table === 'transport_students') b.id = b.id || (DB[table].length + 100); const conf = (new URLSearchParams(m[2]).get('on_conflict') || '').split(',').filter(Boolean); const ex = conf.length && DB[table].find(r => conf.every(c => r[c] === b[c])); if (ex) Object.assign(ex, b); else DB[table].push(b); }); return J(arr, 201); }
  }
  return J([]);
};
globalThis.crypto.subtle; console.log = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const out = s => process.stdout.write(s + '\n');
const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'svc', AUTH_MODE: 'enforce', GOOGLE_MAPS_KEY: 'gkey', VAPID_PUBLIC: '', BRIEFS_KV: null };
async function call(path, tok, body) {
  const h = {}; if (tok) h.Authorization = 'Bearer ' + tok; if (body) h['Content-Type'] = 'application/json';
  const r = await worker.fetch(new Request('https://w.test' + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined }), env);
  return { s: r.status, d: await r.json() };
}
const show = (l, r, x = '') => out(l.padEnd(44) + r.s + ' ' + (r.d.error || '') + x);
let r = await call('/transport/live?tenant=kl', null); show('live: signed out', r);
r = await call('/transport/live?tenant=kl', 'tok-other'); show('live: head of another school', r);
r = await call('/transport/live?tenant=kl', 'tok-head'); show('live: head', r, ' kids=' + r.d.students.map(s => s.student_name + '@' + s.pin_source + '/' + s.guardian_phone).join(',') + ' key=' + r.d.mapsKey);
r = await call('/transport/live?tenant=kl', 'tok-d1'); show('live: driver 1 (own van only)', r, ' kids=' + r.d.students.map(s => s.student_name).join(',') + ' vans=' + JSON.stringify(r.d.myVans));
r = await call('/transport/ping', 'tok-d1', { tenant: 'kl', vanId: 'van-02', lat: 0.35, lng: 32.6 }); show('ping: driver 1 as van 2', r);
r = await call('/transport/ping', 'tok-teacher', { tenant: 'kl', vanId: 'van-01', lat: 0.35, lng: 32.6 }); show('ping: teacher', r);
r = await call('/transport/ping', 'tok-d1', { tenant: 'kl', vanId: 'van-01', lat: 0.35, lng: 32.6, speed: 30, tripId: 100, tripKm: 2.4 }); show('ping: driver 1 own van', r, ' pos=' + JSON.stringify(DB.transport_positions.map(p => [p.van_id, p.trip_km])));
r = await call('/transport/trip/start', 'tok-d1', { tenant: 'kl', vanId: 'van-01', kind: 'pickup' }); show('trip start pickup', r, ' trip=' + (r.d.trip && r.d.trip.id));
const tripId = r.d.trip.id;
r = await call('/transport/mark', 'tok-d1', { tenant: 'kl', id: 2, status: 'on_board' }); show('mark: driver 1 marks van-2 child', r);
r = await call('/transport/mark', 'tok-d1', { tenant: 'kl', id: 1, status: 'on_board' }); show('mark: driver 1 own child on board', r);
r = await call('/transport/mark', 'tok-d1', { tenant: 'kl', id: 1, status: 'flying' }); show('mark: bad status', r);
r = await call('/transport/trip/end', 'tok-d1', { tenant: 'kl', vanId: 'van-01', tripId, km: 18.5 }); show('trip end (18.5 km, 12 L/100, diesel)', r, ' litres=' + r.d.litres + ' cost=UGX ' + r.d.cost + ' notified=' + r.d.notified + ' kid=' + DB.transport_students[0].status);
r = await call('/transport/students/save', 'tok-d1', { tenant: 'kl', studentId: 12, vanId: 'van-01', lat: 0.3, lng: 32.5 }); show('add child: driver', r);
r = await call('/transport/students/save', 'tok-head', { tenant: 'kl', studentId: 99, vanId: 'van-01', lat: 0.3, lng: 32.5 }); show('add child: pupil of other school', r);
r = await call('/transport/students/save', 'tok-head', { tenant: 'kl', studentId: 12, vanId: 'van-01', lat: 0.31, lng: 32.55, note: 'Blue gate' }); show('add child: head moves Mary to van 1 w/ pin', r, ' moved=' + r.d.moved);
r = await call('/transport/vans/save', 'tok-head', { tenant: 'kl', van: { name: 'Van 3', plate: 'UBA 123X', driver_email: 'D3@kl.ug', l_per_100km: 11 } }); show('van save (new)', r, ' id=' + (r.d.van && r.d.van.van_id) + ' email=' + (r.d.van && r.d.van.driver_email));
r = await call('/transport/vans/delete', 'tok-head', { tenant: 'kl', vanId: 'van-01' }); show('van delete with children', r);
r = await call('/transport/settings/save', 'tok-head', { tenant: 'kl', school_lat: 0.36, school_lng: 32.625, diesel_price_ugx: 6650 }); show('settings save', r, ' ' + JSON.stringify(r.d.settings && [r.d.settings.school_lat, r.d.settings.diesel_price_ugx, r.d.settings.petrol_price_ugx]));
r = await call('/transport/settings/save', 'tok-d1', { tenant: 'kl', diesel_price_ugx: 1 }); show('settings save: driver', r);
r = await call('/transport/trips?tenant=kl', 'tok-d2'); show('trips: driver 2 (sees none of van 1)', r, ' n=' + r.d.trips.length);
r = await call('/transport/trips?tenant=kl', 'tok-head'); show('trips: head', r, ' ' + JSON.stringify(r.d.trips.map(t => [t.van_id, t.km, t.fuel_cost_ugx])));
out('parent pushes attempted: on_board+arrived logic ran (no VAPID in test)');
