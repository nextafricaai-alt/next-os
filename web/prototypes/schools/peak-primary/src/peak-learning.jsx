/* PEAK_LEARNING — Nia turns each class+subject syllabus into period-sized lesson plans paced to the term, teachers tick coverage, carry-over + out-of-order supported. */
window.PEAK_LEARNING = (function () {
  const { useState, useEffect, useCallback, useMemo } = React;
  const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const norm = (x) => String(x || '').toLowerCase().trim();
  function prof() { return (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || { tenantId: 'peak-primary' }; }
  function tenant() { return window.getOSActiveTenant(); }
  function osGet(kind) { return fetch(WK + '/os-data?kind=' + kind + '&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => (d && d.records) || []).catch(() => []); }
  function osSave(kind, record, id) { return fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { kind, tenant: tenant(), record, id } : { kind, tenant: tenant(), record }) }).then(r => r.json()).catch(e => ({ error: String(e && e.message || e) })); }
  const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 };
  const planKey = (cls, subj) => norm(cls) + '|' + norm(subj);

  function teachingWeeks(term) {
    if (term && term.start && term.end) { const a = new Date(term.start), b = new Date(term.end); const days = Math.max(1, Math.round((b - a) / 86400000)); return Math.max(1, Math.round(days / 7)); }
    return 13;
  }
  function analyzeTimetable(grid) {
    const out = { classes: [], perWeek: {}, teacher: {}, subjectsByClass: {} };
    if (!grid) return out;
    Object.keys(grid).forEach(cls => {
      out.classes.push(cls); const subjSet = {};
      DAYS.forEach(d => { ((grid[cls] && grid[cls][d]) || []).forEach(cell => { if (cell && cell.subject) { const k = planKey(cls, cell.subject); out.perWeek[k] = (out.perWeek[k] || 0) + 1; subjSet[cell.subject] = true; if (cell.teacher && !out.teacher[k]) out.teacher[k] = { email: cell.teacherEmail || '', name: cell.teacher }; } }); });
      out.subjectsByClass[cls] = Object.keys(subjSet);
    });
    return out;
  }
  const coverageOf = (plan) => { const ls = (plan && plan.lessons) || []; const done = ls.filter(l => l.done).length; return { done, total: ls.length, pct: ls.length ? Math.round(done / ls.length * 100) : 0 }; };
  function LessonTags({ L }) {
    const tag = (txt, bg, fg) => <span style={{ fontSize: 8.5, fontFamily: T.mono, fontWeight: 700, letterSpacing: '0.04em', background: bg, color: fg, borderRadius: 5, padding: '1px 6px', marginLeft: 6, verticalAlign: 'middle' }}>{txt}</span>;
    return <>{L.kind === 'practical' ? tag('PRACTICAL', 'rgba(46,160,67,0.18)', T.good) : null}{L.paper ? tag(String(L.paper).toUpperCase(), 'rgba(58,79,156,0.22)', '#a8b4e8') : null}</>;
  }
  function Bar({ pct, color }) { return <div style={{ height: 7, background: T.border, borderRadius: 999, overflow: 'hidden' }}><div style={{ width: (pct || 0) + '%', height: '100%', background: color || T.good, transition: 'width .3s' }} /></div>; }
  function Gauge({ pct, size, label }) {
    pct = Math.max(0, Math.min(100, Math.round(pct || 0)));
    size = size || 78; const r = (size / 2) - 7; const circ = 2 * Math.PI * r; const off = circ * (1 - pct / 100);
    const col = pct >= 80 ? T.good : pct >= 40 ? (T.gold || '#d8a200') : (pct > 0 ? T.warn : T.ink4);
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth="7" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .5s' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div><div style={{ fontSize: size * 0.26, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{pct}%</div>{label && <div style={{ fontSize: size * 0.11, color: T.ink3, fontFamily: T.mono, marginTop: 2, letterSpacing: '0.04em' }}>{label}</div>}</div>
        </div>
      </div>
    );
  }

  // ───────────────────────── HEAD CONSOLE ─────────────────────────
  function HeadLearning() {
    const [tt, setTt] = useState(null);
    const [term, setTerm] = useState({ start: '', end: '' });
    const [termId, setTermId] = useState(null);
    const [plans, setPlans] = useState({}); // key -> {_id, ...record}
    const [busyKey, setBusyKey] = useState('');
    const [open, setOpen] = useState('');
    const [msg, setMsg] = useState('');

    const loadAll = useCallback(() => {
      osGet('timetable').then(rs => { const p = rs[0] && rs[0].payload; setTt(p || { grid: {}, periods: [] }); });
      osGet('term_config').then(rs => { if (rs[0]) { setTermId(rs[0].id); setTerm(rs[0].payload || { start: '', end: '' }); } });
      osGet('syllabus_plan').then(rs => { const m = {}; rs.forEach(x => { const p = x.payload || {}; if (p.class && p.subject) m[planKey(p.class, p.subject)] = Object.assign({ _id: x.id }, p); }); setPlans(m); });
    }, []);
    useEffect(loadAll, [loadAll]);

    const ana = useMemo(() => analyzeTimetable(tt && tt.grid), [tt]);
    const weeks = teachingWeeks(term);
    const level = (window.SCHOOL_CONFIG && window.SCHOOL_CONFIG.type) || 'primary';

    const saveTerm = () => { osSave('term_config', { start: term.start, end: term.end }, termId).then(r => { if (r && r.record && r.record.id) setTermId(r.record.id); window.peakToast && window.peakToast('Term saved', 'success', weeks + ' teaching weeks'); }); };

    const generate = async (cls, subj) => {
      const k = planKey(cls, subj); setBusyKey(k); setMsg('');
      const perWk = ana.perWeek[k] || 0;
      const lessons = Math.max(6, perWk * weeks);
      try {
        const res = await fetch(WK + '/syllabus/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class: cls, subject: subj, lessons: lessons, level: level }) }).then(r => r.json());
        if (!res || res.error || !res.lessons) { setBusyKey(''); window.peakToast && window.peakToast('Could not generate', 'info', (res && res.error) || 'Try again.'); return; }
        const tch = ana.teacher[k] || {};
        const existing = plans[k];
        const rec = { class: cls, subject: subj, teacherEmail: tch.email || '', teacherName: tch.name || '', perWeek: perWk, weeks: weeks, totalLessons: res.lessons.length, lessons: res.lessons, generatedAt: new Date().toISOString() };
        const r2 = await osSave('syllabus_plan', rec, existing && existing._id);
        setBusyKey(''); loadAll();
        window.peakToast && window.peakToast('Nia built the scheme of work', 'success', cls + ' ' + subj + ' · ' + res.lessons.length + ' lessons');
      } catch (e) { setBusyKey(''); window.peakToast && window.peakToast('Generation failed', 'info', String(e && e.message || e)); }
    };

    const rows = [];
    ana.classes.forEach(cls => (ana.subjectsByClass[cls] || []).forEach(subj => rows.push({ cls, subj, k: planKey(cls, subj) })));
    const overallDone = Object.values(plans).reduce((a, p) => a + coverageOf(p).done, 0);
    const overallTotal = Object.values(plans).reduce((a, p) => a + coverageOf(p).total, 0);

    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, padding: '26px 30px 60px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>LEARNING · SYLLABUS COVERAGE</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Schemes of work &amp; coverage</div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 6, maxWidth: 680 }}>Nia breaks each class's syllabus into period-sized lessons, paced across the term so it finishes on time. Teachers tick each lesson as taught — coverage updates here automatically.</div>
        </div>

        <div style={{ ...card, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 10, color: T.ink4, fontFamily: T.mono, marginBottom: 4 }}>TERM STARTS</div><input type="date" value={term.start} onChange={e => setTerm({ ...term, start: e.target.value })} style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 10px', color: T.ink, fontSize: 13, outline: 'none' }} /></div>
          <div><div style={{ fontSize: 10, color: T.ink4, fontFamily: T.mono, marginBottom: 4 }}>TERM ENDS</div><input type="date" value={term.end} onChange={e => setTerm({ ...term, end: e.target.value })} style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 10px', color: T.ink, fontSize: 13, outline: 'none' }} /></div>
          <button onClick={saveTerm} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Save term</button>
          <div style={{ fontSize: 12, color: T.ink3 }}>{term.start && term.end ? weeks + ' teaching weeks' : 'No dates set — Nia assumes a standard 13-week term'}</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 10, color: T.ink4, fontFamily: T.mono }}>SCHOOL<br/>COVERAGE</span><Gauge pct={overallTotal ? (overallDone / overallTotal * 100) : 0} size={72} /></div>
        </div>

        {rows.length === 0 ? <div style={{ ...card, color: T.ink3 }}>No timetable yet. Build the class timetable first (Timetable → Auto-generate) so Nia knows each class's subjects and how many periods they get a week.</div> : (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {rows.map((r, i) => {
              const p = plans[r.k]; const cov = coverageOf(p); const perWk = ana.perWeek[r.k] || 0; const tch = ana.teacher[r.k] || {}; const target = Math.max(6, perWk * weeks);
              const isOpen = open === r.k;
              return (
                <div key={r.k} style={{ borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 160, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.cls} · {r.subj}</div>
                      <div style={{ fontSize: 11, color: T.ink3 }}>{tch.name || 'No teacher assigned'} · {perWk} period{perWk === 1 ? '' : 's'}/week</div>
                    </div>
                    <div style={{ width: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Gauge pct={p ? cov.pct : 0} size={48} /><div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>{p ? (cov.done + '/' + cov.total + ' lessons') : ('not generated\u00b7 ~' + target + ' lessons')}</div></div>
                    </div>
                    <button onClick={() => generate(r.cls, r.subj)} disabled={busyKey === r.k} style={{ background: p ? 'transparent' : T.red, color: p ? T.ink2 : '#fff', border: p ? '1px solid ' + T.border : 'none', borderRadius: 8, padding: '8px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{busyKey === r.k ? 'Nia is planning…' : (p ? 'Regenerate' : 'Generate with Nia')}</button>
                    {p && <button onClick={() => setOpen(isOpen ? '' : r.k)} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink3, borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>{isOpen ? 'Hide' : 'View'}</button>}
                  </div>
                  {isOpen && p && (
                    <div style={{ padding: '0 16px 16px', maxHeight: 320, overflow: 'auto' }}>
                      {(p.lessons || []).map((L, j) => (
                        <div key={j} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: '1px solid ' + T.border, opacity: L.done ? 0.6 : 1 }}>
                          <span style={{ fontSize: 11, color: L.done ? T.good : T.ink4, fontFamily: T.mono, minWidth: 26 }}>{L.done ? '✓' : (j + 1)}</span>
                          <div><div style={{ fontSize: 12.5, fontWeight: 600, textDecoration: L.done ? 'line-through' : 'none' }}>{L.title}<LessonTags L={L} /></div><div style={{ fontSize: 11, color: T.ink3 }}>{L.topic}{L.objective ? ' — ' + L.objective : ''}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────── TEACHER VIEW ─────────────────────────
  function TeacherLessonPlan({ email }) {
    const myEmail = norm(email || (prof().email) || '');
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState('');
    const [newTopic, setNewTopic] = useState('');

    const load = useCallback(() => { osGet('syllabus_plan').then(rs => { const mine = rs.map(x => Object.assign({ _id: x.id }, x.payload)).filter(p => p.lessons && (!myEmail || norm(p.teacherEmail) === myEmail)); setPlans(mine); setLoading(false); }); }, [myEmail]);
    useEffect(load, [load]);

    const persist = (plan) => { const rec = Object.assign({}, plan); delete rec._id; osSave('syllabus_plan', rec, plan._id).then(() => load()); };
    const toggle = (plan, idx) => { const ls = plan.lessons.slice(); const cur = ls[idx]; ls[idx] = Object.assign({}, cur, { done: !cur.done, doneAt: !cur.done ? new Date().toISOString() : null }); persist(Object.assign({}, plan, { lessons: ls })); };
    const addTaught = (plan) => { if (!newTopic.trim()) return; const ls = plan.lessons.slice(); ls.push({ seq: ls.length + 1, topic: 'Added by teacher', title: newTopic.trim(), objective: '', done: true, doneAt: new Date().toISOString() }); persist(Object.assign({}, plan, { lessons: ls, totalLessons: ls.length })); setAdding(''); setNewTopic(''); };

    if (loading) return <div style={{ padding: 30, color: T.ink3 }}>Loading your lesson plans…</div>;
    if (!plans.length) return (
      <div style={{ ...card, margin: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No lesson plans yet</div>
        <div style={{ fontSize: 13, color: T.ink3 }}>Once your head generates the scheme of work for your class & subject in Learning, Nia's lesson-by-lesson plan appears here for you to tick off as you teach.</div>
      </div>
    );

    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {plans.map((plan) => {
          const cov = coverageOf(plan); const curIdx = plan.lessons.findIndex(l => !l.done); const current = curIdx >= 0 ? plan.lessons[curIdx] : null;
          return (
            <div key={plan._id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 4 }}>
                <div><div style={{ fontSize: 16, fontWeight: 700 }}>{plan.class} · {plan.subject}</div><div style={{ fontSize: 12, color: T.ink3, fontFamily: T.mono, marginTop: 2 }}>{cov.done}/{cov.total} lessons taught</div></div>
                <Gauge pct={cov.pct} size={84} label="COVERED" />
              </div>
              {current ? (
                <div style={{ marginTop: 14, background: 'rgba(226,58,82,0.06)', border: '1px solid ' + T.red, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, color: T.red, fontFamily: T.mono, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>TODAY'S LESSON · #{curIdx + 1}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{current.title}<LessonTags L={current} /></div>
                  <div style={{ fontSize: 12, color: T.ink2, marginTop: 3 }}>{current.topic}{current.objective ? ' — ' + current.objective : ''}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => toggle(plan, curIdx)} style={{ background: T.green || '#00c389', color: '#062b18', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Mark taught</button>
                    <span style={{ fontSize: 11.5, color: T.ink3 }}>Nia: tick this once you've taught it — the next lesson unlocks only when this is done.</span>
                  </div>
                </div>
              ) : <div style={{ marginTop: 14, color: T.good, fontSize: 13, fontWeight: 600 }}>✓ Syllabus fully covered for this class. Well done.</div>}

              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, color: T.ink2 }}>Full scheme of work ({cov.total} lessons) · tick any you've taught</summary>
                <div style={{ marginTop: 10, maxHeight: 300, overflow: 'auto' }}>
                  {plan.lessons.map((L, j) => (
                    <label key={j} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: '1px solid ' + T.border, cursor: 'pointer', alignItems: 'flex-start' }}>
                      <input type="checkbox" checked={!!L.done} onChange={() => toggle(plan, j)} style={{ marginTop: 3 }} />
                      <div><div style={{ fontSize: 12.5, fontWeight: 600, textDecoration: L.done ? 'line-through' : 'none', color: L.done ? T.ink3 : T.ink }}>{j + 1}. {L.title}<LessonTags L={L} /></div><div style={{ fontSize: 11, color: T.ink3 }}>{L.topic}{L.objective ? ' — ' + L.objective : ''}</div></div>
                    </label>
                  ))}
                </div>
                {adding === plan._id ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input autoFocus value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Topic you taught out of order…" style={{ flex: 1, background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: T.ink, outline: 'none' }} />
                    <button onClick={() => addTaught(plan)} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Add as taught</button>
                  </div>
                ) : <button onClick={() => setAdding(plan._id)} style={{ marginTop: 10, background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>+ I taught a topic early</button>}
              </details>
            </div>
          );
        })}
      </div>
    );
  }

  function Learning(props) {
    const role = norm(prof().role || '');
    if (role === 'teacher' || (props && props.asTeacher)) {
      return <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, padding: '24px 28px 60px' }}>
        <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>LEARNING · MY LESSON PLANS</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Today's lessons &amp; syllabus</div>
        <TeacherLessonPlan email={prof().email} />
      </div>;
    }
    return <HeadLearning />;
  }

  return { Learning, HeadLearning, TeacherLessonPlan };
})();
