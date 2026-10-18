// Source module of the NEXT School OS app (Phase 2 split from index.html).
// Loaded as a classic <script>; compiled to compiled/head-timetable-panel.js by build-precompiled.cjs.
/* head-timetable-panel.jsx
   Sarah's digital timetable — color-coded by live activity.

   Pulls today's slots + cross-references with teacher_checkins and
   student_roll_call. Each cell gets a status:

     GREEN  — slot has happened or is happening, roll call taken
     ORANGE — slot is now or next, teacher checked in, roll not yet taken
     RED    — slot is past/now, teacher not checked in or roll not taken
     GRAY   — unassigned slot (no teacher), or out-of-school time

   Polls every 30s for live updates.

   Exposed as window.HeadTimetablePanel.
*/
(function () {
  const {
    useState,
    useEffect,
    useMemo,
    useCallback
  } = React;
  const T = {
    bg: typeof window !== 'undefined' && window.__BG || '#0a1029',
    surface: typeof window !== 'undefined' && window.__SURFACE || '#141e3c',
    surface2: typeof window !== 'undefined' && window.__SURFACE2 || '#1a2548',
    surface3: typeof window !== 'undefined' && window.__SURFACE3 || '#212d56',
    border: 'rgba(255,255,255,0.06)',
    borderStr: 'rgba(255,255,255,0.10)',
    ink: '#f5f6fa',
    ink2: 'rgba(245,246,250,0.85)',
    ink3: 'rgba(245,246,250,0.55)',
    ink4: 'rgba(245,246,250,0.40)',
    red: '#FF4757',
    green: typeof window !== 'undefined' && window.__ACCENT || '#00FC8F',
    gold: '#FFB400',
    blue: '#3B82F6',
    font: "'Inter', -apple-system, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    serif: "'Instrument Serif', serif"
  };
  const isoDate = () => new Date().toISOString().slice(0, 10);
  // Postgres day_of_week: 1=Mon, 7=Sun. JS getDay: 0=Sun, 6=Sat. Map.
  const todayDow = () => {
    const js = new Date().getDay();
    return js === 0 ? 7 : js;
  };
  const fmtTime = t => {
    // t is "HH:MM:SS" string
    if (!t) return '';
    return t.slice(0, 5);
  };
  // NOT a module-level constant on purpose: window.SCHOOL_CONFIG starts as a
  // fallback default and gets replaced once its async fetch resolves. A
  // frozen snapshot taken when this script first evaluates could capture the
  // stale fallback and never update — call this fresh wherever streams are
  // needed (both the header row and the data cells) so both always agree.
  // Columns = the school's own classes: School Setup's class list, else every
  // stream that has a timetable slot or a pupil. (No hard-coded stream names.)
  var __ttWeekStreams = [];
  function getTimetableStreams() {
    var c = window.SCHOOL_CONFIG && window.SCHOOL_CONFIG.classes || [];
    if (c && c.length) return c;
    var seen = {},
      out = [];
    __ttWeekStreams.concat((window.PEAK && window.PEAK.students || []).map(function (x) {
      return x.stream;
    })).forEach(function (st) {
      st = String(st || '').trim();
      if (st && !seen[st]) {
        seen[st] = 1;
        out.push(st);
      }
    });
    return out.sort(function (a, b) {
      return a.localeCompare(b, undefined, {
        numeric: true
      });
    });
  }
  async function loadTimetable(tenantId, dowOverride) {
    const sb = window.NextSession?.sb;
    if (!sb) return {
      error: 'No session'
    };
    const today = isoDate();
    const dow = dowOverride || todayDow();

    // Selected day's slots, joined with teacher name
    const {
      data: slots
    } = await sb.from('timetable_slots').select('id, period, start_time, end_time, stream, subject, teacher_id, label').eq('tenant_id', tenantId).eq('day_of_week', dow).order('period', {
      ascending: true
    });
    const tRes = await sb.from('teachers').select('*').eq('tenant_id', tenantId).order('full_name', {
      ascending: true
    });
    const teachers = (tRes.data || []).filter(t => t.status !== 'left');

    // Whole week, for the allocation check and clash detection.
    const {
      data: week
    } = await sb.from('timetable_slots').select('id, day_of_week, period, stream, subject, teacher_id').eq('tenant_id', tenantId).order('id', {
      ascending: true
    }).range(0, 4999);
    __ttWeekStreams = Array.from(new Set((week || []).map(x => x.stream)));

    // Today's check-ins (latest per teacher)
    const {
      data: checkins
    } = await sb.from('teacher_checkins').select('teacher_id, checked_in_at, checked_out_at').eq('tenant_id', tenantId).gte('checked_in_at', today + 'T00:00:00');

    // Today's roll call records
    const {
      data: rollCalls
    } = await sb.from('student_roll_call').select('teacher_id, stream').eq('tenant_id', tenantId).eq('roll_date', today);
    return {
      slots: slots || [],
      week: week || [],
      teachers: teachers,
      checkins: checkins || [],
      rollCalls: rollCalls || []
    };
  }

  // Compute slot status given current time + activity
  function computeSlotStatus(slot, ctx) {
    const {
      now,
      checkinByTeacher,
      rollDoneFor
    } = ctx;

    // Unassigned slot → gray
    if (!slot.teacher_id) return {
      status: 'free',
      label: 'UNASSIGNED'
    };

    // Parse slot times into today's date for comparison
    const [sh, sm] = slot.start_time.split(':').map(Number);
    const [eh, em] = slot.end_time.split(':').map(Number);
    const start = new Date(now);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(now);
    end.setHours(eh, em, 0, 0);
    const teacherIn = checkinByTeacher[slot.teacher_id];
    const rollKey = slot.teacher_id + '|' + slot.stream;
    const rollTaken = rollDoneFor[rollKey];
    const isCurrent = now >= start && now < end;
    const isPast = now >= end;
    const isFuture = now < start;
    if (rollTaken) {
      // Roll has been taken — green regardless of time
      return {
        status: 'green',
        label: isCurrent ? 'IN SESSION' : 'DONE'
      };
    }
    if (isFuture) {
      // Pending — assigned class scheduled later today
      return {
        status: 'orange',
        label: 'PENDING'
      };
    }
    if (isCurrent) {
      if (!teacherIn) return {
        status: 'red',
        label: 'TEACHER NOT IN'
      };
      // Teacher checked in, but no roll yet
      return {
        status: 'orange',
        label: 'NO ROLL YET'
      };
    }

    // Past
    if (!teacherIn) return {
      status: 'red',
      label: 'MISSED · NO TEACHER'
    };
    return {
      status: 'red',
      label: 'MISSED · NO ROLL'
    };
  }
  const STATUS_TOKENS = {
    green: {
      bg: 'rgba(0,252,143,0.16)',
      border: 'rgba(0,252,143,0.4)',
      fg: '#00FC8F',
      glow: '0 0 12px rgba(0,252,143,0.25)'
    },
    orange: {
      bg: 'rgba(255,180,0,0.16)',
      border: 'rgba(255,180,0,0.4)',
      fg: '#FFB400',
      glow: 'none'
    },
    red: {
      bg: 'rgba(255,71,87,0.16)',
      border: 'rgba(255,71,87,0.4)',
      fg: '#FF4757',
      glow: '0 0 12px rgba(255,71,87,0.2)'
    },
    free: {
      bg: 'rgba(255,255,255,0.02)',
      border: 'rgba(255,255,255,0.06)',
      fg: 'rgba(245,246,250,0.30)',
      glow: 'none'
    },
    gray: {
      bg: 'rgba(59,130,246,0.08)',
      border: 'rgba(59,130,246,0.20)',
      fg: 'rgba(245,246,250,0.55)',
      glow: 'none'
    }
  };
  const DOW_LABELS = [null, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // index 1..5

  // ─── Allocation check: is every lesson covered, fairly, without clashes? ──
  function AllocationCheck({
    data,
    onPickDay
  }) {
    const [open, setOpen] = useState(false);
    const week = data.week || [];
    const teachers = data.teachers || [];
    const a = useMemo(() => {
      const byId = {};
      teachers.forEach(t => {
        byId[t.id] = t;
      });
      const load = {};
      teachers.forEach(t => {
        load[t.id] = {
          t,
          n: 0,
          classes: new Set(),
          subjects: new Set()
        };
      });
      const orphan = [];
      const clashKey = {};
      week.forEach(s => {
        if (!s.teacher_id) return;
        if (!byId[s.teacher_id]) {
          orphan.push(s);
          return;
        }
        const L = load[s.teacher_id];
        L.n++;
        L.classes.add(s.stream);
        if (s.subject) L.subjects.add(s.subject);
        const k = s.teacher_id + '|' + s.day_of_week + '|' + s.period;
        (clashKey[k] = clashKey[k] || []).push(s);
      });
      const clashes = Object.keys(clashKey).filter(k => clashKey[k].length > 1).map(k => clashKey[k]);
      const rows = Object.values(load).sort((x, y) => y.n - x.n);
      const assigned = week.filter(s => s.teacher_id && byId[s.teacher_id]).length;
      const loads = rows.filter(r => r.n > 0).map(r => r.n);
      const avg = loads.length ? loads.reduce((p, q) => p + q, 0) / loads.length : 0;
      return {
        rows,
        clashes,
        orphan,
        assigned,
        unassigned: week.length - assigned,
        idle: rows.filter(r => r.n === 0),
        avg
      };
    }, [week, teachers]);
    if (data.loading && !week.length) return null;
    const ok = !a.clashes.length && !a.orphan.length && !a.unassigned && !a.idle.length && week.length > 0;
    const pill = (n, label, bad) => /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid ' + (bad && n ? 'rgba(255,71,87,0.5)' : T.borderStr),
        color: bad && n ? '#FF4757' : T.ink2
      }
    }, /*#__PURE__*/React.createElement("b", null, n), " ", label);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        border: '1px solid ' + (ok ? 'rgba(0,252,143,0.35)' : T.borderStr),
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 20,
        background: T.surface || 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        marginRight: 6
      }
    }, week.length === 0 ? 'No timetable yet' : ok ? '✓ Every lesson has a teacher, no clashes' : 'Allocation check'), pill(week.length, 'lessons a week'), pill(a.unassigned, 'without a teacher', true), pill(a.clashes.length, 'clashes', true), pill(a.idle.length, 'teachers with no lessons', true), a.orphan.length > 0 && pill(a.orphan.length, 'lessons with a removed teacher', true), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), week.length > 0 && /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(!open),
      style: {
        background: 'transparent',
        border: '1px solid ' + T.borderStr,
        color: T.ink2,
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 12,
        cursor: 'pointer',
        fontFamily: T.font
      }
    }, open ? 'Hide details' : 'Show details')), open && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14,
        fontSize: 12.5
      }
    }, a.clashes.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: '#FF4757',
        marginBottom: 6
      }
    }, "Clashes \u2014 one teacher, two classes, same period"), a.clashes.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '4px 0',
        color: T.ink2
      }
    }, /*#__PURE__*/React.createElement("b", null, (a.rows.find(r => r.t.id === c[0].teacher_id) || {
      t: {}
    }).t.full_name), " \xB7 ", /*#__PURE__*/React.createElement("button", {
      onClick: () => onPickDay(c[0].day_of_week),
      style: {
        background: 'none',
        border: 'none',
        color: T.green,
        cursor: 'pointer',
        padding: 0,
        fontSize: 12.5
      }
    }, DOW_LABELS[c[0].day_of_week]), " period ", c[0].period, ": ", c.map(x => x.stream + ' (' + x.subject + ')').join(' and ')))), a.unassigned > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        marginBottom: 6
      }
    }, "Lessons without a teacher, by day"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, [1, 2, 3, 4, 5].map(d => {
      const n = week.filter(s => s.day_of_week === d && !(s.teacher_id && a.rows.some(r => r.t.id === s.teacher_id))).length;
      return n ? /*#__PURE__*/React.createElement("button", {
        key: d,
        onClick: () => onPickDay(d),
        style: {
          background: 'transparent',
          border: '1px solid ' + T.borderStr,
          color: T.ink2,
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 12,
          cursor: 'pointer'
        }
      }, DOW_LABELS[d], ": ", n) : null;
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        marginBottom: 6
      }
    }, "Lessons per teacher this week", a.avg ? ' (average ' + Math.round(a.avg) + ')' : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        overflowX: 'auto'
      }
    }, /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: 460
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        color: T.ink3,
        fontSize: 10.5,
        fontFamily: T.mono,
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '6px 8px'
      }
    }, "TEACHER"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '6px 8px'
      }
    }, "LESSONS"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '6px 8px'
      }
    }, "CLASSES"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '6px 8px'
      }
    }, "SUBJECTS"))), /*#__PURE__*/React.createElement("tbody", null, a.rows.map(r => /*#__PURE__*/React.createElement("tr", {
      key: r.t.id,
      style: {
        borderTop: '1px solid ' + T.border
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '6px 8px',
        fontWeight: 600
      }
    }, r.t.full_name), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '6px 8px',
        color: r.n === 0 ? '#FF4757' : a.avg && r.n > a.avg * 1.5 ? '#FFB400' : T.ink
      }
    }, r.n, a.avg && r.n > a.avg * 1.5 ? ' · heavy' : r.n === 0 ? ' · none' : ''), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '6px 8px',
        color: T.ink2
      }
    }, Array.from(r.classes).sort().join(', ') || '—'), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '6px 8px',
        color: T.ink2
      }
    }, Array.from(r.subjects).sort().join(', ') || '—'))))))));
  }
  function HeadTimetablePanel() {
    const profile = window.PEAK_ROLE ? window.PEAK_ROLE.getProfile() : {
      tenantId: 'peak-primary'
    };
    const [data, setData] = useState({
      loading: true
    });
    const [now, setNow] = useState(new Date());
    const [selDow, setSelDow] = useState(todayDow() >= 1 && todayDow() <= 5 ? todayDow() : 1);
    // editSlot: null (closed) | { period, stream, start_time, end_time, id?, subject, teacher_id }
    // id is present when editing an existing slot, absent when creating a new one for an empty cell.
    const [editSlot, setEditSlot] = useState(null);
    const [saving, setSaving] = useState(false);
    const refresh = useCallback(async () => {
      setData(d => ({
        ...d,
        loading: true
      }));
      const r = await loadTimetable(profile.tenantId, selDow);
      setData(Object.assign({}, r, {
        loading: false
      }));
    }, [profile.tenantId, selDow]);
    useEffect(() => {
      refresh();
      // Only poll live every 30s while looking at today — editing a different
      // day shouldn't yank the view out from under someone mid-edit.
      const isToday = selDow === todayDow();
      const dataPoll = isToday ? setInterval(refresh, 30000) : null;
      const clockTick = setInterval(() => setNow(new Date()), 60000); // tick minute
      return () => {
        if (dataPoll) clearInterval(dataPoll);
        clearInterval(clockTick);
      };
    }, [refresh, selDow]);
    const saveSlotEdit = async () => {
      if (!editSlot || saving) return;
      const sb = window.NextSession?.sb;
      if (!sb) return;
      setSaving(true);
      try {
        // One teacher can't be in two classes in the same period.
        if (editSlot.teacher_id) {
          let q = sb.from('timetable_slots').select('id, stream').eq('tenant_id', profile.tenantId).eq('day_of_week', selDow).eq('period', editSlot.period).eq('teacher_id', editSlot.teacher_id);
          if (editSlot.id) q = q.neq('id', editSlot.id);
          const {
            data: clash
          } = await q;
          if (clash && clash.length) {
            const nm = ctx.teacherById && ctx.teacherById[editSlot.teacher_id] || 'This teacher';
            window.peakToast && window.peakToast('Timetable clash', 'error', nm + ' already teaches ' + clash.map(c => c.stream).join(', ') + ' in period ' + editSlot.period + ' on ' + DOW_LABELS[selDow] + '. Free that slot first.');
            setSaving(false);
            return;
          }
        }
        if (editSlot.id) {
          // Editing an existing slot — update subject + teacher.
          const {
            error
          } = await sb.from('timetable_slots').update({
            subject: editSlot.subject,
            teacher_id: editSlot.teacher_id || null
          }).eq('id', editSlot.id);
          if (error) {
            window.peakToast && window.peakToast('Could not save', 'error', error.message);
            setSaving(false);
            return;
          }
        } else {
          // No slot exists yet for this period/stream — create one.
          const {
            error
          } = await sb.from('timetable_slots').insert({
            tenant_id: profile.tenantId,
            day_of_week: selDow,
            period: editSlot.period,
            start_time: editSlot.start_time,
            end_time: editSlot.end_time,
            stream: editSlot.stream,
            subject: editSlot.subject || 'Lesson',
            label: editSlot.label || 'Period ' + editSlot.period,
            teacher_id: editSlot.teacher_id || null
          });
          if (error) {
            window.peakToast && window.peakToast('Could not create slot', 'error', error.message);
            setSaving(false);
            return;
          }
        }
        window.peakToast && window.peakToast('Timetable updated', 'success');
        setEditSlot(null);
        setSaving(false);
        refresh();
      } catch (e) {
        window.peakToast && window.peakToast('Could not save', 'error', String(e && e.message || e));
        setSaving(false);
      }
    };
    const deleteSlot = async () => {
      if (!editSlot || !editSlot.id || saving) return;
      if (!window.confirm('Remove this slot from the timetable entirely?')) return;
      const sb = window.NextSession?.sb;
      if (!sb) return;
      setSaving(true);
      const {
        error
      } = await sb.from('timetable_slots').delete().eq('id', editSlot.id);
      setSaving(false);
      if (error) {
        window.peakToast && window.peakToast('Could not remove', 'error', error.message);
        return;
      }
      window.peakToast && window.peakToast('Slot removed', 'success');
      setEditSlot(null);
      refresh();
    };

    // Build context for status compute
    const ctx = useMemo(() => {
      const checkinByTeacher = {};
      (data.checkins || []).forEach(c => {
        // Teacher is "in" if checked in AND not checked out
        if (!checkinByTeacher[c.teacher_id] || !c.checked_out_at) {
          checkinByTeacher[c.teacher_id] = !c.checked_out_at;
        }
      });
      const rollDoneFor = {};
      (data.rollCalls || []).forEach(r => {
        rollDoneFor[r.teacher_id + '|' + r.stream] = true;
      });
      const teacherById = {};
      (data.teachers || []).forEach(t => {
        teacherById[t.id] = t.full_name;
      });
      return {
        now,
        checkinByTeacher,
        rollDoneFor,
        teacherById
      };
    }, [data, now]);

    // Build matrix: periods (rows) × streams (cols)
    const matrix = useMemo(() => {
      const byPeriod = {};
      (data.slots || []).forEach(s => {
        if (!byPeriod[s.period]) byPeriod[s.period] = {
          period: s.period,
          start_time: s.start_time,
          end_time: s.end_time,
          slots: {}
        };
        byPeriod[s.period].slots[s.stream] = s;
      });
      return Object.values(byPeriod).sort((a, b) => a.period - b.period);
    }, [data]);

    // Stats across the selected day's slots. Only compute live (checked-in /
    // roll-taken) status when actually viewing today — otherwise this used to
    // compare a past/future day's period times against right-now's clock and
    // produce meaningless PENDING/MISSED counts for a day that isn't live.
    const stats = useMemo(() => {
      const c = {
        green: 0,
        orange: 0,
        red: 0,
        free: 0,
        gray: 0
      };
      const showLive = selDow === todayDow();
      (data.slots || []).forEach(s => {
        const st = showLive ? computeSlotStatus(s, ctx) : {
          status: s.teacher_id ? 'gray' : 'free'
        };
        c[st.status] = (c[st.status] || 0) + 1;
      });
      return c;
    }, [data, ctx, selDow]);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        background: T.bg,
        color: T.ink,
        fontFamily: T.font,
        padding: '32px 36px 60px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        fontFamily: T.mono,
        letterSpacing: 1.5,
        color: T.ink3
      }
    }, "TIMETABLE \xB7 ", now.toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }), " \xB7 ", now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontSize: 32,
        fontWeight: 400,
        margin: '6px 0 0',
        fontFamily: T.serif,
        letterSpacing: '-0.01em'
      }
    }, selDow === todayDow() ? "Today's classes — live" : DOW_LABELS[selDow] + "'s classes"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.ink3,
        marginTop: 4
      }
    }, "Click any slot to assign or change its teacher.")), /*#__PURE__*/React.createElement("button", {
      onClick: refresh,
      disabled: data.loading,
      style: {
        background: 'transparent',
        color: T.ink2,
        border: '1px solid ' + T.borderStr,
        padding: '8px 16px',
        borderRadius: 8,
        fontSize: 12,
        cursor: data.loading ? 'wait' : 'pointer',
        fontFamily: T.font
      }
    }, data.loading ? 'Refreshing…' : '↻ Refresh')), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        marginBottom: 20
      }
    }, [1, 2, 3, 4, 5].map(d => {
      const active = d === selDow;
      const isToday = d === todayDow();
      return /*#__PURE__*/React.createElement("button", {
        key: d,
        onClick: () => setSelDow(d),
        style: {
          background: active ? T.green + '22' : 'transparent',
          border: '1px solid ' + (active ? T.green : T.borderStr),
          color: active ? T.green : T.ink2,
          padding: '7px 16px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: T.font,
          position: 'relative'
        }
      }, DOW_LABELS[d], isToday && /*#__PURE__*/React.createElement("span", {
        style: {
          marginLeft: 5,
          fontSize: 8,
          color: active ? T.green : T.ink4
        }
      }, "\u25CF"));
    })), /*#__PURE__*/React.createElement(AllocationCheck, {
      data: data,
      onPickDay: setSelDow
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
        marginBottom: 24
      }
    }, [{
      key: 'green',
      label: 'IN SESSION / DONE',
      count: stats.green
    }, {
      key: 'orange',
      label: 'PENDING / IN PROGRESS',
      count: stats.orange
    }, {
      key: 'red',
      label: 'NEEDS ATTENTION',
      count: stats.red
    }, {
      key: 'free',
      label: 'OPEN SLOTS',
      count: stats.free
    }].map(s => {
      const tk = STATUS_TOKENS[s.key];
      return /*#__PURE__*/React.createElement("div", {
        key: s.key,
        style: {
          background: tk.bg,
          border: '1px solid ' + tk.border,
          borderRadius: 12,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 10,
          height: 10,
          borderRadius: 999,
          background: tk.fg,
          boxShadow: tk.glow
        }
      }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9.5,
          fontFamily: T.mono,
          letterSpacing: 1,
          color: T.ink3
        }
      }, s.label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 22,
          fontWeight: 700,
          color: tk.fg,
          fontFamily: T.serif
        }
      }, s.count)));
    })), data.loading && matrix.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 48,
        textAlign: 'center',
        color: T.ink3,
        fontFamily: T.mono,
        fontSize: 11
      }
    }, "LOADING TIMETABLE\u2026") : matrix.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 48,
        textAlign: 'center',
        color: T.ink4,
        fontStyle: 'italic',
        background: T.surface,
        border: '1px solid ' + T.border,
        borderRadius: 12
      }
    }, "No timetable seeded yet. Run the timetable schema SQL to populate today's slots.") : /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.surface,
        border: '1px solid ' + T.border,
        borderRadius: 12,
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        minWidth: 1100
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        position: 'sticky',
        left: 0,
        zIndex: 2,
        padding: '14px 12px',
        background: T.surface2,
        fontSize: 10,
        fontFamily: T.mono,
        letterSpacing: 1.2,
        color: T.ink3,
        textAlign: 'left',
        width: 110,
        borderBottom: '1px solid ' + T.border
      }
    }, "PERIOD"), getTimetableStreams().map(s => /*#__PURE__*/React.createElement("th", {
      key: s,
      style: {
        padding: '14px 6px',
        background: T.surface2,
        fontSize: 10.5,
        fontFamily: T.mono,
        letterSpacing: 1,
        color: T.ink3,
        fontWeight: 700,
        borderBottom: '1px solid ' + T.border,
        borderLeft: '1px solid ' + T.border,
        minWidth: 64
      }
    }, s)))), /*#__PURE__*/React.createElement("tbody", null, matrix.map(row => {
      // Is this period current?
      const [sh, sm] = row.start_time.split(':').map(Number);
      const [eh, em] = row.end_time.split(':').map(Number);
      const start = new Date(now);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(now);
      end.setHours(eh, em, 0, 0);
      const isCurrent = now >= start && now < end;
      return /*#__PURE__*/React.createElement("tr", {
        key: row.period
      }, /*#__PURE__*/React.createElement("td", {
        style: {
          position: 'sticky',
          left: 0,
          zIndex: 1,
          padding: '10px 12px',
          background: isCurrent ? 'rgba(0,252,143,0.06)' : T.surface,
          borderBottom: '1px solid ' + T.border,
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          color: isCurrent ? T.green : T.ink
        }
      }, "P", row.period, isCurrent && /*#__PURE__*/React.createElement("span", {
        style: {
          marginLeft: 6,
          fontSize: 9,
          color: T.green,
          fontFamily: T.mono
        }
      }, "\u25CF NOW")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10.5,
          color: T.ink3,
          fontFamily: T.mono,
          marginTop: 2
        }
      }, fmtTime(row.start_time), "\u2013", fmtTime(row.end_time))), getTimetableStreams().map(stream => {
        const slot = row.slots[stream];
        if (!slot) {
          // No slot defined → free. Click to create one.
          const tk = STATUS_TOKENS.free;
          return /*#__PURE__*/React.createElement("td", {
            key: stream,
            style: {
              padding: 4,
              borderBottom: '1px solid ' + T.border,
              borderLeft: '1px solid ' + T.border,
              verticalAlign: 'top'
            }
          }, /*#__PURE__*/React.createElement("div", {
            onClick: () => setEditSlot({
              period: row.period,
              start_time: row.start_time,
              end_time: row.end_time,
              stream,
              subject: '',
              teacher_id: null
            }),
            title: "Click to add a lesson here",
            style: {
              background: tk.bg,
              border: '1px solid ' + tk.border,
              borderRadius: 6,
              padding: '8px 6px',
              textAlign: 'center',
              color: tk.fg,
              fontSize: 9,
              fontFamily: T.mono,
              letterSpacing: 0.4,
              minHeight: 50,
              cursor: 'pointer'
            }
          }, "+"));
        }
        const showLive = selDow === todayDow();
        const st = showLive ? computeSlotStatus(slot, ctx) : {
          status: slot.teacher_id ? 'gray' : 'free',
          label: slot.teacher_id ? 'SCHEDULED' : 'UNASSIGNED'
        };
        const tk = STATUS_TOKENS[st.status];
        const teacherName = slot.teacher_id ? ctx.teacherById[slot.teacher_id] : null;
        return /*#__PURE__*/React.createElement("td", {
          key: stream,
          style: {
            padding: 4,
            borderBottom: '1px solid ' + T.border,
            borderLeft: '1px solid ' + T.border,
            verticalAlign: 'top'
          }
        }, /*#__PURE__*/React.createElement("div", {
          onClick: () => setEditSlot({
            id: slot.id,
            period: slot.period,
            start_time: slot.start_time,
            end_time: slot.end_time,
            stream,
            subject: slot.subject,
            teacher_id: slot.teacher_id,
            label: slot.label
          }),
          title: (teacherName ? `${slot.subject} · ${teacherName}` : slot.subject) + ' — click to edit',
          style: {
            background: tk.bg,
            border: '1px solid ' + tk.border,
            borderRadius: 6,
            padding: '8px 6px',
            boxShadow: tk.glow,
            cursor: 'pointer',
            minHeight: 50
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 10.5,
            fontWeight: 700,
            color: tk.fg,
            fontFamily: T.mono,
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        }, slot.subject.slice(0, 7).toUpperCase()), teacherName && /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 9.5,
            color: T.ink3,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        }, teacherName.split(' ')[0]), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 8.5,
            fontFamily: T.mono,
            color: tk.fg,
            marginTop: 2,
            letterSpacing: 0.3
          }
        }, st.label)));
      }));
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        fontSize: 10.5,
        fontFamily: T.mono,
        color: T.ink4,
        textAlign: 'right',
        letterSpacing: 0.6
      }
    }, selDow === todayDow() ? 'LIVE · UPDATES EVERY 30s · CLOCK TICKS EVERY MINUTE' : 'EDITING MODE — not a live day'), editSlot && /*#__PURE__*/React.createElement("div", {
      onClick: () => !saving && setEditSlot(null),
      style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        background: T.surface,
        border: '1px solid ' + T.borderStr,
        borderRadius: 14,
        padding: 24,
        width: '100%',
        maxWidth: 380
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontFamily: T.mono,
        letterSpacing: 1,
        color: T.ink3,
        marginBottom: 4
      }
    }, DOW_LABELS[selDow], " \xB7 PERIOD ", editSlot.period, " \xB7 ", fmtTime(editSlot.start_time), "\u2013", fmtTime(editSlot.end_time)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 700,
        color: T.ink,
        marginBottom: 18
      }
    }, editSlot.stream), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontFamily: T.mono,
        color: T.ink3,
        marginBottom: 6,
        letterSpacing: 0.6
      }
    }, "SUBJECT"), /*#__PURE__*/React.createElement("input", {
      value: editSlot.subject || '',
      onChange: e => setEditSlot(s => ({
        ...s,
        subject: e.target.value
      })),
      placeholder: "e.g. Mathematics",
      style: {
        width: '100%',
        boxSizing: 'border-box',
        background: T.surface2,
        border: '1px solid ' + T.borderStr,
        borderRadius: 8,
        color: T.ink,
        padding: '10px 12px',
        fontSize: 13,
        fontFamily: T.font,
        marginBottom: 16
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontFamily: T.mono,
        color: T.ink3,
        marginBottom: 6,
        letterSpacing: 0.6
      }
    }, "TEACHER"), /*#__PURE__*/React.createElement("select", {
      value: editSlot.teacher_id || '',
      onChange: e => setEditSlot(s => ({
        ...s,
        teacher_id: e.target.value ? Number(e.target.value) : null
      })),
      style: {
        width: '100%',
        boxSizing: 'border-box',
        background: T.surface2,
        border: '1px solid ' + T.borderStr,
        borderRadius: 8,
        color: T.ink,
        padding: '10px 12px',
        fontSize: 13,
        fontFamily: T.font,
        marginBottom: 22
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 Unassigned \u2014"), (data.teachers || []).slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')).map(t => /*#__PURE__*/React.createElement("option", {
      key: t.id,
      value: t.id
    }, t.full_name))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        justifyContent: 'space-between'
      }
    }, editSlot.id ? /*#__PURE__*/React.createElement("button", {
      onClick: deleteSlot,
      disabled: saving,
      style: {
        background: 'transparent',
        color: T.red,
        border: '1px solid ' + T.red,
        padding: '9px 14px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        cursor: saving ? 'wait' : 'pointer',
        fontFamily: T.font
      }
    }, "Remove slot") : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditSlot(null),
      disabled: saving,
      style: {
        background: 'transparent',
        color: T.ink2,
        border: '1px solid ' + T.borderStr,
        padding: '9px 16px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        cursor: saving ? 'wait' : 'pointer',
        fontFamily: T.font
      }
    }, "Cancel"), /*#__PURE__*/React.createElement("button", {
      onClick: saveSlotEdit,
      disabled: saving,
      style: {
        background: T.green,
        color: T.bg,
        border: 'none',
        padding: '9px 18px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        cursor: saving ? 'wait' : 'pointer',
        fontFamily: T.font
      }
    }, saving ? 'Saving…' : 'Save'))))));
  }
  window.HeadTimetablePanel = HeadTimetablePanel;
})();