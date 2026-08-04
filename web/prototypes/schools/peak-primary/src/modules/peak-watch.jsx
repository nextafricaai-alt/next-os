import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } from 'react';

const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const norm = (x) => String(x || '').toLowerCase().trim();
  function prof() { return (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || { tenantId: 'peak-primary' }; }
  function tenant() { return window.getOSActiveTenant(); }
  function osGet(kind) { return fetch(WK + '/os-data?kind=' + kind + '&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => (d && d.records) || []).catch(() => []); }
  function osSave(kind, record, id) { return fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { kind, tenant: tenant(), record, id } : { kind, tenant: tenant(), record }) }).then(r => r.json()).catch(() => ({})); }
  const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 };

  function Card({ onNav }) {
    const [issues, setIssues] = useState(null);
    const [change, setChange] = useState('');
    const nav = (k) => () => window.peakNav && window.peakNav(k);

    const scan = useCallback(async () => {
      const out = [];
      const D = window.PEAK || {};
      const studs = D.students || [];
      const cfg = window.SCHOOL_CONFIG || {};
      const classes = cfg.classes || [];
      const combos = cfg.combinations || [];
      const term = window.__TERM || {};
      // fetch the rest
      const [td, ttRows, sylRows, evRows, snapRows] = await Promise.all([
        fetch(WK + '/teachers?tenant=' + encodeURIComponent(tenant())).then(r => r.json()).catch(() => ({})),
        osGet('timetable'), osGet('syllabus_plan'), osGet('school_event'), osGet('watch_snapshot')
      ]);
      const teachers = (td && td.teachers) || [];
      const grid = (ttRows[0] && ttRows[0].payload && ttRows[0].payload.grid) || null;
      const syl = sylRows.map(x => x.payload).filter(Boolean);
      const events = evRows.map(x => x.payload).filter(Boolean);

      const add = (sev, cat, text, k) => out.push({ sev, cat, text, k });

      // ── Setup gaps ──
      if (!window.__SCHOOL_PROFILE) add('med', 'Setup', "I don't know your school yet — add the About profile (your name → Settings) so my advice fits you.", null);
      if (!term.start || !term.end) add('med', 'Setup', "Term dates aren't set — I can't pace syllabus coverage or anchor events. Set them in Learning.", 'learn');

      // ── Reach ──
      const noPhone = studs.filter(s => !((s.guardianPhone || '').replace(/[^0-9]/g, '').length >= 9));
      if (noPhone.length) add(noPhone.length > 10 ? 'high' : 'med', 'Reach', noPhone.length + ' learner' + (noPhone.length === 1 ? '' : 's') + ' have no guardian phone — those parents can\'t be reached.', 'stud');

      // ── Money ──
      const overdue = studs.filter(s => (Number(s.balance) || 0) > 0);
      const overdueTotal = overdue.reduce((a, s) => a + (Number(s.balance) || 0), 0);
      if (overdue.length) add(overdue.length > 15 ? 'high' : 'med', 'Money', overdue.length + ' fee account' + (overdue.length === 1 ? '' : 's') + ' outstanding · UGX ' + overdueTotal.toLocaleString() + '.', 'fees');

      // ── At-risk ──
      const atRisk = studs.filter(s => s.flag === 'risk' || (s.attendanceWk != null && s.attendanceWk < 70));
      if (atRisk.length) add('med', 'Welfare', atRisk.length + ' learner' + (atRisk.length === 1 ? '' : 's') + ' at-risk (low attendance / flagged) — they need a check-in.', 'stud');

      // ── Academics: timetable + coverage ──
      if (grid) {
        let uncovered = 0; const subjSet = {};
        Object.keys(grid).forEach(c => DAYS.forEach(d => ((grid[c] && grid[c][d]) || []).forEach(cell => { if (cell && cell.subject) { subjSet[norm(c) + '|' + norm(cell.subject)] = true; if (!cell.teacher) uncovered++; } })));
        if (uncovered) add(uncovered > 5 ? 'high' : 'med', 'Academics', uncovered + ' lesson slot' + (uncovered === 1 ? '' : 's') + ' have no teacher assigned — uncovered classes.', 'timetable');
        const sylKeys = {}; syl.forEach(p => { sylKeys[norm(p.class) + '|' + norm(p.subject)] = true; });
        const missing = Object.keys(subjSet).filter(k => !sylKeys[k]).length;
        if (missing && (term.start || true)) add('low', 'Academics', missing + ' class-subject' + (missing === 1 ? '' : 's') + ' have no scheme of work yet — Nia can generate them in Learning.', 'learn');
      } else if (classes.length && studs.length) {
        add('med', 'Academics', 'No timetable built yet — generate it so lessons, coverage and the gate all work.', 'timetable');
      }

      // ── Staff: overload + missing subjects ──
      if (grid && teachers.length) {
        const loadByName = {};
        Object.keys(grid).forEach(c => DAYS.forEach(d => ((grid[c] && grid[c][d]) || []).forEach(cell => { if (cell && cell.teacher) loadByName[norm(cell.teacher)] = (loadByName[norm(cell.teacher)] || 0) + 1; })));
        teachers.forEach(t => { const l = loadByName[norm(t.full_name)] || 0; if (l > 32) add('med', 'Staff', t.full_name + ' is heavily loaded — ' + l + ' periods/week. Consider rebalancing.', 'timetable'); });
      }
      const noSubj = teachers.filter(t => !(t.subjects && t.subjects.length));
      if (noSubj.length) add('low', 'Staff', noSubj.length + ' teacher' + (noSubj.length === 1 ? '' : 's') + ' have no subjects set — they can\'t be auto-assigned.', 'teach');

      // ── Data hygiene: duplicates + mismatches ("what doesn't fit") ──
      const seen = {}; let dupes = 0;
      studs.forEach(s => { const key = norm(s.name) + '|' + norm(s.stream); if (seen[key]) dupes++; else seen[key] = true; });
      if (dupes) add('med', 'Data', dupes + ' possible duplicate learner' + (dupes === 1 ? '' : 's') + ' (same name & stream) — worth checking.', 'stud');
      if (combos.length) { const al = studs.filter(s => s.combination && !/s\.?\s*5|s\.?\s*6|year\s*5|year\s*6/i.test(s.stream || '')); if (al.length) add('low', 'Data', al.length + ' learner' + (al.length === 1 ? '' : 's') + ' have an A-level combination but aren\'t in S5/S6 — that doesn\'t fit.', 'stud'); }

      // ── Events without a coordinator ──
      const today = new Date().toISOString().slice(0, 10);
      const orphanEv = events.filter(e => String(e.date) >= today && e.type !== 'term' && !e.coordinator);
      if (orphanEv.length) add('low', 'Events', orphanEv.length + ' upcoming event' + (orphanEv.length === 1 ? '' : 's') + ' have no coordinator assigned.', 'events');

      // ── Change watch: what was added / removed since last check ──
      const nowSnap = { students: studs.length, teachers: teachers.length, events: events.length };
      const prevSnap = snapRows[0] && snapRows[0].payload;
      if (prevSnap) {
        const parts = [];
        const diff = (label, a, b) => { const d = (a || 0) - (b || 0); if (d > 0) parts.push('+' + d + ' ' + label); else if (d < 0) parts.push(d + ' ' + label); };
        diff('learners', nowSnap.students, prevSnap.students); diff('teachers', nowSnap.teachers, prevSnap.teachers); diff('events', nowSnap.events, prevSnap.events);
        if (parts.length) setChange('Since your last check: ' + parts.join(', ') + '.');
      }
      osSave('watch_snapshot', Object.assign({ at: new Date().toISOString() }, nowSnap), snapRows[0] && snapRows[0].id);

      // ── System health: is the OS itself healthy? ──
      try { const h = await fetch(WK + '/health').then(r => r.json()); if (h && h.status === 'down') { const bad = (h.checks || []).filter(c => c.status === 'down').map(c => c.name).join(', '); add('high', 'System', 'A core system is down (' + (bad || 'unknown') + ') — Nia flagged it for repair. Operations may be affected.', null); } else if (h && h.status === 'warn') { const w = (h.checks || []).filter(c => c.status === 'warn').map(c => c.name).join(', '); add('low', 'System', 'Optional systems not set up: ' + (w || '') + '.', null); } } catch (e) {}

      const order = { high: 0, med: 1, low: 2 };
      out.sort((a, b) => order[a.sev] - order[b.sev]);
      setIssues(out);

      // ── Nia speaks: warm, encouraging, suggestive notifications into the in-OS feed ──
      try {
        const F = window.NIA_FEED; if (F) {
          // celebrate positive change
          if (prevSnap) {
            if (nowSnap.students > prevSnap.students) { var dn = nowSnap.students - prevSnap.students; F.post({ key: 'win-students-' + nowSnap.students, level: 'win', icon: '🎉', title: 'Great work!', body: 'You added ' + dn + ' learner' + (dn === 1 ? '' : 's') + ' — your school is growing. Want every parent reachable? Add their phone numbers next.', cta: { label: 'Open Students', route: 'stud' } }); }
            if (nowSnap.teachers > prevSnap.teachers) { F.post({ key: 'win-teachers-' + nowSnap.teachers, level: 'win', icon: '👏', title: 'Nice momentum', body: 'Your teaching team just grew. Generate the timetable and Nia will auto-assign everyone by subject.', cta: { label: 'Open Timetable', route: 'timetable' } }); }
            if (nowSnap.events > prevSnap.events) { F.post({ key: 'win-events-' + nowSnap.events, level: 'win', icon: '📅', title: 'Term is taking shape', body: "Love it — you're planning ahead. Assign a coordinator to each event so nothing falls through.", cta: { label: 'Open Events', route: 'events' } }); }
          }
          // one gentle, marketing-smart suggestion from the top issue
          var topTip = out.find(x => x.k && x.sev !== 'low') || out.find(x => x.k);
          if (topTip) F.post({ key: 'tip-' + topTip.cat + '-' + topTip.text.slice(0, 24), level: 'tip', icon: '💡', title: 'What about this?', body: topTip.text + ' Tap to sort it in a moment.', cta: { label: 'Fix it', route: topTip.k }, toast: false });
          // package nudge (sell the dream, gently)
          try { var tier = window.PEAK_PACKAGES && window.PEAK_PACKAGES.currentTier(); if (tier === 'foundation') F.post({ key: 'pkg-momentum', level: 'tip', icon: '🚀', title: 'Ready to grow?', body: 'Schools your size love Momentum — WhatsApp to every parent, a parent portal, full finance. Want to see what it unlocks?', cta: { label: 'See plans', route: 'plan' }, toast: false }); else if (tier === 'momentum') F.post({ key: 'pkg-mastery', level: 'tip', icon: '✨', title: 'Go further with Mastery', body: 'Unlock AI exam marking and care plans — Nia at full power for your learners. Worth a look?', cta: { label: 'See plans', route: 'plan' }, toast: false }); } catch (e) {}
          // a warm hello if the feed is empty and all is well
          if (out.length === 0 && !prevSnap) F.post({ key: 'hello', level: 'win', icon: '💚', title: 'I\'m watching for you', body: "Everything looks in order. As you add, change or remove things, I'll celebrate the wins and quietly flag anything that needs you.", toast: false });
        }
      } catch (e) {}
    }, []);
    useEffect(() => { scan(); }, [scan]);

    const sevColor = (s) => s === 'high' ? T.red : s === 'med' ? (T.gold || '#d8a200') : T.ink3;
    if (issues === null) return <div style={{ ...card, marginBottom: 24, color: T.ink3, fontSize: 13 }}>Nia is checking the school…</div>;
    return (
      <div style={{ ...card, marginBottom: 24, borderColor: issues.length ? T.border : (T.green || '#00c389') }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.06em', fontWeight: 600 }}>NIA'S WATCH {issues.length ? '· ' + issues.length + ' to look at' : '· all clear'}</div>
          <button onClick={scan} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink3, borderRadius: 7, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Re-check</button>
        </div>
        {change && <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 8, background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 11px' }}>📋 {change}</div>}
        {issues.length === 0 ? (
          <div style={{ fontSize: 13.5, color: T.green || '#00c389', marginTop: 10, fontWeight: 600 }}>✓ Nothing out of place. I'm watching enrolment, fees, attendance, the timetable, staff load and your data.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            {issues.slice(0, 9).map((it, i) => (
              <div key={i} onClick={it.k ? nav(it.k) : undefined} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: i ? '1px solid ' + T.border : 'none', cursor: it.k ? 'pointer' : 'default', alignItems: 'flex-start' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor(it.sev), marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}><span style={{ fontSize: 9.5, fontFamily: T.mono, color: T.ink4, marginRight: 6 }}>{it.cat.toUpperCase()}</span><span style={{ fontSize: 13, color: T.ink }}>{it.text}</span></div>
                {it.k && <span style={{ color: T.ink4, fontSize: 13 }}>›</span>}
              </div>
            ))}
            {issues.length > 9 && <div style={{ fontSize: 11.5, color: T.ink4, marginTop: 8 }}>+{issues.length - 9} more.</div>}
          </div>
        )}
      </div>
    );
  }

export { Card };
