import { AUTH_CTX, callerTenant } from './gate.mjs';
import { deliverPush, deliverPushByStudent } from './push.mjs';
import { sbFetch, sbHeaders, sbWrite } from './supabase.mjs';


// ─── School transport (audit C9) ─────────────────────────────────────────
// Everything the driver app and the school's Transport screen use. All
// routes sit behind the auth gate (AUTH_RULES, /transport/*). A driver only
// sees and drives the van(s) whose driver_email is their sign-in email; if
// the school has not set up any vans yet, the driver sees the whole roster
// (the old single-van behaviour) so nothing stops working on day one.
//
// Tables (supabase-c9-transport.sql): transport_settings, transport_vans,
// transport_trips, transport_students (+ pickup pin), transport_positions,
// transport_stops (older named stops, still honoured as a fallback pin).
//
// Maps: env.GOOGLE_MAPS_KEY (a browser key restricted to the school site)
// is handed to signed-in staff in /transport/live so the driver app can use
// Google Maps with live traffic. Without it the app falls back to
// OpenStreetMap with no traffic layer.
const T_STATUSES = ['waiting', 'on_board', 'arrived', 'absent', 'dropped'];
const R_DRIVE = ['head', 'admin', 'driver'];
const T_DEFAULTS = { petrol_price_ugx: 6850, diesel_price_ugx: 6700, l_per_100km: 12 };

function tJ(cors) { return (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } }); }
const enc = encodeURIComponent;
function num(v) { const n = Number(v); return isFinite(n) ? n : null; }
function validLatLng(lat, lng) { return lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0); }

// Who is calling: { role, email, operator } from the gate, or null (warn
// mode with no sign-in, which keeps the old open behaviour until enforce).
function tCaller(request) { return AUTH_CTX.get(request) || null; }

// The van ids a caller may drive/see, or null for "all vans of the school".
async function allowedVans(request, env, tenant) {
  const c = tCaller(request);
  if (!c || c.operator || c.role !== 'driver') return null;
  const vans = (await sbFetch(env, '/transport_vans?tenant_id=eq.' + enc(tenant) + '&select=van_id,driver_email').catch(() => [])) || [];
  if (!vans.length) return null; // school has not set up vans yet
  return vans.filter(v => String(v.driver_email || '').toLowerCase() === c.email).map(v => v.van_id);
}
async function vanAllowed(request, env, tenant, vanId) {
  const list = await allowedVans(request, env, tenant);
  return list === null || list.indexOf(vanId) >= 0;
}
function canDrive(request) {
  const c = tCaller(request);
  return !c || c.operator || R_DRIVE.indexOf(c.role) >= 0;
}

async function tSettings(env, tenant) {
  const r = (await sbFetch(env, '/transport_settings?tenant_id=eq.' + enc(tenant) + '&select=*').catch(() => [])) || [];
  return Object.assign({ tenant_id: tenant, school_lat: null, school_lng: null, petrol_price_ugx: T_DEFAULTS.petrol_price_ugx, diesel_price_ugx: T_DEFAULTS.diesel_price_ugx }, r[0] || {});
}

