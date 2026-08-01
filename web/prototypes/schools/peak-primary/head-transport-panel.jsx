/**
 * NEXT OS - Head Teacher Live Transport Control Panel
 * Exposes: window.HeadTransportPanel, window.HeadTransportPanelDemo
 *
 * Was 100% mock: MOCK_TELEMETRY.vans/students plus hardcoded stat cards
 * ("3/3 vans active", "42/58 boarded", "88% on schedule" — literal strings,
 * not computed from anything) and a fake CSS-positioned "map" with no real
 * geography. Rebuilt to fetch real data from the worker's /transport/live
 * route (backed by transport_positions/transport_students — see
 * cloudflare-worker/supabase-transport-tracking.sql), render an actual
 * Leaflet map (already loaded globally, same library driver-view.jsx uses
 * for its own map), and compute every stat from the real fetched data.
 */
(function () {
  const React = window.React;
  const { useState, useEffect, useRef } = React;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';

  const BRAND = window.SCHOOL_BRAND || {
    primaryColor: '#00F0FF',
    accentColor: '#FF0055',
    schoolName: (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'Your School').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  };

  const BadgeStrip = window.SchoolBadgeStrip || function ({ pageName }) {
    return (
      <div style={{ padding: '12px 20px', background: 'linear-gradient(90deg, #1A1A24, #0F0F14)', borderBottom: `2px solid ${BRAND.primaryColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: BRAND.primaryColor, display: 'grid', placeItems: 'center', color: '#000', fontWeight: 'bold' }}>{(BRAND.schoolName.match(/[A-Za-z0-9]/g) || ['S'])[0]}</div>
          <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>{BRAND.schoolName}</div>
        </div>
        <div style={{ color: BRAND.primaryColor, fontWeight: '600', fontSize: '14px', letterSpacing: '2px' }}>{pageName}</div>
      </div>
    );
  };

  const T = {
    bgMain: '#0B0C10', bgCard: '#1A1A24', bgCardHover: '#252533',
    textPrimary: '#FFFFFF', textSecondary: '#8B949E', accent: BRAND.primaryColor,
    border: 'rgba(255, 255, 255, 0.1)',
    fontMain: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    status: { green: '#00FF66', blue: '#00CCFF', amber: '#FFB300', purple: '#B366FF', orange: '#FF6600' },
  };

  const STATUS_STYLE = {
    waiting:  { color: T.status.amber, label: '⏳ Waiting', icon: '⏳' },
    on_board: { color: T.status.green, label: '🟢 On Board', icon: '🟢' },
    arrived:  { color: T.status.blue,  label: '🔵 Arrived at School', icon: '🔵' },
  };

  function tenant() { return (typeof window.getOSActiveTenant === 'function') ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre'; }

  function LiveMap({ vans }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef({});

    useEffect(() => {
      if (!window.L || !mapRef.current || mapInstance.current) return;
      const map = window.L.map(mapRef.current, { zoomControl: true }).setView([0.3476, 32.5825], 12);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(map);
      mapInstance.current = map;
      return () => { map.remove(); mapInstance.current = null; };
    }, []);

    useEffect(() => {
      const map = mapInstance.current;
      if (!map || !window.L) return;
      const seen = new Set();
      vans.forEach(v => {
        if (v.lat == null || v.lng == null) return;
        seen.add(v.van_id);
        const icon = window.L.divIcon({
          className: 'transport-van-icon',
          html: `<div style="background:${v.status === 'arrived' ? T.status.blue : v.status === 'stopped' ? T.status.orange : T.status.green};color:#0A1029;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 0 12px rgba(0,0,0,0.5);">🚐</div>`,
          iconSize: [36, 36], iconAnchor: [18, 18],
        });
        if (markers.current[v.van_id]) {
          markers.current[v.van_id].setLatLng([v.lat, v.lng]).setIcon(icon);
        } else {
          markers.current[v.van_id] = window.L.marker([v.lat, v.lng], { icon }).addTo(map)
            .bindPopup(`<b>${v.van_name || v.van_id}</b><br/>${v.driver_name || ''}<br/>${(v.speed_kmh || 0).toFixed(0)} km/h`);
        }
      });
      Object.keys(markers.current).forEach(id => {
        if (!seen.has(id)) { map.removeLayer(markers.current[id]); delete markers.current[id]; }
      });
    }, [vans]);

    return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />;
  }

  function HeadTransportPanel() {
    const [vans, setVans] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVan, setActiveVan] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [busyVan, setBusyVan] = useState(null);

    const load = () => {
      fetch(WK + '/transport/live?tenant=' + encodeURIComponent(tenant()))
        .then(r => r.json())
        .then(out => { setVans(out.vans || []); setStudents(out.students || []); setLoading(false); })
        .catch(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    useEffect(() => {
      const sb = window.NextSession && window.NextSession.sb;
      if (!sb) return;
      const ch = sb.channel('transport-live-' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_positions', filter: 'tenant_id=eq.' + tenant() }, load)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_students', filter: 'tenant_id=eq.' + tenant() }, load)
        .subscribe();
      const poll = setInterval(load, 15000); // fallback until the realtime publication migration has run
      return () => { try { sb.removeChannel(ch); } catch (e) {} clearInterval(poll); };
    }, []);

    const vanNames = Array.from(new Set(students.map(s => s.van_id))).concat(vans.map(v => v.van_id)).filter((v, i, a) => a.indexOf(v) === i);

    const filteredStudents = students.filter(s => {
      const matchSearch = !searchQuery || (s.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.stop_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchVan = activeVan === 'All' || s.van_id === activeVan;
      return matchSearch && matchVan;
    });

    // The actual pickup queue: earliest-order 'waiting' student per van is
    // "next" — this is the queue the goal asks for, not just a flat list.
    const nextPickupByVan = {};
    vanNames.forEach(vid => {
      const waiting = students.filter(s => s.van_id === vid && s.status === 'waiting').sort((a, b) => a.pickup_order - b.pickup_order);
      if (waiting[0]) nextPickupByVan[vid] = waiting[0];
    });

    const onBoardCount = students.filter(s => s.status === 'on_board').length;
    const totalCount = students.length;
    const activeVansCount = vans.filter(v => v.status !== 'arrived').length;

    const markArrived = async (vanId) => {
      setBusyVan(vanId);
      try {
        const res = await fetch(WK + '/transport/mark-arrived', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: tenant(), vanId }),
        });
        const out = await res.json();
        if (out.error) window.peakToast && window.peakToast('Could not notify parents: ' + out.error, 'error');
        else { window.peakToast && window.peakToast('Notified ' + (out.notified || 0) + ' families.', 'success'); load(); }
      } catch (e) { window.peakToast && window.peakToast('Could not reach the school system.', 'error'); }
      setBusyVan(null);
    };

    const markOnBoard = async (studentRowId) => {
      try {
        await fetch(WK + '/transport/mark', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: studentRowId, status: 'on_board' }),
        });
        load();
      } catch (e) {}
    };

    return (
      <div style={{ fontFamily: T.fontMain, background: T.bgMain, color: T.textPrimary, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <BadgeStrip pageName="LIVE SCHOOL TRANSPORT & FLEET" />

        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.bgCard, padding: '16px 24px', borderRadius: '12px', border: `1px solid ${T.border}`, flexWrap: 'wrap', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Fleet Command & Live Tracking</h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => window.open('/prototypes/schools/peak-primary/driver-dashboard.html', '_blank')}
                style={{ background: '#3B82F6', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                Open Driver App 🚌
              </button>
              <select value={activeVan} onChange={e => setActiveVan(e.target.value)}
                style={{ background: '#000', color: T.textPrimary, border: `1px solid ${T.border}`, padding: '8px 12px', borderRadius: '6px', outline: 'none' }}>
                <option value="All">All Vans ({vanNames.length})</option>
                {vanNames.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.status.green }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.status.green, boxShadow: `0 0 8px ${T.status.green}` }}></div>
                Live — real GPS synced from the driver's device
              </div>
            </div>
          </div>

          {/* Stat cards — all computed from real fetched data, no hardcoded numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ background: T.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSecondary, fontSize: '13px', textTransform: 'uppercase', marginBottom: '8px' }}>Vans Reporting</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: T.accent }}>{vans.length}</div>
            </div>
            <div style={{ background: T.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSecondary, fontSize: '13px', textTransform: 'uppercase', marginBottom: '8px' }}>Students On Board</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{onBoardCount} / {totalCount}</div>
            </div>
            <div style={{ background: T.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSecondary, fontSize: '13px', textTransform: 'uppercase', marginBottom: '8px' }}>Still Waiting</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: T.status.amber }}>{students.filter(s => s.status === 'waiting').length}</div>
            </div>
            <div style={{ background: T.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSecondary, fontSize: '13px', textTransform: 'uppercase', marginBottom: '8px' }}>Arrived Safely</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: T.status.blue, display: 'flex', alignItems: 'center', height: '34px' }}>
                {students.filter(s => s.status === 'arrived').length} at school
              </div>
            </div>
          </div>

          {/* Real Leaflet map + van cards with Mark Arrived action */}
          <div style={{ display: 'flex', gap: '24px', height: '440px' }}>
            <div style={{ flex: '6', borderRadius: '12px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              {vans.length === 0 && !loading ? (
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: T.textSecondary, fontSize: 13, textAlign: 'center', padding: 20 }}>
                  No van has reported a GPS position yet.<br/>Open the Driver App and start a trip to see it here live.
                </div>
              ) : <LiveMap vans={vans} />}
            </div>

            <div style={{ flex: '4', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {vans.length === 0 && !loading && (
                <div style={{ background: T.bgCard, borderRadius: '12px', border: `1px solid ${T.border}`, padding: '20px', color: T.textSecondary, fontSize: 13 }}>
                  No vans reporting yet.
                </div>
              )}
              {vans.filter(v => activeVan === 'All' || v.van_id === activeVan).map(van => {
                const next = nextPickupByVan[van.van_id];
                return (
                  <div key={van.van_id} style={{ background: T.bgCard, borderRadius: '12px', border: `1px solid ${T.border}`, padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: T.accent }}>{van.van_name || van.van_id}</h3>
                        <div style={{ color: T.textSecondary, fontSize: '13px', marginTop: '4px' }}>Driver: {van.driver_name || '—'}</div>
                      </div>
                      <div style={{ background: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: T.status.green, border: `1px solid ${T.border}` }}>
                        {(van.speed_kmh || 0).toFixed(0)} km/h
                      </div>
                    </div>

                    {next && (
                      <div style={{ background: 'rgba(0,252,143,0.08)', border: '1px solid rgba(0,252,143,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: T.status.green, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Next Pickup</div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{next.student_name}{next.stop_name ? ' · ' + next.stop_name : ''}</div>
                      </div>
                    )}

                    <button onClick={() => markArrived(van.van_id)} disabled={busyVan === van.van_id} style={{
                      width: '100%', padding: '10px', background: T.accent, color: '#0A1029', border: 'none', borderRadius: 8,
                      fontWeight: 800, fontSize: 13, cursor: busyVan === van.van_id ? 'wait' : 'pointer',
                    }}>
                      {busyVan === van.van_id ? 'Notifying…' : '🚸 Mark Arrived — Notify Parents'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live pickup queue / manifest, ordered per van */}
          <div style={{ background: T.bgCard, borderRadius: '12px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Pickup Queue</h2>
              <input type="text" placeholder="Find student or stop…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ background: '#000', border: `1px solid ${T.border}`, color: T.textPrimary, padding: '8px 12px', borderRadius: '6px', outline: 'none', width: '250px' }} />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ background: '#000', color: T.textSecondary, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>
                  <tr>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>#</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Student</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Van</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Stop</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: T.textSecondary }}>Loading…</td></tr>
                  ) : filteredStudents.length > 0 ? filteredStudents.map((s, i) => {
                    const st = STATUS_STYLE[s.status] || STATUS_STYLE.waiting;
                    const isNext = nextPickupByVan[s.van_id] && nextPickupByVan[s.van_id].id === s.id;
                    return (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}`, background: isNext ? 'rgba(0,252,143,0.05)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)') }}>
                        <td style={{ padding: '16px 20px', color: T.textSecondary, fontFamily: 'monospace' }}>{s.pickup_order}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: '500' }}>{s.student_name} {isNext && <span style={{ fontSize: 10, marginLeft: 6, color: T.status.green, fontWeight: 700 }}>NEXT</span>}</div>
                          <div style={{ color: T.textSecondary, fontSize: '12px', marginTop: '2px' }}>{s.stream || ''}</div>
                        </td>
                        <td style={{ padding: '16px 20px', color: T.textSecondary }}>{s.van_id}</td>
                        <td style={{ padding: '16px 20px', color: T.textSecondary }}>{s.stop_name || '—'}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: st.color + '20', color: st.color, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: `1px solid ${st.color}40` }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          {s.status === 'waiting' && (
                            <button onClick={() => markOnBoard(s.id)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.textPrimary, padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                              Mark On Board
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: T.textSecondary }}>No students on the pickup queue yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    );
  }

  window.HeadTransportPanel = HeadTransportPanel;
  window.HeadTransportPanelDemo = function () { return <HeadTransportPanel />; };
})();
