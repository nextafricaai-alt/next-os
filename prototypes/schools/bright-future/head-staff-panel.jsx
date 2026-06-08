/* head-staff-panel.jsx
   Sarah's view of her staff today.

   Pulls live from Supabase:
     - teachers (everyone on payroll)
     - teacher_checkins (today's check-ins + check-outs)
     - student_roll_call (which classes had roll taken today)
     - student_health_records (recent health notes)

   Status pills:
     ● GREEN  — checked in, still on campus
     ● AMBER  — checked in then out (left for the day)
     ● GRAY   — hasn't checked in today

   Exposed as window.HeadStaffPanel. Loaded inline in index.html.
*/
(function () {
  const { useState, useEffect, useMemo, useCallback } = React;

  const T = {
    bg:       '#0a1029',
    surface:  '#141e3c',
    surface2: '#1a2548',
    surface3: '#212d56',
    border:   'rgba(255,255,255,0.06)',
    borderStr:'rgba(255,255,255,0.10)',
    ink:      '#f5f6fa',
    ink2:     'rgba(245,246,250,0.85)',
    ink3:     'rgba(245,246,250,0.55)',
    ink4:     'rgba(245,246,250,0.40)',
    red:      '#FF4757',
    green:    '#3B82F6',
    gold:     '#FFB400',
    blue:     '#3B82F6',
    font:     "'Inter', -apple-system, system-ui, sans-serif",
    mono:     "'JetBrains Mono', ui-monospace, monospace",
    serif:    "'Instrument Serif', serif",
  };

  const isoDate = () => new Date().toISOString().slice(0, 10);
  const fmtTime = (iso) => iso
    ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
  const fmtDuration = (a, b) => {
    if (!a) return '';
    const end = b ? new Date(b) : new Date();
    const ms = end - new Date(a);
    if (ms <= 0) return '';
    const mins = Math.floor(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  async function loadStaffData(tenantId) {
    const sb = window.NextSession?.sb;
    if (!sb) return { error: 'No session' };

    const today = isoDate();

    // Teachers
    const { data: teachers } = await sb
      .from('teachers')
      .select('id, full_name, email, subjects, status')
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true });

    // Today's check-ins (latest per teacher)
    const { data: checkins } = await sb
      .from('teacher_checkins')
      .select('id, teacher_id, checked_in_at, checked_out_at, method')
      .eq('tenant_id', tenantId)
      .gte('checked_in_at', today + 'T00:00:00')
      .order('checked_in_at', { ascending: false });

    // Today's roll call records (count per teacher)
    const { data: rollCalls } = await sb
      .from('student_roll_call')
      .select('id, teacher_id, stream, status')
      .eq('tenant_id', tenantId)
      .eq('roll_date', today);

    // Recent health records (last 7 days, per teacher_id)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: healthRecs } = await sb
      .from('student_health_records')
      .select('id, recorded_by_teacher_id, recorded_at, follow_up_needed, resolved_at')
      .eq('tenant_id', tenantId)
      .gte('recorded_at', sevenDaysAgo);

    return {
      teachers: teachers || [],
      checkins: checkins || [],
      rollCalls: rollCalls || [],
      healthRecs: healthRecs || [],
    };
  }

  function StaffStatusPill({ status }) {
    const styles = {
      in:   { bg: 'rgba(59,130,246,0.14)',  fg: T.green, dot: T.green, label: 'ON CAMPUS' },
      out:  { bg: 'rgba(255,180,0,0.14)',  fg: T.gold,  dot: T.gold,  label: 'LEFT FOR THE DAY' },
      absent:{ bg: 'rgba(255,255,255,0.06)', fg: T.ink3, dot: T.ink3,  label: 'NOT CHECKED IN' },
    }[status];
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: styles.bg, color: styles.fg,
        padding: '4px 10px', borderRadius: 999,
        fontSize: 10.5, fontFamily: T.mono, fontWeight: 700, letterSpacing: 0.6,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999, background: styles.dot,
          boxShadow: status === 'in' ? '0 0 8px ' + T.green : 'none',
        }} />
        {styles.label}
      </span>
    );
  }

  function HeadStaffPanel({ onNav }) {
    const profile = window.PEAK_ROLE ? window.PEAK_ROLE.getProfile() : { tenantId: 'bright-future' };
    const [data, setData] = useState({ loading: true });

    const refresh = useCallback(async () => {
      setData(d => ({ ...d, loading: true }));
      const r = await loadStaffData(profile.tenantId);
      setData(Object.assign({}, r, { loading: false }));
    }, [profile.tenantId]);

    useEffect(() => {
      refresh();
      const id = setInterval(refresh, 30000); // poll every 30s — live feel
      return () => clearInterval(id);
    }, [refresh]);

    const enriched = useMemo(() => {
      if (!data.teachers) return [];
      const checkinsByTeacher = {};
      (data.checkins || []).forEach(c => {
        // Keep the most recent per teacher (already ordered desc)
        if (!checkinsByTeacher[c.teacher_id]) checkinsByTeacher[c.teacher_id] = c;
      });
      const rollByTeacher = {};
      (data.rollCalls || []).forEach(r => {
        if (!rollByTeacher[r.teacher_id]) rollByTeacher[r.teacher_id] = new Set();
        rollByTeacher[r.teacher_id].add(r.stream);
      });
      const healthByTeacher = {};
      (data.healthRecs || []).forEach(h => {
        if (!h.recorded_by_teacher_id) return;
        healthByTeacher[h.recorded_by_teacher_id] = (healthByTeacher[h.recorded_by_teacher_id] || 0) + 1;
      });
      return data.teachers.map(t => {
        const c = checkinsByTeacher[t.id];
        const status = !c ? 'absent' : (c.checked_out_at ? 'out' : 'in');
        return {
          ...t,
          status,
          checkin: c,
          streamsRolled: rollByTeacher[t.id] ? Array.from(rollByTeacher[t.id]) : [],
          healthCount: healthByTeacher[t.id] || 0,
        };
      });
    }, [data]);

    const stats = useMemo(() => {
      const total = enriched.length;
      const inNow = enriched.filter(e => e.status === 'in').length;
      const left = enriched.filter(e => e.status === 'out').length;
      const absent = enriched.filter(e => e.status === 'absent').length;
      return { total, inNow, left, absent };
    }, [enriched]);

    return (
      <div style={{
        minHeight: '100vh', background: T.bg, color: T.ink,
        fontFamily: T.font, padding: '32px 36px 60px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10.5, fontFamily: T.mono, letterSpacing: 1.5, color: T.ink3 }}>
              STAFF TODAY · {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <h1 style={{
              fontSize: 32, fontWeight: 400, margin: '6px 0 0',
              fontFamily: T.serif, letterSpacing: '-0.01em',
            }}>Who's on campus right now</h1>
          </div>
          <button onClick={refresh} disabled={data.loading} style={{
            background: 'transparent', color: T.ink2,
            border: '1px solid ' + T.borderStr,
            padding: '8px 16px', borderRadius: 8,
            fontSize: 12, cursor: data.loading ? 'wait' : 'pointer', fontFamily: T.font,
          }}>{data.loading ? 'Refreshing…' : '↻ Refresh'}</button>
        </div>

        {/* Stat cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14, marginBottom: 24,
        }}>
          {[
            { label: 'TOTAL TEACHERS', value: stats.total, color: T.ink },
            { label: 'ON CAMPUS NOW',  value: stats.inNow, color: T.green, glow: true },
            { label: 'LEFT FOR DAY',   value: stats.left,  color: T.gold },
            { label: 'NOT CHECKED IN', value: stats.absent,color: T.red },
          ].map((s, i) => (
            <div key={i} style={{
              background: T.surface,
              border: '1px solid ' + T.border,
              borderRadius: 12, padding: 18,
              position: 'relative',
            }}>
              <div style={{ fontSize: 10, fontFamily: T.mono, letterSpacing: 1.5, color: T.ink3, marginBottom: 6 }}>{s.label}</div>
              <div style={{
                fontSize: 34, fontWeight: 700, color: s.color, fontFamily: T.serif,
                textShadow: s.glow ? '0 0 24px rgba(59,130,246,0.4)' : 'none',
              }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Staff list */}
        <div style={{
          background: T.surface, border: '1px solid ' + T.border,
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 22px', borderBottom: '1px solid ' + T.border,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 11, fontFamily: T.mono, color: T.ink3, letterSpacing: 1.2,
          }}>
            STAFF DIRECTORY · {enriched.length} TEACHER{enriched.length === 1 ? '' : 'S'}
            <span style={{
              marginLeft: 'auto', fontSize: 10, color: T.ink4,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 999, background: T.green,
                animation: 'pulse 2s infinite',
              }} />
              LIVE · UPDATES EVERY 30s
            </span>
          </div>

          {data.loading && enriched.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.ink3, fontFamily: T.mono, fontSize: 11 }}>
              LOADING STAFF…
            </div>
          ) : enriched.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.ink4, fontStyle: 'italic' }}>
              No teachers found for your tenant.
            </div>
          ) : enriched.map(t => (
            <div key={t.id} style={{
              padding: '16px 22px',
              borderBottom: '1px solid ' + T.border,
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              background: t.status === 'in' ? 'rgba(59,130,246,0.025)' : 'transparent',
            }}>
              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: 999,
                background: t.status === 'in' ? T.green : t.status === 'out' ? T.gold : T.surface3,
                color: t.status === 'in' || t.status === 'out' ? T.bg : T.ink3,
                display: 'grid', placeItems: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
                boxShadow: t.status === 'in' ? '0 0 16px rgba(59,130,246,0.4)' : 'none',
              }}>{t.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>

              {/* Name + subjects */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{t.full_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: T.ink3, fontFamily: T.mono, flexWrap: 'wrap' }}>
                  <StaffStatusPill status={t.status} />
                  {t.subjects && t.subjects.length > 0 && (
                    <span style={{ letterSpacing: 0.4 }}>{t.subjects.join(' · ')}</span>
                  )}
                </div>
              </div>

              {/* Activity stats */}
              <div style={{ display: 'flex', gap: 18, fontSize: 11, color: T.ink3, fontFamily: T.mono }}>
                {t.checkin && (
                  <div>
                    <div style={{ color: T.ink4, fontSize: 9.5, letterSpacing: 0.8 }}>CHECK IN</div>
                    <div style={{ color: t.status === 'in' ? T.green : T.ink2, fontWeight: 700 }}>{fmtTime(t.checkin.checked_in_at)}</div>
                  </div>
                )}
                {t.checkin && t.checkin.checked_out_at && (
                  <div>
                    <div style={{ color: T.ink4, fontSize: 9.5, letterSpacing: 0.8 }}>CHECK OUT</div>
                    <div style={{ color: T.gold, fontWeight: 700 }}>{fmtTime(t.checkin.checked_out_at)}</div>
                  </div>
                )}
                {t.checkin && (
                  <div>
                    <div style={{ color: T.ink4, fontSize: 9.5, letterSpacing: 0.8 }}>{t.status === 'in' ? 'SO FAR' : 'TIME'}</div>
                    <div style={{ color: T.ink2, fontWeight: 700 }}>
                      {fmtDuration(t.checkin.checked_in_at, t.checkin.checked_out_at) || '—'}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ color: T.ink4, fontSize: 9.5, letterSpacing: 0.8 }}>ROLL CALLS</div>
                  <div style={{ color: t.streamsRolled.length > 0 ? T.green : T.ink3, fontWeight: 700 }}>
                    {t.streamsRolled.length > 0 ? t.streamsRolled.join(', ') : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ color: T.ink4, fontSize: 9.5, letterSpacing: 0.8 }}>HEALTH (7d)</div>
                  <div style={{ color: t.healthCount > 0 ? T.blue : T.ink3, fontWeight: 700 }}>
                    {t.healthCount > 0 ? t.healthCount + ' notes' : '—'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  window.HeadStaffPanel = HeadStaffPanel;
})();
