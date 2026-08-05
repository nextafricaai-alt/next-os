import React from 'react';

/* src/v4-broadcast.jsx */
/* global React, PEAK, V4 */
// Peak Dark · Broadcast composer
// Director composes a parent message — AI helps with audience, drafting, translation, send timing.

// ─── Registration approval queue ────────────────────────────────────────
// student-enrollment-form.html and staff-hr-form.html POST here via the
// worker's /registrations/* routes (see cloudflare-worker/
// supabase-registration-requests.sql — new table, service-role only, no
// anon RLS policy since submissions can carry NIN/bank details). This is
// the Headteacher-facing approval step: on Approve, the worker itself
// provisions the real students/teachers row (+ class_assignments for
// teachers), with dedup/smart-merge against existing records.
function RegistrationApprovalCard() {
  const T = window.V4.T;
  const { useState, useEffect } = React;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [previewReq, setPreviewReq] = useState(null);

  const tenant = () => (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre');
  const profile = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || {};

  const load = () => {
    fetch(WK + '/registrations/list?tenant=' + encodeURIComponent(tenant()) + '&status=pending')
      .then(r => r.json()).then(out => { setRequests(out.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const sb = window.NextSession && window.NextSession.sb;
    if (!sb) return;
    const ch = sb.channel('reg-approval-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registration_requests', filter: 'tenant_id=eq.' + tenant() }, () => {
        load();
        window.peakToast && window.peakToast('New registration submitted — review below.', 'info');
      })
      .subscribe();
    const poll = setInterval(load, 20000); // fallback if realtime publication hasn't been enabled for this table yet
    return () => { try { sb.removeChannel(ch); } catch (e) {} clearInterval(poll); };
  }, []);

  const approve = async (id) => {
    setBusyId(id);
    try {
      const res = await fetch(WK + '/registrations/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reviewedBy: profile.fullName || 'Head Teacher' }),
      });
      const out = await res.json();
      if (out.error) { window.peakToast && window.peakToast('Could not approve: ' + out.error, 'error'); }
      else {
        window.peakToast && window.peakToast(
          out.action === 'merged' ? 'Matched an existing record — no duplicate created.' : 'Approved — profile & dashboard access created.',
          'success'
        );
        load();
        if (previewReq && previewReq.id === id) setPreviewReq(null);
      }
    } catch (e) { window.peakToast && window.peakToast('Could not reach the school system.', 'error'); }
    setBusyId(null);
  };

  const reject = async (id) => {
    setBusyId(id);
    try {
      await fetch(WK + '/registrations/reject', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reviewedBy: profile.fullName || 'Head Teacher' }),
      });
      window.peakToast && window.peakToast('Registration rejected.', 'info');
      load();
      if (previewReq && previewReq.id === id) setPreviewReq(null);
    } catch (e) {}
    setBusyId(null);
  };

  if (!loading && requests.length === 0) return null; // nothing pending — stay out of the way

  return (
    <div style={{ margin: '0 24px 20px', background: T.surface, border: '1px solid rgba(226,58,82,0.35)', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>📋 Pending Registrations</span>
        {requests.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: T.red, color: '#fff', borderRadius: 999, padding: '2px 8px' }}>{requests.length}</span>}
      </div>
      {loading ? (
        <div style={{ fontSize: 12.5, color: T.ink3 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {requests.map(r => {
            const p = r.payload || {};
            const name = r.type === 'student' ? p.name : p.full_name;
            const sub = r.type === 'student'
              ? (p.stream || 'no class specified') + (p.guardian ? ' · Guardian: ' + p.guardian : '')
              : (p.position || 'Teacher') + (p.classAssigned ? ' · ' + p.classAssigned : '') + (p.salary ? ' · UGX ' + p.salary : '');
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: T.surface2 || T.bg, borderRadius: 9 }}>
                <span style={{ fontSize: 16 }}>{r.type === 'student' ? '🎒' : '🧑‍🏫'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{name || 'Unnamed'} <span style={{ fontSize: 10.5, color: T.ink3, fontWeight: 400 }}>· {r.type}</span></div>
                  <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{sub}</div>
                </div>
                <button onClick={() => setPreviewReq(r)} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink, padding: '6px 12px', borderRadius: 7, fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}>View</button>
                <button onClick={() => reject(r.id)} disabled={busyId === r.id} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink3, padding: '6px 12px', borderRadius: 7, fontSize: 11.5, cursor: busyId === r.id ? 'wait' : 'pointer', fontWeight: 600 }}>Reject</button>
                <button onClick={() => approve(r.id)} disabled={busyId === r.id} style={{ background: T.good || '#00FC8F', border: 'none', color: T.bg || '#0A1029', padding: '6px 14px', borderRadius: 7, fontSize: 11.5, cursor: busyId === r.id ? 'wait' : 'pointer', fontWeight: 700 }}>{busyId === r.id ? '…' : 'Approve'}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.surface }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>Registration Details</div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{previewReq.type === 'student' ? 'Student Enrollment' : 'Staff HR Form'}</div>
              </div>
              <button onClick={() => setPreviewReq(null)} style={{ background: 'transparent', border: 'none', color: T.ink3, fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>
            
            {/* Body */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {previewReq.type === 'student' && previewReq.payload.photoDataUrl && (
                <div style={{ marginBottom: 20 }}>
                  <img src={previewReq.payload.photoDataUrl} alt="Photo" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '1px solid ' + T.border }} />
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                {Object.entries(previewReq.payload).map(([k, v]) => {
                  if (k === 'photoDataUrl') return null; // handled above
                  const displayKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // naive camelCase to Title Case
                  return (
                    <div key={k} style={{ gridColumn: (v && v.length > 40) ? 'span 2' : 'span 1' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{displayKey}</div>
                      <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.4, wordBreak: 'break-word' }}>{v || <span style={{ color: T.ink3, fontStyle: 'italic' }}>Not provided</span>}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid ' + T.border, display: 'flex', justifyContent: 'flex-end', gap: 12, background: T.surface2 || T.surface }}>
              <button onClick={() => reject(previewReq.id)} disabled={busyId === previewReq.id} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink3, padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: busyId === previewReq.id ? 'wait' : 'pointer', fontWeight: 600 }}>Reject</button>
              <button onClick={() => approve(previewReq.id)} disabled={busyId === previewReq.id} style={{ background: T.good || '#00FC8F', border: 'none', color: T.bg || '#0A1029', padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: busyId === previewReq.id ? 'wait' : 'pointer', fontWeight: 700 }}>{busyId === previewReq.id ? 'Processing…' : 'Approve'}</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
window.RegistrationApprovalCard = RegistrationApprovalCard;

const PD_Broadcast = (function () {
  const T = window.V4.T;
  const D = window.PEAK || window.PEAK_FALLBACK;
  const { useState } = React;

  function Rail({ active, onNav }) {
    const items = [
      { k: 'dash', glyph: '◫' }, { k: 'today', glyph: '◉' },
      { k: 'stud', glyph: '☰' }, { k: 'attn', glyph: '◐' },
      { k: 'fees', glyph: '⌗' }, { k: 'comm', glyph: '◊' }, { k: 'teach', glyph: '◇' },
    ];
    return (
      <aside style={{
        width: 72, background: T.bg, borderRight: '1px solid ' + T.border,
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', flexShrink: 0,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
          <img src="./assets/peak-logo.png" alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        </div>
        {items.map(n => {
          const a = active === n.k;
          return (
            <button key={n.k} onClick={() => onNav && onNav(n.k)} style={{
              width: 48, height: 44, borderRadius: 10, border: 'none',
              background: a ? T.surface2 : 'transparent', color: a ? T.red : T.ink3,
              fontSize: 18, cursor: 'pointer', marginBottom: 4, position: 'relative',
              display: 'grid', placeItems: 'center',
            }}>
              {a && <span style={{ position: 'absolute', left: -8, top: 10, bottom: 10, width: 3, background: T.red, borderRadius: 999 }} />}
              {n.glyph}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ width: 32, height: 32, borderRadius: 999, background: T.gold, color: T.bg, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>SM</div>
      </aside>
    );
  }

  function Pill({ children, tone }) {
    const map = {
      good: { bg: T.goodSft, fg: T.good },
      warn: { bg: T.warnSft, fg: T.warn },
      bad:  { bg: T.redSft,  fg: T.redInk },
      brand:{ bg: 'rgba(58,79,156,0.30)', fg: '#a8b4e8' },
      neutral: { bg: T.surface2, fg: T.ink2 },
    }[tone];
    return <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
      padding: '3px 9px', borderRadius: 999, background: map.bg, color: map.fg,
      fontFamily: T.mono, letterSpacing: '0.02em',
    }}>{children}</span>;
  }

  function Toggle({ on, onChange, label }) {
    return (
      <button onClick={() => onChange(!on)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9,
        background: on ? 'rgba(226,58,82,0.10)' : T.surface, border: '1px solid ' + (on ? 'rgba(226,58,82,0.40)' : T.border),
        color: T.ink, fontSize: 12, cursor: 'pointer', fontFamily: T.font, fontWeight: 500,
      }}>
        <span style={{
          width: 28, height: 16, borderRadius: 999, background: on ? T.red : T.surface2,
          position: 'relative', flexShrink: 0, transition: 'background 0.15s',
        }}>
          <span style={{
            position: 'absolute', top: 2, left: on ? 14 : 2, width: 12, height: 12, borderRadius: 999,
            background: '#fff', transition: 'left 0.15s',
          }} />
        </span>
        {label}
      </button>
    );
  }

  function Broadcast({ embed = false, onNav } = {}) {
    const { useState, useMemo, useEffect } = React;
    const school = (window.peakSchoolName && window.peakSchoolName()) || 'the school';
    const studs = (window.PEAK && window.PEAK.students) || [];
    const streams = Array.from(new Set(studs.map(s => s.stream).filter(Boolean))).sort();

    const [view, setView] = useState('broadcast');
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    
    const loadLogs = async () => {
      setLoadingLogs(true);
      const tenant = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'kabs-lily-junior-school-and-kindercare-centre';
      const sb = window.NextSession?.sb;
      if (sb) {
        const { data, error } = await sb.from('teacher_logs')
          .select('*')
          .eq('tenant_id', tenant)
          .order('recorded_at', { ascending: false });
        if (error) {
          console.error("Error fetching teacher logs:", error);
        }
        if (data) {
          setLogs(data.map(x => Object.assign({ _id: x.id }, x)));
        }
      }
      setLoadingLogs(false);
    };
    useEffect(() => { if (view === 'suggestions') loadLogs(); }, [view]);

    const [aud, setAud] = useState('overdue');
    const [stream, setStream] = useState(streams[0] || '');
    const [tpl, setTpl] = useState('overdue');
    const [edited, setEdited] = useState(null); // null = use template
    const [idx, setIdx] = useState(0);
    const [started, setStarted] = useState(false);
    const [logged, setLogged] = useState(false);
    const [lang, setLang] = useState('en'); // en | lg | both
    const [lgBase, setLgBase] = useState('');
    const [lgFor, setLgFor] = useState('');
    const [translating, setTranslating] = useState(false);

    const phoneOk = (s) => (String(s.guardianPhone || '').replace(/[^0-9]/g, '').length >= 9);

    const recipients = useMemo(() => {
      if (aud === 'overdue') return studs.filter(s => (Number(s.balance) || 0) > 0);
      if (aud === 'risk') return studs.filter(s => s.flag === 'risk' || (s.attendanceWk != null && s.attendanceWk < 70));
      if (aud === 'stream') return studs.filter(s => s.stream === stream);
      return studs.slice();
    }, [aud, stream, studs]);
    const reachable = recipients.filter(phoneOk);
    const noPhone = recipients.filter(s => !phoneOk(s));

    const AUDIENCES = [
      { k: 'overdue', l: 'Fees outstanding', sub: 'guardians whose child owes a balance' },
      { k: 'risk', l: 'At-risk learners', sub: 'low attendance or flagged' },
      { k: 'stream', l: 'One class', sub: 'pick a stream below' },
      { k: 'all', l: 'All guardians', sub: 'whole school' },
    ];
    const TEMPLATES = {
      overdue: 'Dear {{guardian}}, a gentle reminder that {{child}} ({{class}}) has a school-fees balance of UGX {{balance}}. Kindly clear it when you are able. Webale nnyo. — {{school}}',
      absent: 'Good morning {{guardian}}. {{child}} ({{class}}) has not been marked present today. Please let us know if all is well. — {{school}}',
      notice: 'Dear {{guardian}}, a notice from {{school}} regarding {{child}} ({{class}}): ',
      reports: 'Dear {{guardian}}, {{child}}’s ({{class}}) report is ready. Kindly visit the school to collect it. — {{school}}',
    };
    const baseMsg = (edited != null) ? edited : (TEMPLATES[tpl] || TEMPLATES.overdue);
    const fill = (s) => baseMsg
      .replace(/{{\s*guardian\s*}}/g, s.guardian || 'Parent')
      .replace(/{{\s*child\s*}}/g, (String(s.name || '').split(' ')[0]) || s.name || 'your child')
      .replace(/{{\s*class\s*}}/g, s.stream || '')
      .replace(/{{\s*balance\s*}}/g, (Number(s.balance) || 0).toLocaleString())
      .replace(/{{\s*school\s*}}/g, school);
    const fillLg = (s) => String(lgBase || '')
      .replace(/{{\s*guardian\s*}}/g, s.guardian || 'Parent')
      .replace(/{{\s*child\s*}}/g, (String(s.name || '').split(' ')[0]) || s.name || 'your child')
      .replace(/{{\s*class\s*}}/g, s.stream || '')
      .replace(/{{\s*balance\s*}}/g, (Number(s.balance) || 0).toLocaleString())
      .replace(/{{\s*school\s*}}/g, school);
    const lgReady = lgBase && lgFor === baseMsg;
    const finalMsg = (s) => {
      const en = fill(s);
      if (lang === 'en' || !lgReady) return en;
      const lg = fillLg(s);
      if (lang === 'lg') return lg;
      return en + '\n\n' + lg;
    };
    const translate = async () => {
      setTranslating(true);
      try {
        const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
        const r = await fetch(WK + '/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: baseMsg, lang: 'Luganda' }) }).then(r => r.json());
        if (r && r.text) { setLgBase(r.text); setLgFor(baseMsg); }
        else window.peakToast && window.peakToast('Could not translate', 'info', (r && r.error) || 'Try again in a moment.');
      } catch (e) { window.peakToast && window.peakToast('Translation failed', 'info', String(e && e.message || e)); }
      setTranslating(false);
    };

    const logBroadcast = (n) => {
      if (logged) return; setLogged(true);
      try {
        const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
        const prof = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || {};
        fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'comm_log', tenant: prof.tenantId || '', record: { audience: aud, stream: aud === 'stream' ? stream : null, count: n, channel: 'whatsapp', message: baseMsg, by: (prof.fullName || prof.email || ''), at: new Date().toISOString() } }) }).catch(() => {});
      } catch (e) {}
    };
    const sendNext = () => {
      if (idx >= reachable.length) return;
      const s = reachable[idx];
      const ph = String(s.guardianPhone || '').replace(/[^0-9]/g, '');
      if (ph) window.peakWhatsApp(ph, finalMsg(s));
      if (idx === 0) logBroadcast(reachable.length);
      setStarted(true); setIdx(idx + 1);
    };
    const copyNumbers = () => {
      const nums = reachable.map(s => String(s.guardianPhone || '').replace(/[^0-9]/g, '')).filter(Boolean).join(', ');
      try { navigator.clipboard.writeText(nums); window.peakToast && window.peakToast('Numbers copied', 'success', reachable.length + ' guardian numbers · paste into a WhatsApp broadcast list'); } catch (e) { window.prompt('Copy these numbers:', nums); }
    };
    const resetRun = () => { setIdx(0); setStarted(false); setLogged(false); };

    const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 };
    const done = started && idx >= reachable.length;
    const current = reachable[idx];

    return (
      <div style={{ width: embed ? '100%' : 1200, height: embed ? '100%' : 900, display: 'flex', flexDirection: 'column', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, overflow: 'auto' }}>
        <header style={{ padding: '22px 28px 16px', borderBottom: '1px solid ' + T.border }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>COMMUNICATIONS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button onClick={() => setView('broadcast')} style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', cursor: 'pointer', color: view === 'broadcast' ? T.ink : T.ink3 }}>Message guardians</button>
            <button onClick={() => setView('suggestions')} style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', cursor: 'pointer', color: view === 'suggestions' ? T.ink : T.ink3 }}>Suggestion Box & Logs</button>
          </div>
          {view === 'broadcast' && <div style={{ fontSize: 13, color: T.ink3, marginTop: 4, maxWidth: 640 }}>Pick who to reach, write the message once, and send each guardian a personalised WhatsApp. Numbers come straight from your real student roster.</div>}
          {view === 'suggestions' && <div style={{ fontSize: 13, color: T.ink3, marginTop: 4, maxWidth: 640 }}>Daily logs and suggestions submitted by teachers from their dashboard.</div>}
        </header>

        {view === 'broadcast' ? (
          <>
            {window.RegistrationApprovalCard && <div style={{ paddingTop: 20 }}><window.RegistrationApprovalCard /></div>}

            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: embed ? '1fr 1fr' : '1fr 1fr', gap: 18, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>1 &middot; Who are you reaching?</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {AUDIENCES.map(a => {
                  const on = aud === a.k;
                  return (
                    <button key={a.k} onClick={() => { setAud(a.k); resetRun(); }} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid ' + (on ? T.red : T.border), background: on ? 'rgba(226,58,82,0.08)' : 'transparent', color: T.ink, cursor: 'pointer' }}>
                      <span><span style={{ fontSize: 13, fontWeight: 600 }}>{a.l}</span><span style={{ display: 'block', fontSize: 11, color: T.ink3 }}>{a.sub}</span></span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: on ? T.red : T.ink3, fontFamily: 'ui-monospace,monospace' }}>{a.k === 'stream' ? (studs.filter(s => s.stream === stream).length) : (a.k === 'overdue' ? studs.filter(s => (Number(s.balance) || 0) > 0).length : a.k === 'risk' ? studs.filter(s => s.flag === 'risk' || (s.attendanceWk != null && s.attendanceWk < 70)).length : studs.length)}</span>
                    </button>
                  );
                })}
                {aud === 'stream' && (
                  <select value={stream} onChange={e => { setStream(e.target.value); resetRun(); }} style={{ marginTop: 4, width: '100%', background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: '9px 11px', fontSize: 13, color: T.ink, outline: 'none' }}>
                    {streams.length === 0 ? <option value="">No classes yet</option> : streams.map(st => <option key={st} value={st}>{st} ({studs.filter(s => s.stream === st).length})</option>)}
                  </select>
                )}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>2 &middot; The message</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {[['overdue', 'Fee reminder'], ['absent', 'Absent today'], ['notice', 'Notice'], ['reports', 'Report ready']].map(o => (
                  <button key={o[0]} onClick={() => { setTpl(o[0]); setEdited(null); }} style={{ border: '1px solid ' + (tpl === o[0] && edited == null ? T.red : T.border), background: 'transparent', color: tpl === o[0] && edited == null ? T.red : T.ink2, borderRadius: 999, padding: '5px 11px', fontSize: 12, cursor: 'pointer' }}>{o[1]}</button>
                ))}
              </div>
              <textarea value={baseMsg} onChange={e => setEdited(e.target.value)} style={{ width: '100%', minHeight: 120, background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: 11, fontSize: 13, color: T.ink, fontFamily: T.font, outline: 'none', lineHeight: 1.5 }} />
              <div style={{ fontSize: 10.5, color: T.ink4, fontFamily: T.mono, marginTop: 6 }}>Variables: {'{{guardian}} {{child}} {{class}} {{balance}} {{school}}'} — filled per guardian.</div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid ' + T.border }}>
                <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.04em', marginBottom: 7 }}>LANGUAGE</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[['en', 'English'], ['lg', 'Luganda'], ['both', 'Both']].map(o => (
                    <button key={o[0]} onClick={() => { setLang(o[0]); if (o[0] !== 'en' && lgFor !== baseMsg && !translating) translate(); }} style={{ border: '1px solid ' + (lang === o[0] ? T.red : T.border), background: 'transparent', color: lang === o[0] ? T.red : T.ink2, borderRadius: 999, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>{o[1]}</button>
                  ))}
                  {lang !== 'en' && (translating
                    ? <span style={{ fontSize: 11.5, color: T.ink3 }}>Translating…</span>
                    : (lgFor === baseMsg
                      ? <span style={{ fontSize: 11.5, color: T.good }}>✓ Luganda ready</span>
                      : <button onClick={translate} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 8, padding: '5px 11px', fontSize: 11.5, cursor: 'pointer' }}>↻ Translate to Luganda</button>))}
                </div>
                {lang !== 'en' && lgReady && <div style={{ marginTop: 8, fontSize: 11.5, color: T.ink3, lineHeight: 1.5, background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 10px', whiteSpace: 'pre-wrap' }}>{lgBase}</div>}
                {lang !== 'en' && lgFor !== baseMsg && !translating && <div style={{ marginTop: 6, fontSize: 10.5, color: T.warn }}>You edited the message — re-translate to refresh the Luganda version.</div>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>3 &middot; Send</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 9.5, color: T.ink4, fontFamily: T.mono }}>RECIPIENTS</div><div style={{ fontSize: 20, fontWeight: 700 }}>{recipients.length}</div></div>
                <div><div style={{ fontSize: 9.5, color: T.ink4, fontFamily: T.mono }}>REACHABLE ON WHATSAPP</div><div style={{ fontSize: 20, fontWeight: 700, color: T.good }}>{reachable.length}</div></div>
                <div><div style={{ fontSize: 9.5, color: T.ink4, fontFamily: T.mono }}>NO PHONE ON FILE</div><div style={{ fontSize: 20, fontWeight: 700, color: noPhone.length ? T.warn : T.ink3 }}>{noPhone.length}</div></div>
              </div>

              {reachable.length === 0 ? (
                <div style={{ fontSize: 12.5, color: T.ink3 }}>No guardians with a phone number in this group yet. Add guardian phones under Students, then come back.</div>
              ) : done ? (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 28 }}>{'✓'}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>All {reachable.length} opened in WhatsApp</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>Each guardian got a personalised message. Logged to your message history.</div>
                  <button onClick={resetRun} style={{ marginTop: 12, background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '8px 16px', fontSize: 12.5, cursor: 'pointer' }}>Start again</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 12, color: T.ink3, marginBottom: 8 }}>WhatsApp opens one chat at a time. Tap below for each guardian {'—'} the message is pre-filled, just press send in WhatsApp.</div>
                  {current && (
                    <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{current.guardian || 'Parent'} <span style={{ color: T.ink3, fontWeight: 400 }}>{'·'} guardian of {current.name} ({current.stream})</span></div>
                      <div style={{ fontSize: 11.5, color: T.ink2, marginTop: 6, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{finalMsg(current)}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={sendNext} style={{ background: '#00a884', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Open WhatsApp → {current ? (current.guardian || current.name) : ''} ({idx + 1}/{reachable.length})</button>
                    {started && idx < reachable.length && <button onClick={() => setIdx(idx + 1)} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink3, borderRadius: 9, padding: '10px 14px', fontSize: 12.5, cursor: 'pointer' }}>Skip</button>}
                    <button onClick={copyNumbers} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '10px 14px', fontSize: 12.5, cursor: 'pointer' }}>Copy all numbers</button>
                  </div>
                  <div style={{ height: 5, background: T.border, borderRadius: 999, marginTop: 12, overflow: 'hidden' }}><div style={{ width: (reachable.length ? (idx / reachable.length * 100) : 0) + '%', height: '100%', background: T.good }} /></div>
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Recipients</div>
              <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid ' + T.border, borderRadius: 9 }}>
                {recipients.length === 0 ? <div style={{ padding: 12, color: T.ink4, fontSize: 12.5 }}>No one in this group.</div> : recipients.map((s, i) => {
                  const ok = phoneOk(s);
                  return (
                    <div key={s.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 11px', borderBottom: i < recipients.length - 1 ? '1px solid ' + T.border : 'none' }}>
                      <div style={{ minWidth: 0 }}><div style={{ fontSize: 12.5, color: T.ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.guardian || 'Parent'} <span style={{ color: T.ink4 }}>{'·'} {s.name}</span></div><div style={{ fontSize: 10.5, color: T.ink4, fontFamily: 'ui-monospace,monospace' }}>{s.stream || ''} {ok ? ('· ' + s.guardianPhone) : '· no phone'}</div></div>
                      {ok ? <button onClick={() => window.peakWhatsApp(String(s.guardianPhone || '').replace(/[^0-9]/g, ''), finalMsg(s))} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 7, padding: '4px 10px', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>Open</button> : <span style={{ fontSize: 10.5, color: T.warn, flexShrink: 0 }}>add phone</span>}
                    </div>
                  );
                })}
              </div>
              {noPhone.length > 0 && <div style={{ fontSize: 11, color: T.warn, marginTop: 8 }}>{noPhone.length} guardian{noPhone.length === 1 ? '' : 's'} in this group have no phone on file {'—'} add their number under Students to reach them.</div>}
            </div>
          </div>
        </div>
        </>
        ) : (
          <div style={{ padding: 24 }}>
            <div style={{ maxWidth: 800 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={loadLogs} disabled={loadingLogs} style={{ background: 'transparent', border: '1px solid ' + T.borderStr, padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: loadingLogs ? 'default' : 'pointer', color: T.ink2, opacity: loadingLogs ? 0.6 : 1 }}>
                  {loadingLogs ? 'Refreshing...' : 'Refresh Logs'}
                </button>
              </div>
              {logs.length === 0 ? (
                 <div style={{ fontSize: 13, color: T.ink3, textAlign: 'center', padding: 40, border: '1px dashed ' + T.border, borderRadius: 12 }}>No logs or suggestions from teachers yet.</div>
              ) : logs.map(l => (
                 <div key={l._id} style={{ padding: 18, background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, marginBottom: 12 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                     <div style={{ fontWeight: 600, fontSize: 14 }}>{l.teacher_name || 'Teacher'}</div>
                     <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>{l.recorded_at ? new Date(l.recorded_at).toLocaleString() : ''}</div>
                   </div>
                   <div style={{ fontSize: 13, color: T.ink, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{l.message}</div>
                 </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return { Broadcast };
})();

window.PD_Broadcast = PD_Broadcast;

  