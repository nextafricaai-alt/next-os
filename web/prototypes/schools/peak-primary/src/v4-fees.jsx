import React from 'react';

/* src/v4-fees.jsx */
/* global React, PEAK, V4 */
// Peak Dark · Fees · reconciliation
// The accountant's workspace — incoming Mobile Money payments matched to student ledgers,
// AI handles the easy matches, humans handle the ambiguous ones.

const PD_Fees = (function () {
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

  function Fees({ embed = false, onNav, onRecordPayment } = {}) {
    const { useState, useEffect } = React;
    const [, force] = useState(0);
    const [tab, setTab] = useState('accounts');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStream, setSelectedStream] = useState('');
    const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
    const tenant = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'peak-primary';

    // Live store: real students + balances
    useEffect(() => { if (window.peakStore && window.peakStore.subscribe) return window.peakStore.subscribe(() => force(x => x + 1)); }, []);
    useEffect(() => { try { if (window.peakStore && window.peakStore.loadStudents && !(window.PEAK && window.PEAK.studentsLive)) window.peakStore.loadStudents(tenant); } catch (e) {} }, []);

    // Fee structure (per-class termly fee + requirements) — saved per school
    const [fs, setFs] = useState(null);
    const [fsId, setFsId] = useState(null);
    const [fsBusy, setFsBusy] = useState(false);
    const [fsSaved, setFsSaved] = useState(false);
    useEffect(() => {
      fetch(WK + '/os-data?kind=fee_structure&tenant=' + encodeURIComponent(tenant)).then(r => r.json()).then(d => {
        const rec = ((d && d.records) || [])[0];
        if (rec) { setFsId(rec.id); setFs((rec.payload && rec.payload.classes) || []); window.__FEE_STRUCTURE = rec.payload; }
        else setFs([]);
      }).catch(() => setFs([]));
    }, []);

    const students = (window.PEAK && window.PEAK.students) || [];
    const live = !!(window.PEAK && window.PEAK.studentsLive);
    const fmt = (n) => 'UGX ' + (Number(n) || 0).toLocaleString();
    const classKey = (stream) => { const m = String(stream || '').match(/^([A-Za-z]*\s*\d+)/); return m ? m[1].replace(/\s+/g, '').toUpperCase() : String(stream || '').toUpperCase(); };
    const feeForStream = (stream) => { if (!fs || !fs.length) return 0; const k = classKey(stream); const row = fs.find(r => classKey(r.name) === k); return row ? (Number(row.fee) || 0) : 0; };

    const withBal = students.filter(s => Number(s.balance) > 0).sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
    const outstanding = students.reduce((a, s) => a + (Number(s.balance) || 0), 0);
    const expected = (fs && fs.length) ? students.reduce((a, s) => a + feeForStream(s.stream), 0) : 0;
    const collected = expected > 0 ? Math.max(0, expected - outstanding) : 0;
    const collectionPct = expected > 0 ? Math.round((collected / expected) * 100) : null;
    const arrears = withBal.length;

    const displayList = (!searchTerm && !selectedStream) 
      ? withBal 
      : students.filter(s => {
          let m = true;
          if (searchTerm) m = m && String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase());
          if (selectedStream) m = m && s.stream === selectedStream;
          return m;
        }).sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));

    const remind = (s) => { const ph = String(s.guardianPhone || '').replace(/[^0-9]/g, ''); const msg = 'Dear ' + (s.guardian || 'Parent') + ', a gentle reminder regarding ' + (s.name || 'your child') + "'s school fees balance of " + fmt(s.balance) + ' at ' + ((window.__BRAND_NAME) || 'our school') + '. Thank you.'; if (ph) window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(msg), '_blank'); else window.peakToast && window.peakToast('No guardian phone on file', 'info', 'Add a phone number for ' + (s.name || 'this learner') + ' to send a reminder.'); };
    const recordPay = (s) => { if (onRecordPayment) return onRecordPayment(s); window.peakModal && window.peakModal.open(React.createElement(window.PEAK_FORMS.RecordPayment, { store: window.peakStore, defaultStudentId: s && s.id, defaultAmount: s && s.balance })); };

    // Fee-structure editing
    const suggestClasses = () => {
      const keys = []; students.forEach(s => { const k = classKey(s.stream); if (k && keys.indexOf(k) < 0) keys.push(k); });
      keys.sort();
      const rows = keys.map(k => { const ex = (fs || []).find(r => classKey(r.name) === k); return ex || { name: k, fee: '', requirements: '' }; });
      setFs(rows.length ? rows : [{ name: '', fee: '', requirements: '' }]);
    };
    const setRow = (i, key, val) => { const next = (fs || []).slice(); next[i] = { ...next[i], [key]: val }; setFs(next); };
    const addRow = () => setFs([...(fs || []), { name: '', fee: '', requirements: '' }]);
    const delRow = (i) => setFs((fs || []).filter((_, j) => j !== i));
    const saveFs = () => {
      setFsBusy(true);
      const clean = (fs || []).filter(r => String(r.name || '').trim()).map(r => ({ name: String(r.name).trim().toUpperCase(), fee: Number(r.fee) || 0, requirements: String(r.requirements || '').trim() }));
      const payload = { classes: clean, currency: 'UGX', per: 'term', updatedAt: new Date().toISOString() };
      const body = fsId ? { kind: 'fee_structure', tenant: tenant, record: payload, id: fsId } : { kind: 'fee_structure', tenant: tenant, record: payload };
      fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).then(res => {
        setFsBusy(false); if (res && res.record && res.record.id) setFsId(res.record.id);
        window.__FEE_STRUCTURE = payload; setFs(clean.length ? clean : []); setFsSaved(true); setTimeout(() => setFsSaved(false), 1800);
        window.peakToast && window.peakToast('Fee structure saved', 'success', 'Nia and the Fees view now use it.');
      }).catch(() => setFsBusy(false));
    };

    const KPI = ({ l, v, s, c }) => (
      <div style={{ background: T.surface, padding: '14px 16px' }}>
        <div style={{ fontSize: 10, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>{l.toUpperCase()}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: c || T.ink, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
        <div style={{ fontSize: 10.5, color: T.ink3, marginTop: 3, fontFamily: T.mono }}>{s}</div>
      </div>
    );

    return (
      <div style={{ width: embed ? '100%' : 1440, height: embed ? '100%' : 900, display: 'flex', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, overflow: 'hidden' }}>
        {!embed && <Rail active="fees" onNav={onNav} />}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <header style={{ padding: '22px 28px 0', borderBottom: '1px solid ' + T.border }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>FEES &amp; SCHOOL DUES</div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Fees</div>
                <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>{live ? (students.length + ' learners · ' + arrears + ' with a balance') : 'Import students & fees to see real accounts'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => window.peakModal && window.peakModal.open(React.createElement(window.PEAK_FORMS.FeesImport))} style={{ border: '1px solid ' + T.borderStr, background: 'transparent', color: T.ink2, padding: '8px 14px', borderRadius: 9, fontSize: 12.5, cursor: 'pointer' }}>Import fees</button>
                <button onClick={() => window.peakModal && window.peakModal.open(React.createElement(window.PEAK_FORMS.Receipts))} style={{ border: '1px solid ' + T.borderStr, background: 'transparent', color: T.ink2, padding: '8px 14px', borderRadius: 9, fontSize: 12.5, cursor: 'pointer' }}>Receipts</button>
                <button onClick={() => { const link = location.origin + '/pay.html?s=' + encodeURIComponent(tenant); const nm = (window.__BRAND_NAME) || 'our school'; const txt = 'Pay ' + nm + ' school fees securely (Mobile Money or card): ' + link; if (navigator.share) { navigator.share({ title: nm + ' — pay fees', text: txt, url: link }).catch(() => {}); } else { try { navigator.clipboard.writeText(link); window.peakToast && window.peakToast('Parent payment link copied', 'success', 'Share it with parents — payments auto-update here.'); } catch (e) { window.peakToast && window.peakToast('Parent link', 'info', link); } } }} style={{ border: '1px solid ' + (T.green || '#00c389'), background: 'transparent', color: (T.green || '#00c389'), padding: '8px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>⤤ Parent payment link</button>
                <button onClick={() => recordPay(null)} style={{ border: 'none', background: T.red, color: '#fff', padding: '9px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>+ Record payment</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['accounts', 'Accounts'], ['structure', 'Fee structure']].map(t => (
                <button key={t[0]} onClick={() => setTab(t[0])} style={{ background: 'transparent', border: 'none', borderBottom: '2px solid ' + (tab === t[0] ? T.red : 'transparent'), color: tab === t[0] ? T.ink : T.ink3, padding: '10px 6px', marginRight: 10, fontSize: 13.5, fontWeight: tab === t[0] ? 700 : 500, cursor: 'pointer' }}>{t[1]}</button>
              ))}
            </div>
          </header>

          {tab === 'accounts' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '16px 28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: T.border, borderRadius: 12, overflow: 'hidden', border: '1px solid ' + T.border }}>
                  <KPI l="Outstanding" v={fmt(outstanding)} s={arrears + ' account' + (arrears === 1 ? '' : 's')} c={outstanding > 0 ? T.redInk : T.good} />
                  <KPI l="Expected · term" v={expected > 0 ? fmt(expected) : '—'} s={expected > 0 ? 'from fee structure' : 'set fee structure'} c={T.ink} />
                  <KPI l="Collected · term" v={expected > 0 ? fmt(collected) : '—'} s={collectionPct != null ? (collectionPct + '% of expected') : 'needs fee structure'} c={T.good} />
                  <KPI l="Learners" v={live ? students.length : '—'} s={live ? 'live roster' : 'not imported yet'} c={T.ink} />
                </div>
              </div>
              <div style={{ padding: '0 28px 12px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <input 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="🔍 Search student name..." 
                  style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: T.ink, flex: 1, minWidth: 200, outline: 'none' }} 
                />
                <select 
                  value={selectedStream} 
                  onChange={e => setSelectedStream(e.target.value)} 
                  style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: T.ink, width: 200, outline: 'none' }}
                >
                  <option value="">All Streams</option>
                  {Array.from(new Set(students.map(s => s.stream).filter(Boolean))).sort().map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div style={{ padding: '0 28px 8px', fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.04em' }}>{searchTerm || selectedStream ? 'SEARCH RESULTS' : 'ACCOUNTS IN ARREARS'}</div>
              <div style={{ flex: 1, overflow: 'auto', padding: '0 28px 28px' }}>
                {!live ? (
                  <div style={{ padding: 40, textAlign: 'center', color: T.ink3 }}>No live fee data yet. Use <b>Import fees</b> to load real balances, then they appear here.</div>
                ) : displayList.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: (searchTerm || selectedStream) ? T.ink3 : T.good }}>{(searchTerm || selectedStream) ? 'No students match your search.' : '✓ Every learner is fully paid. Nothing outstanding.'}</div>
                ) : displayList.map((s, i) => (
                  <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: i % 2 ? T.surface : T.bg, border: '1px solid ' + T.border, marginBottom: 6 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.surface2, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: T.ink2, flexShrink: 0 }}>{String(s.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: T.ink3 }}>{s.stream || '—'}{s.guardian ? (' · ' + s.guardian) : ''}{feeForStream(s.stream) > 0 ? (' · class fee ' + fmt(feeForStream(s.stream))) : ''}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.redInk, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(s.balance)}</div>
                    <button onClick={() => remind(s)} style={{ border: '1px solid ' + T.borderStr, background: 'transparent', color: T.ink2, padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>Remind</button>
                    <button onClick={() => recordPay(s)} style={{ border: 'none', background: T.red, color: '#fff', padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Record</button>
                  </div>
                ))}
              </div>
            </div>

          ) : (
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px 28px' }}>
              <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6, marginBottom: 14, maxWidth: 640 }}>Set what each class pays per term and any requirements (uniform, books, lunch, etc.). This drives the collection figures above, the parent reminders, and what Nia knows about your fees.</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button onClick={suggestClasses} style={{ border: '1px solid ' + T.borderStr, background: 'transparent', color: T.ink2, padding: '8px 14px', borderRadius: 9, fontSize: 12.5, cursor: 'pointer' }}>↺ Suggest from my classes</button>
                <button onClick={addRow} style={{ border: '1px solid ' + T.borderStr, background: 'transparent', color: T.ink2, padding: '8px 14px', borderRadius: 9, fontSize: 12.5, cursor: 'pointer' }}>+ Add class</button>
              </div>
              {(!fs || !fs.length) ? (
                <div style={{ padding: 30, textAlign: 'center', color: T.ink3, border: '1px dashed ' + T.border, borderRadius: 12 }}>No fee structure yet. Tap <b>Suggest from my classes</b> to start from your real classes, then enter each termly fee.</div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 150px 1fr 40px', gap: 10, padding: '0 2px 8px', fontSize: 10.5, color: T.ink3, fontFamily: T.mono, fontWeight: 600, letterSpacing: '0.05em' }}>
                    <div>CLASS</div><div>FEE / TERM (UGX)</div><div>REQUIREMENTS</div><div></div>
                  </div>
                  {fs.map((r, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 150px 1fr 40px', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                      <input value={r.name || ''} onChange={e => setRow(i, 'name', e.target.value)} placeholder="P4" style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '9px 11px', fontSize: 13, color: T.ink, fontFamily: T.font, outline: 'none' }} />
                      <input value={r.fee || ''} onChange={e => setRow(i, 'fee', e.target.value.replace(/[^0-9]/g, ''))} placeholder="350000" inputMode="numeric" style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '9px 11px', fontSize: 13, color: T.ink, fontFamily: T.mono, outline: 'none' }} />
                      <input value={r.requirements || ''} onChange={e => setRow(i, 'requirements', e.target.value)} placeholder="2 reams of paper, a broom, lunch UGX 60,000" style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '9px 11px', fontSize: 13, color: T.ink, fontFamily: T.font, outline: 'none' }} />
                      <button onClick={() => delRow(i)} title="Remove" style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink3, borderRadius: 8, padding: '8px 0', fontSize: 14, cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                    <button onClick={saveFs} disabled={fsBusy} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{fsBusy ? 'Saving…' : 'Save fee structure'}</button>
                    {fsSaved && <span style={{ fontSize: 12.5, color: T.green }}>✓ Saved</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  return { Fees };
})();

window.PD_Fees = PD_Fees;

  