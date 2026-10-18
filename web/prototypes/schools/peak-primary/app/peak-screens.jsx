// Source module of the NEXT School OS app (Phase 2 split from index.html).
// Loaded as a classic <script>; compiled to compiled/peak-screens.js by build-precompiled.cjs.
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
  // Transport sub-components (C9). Built once per Transport screen; see ctx note there.
  function makeTransportParts(ctx) {
    // ── shared map (Leaflet, already on the page) ──
    function TMap({ height, pins, vans, schoolPin, pick, onPick, fitKey }) {
      const { school, ago } = ctx.current;
      const ref = React.useRef(null), map = React.useRef(null), layers = React.useRef(null), base = React.useRef(null);
      const [sat, setSat] = React.useState(false);
      React.useEffect(() => {
        if (!window.L || !ref.current || map.current) return;
        map.current = window.L.map(ref.current, { zoomControl: true }).setView(school || [0.3476, 32.5825], 13);
        layers.current = window.L.layerGroup().addTo(map.current);
        if (onPick) map.current.on('click', e => onPick([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]));
        setTimeout(() => map.current && map.current.invalidateSize(), 200);
        return () => { try { map.current.stop(); map.current.off(); map.current.remove(); } catch (e) {} map.current = null; };
      }, []);
      React.useEffect(() => {
        if (!map.current) return;
        if (base.current) map.current.removeLayer(base.current);
        base.current = sat
          ? window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery © Esri' })
          : window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
        base.current.addTo(map.current);
      }, [sat]);
      const pinIcon = (txt, color) => window.L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 26], html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:' + color + ';border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font:700 11px sans-serif;color:#0b0f17">' + txt + '</span></div>' });
      const drawKey = JSON.stringify([pins, (vans || []).map(v => [v.van_id, v.lat, v.lng, v.status, v.updated_at]), schoolPin, pick]);
      const ptsRef = React.useRef([]);
      React.useEffect(() => {
        if (!map.current) return;
        const g = layers.current; g.clearLayers(); const pts = []; ptsRef.current = pts;
        if (schoolPin) { window.L.marker(schoolPin, { icon: pinIcon('🏫', '#00FC8F') }).bindTooltip('School').addTo(g); pts.push(schoolPin); }
        (pins || []).forEach(p => { window.L.marker([p.lat, p.lng], { icon: pinIcon(p.label || '', p.color || '#F59E0B') }).bindTooltip(p.title || '').addTo(g); pts.push([p.lat, p.lng]); });
        (vans || []).forEach(v => { if (v.lat == null) return; window.L.marker([v.lat, v.lng], { icon: window.L.divIcon({ className: '', iconSize: [32, 32], iconAnchor: [16, 16], html: '<div style="width:32px;height:32px;border-radius:50%;background:' + (v.status === 'emergency' ? '#EF4444' : '#3B82F6') + ';border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px">🚐</div>' }) }).bindTooltip((v.van_name || v.van_id) + ' · ' + ago(v.updated_at)).addTo(g); pts.push([v.lat, v.lng]); });
        if (pick) { window.L.marker(pick, { icon: pinIcon('★', '#EF4444') }).addTo(g); }
      }, [drawKey]);
      React.useEffect(() => {
        if (!map.current) return;
        const pts = ptsRef.current;
        // No animation: a dialog can close (and remove the map) mid-zoom.
        if (pick) map.current.setView(pick, Math.max(map.current.getZoom(), 16), { animate: false });
        else if (pts.length > 1) map.current.fitBounds(pts, { padding: [30, 30], maxZoom: 16, animate: false });
        else if (pts.length === 1) map.current.setView(pts[0], 15, { animate: false });
      }, [fitKey, pick && pick.join()]);
      return (
        <div style={{ position: 'relative', height, borderRadius: 12, overflow: 'hidden', border: '1px solid ' + T.border }}>
          <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
          <button onClick={() => setSat(s => !s)} style={{ position: 'absolute', right: 10, top: 10, zIndex: 500, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{sat ? 'Map' : 'Satellite'}</button>
        </div>
      );
    }

    // "0.35, 32.6" or a Google Maps link → [lat, lng]
    const parseLatLng = (s) => {
      s = String(s || '');
      const m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
      if (!m) return null; const a = +m[1], b = +m[2];
      return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : null;
    };
    const hereNow = (cb) => {
      const toast = ctx.current.toast;
      if (!navigator.geolocation) { toast('This device has no location.', 'error'); return; }
      navigator.geolocation.getCurrentPosition(p => cb([+p.coords.latitude.toFixed(6), +p.coords.longitude.toFixed(6)], p.coords.accuracy), () => toast('Location blocked. Allow location for this site, or tap the map.', 'error'), { enableHighAccuracy: true, timeout: 15000 });
    };
    const inp = { width: '100%', padding: '9px 11px', background: T.surface2, color: T.ink, border: '1px solid ' + T.border, borderRadius: 8, fontSize: 13, fontFamily: T.font, boxSizing: 'border-box' };
    const lbl = { fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5, display: 'block' };
    const Overlay = ({ title, onClose, children }) => (
      <div role="dialog" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto', background: T.surface, border: '1px solid ' + T.border, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{title}</div>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: T.ink3, fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
          {children}
        </div>
      </div>
    );

    // ── child form ──
    function ChildForm({ init, onDone }) {
      const { api, load, pupils, vanIds, vanName, school, toast } = ctx.current;
      const [q, setQ] = React.useState(init._search || '');
      const [studentId, setStudentId] = React.useState(init.student_id || null);
      const [vanId, setVanId] = React.useState(init.van_id || vanIds[0] || '');
      const [pick, setPick] = React.useState(init.pin_source === 'pin' && init.lat != null ? [init.lat, init.lng] : null);
      const [note, setNote] = React.useState(init.pickup_note || '');
      const [paste, setPaste] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const chosen = pupils.find(p => p.id === studentId) || (init.student_id ? { id: init.student_id, name: init.student_name, stream: init.stream } : null);
      const matches = q.trim().length >= 2 && !chosen ? pupils.filter(p => String(p.name).toLowerCase().indexOf(q.trim().toLowerCase()) >= 0).slice(0, 8) : [];
      const save = async () => {
        if (!chosen) { toast('Choose the pupil first.', 'error'); return; }
        if (!vanId) { toast('Add a van first (Vans & drivers tab).', 'error'); return; }
        if (!pick) { toast('Set the pickup pin: tap the map, use your location, or paste a Google Maps link.', 'error'); return; }
        setBusy(true);
        try { const d = await api('/transport/students/save', { studentId: chosen.id, vanId, lat: pick[0], lng: pick[1], note }); toast(chosen.name + (d.moved ? ' moved to ' : ' added to ') + vanName(vanId) + '. The driver sees the pickup now.', 'success'); onDone(); load(); }
        catch (e) { toast(e.message, 'error'); }
        setBusy(false);
      };
      return (
        <Overlay title={init.id ? 'Edit pickup — ' + init.student_name : 'Add a child to a van'} onClose={onDone}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Pupil</label>
              {chosen ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div style={{ ...inp, flex: 1 }}>{chosen.name} <span style={{ color: T.ink3 }}>· {chosen.stream || ''}</span></div>{!init.id && <GhostBtn onClick={() => { setStudentId(null); }}>Change</GhostBtn>}</div>
              ) : (
                <div>
                  <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Type the pupil's name…" style={inp} />
                  {matches.map(p => <button key={p.id} onClick={() => setStudentId(p.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', marginTop: 4, background: T.surface2, border: '1px solid ' + T.border, borderRadius: 8, color: T.ink, cursor: 'pointer', fontSize: 13 }}>{p.name} <span style={{ color: T.ink3 }}>· {p.stream || ''}</span></button>)}
                  {q.trim().length >= 2 && !matches.length && <div style={{ fontSize: 12, color: T.ink3, marginTop: 6 }}>{pupils.length ? 'No pupil with that name. Enrol them first in Students.' : 'Loading pupils…'}</div>}
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>Van</label>
              {vanIds.length ? <select value={vanId} onChange={e => setVanId(e.target.value)} style={inp}>{vanIds.map(v => <option key={v} value={v}>{vanName(v)}</option>)}</select> : <div style={{ fontSize: 12.5, color: T.warn }}>Add a van first.</div>}
            </div>
            <div>
              <label style={lbl}>Note for the driver</label>
              <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="e.g. Blue gate after the church" style={inp} />
            </div>
          </div>
          <label style={lbl}>Pickup pin — tap the exact gate on the map</label>
          <TMap height={300} pins={[]} schoolPin={school} pick={pick} onPick={setPick} fitKey={'f' + (pick ? 1 : 0)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <GhostBtn onClick={() => hereNow((p, acc) => { setPick(p); toast('Pin set to your location (±' + Math.round(acc) + ' m).', 'success'); })}>📍 I'm at the pickup now</GhostBtn>
            <input value={paste} onChange={e => { setPaste(e.target.value); const p = parseLatLng(e.target.value); if (p) setPick(p); }} placeholder="…or paste a Google Maps link / 0.35, 32.61" style={{ ...inp, flex: 1, minWidth: 200 }} />
          </div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 6 }}>{pick ? 'Pin: ' + pick[0] + ', ' + pick[1] : 'No pin yet.'} Parents can send their location on WhatsApp — paste that link here.</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <GhostBtn onClick={onDone}>Cancel</GhostBtn>
            <PrimaryBtn onClick={save}>{busy ? 'Saving…' : 'Save pickup'}</PrimaryBtn>
          </div>
        </Overlay>
      );
    }

    // ── van form ──
    function VanForm({ init, onDone }) {
      const { api, load, toast } = ctx.current;
      const [v, setV] = React.useState(Object.assign({ name: '', plate: '', driver_email: '', driver_name: '', driver_phone: '', fuel_type: 'diesel', l_per_100km: 12 }, init));
      const [busy, setBusy] = React.useState(false);
      const f = (k) => (e) => setV(Object.assign({}, v, { [k]: e.target.value }));
      const save = async () => { setBusy(true); try { await api('/transport/vans/save', { van: v }); toast('Van saved.', 'success'); onDone(); load(); } catch (e) { toast(e.message, 'error'); } setBusy(false); };
      const del = async () => { if (!window.confirm('Delete ' + (v.name || v.van_id) + '?')) return; try { await api('/transport/vans/delete', { vanId: v.van_id }); toast('Van deleted.', 'success'); onDone(); load(); } catch (e) { toast(e.message, 'error'); } };
      return (
        <Overlay title={init.van_id ? 'Edit ' + (init.name || init.van_id) : 'Add a van'} onClose={onDone}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Van name</label><input value={v.name} onChange={f('name')} placeholder="Van 1 — Kira route" style={inp} /></div>
            <div><label style={lbl}>Number plate</label><input value={v.plate || ''} onChange={f('plate')} placeholder="UBA 123X" style={inp} /></div>
            <div><label style={lbl}>Driver's sign-in email</label><input type="email" value={v.driver_email || ''} onChange={f('driver_email')} placeholder="driver@school.ug" style={inp} /></div>
            <div><label style={lbl}>Driver's name</label><input value={v.driver_name || ''} onChange={f('driver_name')} style={inp} /></div>
            <div><label style={lbl}>Driver's phone</label><input value={v.driver_phone || ''} onChange={f('driver_phone')} placeholder="07XX XXX XXX" style={inp} /></div>
            <div><label style={lbl}>Fuel</label><select value={v.fuel_type} onChange={f('fuel_type')} style={inp}><option value="diesel">Diesel</option><option value="petrol">Petrol</option></select></div>
            <div><label style={lbl}>Litres per 100 km</label><input type="number" step="0.5" value={v.l_per_100km} onChange={f('l_per_100km')} style={inp} /><div style={{ fontSize: 11.5, color: T.ink3, marginTop: 4 }}>A 14-seater minivan uses about 10–13 in town.</div></div>
          </div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 12 }}>The driver signs in at the school link with this email (role "driver" in staff accounts) and sees only this van.</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
            <div>{init.van_id && <GhostBtn onClick={del}>Delete van</GhostBtn>}</div>
            <div style={{ display: 'flex', gap: 8 }}><GhostBtn onClick={onDone}>Cancel</GhostBtn><PrimaryBtn onClick={save}>{busy ? 'Saving…' : 'Save van'}</PrimaryBtn></div>
          </div>
        </Overlay>
      );
    }

    // ── settings form ──
    function SettingsForm({ onDone }) {
      const { api, load, toast, school, settings } = ctx.current;
      const [pick, setPick] = React.useState(school);
      const [petrol, setPetrol] = React.useState(settings.petrol_price_ugx || 6850);
      const [diesel, setDiesel] = React.useState(settings.diesel_price_ugx || 6700);
      const [busy, setBusy] = React.useState(false);
      const save = async () => { setBusy(true); try { await api('/transport/settings/save', { school_lat: pick ? pick[0] : null, school_lng: pick ? pick[1] : null, petrol_price_ugx: petrol, diesel_price_ugx: diesel }); toast('Transport settings saved.', 'success'); onDone(); load(); } catch (e) { toast(e.message, 'error'); } setBusy(false); };
      return (
        <Overlay title="School location & fuel prices" onClose={onDone}>
          <label style={lbl}>School gate — routes end here</label>
          <TMap height={280} pins={[]} schoolPin={null} pick={pick} onPick={setPick} fitKey="s" />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><GhostBtn onClick={() => hereNow(p => setPick(p))}>📍 I'm at the school gate now</GhostBtn></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div><label style={lbl}>Diesel price (UGX per litre)</label><input type="number" value={diesel} onChange={e => setDiesel(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Petrol price (UGX per litre)</label><input type="number" value={petrol} onChange={e => setPetrol(e.target.value)} style={inp} /></div>
          </div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 8 }}>Update when pump prices change; trip fuel costs use these.</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}><GhostBtn onClick={onDone}>Cancel</GhostBtn><PrimaryBtn onClick={save}>{busy ? 'Saving…' : 'Save'}</PrimaryBtn></div>
        </Overlay>
      );
    }

    return { TMap, ChildForm, VanForm, SettingsForm, inp };
  }

  function Transport() {
    // School transport (audit C9): live map, children + pickup pins, vans +
    // drivers, fuel settings, trip history. All data through the Worker's
    // /transport/* routes (signed-in staff only).
    const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
    const tenantId = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : '');
    const role = (window.PEAK_ROLE && window.PEAK_ROLE.getRole && window.PEAK_ROLE.getRole()) || '';
    const canEdit = ['head', 'admin', 'bursar'].indexOf(role) >= 0;
    const isHead = ['head', 'admin'].indexOf(role) >= 0;
    const [tab, setTab] = React.useState('map');
    const [live, setLive] = React.useState(null);
    const [trips, setTrips] = React.useState([]);
    const [pupils, setPupils] = React.useState([]);
    const [err, setErr] = React.useState('');
    const [editChild, setEditChild] = React.useState(null);   // {} = new
    const [editVan, setEditVan] = React.useState(null);
    const [editSettings, setEditSettings] = React.useState(false);
    const [vanFilter, setVanFilter] = React.useState('all');
    const toast = (m, k) => window.peakToast && window.peakToast(m, k);

    const api = async (path, body) => {
      const res = await fetch(WK + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ tenant: tenantId }, body)) } : {});
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || ('HTTP ' + res.status));
      return d;
    };
    const load = () => {
      api('/transport/live?tenant=' + encodeURIComponent(tenantId)).then(d => { setLive(d); setErr(''); }).catch(e => setErr(e.message));
      api('/transport/trips?tenant=' + encodeURIComponent(tenantId)).then(d => setTrips(d.trips || [])).catch(() => {});
    };
    React.useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
    React.useEffect(() => {
      if (!canEdit) return;
      api('/students?tenant=' + encodeURIComponent(tenantId)).then(d => setPupils(d.students || [])).catch(() => {});
    }, []);
    // Arriving from "Enrol student → uses the school van": open the form for that pupil.
    React.useEffect(() => {
      const want = window.__nxTransportAdd; if (!want || !pupils.length) return;
      window.__nxTransportAdd = null;
      const p = pupils.find(x => String(x.name).toLowerCase() === String(want).toLowerCase());
      setTab('kids'); setEditChild({ student_id: p ? p.id : null, _search: want });
    }, [pupils]);

    const fleet = (live && live.fleet) || [];
    const positions = (live && live.vans) || [];
    const kids = (live && live.students) || [];
    const settings = (live && live.settings) || {};
    const school = settings.school_lat != null ? [settings.school_lat, settings.school_lng] : null;
    const vanIds = Array.from(new Set(fleet.map(v => v.van_id).concat(kids.map(k => k.van_id)).concat(positions.map(p => p.van_id)))).sort();
    const vanName = id => { const v = fleet.find(x => x.van_id === id); return (v && v.name) || id; };
    const ago = t => { if (!t) return 'never'; const s = Math.round((Date.now() - new Date(t).getTime()) / 1000); return s < 90 ? s + ' s ago' : s < 5400 ? Math.round(s / 60) + ' min ago' : Math.round(s / 3600) + ' h ago'; };
    const ugx = n => 'UGX ' + Math.round(n || 0).toLocaleString('en-UG');
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthTrips = trips.filter(t => new Date(t.started_at) >= monthStart);
    const sum = (arr, k) => arr.reduce((a, x) => a + Number(x[k] || 0), 0);

    // Sub-components are created once (stable identity, so a form keeps
    // what the user typed while the 15-second refresh runs) and read the
    // latest screen data through ctx.current.
    const ctx = React.useRef({});
    Object.assign(ctx.current, { api, load, pupils, vanIds, vanName, school, settings, toast, ago });
    const parts = React.useRef(null);
    if (!parts.current) parts.current = makeTransportParts(ctx);
    const { TMap, ChildForm, VanForm, SettingsForm, inp } = parts.current;

    const STATUS_TONE = { waiting: 'warn', on_board: 'good', arrived: 'brand', dropped: 'brand', absent: 'neutral' };
    const STATUS_LABEL = { waiting: 'Waiting', on_board: 'On board', arrived: 'At school', dropped: 'Dropped', absent: 'Absent' };
    const tabBtn = (k, label) => <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid ' + (tab === k ? T.ink : T.border), background: tab === k ? T.ink : 'transparent', color: tab === k ? T.bg : T.ink2, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>{label}</button>;
    const shownKids = kids.filter(k => vanFilter === 'all' || k.van_id === vanFilter);
    const noPin = kids.filter(k => k.lat == null).length;
    const driverLink = location.origin + '/school/' + encodeURIComponent(tenantId) + '/driver';

    return (
      <div>
        <PageHeader
          eyebrow="Transport · vans, pickups, fuel"
          title="School transport"
          subtitle={live ? (fleet.length + ' van' + (fleet.length === 1 ? '' : 's') + ' · ' + kids.length + ' children with transport' + (noPin ? ' · ' + noPin + ' without a pickup pin' : '') + (school ? '' : ' · school location not set')) : (err || 'Loading…')}
          actions={<>
            <GhostBtn onClick={() => { try { navigator.clipboard.writeText(driverLink); toast('Driver app link copied: ' + driverLink, 'success'); } catch (e) { window.prompt('Driver app link', driverLink); } }}>Copy driver link</GhostBtn>
            {isHead && <GhostBtn onClick={() => setEditSettings(true)}>School location & fuel</GhostBtn>}
            {canEdit && <PrimaryBtn onClick={() => { setTab('kids'); setEditChild({}); }}>+ Add child to a van</PrimaryBtn>}
          </>}
        />
        {err && <div style={{ margin: '14px 28px 0', padding: '10px 14px', borderRadius: 10, background: T.redSft, color: T.redInk, fontSize: 12.5 }}>{err}</div>}
        <div style={{ padding: '16px 28px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tabBtn('map', 'Live map')}{tabBtn('kids', 'Children & pickups')}{tabBtn('vans', 'Vans & drivers')}{tabBtn('trips', 'Trips & fuel')}
        </div>

        <div style={{ padding: '16px 28px 32px' }}>
          {tab === 'map' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: '2 1 420px', minWidth: 0 }}><TMap height={480} schoolPin={school} vans={positions} fitKey={'m' + positions.length + ':' + kids.length}
                pins={kids.filter(k => k.lat != null).map(k => ({ lat: k.lat, lng: k.lng, title: k.student_name + ' · ' + vanName(k.van_id), label: '', color: k.status === 'on_board' ? '#10B981' : k.status === 'waiting' ? '#F59E0B' : '#60A5FA' }))} /></div>
              <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!vanIds.length && <Card pad={16}><div style={{ fontSize: 13, color: T.ink2 }}>No vans yet. Add one in “Vans & drivers”, then add children with their pickup pins.</div></Card>}
                {vanIds.map(id => {
                  const p = positions.find(x => x.van_id === id) || {}; const v = fleet.find(x => x.van_id === id) || {};
                  const vk = kids.filter(k => k.van_id === id);
                  const fresh = p.updated_at && (Date.now() - new Date(p.updated_at).getTime()) < 120000;
                  const today = trips.filter(t => t.van_id === id && new Date(t.started_at).toDateString() === new Date().toDateString());
                  return (
                    <Card key={id} pad={14}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div><div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>{v.name || id}</div><div style={{ fontSize: 12, color: T.ink3 }}>{v.plate || ''}{v.driver_name ? ' · ' + v.driver_name : ''}</div></div>
                        <Pill tone={p.status === 'emergency' ? 'bad' : fresh ? 'good' : 'neutral'}>{p.status === 'emergency' ? 'SOS' : fresh ? 'Live' : 'Offline'}</Pill>
                      </div>
                      <div style={{ fontSize: 12, color: T.ink2, marginTop: 8 }}>
                        {vk.filter(k => k.status === 'on_board').length} on board · {vk.filter(k => k.status === 'waiting').length} waiting · {vk.length} total
                        <br />Last seen {ago(p.updated_at)}{p.speed_kmh != null && fresh ? ' · ' + Math.round(p.speed_kmh) + ' km/h' : ''}{p.trip_km != null && fresh ? ' · ' + Number(p.trip_km).toFixed(1) + ' km this trip' : ''}
                        <br />Today: {sum(today, 'km').toFixed(1)} km · {ugx(sum(today, 'fuel_cost_ugx'))} fuel
                      </div>
                      {v.driver_phone && <div style={{ marginTop: 8 }}><GhostBtn onClick={() => (window.peakCall ? window.peakCall(v.driver_phone) : (location.href = 'tel:' + v.driver_phone))}>Call driver</GhostBtn></div>}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'kids' && (
            <Card pad={0}>
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid ' + T.border, flexWrap: 'wrap' }}>
                <select value={vanFilter} onChange={e => setVanFilter(e.target.value)} style={{ ...inp, width: 'auto' }}><option value="all">All vans</option>{vanIds.map(v => <option key={v} value={v}>{vanName(v)}</option>)}</select>
                <div style={{ flex: 1, fontSize: 12.5, color: T.ink3 }}>{shownKids.length} children{noPin ? ' · ' + noPin + ' need a pickup pin' : ''}</div>
                {canEdit && <PrimaryBtn onClick={() => setEditChild({})}>+ Add child</PrimaryBtn>}
              </div>
              {!shownKids.length ? <div style={{ padding: 28, color: T.ink3, fontSize: 13, textAlign: 'center' }}>No children on transport yet.</div> : shownKids.map(k => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid ' + T.border }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: T.ink, fontSize: 13.5 }}>{k.student_name} <span style={{ color: T.ink3, fontWeight: 400 }}>· {k.stream}</span></div>
                    <div style={{ fontSize: 12, color: k.lat == null ? T.warn : T.ink3 }}>{vanName(k.van_id)} · {k.lat == null ? 'No pickup pin' : (k.pickup_note || (k.pin_source === 'stop' ? 'Stop: ' + k.stop_name : 'Pin set'))}{k.guardian_phone ? ' · ' + k.guardian_phone : ''}</div>
                  </div>
                  <Pill tone={STATUS_TONE[k.status] || 'neutral'}>{STATUS_LABEL[k.status] || k.status}</Pill>
                  {canEdit && <GhostBtn onClick={() => setEditChild(k)}>{k.lat == null ? 'Set pin' : 'Edit'}</GhostBtn>}
                  {canEdit && <GhostBtn onClick={async () => { if (!window.confirm('Take ' + k.student_name + ' off transport?')) return; try { await api('/transport/students/remove', { id: k.id }); load(); } catch (e) { toast(e.message, 'error'); } }}>Remove</GhostBtn>}
                </div>
              ))}
            </Card>
          )}

          {tab === 'vans' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {fleet.map(v => (
                <Card key={v.van_id} pad={16}>
                  <div style={{ fontWeight: 700, color: T.ink }}>{v.name}</div>
                  <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 6, lineHeight: 1.6 }}>
                    {v.plate || 'No plate'}<br />Driver: {v.driver_name || '—'} {v.driver_email ? '(' + v.driver_email + ')' : '· no sign-in email'}<br />
                    {v.fuel_type === 'petrol' ? 'Petrol' : 'Diesel'} · {Number(v.l_per_100km)} L/100 km · {kids.filter(k => k.van_id === v.van_id).length} children
                  </div>
                  {isHead && <div style={{ marginTop: 10 }}><GhostBtn onClick={() => setEditVan(v)}>Edit</GhostBtn></div>}
                </Card>
              ))}
              {isHead && <button onClick={() => setEditVan({})} style={{ minHeight: 130, border: '1.5px dashed ' + T.borderStr, borderRadius: 14, background: 'transparent', color: T.ink2, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Add a van</button>}
              {!fleet.length && !isHead && <div style={{ color: T.ink3, fontSize: 13 }}>No vans set up yet.</div>}
            </div>
          )}

          {tab === 'trips' && (
            <Card pad={0}>
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, borderBottom: '1px solid ' + T.border }}>
                {[['Trips this month', monthTrips.length], ['Km this month', sum(monthTrips, 'km').toFixed(1)], ['Fuel this month', sum(monthTrips, 'litres').toFixed(1) + ' L'], ['Fuel cost this month', ugx(sum(monthTrips, 'fuel_cost_ugx'))]].map(([l, val]) => (
                  <div key={l}><div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700, color: T.ink, marginTop: 4 }}>{val}</div></div>
                ))}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr>{['Date', 'Van', 'Trip', 'Km', 'Fuel', 'Cost', 'Children'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: T.ink3, fontWeight: 600, borderBottom: '1px solid ' + T.border }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {!trips.length && <tr><td colSpan={7} style={{ padding: 24, color: T.ink3, textAlign: 'center' }}>No trips yet. They appear when a driver starts and ends a trip in the driver app.</td></tr>}
                    {trips.map(t => (
                      <tr key={t.id}>
                        <td style={{ padding: '9px 16px', color: T.ink2 }}>{new Date(t.started_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '9px 16px', color: T.ink }}>{vanName(t.van_id)}</td>
                        <td style={{ padding: '9px 16px', color: T.ink2 }}>{t.kind === 'dropoff' ? 'Drop-off' : 'Pickup'}{t.ended_at ? '' : ' · running'}</td>
                        <td style={{ padding: '9px 16px', color: T.ink }}>{Number(t.km || 0).toFixed(1)}</td>
                        <td style={{ padding: '9px 16px', color: T.ink2 }}>{t.litres != null ? Number(t.litres).toFixed(1) + ' L' : '—'}</td>
                        <td style={{ padding: '9px 16px', color: T.ink }}>{t.fuel_cost_ugx != null ? ugx(t.fuel_cost_ugx) : '—'}</td>
                        <td style={{ padding: '9px 16px', color: T.ink2 }}>{t.children_done != null ? t.children_done + '/' + (t.children_total || 0) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {editChild && <ChildForm init={editChild} onDone={() => setEditChild(null)} />}
        {editVan && <VanForm init={editVan} onDone={() => setEditVan(null)} />}
        {editSettings && <SettingsForm onDone={() => setEditSettings(false)} />}
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

  