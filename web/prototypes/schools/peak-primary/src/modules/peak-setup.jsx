import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } from 'react';

const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  function tenant() { const p = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()); return (p && p.tenantId) || 'peak-primary'; }

  const N_CLASSES = ['Baby', 'Middle', 'Top'];
  const N_ACTS = ['Literacy', 'Numeracy', 'Reading', 'Writing', 'Art & Craft', 'Music & Movement', 'Storytime', 'Play & Physical', 'Life Skills'];
  const PRESETS = {
    nursery: { classes: N_CLASSES.slice(), subjects: N_ACTS.slice(), combinations: [] },
    'nursery-primary': { classes: N_CLASSES.concat(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']), subjects: N_ACTS.concat(['English', 'Mathematics', 'Science', 'Social Studies']), combinations: [] },
    primary: { classes: ['P1V', 'P1P', 'P2V', 'P2P', 'P3V', 'P3P', 'P4V', 'P4P', 'P5V', 'P5P', 'P6V', 'P6P', 'P7V', 'P7P'], subjects: ['English', 'Mathematics', 'Science', 'Social Studies'], combinations: [] },
    secondary: { classes: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], subjects: ['English', 'Mathematics 1', 'Mathematics 2', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History', 'CRE', 'Literature', 'Economics', 'Entrepreneurship', 'ICT', 'Agriculture', 'Fine Art'], combinations: [
      { name: 'PCM', subjects: ['Physics', 'Chemistry', 'Mathematics'] }, { name: 'PCB', subjects: ['Physics', 'Chemistry', 'Biology'] }, { name: 'BCM', subjects: ['Biology', 'Chemistry', 'Mathematics'] },
      { name: 'PEM', subjects: ['Physics', 'Economics', 'Mathematics'] }, { name: 'HEG', subjects: ['History', 'Economics', 'Geography'] }, { name: 'MEG', subjects: ['Mathematics', 'Economics', 'Geography'] }, { name: 'HEL', subjects: ['History', 'Economics', 'Literature'] },
    ] },
    tertiary: { classes: ['Year 1', 'Year 2', 'Year 3', 'Year 4'], subjects: ['Communication Skills', 'ICT', 'Research Methods', 'Mathematics', 'Entrepreneurship'], combinations: [] },
  };

  const VOCAB = {
    nursery:   { unit: 'Class', units: 'Classes', stream: 'Stream', sub: 'Activity', subs: 'Activities', staff: 'Teacher', term: 'Term', learner: 'Child' },
    'nursery-primary': { unit: 'Class', units: 'Classes', stream: 'Stream', sub: 'Subject', subs: 'Subjects', staff: 'Teacher', term: 'Term', learner: 'Pupil' },
    primary:   { unit: 'Class', units: 'Classes', stream: 'Stream', sub: 'Subject', subs: 'Subjects', staff: 'Teacher', term: 'Term', learner: 'Pupil' },
    secondary: { unit: 'Class', units: 'Classes', stream: 'Stream', sub: 'Subject', subs: 'Subjects', staff: 'Teacher', term: 'Term', learner: 'Student' },
    tertiary:  { unit: 'Year',  units: 'Years',   stream: 'Group',  sub: 'Course',  subs: 'Courses',  staff: 'Lecturer', term: 'Semester', learner: 'Student' },
  };
  function vocabFor(t) { return VOCAB[t] || VOCAB.primary; }
  function detectLevel(name) {
    const n = String(name || '').toLowerCase();
    if (/universit|college|polytechnic|\binstitute\b|tertiary|campus|\bvocational\b/.test(n)) return 'tertiary';
    if (/secondary|\bhigh\b|seminary|\bs\.?s\.?s?\b|o.?level|a.?level/.test(n)) return 'secondary';
    const hasN = /nursery|kindergarten|pre.?primary|day.?care|\bk\.?g\b|infant|baby class|pre.?school/.test(n);
    const hasP = /primary|\bp\.?s\b|\bp\/s\b|junior/.test(n);
    if (hasN && hasP) return 'nursery-primary';
    if (hasN) return 'nursery';
    return 'primary';
  }

  // ── live config (read by student form, exams, etc.) ──
  if (!window.SCHOOL_CONFIG) {
    window.SCHOOL_CONFIG = { type: 'primary', classes: PRESETS.primary.classes.slice(), subjects: PRESETS.primary.subjects.slice(), combinations: [], vocab: vocabFor('primary'), loaded: false };
    (function () {
      function go() {
        fetch(WK + '/school-config?tenant=' + encodeURIComponent(tenant())).then(function (r) { return r.json(); }).then(function (d) {
          if (d && d.config) { const c = d.config; window.SCHOOL_CONFIG = { type: c.type || 'primary', classes: (c.classes && c.classes.length ? c.classes : window.SCHOOL_CONFIG.classes), subjects: (c.subjects && c.subjects.length ? c.subjects : window.SCHOOL_CONFIG.subjects), combinations: c.combinations || [], vocab: vocabFor(c.type || 'primary'), loaded: true }; }
          else { window.SCHOOL_CONFIG.loaded = true; }
        }).catch(function () { window.SCHOOL_CONFIG.loaded = true; });
      }
      if (document.readyState !== 'loading') go(); else document.addEventListener('DOMContentLoaded', go);
    })();
  }

  function Setup() {
    const cfg = window.SCHOOL_CONFIG || PRESETS.primary;
    const [type, setType] = useState(cfg.type || 'primary');
    const [classes, setClasses] = useState((cfg.classes || []).join(', '));
    const [subjects, setSubjects] = useState((cfg.subjects || []).join(', '));
    const [combos, setCombos] = useState((cfg.combinations || []).map(c => c.name + ': ' + (c.subjects || []).join(', ')).join('\n'));
    const [busy, setBusy] = useState(false);
    const [voiceOn, setVoiceOn] = useState(() => { try { return localStorage.getItem('peak.nia.voice') === '1'; } catch (e) { return false; } });
    const [showTermTransition, setShowTermTransition] = useState(false);
    const [termEndDate, setTermEndDate] = useState(window.__TERM ? window.__TERM.term_end_date : '');
    const [nextTermStartDate, setNextTermStartDate] = useState(window.__TERM ? window.__TERM.next_term_start_date : '');
    const [termReview, setTermReview] = useState('');
    const [termChallenges, setTermChallenges] = useState('');
    const [targetTerm, setTargetTerm] = useState('Term 3');
    const [transitioning, setTransitioning] = useState(false);

    const getNextClass = (cls) => {
      const p = { 'Baby Class': 'Middle Class', 'Middle Class': 'Top Class', 'Top Class': 'P1', 'P1': 'P2', 'P2': 'P3', 'P3': 'P4', 'P4': 'P5', 'P5': 'P6', 'P6': 'P7', 'P7': 'alumni', 'S1': 'S2', 'S2': 'S3', 'S3': 'S4', 'S4': 'S5', 'S5': 'S6', 'S6': 'alumni' };
      return p[cls] || cls;
    };

    const submitTransition = async () => {
      setTransitioning(true);
      let promotions = [];
      if (targetTerm === 'Term 3') {
        const students = window.peakRoster ? window.peakRoster() : (window.PEAK && window.PEAK.students ? window.PEAK.students : []);
        // As a safe fallback for the UI logic without hanging:
        students.forEach(s => {
          if (s.status === 'active' && s.stream) {
            const nc = getNextClass(s.stream);
            if (nc !== s.stream) {
               promotions.push({ id: s.id, newClass: nc === 'alumni' ? s.stream : nc, status: nc === 'alumni' ? 'alumni' : 'active' });
            }
          }
        });
      }
      try {
        const payload = { tenant_id: tenant(), termEndDate, nextTermStartDate, review: termReview, challenges: termChallenges, targetTerm, promotions };
        const req = await fetch(WK + '/school/end-term', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const res = await req.json();
        setTransitioning(false);
        if (res.error) return window.peakToast && window.peakToast('Error', 'info', res.error);
        setShowTermTransition(false);
        window.peakToast && window.peakToast('Term Transition Complete', 'success', targetTerm === 'Term 3' ? 'Promotions applied.' : 'Term dates updated.');
        if (window.__TERM) {
           window.__TERM.term_end_date = termEndDate;
           window.__TERM.next_term_start_date = nextTermStartDate;
        }
      } catch (e) {
        setTransitioning(false);
      }
    };

    const toggleVoiceAssistant = () => setVoiceOn(p => { const n = !p; try { localStorage.setItem('peak.nia.voice', n ? '1' : '0'); } catch (e) {} try { window.dispatchEvent(new CustomEvent('peakVoiceToggle', { detail: n })); } catch (e) {} return n; });

    const applyPreset = (t) => { setType(t); const p = PRESETS[t]; setClasses(p.classes.join(', ')); setSubjects(p.subjects.join(', ')); setCombos(p.combinations.map(c => c.name + ': ' + c.subjects.join(', ')).join('\n')); };

    const save = () => {
      setBusy(true);
      const classesArr = classes.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
      const subjArr = subjects.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
      const comboArr = combos.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.split(':'); return { name: (m[0] || '').trim(), subjects: (m[1] || '').split(',').map(x => x.trim()).filter(Boolean), classes: ['S5', 'S6'] }; }).filter(c => c.name);
      const config = { type, classes: classesArr, subjects: subjArr, combinations: comboArr };
      fetch(WK + '/school-config/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenant(), config }) })
        .then(r => r.json()).then(res => { setBusy(false); if (res.error) { window.peakToast && window.peakToast('Could not save', 'info', res.error); return; } window.SCHOOL_CONFIG = Object.assign({}, config, { vocab: vocabFor(type), loaded: true }); window.peakToast && window.peakToast('School setup saved', 'success', type === 'tertiary' ? 'University structure applied (Year 1–4 · courses · semesters).' : (type === 'secondary' ? 'Secondary structure applied (S1–S6 + combinations).' : 'Primary structure applied.')); }).catch(() => setBusy(false));
    };

    const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 20, marginBottom: 16 };
    const ta = { width: '100%', minHeight: 70, background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: 11, fontSize: 13, color: T.ink, fontFamily: T.mono, outline: 'none' };
    const lbl = { fontSize: 11, color: T.ink2, fontFamily: T.mono, letterSpacing: '0.04em', marginBottom: 6 };

    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, padding: '28px 32px 60px' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>SCHOOL SETUP</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>How your school is structured</div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 6, maxWidth: 620 }}>Tell the OS whether you're a primary school, secondary school, or university/college. This sets the right year/class structure, the words the OS uses (e.g. courses & lecturers for tertiary), and the exam scheme — so you never see a P5 in a college.</div>
        </div>

        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 200, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Nia voice assistant</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 4 }}>Turn this on to talk to Nia by voice. On a computer or Android phone say {'\u201C'}Nia {'\u2026\u201D'} hands-free; on iPhone a mic button appears — tap and speak. Off by default.</div>
          </div>
          <button onClick={toggleVoiceAssistant} style={{ width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', background: voiceOn ? T.green : T.border, position: 'relative', flexShrink: 0 }}><span style={{ position: 'absolute', top: 3, left: voiceOn ? 25 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} /></button>
        </div>
        <div style={{ ...card }}>
          <div style={lbl}>SCHOOL TYPE</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[['nursery', 'Nursery', 'Baby · Middle · Top'], ['nursery-primary', 'Nursery + Primary', 'Baby–Top + P1–P7'], ['primary', 'Primary', 'P1–P7 · PLE'], ['secondary', 'Secondary', 'S1–S6 · UCE + UACE'], ['tertiary', 'University / College', 'Year 1–4 · courses & semesters']].map(o => (
              <button key={o[0]} onClick={() => applyPreset(o[0])} style={{ flex: '1 1 30%', minWidth: 150, textAlign: 'left', padding: '14px 16px', borderRadius: 10, border: '1px solid ' + (type === o[0] ? T.red : T.border), background: type === o[0] ? 'rgba(255,255,255,0.03)' : 'transparent', color: T.ink, cursor: 'pointer' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{o[1]}</div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 3 }}>{o[2]}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...card }}>
          <div style={lbl}>{(type === 'tertiary' ? 'YEAR GROUPS / PROGRAMMES' : 'CLASSES / STREAMS')} <span style={{ color: T.ink4 }}>· comma or new line</span></div>
          <textarea style={ta} value={classes} onChange={e => setClasses(e.target.value)} />
        </div>
        <div style={{ ...card }}>
          <div style={lbl}>{(type === 'tertiary' ? 'COURSES' : (type === 'nursery' ? 'ACTIVITIES' : 'SUBJECTS'))} <span style={{ color: T.ink4 }}>· comma or new line</span></div>
          <textarea style={ta} value={subjects} onChange={e => setSubjects(e.target.value)} />
        </div>
        {type === 'secondary' && (
          <div style={{ ...card }}>
            <div style={lbl}>A-LEVEL COMBINATIONS <span style={{ color: T.ink4 }}>· one per line, e.g. PCM: Physics, Chemistry, Mathematics</span></div>
            <textarea style={{ ...ta, minHeight: 130 }} value={combos} onChange={e => setCombos(e.target.value)} />
          </div>
        )}
        <button onClick={save} disabled={busy} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save school setup'}</button>
        
        <div style={{ ...card, marginTop: 16 }}>
          <div style={lbl}>END OF TERM TRANSITION</div>
          <div style={{ fontSize: 14, color: T.ink3, marginBottom: 12 }}>Close out the current term, gather reports, and prepare for the next term.</div>
          <button onClick={() => setShowTermTransition(true)} style={{ background: 'transparent', color: T.ink, border: '1px solid ' + T.borderStr, padding: '10px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Run Term Transition →</button>
        </div>

        {showTermTransition && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: T.bg, padding: 24, borderRadius: 16, width: 500, maxWidth: '90%', border: '1px solid ' + T.border, color: T.ink }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>End of Term Transition</div>
              <div style={{ fontSize: 13, color: T.ink3, marginBottom: 16 }}>Review the term and configure dates. If Term 3 is selected, students with passing grades will be automatically promoted.</div>
              
              <label style={{ display: 'block', marginBottom: 12 }}><div style={lbl}>CURRENT TERM</div>
                <select style={{...ta, minHeight: 40}} value={targetTerm} onChange={e => setTargetTerm(e.target.value)}>
                  <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <label><div style={lbl}>TERM END DATE (Reports visible)</div>
                  <input type="date" style={{...ta, minHeight: 40}} value={termEndDate} onChange={e => setTermEndDate(e.target.value)} />
                </label>
                <label><div style={lbl}>NEXT TERM START DATE</div>
                  <input type="date" style={{...ta, minHeight: 40}} value={nextTermStartDate} onChange={e => setNextTermStartDate(e.target.value)} />
                </label>
              </div>

              <label style={{ display: 'block', marginBottom: 12 }}><div style={lbl}>HOW DID THE TERM MOVE?</div>
                <textarea style={ta} value={termReview} onChange={e => setTermReview(e.target.value)} placeholder="Brief on term progress..." />
              </label>
              
              <label style={{ display: 'block', marginBottom: 16 }}><div style={lbl}>CHALLENGES FACED</div>
                <textarea style={ta} value={termChallenges} onChange={e => setTermChallenges(e.target.value)} placeholder="Any operational challenges..." />
              </label>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowTermTransition(false)} style={{ background: 'transparent', border: 'none', color: T.ink3, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button onClick={submitTransition} disabled={transitioning} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontWeight: 600, cursor: 'pointer' }}>{transitioning ? 'Processing...' : 'Execute Transition'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

export { Setup, detectLevel, vocabFor, PRESETS };
