/* src/peak-screens.jsx */
/* global React, V4, PEAK */
// Peak Primary · Additional screens
// Attendance · Teachers · Transport · Learning · Reports

window.PEAK_SCREENS = (function () {
  const { useState, useMemo } = React;
  const T = window.V4.T;
  const D = window.PEAK || window.PEAK_FALLBACK;

  // ─── Shared atoms ─────────────────────────────────────────────────────────
  function Pill({ children, tone = 'neutral' }) {
    const map = {
      neutral: { bg: T.surface2, fg: T.ink2 },
      good:    { bg: T.goodSft,  fg: T.good },
      warn:    { bg: T.warnSft,  fg: T.warn },
      bad:     { bg: T.redSft,   fg: T.redInk },
      brand:   { bg: 'rgba(58,79,156,0.30)', fg: '#a8b4e8' },
      gold:    { bg: 'rgba(232,200,122,0.18)', fg: T.gold },
    }[tone] || { bg: T.surface2, fg: T.ink2 };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
        background: map.bg, color: map.fg, whiteSpace: 'nowrap', fontFamily: T.mono,
      }}>{children}</span>
    );
  }

  function PageHeader({ eyebrow, title, subtitle, actions }) {
    return (
      <header style={{
        padding: '22px 28px 18px', borderBottom: '1px solid ' + T.border,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        background: T.bg,
      }}>
        <div>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>{eyebrow}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.05 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: T.ink2, marginTop: 6, maxWidth: 720 }}>{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
      </header>
    );
  }

  function Card({ children, style, pad = 22, title, action }) {
    return (
      <div style={{
        background: T.surface, border: '1px solid ' + T.border, borderRadius: 14,
        padding: pad, position: 'relative', ...style,
      }}>
        {(title || action) && (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, letterSpacing: '-0.005em' }}>{title}</div>
            {action}
          </div>
        )}
        {children}
      </div>
    );
  }

  function PrimaryBtn({ children, onClick }) {
    return <button onClick={onClick} style={{
      padding: '9px 16px', background: T.red, color: '#fff', border: 'none',
      borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
    }}>{children}</button>;
  }
  function GhostBtn({ children, onClick }) {
    return <button onClick={onClick} style={{
      padding: '8px 14px', background: 'transparent', color: T.ink2,
      border: '1px solid ' + T.borderStr, borderRadius: 9, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: T.font,
    }}>{children}</button>;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ATTENDANCE · stream picker + register marking
  // ═════════════════════════════════════════════════════════════════════════
  function Attendance({ store }) {
    const defaultStream = (D.streams && D.streams.length > 0) ? D.streams[0].id : 'Primary Seven';
    const [streamId, setStreamId] = useState(defaultStream);
    const [att, setAtt] = useState(null);
    React.useEffect(() => { const tid = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'peak-primary'; fetch('https://nextos-sentinel.nextafricaai.workers.dev/attendance/today?tenant=' + encodeURIComponent(tid)).then(r => r.json()).then(setAtt).catch(() => {}); }, []);

    const allStudents = (store && store.students && store.students.length > 0)
      ? store.students
      : ((window.SCHOOL_STUDENTS && window.SCHOOL_STUDENTS.length > 0) ? window.SCHOOL_STUDENTS : ((D && D.students) || []));

    const norm = (str) => (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

    const streamRoster = useMemo(() => {
      const target = norm(streamId);
      const matched = allStudents.filter(s => {
        const sStr = norm(s.stream || s.class || '');
        return sStr === target || sStr.startsWith(target) || target.startsWith(sStr);
      });
      return matched.length > 0 ? matched : allStudents.slice(0, 4);
    }, [streamId, allStudents]);

    // local register state — initialized as everyone-present
    const [marks, setMarks] = useState(() => {
      const m = {};
      streamRoster.forEach(s => { m[s.id] = 'present'; });
      return m;
    });

    // re-sync marks when stream changes
    React.useEffect(() => {
      const m = {};
      streamRoster.forEach(s => { m[s.id] = 'present'; });
      setMarks(m);
    }, [streamRoster]);

    const counts = useMemo(() => {
      const c = { present: 0, absent: 0, late: 0 };
      Object.values(marks).forEach(v => { c[v] = (c[v] || 0) + 1; });
      return c;
    }, [marks]);

    const setMark = (id, status) => setMarks(cur => ({ ...cur, [id]: status }));

    const saveRegister = () => {
      const updates = Object.entries(marks).map(([id, status]) => ({ studentId: Number(id), status }));
      const presentCount = store ? store.markAttendance(updates) : 0;
      window.peakToast('Register saved · ' + streamId, 'success',
        counts.present + ' present · ' + counts.absent + ' absent · ' + counts.late + ' late. Guardians of absentees notified.');
    };

    const markAllPresent = () => {
      const m = {};
      streamRoster.forEach(s => { m[s.id] = 'present'; });
      setMarks(m);
      window.peakToast('All marked present', 'info');
    };

    const streamLabel = D.streams.find(s => s.id === streamId)?.label || streamId;
    const totalInStream = streamRoster.length || 1;
    const presentPct = Math.round((counts.present / totalInStream) * 100);

    return (
      <div>
        <PageHeader
          eyebrow="Attendance · Daily Register"
          title="Daily register"
          subtitle="Mark attendance for each stream. Register closes 08:30. Guardians of absent students are auto-messaged."
          actions={
            <>
              <GhostBtn onClick={markAllPresent}>All present</GhostBtn>
              <PrimaryBtn onClick={saveRegister}>Save register</PrimaryBtn>
            </>
          }
        />

        {/* school + class attendance — two real gauges */}
        <div style={{ padding: '18px 28px 0' }}>
          <Card pad={18} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 14 }}>TODAY · SCHOOL vs CLASS ATTENDANCE</div>
            {!att ? <div style={{ color: T.ink3, fontSize: 13 }}>Loading today’s attendance…</div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {[['At school · the gate', att.gateCount || 0, (T.green || '#00c389'), 'passed through the gate today'], ['In class · roll call', att.classCount || 0, '#5b8def', 'marked present by a teacher']].map((g, i) => {
                  const pct = att.total > 0 ? Math.round(g[1] / att.total * 100) : 0;
                  return (
                    <div key={i} style={{ background: T.surface2, border: '1px solid ' + T.border, borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 12, color: T.ink3 }}>{g[0]}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: g[2], marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{g[1]} <span style={{ fontSize: 14, color: T.ink3, fontWeight: 600 }}>of {att.total} · {pct}%</span></div>
                      <div style={{ height: 8, background: T.surface3, borderRadius: 4, overflow: 'hidden', marginTop: 10 }}><div style={{ height: '100%', width: pct + '%', background: g[2] }} /></div>
                      <div style={{ fontSize: 11, color: T.ink4, marginTop: 6 }}>{g[3]}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {att && att.dodgingCount > 0 ? (
              <div style={{ marginTop: 14, padding: '11px 13px', background: 'rgba(216,162,0,0.12)', border: '1px solid ' + (T.gold || '#d8a200'), borderRadius: 10, fontSize: 12.5, color: T.ink2, lineHeight: 1.55 }}>
                <b style={{ color: T.ink }}>{att.dodgingCount}</b> learner{att.dodgingCount === 1 ? '' : 's'} passed the gate but {att.dodgingCount === 1 ? 'is' : 'are'} not marked present in any class — possible class-skipping. Worth a check.
              </div>
            ) : null}
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 6, marginBottom: 14 }}>
            {D.streams.map(st => { const isCur = st.id === streamId; return (
              <button key={st.id} onClick={() => setStreamId(st.id)} style={{ padding: '10px 6px', borderRadius: 8, background: isCur ? (T.red || '#FF4757') : T.surface2, border: '1px solid ' + (isCur ? (T.red || '#FF4757') : T.border), color: '#fff', cursor: 'pointer', textAlign: 'center', fontFamily: T.mono, fontSize: 12, fontWeight: isCur ? 700 : 500 }}>{st.id}</button>
            ); })}
          </div>
        </div>

        {/* register table */}
        <div style={{ padding: '0 28px 32px' }}>
          <Card pad={0}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600 }}>SELECTED STREAM</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: T.ink, marginTop: 4 }}>{streamLabel}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Pill tone="good">{counts.present || 0} present</Pill>
                <Pill tone="bad">{counts.absent || 0} absent</Pill>
                <Pill tone="warn">{counts.late || 0} late</Pill>
                <Pill tone="brand">{presentPct}% of stream</Pill>
              </div>
            </div>
            {streamRoster.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: T.ink3, fontSize: 13 }}>
                No students enrolled in {streamLabel} yet. Use <strong style={{ color: T.ink }}>Add student</strong> on the Students page.
              </div>
            ) : (
              <div>
                {streamRoster.map((s, i) => {
                  const mark = marks[s.id] || 'present';
                  return (
                    <div key={s.id} style={{
                      display: 'grid', gridTemplateColumns: '44px 1fr 1fr 320px',
                      gap: 12, alignItems: 'center',
                      padding: '12px 22px',
                      borderTop: i > 0 ? '1px solid ' + T.border : 'none',
                    }}>
                      <div style={{ fontFamily: T.mono, fontSize: 11, color: T.ink3 }}>#{(i + 1).toString().padStart(2, '0')}</div>
                      <div>
                        <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginTop: 2 }}>Last seen: {s.lastSeen}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: T.ink3 }}>{s.guardian}</div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {[
                          { k: 'present', l: 'Present', c: T.good },
                          { k: 'late',    l: 'Late',    c: T.warn },
                          { k: 'absent',  l: 'Absent',  c: T.red },
                        ].map(opt => {
                          const sel = mark === opt.k;
                          return (
                            <button key={opt.k} onClick={() => setMark(s.id, opt.k)} style={{
                              padding: '8px 16px', borderRadius: 8, border: 'none',
                              background: sel ? opt.c : T.surface2,
                              color: sel ? '#fff' : T.ink2,
                              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
                              transition: 'background 0.12s',
                            }}>{opt.l}</button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEACHERS · staff roster
  // ═════════════════════════════════════════════════════════════════════════
  function Teachers({ onAddTeacher }) {
    const [query, setQuery] = useState('');
    const teachList = (D && Array.isArray(D.teachers)) ? D.teachers : [];
    const [selectedId, setSelectedId] = useState(teachList[0] ? teachList[0].id : null);

    const filtered = useMemo(() => {
      if (!query) return teachList;
      const q = query.toLowerCase();
      return teachList.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.role || '').toLowerCase().includes(q) ||
        (Array.isArray(t.subjects) ? t.subjects.join(' ') : '').toLowerCase().includes(q)
      );
    }, [query, teachList]);

    const selected = (teachList.find(t => t.id === selectedId) || teachList[0]) || { name: 'Teacher', role: 'Staff', subjects: [], phone: '', email: '' };

    return (
      <div>
        <PageHeader
          eyebrow={`Staff · ${teachList.length} teachers`}
          title="Teachers"
          subtitle="Active staff, classes taught, and recent performance signals."
          actions={
            <>
              <input
                placeholder="Search by name, role, subject…"
                value={query} onChange={e => setQuery(e.target.value)}
                style={{
                  background: T.surface, border: '1px solid ' + T.border, borderRadius: 9,
                  padding: '8px 14px', fontSize: 12.5, color: T.ink, fontFamily: T.font, width: 260, outline: 'none',
                }}
              />
              <PrimaryBtn onClick={onAddTeacher}>+ Add teacher</PrimaryBtn>
            </>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, padding: '18px 28px 32px' }}>
          {/* roster grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignContent: 'start' }}>
            {filtered.map(t => {
              const initials = t.name.replace(/^(Mrs?|Mr|Ms|Miss)\.?\s+/i, '').split(' ').map(p => p[0]).slice(0,2).join('');
              const isSel = t.id === selectedId;
              return (
                <button key={t.id} onClick={() => setSelectedId(t.id)} style={{
                  textAlign: 'left', cursor: 'pointer',
                  background: isSel ? T.surface2 : T.surface,
                  border: '1px solid ' + (isSel ? T.borderStr : T.border),
                  borderRadius: 12, padding: 16,
                  fontFamily: T.font, color: T.ink,
                  transition: 'background 0.12s, border-color 0.12s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 11,
                      background: 'oklch(0.58 0.09 ' + (40 + (t.id.charCodeAt(1) * 47) % 320) + ')',
                      color: '#fff', display: 'grid', placeItems: 'center',
                      fontSize: 14, fontWeight: 700, flexShrink: 0,
                    }}>{initials}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{t.name}</div>
                      <div style={{ fontSize: 11.5, color: T.ink3, fontFamily: T.mono, marginTop: 2 }}>{t.role}</div>
                    </div>
                    {t.tone === 'top' && <Pill tone="gold">★</Pill>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {t.subjects.map(s => <Pill key={s} tone="brand">{s}</Pill>)}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {t.streams.map(st => (
                      <span key={st} style={{ fontSize: 10.5, fontFamily: T.mono, color: T.ink3, background: T.bg, padding: '2px 7px', borderRadius: 5 }}>{st === 'all' ? 'whole school' : st}</span>
                    ))}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: T.ink3, fontSize: 13 }}>
                No teachers match “{query}”
              </div>
            )}
          </div>

          {/* detail panel */}
          <div style={{ position: 'sticky', top: 18, alignSelf: 'start' }}>
            <Card pad={0}>
              <div style={{ padding: '20px 22px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 13,
                  background: 'oklch(0.58 0.09 ' + (40 + (selected.id.charCodeAt(1) * 47) % 320) + ')',
                  color: '#fff', display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 700,
                }}>{selected.name.replace(/^(Mrs?|Mr|Ms|Miss)\.?\s+/i, '').split(' ').map(p => p[0]).slice(0,2).join('')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{selected.role}</div>
                </div>
              </div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>CONTACT</div>
                  <div style={{ fontSize: 12.5, color: T.ink, fontFamily: T.mono }}>{selected.phone}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <GhostBtn onClick={() => window.peakWhatsApp(selected.phone, 'Hello ' + (selected.name || '') + ',')}>WhatsApp</GhostBtn>
                    <GhostBtn onClick={() => window.peakCall(selected.phone)}>Call</GhostBtn>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>SUBJECTS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selected.subjects.map(s => <Pill key={s} tone="brand">{s}</Pill>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>STREAMS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selected.streams.map(st => <Pill key={st} tone="neutral">{st === 'all' ? 'whole school' : st}</Pill>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>WITH PEAK SINCE</div>
                  <div style={{ fontSize: 13, color: T.ink2 }}>{selected.joined}</div>
                </div>
                <div style={{
                  background: 'linear-gradient(150deg, ' + T.surface3 + ' 0%, ' + T.surface + ' 70%)',
                  border: '1px solid ' + T.borderStr, borderRadius: 11, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: T.red, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 10, fontWeight: 700 }}>AI</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>This week's note</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.55 }}>
                    {selected.tone === 'top'
                      ? selected.name.split(' ')[1] + ' has the highest quiz-completion rate this term. Strong consistency.'
                      : 'Lessons on schedule. Reports for term 2 progressing — assist available if needed.'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TRANSPORT · live bus status
  // ═════════════════════════════════════════════════════════════════════════
  // Was 100% mock and actually broken: D.buses is never defined anywhere
  // (window.PEAK / window.PEAK_FALLBACK have no `buses` array), so
  // `D.buses[0].id` on first render threw immediately — this whole screen
  // has been an error-boundary fallback ("Screen render recovery"), not a
  // working feature, this whole time. Rebuilt on real data from the
  // worker's /transport/live route (transport_positions/transport_students
  // — see cloudflare-worker/supabase-transport-tracking.sql), with a real
  // Leaflet map (already loaded globally) instead of the "fake map
  // placeholder" comment that was here.
  function Transport() {
    const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
    const [vans, setVans] = React.useState([]);
    const [students, setStudents] = React.useState([]);
    const [stops, setStops] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedVan, setSelectedVan] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    const [settingStop, setSettingStop] = React.useState(null);
    const mapRef = React.useRef(null);
    const mapInstance = React.useRef(null);
    const markersRef = React.useRef({});
    const stopMarkersRef = React.useRef({});

    const tenantId = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre');

    const load = () => {
      fetch(WK + '/transport/live?tenant=' + encodeURIComponent(tenantId))
        .then(r => r.json())
        .then(out => {
          setVans(out.vans || []); setStudents(out.students || []); setStops(out.stops || []); setLoading(false);
          setSelectedVan(prev => prev || ((out.vans || [])[0] && out.vans[0].van_id) || null);
        })
        .catch(() => setLoading(false));
    };
    React.useEffect(() => { load(); }, []);

    React.useEffect(() => {
      const sb = window.NextSession && window.NextSession.sb;
      if (!sb) return;
      const ch = sb.channel('idx-transport-' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_positions', filter: 'tenant_id=eq.' + tenantId }, load)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_students', filter: 'tenant_id=eq.' + tenantId }, load)
        .subscribe();
      const poll = setInterval(load, 15000);
      return () => { try { sb.removeChannel(ch); } catch (e) {} clearInterval(poll); };
    }, []);

    React.useEffect(() => {
      if (!window.L || !mapRef.current || mapInstance.current) return;
      const map = window.L.map(mapRef.current).setView([0.3476, 32.5825], 12);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(map);
      mapInstance.current = map;
    }, []);

    React.useEffect(() => {
      const map = mapInstance.current;
      if (!map || !window.L) return;
      const seen = new Set();
      vans.forEach(v => {
        if (v.lat == null || v.lng == null) return;
        seen.add(v.van_id);
        const icon = window.L.divIcon({ className: 'van-icon', html: '<div style="background:' + (v.status === 'arrived' ? T.blue : v.status === 'stopped' ? T.warn : T.good) + ';width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;">🚐</div>', iconSize: [34, 34], iconAnchor: [17, 17] });
        if (markersRef.current[v.van_id]) markersRef.current[v.van_id].setLatLng([v.lat, v.lng]).setIcon(icon);
        else markersRef.current[v.van_id] = window.L.marker([v.lat, v.lng], { icon }).addTo(map).bindPopup('<b>' + (v.van_name || v.van_id) + '</b><br/>' + (v.driver_name || ''));
      });
      Object.keys(markersRef.current).forEach(id => { if (!seen.has(id)) { map.removeLayer(markersRef.current[id]); delete markersRef.current[id]; } });
    }, [vans]);

    // Real per-student markers — only for stops staff have confirmed real
    // coordinates for (see supabase-transport-stops.sql for why this is
    // never auto-geocoded). Grouped by stop so 5 kids sharing one pickup
    // point don't stack 5 identical pins on top of each other.
    React.useEffect(() => {
      const map = mapInstance.current;
      if (!map || !window.L) return;
      const stopCoords = {};
      stops.forEach(s => { stopCoords[s.stop_name] = [s.lat, s.lng]; });
      const byStop = {};
      students.forEach(s => {
        const raw = (s.stop_name || '').split(' · ')[0].trim();
        if (!stopCoords[raw]) return;
        (byStop[raw] = byStop[raw] || []).push(s);
      });
      const seen = new Set();
      Object.keys(byStop).forEach(stopName => {
        seen.add(stopName);
        const kids = byStop[stopName];
        const icon = window.L.divIcon({ className: 'stop-icon', html: '<div style="background:' + T.gold + ';color:#0a1029;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;border:2px solid #fff;">' + kids.length + '</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
        const popup = '<b>' + stopName + '</b><br/>' + kids.map(k => k.student_name).join('<br/>');
        if (stopMarkersRef.current[stopName]) stopMarkersRef.current[stopName].setLatLng(stopCoords[stopName]).setIcon(icon).setPopupContent(popup);
        else stopMarkersRef.current[stopName] = window.L.marker(stopCoords[stopName], { icon }).addTo(map).bindPopup(popup);
      });
      Object.keys(stopMarkersRef.current).forEach(name => { if (!seen.has(name)) { map.removeLayer(stopMarkersRef.current[name]); delete stopMarkersRef.current[name]; } });
    }, [students, stops]);

    const uniqueStopNames = React.useMemo(() => {
      const set = new Set();
      students.forEach(s => { const raw = (s.stop_name || '').split(' · ')[0].trim(); if (raw) set.add(raw); });
      return Array.from(set);
    }, [students]);
    const stopHasCoords = (name) => stops.some(s => s.stop_name === name);

    const setStopLocation = async (stopName) => {
      const input = window.prompt('Real coordinates for "' + stopName + '" (lat,lng — e.g. 0.3476,32.5825). Only enter this if you know the actual location; leave blank to cancel.', '');
      if (!input) return;
      const parts = input.split(',').map(x => parseFloat(x.trim()));
      if (parts.length !== 2 || !isFinite(parts[0]) || !isFinite(parts[1])) { window.peakToast && window.peakToast('Enter as "lat,lng" — e.g. 0.3476,32.5825', 'error'); return; }
      setSettingStop(stopName);
      try {
        const profile = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || {};
        const res = await fetch(WK + '/transport/set-stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant: tenantId, stopName, lat: parts[0], lng: parts[1], setBy: profile.fullName || null }) });
        const out = await res.json();
        if (out.error) window.peakToast && window.peakToast('Could not save location: ' + out.error, 'error');
        else { window.peakToast && window.peakToast('Location saved for ' + stopName, 'success'); load(); }
      } catch (e) { window.peakToast && window.peakToast('Could not reach the school system.', 'error'); }
      setSettingStop(null);
    };

    const sel = vans.find(v => v.van_id === selectedVan);
    const selStudents = students.filter(s => s.van_id === selectedVan);
    const nextPickup = selStudents.filter(s => s.status === 'waiting').sort((a, b) => a.pickup_order - b.pickup_order)[0];
    const onBoardCount = selStudents.filter(s => s.status === 'on_board').length;

    const markArrived = async () => {
      if (!selectedVan || busy) return;
      setBusy(true);
      try {
        const res = await fetch(WK + '/transport/mark-arrived', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant: tenantId, vanId: selectedVan }) });
        const out = await res.json();
        if (out.error) window.peakToast && window.peakToast('Could not notify parents: ' + out.error, 'error');
        else { window.peakToast && window.peakToast('Notified ' + (out.notified || 0) + ' families.', 'success'); load(); }
      } catch (e) { window.peakToast && window.peakToast('Could not reach the school system.', 'error'); }
      setBusy(false);
    };

    return (
      <div>
        <PageHeader
          eyebrow="Transport · live tracking"
          title="Live shuttle tracker"
          subtitle={vans.length ? vans.length + ' van' + (vans.length > 1 ? 's' : '') + ' reporting · ' + students.length + ' children on the pickup roster.' : 'No van has reported a GPS position yet — open the Driver App and start a trip.'}
          actions={<PrimaryBtn onClick={() => window.open('/prototypes/schools/peak-primary/driver-dashboard.html', '_blank')}>Open Driver App</PrimaryBtn>}
        />

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.ink3, fontFamily: T.mono, fontSize: 12 }}>LOADING LIVE POSITIONS…</div>
        ) : vans.length === 0 && students.length === 0 ? (
          <div style={{ margin: '18px 28px', padding: 32, textAlign: 'center', color: T.ink3, background: T.surface, border: '1px solid ' + T.border, borderRadius: 12 }}>
            No shuttle has synced a GPS position yet. Once a driver opens the Driver App and starts a trip, it'll appear here live.
          </div>
        ) : vans.length === 0 ? (
          <div style={{ padding: '18px 28px 32px' }}>
            <div style={{ marginBottom: 14, padding: '12px 16px', background: T.surface, border: '1px solid ' + T.border, borderRadius: 10, color: T.ink3, fontSize: 12.5 }}>
              No van is live yet — this is the assigned pickup roster. Once a driver opens the Driver App and starts a trip, the map and live status above will activate.
            </div>
            {uniqueStopNames.length > 0 && (
              <div style={{ marginBottom: 14, padding: '12px 16px', background: T.surface, border: '1px solid ' + T.border, borderRadius: 10 }}>
                <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>PICKUP STOPS · MAP LOCATION</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {uniqueStopNames.map(name => (
                    <button key={name} onClick={() => setStopLocation(name)} disabled={settingStop === name} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer',
                      background: stopHasCoords(name) ? T.goodSft : T.surface2, color: stopHasCoords(name) ? T.good : T.ink2,
                      border: '1px solid ' + (stopHasCoords(name) ? T.good : T.border),
                    }}>
                      {settingStop === name ? 'Saving…' : (stopHasCoords(name) ? '✓ ' + name : '📍 Set ' + name)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {students.map(s => (
                <div key={s.id} style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{s.student_name}</div>
                    <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginTop: 2 }}>{s.stream || 'Class not set'} · {s.stop_name || 'Stop not set'}</div>
                  </div>
                  <Pill tone={(s.stop_name || '').includes('One-way') ? 'warn' : 'brand'}>{(s.stop_name || '').includes('One-way') ? 'One-way' : 'Round trip'}</Pill>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: '18px 28px 0' }}>
            {uniqueStopNames.length > 0 && (
              <div style={{ marginBottom: 14, padding: '12px 16px', background: T.surface, border: '1px solid ' + T.border, borderRadius: 10 }}>
                <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>PICKUP STOPS · MAP LOCATION</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {uniqueStopNames.map(name => (
                    <button key={name} onClick={() => setStopLocation(name)} disabled={settingStop === name} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer',
                      background: stopHasCoords(name) ? T.goodSft : T.surface2, color: stopHasCoords(name) ? T.good : T.ink2,
                      border: '1px solid ' + (stopHasCoords(name) ? T.good : T.border),
                    }}>
                      {settingStop === name ? 'Saving…' : (stopHasCoords(name) ? '✓ ' + name : '📍 Set ' + name)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {!loading && vans.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 14, padding: '0 28px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vans.map(v => {
                const isSel = v.van_id === selectedVan;
                const count = students.filter(s => s.van_id === v.van_id);
                return (
                  <button key={v.van_id} onClick={() => setSelectedVan(v.van_id)} style={{
                    textAlign: 'left', cursor: 'pointer',
                    background: isSel ? T.surface2 : T.surface,
                    border: '1px solid ' + (isSel ? T.borderStr : T.border),
                    borderRadius: 12, padding: 16,
                    fontFamily: T.font, color: T.ink,
                    display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 16, alignItems: 'center',
                  }}>
                    <div style={{ background: T.surface3, color: '#fff', padding: '10px 8px', borderRadius: 9, fontFamily: T.mono, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>🚐</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{v.van_name || v.van_id}</div>
                      <div style={{ fontSize: 11.5, color: T.ink3, fontFamily: T.mono, marginTop: 3 }}>
                        {v.driver_name || 'Driver not set'} · {count.length} children
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Pill tone={v.status === 'arrived' ? 'good' : v.status === 'stopped' ? 'warn' : 'brand'}>{v.status === 'arrived' ? 'Arrived' : v.status === 'stopped' ? 'Stopped' : 'Moving'}</Pill>
                      <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginTop: 6 }}>{(v.speed_kmh || 0).toFixed(0)} km/h</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* detail panel */}
            <div style={{ position: 'sticky', top: 18, alignSelf: 'start' }}>
              <Card pad={0}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid ' + T.border, background: T.surface3, color: '#fff' }}>
                  <div style={{ fontSize: 10.5, color: '#a8b4e8', fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>VAN DETAIL</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{sel ? (sel.van_name || sel.van_id) : '—'}</div>
                  <div style={{ fontSize: 12, color: '#a8b4e8', fontFamily: T.mono, marginTop: 4 }}>{sel && sel.driver_name}</div>
                </div>

                <div ref={mapRef} style={{ aspectRatio: '4/3', borderBottom: '1px solid ' + T.border }} />

                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600 }}>ON BOARD</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{onBoardCount} / {selStudents.length}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600 }}>SPEED</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{sel ? (sel.speed_kmh || 0).toFixed(0) : '—'} km/h</div>
                    </div>
                  </div>
                  {nextPickup && (
                    <div style={{ background: T.goodSft, border: '1px solid ' + T.good, borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 10, color: T.good, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Next Pickup</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: T.ink }}>{nextPickup.student_name}{nextPickup.stop_name ? ' · ' + nextPickup.stop_name : ''}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <GhostBtn onClick={() => window.peakCall(sel && sel.driver_phone || '')}>Call driver</GhostBtn>
                    <PrimaryBtn onClick={markArrived}>{busy ? 'Notifying…' : '🚸 Mark Arrived — Notify Parents'}</PrimaryBtn>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LEARNING · subjects, assignments, completion
  // ═════════════════════════════════════════════════════════════════════════
  function Learning() {
    const [filter, setFilter] = useState('all'); // all | active | high
    const visible = useMemo(() => {
      if (filter === 'active') return D.subjects.filter(s => s.active > 0);
      if (filter === 'low')    return D.subjects.filter(s => s.complete < 80);
      return D.subjects;
    }, [filter]);

    return (
      <div>
        <PageHeader
          eyebrow={"Learning · " + (window.getSchoolCalendarLabel ? window.getSchoolCalendarLabel().termWeekStr : 'Term 2')}
          title="Subjects & assignments"
          subtitle="Live homework completion, lesson plans, and AI-flagged topics that need attention."
          actions={
            <>
              <div style={{ display: 'flex', gap: 4, padding: 3, background: T.surface, border: '1px solid ' + T.border, borderRadius: 9 }}>
                {[
                  { k: 'all',    l: 'All' },
                  { k: 'active', l: 'Active' },
                  { k: 'low',    l: 'Needs attention' },
                ].map(o => (
                  <button key={o.k} onClick={() => setFilter(o.k)} style={{
                    border: 'none', background: filter === o.k ? T.red : 'transparent',
                    color: filter === o.k ? '#fff' : T.ink2,
                    padding: '6px 14px', borderRadius: 6,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>{o.l}</button>
                ))}
              </div>
              <PrimaryBtn onClick={() => window.peakModal && window.peakModal.open(React.createElement(window.PEAK_FORMS.NewAssignment))}>+ New assignment</PrimaryBtn>
            </>
          }
        />

        <div style={{ padding: '18px 28px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {visible.map(s => {
            const tone = s.color === 'red' ? T.red : s.color === 'warn' ? T.warn : s.color === 'gold' ? T.gold : T.good;
            const completionTone = s.complete >= 90 ? 'good' : s.complete >= 75 ? 'warn' : 'bad';
            return (
              <Card key={s.id} pad={18}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.005em' }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: T.ink3, fontFamily: T.mono, marginTop: 3 }}>{s.stream === 'all' ? 'whole school' : s.stream} · {s.teacher}</div>
                  </div>
                  <Pill tone={completionTone}>{s.complete}% done</Pill>
                </div>
                <div style={{ height: 6, background: T.bg, borderRadius: 999, marginBottom: 14, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: s.complete + '%', background: tone, borderRadius: 999 }} />
                </div>
                <div style={{
                  background: T.surface2, borderRadius: 10, padding: 12, marginBottom: 12,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, fontWeight: 600 }}>CURRENT TOPIC</div>
                    <div style={{ fontSize: 13, color: T.ink, marginTop: 3 }}>{s.topic}</div>
                  </div>
                  <Pill tone="neutral">{s.active} active</Pill>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: T.ink3 }}>
                  <span>Next due: <span style={{ color: T.gold, fontWeight: 600 }}>{s.nextDue}</span></span>
                  <button onClick={() => window.peakToast('Lesson plan opened', 'info', s.name + ' · ' + s.teacher)} style={{
                    background: 'transparent', border: 'none', color: T.ink2, fontSize: 12,
                    cursor: 'pointer', fontFamily: T.font, fontWeight: 600,
                  }}>Open plan →</button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // REPORTS · end-of-term reports
  // ═════════════════════════════════════════════════════════════════════════
  function Reports() {
    const statusMap = {
      pending:    { tone: 'neutral', label: 'Pending' },
      drafting:   { tone: 'warn',    label: 'Drafting' },
      review:     { tone: 'brand',   label: 'In review' },
      published:  { tone: 'gold',    label: 'Published' },
      sent:       { tone: 'good',    label: 'Sent to parents' },
    };

    const totals = D.reports.reduce((acc, r) => {
      acc.total     += r.total;
      acc.drafted   += r.drafted;
      acc.published += r.published;
      acc.sent      += r.sent;
      acc.aiAssist  += r.aiAssist;
      return acc;
    }, { total: 0, drafted: 0, published: 0, sent: 0, aiAssist: 0 });

    return (
      <div>
        <PageHeader
          eyebrow="Reports · Term 2 · End-of-term"
          title="Term 2 reports"
          subtitle="AI-assisted teacher comments. Reports auto-delivered to parents via WhatsApp once published."
          actions={
            <>
              <GhostBtn onClick={() => window.peakToast('Reports exported', 'success', 'PDF · ' + totals.published + ' reports compiled.')}>Export PDFs</GhostBtn>
              <PrimaryBtn onClick={() => window.peakToast('Bulk publish queued', 'success', totals.drafted + ' drafts ready · sending to ' + totals.drafted + ' guardians.')}>Publish drafts</PrimaryBtn>
            </>
          }
        />

        {/* progress strip */}
        <div style={{ padding: '18px 28px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { l: 'Total reports',    v: totals.total },
              { l: 'Drafted',          v: totals.drafted },
              { l: 'Published',        v: totals.published },
              { l: 'AI-assisted',      v: totals.aiAssist },
            ].map((k, i) => (
              <Card key={i} pad={16}>
                <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.06em', fontWeight: 600 }}>{k.l.toUpperCase()}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, marginTop: 5, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{k.v}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* reports table */}
        <div style={{ padding: '0 28px 32px' }}>
          <Card pad={0}>
            <div style={{
              display: 'grid', gridTemplateColumns: '90px 1fr 1.6fr 100px 100px 110px 120px',
              gap: 14, alignItems: 'center', padding: '14px 22px',
              borderBottom: '1px solid ' + T.border,
              fontSize: 10.5, color: T.ink3, fontFamily: T.mono, fontWeight: 600, letterSpacing: '0.04em',
            }}>
              <span>STREAM</span><span>TEACHER</span><span>STATUS · PROGRESS</span>
              <span style={{ textAlign: 'right' }}>DRAFTED</span>
              <span style={{ textAlign: 'right' }}>SENT</span>
              <span style={{ textAlign: 'right' }}>AI</span>
              <span style={{ textAlign: 'right' }}>DUE</span>
            </div>
            {D.reports.map((r, i) => {
              const st = statusMap[r.status] || statusMap.pending;
              const pct = r.total > 0 ? Math.round((r.drafted / r.total) * 100) : 0;
              return (
                <div key={r.id} style={{
                  display: 'grid', gridTemplateColumns: '90px 1fr 1.6fr 100px 100px 110px 120px',
                  gap: 14, alignItems: 'center', padding: '14px 22px',
                  borderTop: i > 0 ? '1px solid ' + T.border : 'none',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => window.peakToast('Opening report drafts', 'info', r.stream + ' · ' + r.teacher)}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.mono }}>{r.stream}</div>
                  <div style={{ fontSize: 12.5, color: T.ink2 }}>{r.teacher}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <Pill tone={st.tone}>{st.label}</Pill>
                      <span style={{ fontSize: 11.5, color: T.ink3, fontFamily: T.mono }}>{r.drafted}/{r.total}</span>
                    </div>
                    <div style={{ height: 4, background: T.bg, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: pct + '%', background: r.status === 'sent' ? T.good : r.status === 'published' ? T.gold : r.status === 'review' ? T.navyLite : r.status === 'drafting' ? T.warn : T.ink4, borderRadius: 999 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: T.mono, fontSize: 12.5, color: T.ink }}>{r.drafted}</div>
                  <div style={{ textAlign: 'right', fontFamily: T.mono, fontSize: 12.5, color: r.sent > 0 ? T.good : T.ink3 }}>{r.sent || '–'}</div>
                  <div style={{ textAlign: 'right' }}>
                    <Pill tone={r.aiAssist > 0 ? 'gold' : 'neutral'}>{r.aiAssist > 0 ? 'AI ' + r.aiAssist : 'none'}</Pill>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: r.due === 'Today' ? T.red : r.due === 'Done' ? T.good : T.ink2, fontWeight: 600 }}>{r.due}</div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    );
  }

  return { Attendance, Teachers, Transport, Learning, Reports };
})();