// GET /transport/live?tenant=  → everything a map needs, in one call.
async function handleTransportLive(request, url, env, cors) {
  const J = tJ(cors);
  const tenant = url.searchParams.get('tenant') || '';
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'not configured' }, 500);
  try {
    const t = enc(tenant);
    const [positions, roster, stops, vans, settings, allowed] = await Promise.all([
      sbFetch(env, '/transport_positions?tenant_id=eq.' + t + '&select=*&order=van_id'),
      sbFetch(env, '/transport_students?tenant_id=eq.' + t + '&select=*&order=van_id,pickup_order'),
      sbFetch(env, '/transport_stops?tenant_id=eq.' + t + '&select=stop_name,lat,lng').catch(() => []),
      sbFetch(env, '/transport_vans?tenant_id=eq.' + t + '&select=*&order=van_id').catch(() => []),
      tSettings(env, tenant),
      allowedVans(request, env, tenant),
    ]);
    const keep = v => allowed === null || allowed.indexOf(v) >= 0;
    const stopXY = {}; (stops || []).forEach(s => { stopXY[s.stop_name] = [s.lat, s.lng]; });
    const rows = (roster || []).filter(s => s.active !== false && keep(s.van_id));
    // Guardian phone + class from the pupil record, so the driver can call.
    const ids = [...new Set(rows.map(r => r.student_id).filter(Boolean))];
    const info = {};
    if (ids.length) {
      const st = (await sbFetch(env, '/students?tenant_id=eq.' + t + '&id=in.(' + ids.join(',') + ')&select=id,name,stream,guardian_name,guardian_phone').catch(() => [])) || [];
      st.forEach(s => { info[s.id] = s; });
    }
    const students = rows.map(r => {
      const p = info[r.student_id] || {};
      const stopName = String(r.stop_name || '').split(' · ')[0].trim();
      const pin = validLatLng(r.pickup_lat, r.pickup_lng) ? [r.pickup_lat, r.pickup_lng] : (stopXY[stopName] || null);
      return {
        id: r.id, student_id: r.student_id, van_id: r.van_id, student_name: r.student_name || p.name || 'Pupil',
        stream: r.stream || p.stream || '', stop_name: r.stop_name || '', pickup_note: r.pickup_note || '',
        lat: pin ? pin[0] : null, lng: pin ? pin[1] : null, pin_source: validLatLng(r.pickup_lat, r.pickup_lng) ? 'pin' : (pin ? 'stop' : 'none'),
        pickup_order: r.pickup_order || 0, status: r.status || 'waiting',
        guardian_name: p.guardian_name || '', guardian_phone: p.guardian_phone || '',
      };
    });
    const c = tCaller(request);
    return J({
      vans: (positions || []).filter(v => keep(v.van_id)),
      fleet: (vans || []).filter(v => keep(v.van_id)),
      students, stops: stops || [], settings,
      myVans: allowed, role: c ? c.role : null,
      mapsKey: env.GOOGLE_MAPS_KEY || '',
    });
  } catch (e) { return J({ vans: [], fleet: [], students: [], stops: [], error: String((e && e.message) || e) }, 200); }
}

