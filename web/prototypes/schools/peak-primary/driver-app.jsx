/* NEXT School OS — Driver app (audit C9)
 *
 * One screen, built for a phone on the dashboard:
 *  • full-screen map: the van (live GPS), the school, every child's pickup pin
 *  • the best route through the pins with live traffic colours, distance and
 *    time (Google Maps + Routes API when the school has a Maps key;
 *    OpenStreetMap + OSRM without traffic otherwise)
 *  • trip meter: km driven (from GPS), litres and fuel cost estimate
 *  • next child card: call the parent, navigate, Picked up / Absent / Dropped
 *  • End trip = "Arrived at school": parents of everyone on board are alerted
 *
 * Data comes only from the NEXT Worker (/transport/*). session-guard.js has
 * already checked the sign-in; its fetch wrapper adds the token. A driver
 * only gets the van(s) the school assigned to their email.
 */
(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';

  const C = {
    bg: '#0B0F17', panel: '#111827', panel2: '#1F2937', line: 'rgba(255,255,255,0.09)',
    text: '#F9FAFB', mute: '#9CA3AF', green: '#10B981', amber: '#F59E0B', red: '#EF4444', blue: '#3B82F6', accent: '#00FC8F',
  };
  const STATUS = {
    waiting:  { label: 'Waiting',   color: C.amber },
    on_board: { label: 'On board',  color: C.green },
    arrived:  { label: 'At school', color: C.blue },
    dropped:  { label: 'Dropped',   color: C.blue },
    absent:   { label: 'Absent',    color: '#6B7280' },
  };

  // ─── helpers ──────────────────────────────────────────────────────────
  const toast = (m, k) => { try { window.peakToast ? window.peakToast(m, k) : console.log(m); } catch (e) {} };
  function haversineM(a, b) {
    const R = 6371000, r = x => x * Math.PI / 180;
    const dLat = r(b[0] - a[0]), dLng = r(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const fmtKm = m => m == null ? '—' : (m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km');
  const fmtMin = s => { if (s == null) return '—'; const m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };
  const ugx = n => 'UGX ' + Math.round(n || 0).toLocaleString('en-UG');
  const hasPin = s => s.lat != null && s.lng != null;
  async function api(path, body) {
    const res = await fetch(WK + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) throw new Error(d.error || ('HTTP ' + res.status));
    return d;
  }
  function decodePolyline(str) { // Google encoded polyline → [[lat,lng],…]
    let i = 0, lat = 0, lng = 0; const out = [];
    while (i < str.length) {
      for (const k of [0, 1]) {
        let b, shift = 0, res = 0;
        do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        const d = (res & 1) ? ~(res >> 1) : (res >> 1);
        if (k === 0) lat += d; else lng += d;
      }
      out.push([lat / 1e5, lng / 1e5]);
    }
    return out;
  }
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // ─── Route planning ───────────────────────────────────────────────────
  // Returns { path:[[lat,lng]], segments:[{path,speed}], order:[idx], legs:[{m,s}], m, s, staticS, traffic:bool }
  async function routeGoogle(key, origin, stops, dest) {
    const P = p => ({ location: { latLng: { latitude: p[0], longitude: p[1] } } });
    const body = {
      origin: P(origin), destination: P(dest), intermediates: stops.map(P),
      travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE', departureTime: new Date(Date.now() + 30000).toISOString(),
      optimizeWaypointOrder: stops.length > 1, extraComputations: ['TRAFFIC_ON_POLYLINE'], polylineQuality: 'HIGH_QUALITY',
    };
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex,routes.legs.distanceMeters,routes.legs.duration,routes.travelAdvisory.speedReadingIntervals' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    const r = d && d.routes && d.routes[0];
    if (!r) throw new Error((d && d.error && d.error.message) || 'No route found');
    const path = decodePolyline(r.polyline.encodedPolyline);
    const iv = (r.travelAdvisory && r.travelAdvisory.speedReadingIntervals) || [];
    const segments = iv.length ? iv.map(x => ({ speed: x.speed || 'NORMAL', path: path.slice(x.startPolylinePointIndex || 0, (x.endPolylinePointIndex || 0) + 1) })) : [{ speed: 'NORMAL', path }];
    const sec = v => Number(String(v || '0').replace('s', ''));
    return {
      path, segments, traffic: true,
      order: r.optimizedIntermediateWaypointIndex && r.optimizedIntermediateWaypointIndex[0] !== -1 ? r.optimizedIntermediateWaypointIndex : stops.map((_, i) => i),
      legs: (r.legs || []).map(l => ({ m: l.distanceMeters || 0, s: sec(l.duration) })),
      m: r.distanceMeters || 0, s: sec(r.duration), staticS: sec(r.staticDuration),
    };
  }
  async function routeOsrm(origin, stops, dest) {
    const pts = [origin].concat(stops, [dest]);
    const coords = pts.map(p => p[1] + ',' + p[0]).join(';');
    const res = await fetch('https://router.project-osrm.org/trip/v1/driving/' + coords + '?source=first&destination=last&roundtrip=false&overview=full&geometries=geojson');
    const d = await res.json();
    if (!d || d.code !== 'Ok') throw new Error('No route found');
    const t = d.trips[0];
    const path = t.geometry.coordinates.map(c => [c[1], c[0]]);
    // waypoint_index = position of each input point in the trip
    const order = stops.map((_, i) => ({ i, pos: d.waypoints[i + 1].waypoint_index })).sort((a, b) => a.pos - b.pos).map(x => x.i);
    return { path, segments: [{ speed: 'NORMAL', path }], traffic: false, order, legs: t.legs.map(l => ({ m: l.distance, s: l.duration })), m: t.distance, s: t.duration, staticS: t.duration };
  }

  // ─── Map: Google when a key is given, else Leaflet + OpenStreetMap ─────
  let gmapsPromise = null;
  function loadGoogle(key) {
    if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
    if (!gmapsPromise) gmapsPromise = new Promise((ok, fail) => {
      window.__nxGmapsReady = () => ok(window.google.maps);
      const s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&v=weekly&callback=__nxGmapsReady';
      s.async = true; s.onerror = () => fail(new Error('Google Maps did not load'));
      document.head.appendChild(s);
      setTimeout(() => fail(new Error('Google Maps timed out')), 15000);
    });
    return gmapsPromise;
  }
  let leafletPromise = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!leafletPromise) leafletPromise = new Promise((ok, fail) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => ok(window.L); s.onerror = () => fail(new Error('Map library did not load'));
      document.head.appendChild(s);
    });
    return leafletPromise;
  }
  const SPEED_COLOR = { NORMAL: '#22C55E', SLOW: '#F59E0B', TRAFFIC_JAM: '#EF4444' };
  const DARK_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#1d2433' }] }, { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] }, { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4b5563' }] }, { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ];
  function pinHtml(label, color, big) {
    const s = big ? 34 : 28;
    return '<div style="width:' + s + 'px;height:' + s + 'px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:' + color + ';border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#0b0f17;font:800 12px Inter,sans-serif">' + label + '</span></div>';
  }

  function makeMap(el, kind, center) {
    if (kind === 'google') {
      const g = window.google.maps;
      const map = new g.Map(el, { center: { lat: center[0], lng: center[1] }, zoom: 14, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', styles: DARK_STYLE, clickableIcons: false });
      const traffic = new g.TrafficLayer(); traffic.setMap(map);
      let van = null, school = null, pins = [], lines = [];
      const svgPin = (label, color) => ({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path d="M17 43C17 43 32 27 32 16A15 15 0 0 0 2 16C2 27 17 43 17 43Z" fill="' + color + '" stroke="#fff" stroke-width="2"/><text x="17" y="21" text-anchor="middle" font-family="Arial" font-weight="700" font-size="13" fill="#0b0f17">' + label + '</text></svg>'),
        scaledSize: new g.Size(34, 44), anchor: new g.Point(17, 43),
      });
      return {
        kind,
        setVan(p, heading) {
          if (!p) return;
          const icon = { path: g.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, rotation: heading || 0 };
          if (!van) van = new g.Marker({ map, position: { lat: p[0], lng: p[1] }, icon, zIndex: 999 });
          else { van.setPosition({ lat: p[0], lng: p[1] }); van.setIcon(icon); }
        },
        setSchool(p) {
          if (school) school.setMap(null); school = null;
          if (p) school = new g.Marker({ map, position: { lat: p[0], lng: p[1] }, icon: svgPin('🏫', '#00FC8F'), title: 'School', zIndex: 998 });
        },
        setPins(list, onTap) {
          pins.forEach(m => m.setMap(null));
          pins = list.map(x => { const m = new g.Marker({ map, position: { lat: x.p[0], lng: x.p[1] }, icon: svgPin(x.label, x.color), title: x.title }); m.addListener('click', () => onTap && onTap(x.id)); return m; });
        },
        setRoute(route) {
          lines.forEach(l => l.setMap(null)); lines = [];
          if (!route) return;
          lines.push(new g.Polyline({ map, path: route.path.map(p => ({ lat: p[0], lng: p[1] })), strokeColor: '#0b0f17', strokeOpacity: 0.9, strokeWeight: 9 }));
          route.segments.forEach(sg => lines.push(new g.Polyline({ map, path: sg.path.map(p => ({ lat: p[0], lng: p[1] })), strokeColor: SPEED_COLOR[sg.speed] || SPEED_COLOR.NORMAL, strokeOpacity: 1, strokeWeight: 6 })));
        },
        fit(points) {
          if (!points.length) return;
          const b = new g.LatLngBounds(); points.forEach(p => b.extend({ lat: p[0], lng: p[1] }));
          if (points.length === 1) { map.setCenter({ lat: points[0][0], lng: points[0][1] }); map.setZoom(16); } else map.fitBounds(b, 60);
        },
        center(p, z) { map.panTo({ lat: p[0], lng: p[1] }); if (z) map.setZoom(z); },
        onDrag(fn) { map.addListener('dragstart', fn); },
        destroy() {},
      };
    }
    const L = window.L;
    const map = L.map(el, { zoomControl: false, attributionControl: true }).setView(center, 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '© OpenStreetMap © CARTO' }).addTo(map);
    let van = null, school = null, pins = [], lines = [];
    return {
      kind,
      setVan(p, heading) {
        if (!p) return;
        const icon = L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: '<div style="width:30px;height:30px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,.25);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;transform:rotate(' + (heading || 0) + 'deg)">▲</div>' });
        if (!van) van = L.marker(p, { icon, zIndexOffset: 1000 }).addTo(map); else { van.setLatLng(p); van.setIcon(icon); }
      },
      setSchool(p) {
        if (school) map.removeLayer(school); school = null;
        if (p) school = L.marker(p, { icon: L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 34], html: pinHtml('🏫', '#00FC8F', true) }) }).addTo(map);
      },
      setPins(list, onTap) {
        pins.forEach(m => map.removeLayer(m));
        pins = list.map(x => L.marker(x.p, { title: x.title, icon: L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 28], html: pinHtml(x.label, x.color) }) }).addTo(map).on('click', () => onTap && onTap(x.id)));
      },
      setRoute(route) {
        lines.forEach(l => map.removeLayer(l)); lines = [];
        if (!route) return;
        lines.push(L.polyline(route.path, { color: '#0b0f17', weight: 9, opacity: 0.9 }).addTo(map));
        route.segments.forEach(sg => lines.push(L.polyline(sg.path, { color: route.traffic ? (SPEED_COLOR[sg.speed] || '#22C55E') : '#3B82F6', weight: 6 }).addTo(map)));
      },
      fit(points) { if (!points.length) return; if (points.length === 1) map.setView(points[0], 16); else map.fitBounds(points, { padding: [60, 60] }); },
      center(p, z) { map.setView(p, z || map.getZoom()); },
      onDrag(fn) { map.on('dragstart', fn); },
      destroy() { map.remove(); },
    };
  }

  // ─── The app ──────────────────────────────────────────────────────────
  function DriverApp({ profile }) {
    const tenant = profile.tenantId;
    const [data, setData] = useState(null);
    const [loadErr, setLoadErr] = useState('');
    const [vanId, setVanId] = useState(() => store.get('nx.driver.van.' + tenant) || '');
    const [trip, setTrip] = useState(() => store.get('nx.driver.trip.' + tenant));
    const [pos, setPos] = useState(null);            // { p:[lat,lng], acc, heading, speed }
    const [gpsErr, setGpsErr] = useState('');
    const [route, setRoute] = useState(null);
    const [routeErr, setRouteErr] = useState('');
    const [mapKind, setMapKind] = useState('');
    const [follow, setFollow] = useState(true);
    const [sheet, setSheet] = useState('peek');      // 'peek' | 'full'
    const [focusId, setFocusId] = useState(null);
    const [busy, setBusy] = useState('');
    const [summary, setSummary] = useState(null);
    const mapEl = useRef(null); const mapRef = useRef(null);
    const lastFix = useRef(null); const tripRef = useRef(trip); const posRef = useRef(null); const routeAt = useRef(null);
    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { tripRef.current = trip; trip ? store.set('nx.driver.trip.' + tenant, trip) : store.del('nx.driver.trip.' + tenant); }, [trip]);

    // ── data
    const load = useCallback(() => api('/transport/live?tenant=' + encodeURIComponent(tenant)).then(d => { setData(d); setLoadErr(''); }).catch(e => setLoadErr(e.message)), [tenant]);
    useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

    const fleet = (data && data.fleet) || [];
    const vanChoices = useMemo(() => {
      const ids = new Set(fleet.map(v => v.van_id));
      ((data && data.students) || []).forEach(s => ids.add(s.van_id));
      return [...ids].sort();
    }, [data]);
    useEffect(() => { if (data && (!vanId || vanChoices.indexOf(vanId) < 0) && vanChoices.length) { setVanId(vanChoices[0]); store.set('nx.driver.van.' + tenant, vanChoices[0]); } }, [data, vanChoices]);
    const van = fleet.find(v => v.van_id === vanId) || { van_id: vanId, name: vanId ? vanId.toUpperCase() : 'Van', l_per_100km: 12, fuel_type: 'diesel' };
    const settings = (data && data.settings) || {};
    const school = settings.school_lat != null && settings.school_lng != null ? [settings.school_lat, settings.school_lng] : null;
    const kids = useMemo(() => ((data && data.students) || []).filter(s => s.van_id === vanId), [data, vanId]);
    const kind = trip ? trip.kind : 'pickup';
    const todo = kids.filter(s => kind === 'pickup' ? s.status === 'waiting' : s.status === 'on_board');
    const pricePerL = Number(van.fuel_type === 'petrol' ? settings.petrol_price_ugx : settings.diesel_price_ugx) || (van.fuel_type === 'petrol' ? 6850 : 6700);
    const l100 = Number(van.l_per_100km) || 12;
    const fuel = km => ({ l: km * l100 / 100, ugx: km * l100 / 100 * pricePerL });

    // ── GPS + trip meter
    useEffect(() => {
      if (!('geolocation' in navigator)) { setGpsErr('This phone has no GPS.'); return; }
      const id = navigator.geolocation.watchPosition(g => {
        const p = [g.coords.latitude, g.coords.longitude];
        const acc = g.coords.accuracy || 999;
        let heading = g.coords.heading;
        const last = lastFix.current;
        if (last && (heading == null || isNaN(heading))) {
          const dy = p[0] - last.p[0], dx = (p[1] - last.p[1]) * Math.cos(p[0] * Math.PI / 180);
          if (Math.abs(dx) + Math.abs(dy) > 1e-5) heading = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
        }
        setPos({ p, acc, heading: heading || (last && last.heading) || 0, speed: g.coords.speed });
        setGpsErr('');
        // Count distance only for good fixes, ignoring jitter and jumps.
        const tr = tripRef.current;
        if (tr && acc <= 50) {
          if (last && last.acc <= 50) {
            const d = haversineM(last.p, p); const dt = Math.max(1, (g.timestamp - last.t) / 1000);
            if (d >= 15 && d / dt < 42) { setTrip(t => t ? { ...t, m: (t.m || 0) + d } : t); lastFix.current = { p, acc, t: g.timestamp, heading }; }
          } else lastFix.current = { p, acc, t: g.timestamp, heading };
        } else if (!last || acc < last.acc) lastFix.current = { p, acc, t: g.timestamp, heading };
      }, e => setGpsErr(e.code === 1 ? 'Location is blocked. Allow location for this site in your phone settings.' : 'Waiting for GPS…'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
      return () => navigator.geolocation.clearWatch(id);
    }, []);

    // Send the van position every 10 s while a trip runs (every 60 s otherwise).
    useEffect(() => {
      if (!vanId) return;
      const send = () => {
        const pos = posRef.current;
        if (!pos) return;
        const tr = tripRef.current;
        api('/transport/ping', { tenant, vanId, vanName: van.name, driverName: profile.fullName, lat: pos.p[0], lng: pos.p[1], speed: pos.speed != null ? Math.round(pos.speed * 3.6) : null, heading: pos.heading, status: 'normal', tripId: tr && tr.id, tripKm: tr ? +((tr.m || 0) / 1000).toFixed(2) : null }).catch(() => {});
      };
      send();
      const t = setInterval(send, trip ? 10000 : 60000);
      return () => clearInterval(t);
    }, [vanId, !!trip, !!pos]);

    // Keep the screen on during a trip.
    useEffect(() => {
      if (!trip || !navigator.wakeLock) return;
      let lock = null; navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {});
      return () => { try { lock && lock.release(); } catch (e) {} };
    }, [!!trip]);

    // ── map
    useEffect(() => {
      if (!data || mapRef.current || !mapEl.current) return;
      const center = (pos && pos.p) || school || (kids.find(hasPin) && [kids.find(hasPin).lat, kids.find(hasPin).lng]) || [0.3476, 32.5825];
      const boot = data.mapsKey ? loadGoogle(data.mapsKey).then(() => 'google').catch(() => loadLeaflet().then(() => 'leaflet')) : loadLeaflet().then(() => 'leaflet');
      boot.then(k => { mapRef.current = makeMap(mapEl.current, k, center); mapRef.current.onDrag(() => setFollow(false)); setMapKind(k); })
        .catch(e => setRouteErr('Map could not load: ' + e.message));
    }, [data]);
    useEffect(() => { if (mapRef.current) mapRef.current.setSchool(school); }, [mapKind, school && school.join()]);
    useEffect(() => {
      const m = mapRef.current; if (!m) return;
      const orderIndex = {}; (route ? route.order : []).forEach((k, i) => { orderIndex[k] = i; });
      const withPins = kids.filter(hasPin);
      m.setPins(withPins.map(s => {
        const k = todo.filter(hasPin).indexOf(s); const n = k >= 0 && route && orderIndex[k] != null ? orderIndex[k] + 1 : null;
        return { id: s.id, p: [s.lat, s.lng], title: s.student_name, label: n ? String(n) : (k >= 0 ? '•' : s.status === 'absent' ? '–' : '✓'), color: (STATUS[s.status] || STATUS.waiting).color };
      }), id => { setFocusId(id); setSheet('full'); });
    }, [mapKind, kids, route]);
    useEffect(() => { const m = mapRef.current; if (m && pos) { m.setVan(pos.p, pos.heading); if (follow && trip) m.center(pos.p); } }, [mapKind, pos, follow, !!trip]);
    useEffect(() => { if (mapRef.current) mapRef.current.setRoute(route); }, [mapKind, route]);
    const fitAll = () => { const m = mapRef.current; if (!m) return; const pts = kids.filter(hasPin).map(s => [s.lat, s.lng]); if (school) pts.push(school); if (pos) pts.push(pos.p); m.fit(pts); setFollow(false); };
    useEffect(() => { if (mapKind) fitAll(); }, [mapKind, vanId]);

    // ── route through the remaining pins
    const routeKey = todo.filter(hasPin).map(s => s.id).join(',') + '|' + kind + '|' + (school ? school.join() : '');
    const computeRoute = useCallback(async () => {
      const pos = posRef.current;
      const origin = pos ? pos.p : school;
      const stops = todo.filter(hasPin).map(s => [s.lat, s.lng]);
      if (!origin || (!stops.length && !(kind === 'pickup' && school && pos))) { setRoute(null); return; }
      let dest, mids = stops.slice(), finalIsStop = false;
      if (kind === 'pickup' && school) dest = school;
      else {
        if (!stops.length) { setRoute(null); return; }
        // drop-off (or no school pin): finish at the stop farthest from the start
        let far = 0; stops.forEach((p, i) => { if (haversineM(origin, p) > haversineM(origin, stops[far])) far = i; });
        dest = stops[far]; mids = stops.filter((_, i) => i !== far); finalIsStop = far;
      }
      routeAt.current = { p: origin, t: Date.now() };
      try {
        let r;
        if (data && data.mapsKey) { try { r = await routeGoogle(data.mapsKey, origin, mids, dest); } catch (e) { r = await routeOsrm(origin, mids, dest); } }
        else r = await routeOsrm(origin, mids, dest);
        if (finalIsStop !== false) { // put the farthest stop back as the last one in the order
          const realIdx = i => (i >= finalIsStop ? i + 1 : i);
          r.order = r.order.map(realIdx).concat([finalIsStop]);
        }
        setRoute(r); setRouteErr('');
      } catch (e) { setRouteErr('Route unavailable right now (' + e.message + '). Pins are still shown.'); }
    }, [routeKey, !!pos, data && data.mapsKey]);
    useEffect(() => { computeRoute(); }, [routeKey, !!pos]);
    // Re-plan when the van has moved well off the last plan (a detour or a
    // wrong turn), at most once every 45 s to keep map costs down.
    useEffect(() => {
      const r = routeAt.current;
      if (!trip || !pos || !r || !r.p) return;
      if (haversineM(r.p, pos.p) > 400 && Date.now() - r.t > 45000) computeRoute();
    }, [pos]);
    useEffect(() => { if (!trip) return; const t = setInterval(computeRoute, 180000); return () => clearInterval(t); }, [!!trip, computeRoute]);

    const ordered = useMemo(() => {
      const withPin = todo.filter(hasPin);
      const seq = route ? route.order.map(i => withPin[i]).filter(Boolean) : withPin;
      return seq.concat(todo.filter(s => !hasPin(s)));
    }, [todo, route]);
    const next = ordered[0] || null;
    const focus = kids.find(s => s.id === focusId) || next;

    // ── actions
    const mark = async (s, status) => {
      setBusy('mark' + s.id);
      try { await api('/transport/mark', { tenant, id: s.id, status }); setData(d => ({ ...d, students: d.students.map(x => x.id === s.id ? { ...x, status } : x) })); setFocusId(null); }
      catch (e) { toast('Could not save: ' + e.message, 'error'); }
      setBusy('');
    };
    const startTrip = async (k) => {
      if (!vanId) return;
      setBusy('start');
      try {
        const d = await api('/transport/trip/start', { tenant, vanId, kind: k });
        lastFix.current = pos ? { p: pos.p, acc: pos.acc, t: Date.now(), heading: pos.heading } : null;
        setTrip({ id: d.trip && d.trip.id, kind: k, vanId, startedAt: Date.now(), m: 0 });
        setSummary(null); setFollow(true); setSheet('peek');
        await load();
      } catch (e) { toast('Could not start the trip: ' + e.message, 'error'); }
      setBusy('');
    };
    const endTrip = async () => {
      if (!trip) return;
      const left = todo.length;
      if (left && !window.confirm(left + (kind === 'pickup' ? ' child(ren) not picked up yet. ' : ' child(ren) not dropped yet. ') + 'End the trip anyway?')) return;
      setBusy('end');
      try {
        const km = +((trip.m || 0) / 1000).toFixed(2);
        const d = await api('/transport/trip/end', { tenant, vanId, tripId: trip.id, kind: trip.kind, km });
        setSummary({ ...d, kind: trip.kind, minutes: Math.round((Date.now() - trip.startedAt) / 60000) });
        setTrip(null); setRoute(null);
        await load();
      } catch (e) { toast('Could not end the trip: ' + e.message, 'error'); }
      setBusy('');
    };
    const emergency = async () => {
      if (!window.confirm('Send an EMERGENCY alert to the head teacher with your location?')) return;
      try { await api('/transport/ping', { tenant, vanId, vanName: van.name, driverName: profile.fullName, lat: pos ? pos.p[0] : 0, lng: pos ? pos.p[1] : 0, status: 'emergency' }); toast('Emergency alert sent to the school.', 'success'); }
      catch (e) { toast('Could not send: ' + e.message + '. Call the school now.', 'error'); }
    };
    const navUrl = s => 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + s.lat + ',' + s.lng;
    const tel = p => 'tel:' + String(p || '').split(/[\/,;]/)[0].replace(/[^0-9+]/g, '');

    // ── render
    const tripKm = trip ? (trip.m || 0) / 1000 : 0;
    const remKm = route ? route.m / 1000 : null;
    const delay = route && route.traffic && route.staticS ? Math.max(0, route.s - route.staticS) : 0;
    const btn = (bg, fg) => ({ border: 'none', borderRadius: 12, padding: '13px 14px', fontWeight: 800, fontSize: 14.5, background: bg, color: fg || '#0b0f17', cursor: 'pointer', fontFamily: 'inherit' });

    if (!data && !loadErr) return <Center>Loading your route…</Center>;
    if (loadErr && !data) return <Center><div style={{ color: C.red, marginBottom: 12 }}>{loadErr}</div><button style={btn(C.accent)} onClick={load}>Try again</button></Center>;
    if (data && data.myVans && !data.myVans.length) return <Center><div style={{ fontSize: 40 }}>🚐</div><div style={{ fontWeight: 800, fontSize: 18, margin: '10px 0' }}>No van assigned to you yet</div><div style={{ color: C.mute, maxWidth: 300 }}>Ask the head teacher to add your email ({profile.email}) to a van in Transport.</div></Center>;

    return (
      <div style={{ position: 'fixed', inset: 0, background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
        <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} aria-label="Route map" />

        {/* top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'max(10px, env(safe-area-inset-top)) 12px 10px', display: 'flex', gap: 8, alignItems: 'center', background: 'linear-gradient(#0b0f17ee, #0b0f1700)', zIndex: 500 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {vanChoices.length > 1 && !trip ? (
              <select value={vanId} onChange={e => { setVanId(e.target.value); store.set('nx.driver.van.' + tenant, e.target.value); setRoute(null); }} style={{ background: C.panel, color: C.text, border: '1px solid ' + C.line, borderRadius: 10, padding: '8px 10px', fontWeight: 700, fontSize: 14, maxWidth: '100%' }}>
                {vanChoices.map(v => { const f = fleet.find(x => x.van_id === v); return <option key={v} value={v}>{(f && f.name) || v}{f && f.plate ? ' · ' + f.plate : ''}</option>; })}
              </select>
            ) : (
              <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{van.name || vanId}{van.plate ? ' · ' + van.plate : ''}</div>
            )}
            <div style={{ fontSize: 11.5, color: gpsErr ? C.amber : C.mute, marginTop: 2 }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 9, background: gpsErr ? C.amber : C.green, marginRight: 6 }} />
              {gpsErr || (pos ? 'GPS ±' + Math.round(pos.acc) + ' m' : 'Finding GPS…')}{mapKind === 'leaflet' ? ' · basic map (no traffic)' : mapKind === 'google' ? ' · live traffic' : ''}
            </div>
          </div>
          <button onClick={emergency} aria-label="Emergency" style={{ ...btn(C.red, '#fff'), padding: '9px 12px', fontSize: 12.5 }}>SOS</button>
          <button onClick={() => window.NextSession && window.NextSession.signOut()} aria-label="Sign out" style={{ ...btn(C.panel2, C.text), padding: '9px 12px', fontSize: 12.5 }}>⎋</button>
        </div>

        {/* route banner */}
        {(route || routeErr || !school) && (
          <div style={{ position: 'absolute', top: 'calc(max(10px, env(safe-area-inset-top)) + 54px)', left: 12, right: 12, zIndex: 500, background: C.panel + 'f2', border: '1px solid ' + C.line, borderRadius: 14, padding: '10px 12px', display: 'flex', gap: 14, alignItems: 'center', fontSize: 13 }}>
            {route ? (
              <>
                <div><div style={{ fontSize: 20, fontWeight: 900 }}>{fmtMin(route.s)}</div><div style={{ color: C.mute, fontSize: 11.5 }}>{fmtKm(route.m)} · {kind === 'pickup' && school ? 'to school' : 'last drop'}</div></div>
                <div style={{ flex: 1, fontSize: 12, color: delay > 120 ? C.amber : C.mute }}>{route.traffic ? (delay > 120 ? '+' + fmtMin(delay) + ' traffic' : 'Traffic is light') : 'No live traffic on this map'}{remKm != null ? <div style={{ color: C.mute }}>≈ {fuel(remKm).l.toFixed(1)} L · {ugx(fuel(remKm).ugx)} fuel left</div> : null}</div>
              </>
            ) : <div style={{ color: C.amber, fontSize: 12.5 }}>{routeErr || 'The school location is not set — routes end at the last child. Ask the head to set it in Transport.'}</div>}
          </div>
        )}

        {/* map buttons */}
        <div style={{ position: 'absolute', right: 12, bottom: sheet === 'full' ? '62vh' : 230, zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => { setFollow(true); pos && mapRef.current && mapRef.current.center(pos.p, 16); }} aria-label="Follow van" style={{ ...btn(follow ? C.blue : C.panel, '#fff'), width: 46, height: 46, padding: 0, borderRadius: 23 }}>◎</button>
          <button onClick={fitAll} aria-label="Show all pickups" style={{ ...btn(C.panel, '#fff'), width: 46, height: 46, padding: 0, borderRadius: 23 }}>⤢</button>
        </div>

        {/* bottom sheet */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 600, background: C.panel, borderTop: '1px solid ' + C.line, borderRadius: '18px 18px 0 0', maxHeight: sheet === 'full' ? '62vh' : 'none', overflowY: 'auto', padding: '8px 14px max(14px, env(safe-area-inset-bottom))', boxShadow: '0 -10px 30px rgba(0,0,0,.4)' }}>
          <button onClick={() => setSheet(s => s === 'full' ? 'peek' : 'full')} aria-label="Expand" style={{ display: 'block', margin: '0 auto 8px', width: 46, height: 5, borderRadius: 5, border: 'none', background: '#4B5563', cursor: 'pointer' }} />

          {/* trip meter */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
            <Stat label="Driven" value={trip ? tripKm.toFixed(1) + ' km' : '—'} />
            <Stat label="Fuel used" value={trip ? fuel(tripKm).l.toFixed(fuel(tripKm).l < 1 ? 2 : 1) + ' L' : '—'} />
            <Stat label="Fuel cost" value={trip ? ugx(fuel(tripKm).ugx) : '—'} />
          </div>

          {summary && !trip && (
            <div style={{ background: '#064E3B', border: '1px solid #10B98155', borderRadius: 14, padding: 12, marginBottom: 10, fontSize: 13 }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>✓ Trip ended{summary.notified ? ' · ' + summary.notified + ' parents told their child arrived' : ''}</div>
              <div>{Number(summary.km).toFixed(1)} km in {summary.minutes} min · {Number(summary.litres).toFixed(summary.litres < 1 ? 2 : 1)} L · {ugx(summary.cost)} fuel · {summary.children_done}/{summary.children_total} children</div>
            </div>
          )}

          {!trip ? (
            <div>
              <div style={{ fontSize: 13, color: C.mute, marginBottom: 8 }}>{kids.length} children on this van · {kids.filter(hasPin).length} with a pickup pin</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button disabled={!!busy || !kids.length} onClick={() => startTrip('pickup')} style={btn(C.accent)}>{busy === 'start' ? 'Starting…' : '☀️ Start pickup'}</button>
                <button disabled={!!busy || !kids.length} onClick={() => startTrip('dropoff')} style={btn('#60A5FA')}>🏠 Start drop-off</button>
              </div>
              {!kids.length && <div style={{ marginTop: 10, fontSize: 12.5, color: C.amber }}>No children on this van yet. The school adds them in Transport.</div>}
            </div>
          ) : focus ? (
            <ChildCard s={focus} isNext={focus === next} kind={kind} busy={busy === 'mark' + focus.id} onMark={mark} navUrl={navUrl} tel={tel} leg={route && focus === next && route.legs[0]} onClose={focusId ? () => setFocusId(null) : null} btn={btn} />
          ) : (
            <div style={{ padding: '6px 0 4px', fontSize: 14, color: C.green, fontWeight: 700 }}>{kind === 'pickup' ? 'Everyone is on board. Drive to school.' : 'Every child has been dropped.'}</div>
          )}

          {trip && (
            <button disabled={!!busy} onClick={endTrip} style={{ ...btn(kind === 'pickup' ? C.blue : C.panel2, '#fff'), width: '100%', marginTop: 10 }}>
              {busy === 'end' ? 'Saving…' : kind === 'pickup' ? '🏫 Arrived at school — end trip' : 'End drop-off trip'}
            </button>
          )}

          {sheet === 'full' && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: 1, color: C.mute, textTransform: 'uppercase', marginBottom: 6 }}>{trip ? 'Order of stops' : 'Children on this van'}</div>
              {(trip ? ordered.concat(kids.filter(s => ordered.indexOf(s) < 0)) : kids).map((s, i) => (
                <button key={s.id} onClick={() => { setFocusId(s.id); hasPin(s) && mapRef.current && mapRef.current.center([s.lat, s.lng], 16); setFollow(false); }} style={{ display: 'flex', width: '100%', gap: 10, alignItems: 'center', padding: '10px 4px', background: 'none', border: 'none', borderBottom: '1px solid ' + C.line, color: C.text, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 13, background: (STATUS[s.status] || STATUS.waiting).color, color: '#0b0f17', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{trip && ordered.indexOf(s) >= 0 ? ordered.indexOf(s) + 1 : '•'}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{s.student_name}</span>
                    <span style={{ display: 'block', fontSize: 12, color: C.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.stream}{s.pickup_note ? ' · ' + s.pickup_note : ''}{!hasPin(s) ? ' · no pickup pin' : ''}</span>
                  </span>
                  <span style={{ fontSize: 11.5, color: (STATUS[s.status] || STATUS.waiting).color, fontWeight: 700 }}>{(STATUS[s.status] || STATUS.waiting).label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function ChildCard({ s, isNext, kind, busy, onMark, navUrl, tel, leg, onClose, btn }) {
    const done = kind === 'pickup' ? s.status !== 'waiting' : s.status !== 'on_board';
    return (
      <div style={{ background: C.panel2, borderRadius: 16, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: 1 }}>{isNext ? (kind === 'pickup' ? 'Next pickup' : 'Next drop-off') : 'Child'}{leg ? ' · ' + fmtKm(leg.m) + ' · ' + fmtMin(leg.s) : ''}</div>
            <div style={{ fontSize: 19, fontWeight: 900, marginTop: 2 }}>{s.student_name}</div>
            <div style={{ fontSize: 12.5, color: C.mute }}>{s.stream}{s.guardian_name ? ' · ' + s.guardian_name : ''}</div>
            {s.pickup_note && <div style={{ fontSize: 13, marginTop: 6 }}>📍 {s.pickup_note}</div>}
            {!hasPin(s) && <div style={{ fontSize: 12.5, marginTop: 6, color: C.amber }}>No pickup pin yet — ask the school to set it.</div>}
          </div>
          {onClose && <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: C.mute, fontSize: 20, cursor: 'pointer' }}>×</button>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          {s.guardian_phone ? <a href={tel(s.guardian_phone)} style={{ ...btn(C.panel, C.text), textAlign: 'center', textDecoration: 'none' }}>📞 Call parent</a> : <span style={{ ...btn(C.panel, C.mute), textAlign: 'center', opacity: 0.6 }}>No phone</span>}
          {hasPin(s) ? <a href={navUrl(s)} target="_blank" rel="noopener" style={{ ...btn(C.panel, C.text), textAlign: 'center', textDecoration: 'none' }}>🧭 Navigate</a> : <span style={{ ...btn(C.panel, C.mute), textAlign: 'center', opacity: 0.6 }}>No pin</span>}
        </div>
        {done ? (
          <div style={{ marginTop: 10, fontSize: 13, color: (STATUS[s.status] || {}).color, fontWeight: 700 }}>{(STATUS[s.status] || {}).label}</div>
        ) : kind === 'pickup' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 8 }}>
            <button disabled={busy} onClick={() => onMark(s, 'on_board')} style={btn(C.green)}>{busy ? 'Saving…' : '✓ Picked up'}</button>
            <button disabled={busy} onClick={() => onMark(s, 'absent')} style={btn('#4B5563', '#fff')}>Absent</button>
          </div>
        ) : (
          <button disabled={busy} onClick={() => onMark(s, 'dropped')} style={{ ...btn(C.green), width: '100%', marginTop: 8 }}>{busy ? 'Saving…' : '✓ Dropped off'}</button>
        )}
      </div>
    );
  }
  function Stat({ label, value }) {
    return <div style={{ background: C.panel2, borderRadius: 12, padding: '8px 10px' }}><div style={{ fontSize: 10.5, color: C.mute, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div><div style={{ fontWeight: 800, fontSize: 14.5, marginTop: 2, whiteSpace: 'nowrap' }}>{value}</div></div>;
  }
  function Center({ children }) {
    return <div style={{ position: 'fixed', inset: 0, background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>{children}</div>;
  }

  // Waits for session-guard; only drivers and the head/admin open this app.
  function DriverRoot() {
    const [profile, setProfile] = useState(window.NextSession && window.NextSession.verified ? window.NextSession.profile : null);
    useEffect(() => { if (!profile && window.NextSession) window.NextSession.ready.then(setProfile); }, []);
    if (!profile) return <Center>Checking your sign-in…</Center>;
    if (['driver', 'head', 'admin'].indexOf(profile.role) < 0) return <Center><div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>The driver app is for drivers</div><a href={'/school/' + encodeURIComponent(profile.tenantId)} style={{ color: C.accent }}>Go to the school app</a></Center>;
    return <DriverApp profile={profile} />;
  }
  window.DriverRoot = DriverRoot;
  window.__nxDriverTest = { decodePolyline, haversineM };
})();
