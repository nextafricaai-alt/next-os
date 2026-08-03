/* PEAK_TIMETABLE — level-aware timetable maker: templates per level, auto teacher allocation (subject+class, no double-booking, fair load), manual edit, persisted in os_records kind=timetable. */
window.PEAK_TIMETABLE = (function () {
  const { useState, useEffect, useCallback } = React;
  const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  function prof() { return (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || { tenantId: 'peak-primary' }; }
  function tenant() { return window.getOSActiveTenant(); }
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const norm = (x) => String(x || '').toLowerCase().trim();

  const PERIODS = {
    primary: [
      { l: 'Period 1', s: '08:00', e: '09:00' },
      { l: 'Period 2', s: '09:00', e: '10:00' },
      { l: 'Break',    s: '10:00', e: '11:00', brk: true },
      { l: 'Period 3', s: '11:00', e: '12:00' },
      { l: 'Period 4', s: '12:00', e: '13:00' },
      { l: 'Lunch',    s: '13:00', e: '14:00', brk: true },
      { l: 'Period 5', s: '14:00', e: '15:00' },
      { l: 'Period 6', s: '15:00', e: '16:00' },
      { l: 'Extra Period', s: '16:00', e: '17:00' },
    ],
    secondary: [
      { l: 'P1', s: '08:00', e: '08:40' }, { l: 'P2', s: '08:40', e: '09:20' }, { l: 'P3', s: '09:20', e: '10:00' }, { l: 'P4', s: '10:00', e: '10:40' },
      { l: 'Break', s: '10:40', e: '11:00', brk: true },
      { l: 'P5', s: '11:00', e: '11:40' }, { l: 'P6', s: '11:40', e: '12:20' }, { l: 'P7', s: '12:20', e: '13:00' },
      { l: 'Lunch', s: '13:00', e: '14:00', brk: true },
      { l: 'P8', s: '14:00', e: '14:40' }, { l: 'P9', s: '14:40', e: '15:20' },
    ],
  };
  const periodsFor = (lvl) => PERIODS[lvl === 'secondary' || lvl === 'tertiary' ? 'secondary' : 'primary'];

  function osGet(kind) { return fetch(WK + '/os-data?kind=' + kind + '&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => (d && d.records) || []).catch(() => []); }
  function osSave(kind, record, id) { return fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { kind, tenant: tenant(), record, id } : { kind, tenant: tenant(), record }) }).then(r => r.json()).catch(e => ({ error: String(e && e.message || e) })); }

  // ---- "now" helpers (for live green cells) ----
  function _toMin(s) { const m = String(s || '').split(':'); return (parseInt(m[0], 10) || 0) * 60 + (parseInt(m[1], 10) || 0); }
  function todayDay() { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]; }
  function nowPeriodIndex(periods) { const mins = new Date().getHours() * 60 + new Date().getMinutes(); for (let i = 0; i < periods.length; i++) { const p = periods[i]; if (!p.brk && mins >= _toMin(p.s) && mins < _toMin(p.e)) return i; } return -1; }
  function presentNameSet(staff) { return new Set((staff || []).filter(s => /in at/i.test(s.status || '') && !/checked out/i.test(s.status || '')).map(s => norm(s.name))); }

  // ---- generation + allocation ----
  function buildEmpty(classes, periods) {
    const g = {};
    classes.forEach(c => { g[c] = {}; DAYS.forEach(d => { g[c][d] = periods.map(p => p.brk ? { brk: true } : { subject: '', teacher: '', teacherEmail: '' }); }); });
    return g;
  }
  function subjectsForClass(c, subjects, cfg) {
    // A-level (S5/S6) follows the school's combinations: timetable those subjects + core, not the whole junior list.
    const combos = (cfg && cfg.combinations) || [];
    const isALevel = combos.length > 0 && /(^|[^0-9])(s\.?\s*5|s\.?\s*6|senior\s*5|senior\s*6|year\s*5|year\s*6)([^0-9]|$)/i.test(String(c));
    if (!isALevel) return subjects;
    const set = {};
    combos.forEach(cb => (cb.subjects || []).forEach(x => { set[x] = true; }));
    // A-level cores every combination sits: General Paper, Subsidiary ICT, Subsidiary Maths
    ['General Paper', 'Subsidiary ICT', 'Subsidiary Maths'].forEach(x => { set[x] = true; });
    const list = Object.keys(set);
    return list.length ? list : subjects;
  }
  function distribute(grid, classes, subjects, periods, cfg) {
    classes.forEach(c => {
      const subj = subjectsForClass(c, subjects, cfg);
      // round-robin subjects across teaching slots, offset per class so it varies
      let si = (c.charCodeAt(0) + c.length) % subj.length;
      DAYS.forEach(d => periods.forEach((p, pi) => {
        if (p.brk) return;
        grid[c][d][pi] = { subject: subj[si % subj.length], teacher: '', teacherEmail: '' };
        si++;
      }));
    });
  }
  function allocate(grid, classes, periods, teachers) {
    // teachers: [{name,email,subjects:[],classes:[]}]
    const load = {}; const busy = {}; // busy[email][d+'|'+pi]=true
    const isBusy = (em, d, pi) => busy[em] && busy[em][d + '|' + pi];
    const mark = (em, d, pi) => { (busy[em] = busy[em] || {})[d + '|' + pi] = true; load[em] = (load[em] || 0) + 1; };
    const pickFrom = (cands) => { if (!cands.length) return null; cands.sort((a, b) => (load[a.email] || 0) - (load[b.email] || 0)); return cands[0]; };
    classes.forEach(c => DAYS.forEach(d => periods.forEach((p, pi) => {
      if (p.brk) return; const cell = grid[c][d][pi]; if (!cell || !cell.subject) return;
      if (cell.teacher) return; // keep any manual / earlier assignment
      const free = teachers.filter(t => t.email && !isBusy(t.email, d, pi));
      const teachesSubject = free.filter(t => (t.subjects || []).some(x => norm(x) === norm(cell.subject)));
      // Tier 1: teaches the subject AND assigned to this class. Tier 2: teaches the subject (any class).
      // Tier 3 (cover-up): any free teacher, so the slot is never left uncovered.
      let pick = pickFrom(teachesSubject.filter(t => (t.classes || []).indexOf(c) >= 0));
      let cover = false;
      if (!pick) pick = pickFrom(teachesSubject);
      if (!pick) { pick = pickFrom(free); cover = true; }
      if (pick) { cell.teacher = pick.name; cell.teacherEmail = pick.email; cell.cover = cover; mark(pick.email, d, pi); }
    })));
  }

  function Timetable() {
    const cfg = window.SCHOOL_CONFIG || {};
    const level = cfg.type || 'primary';
    const periods = periodsFor(level);
    const classes = (cfg.classes && cfg.classes.length) ? cfg.classes : ['P1V', 'P2V', 'P3V', 'P4V', 'P5V', 'P6V', 'P7V'];
    const subjects = (cfg.subjects && cfg.subjects.length) ? cfg.subjects : ['English', 'Mathematics', 'Science', 'Social Studies'];

    const [grid, setGrid] = useState(null);
    const [recId, setRecId] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [cls, setCls] = useState(classes[0]);
    const [busy, setBusy] = useState(false);
    const [edit, setEdit] = useState(null); // {day, pi}
    const [msg, setMsg] = useState('');
    const [staff, setStaff] = useState([]);
    const [, setNowTick] = useState(0);
    const autoTried = React.useRef(false);

    const loadTeachers = useCallback(async () => {
      try {
        const td = await fetch(WK + '/teachers?tenant=' + encodeURIComponent(tenant())).then(r => r.json());
        const metas = await osGet('staff_meta');
        const mc = {}; metas.forEach(m => { const p = m.payload || {}; if (p.email) mc[norm(p.email)] = p.classes || []; });
        const mapped = ((td && td.teachers) || []).map(t => ({ name: t.full_name, email: t.email || '', subjects: t.subjects || [], classes: mc[norm(t.email)] || [] }));
        setTeachers(mapped);
        return mapped;
      } catch (e) { return []; }
    }, []);
    const loadGrid = useCallback(() => osGet('timetable').then(rs => { if (rs[0]) { setRecId(rs[0].id); const p = rs[0].payload || {}; if (p.grid) setGrid(p.grid); } }), []);
    const loadStaff = useCallback(() => { fetch(WK + '/staff-status?tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => setStaff((d && d.staff) || [])).catch(() => {}); }, []);
    useEffect(() => { loadTeachers(); loadGrid(); loadStaff(); }, [loadTeachers, loadGrid, loadStaff]);
    useEffect(() => { const iv = setInterval(() => { setNowTick(t => t + 1); loadStaff(); }, 60000); return () => clearInterval(iv); }, [loadStaff]);
    useEffect(() => {
      if (autoTried.current || !grid || !teachers.length) return;
      let hasSubject = false, hasTeacher = false;
      classes.forEach(c => DAYS.forEach(d => ((grid[c] && grid[c][d]) || []).forEach(cell => { if (cell && cell.subject) { hasSubject = true; if (cell.teacher) hasTeacher = true; } })));
      if (hasTeacher) { autoTried.current = true; return; }
      if (hasSubject) {
        autoTried.current = true;
        const g = JSON.parse(JSON.stringify(grid));
        allocate(g, classes, periods, teachers);
        setGrid(g);
        setMsg('Teachers auto-assigned from your staff list by subject + class. Review, then Save.');
      }
    }, [grid, teachers]);

    const generate = async () => {
      setBusy(true); setMsg('');
      let tch = teachers; if (!tch.length) tch = await loadTeachers();
      const g = buildEmpty(classes, periods);
      distribute(g, classes, subjects, periods, cfg);
      allocate(g, classes, periods, tch);
      setGrid(g); setBusy(false);
      const unfilled = countUnfilled(g);
      let cov = 0; classes.forEach(c => DAYS.forEach(d => ((g[c] && g[c][d]) || []).forEach(cell => { if (cell && cell.cover) cov++; })));
      setMsg((tch.length ? ('Generated ' + classes.length + ' class timetables and allocated ' + tch.length + ' teachers') : 'Generated timetables, but no teachers were found to allocate') + (unfilled ? ' — ' + unfilled + ' slot' + (unfilled === 1 ? '' : 's') + ' still empty.' : '.') + (cov ? ' ' + cov + ' filled as cover (no subject specialist free).' : '') + ' Review, then Save.');
    };
    function countUnfilled(g) { let n = 0; classes.forEach(c => DAYS.forEach(d => (g[c][d] || []).forEach(cell => { if (cell && cell.subject && !cell.teacher) n++; }))); return n; }

    const autoAssign = async () => {
      if (!grid) { generate(); return; }
      setBusy(true); setMsg('');
      let tch = teachers; if (!tch.length) tch = await loadTeachers();
      if (!tch.length) { setBusy(false); setMsg('No teachers found yet. Add staff (with their subjects + classes) under Teachers first.'); return; }
      const g = JSON.parse(JSON.stringify(grid));
      classes.forEach(c => DAYS.forEach(d => ((g[c] && g[c][d]) || []).forEach(cell => { if (cell && !cell.brk) { cell.teacher = ''; cell.teacherEmail = ''; cell.cover = false; } })));
      allocate(g, classes, periods, tch);
      setGrid(g); setBusy(false);
      const unfilled = countUnfilled(g);
      let cov = 0; classes.forEach(c => DAYS.forEach(d => ((g[c] && g[c][d]) || []).forEach(cell => { if (cell && cell.cover) cov++; })));
      setMsg('Teachers re-balanced across your staff list' + (unfilled ? ' — ' + unfilled + ' slot' + (unfilled === 1 ? '' : 's') + ' still empty (no free teacher).' : ' — every slot covered.') + (cov ? ' ' + cov + ' filled as cover (no subject specialist free — marked \u201ccover\u201d).' : '') + ' Review, then Save.');
    };

    const save = () => { if (!grid) return; setBusy(true); osSave('timetable', { level, periods, grid, updatedAt: new Date().toISOString() }, recId).then(res => { setBusy(false); if (res && res.error) { setMsg('Could not save: ' + res.error); return; } if (res && res.record && res.record.id) setRecId(res.record.id); window.peakToast && window.peakToast('Timetable saved', 'success', classes.length + ' classes stored.'); setMsg('Saved.'); }); };

    const setCell = (d, pi, patch) => { setGrid(g => { const n = JSON.parse(JSON.stringify(g)); n[cls][d][pi] = Object.assign({}, n[cls][d][pi], patch); return n; }); };

    const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 16 };
    const cg = (grid && grid[cls]) ? grid[cls] : null;
    const curDay = todayDay();
    const curIdx = nowPeriodIndex(periods);
    const activeNames = presentNameSet(staff);
    const isSchoolNow = DAYS.indexOf(curDay) >= 0 && curIdx >= 0;

    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, padding: '26px 28px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>TIMETABLE · {level.toUpperCase()}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Class timetables</div>
            <div style={{ fontSize: 13.5, color: T.ink3, marginTop: 6, maxWidth: 640 }}>Auto-built for a {level} day. Teachers are allocated from your staff list by subject + class. Tap any slot to change it.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={generate} disabled={busy} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : (grid ? 'Re-generate' : 'Auto-generate')}</button>
            {grid && <button onClick={autoAssign} disabled={busy} style={{ background: 'transparent', border: '1px solid ' + T.green, color: T.green, borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Auto-assign teachers</button>}
            <button onClick={save} disabled={busy || !grid} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}>Save</button>
          </div>
        </div>

        {msg && <div style={{ ...card, marginBottom: 14, fontSize: 12.5, color: T.ink2 }}>{msg}</div>}
        {teachers.length === 0 && <div style={{ ...card, marginBottom: 14, fontSize: 12.5, color: T.warn }}>No teachers found yet. Add staff (with their subjects + classes) under Teachers, then Auto-generate to allocate them.</div>}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {classes.map(c => <button key={c} onClick={() => setCls(c)} style={{ background: cls === c ? T.red : 'transparent', color: cls === c ? '#fff' : T.ink2, border: '1px solid ' + (cls === c ? T.red : T.border), borderRadius: 999, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer' }}>{c}</button>)}
        </div>

        {!cg ? <div style={{ ...card, textAlign: 'center', color: T.ink3 }}>No timetable yet. Click <b>Auto-generate</b> to build one for every class from your staff list.</div> : (
          <div style={{ ...card, overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 540, fontSize: 12 }}>
              <thead><tr>
                <th style={{ textAlign: 'left', padding: '8px 8px', color: T.ink3, fontFamily: T.mono, fontSize: 10.5, position: 'sticky', left: 0, background: T.surface }}>PERIOD</th>
                {DAYS.map(d => <th key={d} style={{ padding: '8px 8px', color: T.ink3, fontFamily: T.mono, fontSize: 10.5 }}>{d}</th>)}
              </tr></thead>
              <tbody>
                {periods.map((p, pi) => (
                  <tr key={pi} style={{ borderTop: '1px solid ' + T.border }}>
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: p.brk ? T.ink4 : T.ink2, position: 'sticky', left: 0, background: T.surface }}>
                      <div style={{ fontWeight: 700, color: p.brk ? T.ink4 : T.ink }}>{p.l}</div>
                      <div style={{ fontSize: 10, color: T.ink4, fontFamily: T.mono }}>{p.s}–{p.e}</div>
                    </td>
                    {p.brk ? <td colSpan={5} style={{ textAlign: 'center', color: T.ink4, fontFamily: T.mono, fontSize: 11, background: 'rgba(255,255,255,0.02)' }}>{p.l}</td>
                      : DAYS.map(d => {
                        const cell = cg[d][pi] || {};
                        const isNow = !p.brk && d === curDay && pi === curIdx;
                        const teacherActive = !!cell.teacher && activeNames.has(norm(cell.teacher));
                        let bg = cell.subject ? 'rgba(58,79,156,0.14)' : T.bg;
                        let bd = cell.subject && !cell.teacher ? T.warn : T.border;
                        if (isNow && cell.subject) { if (teacherActive) { bg = 'rgba(46,160,67,0.18)'; bd = T.green; } else { bg = 'rgba(218,54,51,0.14)'; bd = T.warn; } }
                        return (
                        <td key={d} style={{ padding: 4, verticalAlign: 'top' }}>
                          <button onClick={() => setEdit({ day: d, pi })} style={{ width: '100%', minHeight: 46, textAlign: 'left', background: bg, border: '1px solid ' + bd, boxShadow: isNow && cell.subject ? '0 0 0 1px ' + bd : 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: T.ink, position: 'relative' }}>
                            {isNow && cell.subject && <span style={{ position: 'absolute', top: 5, right: 6, fontSize: 8.5, fontFamily: T.mono, fontWeight: 700, letterSpacing: '0.05em', color: teacherActive ? T.green : T.warn }}>{teacherActive ? '\u25CF NOW' : '\u25CB NOW'}</span>}
                            <div style={{ fontSize: 11.5, fontWeight: 700 }}>{cell.subject || '\u2014'}</div>
                            <div style={{ fontSize: 10.5, color: cell.teacher ? (isNow ? (teacherActive ? T.green : T.warn) : T.ink3) : T.warn, marginTop: 2 }}>{cell.teacher || (cell.subject ? 'assign teacher' : '')}{cell.cover ? ' \u00b7 cover' : ''}{isNow && cell.teacher && !teacherActive ? ' \u00b7 not in' : ''}</div>
                          </button>
                        </td>
                      ); })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cg && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 12, fontSize: 11.5, color: T.ink3, fontFamily: T.mono }}>
            {isSchoolNow
              ? <React.Fragment>
                  <span style={{ color: T.ink2 }}>NOW · {curDay} {periods[curIdx] && periods[curIdx].l}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(46,160,67,0.55)', border: '1px solid ' + T.green }} /> teacher in &amp; teaching</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(218,54,51,0.35)', border: '1px solid ' + T.warn }} /> period live · teacher not in (uncovered)</span>
                </React.Fragment>
              : <span>Live green/amber highlighting shows on class days during lesson periods (08:00–15:20).</span>}
          </div>
        )}

        {edit && cg && <CellEditor cell={cg[edit.day][edit.pi]} subjects={subjects} teachers={teachers} cls={cls} grid={grid} day={edit.day} pi={edit.pi} periods={periods} onClose={() => setEdit(null)} onSave={(patch) => { setCell(edit.day, edit.pi, patch); setEdit(null); }} />}
      </div>
    );
  }

  function CellEditor({ cell, subjects, teachers, cls, grid, day, pi, periods, onClose, onSave }) {
    const [subject, setSubject] = useState(cell.subject || '');
    const [teacherEmail, setTeacherEmail] = useState(cell.teacherEmail || '');
    const inp = { width: '100%', background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: '10px 12px', fontSize: 13, color: T.ink, fontFamily: T.font, outline: 'none' };
    const lbl = { fontSize: 11, color: T.ink3, fontFamily: T.mono, marginBottom: 6 };

    // ── workload + clash per teacher (Nia's intelligence) ──
    function statsFor(email) {
      if (!email) return { total: 0, doubles: 0, busyHere: false };
      let total = 0, doubles = 0, busyHere = false;
      Object.keys(grid || {}).forEach(c => DAYS.forEach(d => {
        const row = (grid[c] && grid[c][d]) || [];
        let runPrev = false;
        row.forEach((cc, idx) => {
          const mine = cc && cc.teacherEmail === email && !cc.brk;
          if (mine) { total++; if (runPrev) doubles++; runPrev = true; } else { runPrev = false; }
          if (mine && d === day && idx === pi && c !== cls) busyHere = true;
        });
      }));
      return { total: total, doubles: doubles, busyHere: busyHere };
    }
    const teachesIt = (t) => (t.subjects || []).some(x => norm(x) === norm(subject));
    const ranked = teachers.filter(t => t.email).map(t => Object.assign({}, t, statsFor(t.email), { teaches: teachesIt(t) }))
      .sort((a, b) => (a.teaches === b.teaches ? 0 : a.teaches ? -1 : 1) || (a.busyHere === b.busyHere ? 0 : a.busyHere ? 1 : -1) || (a.total - b.total));
    const free = ranked.filter(t => !t.busyHere);
    const recommend = free.find(t => t.teaches) || free[0] || null;
    const sel = ranked.find(t => t.email === teacherEmail);

    const save = () => { const t = teachers.find(x => x.email === teacherEmail); onSave({ subject: subject, teacher: t ? t.name : '', teacherEmail: teacherEmail }); };
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(5,8,22,0.7)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: T.surface, border: '1px solid ' + T.border, borderRadius: 16, padding: 22, color: T.ink, fontFamily: T.font }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Edit lesson · {cls} · {periods[pi] ? periods[pi].l : ''} {day}</div>
          <div style={{ fontSize: 12, color: T.ink3, marginBottom: 16 }}>Choose the subject and who teaches it. Nia shows each teacher's load and flags clashes.</div>
          <label><div style={lbl}>SUBJECT</div>
            <select style={inp} value={subject} onChange={e => setSubject(e.target.value)}><option value="">— free / none —</option>{subjects.map(sx => <option key={sx} value={sx}>{sx}</option>)}</select>
          </label>
          <label style={{ display: 'block', marginTop: 12 }}><div style={lbl}>TEACHER</div>
            <select style={inp} value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)}>
              <option value="">— unassigned —</option>
              {ranked.map(t => <option key={t.email} value={t.email}>{t.name}{t.teaches ? ' · teaches it' : ''} · {t.total} pds/wk{t.doubles ? ' · ' + t.doubles + ' dbl' : ''}{t.busyHere ? ' · ✕ busy now' : ''}</option>)}
            </select>
          </label>
          {sel && (sel.busyHere || sel.doubles >= 3 || !sel.teaches) && (
            <div style={{ marginTop: 10, fontSize: 12, color: sel.busyHere ? T.warn : T.ink2, background: T.bg, border: '1px solid ' + (sel.busyHere ? T.warn : T.border), borderRadius: 9, padding: '9px 11px', lineHeight: 1.5 }}>
              <b style={{ color: sel.busyHere ? T.warn : T.ink }}>Nia:</b> {sel.busyHere ? (sel.name + ' is already teaching another class this period — double-booked.') : !sel.teaches ? (sel.name + " doesn't list " + (subject || 'this subject') + ' as a subject.') : (sel.name + ' already has ' + sel.total + ' periods this week and ' + sel.doubles + ' doubles — a heavy load.')}
              {recommend && recommend.email !== sel.email && <span> Consider <b style={{ color: T.green || '#00c389' }}>{recommend.name}</b> — {recommend.teaches ? 'teaches it, ' : ''}{recommend.total} pds/wk, free now. <button onClick={() => setTeacherEmail(recommend.email)} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer', marginLeft: 4 }}>Use {recommend.name.split(' ')[0]}</button></span>}
            </div>
          )}
          {!sel && recommend && subject && (
            <div style={{ marginTop: 10, fontSize: 12, color: T.ink3 }}>Nia suggests <b style={{ color: T.green || '#00c389', cursor: 'pointer' }} onClick={() => setTeacherEmail(recommend.email)}>{recommend.name}</b> — {recommend.teaches ? 'teaches it, ' : ''}{recommend.total} periods/wk, free this slot.</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Set</button>
          </div>
        </div>
      </div>
    );
  }

  return { Timetable };
})();
