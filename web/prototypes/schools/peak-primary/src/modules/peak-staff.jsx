import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } from 'react';

const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  function prof() { return (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || { tenantId: 'peak-primary' }; }
  function tenant() { return window.getOSActiveTenant(); }
  async function headToken() { try { const sb = window.NextSession && window.NextSession.sb; if (!sb) return ''; const { data } = await sb.auth.getSession(); return (data && data.session && data.session.access_token) || ''; } catch (e) { return ''; } }
  const classesNow = () => ((window.SCHOOL_CONFIG && window.SCHOOL_CONFIG.classes) || []);
  const vocab = () => ((window.SCHOOL_CONFIG && window.SCHOOL_CONFIG.vocab) || { staff: 'Teacher', sub: 'Subject', unit: 'Class' });

  const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 };
  const inp = { width: '100%', background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: '10px 12px', fontSize: 13, color: T.ink, fontFamily: T.font, outline: 'none' };
  const lbl = { fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.04em', marginBottom: 6 };
  const btnP = { background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
  const btnG = { background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '9px 14px', fontSize: 12.5, cursor: 'pointer' };

  function osGet(kind) { return fetch(WK + '/os-data?kind=' + kind + '&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => (d && d.records) || []).catch(() => []); }
  function osSave(kind, record, id) { return fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { kind, tenant: tenant(), record, id } : { kind, tenant: tenant(), record }) }).then(r => r.json()).catch(e => ({ error: String(e && e.message || e) })); }

  function Staff() {
    const [tab, setTab] = useState('roster');
    const [teachers, setTeachers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [meta, setMeta] = useState({});      // email -> {classes:[]}
    const [tasks, setTasks] = useState([]);
    const [pay, setPay] = useState({});        // key(email) -> {_id, monthly, allowance}
    const [status, setStatus] = useState({});  // lower(name) -> status string
    const [loading, setLoading] = useState(true);

    const loadTeachers = useCallback(() => fetch(WK + '/teachers?tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => setTeachers((d && d.teachers) || [])).catch(() => {}), []);
    const loadGroups = useCallback(() => osGet('staff_group').then(rs => setGroups(rs.map(x => Object.assign({ _id: x.id }, x.payload)))), []);
    const loadMeta = useCallback(() => osGet('staff_meta').then(rs => { const m = {}; rs.forEach(x => { const p = x.payload || {}; if (p.email) m[p.email.toLowerCase()] = { _id: x.id, classes: p.classes || [] }; }); setMeta(m); }), []);
    const loadTasks = useCallback(() => osGet('staff_task').then(rs => setTasks(rs.map(x => Object.assign({ _id: x.id }, x.payload)).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))))), []);
    const loadPay = useCallback(() => osGet('staff_pay').then(rs => { const m = {}; rs.forEach(x => { const p = x.payload || {}; if (p.key) m[p.key.toLowerCase()] = Object.assign({ _id: x.id }, p); }); setPay(m); }), []);
    const loadStatus = useCallback(() => fetch(WK + '/staff-status?tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => { const m = {}; ((d && d.staff) || []).forEach(s => { m[(s.name || '').toLowerCase()] = s.status || ''; }); setStatus(m); }).catch(() => {}), []);
    useEffect(() => { Promise.all([loadTeachers(), loadGroups(), loadMeta(), loadTasks(), loadPay(), loadStatus()]).then(() => setLoading(false)); }, [loadTeachers, loadGroups, loadMeta, loadTasks, loadPay, loadStatus]);

    const tabBtn = (k, label) => <button onClick={() => setTab(k)} style={{ background: tab === k ? T.surface : 'transparent', color: tab === k ? T.ink : T.ink3, border: '1px solid ' + (tab === k ? T.border : 'transparent'), borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: tab === k ? 700 : 500, cursor: 'pointer' }}>{label}</button>;

    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, padding: '26px 30px 60px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>STAFF</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{vocab().staff}s &amp; tasks</div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 6, maxWidth: 640 }}>Give each {vocab().staff.toLowerCase()} their own login, organise them into groups, and assign tasks — to one person, a group, or everyone.</div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {tabBtn('roster', 'Roster (' + teachers.length + ')')}
          {tabBtn('groups', 'Groups (' + groups.length + ')')}
          {tabBtn('tasks', 'Tasks (' + tasks.length + ')')}
        </div>
        {loading ? <div style={{ color: T.ink3 }}>Loading staff…</div> : (
          <div>
            {tab === 'roster' && <Roster teachers={teachers} meta={meta} tasks={tasks} pay={pay} status={status} reload={() => { loadTeachers(); loadMeta(); loadPay(); loadStatus(); }} />}
            {tab === 'groups' && <Groups teachers={teachers} groups={groups} reload={loadGroups} />}
            {tab === 'tasks' && <Tasks teachers={teachers} groups={groups} meta={meta} tasks={tasks} reload={loadTasks} />}
          </div>
        )}
      </div>
    );
  }

  /* ---- Roster ---- */
  function Roster({ teachers, meta, tasks, pay, status, reload }) {
    const [adding, setAdding] = useState(false);
    const [importing, setImporting] = useState(false);
    const [profile, setProfile] = useState(null);
    const resetLogin = async (t) => {
      if (!window.confirm('Reset login for ' + (t.full_name || t.email) + '? A new temporary password will be generated.')) return;
      const token = await headToken();
      try {
        const r = await fetch(WK + '/reset-teacher-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ tenant_id: tenant(), email: t.email }) });
        const d = await r.json();
        if (!d.ok) { window.peakToast ? window.peakToast('Could not reset', 'info', d.error || '') : alert(d.error || 'Reset failed'); return; }
        window.prompt((t.full_name || t.email) + ' — new temporary password (copy & share). They can change it after signing in:', d.tempPassword);
      } catch (e) { alert('Reset error: ' + (e && e.message || e)); }
    };
    const remind = async (t) => {
      if (!t.email) return;
      const msg = window.prompt('Send a phone reminder to ' + (t.full_name || t.email) + ':', 'Please check your tasks for today.');
      if (msg == null || !msg.trim()) return;
      try {
        const token = await headToken();
        const res = await window.NX_PUSH.notify({ tenant: tenant(), emails: [t.email], title: 'Reminder from the head', body: msg.trim(), url: window.location.pathname, tag: 'remind-' + Date.now() }, token);
        if (res && res.sent > 0) window.peakToast && window.peakToast('Reminder delivered', 'success', (t.full_name || t.email) + ' · on their phone');
        else if (res && res.matched === 0) window.peakToast && window.peakToast('No phone yet', 'info', (t.full_name || t.email) + ' hasn’t turned on phone alerts.');
        else window.peakToast && window.peakToast('Sent — pending delivery', 'info', (res && res.error) || '');
      } catch (e) { window.peakToast && window.peakToast('Could not send', 'info', String(e && e.message || e)); }
    };
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: T.ink3 }}>{teachers.length} on staff · {teachers.filter(t => t.user_id).length} with a login</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setImporting(true)} style={btnG}>Import CSV</button>
            <button onClick={() => setAdding(true)} style={btnP}>+ Add {vocab().staff.toLowerCase()}</button>
          </div>
        </div>
        <div style={card}>
          {teachers.length === 0 ? <div style={{ padding: '20px 0', textAlign: 'center', color: T.ink3 }}>No {vocab().staff.toLowerCase()}s yet. Add one — they get a real login.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ borderBottom: '1px solid ' + T.border }}>{['Name', 'Email', vocab().subs || 'Subjects', vocab().unit + 'es', 'Login'].map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10.5, fontFamily: T.mono, color: T.ink3, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                <tbody>{teachers.map((t, i) => { const m = meta[(t.email || '').toLowerCase()] || {}; return (
                  <tr key={i} style={{ borderBottom: '1px solid ' + T.border }}>
                    <td style={{ padding: '10px' }}><button onClick={() => setProfile(t)} style={{ background: 'transparent', border: 'none', color: T.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0, textAlign: 'left', textDecoration: 'underline', textDecorationColor: T.border }}>{t.full_name}</button></td>
                    <td style={{ padding: '10px', color: T.ink2 }}>{t.email || '—'}</td>
                    <td style={{ padding: '10px', color: T.ink2 }}>{(t.subjects || []).join(', ') || '—'}</td>
                    <td style={{ padding: '10px', color: T.ink2 }}>{(m.classes || []).join(', ') || '—'}</td>
                    <td style={{ padding: '10px' }}>
                      {t.user_id ? <span style={{ color: T.good, fontSize: 12 }}>● active</span> : <span style={{ color: T.ink3, fontSize: 12 }}>not set</span>}
                      {t.email ? <button onClick={() => remind(t)} title="Push a reminder to their phone" style={{ marginLeft: 8, background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 6, padding: '3px 8px', fontSize: 10.5, cursor: 'pointer' }}>🔔 Remind</button> : null}
                      {t.email ? <button onClick={() => resetLogin(t)} style={{ marginLeft: 6, background: 'transparent', border: '1px solid ' + T.border, color: T.ink3, borderRadius: 6, padding: '3px 8px', fontSize: 10.5, cursor: 'pointer' }}>Reset login</button> : null}
                      <button onClick={() => setProfile(t)} style={{ marginLeft: 6, background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 6, padding: '3px 8px', fontSize: 10.5, cursor: 'pointer' }}>Profile →</button>
                    </td>
                  </tr>
                ); })}</tbody>
              </table>
            </div>
          )}
        </div>
        {adding && <AddTeacherReal onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} />}
        {importing && <ImportTeachers onClose={() => setImporting(false)} onDone={() => { setImporting(false); reload(); }} />}
        {profile && <TeacherProfile t={profile} meta={meta} tasks={tasks} pay={pay} status={status} onClose={() => setProfile(null)} reload={reload} onRemind={() => remind(profile)} onReset={() => resetLogin(profile)} />}
      </div>
    );
  }

  /* ---- Teacher profile ---- */
  function TeacherProfile({ t, meta, tasks, pay, status, onClose, reload, onRemind, onReset }) {
    const email = (t.email || '').toLowerCase();
    const key = (t.email || t.full_name || '').toLowerCase();
    const m = meta[email] || {};
    const p = pay[key] || {};
    const [salary, setSalary] = useState(p.monthly || 0);
    const [allow, setAllow] = useState(p.allowance || 0);
    const [saving, setSaving] = useState(false);
    const myTasks = (tasks || []).filter(x => {
      const to = x.assignTo || x.to || {};
      if (Array.isArray(x.emails)) return x.emails.map(e => String(e).toLowerCase()).indexOf(email) >= 0;
      if (x.email) return String(x.email).toLowerCase() === email;
      if (x.scope === 'all') return true;
      return false;
    });
    const st = status[(t.full_name || '').toLowerCase()] || '';
    const inSchool = /in at/i.test(st) && !/checked out/i.test(st);
    const savePayRec = () => {
      setSaving(true);
      const rec = { key: (t.email || t.full_name), name: t.full_name || t.email, role: ((t.subjects && t.subjects.length) ? ('Teacher · ' + t.subjects.join('/')) : 'Teacher'), type: 'teaching', email: t.email || '', monthly: Number(salary) || 0, allowance: Number(allow) || 0 };
      osSave('staff_pay', rec, p._id).then(() => { setSaving(false); window.peakToast && window.peakToast('Saved', 'success', (t.full_name || '') + ' · pay updated'); reload && reload(); }).catch(() => setSaving(false));
    };
    const row = (label, val) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid ' + T.border }}>
        <div style={{ fontSize: 11.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.03em' }}>{label}</div>
        <div style={{ fontSize: 13, color: T.ink, textAlign: 'right', maxWidth: '60%' }}>{val}</div>
      </div>
    );
    const fmt = (n) => 'UGX ' + (Number(n) || 0).toLocaleString();
    const lblS = { fontSize: 9.5, color: T.ink4, fontFamily: T.mono, marginBottom: 3 };
    const inpS = { width: 130, background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: T.ink, fontFamily: 'ui-monospace,monospace', outline: 'none' };
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 96vw)', maxHeight: '90vh', overflow: 'auto', background: T.surface, border: '1px solid ' + T.border, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: T.red, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>{(t.full_name || '?').trim().charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 700 }}>{t.full_name}</div>
              <div style={{ fontSize: 12.5, color: T.ink3 }}>{(t.subjects || []).join(', ') || 'Teacher'}{(m.classes || []).length ? ' · ' + (m.classes || []).join(', ') : ''}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: inSchool ? T.good : T.ink3, border: '1px solid ' + (inSchool ? T.good : T.border), borderRadius: 999, padding: '4px 10px' }}>{inSchool ? '● In school' : (st ? 'Not in' : 'No check-in')}</span>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.ink3, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            {row('Email', t.email || '—')}
            {row('Phone', t.phone || '—')}
            {row(vocab().sub + 's', (t.subjects || []).join(', ') || '—')}
            {row('Classes', (m.classes || []).join(', ') || '—')}
            {row('Login', t.user_id ? 'Active' : 'Not set')}
            {row('Today', st || 'No check-in recorded')}
            {row('Open tasks', String(myTasks.length))}
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Pay</div>
            <div style={{ fontSize: 11, color: T.ink3, marginBottom: 12 }}>Adjust this {vocab().staff.toLowerCase()}'s monthly salary and allowance. This feeds straight into Finance → payroll and the school's total outflow.</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label><div style={lblS}>SALARY / MONTH (UGX)</div><input value={salary || ''} onChange={e => setSalary(Number(String(e.target.value).replace(/[^0-9]/g, '')) || 0)} placeholder="0" style={inpS} /></label>
              <label><div style={lblS}>ALLOWANCE / MONTH (UGX)</div><input value={allow || ''} onChange={e => setAllow(Number(String(e.target.value).replace(/[^0-9]/g, '')) || 0)} placeholder="0" style={inpS} /></label>
              <div style={{ flex: 1, minWidth: 120 }}><div style={lblS}>TOTAL / MONTH</div><div style={{ fontSize: 16, fontWeight: 700, color: T.ink, fontFamily: 'ui-monospace,monospace' }}>{fmt((Number(salary) || 0) + (Number(allow) || 0))}</div></div>
            </div>
            <button onClick={savePayRec} disabled={saving} style={{ ...btnP, marginTop: 14 }}>{saving ? 'Saving…' : 'Save pay'}</button>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {t.email ? <button onClick={onRemind} style={btnG}>🔔 Remind</button> : null}
            {t.email ? <button onClick={onReset} style={btnG}>Reset login</button> : null}
            <button onClick={onClose} style={btnP}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  function ImportTeachers({ onClose, onDone }) {
    const [raw, setRaw] = useState('');
    const [parsed, setParsed] = useState(null);
    const [map, setMap] = useState({ name: -1, email: -1, phone: -1, subjects: -1, classes: -1 });
    const [busy, setBusy] = useState(false);
    const [res, setRes] = useState(null);
    function splitLine(line, d) { const out = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (c === d && !q) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out.map(x => x.trim()); }
    function guess(h, keys) { for (let i = 0; i < h.length; i++) { const x = (h[i] || '').toLowerCase(); for (const k of keys) if (x.indexOf(k) >= 0) return i; } return -1; }
    function doParse(text) {
      const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim()); if (!lines.length) { setParsed(null); return; }
      const d = (lines[0].split('\t').length > lines[0].split(',').length) ? '\t' : ',';
      const headers = splitLine(lines[0], d), rows = lines.slice(1).map(l => splitLine(l, d));
      setParsed({ headers, rows });
      setMap({ name: guess(headers, ['name', 'teacher', 'full']), email: guess(headers, ['email', 'mail']), phone: guess(headers, ['phone', 'tel', 'mobile', 'whatsapp']), subjects: guess(headers, ['subject', 'teaches', 'subj']), classes: guess(headers, ['class', 'stream', 'form', 'level', 'allocat']) });
      setRes(null);
    }
    function onFile(e) { const fl = e.target.files && e.target.files[0]; if (!fl) return; const rd = new FileReader(); rd.onload = () => { setRaw(rd.result || ''); doParse(rd.result || ''); }; rd.readAsText(fl); }
    const teachersArr = parsed ? parsed.rows.map(r => ({ name: map.name >= 0 ? (r[map.name] || '') : '', email: map.email >= 0 ? (r[map.email] || '') : '', phone: map.phone >= 0 ? (r[map.phone] || '') : '', subjects: map.subjects >= 0 ? (r[map.subjects] || '') : '', classes: map.classes >= 0 ? (r[map.classes] || '') : '' })).filter(x => (x.name || '').trim() && (x.email || '').indexOf('@') >= 0) : [];
    const colOpts = parsed ? [{ value: '-1', label: '— none —' }].concat(parsed.headers.map((h, i) => ({ value: String(i), label: h || ('Column ' + (i + 1)) }))) : [];
    const setCol = (k, v) => setMap(m => Object.assign({}, m, { [k]: parseInt(v, 10) }));
    const run = async () => {
      if (!teachersArr.length) { setRes({ err: 'No valid rows — each needs a name and a valid email.' }); return; }
      setBusy(true); setRes(null);
      const token = await headToken();
      try {
        const r = await fetch(WK + '/provision-teacher/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ tenant_id: tenant(), teachers: teachersArr }) });
        const d = await r.json(); setBusy(false);
        if (!d.ok) { setRes({ err: d.error || 'Import failed.' }); return; }
        setRes({ ok: true, created: d.created, total: d.total, results: d.results || [] });
      } catch (e) { setBusy(false); setRes({ err: String(e && e.message || e) }); }
    };
    const downloadCreds = () => {
      const rows = (res.results || []).filter(x => x.ok && x.tempPassword);
      const csv = 'Name,Email,Temp password,Login link\n' + rows.map(x => [x.name, x.email, x.tempPassword, location.origin + '/s/' + tenant()].map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'teacher-logins-' + tenant() + '.csv'; a.click();
    };
    return (
      <Modal title={'Import ' + vocab().staff.toLowerCase() + 's'} onClose={onClose}>
        {res && res.ok ? (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.good, marginBottom: 8 }}>{res.created} of {res.total} created ✓</div>
            <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.6 }}>Each got a login (email + temp password) and their subjects/classes are saved. Download the credentials to share, then open <b>Timetable → Auto-generate</b> and they'll be allocated automatically.</div>
            {res.results.filter(x => !x.ok).length > 0 && <div style={{ marginTop: 10, fontSize: 12, color: T.warn }}>{res.results.filter(x => !x.ok).length} skipped (already exist or bad email).</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button style={btnG} onClick={downloadCreds}>Download logins (CSV)</button>
              <button style={btnP} onClick={onDone}>Done</button>
            </div>
          </div>
        ) : !parsed ? (
          <div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 12 }}>Columns: <b>Name, Email, Phone, Subjects, Classes</b>. Subjects &amp; classes can be separated by ; or , (e.g. <code>Physics;Chemistry</code> · <code>S1;S2</code>).</div>
            <div style={{ border: '1px dashed ' + T.border, borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 12 }}>
              <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} style={{ fontSize: 13, color: T.ink2 }} />
            </div>
            <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginBottom: 6 }}>OR PASTE</div>
            <textarea value={raw} onChange={e => { setRaw(e.target.value); doParse(e.target.value); }} placeholder={'Name, Email, Phone, Subjects, Classes\nMr Patrick Wandera, patrick@school.ug, +2567.., Mathematics;Physics, S1;S2;S3'} rows={5} style={{ width: '100%', background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: 12, fontSize: 12.5, color: T.ink, fontFamily: T.mono, outline: 'none' }} />
            {res && res.err && <div style={{ marginTop: 10, color: T.redInk, fontSize: 12.5 }}>{res.err}</div>}
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['subjects', 'Subjects'], ['classes', 'Classes']].map(fd => (
                <label key={fd[0]}><div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginBottom: 5 }}>{fd[1].toUpperCase()}</div><select style={inp} value={String(map[fd[0]])} onChange={e => setCol(fd[0], e.target.value)}>{colOpts.map(co => <option key={co.value} value={co.value}>{co.label}</option>)}</select></label>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: T.ink3, marginBottom: 6 }}>{teachersArr.length} teacher(s) ready · each gets a login.</div>
            <div style={{ border: '1px solid ' + T.border, borderRadius: 9, maxHeight: 180, overflowY: 'auto' }}>
              {teachersArr.slice(0, 12).map((t, i) => <div key={i} style={{ padding: '8px 11px', borderBottom: '1px solid ' + T.border, fontSize: 12 }}><b style={{ color: T.ink }}>{t.name}</b> · {t.email} · <span style={{ color: T.ink3 }}>{t.subjects || 'no subjects'} · {t.classes || 'no classes'}</span></div>)}
            </div>
            <div style={{ marginTop: 8 }}><span onClick={() => { setParsed(null); setRaw(''); }} style={{ fontSize: 12, color: T.ink3, cursor: 'pointer', textDecoration: 'underline' }}>Start over</span></div>
            {res && res.err && <div style={{ marginTop: 10, color: T.redInk, fontSize: 12.5 }}>{res.err}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={btnG} onClick={onClose}>Cancel</button>
              <button style={Object.assign({}, btnP, (busy || !teachersArr.length) ? { opacity: 0.6 } : null)} onClick={run} disabled={busy || !teachersArr.length}>{busy ? 'Creating…' : ('Create ' + teachersArr.length + ' logins')}</button>
            </div>
          </div>
        )}
      </Modal>
    );
  }

  function AddTeacherReal({ onClose, onDone }) {
    const [f, setF] = useState({ mode: 'password', subjects: '', classes: [] });
    const [busy, setBusy] = useState(false);
    const [res, setRes] = useState(null);
    const set = (k, v) => setF(o => Object.assign({}, o, { [k]: v }));
    const toggleClass = (c) => setF(o => { const has = (o.classes || []).indexOf(c) >= 0; return Object.assign({}, o, { classes: has ? o.classes.filter(x => x !== c) : (o.classes || []).concat([c]) }); });
    const submit = async () => {
      if (!f.name || !f.email) { setRes({ err: 'Name and email are required (the email becomes their login).' }); return; }
      setBusy(true); setRes(null);
      const token = await headToken();
      const body = { tenant_id: tenant(), email: f.email.trim(), fullName: f.name.trim(), phone: f.phone || '', subjects: f.subjects, mode: f.mode };
      try {
        const r = await fetch(WK + '/provision-teacher', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(body) });
        const d = await r.json();
        setBusy(false);
        if (!d.ok) { setRes({ err: d.error || 'Could not create the login.' }); return; }
        if ((f.classes || []).length) osSave('staff_meta', { email: f.email.trim().toLowerCase(), classes: f.classes });
        setRes({ ok: true, tempPassword: d.tempPassword, mode: d.mode, email: f.email.trim() });
      } catch (e) { setBusy(false); setRes({ err: String(e && e.message || e) }); }
    };
    return (
      <Modal title={'Add ' + vocab().staff.toLowerCase()} onClose={onClose}>
        {res && res.ok ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.good, marginBottom: 10 }}>{res.mode === 'invite' ? 'Invite sent ✓' : 'Login created ✓'}</div>
            <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>
              <div><b>Email:</b> {res.email}</div>
              {res.mode === 'invite' ? <div style={{ marginTop: 6 }}>They'll get an email to set their own password, then sign in at your school link.</div>
                : <div style={{ marginTop: 6 }}><b>Temp password:</b> <span style={{ fontFamily: T.mono, color: T.ink, background: T.bg, padding: '3px 8px', borderRadius: 6, border: '1px solid ' + T.border }}>{res.tempPassword}</span><div style={{ marginTop: 6, fontSize: 12, color: T.ink3 }}>Share these two. They sign in at your school link and can change the password.</div></div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}><button style={btnP} onClick={onDone}>Done</button></div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ gridColumn: 'span 2' }}><div style={lbl}>FULL NAME</div><input style={inp} value={f.name || ''} onChange={e => set('name', e.target.value)} placeholder="Mr. Patrick Wandera" /></label>
              <label style={{ gridColumn: 'span 2' }}><div style={lbl}>EMAIL (their login)</div><input style={inp} value={f.email || ''} onChange={e => set('email', e.target.value)} placeholder="patrick@school.ug" /></label>
              <label><div style={lbl}>PHONE</div><input style={inp} value={f.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+256 7..." /></label>
              <label><div style={lbl}>{(vocab().subs || 'Subjects').toUpperCase()} · comma</div><input style={inp} value={f.subjects || ''} onChange={e => set('subjects', e.target.value)} placeholder="Mathematics, Physics" /></label>
            </div>
            <div style={{ marginTop: 12 }}><div style={lbl}>{(vocab().unit).toUpperCase()}ES THEY TEACH</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {classesNow().map(c => { const on = (f.classes || []).indexOf(c) >= 0; return <button key={c} onClick={() => toggleClass(c)} style={{ background: on ? T.red : 'transparent', color: on ? '#fff' : T.ink2, border: '1px solid ' + (on ? T.red : T.border), borderRadius: 999, padding: '5px 11px', fontSize: 12, cursor: 'pointer' }}>{c}</button>; })}
              </div>
            </div>
            <div style={{ marginTop: 14 }}><div style={lbl}>HOW TO CREATE THE LOGIN</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['password', 'Temp password', 'You get a password to share now'], ['invite', 'Email invite', 'They set their own password (needs email sender)']].map(o => (
                  <button key={o[0]} onClick={() => set('mode', o[0])} style={{ flex: 1, textAlign: 'left', padding: '11px 13px', borderRadius: 10, border: '1px solid ' + (f.mode === o[0] ? T.red : T.border), background: f.mode === o[0] ? 'rgba(255,255,255,0.03)' : 'transparent', color: T.ink, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{o[1]}</div><div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2 }}>{o[2]}</div>
                  </button>
                ))}
              </div>
            </div>
            {res && res.err && <div style={{ marginTop: 12, color: T.redInk, fontSize: 12.5 }}>{res.err}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button style={btnG} onClick={onClose}>Cancel</button>
              <button style={Object.assign({}, btnP, busy ? { opacity: 0.6 } : null)} onClick={submit} disabled={busy}>{busy ? 'Creating…' : 'Create login'}</button>
            </div>
          </div>
        )}
      </Modal>
    );
  }

  /* ---- Groups ---- */
  function Groups({ teachers, groups, reload }) {
    const [creating, setCreating] = useState(false);
    // auto groups by subject + class for reference
    const bySubject = {}; teachers.forEach(t => (t.subjects || []).forEach(s => { (bySubject[s] = bySubject[s] || []).push(t.full_name); }));
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: T.ink3 }}>Custom teams you build, plus automatic groups by {vocab().sub.toLowerCase()}.</div>
          <button onClick={() => setCreating(true)} style={btnP}>+ New group</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 18 }}>
          {groups.length === 0 ? <div style={{ ...card, gridColumn: '1/-1', textAlign: 'center', color: T.ink3 }}>No custom groups yet. Build one (e.g. “Exams Committee”).</div> :
            groups.map((g, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{g.name}</div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>{(g.emails || []).length} member{(g.emails || []).length === 1 ? '' : 's'}</div>
              </div>
            ))}
        </div>
        <div style={{ ...card }}>
          <div style={lbl}>AUTO GROUPS · BY {vocab().sub.toUpperCase()}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.keys(bySubject).length === 0 ? <span style={{ color: T.ink3, fontSize: 12 }}>Add subjects to teachers to see these.</span> :
              Object.keys(bySubject).map(s => <span key={s} style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 999, padding: '5px 11px', fontSize: 12, color: T.ink2 }}>{s} · {bySubject[s].length}</span>)}
          </div>
        </div>
        {creating && <GroupModal teachers={teachers} onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />}
      </div>
    );
  }

  function GroupModal({ teachers, onClose, onDone }) {
    const [name, setName] = useState('');
    const [sel, setSel] = useState({});
    const [busy, setBusy] = useState(false);
    const toggle = (em) => setSel(s => Object.assign({}, s, { [em]: !s[em] }));
    const save = () => { const emails = Object.keys(sel).filter(k => sel[k]); if (!name.trim() || !emails.length) return; setBusy(true); osSave('staff_group', { name: name.trim(), emails }).then(() => { setBusy(false); onDone(); }); };
    return (
      <Modal title="New group" onClose={onClose}>
        <label><div style={lbl}>GROUP NAME</div><input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Exams Committee" /></label>
        <div style={{ marginTop: 12 }}><div style={lbl}>MEMBERS</div>
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid ' + T.border, borderRadius: 9 }}>
            {teachers.filter(t => t.email).map((t, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid ' + T.border, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!sel[t.email]} onChange={() => toggle(t.email)} />
                <span style={{ color: T.ink }}>{t.full_name}</span><span style={{ color: T.ink3, fontSize: 12 }}>{(t.subjects || []).join(', ')}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button style={btnG} onClick={onClose}>Cancel</button><button style={btnP} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save group'}</button></div>
      </Modal>
    );
  }

  /* ---- Tasks ---- */
  function Tasks({ teachers, groups, meta, tasks, reload }) {
    const [creating, setCreating] = useState(false);
    const nameFor = (em) => { const t = teachers.find(x => (x.email || '').toLowerCase() === (em || '').toLowerCase()); return t ? t.full_name : em; };
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: T.ink3 }}>Assign work to a person, a group, a {vocab().sub.toLowerCase()}/{vocab().unit.toLowerCase()}, or everyone.</div>
          <button onClick={() => setCreating(true)} style={btnP}>+ New task</button>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {tasks.length === 0 ? <div style={{ ...card, textAlign: 'center', color: T.ink3 }}>No tasks yet.</div> :
            tasks.map((tk, i) => { const total = (tk.emails || []).length; const done = Object.keys(tk.done || {}).filter(k => tk.done[k]).length; const pct = total ? Math.round(done / total * 100) : 0; return (
              <div key={i} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{tk.title}</div>
                    {tk.details && <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 4 }}>{tk.details}</div>}
                    <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 6 }}>{tk.audienceLabel || (total + ' people')}{tk.due ? ' · due ' + tk.due : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: pct === 100 ? T.good : T.ink }}>{done}/{total}</div>
                    <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>DONE</div>
                  </div>
                </div>
                <div style={{ height: 5, background: T.bg, borderRadius: 999, marginTop: 10, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: pct === 100 ? T.good : T.red }} /></div>
              </div>
            ); })}
        </div>
        {creating && <TaskModal teachers={teachers} groups={groups} meta={meta} onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />}
      </div>
    );
  }

  function TaskModal({ teachers, groups, meta, onClose, onDone }) {
    const [f, setF] = useState({ title: '', details: '', due: '', audience: 'all', subject: '', cls: '', group: '', picks: {} });
    const [busy, setBusy] = useState(false);
    const set = (k, v) => setF(o => Object.assign({}, o, { [k]: v }));
    const subjects = Array.from(new Set([].concat.apply([], teachers.map(t => t.subjects || []))));
    const resolve = () => {
      const all = teachers.filter(t => t.email).map(t => t.email.toLowerCase());
      if (f.audience === 'all') return { emails: all, label: 'Everyone (' + all.length + ')' };
      if (f.audience === 'subject') return { emails: teachers.filter(t => (t.subjects || []).indexOf(f.subject) >= 0 && t.email).map(t => t.email.toLowerCase()), label: f.subject + ' teachers' };
      if (f.audience === 'class') return { emails: teachers.filter(t => { const m = meta[(t.email || '').toLowerCase()]; return m && (m.classes || []).indexOf(f.cls) >= 0; }).map(t => t.email.toLowerCase()), label: f.cls + ' teachers' };
      if (f.audience === 'group') { const g = groups.find(x => x.name === f.group); return { emails: (g && g.emails || []).map(e => e.toLowerCase()), label: 'Group · ' + f.group }; }
      const picks = Object.keys(f.picks).filter(k => f.picks[k]); return { emails: picks.map(e => e.toLowerCase()), label: picks.length + ' selected' };
    };
    const r = resolve();
    const save = () => {
      if (!f.title.trim()) { return; }
      if (!r.emails.length) { return; }
      setBusy(true);
      osSave('staff_task', { title: f.title.trim(), details: f.details.trim(), due: f.due.trim(), emails: r.emails, audienceLabel: r.label, done: {}, createdAt: new Date().toISOString() }).then(async () => {
        setBusy(false); window.peakToast && window.peakToast('Task assigned', 'success', r.label);
        try { const token = await headToken(); if (window.NX_PUSH) window.NX_PUSH.notify({ tenant: tenant(), emails: r.emails, title: 'New task from the head', body: f.title.trim() + (f.due.trim() ? ' · due ' + f.due.trim() : ''), url: window.location.pathname, tag: 'task-' + Date.now() }, token); } catch (e) {}
        onDone();
      });
    };
    const audBtn = (k, label) => <button onClick={() => set('audience', k)} style={{ background: f.audience === k ? T.red : 'transparent', color: f.audience === k ? '#fff' : T.ink2, border: '1px solid ' + (f.audience === k ? T.red : T.border), borderRadius: 999, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>{label}</button>;
    return (
      <Modal title="New task" onClose={onClose}>
        <label><div style={lbl}>TITLE</div><input style={inp} value={f.title} onChange={e => set('title', e.target.value)} placeholder="Submit end-of-term marks" /></label>
        <label style={{ display: 'block', marginTop: 12 }}><div style={lbl}>DETAILS</div><textarea style={{ ...inp, minHeight: 70 }} value={f.details} onChange={e => set('details', e.target.value)} placeholder="What should they do?" /></label>
        <label style={{ display: 'block', marginTop: 12 }}><div style={lbl}>DUE (optional)</div><input style={inp} value={f.due} onChange={e => set('due', e.target.value)} placeholder="Friday 20 June" /></label>
        <div style={{ marginTop: 14 }}><div style={lbl}>ASSIGN TO</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {audBtn('all', 'Everyone')}{audBtn('subject', 'By ' + vocab().sub.toLowerCase())}{audBtn('class', 'By ' + vocab().unit.toLowerCase())}{audBtn('group', 'Custom group')}{audBtn('picks', 'Pick people')}
          </div>
          {f.audience === 'subject' && <select style={inp} value={f.subject} onChange={e => set('subject', e.target.value)}><option value="">— choose {vocab().sub.toLowerCase()} —</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select>}
          {f.audience === 'class' && <select style={inp} value={f.cls} onChange={e => set('cls', e.target.value)}><option value="">— choose {vocab().unit.toLowerCase()} —</option>{classesNow().map(c => <option key={c} value={c}>{c}</option>)}</select>}
          {f.audience === 'group' && <select style={inp} value={f.group} onChange={e => set('group', e.target.value)}><option value="">— choose group —</option>{groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}</select>}
          {f.audience === 'picks' && (
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid ' + T.border, borderRadius: 9 }}>
              {teachers.filter(t => t.email).map((t, i) => <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid ' + T.border, cursor: 'pointer' }}><input type="checkbox" checked={!!f.picks[t.email]} onChange={() => set('picks', Object.assign({}, f.picks, { [t.email]: !f.picks[t.email] }))} /><span>{t.full_name}</span></label>)}
            </div>
          )}
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 8 }}>{r.emails.length} {vocab().staff.toLowerCase()}{r.emails.length === 1 ? '' : 's'} will get this — {r.label}.</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button style={btnG} onClick={onClose}>Cancel</button><button style={Object.assign({}, btnP, (busy || !f.title.trim() || !r.emails.length) ? { opacity: 0.6 } : null)} onClick={save} disabled={busy || !f.title.trim() || !r.emails.length}>{busy ? 'Assigning…' : 'Assign task'}</button></div>
      </Modal>
    );
  }

  /* ---- shared modal ---- */
  function Modal({ title, onClose, children }) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(5,8,22,0.7)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: T.surface, border: '1px solid ' + T.border, borderRadius: 16, padding: 22, maxHeight: '92vh', overflow: 'auto', color: T.ink, fontFamily: T.font }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{title}</div>
          {children}
        </div>
      </div>
    );
  }

export { Staff };
