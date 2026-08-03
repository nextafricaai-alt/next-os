/* PEAK_EXAMS — exam marks entry, Ugandan grading, ranks, reports, fee-gate */
window.PEAK_EXAMS = (function () {
  const { useState, useEffect } = React;
  const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  function tenant() { const p = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile) ? window.PEAK_ROLE.getProfile() : null; return (p && p.tenantId) || 'peak-primary'; }
  let LOGO_DATA = null;
  (function () {
    try {
      const src = (window.__BRAND_LOGO) || (window.__resources && window.__resources.faviconLogo) || 'assets/peak-logo.png';
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () { try { const c = document.createElement('canvas'); c.width = img.naturalWidth || 128; c.height = img.naturalHeight || 128; c.getContext('2d').drawImage(img, 0, 0); LOGO_DATA = { data: c.toDataURL('image/png'), w: c.width, h: c.height }; } catch (e) {} };
      img.src = src;
    } catch (e) {}
  })();
  function firstName(n) { return (n || 'Student').split(' ')[0]; }
  function teacherComment(rec, exam) {
    const fn = firstName(rec.student.name);
    if (exam.level === 'alevel') { const p = rec.alevelPoints || 0; if (p >= 15) return fn + ' has performed excellently this term — a strong, university-bound result. Keep it up.'; if (p >= 10) return fn + ' has done well. With more consistency the top grades are within reach.'; if (p >= 6) return 'A fair performance. ' + fn + ' should deepen revision in the weaker principal subjects.'; return fn + ' needs significant improvement and close guidance next term.'; }
    const d = rec.division;
    if (d === 'I') return 'An excellent term. ' + fn + ' shows strong understanding across subjects. Keep up the great work.';
    if (d === 'II') return 'A good performance. With steady effort ' + fn + ' can reach the very top next term. Well done.';
    if (d === 'III') return 'A fair effort. ' + fn + ' should revise more, especially in the weaker subjects.';
    if (d === 'IV') return fn + ' needs to work harder and seek help in the difficult areas. More focus is expected.';
    return fn + ' requires serious improvement and close support. Let us work together next term.';
  }
  function headRemark(rec, exam) {
    if (exam.level === 'alevel') { const p = rec.alevelPoints || 0; if (p >= 12) return 'A commendable result. Well done.'; if (p >= 6) return 'Satisfactory — more effort expected.'; return 'Improvement needed. Parental support requested.'; }
    const d = rec.division;
    if (d === 'I' || d === 'II') return 'A commendable result. Keep it up.';
    if (d === 'III') return 'Satisfactory. More effort expected next term.';
    return 'Improvement needed. Parental support is requested.';
  }

  const LEVELS = {
    primary: { label: 'Primary (PLE)', subjects: ['English', 'Mathematics', 'Science', 'Social Studies'], coreCount: 4, aggCount: 4 },
    olevel:  { label: 'O-Level (UCE)', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History', 'CRE'], coreCount: 8, aggCount: 8 },
    alevel:  { label: 'A-Level (UACE)', subjects: ['Subject 1', 'Subject 2', 'Subject 3'], coreCount: 3, aggCount: 3 },
  };
  const SCHEME = [[80,'D1',1],[70,'D2',2],[65,'C3',3],[60,'C4',4],[55,'C5',5],[50,'C6',6],[45,'P7',7],[40,'P8',8],[0,'F9',9]];
  const ALEVEL = [[80,'A',6],[70,'B',5],[60,'C',4],[50,'D',3],[40,'E',2],[35,'O',1],[0,'F',0]];
  function gradeMark(mark, level, passThreshold) { 
    if (passThreshold != null && mark < passThreshold) return { grade: level === 'alevel' ? 'F' : 'F9', points: level === 'alevel' ? 0 : 9 };
    const tbl = level === 'alevel' ? ALEVEL : SCHEME; 
    for (const row of tbl) { if (mark >= row[0]) return { grade: row[1], points: row[2] }; } 
    const last = tbl[tbl.length - 1]; return { grade: last[1], points: last[2] }; 
  }
  function division(agg) { if (agg <= 12) return 'I'; if (agg <= 23) return 'II'; if (agg <= 29) return 'III'; if (agg <= 34) return 'IV'; return 'U'; }
  function computeStudent(marks, exam) {
    const level = exam.level || 'primary';
    const subs = exam.subjects || [];
    const core = (exam.core && exam.core.length) ? exam.core : subs.slice(0, (LEVELS[level] || LEVELS.primary).coreCount);
    const maxMarks = exam.config && exam.config.max_marks ? Number(exam.config.max_marks) : 100;
    const passThreshold = exam.config && exam.config.passmark ? (Number(exam.config.passmark) / maxMarks) * 100 : null;
    const per = {};
    subs.forEach(sub => { 
      const m = Number(marks[sub]); 
      if (marks[sub] === '' || marks[sub] == null || isNaN(m)) return; 
      const scaledM = m * (100 / maxMarks);
      per[sub] = Object.assign({ mark: m }, gradeMark(scaledM, level, passThreshold)); 
    });
    if (level === 'alevel') {
      const total = subs.reduce((a, sub) => a + (per[sub] ? per[sub].points : 0), 0);
      return { per, alevelPoints: total, aggregate: null, division: null };
    }
    const pool = (level === 'olevel') ? subs : core;
    const take = (LEVELS[level] || LEVELS.primary).aggCount;
    const pts = pool.map(sub => per[sub] ? per[sub].points : 9).sort((a, b) => a - b).slice(0, take);
    const agg = pts.reduce((a, b) => a + b, 0);
    return { per, aggregate: agg, division: division(agg), alevelPoints: null };
  }
  function gradeAll(students, marksMap, exam, balances) {
    const level = exam.level || 'primary';
    const recs = students.map(s => { const m = marksMap[s.id] || {}; if (!Object.keys(m).filter(k => m[k] !== '' && m[k] != null).length) return null; return Object.assign({ student: s, balance: (balances && balances[s.id]) || 0 }, computeStudent(m, exam)); }).filter(Boolean);
    const better = (a, b) => level === 'alevel' ? (b.alevelPoints - a.alevelPoints) : (a.aggregate - b.aggregate);
    const grade = st => { const m = (st || '').match(/^[A-Za-z]+\d+/); return m ? m[0] : (st || '?'); };
    const byStream = {}, byGrade = {};
    recs.forEach(r => { (byStream[r.student.stream] = byStream[r.student.stream] || []).push(r); (byGrade[grade(r.student.stream)] = byGrade[grade(r.student.stream)] || []).push(r); });
    Object.keys(byStream).forEach(k => { const l = byStream[k].slice().sort(better); l.forEach((r, i) => r.streamRank = (i + 1) + '/' + l.length); });
    Object.keys(byGrade).forEach(k => { const l = byGrade[k].slice().sort(better); l.forEach((r, i) => r.classRank = (i + 1) + '/' + l.length); });
    return recs.sort(better);
  }

  function makeReport(rec, exam) {
    const stu = rec.student; const jsPDFc = window.jspdf && window.jspdf.jsPDF; if (!jsPDFc) { window.peakToast && window.peakToast('PDF engine not loaded', 'info'); return; }
    const doc = new jsPDFc(); const brand = (window.__BRAND_NAME) || 'School'; const W = 210;
    const TPL = (window.PEAK_TEMPLATES ? window.PEAK_TEMPLATES.get('report') : { title: 'Student Report Card', footer: 'Generated by NEXT OS', accent: [180, 30, 30] });
    if (LOGO_DATA) { try { const h = 18, w = Math.max(12, h * (LOGO_DATA.w / LOGO_DATA.h)); doc.addImage(LOGO_DATA.data, 'PNG', 14, 11, w, h); } catch (e) {} }
    doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text(brand, W / 2, 19, { align: 'center' });
    doc.setFont(undefined, 'normal'); doc.setFontSize(11); doc.text(TPL.title || 'Student Report Card', W / 2, 26, { align: 'center' });
    doc.setFontSize(9.5); doc.text((exam.name || '') + ' \u00b7 ' + (exam.term || '') + ' ' + (exam.year || ''), W / 2, 32, { align: 'center' });
    doc.setDrawColor(200); doc.line(14, 37, W - 14, 37);
    doc.setFontSize(11);
    doc.text('Name: ' + stu.name, 14, 47);
    doc.text('Class / Stream: ' + (stu.stream || '-'), 14, 54);
    doc.text('Stream position: ' + (rec.streamRank || '-'), 120, 47);
    doc.text('Class position: ' + (rec.classRank || '-'), 120, 54);
    let y = 67; doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text('Subject', 14, y); doc.text('Mark', 120, y); doc.text('Grade', 150, y); doc.setFont(undefined, 'normal');
    y += 2; doc.line(14, y, W - 14, y); y += 7;
    (exam.subjects || []).forEach(sub => { const p = rec.per[sub]; doc.text(String(sub), 14, y); doc.text(p ? String(p.mark) : '\u2014', 120, y); doc.text(p ? p.grade : '\u2014', 150, y); y += 7; });
    y += 2; doc.line(14, y, W - 14, y); y += 9; doc.setFontSize(12); doc.setFont(undefined, 'bold');
    if (exam.level === 'alevel') doc.text('Total points: ' + rec.alevelPoints, 14, y);
    else doc.text('Aggregate: ' + rec.aggregate + '          Division: ' + (rec.division || '\u2014'), 14, y);
    doc.setFont(undefined, 'normal');
    y += 14; doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text("Class Teacher's comment:", 14, y); doc.setFont(undefined, 'normal'); y += 6;
    const tc = doc.splitTextToSize(teacherComment(rec, exam), W - 28); doc.text(tc, 14, y); y += tc.length * 5 + 6;
    doc.setFont(undefined, 'bold'); doc.text("Head Teacher's remark:", 14, y); doc.setFont(undefined, 'normal'); y += 6;
    const hr = doc.splitTextToSize(headRemark(rec, exam), W - 28); doc.text(hr, 14, y); y += hr.length * 5 + 16;
    doc.setDrawColor(120); doc.line(14, y, 70, y); doc.line(120, y, 176, y); doc.setFontSize(9); doc.text('Class Teacher', 14, y + 5); doc.text('Head Teacher', 120, y + 5);
    try { const AC = TPL.accent || [180, 30, 30]; const cx = 95, cy = y + 30, r = 16; doc.setDrawColor(AC[0], AC[1], AC[2]); doc.setLineWidth(0.8); doc.circle(cx, cy, r); doc.circle(cx, cy, r - 2.5); doc.setTextColor((TPL.accent||[180,30,30])[0], (TPL.accent||[180,30,30])[1], (TPL.accent||[180,30,30])[2]); doc.setFontSize(6.5); doc.text(brand.toUpperCase().slice(0, 24), cx, cy - 3, { align: 'center' }); doc.setFont(undefined, 'bold'); doc.setFontSize(7.5); doc.text('OFFICIAL', cx, cy + 1.5, { align: 'center' }); doc.setFont(undefined, 'normal'); doc.setFontSize(5.5); doc.text(new Date().toLocaleDateString(), cx, cy + 5.5, { align: 'center' }); doc.setTextColor(0, 0, 0); doc.setLineWidth(0.2); } catch (e) {}
    doc.setFontSize(9); doc.setTextColor(120); doc.text('Generated by NEXT OS \u00b7 Nia \u00b7 ' + new Date().toLocaleDateString(), 14, 288); doc.setTextColor(0, 0, 0);
    doc.save((stu.name || 'report').replace(/\s+/g, '_') + '_report.pdf');
  }
  function heldMessage(rec, exam) { const s = rec.student; return 'Dear ' + (s.guardian || 'Parent') + ', ' + s.name + "'s " + (exam.term || 'term') + ' report is ready but is being held pending an outstanding balance of UGX ' + Math.round(rec.balance).toLocaleString() + '. Kindly clear the balance so we can release the report. Thank you. — ' + ((window.__BRAND_NAME) || 'School'); }
  function draftHeld(rec, exam) {
    const msg = heldMessage(rec, exam); const phone = (rec.student.guardianPhone || '').replace(/[^0-9]/g, '');
    if (phone) { window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank'); }
    else { try { navigator.clipboard.writeText(msg); } catch (e) {} window.peakToast && window.peakToast('Message copied for ' + rec.student.name, 'info', msg); }
  }

  function Exams() {
    const [exams, setExams] = useState([]);
    const [exam, setExam] = useState(null);
    const [view, setView] = useState('list'); // list | new | entry | results
    const _SC = window.SCHOOL_CONFIG || {};
    const _lvl0 = _SC.type === 'secondary' ? 'olevel' : 'primary';
    const _subs0 = (_SC.subjects && _SC.subjects.length) ? _SC.subjects.join(', ') : LEVELS[_lvl0].subjects.join(', ');
    const [form, setForm] = useState({ name: '', term: 'Term 2', year: 2026, level: _lvl0, subjectsText: _subs0 });
    const [marks, setMarks] = useState({});
    const [streamFilter, setStreamFilter] = useState('All');
    const [recs, setRecs] = useState(null);
    const [busy, setBusy] = useState(false);
    const students = (window.PEAK && window.PEAK.students) || [];
    const streams = Array.from(new Set(students.map(s => s.stream).filter(Boolean))).sort();

    useEffect(() => { fetch(WK + '/exams?tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => { if (d && d.exams) setExams(d.exams); }).catch(() => {}); }, []);

    const subjectsOf = (e) => (e.subjects && e.subjects.length) ? e.subjects : LEVELS[e.level || 'primary'].subjects;

    const createExam = () => {
      const subs = form.subjectsText.split(',').map(x => x.trim()).filter(Boolean);
      const lvl = LEVELS[form.level] || LEVELS.primary;
      const core = subs.slice(0, lvl.coreCount);
      const payload = { tenant_id: tenant(), exam: { name: form.name || (lvl.label + ' Exam'), term: form.term, year: Number(form.year) || null, level: form.level, subjects: subs, core } };
      setBusy(true);
      fetch(WK + '/exams/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()).then(d => { setBusy(false); if (d.error) { window.peakToast('Could not save exam', 'info', d.error); return; } const ex = d.exam; setExams(x => [ex].concat(x)); openExam(ex); }).catch(e => { setBusy(false); window.peakToast('Error', 'info', String(e.message || e)); });
    };
    const openExam = (ex) => {
      setExam(ex); setMarks({}); setRecs(null); setView('entry'); setStreamFilter('All');
      fetch(WK + '/exam-results?tenant=' + encodeURIComponent(tenant()) + '&exam=' + ex.id).then(r => r.json()).then(d => { if (d && d.results) { const m = {}; d.results.forEach(row => { m[row.student_id] = row.marks || {}; }); setMarks(m); } }).catch(() => {});
    };
    const setMark = (sid, sub, val) => setMarks(m => { const c = Object.assign({}, m); c[sid] = Object.assign({}, c[sid], { [sub]: val.replace(/[^0-9]/g, '').slice(0, 3) }); return c; });
    const saveMarks = () => {
      if (!exam) return; setBusy(true);
      const results = Object.keys(marks).map(sid => ({ student_id: Number(sid), marks: marks[sid] })).filter(r => Object.keys(r.marks || {}).length);
      fetch(WK + '/exam-results/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenant(), exam_id: exam.id, results }) }).then(r => r.json()).then(d => { setBusy(false); if (d.error) { window.peakToast('Save failed', 'info', d.error); return; } window.peakToast('Marks saved', 'success', (d.saved || 0) + ' student records stored.'); }).catch(e => { setBusy(false); window.peakToast('Error', 'info', String(e.message || e)); });
    };
    const gradeNow = () => {
      if (!exam) return; setBusy(true);
      fetch(WK + '/fees-balances?tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => {
        const balances = (d && d.balances) || {};
        const r = gradeAll(students, marks, Object.assign({}, exam, { subjects: subjectsOf(exam) }), balances);
        setRecs(r); setView('results'); setBusy(false);
        if (!r.length) window.peakToast('No marks yet', 'info', 'Enter some marks first, then grade.');
      }).catch(() => { const r = gradeAll(students, marks, Object.assign({}, exam, { subjects: subjectsOf(exam) }), {}); setRecs(r); setView('results'); setBusy(false); });
    };

    const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 };
    const btn = (primary) => ({ border: primary ? 'none' : '1px solid ' + T.borderStr, background: primary ? T.red : 'transparent', color: primary ? '#fff' : T.ink2, padding: '9px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' });
    const inp = { background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '9px 11px', fontSize: 13, color: T.ink, fontFamily: T.font, outline: 'none', width: '100%' };

    const shownStudents = streamFilter === 'All' ? students : students.filter(s => s.stream === streamFilter);
    const subs = exam ? subjectsOf(exam) : [];

    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13 }}>
        <header style={{ padding: '22px 28px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>EXAMS &amp; REPORTS</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{exam ? exam.name : 'Exams'}</div>
            <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>{exam ? ((LEVELS[exam.level] || {}).label + ' · ' + (exam.term || '') + ' ' + (exam.year || '')) : 'Ugandan grading · ranks · digital reports · fee-gated release'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {view !== 'list' && <button style={btn(false)} onClick={() => { setView('list'); setExam(null); setRecs(null); }}>← All exams</button>}
            {view === 'list' && <button style={btn(true)} onClick={() => setView('new')}>+ New exam</button>}
            {view === 'entry' && <button style={btn(false)} onClick={saveMarks} disabled={busy}>{busy ? 'Saving…' : 'Save marks'}</button>}
            {view === 'entry' && <button style={btn(true)} onClick={gradeNow} disabled={busy}>{busy ? 'Grading…' : 'Grade & rank →'}</button>}
            {view === 'results' && <button style={btn(false)} onClick={() => setView('entry')}>← Back to marks</button>}
          </div>
        </header>

        <div style={{ padding: 24 }}>
          {view === 'list' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {exams.length === 0 && <div style={{ color: T.ink3 }}>No exams yet. Click “New exam” to create one.</div>}
              {exams.map(e => (
                <div key={e.id} style={Object.assign({}, card, { cursor: 'pointer' })} onClick={() => openExam(e)}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>{(LEVELS[e.level] || {}).label} · {e.term} {e.year}</div>
                  <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 8 }}>{(e.subjects || []).length} subjects · open to enter marks →</div>
                </div>
              ))}
            </div>
          )}

          {view === 'new' && (
            <div style={Object.assign({}, card, { maxWidth: 560 })}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={{ gridColumn: 'span 2' }}><div style={{ fontSize: 11, color: T.ink2, marginBottom: 6, fontFamily: T.mono }}>EXAM NAME</div><input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="End of Term 2 Examinations" /></label>
                <label><div style={{ fontSize: 11, color: T.ink2, marginBottom: 6, fontFamily: T.mono }}>TERM</div><input style={inp} value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} /></label>
                <label><div style={{ fontSize: 11, color: T.ink2, marginBottom: 6, fontFamily: T.mono }}>YEAR</div><input style={inp} value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} /></label>
                <label style={{ gridColumn: 'span 2' }}><div style={{ fontSize: 11, color: T.ink2, marginBottom: 6, fontFamily: T.mono }}>LEVEL</div>
                  <select style={inp} value={form.level} onChange={e => { const lv = e.target.value; setForm(f => ({ ...f, level: lv, subjectsText: LEVELS[lv].subjects.join(', ') })); }}>
                    {Object.keys(LEVELS).map(k => <option key={k} value={k}>{LEVELS[k].label}</option>)}
                  </select>
                </label>
                <label style={{ gridColumn: 'span 2' }}><div style={{ fontSize: 11, color: T.ink2, marginBottom: 6, fontFamily: T.mono }}>SUBJECTS (comma-separated · first {(LEVELS[form.level] || {}).coreCount} form the aggregate)</div><textarea style={Object.assign({}, inp, { height: 70, fontFamily: T.mono, fontSize: 12 })} value={form.subjectsText} onChange={e => setForm(f => ({ ...f, subjectsText: e.target.value }))} /></label>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button style={btn(false)} onClick={() => setView('list')}>Cancel</button>
                <button style={btn(true)} onClick={createExam} disabled={busy}>{busy ? 'Creating…' : 'Create exam →'}</button>
              </div>
            </div>
          )}

          {view === 'entry' && exam && (
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: T.ink3 }}>Stream:</span>
                <select style={Object.assign({}, inp, { width: 'auto' })} value={streamFilter} onChange={e => setStreamFilter(e.target.value)}>
                  <option value="All">All streams</option>{streams.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: 12, color: T.ink3 }}>{shownStudents.length} students · {subs.length} subjects</span>
              </div>
              <div style={{ border: '1px solid ' + T.border, borderRadius: 10, overflow: 'auto', maxHeight: '62vh' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ background: T.surface, position: 'sticky', top: 0 }}>
                    <th style={{ textAlign: 'left', padding: '9px 10px', color: T.ink3, fontFamily: T.mono, fontSize: 10.5, position: 'sticky', left: 0, background: T.surface }}>STUDENT</th>
                    <th style={{ textAlign: 'left', padding: '9px 10px', color: T.ink3, fontFamily: T.mono, fontSize: 10.5 }}>STREAM</th>
                    {subs.map(sub => <th key={sub} style={{ padding: '9px 8px', color: T.ink3, fontFamily: T.mono, fontSize: 10, minWidth: 64 }}>{sub}</th>)}
                  </tr></thead>
                  <tbody>
                    {shownStudents.map(s => (
                      <tr key={s.id} style={{ borderTop: '1px solid ' + T.border }}>
                        <td style={{ padding: '6px 10px', color: T.ink, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: T.bg }}>{s.name}</td>
                        <td style={{ padding: '6px 10px', color: T.ink2 }}>{s.stream}</td>
                        {subs.map(sub => (
                          <td key={sub} style={{ padding: '3px 4px' }}>
                            <input value={(marks[s.id] && marks[s.id][sub] != null) ? marks[s.id][sub] : ''} onChange={e => setMark(s.id, sub, e.target.value)} inputMode="numeric" style={{ width: 50, textAlign: 'center', background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px 4px', color: T.ink, fontSize: 12.5, outline: 'none' }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'results' && recs && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button style={btn(false)} onClick={() => recs.filter(r => r.balance <= 0).forEach(r => makeReport(r, Object.assign({}, exam, { subjects: subjectsOf(exam) })))}>Download all clear reports</button>
                <button style={btn(false)} onClick={() => recs.filter(r => r.balance > 0).forEach(r => draftHeld(r, exam))}>Draft all held-fee messages</button>
              </div>
              <div style={{ border: '1px solid ' + T.border, borderRadius: 10, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ background: T.surface }}>
                    {['Pos', 'Student', 'Stream', exam.level === 'alevel' ? 'Points' : 'Aggregate', exam.level === 'alevel' ? '' : 'Division', 'Stream rank', 'Class rank', 'Report'].map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '9px 10px', color: T.ink3, fontFamily: T.mono, fontSize: 10.5 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {recs.map((r, i) => (
                      <tr key={r.student.id} style={{ borderTop: '1px solid ' + T.border }}>
                        <td style={{ padding: '8px 10px', color: T.ink3 }}>{i + 1}</td>
                        <td style={{ padding: '8px 10px', color: T.ink, fontWeight: 600 }}>{r.student.name}</td>
                        <td style={{ padding: '8px 10px', color: T.ink2 }}>{r.student.stream}</td>
                        <td style={{ padding: '8px 10px', color: T.ink }}>{exam.level === 'alevel' ? r.alevelPoints : r.aggregate}</td>
                        <td style={{ padding: '8px 10px', color: T.ink }}>{exam.level === 'alevel' ? '' : ('Div ' + (r.division || '—'))}</td>
                        <td style={{ padding: '8px 10px', color: T.ink2 }}>{r.streamRank}</td>
                        <td style={{ padding: '8px 10px', color: T.ink2 }}>{r.classRank}</td>
                        <td style={{ padding: '6px 10px' }}>
                          {r.balance > 0
                            ? <button onClick={() => draftHeld(r, exam)} style={{ border: '1px solid ' + T.redInk, background: T.redSft, color: T.redInk, padding: '6px 10px', borderRadius: 7, fontSize: 11.5, cursor: 'pointer' }} title={'Held — owes UGX ' + Math.round(r.balance).toLocaleString()}>Held · message parent</button>
                            : <button onClick={() => makeReport(r, Object.assign({}, exam, { subjects: subjectsOf(exam) }))} style={{ border: 'none', background: T.red, color: '#fff', padding: '6px 12px', borderRadius: 7, fontSize: 11.5, cursor: 'pointer' }}>Report PDF</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: T.ink3, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: T.redSft, color: T.redInk, display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, fontWeight: 700 }}>AI</span>
                <span>Students with an outstanding balance are auto-held — their report won't generate until fees clear. Nia drafts the parent message for you.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return { Exams };
})();
