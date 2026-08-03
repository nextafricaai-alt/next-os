/* PEAK_MARKING — Nia scans a photographed exam, marks it (UNEB), teacher confirms, saves to the learner; plus a holistic care plan on the profile. */
window.PEAK_MARKING = (function () {
  const { useState, useEffect, useCallback } = React;
  const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  function prof() { return (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || { tenantId: 'peak-primary' }; }
  function tenant() { return window.getOSActiveTenant(); }
  function osGet(kind) { return fetch(WK + '/os-data?kind=' + kind + '&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => (d && d.records) || []).catch(() => []); }
  function osSave(kind, record, id) { return fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { kind, tenant: tenant(), record, id } : { kind, tenant: tenant(), record }) }).then(r => r.json()).catch(e => ({ error: String(e && e.message || e) })); }
  const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 };
  const fileToDataUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const norm = (x) => String(x || '').toLowerCase().trim();

  function Mark() {
    const cfg = window.SCHOOL_CONFIG || {};
    const level = cfg.type || 'primary';
    const subjects = (cfg.subjects && cfg.subjects.length) ? cfg.subjects : ['English', 'Mathematics', 'Science', 'Social Studies'];
    const classes = (cfg.classes && cfg.classes.length) ? cfg.classes : [];
    const [img, setImg] = useState('');
    const [meta, setMeta] = useState({ subject: subjects[0] || '', klass: classes[0] || '', examName: '', guide: '' });
    const [busy, setBusy] = useState(false);
    const [marking, setMarking] = useState(null);
    const [err, setErr] = useState('');
    const [students, setStudents] = useState([]);
    const [matchId, setMatchId] = useState('');
    const [saved, setSaved] = useState(false);
    const [recent, setRecent] = useState([]);

    const loadRecent = useCallback(() => osGet('marked_exam').then(rs => setRecent(rs.map(x => Object.assign({ _id: x.id }, x.payload)).sort((a, b) => String(b.markedAt || '').localeCompare(String(a.markedAt || ''))).slice(0, 12))), []);
    useEffect(() => { setStudents((window.PEAK && window.PEAK.students) || []); loadRecent(); }, [loadRecent]);

    const pick = async (file) => { if (!file) return; try { const url = await fileToDataUrl(file); setImg(url); setMarking(null); setSaved(false); setErr(''); } catch (e) { setErr('Could not read that image.'); } };
    const run = () => {
      if (!img) { setErr('Take or choose a photo of the script first.'); return; }
      setBusy(true); setErr(''); setSaved(false);
      fetch(WK + '/exam/scan-mark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img, subject: meta.subject, class: meta.klass, level: level, examName: meta.examName, markGuide: meta.guide }) })
        .then(r => r.json()).then(d => {
          setBusy(false);
          if (d.error) { setErr(d.error); return; }
          setMarking(d.marking);
          const nm = norm(d.marking.studentName); const first = nm.split(' ')[0];
          const hit = first ? students.find(s => norm(s.name).indexOf(first) >= 0) : null;
          if (hit) setMatchId(hit.id);
        }).catch(e => { setBusy(false); setErr(String(e.message || e)); });
    };
    const setQMark = (i, v) => setMarking(m => { const pq = (m.perQuestion || []).slice(); pq[i] = Object.assign({}, pq[i], { marks: Number(String(v).replace(/[^0-9.]/g, '')) || 0 }); const total = pq.reduce((a, q) => a + (Number(q.marks) || 0), 0); const max = pq.reduce((a, q) => a + (Number(q.max) || 0), 0); return Object.assign({}, m, { perQuestion: pq, total: total, max: max, percent: max ? Math.round(total / max * 100) : 0 }); });
    const save = () => {
      if (!marking) return;
      if (!matchId) { setErr('Pick which learner this paper belongs to before saving.'); return; }
      const stu = students.find(s => s.id === matchId) || {};
      setBusy(true); setErr('');
      const rec = { studentId: matchId, studentName: stu.name || marking.studentName, stream: stu.stream || meta.klass, subject: marking.subject || meta.subject, examName: meta.examName, total: marking.total, max: marking.max, percent: marking.percent, grade: marking.grade, perQuestion: marking.perQuestion, feedback: marking.feedback, reasoningNotes: marking.reasoningNotes, source: 'nia-scan', markedAt: new Date().toISOString(), by: (prof().fullName || prof().email || '') };
      osSave('marked_exam', rec).then(() => { setBusy(false); setSaved(true); loadRecent(); window.peakToast && window.peakToast('Saved to ' + (stu.name || 'learner'), 'success', (marking.subject || '') + ' · ' + marking.percent + '%'); }).catch(() => { setBusy(false); setErr('Could not save.'); });
    };

    const lbl = { fontSize: 10, color: T.ink4, fontFamily: T.mono, marginBottom: 4 };
    const inp = { width: '100%', background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: T.ink, outline: 'none' };
    const conf = marking && marking.confidence;

    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, padding: '26px 28px 60px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>AI MARKING · NIA</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Scan &amp; mark an exam</div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 6, maxWidth: 680 }}>Photograph a learner's script. Nia reads the name and answers, marks it the UNEB way, and proposes the marks — you check and confirm before it saves to the child's profile.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>1 · The script</div>
              <label style={{ display: 'block', border: '1px dashed ' + T.border, borderRadius: 10, padding: img ? 0 : '28px 12px', textAlign: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                {img ? <img src={img} alt="script" style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'contain', background: '#000' }} /> : <span style={{ fontSize: 13, color: T.ink3 }}>📷 Tap to take a photo or choose an image of the script</span>}
                <input type="file" accept="image/*" capture="environment" onChange={e => pick(e.target.files && e.target.files[0])} style={{ display: 'none' }} />
              </label>
              {img && <button onClick={() => { setImg(''); setMarking(null); }} style={{ marginTop: 8, background: 'transparent', border: '1px solid ' + T.border, color: T.ink3, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>Clear photo</button>}
            </div>
            <div style={card}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>2 · Context</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label><div style={lbl}>SUBJECT</div><select style={inp} value={meta.subject} onChange={e => setMeta({ ...meta, subject: e.target.value })}>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
                <label><div style={lbl}>CLASS</div>{classes.length ? <select style={inp} value={meta.klass} onChange={e => setMeta({ ...meta, klass: e.target.value })}>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select> : <input style={inp} value={meta.klass} onChange={e => setMeta({ ...meta, klass: e.target.value })} placeholder="P5" />}</label>
              </div>
              <label style={{ display: 'block', marginTop: 10 }}><div style={lbl}>EXAM NAME</div><input style={inp} value={meta.examName} onChange={e => setMeta({ ...meta, examName: e.target.value })} placeholder="e.g. Term 2 Mid-term" /></label>
              <label style={{ display: 'block', marginTop: 10 }}><div style={lbl}>MARKING GUIDE <span style={{ color: T.ink4 }}>· optional, improves accuracy</span></div><textarea style={{ ...inp, minHeight: 60 }} value={meta.guide} onChange={e => setMeta({ ...meta, guide: e.target.value })} placeholder="Paste the marking scheme / correct answers if you have them." /></label>
              <button onClick={run} disabled={busy || !img} style={{ marginTop: 12, width: '100%', background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '11px', fontSize: 13.5, fontWeight: 700, cursor: (busy || !img) ? 'not-allowed' : 'pointer' }}>{busy ? 'Nia is marking…' : '✦ Mark with Nia'}</button>
              {err && <div style={{ marginTop: 10, fontSize: 12, color: T.warn }}>{err}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!marking ? (
              <div style={{ ...card, color: T.ink3, fontSize: 13 }}>Nia's proposed marking will appear here. Nothing saves to a learner until you confirm it.</div>
            ) : (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>3 · Nia's proposed marking</div>
                  {conf && <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 700, color: conf === 'high' ? T.good : conf === 'low' ? T.warn : T.gold, border: '1px solid ' + (conf === 'high' ? T.good : conf === 'low' ? T.warn : T.gold), borderRadius: 999, padding: '2px 8px' }}>{String(conf).toUpperCase()} CONFIDENCE</span>}
                </div>
                {conf === 'low' && <div style={{ fontSize: 11.5, color: T.warn, marginTop: 6 }}>Nia found this hard to read — re-take the photo in better light, or check every mark below.</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '12px 0' }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: marking.percent >= 80 ? T.good : marking.percent >= 50 ? T.gold : T.warn }}>{marking.percent}%</div>
                  <div><div style={{ fontSize: 13, fontWeight: 700 }}>{marking.total}/{marking.max} · {marking.grade || ''}</div><div style={{ fontSize: 11.5, color: T.ink3 }}>{marking.subject}{meta.examName ? ' · ' + meta.examName : ''}</div></div>
                </div>
                <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid ' + T.border, borderRadius: 9 }}>
                  {(marking.perQuestion || []).map((q, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 76px', gap: 8, alignItems: 'center', padding: '8px 10px', borderBottom: i < marking.perQuestion.length - 1 ? '1px solid ' + T.border : 'none' }}>
                      <span style={{ fontSize: 11, fontFamily: T.mono, color: T.ink3 }}>Q{q.q}</span>
                      <div style={{ minWidth: 0 }}><div style={{ fontSize: 12, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.given || '—'}</div>{q.note && <div style={{ fontSize: 10.5, color: T.ink4 }}>{q.note}</div>}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}><input value={q.marks} onChange={e => setQMark(i, e.target.value)} style={{ width: 38, background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '5px', fontSize: 12, color: T.ink, textAlign: 'center', outline: 'none' }} /><span style={{ fontSize: 11, color: T.ink4 }}>/{q.max}</span></div>
                    </div>
                  ))}
                </div>
                {marking.feedback && <div style={{ marginTop: 10, fontSize: 12, color: T.ink2, lineHeight: 1.5 }}><b style={{ color: T.ink }}>Feedback:</b> {marking.feedback}</div>}
                {marking.reasoningNotes && <div style={{ marginTop: 6, fontSize: 11.5, color: T.ink3, lineHeight: 1.5 }}><b>How they reason:</b> {marking.reasoningNotes}</div>}

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + T.border }}>
                  <div style={lbl}>WHICH LEARNER IS THIS? {marking.studentName ? <span style={{ color: T.ink3 }}>· Nia read "{marking.studentName}"</span> : ''}</div>
                  <select style={inp} value={matchId} onChange={e => setMatchId(e.target.value)}>
                    <option value="">— choose the learner —</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}{s.stream ? ' · ' + s.stream : ''}</option>)}
                  </select>
                  <button onClick={save} disabled={busy || saved} style={{ marginTop: 12, width: '100%', background: saved ? T.good : (T.green || '#00c389'), color: '#062b18', border: 'none', borderRadius: 9, padding: '11px', fontSize: 13.5, fontWeight: 700, cursor: (busy || saved) ? 'default' : 'pointer' }}>{saved ? '✓ Saved to learner' : (busy ? 'Saving…' : 'Confirm & save to learner')}</button>
                </div>
              </div>
            )}
            {recent.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>Recently marked</div>
                {recent.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderTop: i ? '1px solid ' + T.border : 'none', fontSize: 12.5 }}>
                    <span style={{ color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.studentName} <span style={{ color: T.ink4 }}>· {r.subject}</span></span>
                    <span style={{ fontFamily: T.mono, color: (r.percent >= 50 ? T.good : T.warn) }}>{r.percent}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────── Holistic care plan (used on the student profile) ─────────
  function CarePlan({ stu }) {
    const [plan, setPlan] = useState(null);
    const [exams, setExams] = useState([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const sid = stu && stu.id;
    const load = useCallback(() => {
      if (!sid) return;
      osGet('marked_exam').then(rs => setExams(rs.map(x => x.payload).filter(p => p.studentId === sid)));
      osGet('care_plan').then(rs => { const mine = rs.map(x => Object.assign({ _id: x.id }, x.payload)).filter(p => p.studentId === sid).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))); if (mine[0]) setPlan(mine[0]); });
    }, [sid]);
    useEffect(load, [load]);

    const generate = () => {
      setBusy(true); setErr('');
      const learner = {
        name: stu.name, stream: stu.stream,
        exams: exams.map(e => ({ subject: e.subject, examName: e.examName, percent: e.percent, total: e.total, max: e.max, grade: e.grade, reasoningNotes: e.reasoningNotes })),
        attendancePct: (stu.attendanceWk != null ? stu.attendanceWk : null),
        feesBalance: (stu.balance != null ? stu.balance : null),
        behaviour: stu.notes ? [].concat(stu.notes).map(n => (typeof n === 'string' ? n : (n.text || ''))).filter(Boolean) : [],
        family: stu.family || stu.background || ''
      };
      fetch(WK + '/exam/care-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learner }) })
        .then(r => r.json()).then(d => {
          setBusy(false);
          if (d.error) { setErr(d.error); return; }
          const rec = { studentId: sid, studentName: stu.name, plan: d.plan, examsCount: exams.length, at: new Date().toISOString() };
          osSave('care_plan', rec).then(() => { setPlan(rec); });
        }).catch(e => { setBusy(false); setErr(String(e.message || e)); });
    };

    const p = plan && plan.plan;
    const sect = (title, items, color) => (Array.isArray(items) && items.length) ? (
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.04em', marginBottom: 6 }}>{title}</div>
        {items.map((it, i) => <div key={i} style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5, paddingLeft: 14, position: 'relative', marginBottom: 4 }}><span style={{ position: 'absolute', left: 0, color: color || T.ink4 }}>•</span>{it}</div>)}
      </div>
    ) : null;

    return (
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Nia's care plan</div>
          <button onClick={generate} disabled={busy} style={{ background: 'transparent', border: '1px solid ' + (T.green || '#00c389'), color: (T.green || '#00c389'), borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Nia is thinking…' : (plan ? '↻ Refresh plan' : '✦ Generate care plan')}</button>
        </div>
        <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 4 }}>Reads {exams.length} marked exam{exams.length === 1 ? '' : 's'} + attendance, fees, behaviour & family to assess how {(stu.name || 'this learner').split(' ')[0]} reasons and what will help.</div>
        {err && <div style={{ fontSize: 12, color: T.warn, marginTop: 8 }}>{err}</div>}
        {!plan && !busy && exams.length === 0 && <div style={{ fontSize: 12.5, color: T.ink4, marginTop: 10 }}>No exams scanned for this learner yet. Mark a few papers under AI Marking, then generate a plan.</div>}
        {p && (
          <div style={{ marginTop: 12 }}>
            {p.summary && <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: 12 }}>{p.summary}</div>}
            {p.reasoningCapacity && <div style={{ marginTop: 12 }}><div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, marginBottom: 4 }}>REASONING CAPACITY</div><div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>{p.reasoningCapacity}</div></div>}
            {sect('STRENGTHS', p.strengths, T.good)}
            {sect('GAPS', p.gaps, T.warn)}
            {sect('UNEB TACTICS TO PRACTISE', p.unebTactics, T.gold)}
            {sect('HOW TO HELP', p.howToHelp, T.ink2)}
            {sect('CARE PLAN', p.carePlan, (T.green || '#00c389'))}
            {plan.at && <div style={{ fontSize: 10, color: T.ink4, fontFamily: T.mono, marginTop: 12 }}>Generated {new Date(plan.at).toLocaleDateString()} · from {plan.examsCount} exam{plan.examsCount === 1 ? '' : 's'}</div>}
          </div>
        )}
      </div>
    );
  }

  return { Mark, CarePlan };
})();
