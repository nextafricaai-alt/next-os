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
    green:    '#00FC8F',
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
  // Matches the 07:15 cutoff in teacher-view.jsx's applyLateCheckInPenalty —
  // any check-in after this triggers the standing 2,000 UGX payroll deduction.
  const isLateCheckin = (iso) => {
    if (!iso) return false;
    const dt = new Date(iso);
    return dt.getHours() > 7 || (dt.getHours() === 7 && dt.getMinutes() > 15);
  };

  const KABS_STAFF_ROSTER = [
    { id: 't1', full_name: 'Tr. Harriet (Ule Harriet)', phone: '0701647582', classAssigned: 'Primary One (P.1)', subjects: ['Luganda', 'LIT 1'], salary: 300000 },
    { id: 't2', full_name: 'Tr. Christine (Ikubu Christine)', phone: '0771791911', classAssigned: 'Primary Two (P.2)', subjects: ['English', 'LIT 2'], salary: 380000 },
    { id: 't3', full_name: 'Tr. Jane (Nalukenge Jane)', phone: '0750845160', classAssigned: 'Primary Three (P.3)', subjects: ['Religious Education', 'Math'], salary: 350000 },
    { id: 't4', full_name: 'Tr. Elijah (Elijja Weiswa)', phone: '—', classAssigned: 'Primary Four (P.4)', subjects: ['Math'], salary: 300000 },
    { id: 't5', full_name: 'Tr. Esther (Ayuto Esther)', phone: '0778787509', classAssigned: 'Primary Five (P.5)', subjects: ['SST', 'Science'], salary: 330000 },
    { id: 't6', full_name: 'Tr. Ronnie (Ssemakula Ronnie)', phone: '0754972846 / 0788241295', classAssigned: 'Primary Six (P.6)', subjects: ['Science', 'Math'], salary: 350000 },
    { id: 't7', full_name: 'Tr. Paul (Paul Ongaria)', phone: '0780742619', classAssigned: 'Primary Seven (P.7)', subjects: ['English', 'Religious Education'], salary: 330000 },
    { id: 't8', full_name: 'Tr. Sam (Bunya Samuel)', phone: '0772555001', classAssigned: 'Primary Seven (P.7)', subjects: ['SST', 'Religious Education'], salary: 350000 },
    { id: 't9', full_name: 'Tr. Joyce (Joyce Kabali)', phone: '0782204110 / 0705185361', classAssigned: 'Primary Three & Four (P.3 & P.4)', subjects: ['English', 'LIT 2'], salary: 320000 },
    { id: 't10', full_name: 'Tr. Jus', phone: '0770001122', classAssigned: 'Baby Class', subjects: ['Learning Area 1 & 4'], salary: 280000 },
    { id: 't11', full_name: 'Tr. Jemie (Jemima)', phone: '0700002233', classAssigned: 'Middle Class', subjects: ['Learning Area 1 & 4'], salary: 280000 },
    { id: 't12', full_name: 'Tr. Mayira', phone: '0750003344', classAssigned: 'Top Class', subjects: ['Learning Area 2 & 5'], salary: 290000 },
  ];

  async function loadStaffData(tenantId) {
    const sb = window.NextSession?.sb;
    const today = isoDate();

    if (!sb) {
      return {
        teachers: KABS_STAFF_ROSTER,
        checkins: KABS_STAFF_ROSTER.map(t => ({ id: 'c-' + t.id, teacher_id: t.id, checked_in_at: today + 'T07:45:00Z', method: 'qr' })),
        rollCalls: [],
        healthRecs: []
      };
    }

    const { data: teachers } = await sb
      .from('teachers')
      .select('id, full_name, email, subjects, status, salary:monthly_salary, phone')
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true });

    const { data: checkins } = await sb
      .from('teacher_checkins')
      .select('id, teacher_id, checked_in_at, checked_out_at, method')
      .eq('tenant_id', tenantId)
      .gte('checked_in_at', today + 'T00:00:00')
      .order('checked_in_at', { ascending: false });

    const { data: rollCalls } = await sb
      .from('student_roll_call')
      .select('id, teacher_id, stream, status')
      .eq('tenant_id', tenantId)
      .eq('roll_date', today);

    const { data: syllabus } = await sb
      .from('syllabus_coverage')
      .select('id, teacher_id, stream, subject, topic, planned_week, completed_week, status')
      .eq('tenant_id', tenantId);

    const { data: pastDeductions } = await sb
      .from('payroll_deductions')
      .select('teacher_id, reference_id')
      .eq('tenant_id', tenantId)
      .eq('reason', 'syllabus_incomplete');

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: healthRecs } = await sb
      .from('student_health_records')
      .select('id, recorded_by_teacher_id, recorded_at, follow_up_needed, resolved_at')
      .eq('tenant_id', tenantId)
      .gte('recorded_at', sevenDaysAgo);

    return {
      teachers: (teachers && teachers.length > 0) ? teachers : KABS_STAFF_ROSTER,
      checkins: checkins || [],
      rollCalls: rollCalls || [],
      healthRecs: healthRecs || [],
      syllabus: syllabus || [],
      pastSyllabusDeductions: pastDeductions || [],
    };
  }

  // This app has no real term-calendar/current-week clock anywhere yet, so
  // "overdue" can't be computed against a true today's-date-to-week mapping
  // without risking a false positive that wrongly flags someone. Instead
  // this uses each teacher's OWN pace as the yardstick: a topic planned for
  // week N is flagged once that same teacher has already completed a topic
  // 2+ weeks ahead of it — i.e. they've clearly moved on without covering
  // it, by their own demonstrated progress, not a guessed calendar date.
  function findOverdueSyllabus(syllabusRows, pastDeductions) {
    const byTeacher = {};
    (syllabusRows || []).forEach(r => { (byTeacher[r.teacher_id] = byTeacher[r.teacher_id] || []).push(r); });
    const deductedRefs = new Set((pastDeductions || []).map(d => String(d.reference_id)));
    const out = [];
    Object.keys(byTeacher).forEach(teacherId => {
      const rows = byTeacher[teacherId];
      const furthestDone = rows.filter(r => r.status === 'done' && r.completed_week != null)
        .reduce((mx, r) => Math.max(mx, r.completed_week), 0);
      if (!furthestDone) return;
      rows.forEach(r => {
        if (r.status === 'done') return;
        if (r.planned_week == null) return;
        if (furthestDone - r.planned_week >= 2 && !deductedRefs.has(String(r.id))) {
          out.push({ teacherId: Number(teacherId), topic: r });
        }
      });
    });
    return out;
  }

  // ─── Nia Predictive Intelligence Card ─────────────────────────────
  // Appears at the top of the staff panel, powered by Nia's memory.
  // Shows today's pattern-based intelligence: who's likely to be absent,
  // which classes are at attendance risk, what Nia observed this week.
  function NiaPredictiveCard({ tenantId, enriched, stats }) {
    const [patterns, setPatterns] = useState(null);
    const [insight, setInsight] = useState(null);

    useEffect(() => {
      if (!window.NIA_MEMORY) return;
      try {
        const p = window.NIA_MEMORY.getPatterns(tenantId);
        setPatterns(p);
        const i = window.NIA_MEMORY.getInsight(tenantId, 'staff absence pattern');
        setInsight(i);
      } catch (_) { /* silent */ }
    }, [tenantId, enriched.length]);

    // Risk-flag absent teachers based on memory patterns
    const absentTeachers = enriched.filter(t => t.status === 'absent');
    const memoryInsights = patterns && patterns.insights ? patterns.insights.slice(0, 2) : [];
    const hasMemory = patterns && (patterns.observations || 0) >= 3;

    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,252,143,0.05) 0%, rgba(14,22,52,0.95) 100%)',
        border: '1px solid rgba(0,252,143,0.18)',
        borderRadius: 14, padding: 22, marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute', top: -20, right: -20, width: 120, height: 120,
          borderRadius: '50%', background: 'rgba(0,252,143,0.07)',
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(0,252,143,0.15)', color: T.green,
            display: 'grid', placeItems: 'center',
            fontFamily: T.serif, fontSize: 20, fontWeight: 700,
            border: '1px solid rgba(0,252,143,0.3)',
            boxShadow: '0 0 16px rgba(0,252,143,0.15)',
          }}>N</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9.5, fontFamily: T.mono, letterSpacing: 1.5, color: T.green, fontWeight: 700 }}>
              NIA · {hasMemory ? 'PATTERN INTELLIGENCE' : 'MONITORING MODE'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginTop: 2 }}>
              {stats.absent === 0
                ? 'Full house — all staff accounted for'
                : stats.absent + ' teacher' + (stats.absent === 1 ? '' : 's') + ' not yet checked in'
              }
            </div>
          </div>
          {hasMemory && (
            <span style={{
              fontSize: 9.5, fontFamily: T.mono, letterSpacing: 1, color: T.green,
              background: 'rgba(0,252,143,0.1)', border: '1px solid rgba(0,252,143,0.2)',
              padding: '4px 10px', borderRadius: 999,
            }}>◆ MEMORY ACTIVE</span>
          )}
        </div>

        {/* Intelligence rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Live absent teachers */}
          {absentTeachers.slice(0, 3).map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              background: 'rgba(255,180,0,0.07)',
              border: '1px solid rgba(255,180,0,0.18)',
              borderRadius: 10,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: T.gold, color: T.bg,
                display: 'grid', placeItems: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>◦</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{t.full_name} — not checked in</div>
                <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2 }}>
                  {t.streamsRolled.length === 0
                    ? 'No roll call taken yet today.'
                    : t.streamsRolled.join(', ') + ' roll call done.'}
                </div>
              </div>
            </div>
          ))}

          {/* Memory-powered insights */}
          {memoryInsights.map((ins, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 14px',
              background: 'rgba(59,130,246,0.07)',
              border: '1px solid rgba(59,130,246,0.15)',
              borderRadius: 10,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: T.blue, color: T.bg,
                display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>◆</span>
              <div>
                <div style={{ fontSize: 10, fontFamily: T.mono, letterSpacing: 1, color: T.blue, marginBottom: 3 }}>NIA PATTERN</div>
                <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>{ins}</div>
              </div>
            </div>
          ))}

          {/* All-clear or baseline message */}
          {absentTeachers.length === 0 && memoryInsights.length === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              background: 'rgba(0,252,143,0.06)',
              border: '1px solid rgba(0,252,143,0.14)',
              borderRadius: 10,
            }}>
              <span style={{ color: T.green, fontSize: 18 }}>✓</span>
              <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.5 }}>
                {hasMemory
                  ? 'All clear. No unusual patterns today based on ' + patterns.observations + ' past observations.'
                  : 'Nia is watching. Patterns build after a few days of check-in data.'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function StaffStatusPill({ status }) {
    const styles = {
      in:   { bg: 'rgba(0,252,143,0.14)',  fg: T.green, dot: T.green, label: 'ON CAMPUS' },
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

  // ─── Syllabus delay audit ──────────────────────────────────────────
  // Surfaces topics a teacher has fallen behind on (see findOverdueSyllabus)
  // so the head can review and, if they agree, apply the same 2,000 UGX
  // payroll_deductions penalty used for late check-ins — deliberately a
  // one-click human decision, not a silent auto-deduction, since there's
  // no reliable term-week clock to safely automate this against.
  function SyllabusAuditCard({ overdue, teachersById, tenantId, onApplied }) {
    const [busyId, setBusyId] = useState(null);
    if (!overdue || overdue.length === 0) return null;

    const apply = async (item) => {
      const sb = window.NextSession?.sb;
      if (!sb) return;
      setBusyId(item.topic.id);
      const month = new Date(); month.setDate(1);
      const { error } = await sb.from('payroll_deductions').insert({
        tenant_id: tenantId,
        teacher_id: item.teacherId,
        month: month.toISOString().slice(0, 10),
        amount: 2000,
        reason: 'syllabus_incomplete',
        reference_id: String(item.topic.id),
        notes: `"${item.topic.topic}" (planned week ${item.topic.planned_week}) still not covered — applied by head teacher.`,
      });
      setBusyId(null);
      if (error) { window.peakToast && window.peakToast('Could not apply deduction: ' + error.message, 'error'); return; }
      window.peakToast && window.peakToast('Deduction applied.', 'success');
      if (onApplied) onApplied();
    };

    return (
      <div style={{
        background: 'rgba(255,180,0,0.06)', border: '1px solid rgba(255,180,0,0.25)',
        borderRadius: 14, padding: 20, marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.gold, marginBottom: 4 }}>⚠ Syllabus falling behind</div>
        <div style={{ fontSize: 11.5, color: T.ink3, marginBottom: 14 }}>
          These teachers have topics they've clearly moved past without marking complete. Review before applying — this deducts real pay.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {overdue.map((item, i) => {
            const t = teachersById[item.teacherId];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: T.surface2, borderRadius: 9 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{(t && t.full_name) || 'Teacher #' + item.teacherId}</div>
                  <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2 }}>{item.topic.stream} · {item.topic.subject} — "{item.topic.topic}" (planned week {item.topic.planned_week})</div>
                </div>
                <button
                  onClick={() => apply(item)}
                  disabled={busyId === item.topic.id}
                  style={{
                    background: 'rgba(255,71,87,0.12)', color: T.red, border: '1px solid rgba(255,71,87,0.3)',
                    padding: '7px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, fontFamily: T.font,
                    cursor: busyId === item.topic.id ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                  }}
                >{busyId === item.topic.id ? 'Applying…' : 'Apply UGX 2,000 deduction'}</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function HeadStaffPanel({ onNav }) {
    const profile = window.PEAK_ROLE ? window.PEAK_ROLE.getProfile() : { tenantId: 'peak-primary' };
    const [data, setData] = useState({ loading: true });

    const refresh = useCallback(async () => {
      setData(d => ({ ...d, loading: true }));
      const r = await loadStaffData(profile.tenantId);
      setData(Object.assign({}, r, { loading: false }));
    }, [profile.tenantId]);

    useEffect(() => {
      refresh();
      const id = setInterval(refresh, 30000); // fallback poll every 30s
      return () => clearInterval(id);
    }, [refresh]);

    // ── Real-time WebSocket push: instant update when any teacher takes roll call or checks in ──
    useEffect(() => {
      const sb = window.NextSession?.sb;
      if (!sb) return;
      const tenantId = profile.tenantId || 'kabs-lily-junior-school-and-kindercare-centre';

      // Unique per mount — a fixed channel name crashes the render if two
      // mounts overlap (Supabase throws adding .on() to an already-
      // subscribed channel of the same topic name).
      const channel = sb.channel('head-staff-rt-' + tenantId + '-' + Math.random().toString(36).slice(2))
        // Student roll call saved → refresh attendance live
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'student_roll_call',
          filter: `tenant_id=eq.${tenantId}`,
        }, () => { refresh(); })
        // Teacher check-in / check-out → refresh staff status live
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'teacher_checkins',
          filter: `tenant_id=eq.${tenantId}`,
        }, () => { refresh(); })
        // Teacher notes on students → refresh health watch
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'student_notes',
          filter: `tenant_id=eq.${tenantId}`,
        }, () => { refresh(); })
        .subscribe();

      return () => { try { sb.removeChannel(channel); } catch (_) {} };
    }, [profile.tenantId]);

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

    const overdueSyllabus = useMemo(
      () => findOverdueSyllabus(data.syllabus, data.pastSyllabusDeductions),
      [data.syllabus, data.pastSyllabusDeductions]
    );
    const teachersById = useMemo(() => {
      const m = {}; (data.teachers || []).forEach(t => { m[t.id] = t; }); return m;
    }, [data.teachers]);

    const SchoolBadgeStrip = window.SchoolBadgeStrip;

    return (
      <div style={{
        minHeight: '100vh', background: T.bg, color: T.ink,
        fontFamily: T.font, padding: '32px 36px 60px',
      }}>
        {SchoolBadgeStrip && <SchoolBadgeStrip pageName="STAFF & CAMPUS" />}
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
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.open('/prototypes/schools/peak-primary/staff-hr-form.html', '_blank')} style={{
              background: 'rgba(59,130,246,0.12)', color: T.blue,
              border: '1px solid rgba(59,130,246,0.3)',
              padding: '8px 16px', borderRadius: 8,
              fontSize: 12, cursor: 'pointer', fontFamily: T.font, fontWeight: 600,
            }}>Share Staff HR Form 🔗</button>
            <button onClick={refresh} disabled={data.loading} style={{
              background: 'transparent', color: T.ink2,
              border: '1px solid ' + T.borderStr,
              padding: '8px 16px', borderRadius: 8,
              fontSize: 12, cursor: data.loading ? 'wait' : 'pointer', fontFamily: T.font,
            }}>{data.loading ? 'Refreshing…' : '↻ Refresh'}</button>
          </div>
        </div>

        {/* Nia Predictive Intelligence */}
        <NiaPredictiveCard tenantId={profile.tenantId} enriched={enriched} stats={stats} />

        {/* Syllabus Audit — overdue coverage + payroll deduction trigger */}
        <SyllabusAuditCard overdue={overdueSyllabus} teachersById={teachersById} tenantId={profile.tenantId} onApplied={refresh} />

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
                textShadow: s.glow ? '0 0 24px rgba(0,252,143,0.4)' : 'none',
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
              background: t.status === 'in' ? 'rgba(0,252,143,0.025)' : 'transparent',
            }}>
              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: 999,
                background: t.status === 'in' ? T.green : t.status === 'out' ? T.gold : T.surface3,
                color: t.status === 'in' || t.status === 'out' ? T.bg : T.ink3,
                display: 'grid', placeItems: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
                boxShadow: t.status === 'in' ? '0 0 16px rgba(0,252,143,0.4)' : 'none',
              }}>{t.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>

              {/* Name + subjects + salary */}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{t.full_name}</span>
                  {t.salary && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, backgroundColor: 'rgba(0,252,143,0.12)', color: T.green, border: '1px solid rgba(0,252,143,0.25)', fontFamily: T.mono }}>
                      UGX {Number(t.salary).toLocaleString()}/mo
                    </span>
                  )}
                  {t.classAssigned && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, backgroundColor: 'rgba(59,130,246,0.12)', color: T.blue, fontFamily: T.mono }}>
                      {t.classAssigned}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: T.ink3, fontFamily: T.mono, flexWrap: 'wrap' }}>
                  <StaffStatusPill status={t.status} />
                  {t.phone && t.phone !== '—' && <span style={{ color: T.gold }}>📞 {t.phone}</span>}
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
                    <div style={{ color: t.status === 'in' ? T.green : T.ink2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {fmtTime(t.checkin.checked_in_at)}
                      {isLateCheckin(t.checkin.checked_in_at) && (
                        <span title="After the 07:15 cutoff — UGX 2,000 late penalty applied" style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 999, backgroundColor: 'rgba(255,180,0,0.15)', color: T.gold, border: '1px solid rgba(255,180,0,0.3)' }}>
                          LATE
                        </span>
                      )}
                    </div>
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
