/* teacher-view.jsx
   The Teacher Shell — Patrick / Mary's portal.

   Three live data flows feed the school's central nervous system:
     1. Check In            → teacher_checkins        → Head sees "Staff Today"
     2. Take Roll Call      → student_roll_call       → Head sees attendance live
     3. Log Health/Wellbeing → student_health_records → Head sees Health Watch

   All actions hit Supabase with RLS active — teachers only touch their own
   streams. The school sees everything in real time.

   Exposed as window.TeacherShell. Loaded inline in index.html.
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

  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const isoDate = (d) => (d || new Date()).toISOString().slice(0, 10);
  const tinyToast = (msg, kind) => {
    if (window.peakToast) { window.peakToast(msg, kind || 'info'); return; }
    console.log('[teacher]', msg);
  };

  // ─── Supabase data loader ───────────────────────────────────────────
  async function loadTeacherData() {
    const sess = window.NextSession;
    if (!sess || !sess.sb || !sess.profile) {
      return { error: 'No session. Please sign in again.' };
    }
    const sb = sess.sb;
    const email = (sess.profile.email || '').toLowerCase().trim();
    const name = sess.profile.name || sess.profile.fullName || 'Teacher';
    const tenantId = sess.profile.tenantId || 'kabs-lily-junior-school-and-kindercare-centre';
    const today = isoDate();

    let teacher = null;

    // 1. Try exact email match
    if (email) {
      const { data } = await sb
        .from('teachers')
        .select('id, full_name, email, subjects, status')
        .ilike('email', email)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (data) teacher = data;
    }

    // 2. Try matching by name if email lookup yielded no result
    if (!teacher && name) {
      const firstName = name.split(' ')[0];
      const { data } = await sb
        .from('teachers')
        .select('id, full_name, email, subjects, status')
        .ilike('full_name', `%${firstName}%`)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (data) teacher = data;
    }

    // 3. Fallback teacher profile if record is missing in DB
    if (!teacher) {
      teacher = {
        id: 9999,
        full_name: name || (email ? email.split('@')[0] : 'Ayuto Esther'),
        email: email || 'ayuto.esther@kabslily.ug',
        subjects: ['Science', 'Mathematics'],
        status: 'active'
      };
    }

    const { data: assignments } = await sb
      .from('class_assignments')
      .select('id, stream, subject, is_class_teacher')
      .eq('teacher_id', teacher.id);

    const { data: lessons } = await sb
      .from('lesson_plans')
      .select('id, stream, subject, week_of, topic, status')
      .eq('teacher_id', teacher.id)
      .order('week_of', { ascending: true });

    const { data: syllabus } = await sb
      .from('syllabus_coverage')
      .select('stream, subject, topic, planned_week, status')
      .eq('teacher_id', teacher.id);

    const { data: payroll } = await sb
      .from('teacher_payroll')
      .select('id, month, amount, status, paid_at, channel')
      .eq('teacher_id', teacher.id)
      .order('month', { ascending: false })
      .limit(3);

    // Today's check-in (most recent for today)
    const { data: checkins } = await sb
      .from('teacher_checkins')
      .select('id, checked_in_at, checked_out_at, method')
      .eq('teacher_id', teacher.id)
      .gte('checked_in_at', today + 'T00:00:00')
      .order('checked_in_at', { ascending: false })
      .limit(1);

    // Today's roll call records (so cards reflect what's been done)
    const streamCodes = (assignments || []).map(a => a.stream);
    let rollCalls = [];
    if (streamCodes.length > 0) {
      const { data: rc } = await sb
        .from('student_roll_call')
        .select('id, student_id, stream, status, taken_at, roll_date')
        .eq('roll_date', today)
        .in('stream', streamCodes);
      rollCalls = rc || [];
    }

    // Recent health records for students in this teacher's streams
    const allStudents = (window.PEAK && window.PEAK.students) || [];
    const myStreamsSet = new Set((assignments || []).map(a => a.stream));
    const myStudentIds = allStudents.filter(s => myStreamsSet.has(s.stream)).map(s => s.id);
    let healthRecords = [];
    if (myStudentIds.length > 0) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: hr } = await sb
        .from('student_health_records')
        .select('id, student_id, category, severity, description, recorded_at, follow_up_needed, resolved_at')
        .in('student_id', myStudentIds)
        .gte('recorded_at', thirtyDaysAgo)
        .order('recorded_at', { ascending: false });
      healthRecords = hr || [];
    }

    return {
      teacher,
      assignments: assignments || [],
      lessons: lessons || [],
      syllabus: syllabus || [],
      payroll: payroll || [],
      checkin: (checkins && checkins[0]) || null,
      rollCalls,
      healthRecords,
    };
  }

  // ─── Write helpers ──────────────────────────────────────────────────
  async function writeCheckIn(teacherId, tenantId, method) {
    const sb = window.NextSession?.sb;
    if (!sb) return { error: 'No session' };
    const { data, error } = await sb
      .from('teacher_checkins')
      .insert({
        tenant_id: tenantId,
        teacher_id: teacherId,
        method: method || 'manual',
      })
      .select('id, checked_in_at, checked_out_at, method')
      .single();
    return { data, error };
  }

  async function writeCheckOut(checkinId) {
    const sb = window.NextSession?.sb;
    if (!sb) return { error: 'No session' };
    const { data, error } = await sb
      .from('teacher_checkins')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('id', checkinId)
      .select('id, checked_in_at, checked_out_at, method')
      .single();
    return { data, error };
  }

  async function writeRollCall(records) {
    // records = [{ tenant_id, teacher_id, student_id, stream, status, notes? }, ...]
    const sb = window.NextSession?.sb;
    if (!sb) return { error: 'No session' };
    // upsert each row (UNIQUE on student_id, roll_date) so re-saving overwrites
    const { data, error } = await sb
      .from('student_roll_call')
      .upsert(records, { onConflict: 'student_id,roll_date' })
      .select('id, student_id, stream, status');
    return { data, error };
  }

  async function writeHealthRecord(record) {
    const sb = window.NextSession?.sb;
    if (!sb) return { error: 'No session' };
    const { data, error } = await sb
      .from('student_health_records')
      .insert(record)
      .select('id')
      .single();
    return { data, error };
  }

  // ─── Shared atoms ──────────────────────────────────────────────────
  function Card({ title, subtitle, children, accent, action }) {
    return (
      <div style={{
        background: T.surface,
        border: '1px solid ' + T.border,
        borderRadius: 14,
        padding: 22,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {accent && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent }} />
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: T.mono, letterSpacing: 1.5, color: T.ink3, textTransform: 'uppercase', marginBottom: 4 }}>{subtitle}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: T.ink }}>{title}</div>
          </div>
          {action}
        </div>
        {children}
      </div>
    );
  }

  function Empty({ text }) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: T.ink4, fontSize: 13, fontStyle: 'italic' }}>
        {text}
      </div>
    );
  }

  // ─── Modal scaffolding ──────────────────────────────────────────────
  function Modal({ title, onClose, children, width }) {
    useEffect(() => {
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(5,8,20,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          width: '100%', maxWidth: width || 560,
          maxHeight: '90vh',
          background: T.surface, border: '1px solid ' + T.borderStr,
          borderRadius: 14, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <header style={{
            padding: '16px 22px', borderBottom: '1px solid ' + T.border,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', color: T.ink3,
              fontSize: 20, cursor: 'pointer', lineHeight: 1,
            }}>×</button>
          </header>
          <div style={{ padding: 22, overflow: 'auto', flex: 1 }}>{children}</div>
        </div>
      </div>
    );
  }


  // ─── Nia's intelligence layer ───────────────────────────────────────
  function computeNiaNudges({ teacher, assignments, rollCalls, checkin, healthRecords }) {
    const nudges = [];
    const allStudents = (window.PEAK && window.PEAK.students) || [];
    const myStreams = new Set(assignments.map(a => a.stream));
    const myStudents = allStudents.filter(s => myStreams.has(s.stream));
    const today = new Date();
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;

    // 1. Not checked in yet (weekdays only, before 4pm)
    if (!isWeekend && !checkin && today.getHours() < 16) {
      nudges.push({
        id: 'checkin',
        tone: 'warn',
        icon: '◷',
        title: "You haven't checked in yet today",
        body: 'Tap the green Check In button so your head teacher knows you\'re on campus.',
        action: 'check-in',
      });
    }

    // 2. Roll call not taken for each assigned stream (weekdays only)
    if (!isWeekend) {
      assignments.forEach(a => {
        const taken = rollCalls.filter(rc => rc.stream === a.stream).length;
        const expected = allStudents.filter(s => s.stream === a.stream).length;
        if (expected > 0 && taken < expected) {
          nudges.push({
            id: 'roll-' + a.stream,
            tone: 'warn',
            icon: '☰',
            title: 'Take roll call for ' + a.stream + ' · ' + a.subject,
            body: taken === 0
              ? expected + ' students are waiting.'
              : 'Started (' + taken + '/' + expected + '), finish marking the rest.',
            action: 'roll-call',
            stream: a.stream,
          });
        }
      });
    }

    // 3. At-risk students that need personal attention
    const atRisk = myStudents.filter(s => s.flag === 'risk');
    atRisk.slice(0, 3).forEach(s => {
      nudges.push({
        id: 'risk-' + s.id,
        tone: 'warn',
        icon: '!',
        title: s.name + ' (' + s.stream + ') is showing risk signals',
        body: s.attendanceWk + '% attendance this week. Worth a one-on-one before they slip further.',
        action: 'health',
        student: s,
      });
    });

    // 4. Students with unresolved health concerns — follow up
    const unresolvedHealth = (healthRecords || []).filter(h =>
      h.follow_up_needed && !h.resolved_at
    );
    const seenStudents = new Set();
    unresolvedHealth.slice(0, 2).forEach(h => {
      if (seenStudents.has(h.student_id)) return;
      seenStudents.add(h.student_id);
      const stu = myStudents.find(s => s.id === h.student_id);
      if (!stu) return;
      nudges.push({
        id: 'health-' + h.id,
        tone: 'info',
        icon: '♥',
        title: 'Follow up on ' + stu.name + ' — ' + h.category,
        body: (h.description || '').slice(0, 90) + ((h.description || '').length > 90 ? '…' : ''),
        action: 'health',
        student: stu,
      });
    });

    // 5. Top performers — public praise prompt
    const topPerformers = myStudents.filter(s => s.flag === 'top');
    if (topPerformers.length > 0) {
      const star = topPerformers[Math.floor(Math.random() * topPerformers.length)];
      nudges.push({
        id: 'top-' + star.id,
        tone: 'positive',
        icon: '★',
        title: 'Praise ' + star.name + ' (' + star.stream + ') publicly today',
        body: 'Consistent performer this week — recognition reinforces the habit.',
        action: 'none',
      });
    }

    // If absolutely nothing to nudge about, give an "all clear" message
    if (nudges.length === 0) {
      nudges.push({
        id: 'clear',
        tone: 'positive',
        icon: '✓',
        title: 'All clear — nothing pressing right now',
        body: 'Roll call done, no risk flags, no overdue follow-ups. Keep going.',
        action: 'none',
      });
    }

    return nudges;
  }

  function NiaCoachCard({ data, onTakeRollCall, onLogHealth, onScrollToCheckin }) {
    const nudges = useMemo(
      () => computeNiaNudges(data),
      [data]
    );

    const toneColor = (t) => t === 'warn' ? T.gold : t === 'positive' ? T.green : T.blue;
    const toneBg    = (t) => t === 'warn' ? 'rgba(255,180,0,0.06)'
                          : t === 'positive' ? 'rgba(0,252,143,0.06)'
                          : 'rgba(59,130,246,0.06)';
    const toneBorder = (t) => t === 'warn' ? 'rgba(255,180,0,0.18)'
                            : t === 'positive' ? 'rgba(0,252,143,0.18)'
                            : 'rgba(59,130,246,0.18)';

    const handleClick = (n) => {
      if (n.action === 'check-in' && onScrollToCheckin) onScrollToCheckin();
      else if (n.action === 'roll-call' && onTakeRollCall) onTakeRollCall(n.stream);
      else if (n.action === 'health' && onLogHealth && n.student) onLogHealth(n.student);
    };

    return (
      <div style={{
        gridColumn: '1 / -1',
        background: 'linear-gradient(135deg, rgba(20,30,60,0.92) 0%, rgba(26,37,72,0.92) 100%)',
        border: '1px solid ' + T.borderStr,
        borderRadius: 14, padding: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(0,252,143,0.15)', color: T.green,
            display: 'grid', placeItems: 'center',
            fontFamily: T.serif, fontSize: 22, fontWeight: 700,
            border: '1px solid rgba(0,252,143,0.3)',
          }}>N</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10, fontFamily: T.mono, letterSpacing: 1.5,
              color: T.ink3, textTransform: 'uppercase', marginBottom: 3,
            }}>NIA — YOUR TEACHING COACH</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: T.ink }}>
              {nudges.length === 1 && nudges[0].id === 'clear'
                ? 'All clear · keep going strong'
                : nudges.length + ' thing' + (nudges.length === 1 ? '' : 's') + ' to look at today'}
            </div>
          </div>
        </div>

        {/* Nudges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {nudges.map(n => {
            const clickable = n.action !== 'none';
            return (
              <div
                key={n.id}
                onClick={clickable ? () => handleClick(n) : undefined}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '12px 14px',
                  background: toneBg(n.tone),
                  border: '1px solid ' + toneBorder(n.tone),
                  borderRadius: 10,
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'transform 0.12s, background 0.12s',
                }}
                onMouseEnter={(e) => clickable && (e.currentTarget.style.transform = 'translateX(2px)')}
                onMouseLeave={(e) => clickable && (e.currentTarget.style.transform = 'translateX(0)')}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: toneColor(n.tone), color: T.bg,
                  display: 'grid', placeItems: 'center',
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>{n.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 2 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>{n.body}</div>
                </div>
                {clickable && (
                  <span style={{
                    fontSize: 11, color: toneColor(n.tone),
                    fontFamily: T.mono, fontWeight: 700, letterSpacing: 0.5,
                    alignSelf: 'center', flexShrink: 0,
                  }}>→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }


  // ─── Nia's interactive check-in popup ─────────────────────────────
  // Slides in from top-right when the dashboard opens if the teacher
  // hasn't checked in yet. Feels like a real notification, not a card.
  function NiaCheckinPopup({ teacher, profile, onCheckedIn }) {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
      // Slide in 600ms after mount so it feels intentional, not jarring
      const t1 = setTimeout(() => setVisible(true), 600);
      const t2 = setTimeout(() => setAnimateIn(true), 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    if (!visible || dismissed) return null;

    const handleCheckIn = async () => {
      if (busy) return;
      setBusy(true);
      const { data, error } = await writeCheckIn(teacher.id, profile.tenantId, 'manual');
      if (error) {
        setBusy(false);
        tinyToast('Check-in failed: ' + error.message, 'error');
        return;
      }
      // Slide out, then notify parent
      setAnimateIn(false);
      setTimeout(() => {
        setDismissed(true);
        if (onCheckedIn) onCheckedIn(data);
        tinyToast('Checked in. Head teacher notified.', 'success');
      }, 350);
    };

    const handleClose = () => {
      setAnimateIn(false);
      setTimeout(() => setDismissed(true), 350);
    };

    return (
      <div style={{
        position: 'fixed',
        top: 90, right: animateIn ? 24 : -440,
        zIndex: 9500,
        width: 380, maxWidth: 'calc(100vw - 48px)',
        background: 'linear-gradient(135deg, rgba(20,30,60,0.96) 0%, rgba(26,37,72,0.96) 100%)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(0,252,143,0.30)',
        borderRadius: 14,
        padding: 18,
        boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,252,143,0.10)',
        opacity: animateIn ? 1 : 0,
        transition: 'right 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
      }}>
        {/* Top row: Nia badge + label + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(0,252,143,0.18)', color: T.green,
            border: '1px solid rgba(0,252,143,0.4)',
            display: 'grid', placeItems: 'center',
            fontFamily: T.serif, fontSize: 17, fontWeight: 700,
          }}>N</div>
          <div style={{ flex: 1, lineHeight: 1.2 }}>
            <div style={{
              fontSize: 9.5, fontFamily: T.mono, letterSpacing: 1.4,
              color: T.green, fontWeight: 700,
            }}>NIA · LIVE NUDGE</div>
            <div style={{ fontSize: 12, color: T.ink3 }}>from your coach</div>
          </div>
          <button onClick={handleClose} style={{
            background: 'transparent', border: 'none',
            color: T.ink3, fontSize: 22, lineHeight: 1,
            cursor: 'pointer', padding: 0, width: 24, height: 24,
          }}>×</button>
        </div>

        {/* Title + body */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 6,
            fontFamily: T.serif, fontStyle: 'italic',
          }}>
            {(profile.fullName ? profile.fullName.split(' ')[0] : 'Teacher')}, don't forget to check in.
          </div>
          <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.5 }}>
            Tap below so your head teacher knows you're on campus. Takes a second.
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleCheckIn}
          disabled={busy}
          style={{
            width: '100%',
            background: T.green, color: T.bg, border: 'none',
            padding: '12px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
            cursor: busy ? 'wait' : 'pointer', fontFamily: T.font,
            opacity: busy ? 0.6 : 1,
            transition: 'transform 0.12s',
          }}
          onMouseEnter={(e) => { if (!busy) e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {busy ? 'Checking in…' : '✓  Check In Now'}
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 12, fontSize: 10.5, fontFamily: T.mono,
          color: T.ink4, textAlign: 'center', letterSpacing: 0.6,
        }}>NIA IS WATCHING WHILE YOU WORK</div>
      </div>
    );
  }

  // ─── Card: Check-in Status ──────────────────────────────────────────
  function CheckInCard({ teacher, checkin, onCheckedIn, onCheckedOut, profile }) {
    const [busy, setBusy] = useState(false);

    // State machine: 'out' | 'in' | 'done'
    const state = !checkin ? 'out'
                : checkin.checked_out_at ? 'done'
                : 'in';

    const handleCheckIn = async () => {
      if (busy) return;
      setBusy(true);
      const { data, error } = await writeCheckIn(teacher.id, profile.tenantId, 'manual');
      setBusy(false);
      if (error) { tinyToast('Check-in failed: ' + error.message, 'error'); return; }
      tinyToast('Checked in. Head teacher notified.', 'success');
      if (onCheckedIn) onCheckedIn(data);
    };

    const handleCheckOut = async () => {
      if (busy || !checkin) return;
      // Confirm
      if (!window.confirm("End your day at school? Your head teacher will see you've left.")) return;
      setBusy(true);
      const { data, error } = await writeCheckOut(checkin.id);
      setBusy(false);
      if (error) { tinyToast('Check-out failed: ' + error.message, 'error'); return; }
      tinyToast("Day ended. See you tomorrow.", 'success');
      if (onCheckedOut) onCheckedOut(data);
    };

    const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    const fmtDuration = (a, b) => {
      const ms = (new Date(b)) - (new Date(a));
      if (ms <= 0) return '';
      const mins = Math.floor(ms / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // Visual tokens per state
    const tokens = {
      out:  { bg: 'rgba(255,180,0,0.12)', border: 'rgba(255,180,0,0.25)', icon: '◷', iconBg: 'rgba(255,180,0,0.18)', iconColor: T.gold },
      in:   { bg: 'rgba(0,252,143,0.10)', border: 'rgba(0,252,143,0.25)', icon: '✓', iconBg: 'rgba(0,252,143,0.18)', iconColor: T.green },
      done: { bg: 'rgba(255,255,255,0.04)', border: T.borderStr, icon: '✓', iconBg: 'rgba(255,255,255,0.08)', iconColor: T.ink3 },
    }[state];

    return (
      <div style={{
        gridColumn: '1 / -1',
        background: 'linear-gradient(135deg, ' + tokens.bg + ' 0%, transparent 100%)',
        border: '1px solid ' + tokens.border,
        borderRadius: 14, padding: 22,
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: tokens.iconBg,
          display: 'grid', placeItems: 'center',
          fontSize: 26, color: tokens.iconColor,
        }}>{tokens.icon}</div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{
            fontSize: 10, fontFamily: T.mono, letterSpacing: 1.5,
            color: T.ink3, textTransform: 'uppercase', marginBottom: 4,
          }}>{
            state === 'out'  ? 'NOT CHECKED IN YET' :
            state === 'in'   ? 'CHECKED IN · ON CAMPUS' :
                               'DAY ENDED'
          }</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.ink }}>{
            state === 'out'  ? 'Tap below to start your day' :
            state === 'in'   ? 'On campus since ' + fmtTime(checkin.checked_in_at) :
                               'In: ' + fmtTime(checkin.checked_in_at) + '  →  Out: ' + fmtTime(checkin.checked_out_at)
          }</div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>{
            state === 'out'  ? 'Your head teacher will see your check-in instantly.' :
            state === 'in'   ? 'Head teacher sees a green dot next to your name.' :
                               'Total time today: ' + fmtDuration(checkin.checked_in_at, checkin.checked_out_at)
          }</div>
        </div>

        {state === 'out' && (
          <button onClick={handleCheckIn} disabled={busy} style={{
            background: T.green, color: T.bg, border: 'none',
            padding: '13px 24px', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
            fontFamily: T.font, opacity: busy ? 0.6 : 1,
          }}>{busy ? 'Checking in…' : 'Check In Now'}</button>
        )}

        {state === 'in' && (
          <button onClick={handleCheckOut} disabled={busy} style={{
            background: 'transparent', color: T.red,
            border: '1px solid ' + T.red,
            padding: '13px 24px', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
            fontFamily: T.font, opacity: busy ? 0.6 : 1,
          }}>{busy ? 'Checking out…' : 'Check Out'}</button>
        )}

        {state === 'done' && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', color: T.ink3,
            padding: '13px 22px', borderRadius: 10,
            fontSize: 12, fontWeight: 600, fontFamily: T.mono, letterSpacing: 0.5,
          }}>SEE YOU TOMORROW</div>
        )}
      </div>
    );
  }

  // ─── Modal: Roll Call ──────────────────────────────────────────────
  function RollCallModal({ stream, teacher, assignments, existingRollCalls, onClose, onSaved, profile }) {
    const allStudents = (window.PEAK && window.PEAK.students) || [];
    const streamStudents = useMemo(
      () => allStudents.filter(s => s.stream === stream),
      [allStudents, stream]
    );

    // Hydrate from existing roll call records for today
    const initialStatuses = useMemo(() => {
      const map = {};
      streamStudents.forEach(s => {
        const existing = existingRollCalls.find(rc => rc.student_id === s.id);
        map[s.id] = existing ? existing.status : 'present';
      });
      return map;
    }, [streamStudents, existingRollCalls]);

    const [statuses, setStatuses] = useState(initialStatuses);
    const [saving, setSaving] = useState(false);

    const setStatus = (id, status) => setStatuses(prev => ({ ...prev, [id]: status }));

    const counts = useMemo(() => {
      const c = { present: 0, absent: 0, late: 0, excused: 0 };
      Object.values(statuses).forEach(s => { c[s] = (c[s] || 0) + 1; });
      return c;
    }, [statuses]);

    const handleSave = async () => {
      if (saving) return;
      setSaving(true);
      const records = streamStudents.map(s => ({
        tenant_id: profile.tenantId,
        teacher_id: teacher.id,
        student_id: s.id,
        stream: stream,
        status: statuses[s.id] || 'present',
      }));
      const { error } = await writeRollCall(records);
      setSaving(false);
      if (error) {
        tinyToast('Roll call save failed: ' + error.message, 'error');
        return;
      }
      tinyToast(`Roll call for ${stream} saved — head teacher sees it now.`, 'success');
      onSaved(records);
      onClose();
    };

    const statusBtn = (current, value, label, color) => {
      const active = current === value;
      return (
        <button onClick={(e) => { e.stopPropagation(); }} style={{
          background: active ? color : 'transparent',
          color: active ? T.bg : T.ink3,
          border: '1px solid ' + (active ? color : T.borderStr),
          padding: '5px 10px', borderRadius: 6,
          fontSize: 11, fontWeight: 700, fontFamily: T.mono, letterSpacing: 0.5,
          cursor: 'pointer',
        }}>{label}</button>
      );
    };

    return (
      <Modal title={`Roll Call · ${stream}`} onClose={onClose} width={640}>
        <div style={{
          padding: '12px 14px', background: T.surface2, borderRadius: 10,
          marginBottom: 16, display: 'flex', gap: 18, fontSize: 12, color: T.ink2, fontFamily: T.mono,
        }}>
          <span><span style={{ color: T.green }}>● {counts.present}</span> present</span>
          <span><span style={{ color: T.red }}>● {counts.absent}</span> absent</span>
          <span><span style={{ color: T.gold }}>● {counts.late}</span> late</span>
          <span><span style={{ color: T.blue }}>● {counts.excused}</span> excused</span>
          <span style={{ marginLeft: 'auto', color: T.ink3 }}>{streamStudents.length} students</span>
        </div>

        {streamStudents.length === 0 ? (
          <Empty text={`No students seeded for ${stream} yet.`} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {streamStudents.map(s => {
              const current = statuses[s.id] || 'present';
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: T.surface2, borderRadius: 8,
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 999, background: T.surface3,
                    display: 'grid', placeItems: 'center', fontSize: 11, color: T.ink2, fontWeight: 600, flexShrink: 0,
                  }}>{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>
                      {s.flag === 'risk' && <span style={{ color: T.red }}>AT RISK · </span>}
                      {s.flag === 'top' && <span style={{ color: T.gold }}>TOP · </span>}
                      attendance {s.attendanceWk}%
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <span onClick={() => setStatus(s.id, 'present')}>{statusBtn(current, 'present', 'PRESENT', T.green)}</span>
                    <span onClick={() => setStatus(s.id, 'absent')}>{statusBtn(current, 'absent', 'ABSENT', T.red)}</span>
                    <span onClick={() => setStatus(s.id, 'late')}>{statusBtn(current, 'late', 'LATE', T.gold)}</span>
                    <span onClick={() => setStatus(s.id, 'excused')}>{statusBtn(current, 'excused', 'EXCUSED', T.blue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{
            background: 'transparent', color: T.ink2,
            border: '1px solid ' + T.borderStr, padding: '10px 18px',
            borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: T.font,
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || streamStudents.length === 0} style={{
            background: T.green, color: T.bg, border: 'none',
            padding: '10px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer', fontFamily: T.font,
            opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving…' : 'Save Roll Call'}</button>
        </div>
      </Modal>
    );
  }

  // ─── Modal: Log Health/Wellbeing ───────────────────────────────────
  function HealthLogModal({ student, teacher, onClose, onSaved, profile }) {
    const [category, setCategory] = useState('wellbeing');
    const [severity, setSeverity] = useState('low');
    const [description, setDescription] = useState('');
    const [actionTaken, setActionTaken] = useState('');
    const [followUp, setFollowUp] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      if (!description.trim()) {
        tinyToast('Please describe the observation.', 'error');
        return;
      }
      setSaving(true);
      const { error } = await writeHealthRecord({
        tenant_id: profile.tenantId,
        student_id: student.id,
        recorded_by_teacher_id: teacher.id,
        category,
        severity,
        description: description.trim(),
        action_taken: actionTaken.trim() || null,
        follow_up_needed: followUp,
      });
      setSaving(false);
      if (error) {
        tinyToast('Could not save: ' + error.message, 'error');
        return;
      }
      tinyToast('Logged. Head teacher will see this in Health Watch.', 'success');
      if (onSaved) onSaved();
      onClose();
    };

    const radio = (group, value, current, setter, label, color) => (
      <button onClick={() => setter(value)} style={{
        background: current === value ? color : 'transparent',
        color: current === value ? T.bg : T.ink2,
        border: '1px solid ' + (current === value ? color : T.borderStr),
        padding: '7px 12px', borderRadius: 8, fontSize: 11, fontFamily: T.mono,
        fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
      }}>{label}</button>
    );

    const inputStyle = {
      width: '100%', background: T.surface2, border: '1px solid ' + T.border,
      borderRadius: 8, padding: '10px 12px', color: T.ink, fontSize: 13,
      fontFamily: T.font, outline: 'none',
    };
    const labelStyle = {
      fontSize: 10.5, fontFamily: T.mono, letterSpacing: 1.2,
      color: T.ink3, textTransform: 'uppercase', marginBottom: 6, display: 'block',
    };

    return (
      <Modal title={`Log Note · ${student.name}`} onClose={onClose} width={520}>
        <div style={{
          padding: 14, background: T.surface2, borderRadius: 10, marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            width: 38, height: 38, borderRadius: 999, background: T.surface3,
            display: 'grid', placeItems: 'center', fontSize: 13, color: T.ink2, fontWeight: 600,
          }}>{student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{student.name}</div>
            <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>{student.stream} · Guardian: {student.guardian}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>CATEGORY</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {radio('cat', 'illness',   category, setCategory, 'ILLNESS',   T.red)}
            {radio('cat', 'injury',    category, setCategory, 'INJURY',    T.gold)}
            {radio('cat', 'wellbeing', category, setCategory, 'WELLBEING', T.blue)}
            {radio('cat', 'behavior',  category, setCategory, 'BEHAVIOR',  T.green)}
            {radio('cat', 'other',     category, setCategory, 'OTHER',     T.ink3)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>SEVERITY</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {radio('sev', 'low',    severity, setSeverity, 'LOW',    T.green)}
            {radio('sev', 'medium', severity, setSeverity, 'MEDIUM', T.gold)}
            {radio('sev', 'high',   severity, setSeverity, 'HIGH',   T.red)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>WHAT DID YOU OBSERVE? *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="e.g. Complained of headache during English class. Looked pale."
            style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>ACTION TAKEN (OPTIONAL)</label>
          <input value={actionTaken} onChange={e => setActionTaken(e.target.value)}
            placeholder="e.g. Sent to sick bay; Called guardian"
            style={inputStyle} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 18 }}>
          <input type="checkbox" checked={followUp} onChange={e => setFollowUp(e.target.checked)} />
          <span style={{ fontSize: 13, color: T.ink2 }}>Needs follow-up from head teacher</span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{
            background: 'transparent', color: T.ink2,
            border: '1px solid ' + T.borderStr, padding: '10px 18px',
            borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: T.font,
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            background: T.blue, color: '#fff', border: 'none',
            padding: '10px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer', fontFamily: T.font,
            opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Logging…' : 'Log Note'}</button>
        </div>
      </Modal>
    );
  }

  // ─── Card: Today's Classes (with Take Roll Call buttons) ───────────
  function TodaysClassesCard({ assignments, rollCalls, onTakeRollCall }) {
    const today = new Date();
    const todayName = DAY_NAMES[today.getDay()];
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    const todaysClasses = isWeekend ? [] : assignments;

    const allStudents = (window.PEAK && window.PEAK.students) || [];
        const rollCountFor = (stream) => rollCalls.filter(rc => rc.stream === stream).length;
    const studentsInStream = (stream) => allStudents.filter(s => s.stream === stream).length;

    return (
      <Card title={"Today · " + todayName} subtitle="TODAY'S CLASSES" accent={T.green}>
        {isWeekend ? (
          <Empty text="No classes today — it's the weekend. Enjoy the rest." />
        ) : todaysClasses.length === 0 ? (
          <Empty text="You have no class assignments yet. Ask your head teacher." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todaysClasses.map(a => {
              const done = rollCountFor(a.stream);
              const total = studentsInStream(a.stream);
              const rollDone = done > 0 && total > 0 && done >= total;
              return (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  padding: '12px 14px', background: T.surface2, borderRadius: 10,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, background: T.surface3,
                    display: 'grid', placeItems: 'center',
                    fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: T.green,
                  }}>{a.stream}</div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                      {a.subject} · {a.stream.replace(/(P\d)(.)/, '$1 $2')}
                    </div>
                    <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>
                      Subject: {a.subject}
                      {a.is_class_teacher && (
                        <span style={{
                          marginLeft: 8, fontSize: 9.5, color: T.gold,
                          background: 'rgba(255,180,0,0.12)', padding: '2px 8px',
                          borderRadius: 999, letterSpacing: 0.5, fontWeight: 600,
                        }}>CLASS TEACHER</span>
                      )}
                      {rollDone && (
                        <span style={{
                          marginLeft: 8, fontSize: 9.5, color: T.green,
                          background: 'rgba(0,252,143,0.12)', padding: '2px 8px',
                          borderRadius: 999, letterSpacing: 0.5, fontWeight: 600,
                        }}>ROLL TAKEN · {done}/{total}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => onTakeRollCall(a.stream)} style={{
                    background: rollDone ? 'transparent' : T.green,
                    color: rollDone ? T.green : T.bg,
                    border: '1px solid ' + T.green,
                    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: T.font,
                  }}>{rollDone ? 'Update Roll' : 'Take Roll Call'}</button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  function LessonsCard({ lessons }) {
    const statusStyle = (s) => ({
      delivered: { bg: 'rgba(0,252,143,0.12)', fg: T.green, label: 'DELIVERED' },
      planned:   { bg: 'rgba(59,130,246,0.12)', fg: T.blue,  label: 'PLANNED' },
      missed:    { bg: 'rgba(255,71,87,0.12)',  fg: T.red,   label: 'MISSED' },
    })[s] || { bg: 'rgba(255,255,255,0.06)', fg: T.ink3, label: String(s || '').toUpperCase() };
    return (
      <Card title="This Week's Lessons" subtitle="LESSON PLANS" accent={T.blue}>
        {lessons.length === 0 ? (
          <Empty text="No lesson plans yet for this week." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lessons.slice(0, 6).map(l => {
              const s = statusStyle(l.status);
              return (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: T.surface2, borderRadius: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 2 }}>{l.topic}</div>
                    <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>
                      {l.stream} · {l.subject} · WK{l.week_of ? new Date(l.week_of).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9.5, fontFamily: T.mono, fontWeight: 700, letterSpacing: 0.6,
                    background: s.bg, color: s.fg,
                    padding: '4px 8px', borderRadius: 999,
                  }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  function SyllabusCard({ syllabus }) {
    const groups = useMemo(() => {
      const map = {};
      syllabus.forEach(row => {
        const key = row.stream + '|' + row.subject;
        if (!map[key]) map[key] = { stream: row.stream, subject: row.subject, total: 0, covered: 0 };
        map[key].total += 1;
        if (row.status === 'done') map[key].covered += 1;
      });
      return Object.values(map);
    }, [syllabus]);
    return (
      <Card title="Syllabus Coverage" subtitle="TERM PROGRESS" accent={T.gold}>
        {groups.length === 0 ? (
          <Empty text="No syllabus topics tracked yet." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {groups.map((g, i) => {
              const pct = g.total > 0 ? Math.round((g.covered / g.total) * 100) : 0;
              const color = pct >= 75 ? T.green : pct >= 50 ? T.gold : T.red;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{g.stream} · {g.subject}</span>
                    <span style={{ fontSize: 12, color, fontFamily: T.mono, fontWeight: 700 }}>{g.covered}/{g.total} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: T.surface3, borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: color, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  function StudentsCard({ assignments, onLogHealth, healthRecords }) {
    // Build student_id → count map from recent health records
    const healthByStudent = useMemo(() => {
      const map = {};
      (healthRecords || []).forEach(h => {
        map[h.student_id] = (map[h.student_id] || 0) + 1;
      });
      return map;
    }, [healthRecords]);
    const myStreams = new Set(assignments.map(a => a.stream));
    const allStudents = (window.PEAK && window.PEAK.students) || [];
    const myStudents = allStudents.filter(s => myStreams.has(s.stream));
    const flagged = myStudents.filter(s => s.flag === 'risk');
    const topPerformers = myStudents.filter(s => s.flag === 'top');
    return (
      <Card title="My Students" subtitle={"ACROSS " + myStreams.size + " STREAMS"} accent={T.red}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, background: T.surface2, padding: 12, borderRadius: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, fontFamily: T.serif }}>{myStudents.length}</div>
            <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: 0.8 }}>TOTAL</div>
          </div>
          <div style={{ flex: 1, background: T.surface2, padding: 12, borderRadius: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.red, fontFamily: T.serif }}>{flagged.length}</div>
            <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: 0.8 }}>AT RISK</div>
          </div>
          <div style={{ flex: 1, background: T.surface2, padding: 12, borderRadius: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.gold, fontFamily: T.serif }}>{topPerformers.length}</div>
            <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: 0.8 }}>TOP</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: 0.8, marginBottom: 8 }}>
          STUDENT LIST · PERFORMANCE + HEALTH AT A GLANCE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflow: 'auto' }}>
          {myStudents.map(s => {
            const isRisk = s.flag === 'risk';
            const isTop  = s.flag === 'top';
            const healthCount = healthByStudent[s.id] || 0;
            const att = s.attendanceWk || 0;
            const attColor = att >= 90 ? T.green : att >= 70 ? T.gold : T.red;
            const perfLabel = isTop ? 'TOP' : isRisk ? 'AT RISK' : 'NORMAL';
            const perfColor = isTop ? T.gold : isRisk ? T.red : T.ink3;
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                background: isRisk ? 'rgba(255,71,87,0.06)' : T.surface2,
                border: '1px solid ' + (isRisk ? 'rgba(255,71,87,0.18)' : 'transparent'),
                borderRadius: 8,
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 999, background: T.surface3,
                  display: 'grid', placeItems: 'center', fontSize: 11, color: T.ink2, fontWeight: 600, flexShrink: 0,
                }}>{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{s.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 10.5, fontFamily: T.mono }}>
                    <span style={{ color: T.ink4 }}>{s.stream}</span>
                    {/* Attendance pill */}
                    <span style={{
                      color: attColor, background: 'rgba(255,255,255,0.04)',
                      padding: '1px 7px', borderRadius: 999, letterSpacing: 0.5, fontWeight: 700,
                    }}>{att}% ATT</span>
                    {/* Perf pill */}
                    <span style={{
                      color: perfColor, background: 'rgba(255,255,255,0.04)',
                      padding: '1px 7px', borderRadius: 999, letterSpacing: 0.5, fontWeight: 700,
                    }}>{perfLabel}</span>
                    {/* Health badge */}
                    {healthCount > 0 && (
                      <span style={{
                        color: T.blue, background: 'rgba(59,130,246,0.10)',
                        padding: '1px 7px', borderRadius: 999, letterSpacing: 0.5, fontWeight: 700,
                      }}>♥ {healthCount} NOTE{healthCount > 1 ? 'S' : ''}</span>
                    )}
                  </div>
                </div>

                <button onClick={() => onLogHealth(s)} style={{
                  background: 'transparent', color: T.blue,
                  border: '1px solid ' + T.borderStr,
                  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: T.font, flexShrink: 0,
                }}>+ Log Note</button>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  function PayslipCard({ payroll }) {
    const fmt = (n) => 'UGX ' + Number(n || 0).toLocaleString();
    const fmtMonth = (d) => {
      if (!d) return '—';
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      return dt.toLocaleDateString([], { month: 'long', year: 'numeric' });
    };
    const latest = payroll[0];
    const statusStyle = (s) => ({
      paid:    { bg: 'rgba(0,252,143,0.12)',  fg: T.green, label: 'PAID' },
      pending: { bg: 'rgba(255,180,0,0.12)',  fg: T.gold,  label: 'PENDING' },
      overdue: { bg: 'rgba(255,71,87,0.12)',  fg: T.red,   label: 'OVERDUE' },
    })[s] || { bg: 'rgba(255,255,255,0.06)', fg: T.ink3, label: String(s || '').toUpperCase() };
    return (
      <Card title="My Payslip" subtitle="PAYROLL" accent={T.gold}>
        {!latest ? (
          <Empty text="No payroll records yet." />
        ) : (
          <>
            <div style={{
              padding: 18, borderRadius: 12,
              background: 'linear-gradient(135deg, ' + T.surface2 + ' 0%, ' + T.surface3 + ' 100%)',
              marginBottom: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: 0.8 }}>{fmtMonth(latest.month)}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.serif, marginTop: 4 }}>{fmt(latest.amount)}</div>
                </div>
                {(() => {
                  const s = statusStyle(latest.status);
                  return <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 700, letterSpacing: 0.8, background: s.bg, color: s.fg, padding: '5px 10px', borderRadius: 999 }}>{s.label}</span>;
                })()}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: T.ink3, fontFamily: T.mono, flexWrap: 'wrap' }}>
                {latest.channel && <div>Via: <span style={{ color: T.ink2 }}>{latest.channel.toUpperCase()}</span></div>}
                {latest.paid_at && <div>Paid: <span style={{ color: T.green }}>{new Date(latest.paid_at).toLocaleDateString()}</span></div>}
              </div>
            </div>
          </>
        )}
      </Card>
    );
  }

  function TeacherShell() {
    const [data, setData] = useState({ loading: true });
    const [rollCallStream, setRollCallStream] = useState(null);
    const [healthStudent, setHealthStudent] = useState(null);

    const profile = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile()) || { fullName: 'Teacher', role: 'teacher' };
    const initials = (window.PEAK_ROLE && window.PEAK_ROLE.initials()) || 'T';

    const refresh = useCallback(() => {
      loadTeacherData().then(d => setData(Object.assign({}, d, { loading: false })));
    }, []);
    useEffect(() => { refresh(); }, [refresh]);

    const signOut = async () => {
      if (window.NextSession && window.NextSession.signOut) await window.NextSession.signOut();
      else window.location.href = 'login.html';
    };

    const onCheckedIn = (checkin) => setData(prev => ({ ...prev, checkin }));
    const onCheckedOut = (checkin) => setData(prev => ({ ...prev, checkin }));
    const onRollCallSaved = (newRecords) => {
      const updated = [...(data.rollCalls || []).filter(rc => !newRecords.find(nr => nr.student_id === rc.student_id)), ...newRecords];
      setData(prev => ({ ...prev, rollCalls: updated }));
    };

    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return 'Good morning';
      if (h < 17) return 'Good afternoon';
      return 'Good evening';
    })();

    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: T.font }}>
        <header style={{
          padding: '20px 32px', borderBottom: '1px solid ' + T.border,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          background: 'rgba(10,16,41,0.6)', backdropFilter: 'blur(10px)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #00FC8F, #1B9B6F)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
            fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: T.bg,
          }}>P</div>
          <div style={{ flex: 1, lineHeight: 1.15, minWidth: 140 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Peak Primary</div>
            <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: 0.6 }}>TEACHER PORTAL · T2 · WK6</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 999, background: T.gold, color: T.bg, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>{initials}</div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.fullName}</div>
              <div style={{ fontSize: 10.5, color: T.ink3 }}>Teacher</div>
            </div>
            <button onClick={signOut} style={{ background: 'transparent', border: '1px solid ' + T.borderStr, color: T.ink2, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: T.font }}>Sign out</button>
          </div>
        </header>

        <main style={{ padding: '32px 32px 60px', maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 36, fontWeight: 400, margin: 0, fontFamily: T.serif, letterSpacing: '-0.01em' }}>
              {greeting}, {profile.fullName ? profile.fullName.split(' ')[0] : 'Teacher'}
            </h1>
            <p style={{ margin: '8px 0 0', color: T.ink3, fontSize: 14 }}>Here's your day at Peak Primary.</p>
          </div>

          {data.loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.ink3, fontFamily: T.mono, fontSize: 12, letterSpacing: 0.8 }}>LOADING YOUR DASHBOARD…</div>
          ) : data.error ? (
            <div style={{ padding: 24, background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 12, color: '#FF8a92' }}>{data.error}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
              <CheckInCard teacher={data.teacher} checkin={data.checkin} onCheckedIn={onCheckedIn} onCheckedOut={onCheckedOut} profile={profile} />
              <NiaCoachCard
                data={{ teacher: data.teacher, assignments: data.assignments, rollCalls: data.rollCalls || [], checkin: data.checkin, healthRecords: data.healthRecords || [] }}
                onTakeRollCall={setRollCallStream}
                onLogHealth={setHealthStudent}
                onScrollToCheckin={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              />
              <TodaysClassesCard assignments={data.assignments} rollCalls={data.rollCalls || []} onTakeRollCall={setRollCallStream} />
              <LessonsCard lessons={data.lessons} />
              <SyllabusCard syllabus={data.syllabus} />
              <StudentsCard assignments={data.assignments} onLogHealth={setHealthStudent} healthRecords={data.healthRecords || []} />
              <PayslipCard payroll={data.payroll} />
            </div>
          )}
        </main>

        {/* Nia's live check-in nudge — only on weekdays, if not yet checked in */}
        {!data.loading && !data.error && data.teacher && !data.checkin &&
         new Date().getDay() !== 0 && new Date().getDay() !== 6 &&
         new Date().getHours() < 17 && (
          <NiaCheckinPopup
            teacher={data.teacher}
            profile={profile}
            onCheckedIn={onCheckedIn}
          />
        )}

        {rollCallStream && data.teacher && (
          <RollCallModal
            stream={rollCallStream}
            teacher={data.teacher}
            assignments={data.assignments}
            existingRollCalls={(data.rollCalls || []).filter(rc => rc.stream === rollCallStream)}
            onClose={() => setRollCallStream(null)}
            onSaved={onRollCallSaved}
            profile={profile}
          />
        )}

        {healthStudent && data.teacher && (
          <HealthLogModal
            student={healthStudent}
            teacher={data.teacher}
            onClose={() => setHealthStudent(null)}
            onSaved={() => tinyToast('Note saved.', 'success')}
            profile={profile}
          />
        )}
      </div>
    );
  }

  window.TeacherShell = TeacherShell;
})();
