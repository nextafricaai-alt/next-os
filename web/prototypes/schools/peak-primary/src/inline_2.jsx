/* PEAK_ASKNEXT — real conversational Nia inside the school OS */
window.PEAK_ASKNEXT = (function () {
  const { useState, useEffect, useRef } = React;
  const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  function tenant() { const p = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile) ? window.PEAK_ROLE.getProfile() : null; return (p && p.tenantId) || 'peak-primary'; }
  function whoami() { const p = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile) ? window.PEAK_ROLE.getProfile() : null; return (p && (p.fullName || p.role)) || 'Head Teacher'; }
  function memKey() { return 'nextos.asknext.' + tenant(); }
  let LIVE_STAFF = [], LIVE_HEALTH = [], LIVE_LOADED = false;
  let ASSIGNABLE = [];   // [{name,email,subjects:[],classes:[],checkedIn:bool,openTasks:n}]
  function refreshLive() {
    const t = tenant();
    fetch(WK + '/staff-status?tenant=' + encodeURIComponent(t)).then(r => r.json()).then(d => { if (d && Array.isArray(d.staff)) { LIVE_STAFF = d.staff; LIVE_LOADED = true; } }).catch(() => {});
    fetch(WK + '/student-health?tenant=' + encodeURIComponent(t)).then(r => r.json()).then(d => { if (d && Array.isArray(d.health)) { LIVE_HEALTH = d.health; LIVE_LOADED = true; } }).catch(() => {});
    // Real assignable teachers + their classes + current open-task load
    Promise.all([
      fetch(WK + '/teachers?tenant=' + encodeURIComponent(t)).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(WK + '/os-data?kind=staff_meta&tenant=' + encodeURIComponent(t)).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(WK + '/os-data?kind=staff_task&tenant=' + encodeURIComponent(t)).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(function (res) {
      const td = res[0], md = res[1], kd = res[2];
      const metaByEmail = {}; ((md && md.records) || []).forEach(function (r) { const p = r.payload || {}; if (p.email) metaByEmail[String(p.email).toLowerCase()] = p.classes || []; });
      const loadByEmail = {}; ((kd && kd.records) || []).forEach(function (r) { const p = r.payload || {}; const done = p.done || {}; (p.emails || []).forEach(function (e) { e = String(e).toLowerCase(); if (!done[e]) loadByEmail[e] = (loadByEmail[e] || 0) + 1; }); });
      const checkedSet = {}; (LIVE_STAFF || []).forEach(function (x) { if (/in|late|present/i.test(x.status || '')) checkedSet[String(x.name || '').toLowerCase()] = true; });
      ASSIGNABLE = ((td && td.teachers) || []).filter(function (x) { return x.email; }).map(function (x) {
        const em = String(x.email).toLowerCase();
        return { name: x.full_name || x.email, email: em, subjects: x.subjects || [], classes: metaByEmail[em] || [], openTasks: loadByEmail[em] || 0, checkedIn: !!checkedSet[String(x.full_name || '').toLowerCase()] };
      });
    }).catch(() => {});
  }
  async function niaToken() { try { const sb = window.NextSession && window.NextSession.sb; if (!sb) return ''; const r = await sb.auth.getSession(); return (r && r.data && r.data.session && r.data.session.access_token) || ''; } catch (e) { return ''; } }
  // Execute approved task assignments: create real staff_task + push to phones.
  async function executeAssignments(tasks) {
    const t = tenant(); const token = await niaToken(); const done = [];
    for (const tk of (tasks || [])) {
      const emails = (tk.emails || []).map(e => String(e).toLowerCase()).filter(Boolean);
      if (!tk.title || !emails.length) continue;
      const rec = { title: String(tk.title).trim(), details: String(tk.details || '').trim(), due: String(tk.due || '').trim(), emails: emails, audienceLabel: tk.why ? ('Nia · ' + tk.why) : 'Assigned by Nia', done: {}, createdAt: new Date().toISOString() };
      try {
        await fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'staff_task', tenant: t, record: rec }) });
        try { if (window.NX_PUSH) await window.NX_PUSH.notify({ tenant: t, emails: emails, title: 'New task from the head', body: rec.title + (rec.due ? (' · due ' + rec.due) : ''), url: window.location.pathname, tag: 'nia-task-' + Date.now() }, token); } catch (e) {}
        done.push({ title: rec.title, emails: emails });
      } catch (e) {}
    }
    return done;
  }

  function logQuestion(q) { try { const a = JSON.parse(localStorage.getItem(memKey()) || '[]'); a.unshift({ q: q, t: Date.now() }); localStorage.setItem(memKey(), JSON.stringify(a.slice(0, 200))); } catch (e) {} }
  function frequentTopics() {
    try {
      const a = JSON.parse(localStorage.getItem(memKey()) || '[]'); const words = {};
      const stop = new Set(['the','a','of','to','is','in','and','for','me','my','show','what','how','who','can','you','please','give','about','this','that','do','does','are','was','were','with','any','all','our','need','want','tell','list','have','has','many','much','from','their','they','them','will','should','could']);
      a.forEach(x => (x.q || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).forEach(w => { if (w.length > 3 && !stop.has(w)) words[w] = (words[w] || 0) + 1; }));
      return Object.keys(words).sort((p, q) => words[q] - words[p]).slice(0, 6);
    } catch (e) { return []; }
  }
  function recentQuestions() { try { const a = JSON.parse(localStorage.getItem(memKey()) || '[]'); const seen = {}, out = []; a.forEach(x => { if (x.q && !seen[x.q]) { seen[x.q] = 1; out.push(x.q); } }); return out.slice(0, 4); } catch (e) { return []; } }

  function buildContext() {
    const D = window.PEAK || {}; const k = D.kpis || {}; const studs = D.students || []; const teach = D.teachers || [];
    const fmt = n => 'UGX ' + (Number(n) || 0).toLocaleString();
    const flagLabel = f => f === 'risk' ? 'AT-RISK (needs follow-up)' : (f === 'top' ? 'top performer' : 'ok');
    const lines = [];
    lines.push('SCHOOL: ' + ((window.__BRAND_NAME) || 'School') + ' · tenant ' + tenant());
    lines.push('OVERVIEW: students ' + (k.students || studs.length) + ', teachers ' + (k.teachers || teach.length) + ', streams ' + (k.streams || '?') + ', attendance today ' + (k.attendancePct || '?') + '% (present ' + (k.presentToday || '?') + ', absent ' + (k.absentToday || '?') + '), fees collected ' + fmt(k.feesCollectedTerm) + ' of ' + fmt(k.feesTargetTerm) + ', accounts overdue ' + (k.feesOutstandingStudents != null ? k.feesOutstandingStudents : '?') + ', enrollment inquiries ' + (k.enrollmentInquiries || 0));
    lines.push('');
    lines.push('STUDENTS (' + studs.length + ') — name | stream | guardian | phone | fees | attendance | standing:');
    studs.slice(0, 150).forEach(s => {
      const att = (s.attendanceWk != null ? (s.attendanceWk + '% this wk') : '') + (s.lastSeen ? (', last seen ' + s.lastSeen) : '');
      lines.push('• ' + s.name + ' | ' + (s.stream || '?') + ' | guardian ' + (s.guardian || '—') + ' | ' + (s.guardianPhone || 'no phone on file') + ' | fees ' + (s.fees || '?') + (s.balance ? (' (owes ' + fmt(s.balance) + ')') : '') + ' | ' + att + ' | ' + flagLabel(s.flag));
    });
    lines.push('');
    lines.push('STAFF (' + teach.length + ') — name | role | subjects | streams | phone | since | standing:');
    teach.slice(0, 80).forEach(t => {
      lines.push('• ' + t.name + ' | ' + (t.role || 'Teacher') + ' | ' + ((t.subjects || []).join('/') || '—') + ' | ' + ((t.streams || []).join(',') || '—') + ' | ' + (t.phone || 'no phone') + ' | since ' + (t.joined || '?') + ' | ' + (t.tone === 'top' ? 'strong performer' : (t.tone === 'risk' ? 'needs support' : 'ok')));
    });
    if (LIVE_STAFF.length) { lines.push(''); lines.push("STAFF TODAY — live check-ins (who is in, late, or absent right now):"); LIVE_STAFF.slice(0, 80).forEach(t => lines.push('• ' + t.name + ' — ' + t.status)); }
    else { lines.push(''); lines.push("STAFF TODAY: the live check-in feed is NOT loaded. You do NOT know whether any teacher has checked in today. Do NOT claim any teacher is present, checked in, late, or absent — say the check-in data isn't available yet."); }
    if (LIVE_HEALTH.length) { lines.push(''); lines.push('HEALTH WATCH — students with an active (unresolved) health record = currently unwell / sick / needing follow-up:'); LIVE_HEALTH.slice(0, 60).forEach(h => lines.push('• ' + h.name + ' (' + (h.stream || '?') + ') — ' + (h.category || 'health note') + (h.severity ? (' · ' + h.severity) : '') + (h.description ? (': ' + h.description) : '') + (h.follow_up ? ' · follow-up needed' : ''))); }
    else if (LIVE_LOADED) { lines.push(''); lines.push('HEALTH WATCH: no active health records logged right now.'); }
    if (ASSIGNABLE.length) {
      lines.push('');
      lines.push('ASSIGNABLE TEACHERS (real logins — use ONLY these emails when assigning tasks) — name | email | teaches subjects | classes | checked-in today | open tasks now:');
      ASSIGNABLE.forEach(a => lines.push('• ' + a.name + ' | ' + a.email + ' | ' + ((a.subjects || []).join('/') || 'no subjects set') + ' | ' + ((a.classes || []).join(',') || 'no classes set') + ' | ' + (a.checkedIn ? 'CHECKED IN' : 'not checked in') + ' | ' + a.openTasks + ' open'));
    } else {
      lines.push('');
      lines.push('ASSIGNABLE TEACHERS: not loaded yet — if asked to assign a task, say the staff list is still loading and to try again in a moment.');
    }
    return lines.join('\n');
  }
  function systemPrompt() {
    const topics = frequentTopics();
    const mem = topics.length ? ('\n\nHEAD TEACHER MEMORY: this head teacher frequently asks about: ' + topics.join(', ') + '. Anticipate those needs.') : '';
    return 'You are Nia, the intelligence inside ' + ((window.__BRAND_NAME) || 'this school') + "'s NEXT School OS, talking to " + whoami() + '. You KNOW every student and staff member personally from the live data below — their stream, guardian, phone, fees, attendance and standing. You understand how the whole OS works.\n\n'
      + 'HOW YOU ANSWER:\n'
      + '- Answer DIRECTLY from the data. If asked who is at-risk / away / absent / needs follow-up, LIST the specific students by name with the reason (status AT-RISK, low attendance, or not recently seen). If asked about fees, name who owes and how much. If asked who is SICK / unwell, list the students in HEALTH WATCH with their condition. If asked which teachers are late or absent, use STAFF TODAY (live check-ins).\n'
      + '- If asked about ONE person, give their full profile: a student\u2019s stream, guardian, phone, fees/balance, attendance and standing; a staff member\u2019s role, subjects, streams, phone, years of service and standing.\n'
      + '- Do NOT navigate or say \"go to the X page\" for a who/what/which/how question \u2014 just answer it with real names and numbers. Never invent a fact; if a detail genuinely is not in the data (e.g. a specific logged illness), say what you DO have (attendance/standing) and offer to open that person\u2019s profile.\n'
      + '- REAL-TIME TRUTH: only state check-in, attendance, health or presence facts that appear EXPLICITLY in STAFF TODAY, HEALTH WATCH, or the data below. If a section says it is not loaded or is missing, say you do not have that live data yet — NEVER guess that teachers checked in or students are present.\n'
      + '- BE CONCISE: lead with the direct answer in 1-3 sentences. Do not volunteer extra profiles, lists, or suggestions unless asked.\n'
      + '- Be warm, decisive. Ugandan school context (UGX, WhatsApp, streams like P4V).\n\n'
      + 'ACTIONS \u2014 only when the user asks you to DO something (open a page, message a parent, set a reminder), include ONE fenced code block labelled action with JSON and one short sentence:\n'
      + '{"action":"navigate","screen":"today|dash|stud|attn|fees|exam|rep|comm|teach|trans"}\n'
      + '{"action":"whatsapp","name":"<student or guardian>","message":"..."}\n'
      + '{"action":"reminder","text":"...","when":"tomorrow 8am"}\n'
      + '{"action":"propose_tasks","tasks":[{"title":"...","details":"...","due":"...","emails":["teacher@email"],"why":"short reason this teacher"}]}\n'
      + '\nASSIGNING WORK (important): when the head asks you to assign, give out, delegate, or distribute a task (or several), DO NOT just describe it — emit a propose_tasks action. CHOOSE the assignee yourself from ASSIGNABLE TEACHERS using, in order: (1) subject match, (2) class they teach, (3) who is CHECKED IN today, (4) the one with the FEWEST open tasks (fair load). To split several tasks across a group, output multiple task objects, balancing the load. Use ONLY real emails from ASSIGNABLE TEACHERS. In your text, briefly say who you picked and why. The head will see an Approve button — nothing is sent until they approve. Never invent an email.\n'
      + 'For report cards, navigate to "exam" (reports are issued there, fee-gated).'
      + (window.__TERM && (window.__TERM.start || window.__TERM.end) ? ('\n\nTERM DATES: this term runs ' + (window.__TERM.start || '?') + ' to ' + (window.__TERM.end || '?') + '. Know when the term begins and ends; flag if today is near either.') : '')
      + ((window.__SCHOOL_EVENTS && window.__SCHOOL_EVENTS.length) ? ('\n\nSCHOOL EVENTS (with coordinators):\n' + window.__SCHOOL_EVENTS.map(function (e) { return '- ' + e.date + ': ' + e.title + (e.coordinator ? (' (coordinated by ' + e.coordinator + ')') : '') + (e.type ? ' [' + e.type + ']' : ''); }).join('\n')) : '')
      + mem + (window.__SCHOOL_PROFILE ? ('\n\nABOUT THIS SCHOOL (written by the head teacher \u2014 use it to understand the school\u2019s identity, values, priorities and the head\u2019s context; weave it in naturally, never recite it back):\n' + window.__SCHOOL_PROFILE) : '') + (function(){ try{ var fsx=window.__FEE_STRUCTURE; if(fsx && fsx.classes && fsx.classes.length){ return '\n\nFEE STRUCTURE (per term, set by the head \u2014 use for fee questions, reminders and planning):\n' + fsx.classes.map(function(c){ return '- ' + c.name + ': UGX ' + (Number(c.fee)||0).toLocaleString() + (c.requirements?(' \u00b7 requirements: '+c.requirements):''); }).join('\n'); } }catch(e){} return ''; })() + '\n\nLIVE SCHOOL DATA:\n' + buildContext();
  }
  function runAction(a) {
    try {
      if (a.action === 'navigate' && a.screen) { window.peakNav && window.peakNav(a.screen); window.peakModal && window.peakModal.close(); return 'Opened ' + a.screen + '.'; }
      if (a.action === 'whatsapp') {
        const studs = (window.PEAK && window.PEAK.students) || [];
        const target = (a.name || '').toLowerCase();
        const s = studs.find(x => (x.name || '').toLowerCase().includes(target) || (x.guardian || '').toLowerCase().includes(target));
        const phone = s && (s.guardianPhone || '').replace(/[^0-9]/g, '');
        const msg = a.message || '';
        if (phone) { window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank'); return 'Opened WhatsApp to ' + (s.guardian || s.name) + '.'; }
        try { navigator.clipboard.writeText(msg); } catch (e) {}
        return 'Drafted (no phone on file) — copied to clipboard.';
      }
      if (a.action === 'reminder' && a.text) {
        const key = 'nextos.reminders.' + tenant();
        let arr = []; try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
        arr.unshift({ text: a.text, when: a.when || '', at: Date.now() }); try { localStorage.setItem(key, JSON.stringify(arr.slice(0, 100))); } catch (e) {}
        return 'Noted: ' + a.text + (a.when ? (' (' + a.when + ')') : '') + '.';
      }
    } catch (e) {}
    return null;
  }

  function ProposalCard({ tasks }) {
    const [state, setState] = useState('pending');
    const [result, setResult] = useState([]);
    const approve = async () => { setState('sending'); try { const done = await executeAssignments(tasks); setResult(done); setState('sent'); window.__peakPendingApprove = null; window.__peakPendingCancel = null; window.peakToast && window.peakToast('Nia assigned ' + done.length + ' task' + (done.length === 1 ? '' : 's'), 'success', 'Teachers notified'); if (window.__PEAK_NIA_VOICE && window.__peakSpeak) window.__peakSpeak('Done. Assigned ' + done.length + ' task' + (done.length === 1 ? '' : 's') + ' and notified the teachers.'); } catch (e) { setState('pending'); window.peakToast && window.peakToast('Could not assign', 'info', String(e.message || e)); } };
    React.useEffect(() => {
      if (state !== 'pending') return;
      window.__peakPendingApprove = approve;
      window.__peakPendingCancel = () => { setState('cancelled'); window.__peakPendingApprove = null; window.__peakPendingCancel = null; if (window.__peakSpeak) window.__peakSpeak('Cancelled. Nothing was sent.'); };
      if (window.__PEAK_NIA_VOICE && window.__peakSpeak) {
        const who = Array.from(new Set([].concat.apply([], tasks.map(t => t.emails || [])))).length;
        window.__peakSpeak('I have prepared ' + tasks.length + ' task' + (tasks.length === 1 ? '' : 's') + ' for ' + who + ' teacher' + (who === 1 ? '' : 's') + '. Say "Nia approve" to send, or "Nia cancel".');
      }
      return () => { if (window.__peakPendingApprove === approve) { window.__peakPendingApprove = null; window.__peakPendingCancel = null; } };
    }, [state]);
    if (state === 'cancelled') return <div style={{ fontSize: 12, color: T.ink3, fontStyle: 'italic' }}>Assignment cancelled — nothing was sent.</div>;
    if (state === 'sent') return (
      <div style={{ border: '1px solid ' + T.good, borderRadius: 12, padding: '11px 13px', background: 'rgba(34,197,94,0.08)', fontSize: 12.5, color: T.ink }}>
        ✓ Assigned {result.length} task{result.length === 1 ? '' : 's'} and pushed to {Array.from(new Set([].concat.apply([], result.map(r => r.emails)))).length} teacher{(Array.from(new Set([].concat.apply([], result.map(r => r.emails)))).length) === 1 ? '' : 's'}.
      </div>
    );
    return (
      <div style={{ border: '1px solid ' + T.border, borderRadius: 12, padding: 12, background: T.surface }}>
        <div style={{ fontSize: 10.5, fontFamily: T.mono, color: T.ink3, letterSpacing: '0.06em', marginBottom: 8 }}>NIA PROPOSES — APPROVE TO SEND</div>
        {tasks.map((t, i) => (
          <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < tasks.length - 1 ? '1px solid ' + T.border : 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{t.title}</div>
            {t.details ? <div style={{ fontSize: 12, color: T.ink2, marginTop: 2 }}>{t.details}</div> : null}
            <div style={{ fontSize: 11.5, color: T.ink2, fontFamily: T.mono, marginTop: 3 }}>→ {(t.emails || []).join(', ')}{t.due ? (' · due ' + t.due) : ''}</div>
            {t.why ? <div style={{ fontSize: 11, color: T.ink3, fontStyle: 'italic', marginTop: 2 }}>{t.why}</div> : null}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={approve} disabled={state === 'sending'} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: state === 'sending' ? 'wait' : 'pointer' }}>{state === 'sending' ? 'Sending…' : 'Approve & notify'}</button>
          <button onClick={() => setState('cancelled')} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  function AskNextChat({ prefill }) {
    const [msgs, setMsgs] = useState([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const histRef = useRef([]);
    const scrollRef = useRef(null);
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, busy]);

    const send = (text) => {
      const q = (text != null ? text : input).trim(); if (!q || busy) return;
      logQuestion(q);
      const newMsgs = msgs.concat([{ role: 'user', content: q }]); setMsgs(newMsgs); setInput(''); setBusy(true);
      histRef.current = histRef.current.concat([{ role: 'user', content: q }]);
      fetch(WK + '/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: systemPrompt(), messages: histRef.current }) })
        .then(r => r.json()).then(data => {
          let txt = '';
          if (data && data.content && data.content.length) txt = data.content.filter(c => c.type === 'text').map(c => c.text).join('');
          else if (data && data.error) txt = 'Error: ' + data.error;
          else txt = typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200);
          let actMsg = ''; let proposal = null;
          const m = txt.match(/```(?:action|json)?\s*([\s\S]*?)```/i);
          if (m) { try { const a = JSON.parse(m[1].trim()); if (a && a.action === 'propose_tasks' && Array.isArray(a.tasks) && a.tasks.length) { proposal = a.tasks; } else if (a && a.action) { const r = runAction(a); if (r) actMsg = '\n\n✓ ' + r; } } catch (e) {} }
          const disp = txt.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim() + actMsg;
          histRef.current = histRef.current.concat([{ role: 'assistant', content: txt }]);
          setMsgs(m2 => m2.concat([{ role: 'nia', content: disp || (proposal ? '' : '(no reply)'), proposal: proposal }])); setBusy(false);
          if (window.__PEAK_NIA_VOICE && disp && window.__peakSpeak) window.__peakSpeak(disp);
        }).catch(e => { setMsgs(m2 => m2.concat([{ role: 'nia', content: 'Could not reach Nia: ' + (e.message || e) }])); setBusy(false); });
    };
    useEffect(() => { if (prefill) send(prefill); /* eslint-disable-next-line */ }, []);

    const chips = (recentQuestions().length ? recentQuestions() : ['How are fees looking this term?', 'Who are the at-risk students?', "What's today's attendance?", 'Draft a WhatsApp to overdue parents']);

    return (
      <div style={{ width: '100%', height: '74vh', maxHeight: 680, display: 'flex', flexDirection: 'column', background: T.bg }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: T.red, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, fontWeight: 700 }}>AI</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Ask NEXT · Nia</div>
            <div style={{ fontSize: 11, color: T.ink3 }}>Sees your live school · runs the OS · learns what you ask</div>
          </div>
          <button onClick={() => window.peakModal.close()} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink3, borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>Close</button>
        </div>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.length === 0 && (
            <div style={{ color: T.ink3, fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, color: T.ink2, marginBottom: 8 }}>Hello {whoami().split(' ')[0]} — ask me anything about your school.</div>
              I can read your students, attendance, fees and exams, draft parent messages, open any screen, and note reminders. Try one of these:
            </div>
          )}
          {msgs.map((m, i) => (
            <React.Fragment key={i}>
              {m.content ? <div style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', background: m.role === 'user' ? T.red : T.surface, color: m.role === 'user' ? '#fff' : T.ink, border: m.role === 'user' ? 'none' : '1px solid ' + T.border, borderRadius: 12, padding: '10px 13px', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.content}</div> : null}
              {m.proposal ? <div style={{ alignSelf: 'flex-start', maxWidth: '92%' }}><ProposalCard tasks={m.proposal} /></div> : null}
            </React.Fragment>
          ))}
          {busy && <div style={{ alignSelf: 'flex-start', color: T.ink3, fontSize: 12.5, fontStyle: 'italic' }}>Nia is thinking…</div>}
        </div>
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {chips.map((c, i) => <button key={i} onClick={() => send(c)} style={{ fontSize: 11, background: T.surface, border: '1px solid ' + T.border, color: T.ink2, borderRadius: 999, padding: '5px 10px', cursor: 'pointer' }}>{c.length > 42 ? c.slice(0, 40) + '…' : c}</button>)}
        </div>
        <div style={{ padding: 14, borderTop: '1px solid ' + T.border, display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Ask Nia, or tell her to do something…" style={{ flex: 1, background: T.surface, border: '1px solid ' + T.border, borderRadius: 10, padding: '11px 13px', color: T.ink, fontSize: 13, outline: 'none', fontFamily: T.font }} />
          <button onClick={() => send()} disabled={busy} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 10, padding: '0 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Send</button>
        </div>
      </div>
    );
  }

  function open(prefill) { try { refreshLive(); } catch (e) {} window.peakModal && window.peakModal.open(React.createElement(AskNextChat, { prefill: prefill || '', width: 600 })); }

  // Spoken replies for the school's Nia
  window.__peakSpeak = function (text) {
    try {
      if (!window.speechSynthesis || !text) return;
      const clean = String(text).replace(/```[\s\S]*?```/g, ' ').replace(/[*_#>`~]/g, '').replace(/\s+/g, ' ').trim();
      if (!clean) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean.slice(0, 600)); u.rate = 1.03; u.lang = 'en-US';
      const vs = window.speechSynthesis.getVoices() || []; const pick = vs.find(v => /female|samantha|aria|jenny|zira|google uk english female/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang)); if (pick) u.voice = pick;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  };

  // Global "Hey Nia" orb for the school OS.
  // Wake-word (Chrome/Android) where available; tap-to-talk (server STT) on iOS.
  function PeakNiaOrb() {
    const SR = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasMedia = (typeof navigator !== 'undefined') && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (typeof MediaRecorder !== 'undefined');
    const WKB = 'https://nextos-sentinel.nextafricaai.workers.dev';
    const [on, setOn] = React.useState(() => { try { return localStorage.getItem('peak.nia.voice') === '1'; } catch (e) { return false; } });
    const [heard, setHeard] = React.useState('');
    const [pulse, setPulse] = React.useState(false);
    const [rec, setRec] = React.useState('idle'); // idle | recording | thinking
    React.useEffect(() => { const h = (e) => setOn(!!(e && e.detail)); window.addEventListener('peakVoiceToggle', h); return () => window.removeEventListener('peakVoiceToggle', h); }, []);
    const recRef = React.useRef(null);
    const chunksRef = React.useRef([]);
    const stopTimer = React.useRef(null);
    const chime = () => { try { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const c = new A(); const now = c.currentTime; [[880, 0], [1175, 0.12]].forEach(function (p) { const o2 = c.createOscillator(), g = c.createGain(); o2.type = 'sine'; o2.frequency.value = p[0]; g.gain.setValueAtTime(0.0001, now + p[1]); g.gain.exponentialRampToValueAtTime(0.12, now + p[1] + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + p[1] + 0.16); o2.connect(g); g.connect(c.destination); o2.start(now + p[1]); o2.stop(now + p[1] + 0.18); }); setTimeout(function () { try { c.close(); } catch (e) {} }, 600); } catch (e) {} };
    const handle = (cmd) => {
      if (!cmd || cmd.trim().length < 2) { window.__peakSpeak && window.__peakSpeak("Sorry, I didn't catch that."); return; }
      const t = cmd.trim(); const low = t.toLowerCase();
      if (window.__peakPendingApprove && /\b(approve|confirm|send it|send|yes|do it|go ahead|okay|ok)\b/.test(low)) { try { window.__peakPendingApprove(); } catch (e) {} return; }
      if (window.__peakPendingCancel && /\b(cancel|no|stop|never mind)\b/.test(low)) { try { window.__peakPendingCancel(); } catch (e) {} return; }
      window.__PEAK_NIA_VOICE = true;
      // strip a leading "nia" if present
      const stripped = t.replace(/^(hey |ok )?(nia|nya|nina)[\s,.:!?-]*/i, '').trim() || t;
      try { open(stripped); } catch (e) {}
    };

    // ---- Wake-word mode (desktop Chrome / Android) ----
    React.useEffect(() => {
      try { localStorage.setItem('peak.nia.voice', on ? '1' : '0'); } catch (e) {}
      if (!on || !SR) return;
      window.__PEAK_NIA_VOICE = true;
      let r, stopped = false, rt = null;
      const start = () => {
        try { r = new SR(); } catch (e) { return; }
        r.lang = 'en-US'; r.continuous = true; r.interimResults = false; r.maxAlternatives = 1;
        r.onresult = (e) => {
          if (window.speechSynthesis && window.speechSynthesis.speaking) return;
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (!e.results[i].isFinal) continue;
            const tt = (e.results[i][0].transcript || '').trim(); const low = tt.toLowerCase();
            const m = low.match(/\b(hey nia|ok nia|nia|nya|nina|near|neah)\b/); if (!m) continue;
            setHeard(tt); setTimeout(() => setHeard(''), 4000); chime(); setPulse(true); setTimeout(() => setPulse(false), 900);
            handle(tt.slice(low.indexOf(m[1]) + m[1].length));
          }
        };
        r.onerror = (ev) => { if (ev && ev.error === 'not-allowed') setOn(false); };
        r.onend = () => { if (!stopped && !rt) { rt = setTimeout(() => { rt = null; try { r.start(); } catch (e) {} }, 350); } };
        try { r.start(); } catch (e) {}
      };
      start();
      return () => { stopped = true; if (rt) clearTimeout(rt); try { r && r.stop(); } catch (e) {} };
    }, [on]);

    // ---- Tap-to-talk (iOS / no SpeechRecognition) ----
    const stopRec = () => { try { recRef.current && recRef.current.state !== 'inactive' && recRef.current.stop(); } catch (e) {} };
    const startPtt = async () => {
      if (!hasMedia) { window.__peakSpeak && window.__peakSpeak('Voice needs microphone access.'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream); recRef.current = mr; chunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
        mr.onstop = async () => {
          try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
          setRec('thinking');
          try {
            const blob = new Blob(chunksRef.current, { type: (chunksRef.current[0] && chunksRef.current[0].type) || 'audio/webm' });
            const buf = await blob.arrayBuffer();
            const resp = await fetch(WKB + '/stt', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: buf });
            const d = await resp.json();
            setRec('idle');
            if (d && d.text) { setHeard(d.text); setTimeout(() => setHeard(''), 5000); chime(); handle(d.text); }
            else { window.__peakSpeak && window.__peakSpeak("Sorry, I didn't catch that."); }
          } catch (e) { setRec('idle'); window.__peakSpeak && window.__peakSpeak('Could not transcribe.'); }
        };
        mr.start(); setRec('recording'); chime();
        stopTimer.current = setTimeout(stopRec, 7000); // auto-stop after 7s
      } catch (e) { setRec('idle'); window.__peakSpeak && window.__peakSpeak('Microphone permission needed.'); }
    };
    const tap = () => {
      if (SR) { return; }
      if (rec === 'recording') { if (stopTimer.current) clearTimeout(stopTimer.current); stopRec(); }
      else if (rec === 'idle') { startPtt(); }
    };

    if (!on) return null;
    const T2 = window.V4 && window.V4.T ? window.V4.T : { surface: '#0f1838', border: '#212d56', ink2: '#aab2d5', ink3: '#7e88b8', green: '#00c389', bg: '#0a1029' };
    const active = SR ? true : (rec !== 'idle');
    const glyph = (!SR && rec === 'thinking') ? '⋯' : (active ? '\u{1F3A4}' : '◆');
    const hint = SR ? (on ? 'say “Nia …”' : '') : (rec === 'recording' ? 'tap to send' : rec === 'thinking' ? 'thinking…' : 'tap & talk');
    return (
      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 4000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <style>{'@keyframes peakNiaPulse{0%{transform:scale(1)}30%{transform:scale(1.18)}100%{transform:scale(1)}}'}</style>
        {heard ? <div style={{ background: T2.surface, border: '1px solid ' + T2.border, borderRadius: 12, padding: '7px 11px', fontSize: 12, color: T2.ink2, maxWidth: 240, boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}>{'“'}{heard}{'”'}</div> : null}
        {hint ? <div style={{ fontSize: 10.5, color: T2.ink3, fontFamily: 'ui-monospace, monospace', background: T2.surface, border: '1px solid ' + T2.border, borderRadius: 999, padding: '3px 9px' }}>{hint}</div> : null}
        <button onClick={tap} title={SR ? (on ? 'Hands-free on' : 'Let Nia listen') : 'Tap and talk to Nia'} style={{ width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer', background: active ? '#e23a52' : T2.green, color: '#fff', fontSize: 21, boxShadow: active ? '0 0 0 6px rgba(226,58,82,0.22), 0 10px 28px rgba(0,0,0,0.45)' : '0 10px 28px rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', animation: pulse ? 'peakNiaPulse 0.6s ease' : 'none' }}>{glyph}</button>
      </div>
    );
  }
  window.PeakNiaOrb = PeakNiaOrb;

  try { document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); } }); } catch (e) {}
  return { open };
})();
