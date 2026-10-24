// Source module of the NEXT School OS app.
// Loaded as a classic <script>; compiled to compiled/nia-health.js by build-precompiled.cjs.
/* global React */
// Nia alerts (Communications → Nia alerts). Nia re-checks the school every
// 30 minutes — double pupils, class spellings, missing fees, overpayments,
// parent phones, teacher logins, roll call — and lists what it finds here.
// Nia never changes anything by itself: each fix runs only when the head
// teacher or an admin taps "Approve fix". Everything else opens the screen
// where it is fixed.

const PD_Nia = (function () {
  const { useState, useEffect } = React;
  const T = () => window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  const tenantId = () => (window.NextSession && window.NextSession.profile && window.NextSession.profile.tenantId)
    || (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || '';
  const role = () => String((window.NextSession && window.NextSession.profile && window.NextSession.profile.role)
    || (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().role) || '').toLowerCase();
  const canSee = () => { const r = role(); return !r || r === 'head' || r === 'admin' || r === 'headteacher' || r === 'operator'; };
  const toast = (a, b, c) => window.peakToast && window.peakToast(a, b, c);
  const report = (e, where) => { try { window.nxReport && window.nxReport(e, 'nia:' + where); } catch (x) {} };

  async function api(path, body) {
    try {
      const r = await fetch(WK + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ tenant: tenantId() }, body || {})) });
      return await r.json().catch(() => ({ ok: false, error: 'Bad reply from the server (' + r.status + ')' }));
    } catch (e) { report(e, path); return { ok: false, error: 'Could not reach the school system. Check the internet and try again.' }; }
  }

  // Shared so the Communications tab can show a count without opening the list
  const listeners = new Set();
  let cache = null;
  async function refresh(run) {
    const j = await api('/nia/findings', { run: !!run });
    if (j && j.ok) { cache = j; listeners.forEach(fn => fn(j)); }
    return j;
  }
  function useOpenCount() {
    const [n, setN] = useState(cache ? cache.findings.filter(f => f.status === 'open').length : null);
    useEffect(() => {
      const fn = j => setN(j.findings.filter(f => f.status === 'open').length);
      listeners.add(fn);
      if (!cache && canSee()) refresh(false);
      return () => listeners.delete(fn);
    }, []);
    return n;
  }

  const SEV = {
    critical: { label: 'Urgent', dot: '#ff4d6d' },
    warn: { label: 'Needs action', dot: '#ffb020' },
    info: { label: 'Check', dot: '#5aa9ff' },
  };
  const AREA = { pupils: 'Pupils', fees: 'Fees', logins: 'Logins', attendance: 'Attendance', system: 'System' };
  const OPEN_LABEL = { fees: 'Open Fees', stud: 'Open Students', controls: 'Open Staff & Audit', attn: 'Open Attendance' };
  const FIX_LABEL = { merge_pupils: 'Approve merge', rename_class: 'Approve rename', add_teacher_row: 'Approve — add teacher' };
  const when = ts => { if (!ts) return ''; const m = (Date.now() - new Date(ts).getTime()) / 60000; return m < 2 ? 'just now' : m < 60 ? Math.round(m) + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };

  function Alerts({ onNav }) {
    const t = T();
    const [data, setData] = useState(cache);
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState('');
    const [filter, setFilter] = useState('action');
    const [showClosed, setShowClosed] = useState(false);
    const [secret, setSecret] = useState(null);

    const load = async (run) => {
      setBusy(run ? 'run' : 'load');
      const j = await refresh(run);
      setBusy('');
      if (!j.ok) { setErr(j.error || 'Could not load Nia alerts.'); return; }
      setErr(j.runError ? 'Nia could not finish checking: ' + j.runError : '');
      setData(j);
    };
    useEffect(() => {
      const fn = j => setData(j); listeners.add(fn);
      load(!cache || !cache.lastRun || (Date.now() - new Date(cache.lastRun).getTime()) > 30 * 60000);
      return () => listeners.delete(fn);
    }, []);

    const approve = async (f) => {
      const q = f.fix === 'merge_pupils'
        ? 'Merge ' + (f.data.dup_name || 'the copy') + ' into ' + (f.data.keep_name || 'the original') + '?\n\nFees, attendance and everything else move to ' + (f.data.keep_name || 'the original') + ' and the copy is removed. Only do this if they are the same child.'
        : f.fix === 'rename_class' ? 'Rename ' + (f.data.from || []).map(x => '"' + x + '"').join(', ') + ' to "' + f.data.to + '" for every pupil?'
        : 'Add ' + (f.data.name || f.data.email) + ' to the teacher list?';
      if (!window.confirm(q)) return;
      setBusy('f' + f.id);
      const j = await api('/nia/fix', { id: f.id });
      setBusy('');
      if (!j.ok) { toast('Not fixed', 'error', j.error); load(false); return; }
      toast('Fixed', 'success', j.message);
      try { if ((f.fix === 'merge_pupils' || f.fix === 'rename_class') && window.PEAK && window.PEAK.loadStudents) window.PEAK.loadStudents(tenantId()); if (f.fix === 'add_teacher_row' && window.PEAK && window.PEAK.loadTeachers) window.PEAK.loadTeachers(tenantId()); } catch (e) {}
      load(false);
    };
    const dismiss = async (f, undo) => {
      setBusy('d' + f.id);
      const j = await api('/nia/dismiss', { id: f.id, undo: !!undo });
      setBusy('');
      if (!j.ok) { toast('Not changed', 'error', j.error); return; }
      toast(undo ? 'Alert back on the list' : 'Dismissed', 'success', undo ? '' : 'Nia won’t raise this one again unless it changes.');
      load(false);
    };
    const resetPw = async (f) => {
      if (!window.confirm('Give ' + (f.data.name || f.data.email) + ' a new temporary password? Their current password stops working.')) return;
      setBusy('f' + f.id);
      const j = await api('/staff/reset-password', { user_id: f.data.user_id });
      setBusy('');
      if (!j.ok) { toast('Not reset', 'error', j.error); return; }
      setSecret({ title: 'New temporary password for ' + (f.data.name || f.data.email), email: j.email, tempPassword: j.tempPassword, name: f.data.name });
    };

    const all = (data && data.findings) || [];
    const open = all.filter(f => f.status === 'open');
    const closed = all.filter(f => f.status !== 'open');
    const rank = { critical: 0, warn: 1, info: 2 };
    const shown = open.filter(f => filter === 'all' ? true : filter === 'action' ? f.severity !== 'info' : f.severity === 'info')
      .sort((a, b) => (rank[a.severity] - rank[b.severity]) || String(a.area).localeCompare(String(b.area)));
    const nAction = open.filter(f => f.severity !== 'info').length, nInfo = open.length - nAction;
    const chip = (k, label, n) => (
      <button key={k} onClick={() => setFilter(k)} style={{ border: '1px solid ' + (filter === k ? t.red : t.border), background: filter === k ? 'rgba(226,58,82,0.10)' : 'transparent', color: filter === k ? t.ink : t.ink3, borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{label}{n != null ? ' · ' + n : ''}</button>
    );
    const btn = (primary) => primary
      ? { border: 'none', background: t.red, color: '#fff', padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }
      : { border: '1px solid ' + (t.borderStr || t.border), background: 'transparent', color: t.ink2, padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' };
    const Secret = window.PD_HeadControls && window.PD_HeadControls.SecretCard;

    return (
      <div style={{ padding: 24, maxWidth: 980 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c5cff,#e23a52)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>N</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{open.length === 0 && data ? 'Nia found nothing to fix' : open.length + ' thing' + (open.length === 1 ? '' : 's') + ' Nia found'}</div>
              <div style={{ fontSize: 12, color: t.ink3 }}>{busy === 'run' ? 'Checking the whole school now…' : data && data.lastRun ? 'Last checked ' + when(data.lastRun) + ' · re-checks every 30 minutes' : 'Checks every 30 minutes'} · nothing changes until you approve</div>
            </div>
          </div>
          <button onClick={() => load(true)} disabled={!!busy} style={Object.assign(btn(false), { opacity: busy ? 0.6 : 1 })}>{busy === 'run' ? 'Checking…' : 'Check now'}</button>
        </div>

        {err && <div style={{ background: t.surface, border: '1px solid ' + t.border, borderRadius: 12, padding: 14, marginBottom: 14, color: t.redInk || t.red, fontSize: 13 }}>{err}</div>}
        {secret && Secret && <Secret info={secret} onClose={() => setSecret(null)} />}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {chip('action', 'Needs action', nAction)}
          {chip('info', 'To check', nInfo)}
          {chip('all', 'All', open.length)}
        </div>

        {!data && !err && <div style={{ color: t.ink3, padding: 20 }}>Nia is checking the school…</div>}
        {data && shown.length === 0 && <div style={{ background: t.surface, border: '1px solid ' + t.border, borderRadius: 12, padding: 18, color: t.ink3, fontSize: 13 }}>{open.length ? 'Nothing in this list — see the other tabs.' : 'All clear. Nia will tell you here the moment something needs attention.'}</div>}

        <div style={{ display: 'grid', gap: 10 }}>
          {shown.map(f => {
            const s = SEV[f.severity] || SEV.info;
            const openKey = f.fix && f.fix.indexOf('open:') === 0 ? f.fix.slice(5) : null;
            return (
              <div key={f.id} data-nia-alert={f.code} style={{ background: t.surface, border: '1px solid ' + t.border, borderLeft: '3px solid ' + s.dot, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, fontFamily: t.mono, fontWeight: 700, letterSpacing: '0.05em', color: s.dot }}>{s.label.toUpperCase()}</span>
                  <span style={{ fontSize: 10.5, fontFamily: t.mono, color: t.ink3 }}>· {AREA[f.area] || f.area} · seen {when(f.first_seen)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 4, overflowWrap: 'anywhere' }}>{f.title}</div>
                <div style={{ fontSize: 12.5, color: t.ink2 || t.ink3, lineHeight: 1.55, marginBottom: 10, overflowWrap: 'anywhere' }}>{f.detail}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {FIX_LABEL[f.fix] && <button onClick={() => approve(f)} disabled={!!busy} style={btn(true)}>{busy === 'f' + f.id ? 'Fixing…' : FIX_LABEL[f.fix]}</button>}
                  {f.fix === 'reset_password' && <button onClick={() => resetPw(f)} disabled={!!busy} style={btn(true)}>{busy === 'f' + f.id ? 'Resetting…' : 'Give new password'}</button>}
                  {openKey && onNav && <button onClick={() => onNav(openKey)} style={btn(false)}>{OPEN_LABEL[openKey] || 'Open'}</button>}
                  <button onClick={() => dismiss(f)} disabled={!!busy} style={btn(false)}>{f.fix === 'merge_pupils' ? 'Different children — dismiss' : 'Dismiss'}</button>
                </div>
              </div>
            );
          })}
        </div>

        {closed.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setShowClosed(!showClosed)} style={{ background: 'transparent', border: 'none', color: t.ink3, fontSize: 12.5, cursor: 'pointer', padding: 0 }}>{showClosed ? '▾' : '▸'} Closed in the last 7 days ({closed.length})</button>
            {showClosed && (
              <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                {closed.map(f => (
                  <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5, color: t.ink3, borderBottom: '1px solid ' + t.border, padding: '6px 0', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: t.mono, fontSize: 10.5, minWidth: 74 }}>{f.status === 'fixed' ? 'FIXED' : f.status === 'dismissed' ? 'DISMISSED' : 'GONE'}</span>
                    <span style={{ flex: '1 1 260px', minWidth: 0, color: t.ink2 || t.ink }}>{f.title}</span>
                    <span>{f.closed_by === 'nia' ? 'no longer found' : (f.closed_by || '')} · {when(f.closed_at)}</span>
                    {f.status === 'dismissed' && <button onClick={() => dismiss(f, true)} disabled={!!busy} style={btn(false)}>Undo</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return { Alerts, useOpenCount, canSee, refresh };
})();

window.PD_Nia = PD_Nia;
