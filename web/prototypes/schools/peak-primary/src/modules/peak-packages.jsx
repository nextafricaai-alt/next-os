import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } from 'react';

// ── PRESENTATION MODE ── unlock every module + add-on for demos. Set to false to restore real tier gating.
  if (typeof window.__UNLOCK_ALL === 'undefined') window.__UNLOCK_ALL = true;
  const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  function prof() { return (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || { tenantId: 'peak-primary' }; }
  function tenant() { return window.getOSActiveTenant(); }
  function osGet(kind) { return fetch(WK + '/os-data?kind=' + kind + '&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => (d && d.records) || []).catch(() => []); }
  function osSave(kind, record, id) { return fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { kind, tenant: tenant(), record, id } : { kind, tenant: tenant(), record }) }).then(r => r.json()).catch(e => ({ error: String(e && e.message || e) })); }
  const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 };

  // ── Tiers ──
  const TIERS = [
    { id: 'foundation', name: 'Foundation', tagline: 'Run the school', price: 'UGX 400K / term', amount: 400000, order: 1,
      modules: ['today', 'dash', 'stud', 'attn', 'fees', 'exam', 'timetable', 'setup', 'teach', 'staff', 'rep', 'trans', 'plan'] },
    { id: 'momentum', name: 'Momentum', tagline: 'Grow the school', price: 'UGX 1.2M / term', amount: 1200000, order: 2, popular: true,
      modules: ['finance', 'comm', 'learn'], addons: ['parent_portal'] },
    { id: 'mastery', name: 'Mastery', tagline: 'Transform the school', price: 'UGX 3M / term', amount: 3000000, order: 3,
      modules: ['marking'], addons: ['predictive', 'ai_tutor', 'library', 'multibranch', 'whitelabel', 'biometric', 'emis'] },
  ];
  // À-la-carte add-ons available on any tier
  const ALACARTE = ['momo_pay', 'sms'];

  const ADDONS = {
    parent_portal: { name: 'Parent Portal', glyph: '👪', live: false, blurb: 'Parents see fees, attendance and reports — the biggest word-of-mouth lever.', tier: 'momentum' },
    momo_pay:      { name: 'Online Fee Payment', glyph: '⌗', live: false, blurb: 'Parents pay fees by Mobile Money inside the OS. You earn a small fee on every payment.', alacarte: true, needs: 'Flutterwave / MoMo merchant keys' },
    predictive:    { name: 'Predictive Analytics', glyph: '◹', live: true, blurb: 'Nia forecasts dropout risk, fee-default and performance from your live data.', tier: 'mastery' },
    ai_tutor:      { name: 'AI Student Tutor', glyph: '◬', live: true, blurb: 'Nia tutors a learner on any topic, at their level.', tier: 'mastery' },
    library:       { name: 'Library & Inventory', glyph: '▦', live: true, blurb: 'Track books, equipment and assets — who has what, what is due back.', tier: 'mastery' },
    multibranch:   { name: 'Multi-branch Console', glyph: '⊞', live: false, blurb: 'One view across every school in a foundation/network.', tier: 'mastery', needs: 'NEXT OS fleet link' },
    whitelabel:    { name: 'White-label + Domain', glyph: '◈', live: false, blurb: 'Your brand and your own domain on the whole OS.', tier: 'mastery', needs: 'a domain + brand assets' },
    biometric:     { name: 'Gate Attendance Kiosk', glyph: '⊡', live: false, testing: true, blurb: 'Face recognition + ID/QR check-in on a school tablet at the gate. Currently being tested by NEXT — it will be enabled for your school once proven.', tier: 'mastery' },
    emis:          { name: 'Board / Ministry Reports', glyph: '⊜', live: false, blurb: 'Compliance-ready EMIS export packs for the board and Ministry.', tier: 'mastery' },
    sms:           { name: 'SMS Fallback', glyph: '✉', live: false, blurb: 'Reach guardians without WhatsApp by SMS.', alacarte: true, needs: 'an SMS gateway' },
  };

  // ── Current package (per school) ──
  let _pkgCache = null; let _pkgId = null;
  function loadPackage() { return osGet('school_package').then(rs => { if (rs[0]) { _pkgId = rs[0].id; _pkgCache = rs[0].payload || {}; } return _pkgCache; }); }
  // Default to mastery so existing schools keep everything until an operator sets a real tier.
  function currentTier() { return (_pkgCache && _pkgCache.tier) || 'mastery'; }
  function currentAddons() { return (_pkgCache && _pkgCache.addons) || []; }
  function tierObj(id) { return TIERS.find(t => t.id === id) || TIERS[TIERS.length - 1]; }
  function includedModules(tierId) { const o = tierObj(tierId); let mods = []; TIERS.forEach(t => { if (t.order <= o.order) mods = mods.concat(t.modules || []); }); return mods; }
  function entitled(moduleKey) { if (window.__UNLOCK_ALL) return true; return includedModules(currentTier()).indexOf(moduleKey) >= 0; }
  function requiredTierFor(moduleKey) { const t = TIERS.find(t => (t.modules || []).indexOf(moduleKey) >= 0); return t ? t.id : 'mastery'; }
  function addonAvailable(key) {
    const a = ADDONS[key]; if (!a) return false;
    if (window.__UNLOCK_ALL) return true;
    if (currentAddons().indexOf(key) >= 0) return true; // explicitly purchased
    if (a.alacarte) return false; // à-la-carte must be purchased
    const o = tierObj(currentTier()); const need = tierObj(a.tier); return o.order >= need.order;
  }
  window.PEAK_ENTITLED = entitled; // expose for the sidebar

  // ── Upgrade gate (shown instead of a locked module) ──
  function Locked({ moduleKey, label, onNav }) {
    const need = tierObj(requiredTierFor(moduleKey));
    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, display: 'grid', placeItems: 'center', padding: 28 }}>
        <div style={{ ...card, maxWidth: 460, textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{label || 'This feature'} is on {need.name}</div>
          <div style={{ fontSize: 13.5, color: T.ink3, marginTop: 8, lineHeight: 1.6 }}>Your school is on <b>{tierObj(currentTier()).name}</b>. Upgrade to <b>{need.name}</b> — {need.tagline.toLowerCase()} — to unlock {label || 'this'}.</div>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.mono, marginTop: 6 }}>{need.price}</div>
          <button onClick={() => onNav && onNav('plan')} style={{ marginTop: 16, background: T.red, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>See plans &amp; upgrade →</button>
        </div>
      </div>
    );
  }

  // ── Gate wrapper used by the router ──
  function gate(moduleKey, label, el, onNav) { return entitled(moduleKey) ? el : <Locked moduleKey={moduleKey} label={label} onNav={onNav} />; }

  // ── Plan screen ──
  function Plan({ onNav }) {
    const [, force] = useReducerCompat();
    const [busy, setBusy] = useState(false);
    const tier = currentTier();
    const tObj = tierObj(tier);
    const isOperator = /head|admin|operator|owner/i.test(prof().role || '');
    const setTier = (id) => { setBusy(true); const rec = Object.assign({}, _pkgCache || {}, { tier: id, addons: currentAddons(), at: new Date().toISOString() }); osSave('school_package', rec, _pkgId).then(r => { if (r && r.record && r.record.id) _pkgId = r.record.id; _pkgCache = rec; setBusy(false); force(); window.peakToast && window.peakToast('Plan set to ' + tierObj(id).name, 'success', 'Modules updated.'); }); };
    const [paying, setPaying] = useState('');
    const subscribe = (need) => {
      setPaying(need.id);
      const prof2 = prof();
      fetch(WK + '/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant: tenant(), plan: need.id, email: (prof2.email || ''), redirect: location.origin + location.pathname + '?billing=return' }) })
        .then(r => r.json()).then(d => { setPaying(''); if (d && d.link) { window.location.href = d.link; } else { window.peakToast && window.peakToast('Could not start payment', 'info', (d && d.error) || 'Billing not set up yet.'); } })
        .catch(e => { setPaying(''); window.peakToast && window.peakToast('Payment error', 'info', String(e && e.message || e)); });
    };
    const upgradeMsg = subscribe;
    React.useEffect(() => {
      try {
        const qp = new URLSearchParams(location.search);
        const txid = qp.get('transaction_id'); const st = qp.get('status');
        if (qp.get('billing') === 'return' && txid) {
          window.peakToast && window.peakToast('Confirming payment…', 'info');
          fetch(WK + '/billing/verify?tx=' + encodeURIComponent(txid) + '&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(res => {
            if (res && res.ok) { window.PEAK_PACKAGES.loadPackage().then(() => force()); window.peakToast && window.peakToast('Subscription active 🎉', 'success', 'Your plan is now ' + (res.plan ? tierObj(res.plan).name : 'updated') + '.'); }
            else window.peakToast && window.peakToast('Payment not confirmed', 'info', (res && res.why) || st || '');
            try { history.replaceState(null, '', location.pathname); } catch (e) {}
          }).catch(() => {});
        }
      } catch (e) {}
    }, []);

    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, padding: '26px 28px 60px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>PLAN &amp; ADD-ONS</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>Your package</div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 6 }}>You're on <b style={{ color: T.ink }}>{tObj.name}</b> — {tObj.tagline.toLowerCase()}. {tObj.price}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {TIERS.map(t => {
            const on = t.id === tier; const owned = tierObj(tier).order >= t.order;
            return (
              <div key={t.id} style={{ ...card, border: '1px solid ' + (on ? T.red : T.border), position: 'relative' }}>
                {t.popular && <span style={{ position: 'absolute', top: -10, right: 12, fontSize: 9.5, fontFamily: T.mono, fontWeight: 700, background: T.gold || '#d8a200', color: '#1a1400', borderRadius: 999, padding: '2px 9px' }}>MOST POPULAR</span>}
                <div style={{ fontSize: 16, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: T.ink3 }}>{t.tagline}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginTop: 8, fontFamily: T.mono }}>{t.price}</div>
                <div style={{ marginTop: 10 }}>
                  {on ? <div style={{ fontSize: 12, color: T.good, fontWeight: 700 }}>● Your plan</div>
                    : owned ? <div style={{ fontSize: 12, color: T.ink4 }}>Included</div>
                    : <button onClick={() => subscribe(t)} disabled={paying === t.id} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{paying === t.id ? 'Opening…' : 'Subscribe / Pay →'}</button>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>What's unlocked</div>
          {[['today', 'Today'], ['stud', 'Students'], ['attn', 'Attendance'], ['fees', 'Fees & receipts'], ['exam', 'Exams & reports'], ['timetable', 'Timetable'], ['finance', 'Finance & payroll'], ['comm', 'Communications'], ['learn', 'Learning & coverage'], ['marking', 'AI exam marking']].map(m => {
            const ok = entitled(m[0]); const need = tierObj(requiredTierFor(m[0]));
            return (
              <div key={m[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid ' + T.border, fontSize: 12.5 }}>
                <span style={{ color: ok ? T.ink : T.ink4 }}>{ok ? '✓ ' : '🔒 '}{m[1]}</span>
                {!ok && <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.mono }}>{need.name}</span>}
              </div>
            );
          })}
        </div>

        <div style={{ ...card }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Add-ons</div>
          <div style={{ fontSize: 11.5, color: T.ink3, marginBottom: 12 }}>Extra powers — included on higher tiers, or added à la carte.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {Object.keys(ADDONS).map(k => { const a = ADDONS[k]; const avail = addonAvailable(k);
              return (
                <div key={k} style={{ border: '1px solid ' + (avail ? T.border : T.border), borderRadius: 10, padding: 12, opacity: avail ? 1 : 0.85 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{a.glyph} {a.name}</span>
                    {a.testing ? <span style={{ fontSize: 9.5, fontFamily: T.mono, color: T.gold || '#d8a200' }}>SOON</span> : avail ? <span style={{ fontSize: 9.5, fontFamily: T.mono, color: T.good }}>{a.live ? 'ACTIVE' : 'INCLUDED'}</span> : <span style={{ fontSize: 14 }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 6, lineHeight: 1.5 }}>{a.blurb}</div>
                  {a.testing
                    ? <div style={{ marginTop: 8, fontSize: 11, color: T.gold || '#d8a200' }}>🧪 In testing by NEXT — coming soon</div>
                    : avail
                    ? (a.live ? <button onClick={() => onNav && onNav('addon:' + k)} style={{ marginTop: 8, background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 7, padding: '5px 11px', fontSize: 11.5, cursor: 'pointer' }}>Open →</button>
                       : <div style={{ marginTop: 8, fontSize: 11, color: T.gold || '#d8a200' }}>{a.needs ? 'Set up: needs ' + a.needs : 'Ready to set up'}</div>)
                    : <div style={{ marginTop: 8, fontSize: 11, color: T.ink4, fontFamily: T.mono }}>{a.alacarte ? 'Add-on' : 'On ' + tierObj(a.tier).name}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...card, marginTop: 16, borderColor: T.border }}>
          <div style={{ fontSize: 11.5, color: T.ink3, marginBottom: 8 }}>Operator controls (NEXT) — set this school's package for testing:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TIERS.map(t => <button key={t.id} onClick={() => setTier(t.id)} disabled={busy} style={{ background: t.id === tier ? T.red : 'transparent', color: t.id === tier ? '#fff' : T.ink2, border: '1px solid ' + (t.id === tier ? T.red : T.border), borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{t.name}</button>)}
          </div>
        </div>
      </div>
    );
  }

  function useReducerCompat() { const [n, set] = useState(0); return [n, () => set(x => x + 1)]; }

  // ── Add-on screens ──
  function Shell({ title, eyebrow, children }) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, padding: '26px 28px 60px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>{eyebrow}</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{title}</div>
        </div>
        {children}
      </div>
    );
  }

  function Library() {
    const [items, setItems] = useState([]); const [f, setF] = useState({ name: '', category: 'Book', holder: '', due: '' }); const [recId, setRecId] = useState({});
    const load = useCallback(() => osGet('library_item').then(rs => setItems(rs.map(x => Object.assign({ _id: x.id }, x.payload)))), []);
    useEffect(load, [load]);
    const add = () => { if (!f.name.trim()) return; osSave('library_item', { name: f.name.trim(), category: f.category, holder: f.holder.trim(), due: f.due, addedAt: new Date().toISOString() }).then(() => { setF({ name: '', category: f.category, holder: '', due: '' }); load(); }); };
    const del = (it) => { fetch(WK + '/os-data/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it._id }) }).then(() => load()); };
    const inp = { background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: T.ink, outline: 'none' };
    return (
      <Shell eyebrow="ADD-ON · LIBRARY & INVENTORY" title="Library & inventory">
        <div style={{ ...card, marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...inp, flex: '1 1 180px' }} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Item (e.g. P5 Math textbook, laptop #4)" />
          <select style={inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{['Book', 'Equipment', 'Furniture', 'Sports', 'Lab', 'Other'].map(c => <option key={c}>{c}</option>)}</select>
          <input style={{ ...inp, flex: '1 1 130px' }} value={f.holder} onChange={e => setF({ ...f, holder: e.target.value })} placeholder="Held by (optional)" />
          <input style={inp} type="date" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} />
          <button onClick={add} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
        </div>
        <div style={card}>
          {items.length === 0 ? <div style={{ color: T.ink4, fontSize: 13 }}>No items yet. Add books, equipment or assets above.</div> : items.map((it, i) => (
            <div key={it._id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr 110px 30px', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: i ? '1px solid ' + T.border : 'none', fontSize: 12.5 }}>
              <span style={{ color: T.ink, fontWeight: 600 }}>{it.name}</span>
              <span style={{ color: T.ink3, fontFamily: T.mono, fontSize: 11 }}>{it.category}</span>
              <span style={{ color: it.holder ? T.warn : T.ink4 }}>{it.holder ? 'with ' + it.holder : 'in store'}</span>
              <span style={{ color: T.ink3, fontFamily: T.mono, fontSize: 11 }}>{it.due ? 'due ' + it.due : ''}</span>
              <button onClick={() => del(it)} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink4, borderRadius: 6, width: 24, height: 24, cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  function askNia(system, userText) {
    return fetch(WK + '/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: system, messages: [{ role: 'user', content: userText }] }) })
      .then(r => r.json()).then(d => ((d && d.content) || []).filter(c => c.type === 'text').map(c => c.text).join('') || (d && d.error) || '').catch(e => 'Could not reach Nia: ' + (e.message || e));
  }

  function Predictive() {
    const [out, setOut] = useState(''); const [busy, setBusy] = useState(false);
    const run = () => {
      setBusy(true);
      const D = window.PEAK || {}; const k = D.kpis || {}; const studs = D.students || [];
      const overdue = studs.filter(s => (Number(s.balance) || 0) > 0).length;
      const atRisk = studs.filter(s => s.flag === 'risk' || (s.attendanceWk != null && s.attendanceWk < 70)).length;
      const sys = 'You are Nia, a Ugandan schools data analyst. From the figures, give SHORT, concrete predictions a head can act on: dropout risk, fee-default risk, and performance trajectory. Name the number of learners at risk and the single highest-impact action for each. No fluff, no markdown headers.';
      const txt = 'School: ' + ((window.__BRAND_NAME) || 'school') + '. Students: ' + studs.length + '. Fees outstanding (learners): ' + overdue + '. At-risk (attendance<70% or flagged): ' + atRisk + '. Term fees collected: ' + (k.feesCollectedTerm || 0) + ' of target ' + (k.feesTargetTerm || 0) + '. Give: 1) Dropout risk, 2) Fee-default risk, 3) Performance outlook — each 1-2 lines with a number and an action.';
      askNia(sys, txt).then(t => { setOut(t); setBusy(false); });
    };
    return (
      <Shell eyebrow="ADD-ON · PREDICTIVE ANALYTICS" title="Nia's forecasts">
        <div style={{ ...card }}>
          <div style={{ fontSize: 13, color: T.ink3, marginBottom: 12 }}>Nia reads your live enrolment, attendance and fees and forecasts where trouble is coming — so you act before it lands.</div>
          <button onClick={run} disabled={busy} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Nia is analysing…' : '✦ Run forecast'}</button>
          {out && <div style={{ marginTop: 14, fontSize: 13, color: T.ink2, lineHeight: 1.7, whiteSpace: 'pre-wrap', background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: 14 }}>{out}</div>}
        </div>
      </Shell>
    );
  }

  function AITutor() {
    const [msgs, setMsgs] = useState([]); const [q, setQ] = useState(''); const [busy, setBusy] = useState(false);
    const send = () => {
      if (!q.trim()) return; const question = q.trim(); setQ(''); setMsgs(m => m.concat([{ role: 'me', text: question }])); setBusy(true);
      const sys = 'You are Nia, a patient Ugandan tutor for primary and secondary learners (NCDC syllabus). Explain simply, step by step, at the learner\'s level, with a worked example and one practice question. Encourage. Keep it short.';
      askNia(sys, question).then(t => { setMsgs(m => m.concat([{ role: 'nia', text: t }])); setBusy(false); });
    };
    return (
      <Shell eyebrow="ADD-ON · AI STUDENT TUTOR" title="Ask Nia to teach">
        <div style={{ ...card, maxWidth: 720 }}>
          <div style={{ minHeight: 120, maxHeight: 360, overflow: 'auto', marginBottom: 12 }}>
            {msgs.length === 0 ? <div style={{ color: T.ink4, fontSize: 13 }}>Ask anything — "Explain how to add fractions", "What is photosynthesis for P6?", "Help me with a UACE Physics question on projectiles".</div>
              : msgs.map((m, i) => <div key={i} style={{ margin: '8px 0', textAlign: m.role === 'me' ? 'right' : 'left' }}><span style={{ display: 'inline-block', maxWidth: '85%', background: m.role === 'me' ? T.red : T.bg, color: m.role === 'me' ? '#fff' : T.ink, border: '1px solid ' + T.border, borderRadius: 12, padding: '9px 12px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'left' }}>{m.text}</span></div>)}
            {busy && <div style={{ color: T.ink4, fontSize: 12 }}>Nia is thinking…</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Type a question…" style={{ flex: 1, background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: '10px 12px', fontSize: 13, color: T.ink, outline: 'none' }} />
            <button onClick={send} disabled={busy} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ask</button>
          </div>
        </div>
      </Shell>
    );
  }

  function Activate({ addonKey }) {
    const a = ADDONS[addonKey] || { name: 'Add-on', blurb: '' };
    return (
      <Shell eyebrow={'ADD-ON · ' + a.name.toUpperCase()} title={a.name}>
        <div style={{ ...card, maxWidth: 560 }}>
          <div style={{ fontSize: 38 }}>{a.glyph}</div>
          <div style={{ fontSize: 14, color: T.ink2, marginTop: 10, lineHeight: 1.6 }}>{a.blurb}</div>
          <div style={{ marginTop: 14, padding: 12, background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, fontSize: 12.5, color: T.ink3 }}>
            This add-on is part of your plan. To switch it on it needs {a.needs || 'a quick setup'} — connect that and it goes live. Nothing here is simulated; it activates with the real connection.
          </div>
          <button onClick={() => { const ph = '256700000000'; window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent('Hello NEXT, please help us set up ' + a.name + ' for ' + ((window.__BRAND_NAME) || 'our school') + '.'), '_blank'); }} style={{ marginTop: 14, background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Request setup →</button>
        </div>
      </Shell>
    );
  }

  function GateLaunch() {
    const url = '/gate.html?s=' + encodeURIComponent(tenant());
    return (
      <Shell eyebrow="ADD-ON · GATE ATTENDANCE KIOSK" title="Gate Attendance Kiosk">
        <div style={{ ...card, maxWidth: 640 }}>
          <div style={{ fontSize: 38 }}>⊡</div>
          <div style={{ fontSize: 14, color: T.ink2, marginTop: 10, lineHeight: 1.6 }}>A separate full-screen app for a tablet at your gate. A learner faces it → Nia recognises them, logs their arrival, and shows their fees and greeting. If the face isn't recognised, scan their ID/QR card; if all else fails, look them up by name.</div>
          <div style={{ marginTop: 14, padding: 12, background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, fontSize: 12.5, color: T.ink3, lineHeight: 1.6 }}>
            <b style={{ color: T.ink }}>Set up once:</b> open it on the school tablet, tap <b>Enrol faces</b>, and capture each learner's face (stores a signature, not the photo). After that the gate recognises them automatically.<br /><br />
            <b style={{ color: T.ink }}>Fingerprint</b> needs a USB/Bluetooth scanner + bridge — face &amp; ID work on any tablet today.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <a href={url} target="_blank" rel="noopener" style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '11px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>Open the Gate kiosk →</a>
            <button onClick={() => { try { navigator.clipboard.writeText(location.origin + url); window.peakToast && window.peakToast('Kiosk link copied', 'success', 'Open it on the school tablet & add to home screen.'); } catch (e) {} }} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '11px 16px', fontSize: 13, cursor: 'pointer' }}>Copy tablet link</button>
          </div>
          <div style={{ fontSize: 11, color: T.ink4, marginTop: 10 }}>On the tablet, open the link in Chrome → menu → "Add to Home screen" to install it as its own kiosk app.</div>
        </div>
      </Shell>
    );
  }
  function Addon({ addonKey }) {
    if (addonKey === 'library') return <Library />;
    if (addonKey === 'predictive') return <Predictive />;
    if (addonKey === 'ai_tutor') return <AITutor />;
    if (addonKey === 'biometric') return (
      <Shell eyebrow="ADD-ON · GATE ATTENDANCE KIOSK" title="Gate Attendance Kiosk">
        <div style={{ ...card, maxWidth: 560 }}>
          <div style={{ fontSize: 38 }}>🧪</div>
          <div style={{ fontSize: 14, color: T.ink2, marginTop: 10, lineHeight: 1.6 }}>Face-recognition + ID/QR gate check-in on a school tablet. NEXT is testing this now — once it's proven, we'll switch it on for your school. You'll be among the first to know.</div>
        </div>
      </Shell>
    );
    return <Activate addonKey={addonKey} />;
  }

export { TIERS, ADDONS, loadPackage, currentTier, entitled, requiredTierFor, addonAvailable, gate, Locked, Plan, Addon, tierObj };