// POST /transport/ping  { tenant, vanId, lat, lng, speed, heading, tripId, tripKm }
async function handleTransportPing(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  const vanId = String(b.vanId || '').trim();
  const lat = num(b.lat), lng = num(b.lng);
  if (!tenant || !vanId || !validLatLng(lat, lng)) return J({ error: 'tenant, vanId, lat, lng required' }, 400);
  if (!canDrive(request)) return J({ error: 'Only drivers can send the van position.' }, 403);
  if (!(await vanAllowed(request, env, tenant, vanId))) return J({ error: 'This van is not assigned to you.' }, 403);
  const c = tCaller(request);
  try {
    const row = {
      tenant_id: tenant, van_id: vanId, van_name: b.vanName || null,
      driver_name: b.driverName || null, driver_phone: b.driverPhone || null,
      lat, lng, speed_kmh: num(b.speed), heading: num(b.heading),
      status: ['normal', 'stopped', 'arrived', 'emergency'].indexOf(b.status) >= 0 ? b.status : 'normal',
      updated_at: new Date().toISOString(),
    };
    if (b.tripId) { row.trip_id = Number(b.tripId) || null; row.trip_km = num(b.tripKm); }
    let r = await fetch(env.SUPABASE_URL + '/rest/v1/transport_positions?on_conflict=tenant_id,van_id', {
      method: 'POST', headers: sbHeaders(env, 'resolution=merge-duplicates,return=minimal'), body: JSON.stringify(row),
    });
    if (!r.ok && (row.trip_id !== undefined)) { // C9 columns not migrated yet — save the position anyway
      delete row.trip_id; delete row.trip_km;
      r = await fetch(env.SUPABASE_URL + '/rest/v1/transport_positions?on_conflict=tenant_id,van_id', { method: 'POST', headers: sbHeaders(env, 'resolution=merge-duplicates,return=minimal'), body: JSON.stringify(row) });
    }
    if (!r.ok) { const t = await r.text(); return J({ error: 'Supabase write → ' + r.status + ' ' + t.slice(0, 240) }, 200); }
    if (row.status === 'emergency') notifyHeads(env, tenant, '🚨 Van emergency: ' + (row.van_name || vanId), (row.driver_name || (c && c.email) || 'The driver') + ' pressed the emergency button. Open Transport to see where the van is.').catch(() => {});
    return J({ ok: true });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function notifyHeads(env, tenant, title, body) {
  return deliverPush(env, tenant, [], 'head', { title, body, url: '/school/' + tenant, tag: 'van-' + Date.now() });
}

async function tRow(env, tenant, id) {
  const r = await sbFetch(env, '/transport_students?id=eq.' + enc(id) + '&tenant_id=eq.' + enc(tenant) + '&select=id,van_id,student_id,student_name,status&limit=1');
  return (r && r[0]) || null;
}

// POST /transport/mark  { tenant, id, status }  — one child's status.
async function handleTransportMark(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const id = b.id; const status = String(b.status || '').trim();
  let tenant = String(b.tenant || '').trim() || callerTenant(request);
  if (!id || T_STATUSES.indexOf(status) < 0) return J({ error: 'id and a valid status required' }, 400);
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'not configured' }, 500);
  try {
    const row = await tRow(env, tenant, id);
    if (!row) return J({ error: 'Child not found on this school’s transport list.' }, 404);
    if (!(await vanAllowed(request, env, tenant, row.van_id))) return J({ error: 'This child is not on your van.' }, 403);
    await sbWrite(env, '/transport_students?id=eq.' + enc(id) + '&tenant_id=eq.' + enc(tenant), { status, updated_at: new Date().toISOString() }, 'PATCH', 'return=minimal');
    if (row.student_id && row.status !== status) {
      const name = row.student_name || 'Your child';
      const msg = status === 'on_board' ? { title: name + ' is on the school van 🚐', body: name + ' was just picked up.' }
        : status === 'dropped' ? { title: name + ' was dropped off 🏠', body: name + ' was just dropped at the usual stop.' }
        : status === 'arrived' ? { title: name + ' arrived at school 🚸', body: name + ' just arrived at school on the van.' } : null;
      if (msg) deliverPushByStudent(env, tenant, row.student_id, { ...msg, url: '/school/' + tenant + '/parent', tag: 'van-' + row.student_id }).catch(() => {});
    }
    return J({ ok: true });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

// POST /transport/mark-arrived  { tenant, vanId } — everyone on board → arrived.
async function markVanArrived(env, tenant, vanId) {
  const onBoard = (await sbFetch(env, '/transport_students?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId) + '&status=eq.on_board&select=id,student_id,student_name')) || [];
  if (onBoard.length) await sbWrite(env, '/transport_students?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId) + '&status=eq.on_board', { status: 'arrived', updated_at: new Date().toISOString() }, 'PATCH', 'return=minimal');
  for (const s of onBoard) {
    if (s.student_id) deliverPushByStudent(env, tenant, s.student_id, {
      title: 'Your child has arrived safely 🚸', body: (s.student_name || 'Your child') + ' just arrived at school on the van.',
      url: '/school/' + tenant + '/parent', tag: 'arrived-' + s.student_id,
    }).catch(() => {});
  }
  await sbWrite(env, '/transport_positions?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId), { status: 'arrived', updated_at: new Date().toISOString() }, 'PATCH', 'return=minimal').catch(() => {});
  return onBoard.length;
}
async function handleTransportMarkArrived(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  const vanId = String(b.vanId || '').trim();
  if (!tenant || !vanId) return J({ error: 'tenant and vanId required' }, 400);
  if (!(await vanAllowed(request, env, tenant, vanId))) return J({ error: 'This van is not assigned to you.' }, 403);
  try { return J({ ok: true, notified: await markVanArrived(env, tenant, vanId) }); }
  catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

// POST /transport/set-stop  { tenant, stopName, lat, lng }  (older named stops)
async function handleTransportSetStop(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  const stopName = String(b.stopName || '').trim();
  const lat = num(b.lat), lng = num(b.lng);
  if (!tenant || !stopName || !validLatLng(lat, lng)) return J({ error: 'tenant, stopName, lat and lng required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'not configured' }, 500);
  const c = tCaller(request);
  try {
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/transport_stops?on_conflict=tenant_id,stop_name', {
      method: 'POST', headers: sbHeaders(env, 'resolution=merge-duplicates,return=minimal'),
      body: JSON.stringify({ tenant_id: tenant, stop_name: stopName, lat, lng, set_by: (c && c.email) || b.setBy || null, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) { const t = await r.text(); return J({ error: 'Supabase write → ' + r.status + ' ' + t.slice(0, 240) }, 200); }
    return J({ ok: true });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

// POST /transport/students/save — the school puts a pupil on a van with a
// pickup pin. { tenant, studentId, vanId, lat, lng, note, id? }
async function handleTransportStudentSave(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  const studentId = Number(b.studentId || b.student_id);
  const vanId = String(b.vanId || '').trim();
  const lat = num(b.lat), lng = num(b.lng);
  if (!tenant || !studentId || !vanId) return J({ error: 'tenant, pupil and van are required' }, 400);
  if ((lat != null || lng != null) && !validLatLng(lat, lng)) return J({ error: 'The pickup pin is not a valid map location.' }, 400);
  try {
    const st = await sbFetch(env, '/students?id=eq.' + studentId + '&tenant_id=eq.' + enc(tenant) + '&select=id,name,stream&limit=1');
    if (!st || !st[0]) return J({ error: 'Pupil not found at this school.' }, 404);
    const fields = {
      tenant_id: tenant, van_id: vanId, student_id: studentId, student_name: st[0].name, stream: st[0].stream || null,
      pickup_lat: lat, pickup_lng: lng, pickup_note: String(b.note || '').slice(0, 300) || null,
      stop_name: String(b.stopName || b.note || '').slice(0, 120) || null, active: true, updated_at: new Date().toISOString(),
    };
    const existing = (await sbFetch(env, '/transport_students?tenant_id=eq.' + enc(tenant) + '&student_id=eq.' + studentId + '&select=id,van_id&limit=1')) || [];
    let row;
    if (existing[0]) {
      row = await sbWrite(env, '/transport_students?id=eq.' + existing[0].id + '&tenant_id=eq.' + enc(tenant), fields, 'PATCH', 'return=representation');
    } else {
      const last = (await sbFetch(env, '/transport_students?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId) + '&select=pickup_order&order=pickup_order.desc&limit=1')) || [];
      fields.pickup_order = ((last[0] && last[0].pickup_order) || 0) + 1;
      fields.status = 'waiting';
      row = await sbWrite(env, '/transport_students', fields, 'POST', 'return=representation');
    }
    return J({ ok: true, row: Array.isArray(row) ? row[0] : row, moved: !!(existing[0] && existing[0].van_id !== vanId) });
  } catch (e) {
    const m = String((e && e.message) || e);
    if (/pickup_lat|pickup_note|active/.test(m)) return J({ error: 'Run the C9 transport SQL in Supabase first (supabase-c9-transport.sql).' }, 200);
    return J({ error: m }, 200);
  }
}

// POST /transport/students/remove { tenant, id }
async function handleTransportStudentRemove(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  if (!tenant || !b.id) return J({ error: 'tenant and id required' }, 400);
  try {
    await fetch(env.SUPABASE_URL + '/rest/v1/transport_students?id=eq.' + enc(b.id) + '&tenant_id=eq.' + enc(tenant), { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') });
    return J({ ok: true });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

// POST /transport/vans/save { tenant, van: { van_id?, name, plate, driver_email, driver_name, driver_phone, fuel_type, l_per_100km } }
async function handleTransportVanSave(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  const v = b.van || {};
  if (!tenant || !String(v.name || '').trim()) return J({ error: 'tenant and a van name are required' }, 400);
  try {
    let vanId = String(v.van_id || '').trim();
    if (!vanId) {
      const all = (await sbFetch(env, '/transport_vans?tenant_id=eq.' + enc(tenant) + '&select=van_id')) || [];
      let n = all.length + 1; while (all.some(x => x.van_id === 'van-' + String(n).padStart(2, '0'))) n++;
      vanId = 'van-' + String(n).padStart(2, '0');
    }
    const l100 = num(v.l_per_100km);
    const row = {
      tenant_id: tenant, van_id: vanId, name: String(v.name).trim().slice(0, 80), plate: String(v.plate || '').trim().slice(0, 20) || null,
      driver_email: String(v.driver_email || '').trim().toLowerCase() || null, driver_name: String(v.driver_name || '').trim() || null,
      driver_phone: String(v.driver_phone || '').trim() || null, fuel_type: v.fuel_type === 'petrol' ? 'petrol' : 'diesel',
      l_per_100km: l100 && l100 > 2 && l100 < 60 ? l100 : T_DEFAULTS.l_per_100km, active: v.active !== false, updated_at: new Date().toISOString(),
    };
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/transport_vans?on_conflict=tenant_id,van_id', { method: 'POST', headers: sbHeaders(env, 'resolution=merge-duplicates,return=representation'), body: JSON.stringify(row) });
    if (!r.ok) { const t = await r.text(); return J({ error: /transport_vans/.test(t) ? 'Run the C9 transport SQL in Supabase first (supabase-c9-transport.sql).' : 'Could not save the van: ' + t.slice(0, 200) }, 200); }
    return J({ ok: true, van: row });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}
async function handleTransportVanDelete(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim(); const vanId = String(b.vanId || '').trim();
  if (!tenant || !vanId) return J({ error: 'tenant and vanId required' }, 400);
  const left = (await sbFetch(env, '/transport_students?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId) + '&select=id&limit=1').catch(() => [])) || [];
  if (left.length) return J({ error: 'Move or remove the children on this van first.' }, 409);
  await fetch(env.SUPABASE_URL + '/rest/v1/transport_vans?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId), { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') });
  await fetch(env.SUPABASE_URL + '/rest/v1/transport_positions?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId), { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') }).catch(() => {});
  return J({ ok: true });
}

// POST /transport/settings/save { tenant, school_lat, school_lng, petrol_price_ugx, diesel_price_ugx }
async function handleTransportSettingsSave(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  if (!tenant) return J({ error: 'tenant required' }, 400);
  const cur = await tSettings(env, tenant);
  const lat = b.school_lat !== undefined ? num(b.school_lat) : cur.school_lat;
  const lng = b.school_lng !== undefined ? num(b.school_lng) : cur.school_lng;
  if ((lat != null || lng != null) && !validLatLng(lat, lng)) return J({ error: 'The school location is not a valid map point.' }, 400);
  const price = (v, d) => { const n = num(v); return n && n > 1000 && n < 50000 ? n : d; };
  const c = tCaller(request);
  const row = { tenant_id: tenant, school_lat: lat, school_lng: lng, petrol_price_ugx: price(b.petrol_price_ugx, cur.petrol_price_ugx), diesel_price_ugx: price(b.diesel_price_ugx, cur.diesel_price_ugx), updated_by: (c && c.email) || null, updated_at: new Date().toISOString() };
  const r = await fetch(env.SUPABASE_URL + '/rest/v1/transport_settings?on_conflict=tenant_id', { method: 'POST', headers: sbHeaders(env, 'resolution=merge-duplicates,return=minimal'), body: JSON.stringify(row) });
  if (!r.ok) { const t = await r.text(); return J({ error: /transport_settings/.test(t) ? 'Run the C9 transport SQL in Supabase first (supabase-c9-transport.sql).' : t.slice(0, 200) }, 200); }
  return J({ ok: true, settings: row });
}

// Fuel estimate for a distance on a van.
function fuelFor(km, van, settings) {
  const l100 = Number((van && van.l_per_100km) || T_DEFAULTS.l_per_100km);
  const price = Number((van && van.fuel_type === 'petrol') ? settings.petrol_price_ugx : settings.diesel_price_ugx) || T_DEFAULTS.diesel_price_ugx;
  const litres = Math.round(km * l100 / 100 * 100) / 100;
  return { litres, cost: Math.round(litres * price), l_per_100km: l100, price_per_litre: price };
}

// POST /transport/trip/start { tenant, vanId, kind: 'pickup' | 'dropoff' }
async function handleTransportTripStart(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim(); const vanId = String(b.vanId || '').trim();
  const kind = b.kind === 'dropoff' ? 'dropoff' : 'pickup';
  if (!tenant || !vanId) return J({ error: 'tenant and vanId required' }, 400);
  if (!canDrive(request)) return J({ error: 'Only drivers can start a trip.' }, 403);
  if (!(await vanAllowed(request, env, tenant, vanId))) return J({ error: 'This van is not assigned to you.' }, 403);
  const c = tCaller(request);
  try {
    const now = new Date().toISOString();
    // Fresh list for the trip: pickup → everyone waiting at home;
    // drop-off → everyone on board at school.
    await sbWrite(env, '/transport_students?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId), { status: kind === 'pickup' ? 'waiting' : 'on_board', updated_at: now }, 'PATCH', 'return=minimal');
    let trip = null;
    try {
      const kids = (await sbFetch(env, '/transport_students?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId) + '&select=id')) || [];
      const r = await sbWrite(env, '/transport_trips', { tenant_id: tenant, van_id: vanId, kind, driver_email: (c && c.email) || null, started_at: now, km: 0, children_total: kids.length }, 'POST', 'return=representation');
      trip = Array.isArray(r) ? r[0] : r;
    } catch (e) { /* trips table not migrated yet: trip runs without a saved record */ }
    return J({ ok: true, trip: trip || { id: null, kind, started_at: now } });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

// POST /transport/trip/end { tenant, vanId, tripId, km }
async function handleTransportTripEnd(request, env, cors) {
  const J = tJ(cors);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim(); const vanId = String(b.vanId || '').trim();
  if (!tenant || !vanId) return J({ error: 'tenant and vanId required' }, 400);
  if (!canDrive(request)) return J({ error: 'Only drivers can end a trip.' }, 403);
  if (!(await vanAllowed(request, env, tenant, vanId))) return J({ error: 'This van is not assigned to you.' }, 403);
  const km = Math.max(0, Math.min(800, num(b.km) || 0));
  try {
    const [vans, settings] = await Promise.all([
      sbFetch(env, '/transport_vans?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId) + '&select=*').catch(() => []),
      tSettings(env, tenant),
    ]);
    const fuel = fuelFor(km, (vans || [])[0], settings);
    let kind = b.kind === 'dropoff' ? 'dropoff' : 'pickup';
    if (b.tripId) {
      const tr = (await sbFetch(env, '/transport_trips?id=eq.' + Number(b.tripId) + '&tenant_id=eq.' + enc(tenant) + '&select=kind&limit=1').catch(() => [])) || [];
      if (tr[0]) kind = tr[0].kind;
    }
    let notified = 0;
    if (kind === 'pickup') notified = await markVanArrived(env, tenant, vanId);
    const kids = (await sbFetch(env, '/transport_students?tenant_id=eq.' + enc(tenant) + '&van_id=eq.' + enc(vanId) + '&select=status')) || [];
    const done = kids.filter(k => (kind === 'pickup' ? ['arrived', 'on_board'] : ['dropped']).indexOf(k.status) >= 0).length;
    if (b.tripId) {
      await sbWrite(env, '/transport_trips?id=eq.' + Number(b.tripId) + '&tenant_id=eq.' + enc(tenant), { ended_at: new Date().toISOString(), km, litres: fuel.litres, fuel_cost_ugx: fuel.cost, children_done: done, updated_at: new Date().toISOString() }, 'PATCH', 'return=minimal').catch(() => {});
    }
    return J({ ok: true, km, ...fuel, children_done: done, children_total: kids.length, notified });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

// GET /transport/trips?tenant=&van=  — recent trips with km and fuel.
async function handleTransportTrips(request, url, env, cors) {
  const J = tJ(cors);
  const tenant = url.searchParams.get('tenant') || '';
  if (!tenant) return J({ error: 'tenant required' }, 400);
  const allowed = await allowedVans(request, env, tenant);
  let q = '/transport_trips?tenant_id=eq.' + enc(tenant) + '&select=*&order=started_at.desc&limit=60';
  const van = url.searchParams.get('van');
  if (van) q += '&van_id=eq.' + enc(van);
  try {
    const rows = ((await sbFetch(env, q)) || []).filter(r => allowed === null || allowed.indexOf(r.van_id) >= 0);
    return J({ trips: rows });
  } catch (e) { return J({ trips: [], error: 'Trip history needs the C9 transport SQL.' }, 200); }
}

export { R_DRIVE, T_DEFAULTS, T_STATUSES, allowedVans, canDrive, enc, fuelFor, handleTransportLive, handleTransportMark, handleTransportMarkArrived, handleTransportPing, handleTransportSetStop, handleTransportSettingsSave, handleTransportStudentRemove, handleTransportStudentSave, handleTransportTripEnd, handleTransportTripStart, handleTransportTrips, handleTransportVanDelete, handleTransportVanSave, markVanArrived, notifyHeads, num, tCaller, tJ, tRow, tSettings, validLatLng, vanAllowed };
