import React from 'react';

/* src/v4-peak-dark.jsx */
/* global React, PEAK */
// Variation D — "Peak Dark"
// Peak brand colours · deep navy surfaces · red signal · strong contrast
// Easy-to-scan reading: bigger type, more whitespace, clearer hierarchy

const V4 = (function () {
  const { useState } = React;
  const D = window.PEAK || window.PEAK_FALLBACK;

  const T = {
    // surfaces — Peak navy family
    bg:        '#0a1029',        // deepest
    surface:   '#0f1838',        // panel
    surface2:  '#16224a',        // raised
    surface3:  '#1d2c63',        // Peak navy (logo)
    border:    'rgba(255,255,255,0.08)',
    borderStr: 'rgba(255,255,255,0.16)',

    // text
    ink:       '#f5f6fa',
    ink2:      '#c4cae0',
    ink3:      '#8a91b0',
    ink4:      '#565d80',

    // brand
    navy:      '#1d2c63',
    navyLite:  '#3a4f9c',
    red:       '#e23a52',        // Peak red, slightly lifted for dark mode
    redSft:    'rgba(226,58,82,0.16)',
    redInk:    '#ff8095',

    // semantic
    good:      '#3dd68c',
    goodSft:   'rgba(61,214,140,0.14)',
    warn:      '#ffb53d',
    warnSft:   'rgba(255,181,61,0.14)',
    gold:      '#e8c87a',         // warm African accent

    font:      '"Inter", -apple-system, system-ui, sans-serif',
    serif:     '"Instrument Serif", Georgia, serif',
    mono:      '"JetBrains Mono", ui-monospace, monospace',
  };

  // ─── atoms ────────────────────────────────────────────────────────────────
  const Pill = ({ children, tone = 'neutral' }) => {
    const map = {
      neutral: { bg: T.surface2, fg: T.ink2 },
      good:    { bg: T.goodSft,  fg: T.good },
      warn:    { bg: T.warnSft,  fg: T.warn },
      bad:     { bg: T.redSft,   fg: T.redInk },
      brand:   { bg: 'rgba(58,79,156,0.30)', fg: '#a8b4e8' },
    }[tone];
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
        background: map.bg, color: map.fg, whiteSpace: 'nowrap',
      }}>{children}</span>
    );
  };

  const Card = ({ children, style, title, subtitle, action, pad = 22, accent }) => (
    <div style={{
      background: T.surface,
      border: '1px solid ' + T.border, borderRadius: 14,
      padding: pad, position: 'relative', overflow: 'hidden', ...style,
    }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent }} />}
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, letterSpacing: '-0.005em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: T.ink3, marginTop: 3, fontFamily: T.mono }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );

  // ─── sidebar ──────────────────────────────────────────────────────────────
  const navItems = [
    { k: 'dash',  label: 'Dashboard',     glyph: '◫', count: null },
    { k: 'stud',  label: 'Students',      glyph: '☰', countKey: 'students' },
    { k: 'attn',  label: 'Attendance',    glyph: '◐', count: null },
    { k: 'fees',  label: 'Fees',          glyph: '⌗', countKey: 'feesOutstandingStudents' },
    { k: 'comm',  label: 'Communications',glyph: '◊', count: null },
    { k: 'teach', label: 'Teachers',      glyph: '◇', count: null },
    { k: 'trans', label: 'Transport',     glyph: '⊕', count: null },
    { k: 'learn', label: 'Learning',      glyph: '◬', count: null },
    { k: 'rep',   label: 'Reports',       glyph: '⊜', count: null },
  ];

  function Sidebar({ active, setActive }) {
    return (
      <aside style={{
        width: 244, background: T.bg, borderRight: '1px solid ' + T.border,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* brand */}
        <div style={{ padding: '20px 18px 18px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0,
            boxShadow: '0 0 0 1px ' + T.borderStr,
          }}>
            <img src="./assets/peak-logo.png" alt="Peak" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
          <div style={{ lineHeight: 1.15, minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(typeof window!=='undefined'&&(window.__BRAND_NAME||window.__BRAND_FALLBACK))||'NEXT School OS'}</div>
            <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.04em' }}>{'NEXT · ' + (window.getSchoolCalendarLabel ? window.getSchoolCalendarLabel().termWeekStr.replace('Term ', 'T').replace(' · Week ', ' · WK') : 'T2')}</div>
          </div>
          {window.NiaBell ? React.createElement(window.NiaBell) : null}
        </div>

        {/* nav */}
        <nav style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.ink4, padding: '10px 10px 8px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.mono }}>Operations</div>
          {navItems.map(n => {
            const isActive = active === n.k;
            const liveCount = n.countKey ? ((window.PEAK && window.PEAK.kpis && window.PEAK.kpis[n.countKey]) || null) : n.count;
            return (
              <button key={n.k}
                onClick={() => setActive(n.k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 11px', borderRadius: 8, border: 'none',
                  background: isActive ? T.surface2 : 'transparent',
                  color: isActive ? T.ink : T.ink2,
                  fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer', textAlign: 'left', fontFamily: T.font, position: 'relative',
                }}>
                {isActive && <span style={{ position: 'absolute', left: -10, top: 8, bottom: 8, width: 3, background: T.red, borderRadius: 999 }} />}
                <span style={{ width: 18, color: isActive ? T.red : T.ink3, fontSize: 14, textAlign: 'center' }}>{n.glyph}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {liveCount != null && (
                  <span style={{
                    fontSize: 10.5, color: isActive ? T.ink : T.ink3,
                    fontFamily: T.mono, fontWeight: 600,
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    padding: '2px 7px', borderRadius: 999,
                  }}>{liveCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* AI shortcut */}
        {tut && tip && SCHOOL_TIPS[tip.k] && (
          <div style={{ position: 'fixed', left: tip.left, top: tip.top, zIndex: 600, maxWidth: 250, background: T.surface, border: '1px solid ' + T.red, borderRadius: 10, padding: '10px 12px', boxShadow: '0 12px 34px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: 10, fontFamily: T.mono, letterSpacing: 1.5, color: T.red, marginBottom: 5 }}>NIA \u00b7 TIP</div>
            <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>{SCHOOL_TIPS[tip.k]}</div>
          </div>
        )}
        <div style={{ padding: '0 12px 8px' }}>
          <button onClick={() => window.peakShareSchool && window.peakShareSchool()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 9, background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, cursor: 'pointer', textAlign: 'left', fontFamily: T.font, fontSize: 12.5 }}>
            <span>🔗</span><span>Share this school's app</span>
          </button>
        </div>
        <div style={{ padding: 12 }}>
          <button onClick={() => window.PEAK_ASKNEXT && window.PEAK_ASKNEXT.open()} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 12px', borderRadius: 10,
            background: 'linear-gradient(135deg, ' + T.surface3 + ' 0%, #2b3b85 100%)',
            border: '1px solid ' + T.borderStr, color: T.ink, cursor: 'pointer', textAlign: 'left',
            fontFamily: T.font,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 7, background: T.red, color: '#fff',
              display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, fontWeight: 700,
            }}>AI</span>
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Ask NEXT</div>
              <div style={{ fontSize: 10, color: T.ink3, fontFamily: T.mono }}>⌘K · anywhere</div>
            </div>
          </button>
        </div>

        {/* user */}
        <div style={{ padding: 12, borderTop: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, background: T.gold, color: T.bg, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{(window.PEAK_ROLE&&window.PEAK_ROLE.initials&&window.PEAK_ROLE.initials())||'SM'}</div>
          <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            <div style={{ color: T.ink, fontWeight: 600, fontSize: 12.5 }}>{(window.PEAK_ROLE&&window.PEAK_ROLE.getProfile&&window.PEAK_ROLE.getProfile().fullName)||'Director'}</div>
            <div style={{ fontSize: 10.5, color: T.ink3 }}>{(window.PEAK_ROLE&&window.PEAK_ROLE.roleLabel&&window.PEAK_ROLE.roleLabel())||'Director'}</div>
          </div>
          <span style={{ color: T.ink3, fontSize: 14 }}>⚙</span>
        </div>
      </aside>
    );
  }

  // ─── Global search (real: students, teachers, screens) ─────────────────────
  function GlobalSearch() {
    const [q, setQ] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const term = q.trim().toLowerCase();
    // window.PEAK.students/teachers only ever get populated by whichever
    // individual screen the user happens to be on triggering its own load —
    // GlobalSearch lives in the always-visible TopBar, so it needs to
    // guarantee that load itself instead of hoping some other screen did it
    // first (that's why searching for a real student/teacher right after
    // landing on "Today" returned nothing).
    React.useEffect(() => {
      try {
        const tenantId = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : null);
        if (!tenantId || !window.peakStore) return;
        if (!(window.PEAK && window.PEAK.studentsLive) && window.peakStore.loadStudents) window.peakStore.loadStudents(tenantId);
        if (!(window.PEAK && window.PEAK.teachersLive) && window.peakStore.loadTeachers) window.peakStore.loadTeachers(tenantId);
      } catch (e) {}
    }, []);
    const SCREENS = [['dash', 'Dashboard'], ['stud', 'Students'], ['attn', 'Attendance'], ['fees', 'Fees'], ['comm', 'Communications'], ['teach', 'Teachers'], ['trans', 'Transport'], ['learn', 'Learning'], ['rep', 'Reports'], ['finance', 'Finance'], ['timetable', 'Timetable'], ['today', 'Today']];
    let results = [];
    if (term) {
      const DD = window.PEAK || {};
      const feeKw = /owe|owing|overdue|balance|arrear|fees|debt|unpaid|outstanding/.test(term);
      (DD.students || []).forEach(st => { if ((st.name + ' ' + (st.guardian || '') + ' ' + (st.stream || '')).toLowerCase().indexOf(term) >= 0) results.push({ type: 'Student', label: st.name, sub: (st.stream || '') + (st.guardian ? (' · ' + st.guardian) : ''), run: () => window.peakOpenProfile && window.peakOpenProfile(st) }); });
      (DD.teachers || []).forEach(t => { if ((t.name + ' ' + ((t.subjects || []).join(' ')) + ' ' + (t.role || '')).toLowerCase().indexOf(term) >= 0) results.push({ type: 'Teacher', label: t.name, sub: ((t.subjects || []).join(', ')) || t.role || 'Teacher', run: () => window.peakNav && window.peakNav('teach') }); });
      // Fees — a named student's balance, or fee keywords list everyone owing
      (DD.students || []).forEach(st => { const bal = Number(st.balance) || 0; const named = (st.name || '').toLowerCase().indexOf(term) >= 0; if ((feeKw && bal > 0) || (named && bal > 0)) results.push({ type: 'Fee', label: st.name + ' — UGX ' + bal.toLocaleString() + ' due', sub: (st.stream || '') + ' · open Fees', run: () => window.peakNav && window.peakNav('fees') }); });
      // Messages — parent threads by parent, child or last message
      (DD.threads || []).forEach(th => { if ((th.name + ' ' + (th.child || '') + ' ' + (th.last || '')).toLowerCase().indexOf(term) >= 0) results.push({ type: 'Message', label: th.name, sub: (th.child ? (th.child + ' · ') : '') + (th.last || ''), run: () => window.peakNav && window.peakNav('comm') }); });
      SCREENS.forEach(([k, l]) => { if (l.toLowerCase().indexOf(term) >= 0) results.push({ type: 'Open', label: l, sub: 'Go to ' + l, run: () => window.peakNav && window.peakNav(k) }); });
      // de-dup identical labels, cap
      const seen = {}; results = results.filter(r => { const key = r.type + '|' + r.label; if (seen[key]) return false; seen[key] = 1; return true; }).slice(0, 12);
    }
    const go = (r) => { setOpen(false); setQ(''); try { r.run(); } catch (e) {} };
    return (
      <div style={{ position: 'relative', width: 340 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, background: T.surface, border: '1px solid ' + T.border }}>
          <span style={{ color: T.ink3, fontSize: 14 }}>{'\u2315'}</span>
          <input value={q} placeholder="Search students, teachers, fees, messages…" onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 160)} onKeyDown={e => { if (e.key === 'Enter' && results[0]) go(results[0]); if (e.key === 'Escape') setOpen(false); }} style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 13, color: T.ink, fontFamily: T.font }} />
          <span style={{ fontSize: 10, color: T.ink3, fontFamily: T.mono, border: '1px solid ' + T.border, borderRadius: 5, padding: '2px 6px' }}>{'\u2318K'}</span>
        </div>
        {open && term ? (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: T.surface, border: '1px solid ' + T.border, borderRadius: 10, boxShadow: '0 12px 30px rgba(0,0,0,0.4)', zIndex: 300, overflow: 'hidden', maxHeight: 360, overflowY: 'auto' }}>
            {results.length === 0 ? <div style={{ padding: '12px 14px', color: T.ink3, fontSize: 12.5 }}>No matches for “{q}”.</div> :
              results.map((r, i) => (
                <div key={i} onMouseDown={() => go(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderTop: i ? '1px solid ' + T.border : 'none' }}>
                  <span style={{ fontSize: 9.5, fontFamily: T.mono, color: T.ink3, border: '1px solid ' + T.border, borderRadius: 5, padding: '2px 6px', minWidth: 54, textAlign: 'center' }}>{r.type}</span>
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>{r.label}</div><div style={{ fontSize: 11, color: T.ink3 }}>{r.sub}</div></div>
                </div>
              ))}
          </div>
        ) : null}
      </div>
    );
  }

  // ─── top bar ──────────────────────────────────────────────────────────────
  function TopBar({ onNav }) {
    const [clockNow, setClockNow] = React.useState(() => new Date());
    React.useEffect(() => {
      const id = setInterval(() => setClockNow(new Date()), 30000);
      return () => clearInterval(id);
    }, []);
    const clockLabel = (function () {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const hh = String(clockNow.getHours()).padStart(2, '0');
      const mm = String(clockNow.getMinutes()).padStart(2, '0');
      return days[clockNow.getDay()] + ' ' + clockNow.getDate() + ' ' + months[clockNow.getMonth()] + ' · ' + hh + ':' + mm + ' EAT';
    })();
    return (
      <header style={{
        height: 64, borderBottom: '1px solid ' + T.border, background: T.bg,
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: 18, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: T.ink3 }}>
          <span>Dashboard</span>
          <span style={{ color: T.ink4 }}>›</span>
          <span style={{ color: T.ink }}>Today</span>
        </div>
        <span style={{ marginLeft: 6, fontFamily: T.mono, color: T.ink4, fontSize: 11.5 }}>{clockLabel}</span>
        <div style={{ flex: 1 }} />
        <GlobalSearch />
        <button onClick={() => window.peakExportRoster && window.peakExportRoster()} style={{ border: '1px solid ' + T.borderStr, background: T.surface2, padding: '8px 16px', borderRadius: 9, fontSize: 12.5, color: T.ink, cursor: 'pointer', fontWeight: 600, letterSpacing: '0.01em' }}>Export</button>
        <button onClick={() => onNav ? onNav('comm') : (window.peakNav && window.peakNav('comm'))} style={{ border: 'none', background: T.red, color: '#fff', padding: '9px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>+ New broadcast</button>
      </header>
    );
  }

  // ─── hero KPIs (the 3 big ones) ───────────────────────────────────────────
  function HeroKPIs({ period = 'Today' }) {
    const _D = (typeof D !== 'undefined' && D) ? D : (window.PEAK || {});
    const k = _D.kpis || {};
    const att = Number(k.attendancePct) || 0;
    const present = Math.min(Number(k.presentToday) || 0, Number(k.students) || 0);
    const collected = Number(k.feesCollectedTerm) || 0;
    const target = Number(k.feesTargetTerm) || 0;
    const feePct = target ? Math.round(100 * collected / target) : 0;
    const studs = _D.students || [];
    const outstanding = studs.reduce((a, s) => a + (Number(s.balance) || 0), 0);
    const fmt = _D.fmtUGXshort || (v => 'UGX ' + Number(v||0).toLocaleString());
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        {/* Attendance — featured with Peak red accent */}
        <div style={{
          background: 'linear-gradient(135deg, ' + T.surface3 + ' 0%, #243686 100%)',
          border: '1px solid ' + T.borderStr, borderRadius: 14, padding: 24, position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative ring */}
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 180, height: 180,
            borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)',
          }} />
          <div style={{
            position: 'absolute', top: -20, right: -20, width: 140, height: 140,
            borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)',
          }} />
          <div style={{ fontSize: 11, color: '#a8b4e8', fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 14 }}>
            ATTENDANCE · {period.toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 10 }}>
            <div style={{ fontFamily: T.font, fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 0.95, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}>
              {att > 0 ? att : '\u2014'}<span style={{ fontSize: 28, color: '#a8b4e8' }}>%</span>
            </div>
            {att > 0 ? <Pill tone={att >= 90 ? 'good' : 'warn'}>{att >= 90 ? 'strong' : 'watch'}</Pill> : null}
          </div>
          <div style={{ fontSize: 13, color: '#c8d0ea' }}>{att > 0 ? (present + ' of ' + (k.students || 0) + ' children marked in today') : ((k.students || 0) + ' enrolled · register not taken yet')}</div>
          {/* tiny dotted line */}
          <svg viewBox="0 0 320 36" style={{ width: '100%', height: 36, marginTop: 18, display: 'block' }}>
            <path d="M0,28 L40,22 L80,26 L120,18 L160,14 L200,20 L240,12 L280,8 L320,6"
              fill="none" stroke={T.red} strokeWidth="2" />
            <path d="M0,28 L40,22 L80,26 L120,18 L160,14 L200,20 L240,12 L280,8 L320,6 L320,36 L0,36 Z"
              fill="url(#redFade4)" />
            <defs>
              <linearGradient id="redFade4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={T.red} stopOpacity="0.35" />
                <stop offset="1" stopColor={T.red} stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="320" cy="6" r="4" fill={T.red} stroke="#fff" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Fees */}
        <Card pad={24}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 14 }}>FEES · {period === 'Today' ? 'TODAY' : period === 'Week' ? 'THIS WEEK' : 'TERM 2'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: T.ink, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{collected > 0 ? fmt(collected) : 'UGX 0'}</div>
          </div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 8, fontFamily: T.mono }}>{target > 0 ? ('of ' + fmt(target) + ' target · ' + feePct + '%') : 'collected this term'}</div>
          <div style={{ position: 'relative', height: 10, borderRadius: 999, background: T.surface2, marginTop: 18, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: (target ? feePct : 0) + '%', background: 'linear-gradient(90deg, ' + T.red + ' 0%, ' + T.gold + ' 100%)', borderRadius: 999 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: T.ink3, fontFamily: T.mono, marginTop: 6 }}>
            <span>{target ? (feePct + '% collected') : (collected > 0 ? 'collected' : 'no fees recorded')}</span>
            <span>{outstanding > 0 ? (fmt(outstanding) + ' outstanding') : 'cleared'}</span>
          </div>
        </Card>

        {/* Parent reach */}
        <Card pad={24}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 14 }}>PARENT REACH · {period.toUpperCase()}</div>
          {(window.PEAK && window.PEAK.live) ? (
            <div style={{ color: T.ink3, fontSize: 13, padding: '6px 0 2px', lineHeight: 1.5 }}>No messages sent yet. When you broadcast to guardians, delivery rate shows here.</div>
          ) : (
          <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 44, fontWeight: 700, color: T.ink, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>98.4<span style={{ fontSize: 22, color: T.ink3 }}>%</span></div>
            <Pill tone="good">delivered</Pill>
          </div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 8, fontFamily: T.mono }}>1,247 messages · WhatsApp first</div>
          <div style={{ display: 'flex', gap: 3, marginTop: 18 }}>
            {[...Array(40)].map((_, i) => (
              <div key={i} style={{
                width: 5, height: 24, borderRadius: 2,
                background: i < 39 ? (i % 7 === 6 ? T.gold : T.good) : T.surface2,
              }} />
            ))}
          </div>
          </React.Fragment>
          )}
        </Card>
      </div>
    );
  }

  // ─── secondary KPI strip ──────────────────────────────────────────────────
  function SecondaryKPIs({ period = 'Today' }) {
    const _D = (typeof D !== 'undefined' && D) ? D : (window.PEAK || {});
    const _k = _D.kpis || {};
    const _fmt = _D.fmtUGXshort || (v => 'UGX ' + Number(v||0).toLocaleString());
    const periodLabel = period === 'Today' ? 'today' : period === 'Week' ? 'this week' : 'this term';
    const items = [
      { l: period === 'Today' ? 'Absent today' : period === 'Week' ? 'Absent this week' : 'Absent this term', v: String(_k.absentToday || 0), sub: (_k.students ? Math.round(100*(_k.absentToday||0)/_k.students)+'% of roll' : 'no roster'), tone: 'warn' },
      { l: 'Overdue accounts', v: String(_k.feesOutstandingStudents || 0), sub: _fmt(Math.max(0,(_k.feesTargetTerm||0)-(_k.feesCollectedTerm||0))) + ' due', tone: 'bad' },
      { l: 'Fees collected', v: _fmt(_k.feesCollectedTerm || 0), sub: periodLabel, tone: 'good' },
      { l: 'At-risk learners', v: String((_D.students || []).filter(s => s.flag === 'risk' || (s.attendanceWk != null && s.attendanceWk < 70)).length), sub: 'need follow-up', tone: 'bad' },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {items.map(it => (
          <Card key={it.l} pad={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>{it.l}</span>
              <Pill tone={it.tone}>{it.tone === 'bad' ? 'action' : 'watch'}</Pill>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{it.v}</div>
            <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 6, fontFamily: T.mono }}>{it.sub}</div>
          </Card>
        ))}
      </div>
    );
  }

  // ─── attendance heat grid ─────────────────────────────────────────────────
  function AttendanceGrid() {
    const cellFor = (pct) => {
      if (pct >= 95) return { bg: 'rgba(61,214,140,0.20)', border: 'rgba(61,214,140,0.40)', fg: T.good };
      if (pct >= 88) return { bg: 'rgba(255,181,61,0.16)', border: 'rgba(255,181,61,0.35)', fg: T.warn };
      return { bg: 'rgba(226,58,82,0.18)', border: 'rgba(226,58,82,0.40)', fg: T.redInk };
    };
    const CLASS_ORDER = ['Primary Seven', 'Primary Six', 'Primary Five', 'Primary Four', 'Primary Three', 'Primary Two', 'Primary One', 'Top Class', 'Middle Class', 'Baby Class'];
    const _studs = (window.PEAK && window.PEAK.students) || [];
    const _cfg = window.SCHOOL_CONFIG || {};
    const _cfgCls = (_cfg.classes && _cfg.classes.length) ? _cfg.classes.slice() : [];
    const _studCls = Array.from(new Set(_studs.map(function (x) { return x.stream || x.class; }).filter(Boolean)));
    const _rawClasses = _cfgCls.length ? _cfgCls : _studCls;
    const _classes = _rawClasses.sort((a, b) => {
      const ia = CLASS_ORDER.indexOf(a);
      const ib = CLASS_ORDER.indexOf(b);
      return (ia !== -1 ? ia : 99) - (ib !== -1 ? ib : 99);
    });
    const _hasRoster = _studs.length > 0;
    const _rows = _classes.map(function (cls) {
      const inC = _studs.filter(function (x) { return (x.stream || x.class) === cls; });
      const wa = inC.filter(function (x) { return x.attendanceWk != null; });
      const pct = wa.length ? Math.round(wa.reduce(function (a, x) { return a + x.attendanceWk; }, 0) / wa.length) : null;
      return { cls: cls, total: inC.length, pct: pct };
    });
    return (
      <Card title="Attendance by class" subtitle={_hasRoster ? (_classes.length + ' classes · from your roster') : 'No roster yet'} action={
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: T.ink3, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: T.good }} /> 95%+</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: T.warn }} /> 88-94%</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: T.red }} /> &lt;88%</span>
        </div>
      }>
        {!_hasRoster ? (
          <div style={{ padding: '26px 22px', color: T.ink3, fontSize: 13, textAlign: 'center' }}>No students added yet. Import your roster (Students {'\u2192'} Import) and attendance by class shows up here.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {_rows.map(function (r) {
              const c = (r.pct == null) ? { bg: T.surface2, border: T.border, fg: T.ink3 } : cellFor(r.pct);
              return (
                <div key={r.cls} style={{ background: c.bg, border: '1px solid ' + c.border, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: T.mono }}>{r.cls}</span>
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: c.fg, fontVariantNumeric: 'tabular-nums', display: 'block' }}>{r.pct == null ? '\u2014' : (r.pct + '%')}</span>
                    <span style={{ fontSize: 10, color: T.ink3, fontFamily: T.mono }}>{r.total} learner{r.total === 1 ? '' : 's'}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  // ─── alerts + AI ──────────────────────────────────────────────────────────
  // Derive real, actionable signals from the live school data (replaces demo arrays).
  function _liveSignals() {
    const DD = window.PEAK || {}; const studs = DD.students || []; const k = DD.kpis || {};
    const overdue = studs.filter(s => (Number(s.balance) || 0) > 0 || (s.fees && s.fees !== 'paid'));
    const overdueTotal = overdue.reduce((a, s) => a + (Number(s.balance) || 0), 0);
    const atRisk = studs.filter(s => s.flag === 'risk' || (s.attendanceWk != null && s.attendanceWk < 70));
    const noPhone = studs.filter(s => !s.guardianPhone);
    const absent = Number(k.absentToday) || 0;
    const nav = (scr) => { if (window.peakNav) window.peakNav(scr); };
    const askNia = (q) => { if (window.PEAK_ASKNEXT) window.PEAK_ASKNEXT.open(q); };
    return { studs, overdue, overdueTotal, atRisk, noPhone, absent, nav, askNia, hasData: studs.length > 0 };
  }
  function _liveSuggestions() {
    const g = _liveSignals(); const out = [];
    if (!g.hasData) { out.push({ t: 'setup', text: 'Import your student roster to activate Nia', detail: 'No students yet — bring the dashboard to life', cta: 'Import', run: () => g.nav('stud') }); return out; }
    if (g.overdue.length) out.push({ t: 'fees', text: 'Draft fee reminders for ' + g.overdue.length + ' guardian' + (g.overdue.length === 1 ? '' : 's') + ' with balances', detail: (g.overdueTotal ? ('UGX ' + g.overdueTotal.toLocaleString() + ' outstanding') : 'Balances outstanding'), cta: 'Draft', run: () => g.askNia('Draft a warm WhatsApp fee reminder I can send to the ' + g.overdue.length + ' guardians who have outstanding balances.') });
    if (g.atRisk.length) out.push({ t: 'pastoral', text: 'Follow up on ' + g.atRisk.length + ' at-risk learner' + (g.atRisk.length === 1 ? '' : 's'), detail: g.atRisk.slice(0, 3).map(s => s.name).join(', ') + (g.atRisk.length > 3 ? '…' : ''), cta: 'Review', run: () => g.nav('stud') });
    if (g.absent > 0) out.push({ t: 'attendance', text: 'Check on ' + g.absent + ' child' + (g.absent === 1 ? '' : 'ren') + ' absent today', detail: 'Call or message their guardians', cta: 'Open', run: () => g.nav('attn') });
    if (g.noPhone.length) out.push({ t: 'data', text: 'Add guardian phone numbers for ' + g.noPhone.length + ' learner' + (g.noPhone.length === 1 ? '' : 's'), detail: 'Needed for WhatsApp + SMS alerts', cta: 'Fix', run: () => g.nav('stud') });
    if (!out.length) out.push({ t: 'clear', text: 'All clear — nothing urgent right now', detail: 'Nia is watching fees, attendance and at-risk learners', cta: 'Ask Nia', run: () => g.askNia('What should I focus on today?') });
    return out;
  }
  function _liveAlerts() {
    const g = _liveSignals(); const out = [];
    if (!g.hasData) return out;
    g.overdue.slice(0, 3).forEach(s => out.push({ id: 'od' + s.id, level: (Number(s.balance) || 0) > 300000 ? 'high' : 'med', text: s.name + ' — fees outstanding' + ((Number(s.balance) || 0) ? (' (UGX ' + Number(s.balance).toLocaleString() + ')') : ''), meta: (s.stream || '') + ' · guardian ' + (s.guardian || '—'), cta: 'Remind', run: () => { const ph = (s.guardianPhone || '').replace(/[^0-9]/g, ''); if (ph) window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent('Dear ' + (s.guardian || 'Parent') + ', a gentle reminder regarding ' + s.name + "'s school fees. Thank you."), '_blank'); else if (window.peakNav) window.peakNav('fees'); } }));
    g.atRisk.slice(0, 2).forEach(s => out.push({ id: 'ar' + s.id, level: 'med', text: s.name + ' — needs follow-up' + (s.attendanceWk != null ? (' (' + s.attendanceWk + '% attendance)') : ''), meta: (s.stream || '') + ' · pastoral check-in', cta: 'Open', run: () => { if (window.peakNav) window.peakNav('stud'); } }));
    if (g.absent > 0) out.push({ id: 'abs', level: g.absent > 5 ? 'high' : 'low', text: g.absent + ' child' + (g.absent === 1 ? '' : 'ren') + ' absent today', meta: 'Attendance · follow up with guardians', cta: 'Review', run: () => { if (window.peakNav) window.peakNav('attn'); } });
    return out;
  }

  function AlertsCard() {
    const items = _liveAlerts();
    return (
      <Card title="Action queue" subtitle={items.length ? (items.length + ' item' + (items.length === 1 ? '' : 's') + ' · from your live data') : 'Nothing urgent right now'} pad={0}>
        {items.length === 0 ? <div style={{ padding: '18px 22px', color: T.ink3, fontSize: 13 }}>Nothing needs action right now. As fees, attendance and at-risk signals appear, they show up here.</div> : (
        <div>
          {items.map((a, i) => {
            const cfg = a.level === 'high'
              ? { dot: T.red, bg: T.redSft, label: 'HIGH', labelBg: 'rgba(226,58,82,0.28)', labelFg: T.redInk }
              : a.level === 'med'
              ? { dot: T.warn, bg: 'transparent', label: 'MED', labelBg: T.warnSft, labelFg: T.warn }
              : { dot: T.ink4, bg: 'transparent', label: 'LOW', labelBg: T.surface2, labelFg: T.ink3 };
            return (
              <div key={a.id} style={{
                display: 'grid', gridTemplateColumns: '8px 50px 1fr auto', gap: 14, alignItems: 'center',
                padding: '14px 22px', borderTop: i ? '1px solid ' + T.border : 'none', background: cfg.bg,
                position: 'relative',
              }}>
                <div style={{ width: 3, alignSelf: 'stretch', background: cfg.dot, borderRadius: 999, marginTop: 4, marginBottom: 4 }} />
                <span style={{
                  fontSize: 9.5, fontFamily: T.mono, fontWeight: 700, color: cfg.labelFg,
                  background: cfg.labelBg, padding: '3px 7px', borderRadius: 4, textAlign: 'center', letterSpacing: '0.05em',
                }}>{cfg.label}</span>
                <div>
                  <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 500, lineHeight: 1.35 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginTop: 3 }}>{a.meta}</div>
                </div>
                <button onClick={() => { try { a.run && a.run(); } catch (e) {} }} style={{
                  background: a.level === 'high' ? T.red : T.surface2, color: a.level === 'high' ? '#fff' : T.ink,
                  border: 'none', padding: '7px 13px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>{a.cta} →</button>
              </div>
            );
          })}
        </div>
        )}
      </Card>
    );
  }

  // ─── fees breakdown card ──────────────────────────────────────────────────
  function FeesBreakdown() {
    const _D = (typeof D !== 'undefined' && D) ? D : (window.PEAK || {});
    const studs = _D.students || []; const k = _D.kpis || {};
    const collected = Number(k.feesCollectedTerm) || 0;
    const target = Number(k.feesTargetTerm) || 0;
    const outstanding = studs.reduce((a, s) => a + (Number(s.balance) || 0), 0);
    const owing = studs.filter(s => (Number(s.balance) || 0) > 0).length;
    const cleared = studs.filter(s => (Number(s.balance) || 0) === 0).length;
    const pct = target > 0 ? Math.min(100, Math.round(100 * collected / target)) : 0;
    return (
      <Card title="Fees this term" subtitle={target > 0 ? ('Collected vs target · ' + pct + '%') : 'From your fee records'}>
        {(!collected && !outstanding) ? (
          <div style={{ color: T.ink3, fontSize: 13, lineHeight: 1.5 }}>No fee data yet. Import the fees CSV or record payments, and this fills in automatically.</div>
        ) : (
          <div>
            {target > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: T.ink2 }}>Collected of target</span>
                  <span style={{ fontSize: 12.5, color: T.ink, fontFamily: T.mono, fontWeight: 600 }}>{D.fmtUGXshort(collected)} / {D.fmtUGXshort(target)}</span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: T.surface2 }}>
                  <div style={{ height: '100%', width: pct + '%', background: T.good, borderRadius: 999 }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 18, fontSize: 12, color: T.ink2, marginBottom: 4 }}>
              <span><span style={{ color: T.good }}>●</span> {cleared} cleared</span>
              <span><span style={{ color: T.redInk }}>●</span> {owing} owing</span>
            </div>
            <div style={{ marginTop: 14, padding: '12px 14px', background: T.surface2, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>Collected</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontVariantNumeric: 'tabular-nums' }}>{D.fmtUGXshort(collected)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>Outstanding</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: outstanding > 0 ? T.redInk : T.good, fontVariantNumeric: 'tabular-nums' }}>{D.fmtUGXshort(outstanding)}</div>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  }

  // ─── AI assistant card ────────────────────────────────────────────────────
  // Live "who is in school vs who is teaching right now" — Nia spots idle staff + uncovered classes.
  function StaffNowCard() {
    const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
    const tn = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'peak-primary';
    const [tt, setTt] = React.useState(null);
    const [staff, setStaff] = React.useState(null);
    const [teachers, setTeachers] = React.useState([]);
    const [, force] = React.useReducer(n => n + 1, 0);
    React.useEffect(() => {
      const load = () => {
        fetch(WK + '/os-data?kind=timetable&tenant=' + encodeURIComponent(tn)).then(r => r.json()).then(d => { const rec = ((d && d.records) || [])[0]; setTt((rec && rec.payload) || { periods: [], grid: {} }); }).catch(() => setTt({ periods: [], grid: {} }));
        fetch(WK + '/staff-status?tenant=' + encodeURIComponent(tn)).then(r => r.json()).then(d => setStaff((d && d.staff) || [])).catch(() => setStaff([]));
        fetch(WK + '/teachers?tenant=' + encodeURIComponent(tn)).then(r => r.ok ? r.json() : null).then(d => setTeachers((d && d.teachers) || [])).catch(() => {});
        // Fire a live no-show check (server dedups one alert per period) so the head gets pushed even before the cron runs.
        fetch(WK + '/attendance-watch?tenant=' + encodeURIComponent(tn)).catch(() => {});
      };
      load(); const iv = setInterval(() => force(), 60000); const lv = setInterval(load, 300000); return () => { clearInterval(iv); clearInterval(lv); };
    }, []);
    if (tt === null || staff === null) return null;
    const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; const day = DN[new Date().getDay()];
    const toM = (h) => { const m = String(h || '').match(/(\d{1,2}):(\d{2})/); return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : null; };
    const nowM = (new Date()).getHours() * 60 + (new Date()).getMinutes();
    const periods = (tt && tt.periods) || [];
    let curIdx = -1, curPeriod = null;
    periods.forEach((p, i) => { const a = toM(p.s), b = toM(p.e); if (a != null && b != null && nowM >= a && nowM < b) { curIdx = i; curPeriod = p; } });
    const presentNames = new Set((staff || []).filter(s => /in at/i.test(s.status || '') && !/checked out/i.test(s.status || '')).map(s => (s.name || '').toLowerCase()));
    let uncovered = [], idle = [], teachingNow = 0;
    const weekday = day !== 'Sat' && day !== 'Sun';
    if (curIdx >= 0 && tt && tt.grid && weekday) {
      const teachingEmails = new Set();
      Object.keys(tt.grid).forEach(cls => { const cell = ((tt.grid[cls] || {})[day] || [])[curIdx]; if (cell && cell.subject && cell.teacherEmail) {
        teachingEmails.add((cell.teacherEmail || '').toLowerCase());
        const tName = ((teachers || []).find(t => (t.email || '').toLowerCase() === (cell.teacherEmail || '').toLowerCase()) || {}).full_name || '';
        const present = tName && presentNames.has(tName.toLowerCase());
        if (!present) uncovered.push({ cls: cls, subject: cell.subject, teacher: tName || cell.teacherEmail });
      } });
      (teachers || []).forEach(t => { const nm = (t.full_name || '').toLowerCase(); const em = (t.email || '').toLowerCase(); if (presentNames.has(nm)) { if (teachingEmails.has(em)) teachingNow++; else idle.push(t.full_name); } });
    }
    const hasTT = periods.length > 0 && Object.keys((tt && tt.grid) || {}).length > 0;
    return (
      <Card pad={0} style={{ marginTop: 14 }}>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 26, height: 26, borderRadius: 7, background: T.red, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 10.5, fontWeight: 700 }}>AI</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Staff right now {curPeriod ? <span style={{ color: T.ink3, fontWeight: 400 }}>· Period {curPeriod.l} ({curPeriod.s}–{curPeriod.e})</span> : null}</div>
              <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>live · check-ins vs timetable</div>
            </div>
          </div>
          {!hasTT ? (
            <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.5 }}>Build the timetable (Timetable → Generate) so Nia can tell who should be teaching each period.</div>
          ) : !weekday ? (
            <div style={{ fontSize: 12.5, color: T.ink3 }}>Weekend — no lessons scheduled.</div>
          ) : curIdx < 0 ? (
            <div style={{ fontSize: 12.5, color: T.ink3 }}>No lesson period in session right now (break or before/after school).</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: T.ink2 }}>
                <span><b style={{ color: T.good }}>{teachingNow}</b> teaching now</span>
                <span><b style={{ color: idle.length ? T.warn : T.ink }}>{idle.length}</b> in school, free</span>
                <span><b style={{ color: uncovered.length ? T.red : T.ink }}>{uncovered.length}</b> classes uncovered</span>
              </div>
              {uncovered.length > 0 && (
                <div style={{ background: 'rgba(226,58,82,0.08)', border: '1px solid rgba(226,58,82,0.3)', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>
                  <b style={{ color: T.ink }}>Uncovered now:</b> {uncovered.slice(0, 3).map(u => u.cls + ' ' + u.subject + ' (' + (u.teacher || '?') + ' not in)').join('; ')}{uncovered.length > 3 ? '…' : ''}.
                  {idle.length > 0 ? <span> <b style={{ color: T.ink }}>{idle.slice(0, 2).join(', ')}</b> {idle.length === 1 ? 'is' : 'are'} in school and free — reassign to cover?</span> : null}
                </div>
              )}
              {uncovered.length === 0 && idle.length > 0 && (
                <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.5 }}><b style={{ color: T.ink }}>{idle.join(', ')}</b> {idle.length === 1 ? 'is' : 'are'} in school but not teaching this period (free).</div>
              )}
              {uncovered.length === 0 && idle.length === 0 && (
                <div style={{ fontSize: 12.5, color: T.good }}>✓ Every scheduled class has its teacher in. Nothing to action.</div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  function AICard() {
    return (
      <Card pad={0} style={{
        background: 'linear-gradient(150deg, ' + T.surface3 + ' 0%, ' + T.surface + ' 70%)',
        borderColor: T.borderStr,
      }}>
        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: T.red, color: '#fff',
              display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 12, fontWeight: 700,
            }}>AI</div>
            <div style={{ lineHeight: 1.15, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Suggestions for the next hour</div>
              <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>{_liveSuggestions().length} from your live school data</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {_liveSuggestions().map((s, i) => (
              <div key={i} style={{
                background: T.surface, border: '1px solid ' + T.border, borderRadius: 10,
                padding: '12px 14px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'flex-start',
              }}>
                <span style={{
                  fontSize: 10, fontFamily: T.mono, color: T.gold, background: 'rgba(232,200,122,0.14)',
                  borderRadius: 5, padding: '3px 8px', fontWeight: 700, marginTop: 1, letterSpacing: '0.05em',
                }}>{s.t.toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.4 }}>{s.text}</div>
                  <div style={{ fontSize: 11, color: T.ink3, marginTop: 4, fontFamily: T.mono }}>{s.detail}</div>
                </div>
                <button onClick={() => { try { s.run && s.run(); } catch (e) {} }} style={{
                  border: '1px solid ' + T.borderStr, background: 'transparent', color: T.ink,
                  padding: '5px 11px', borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>{s.cta || 'Open'}</button>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // ─── parent threads compact ───────────────────────────────────────────────
  function ThreadsCard() {
    const _D = (typeof D !== 'undefined' && D) ? D : (window.PEAK || {});
    const _threads = (window.PEAK && window.PEAK.live) ? [] : (_D.threads || []);
    if (_threads.length === 0) {
      return (
        <Card title="Parent threads" subtitle="No conversations yet" pad={0}>
          <div style={{ padding: '22px', color: T.ink3, fontSize: 13, lineHeight: 1.5 }}>No parent conversations yet. When guardians reply to your WhatsApp broadcasts, their threads appear here.</div>
        </Card>
      );
    }
    return (
      <Card title="Parent threads" subtitle="WhatsApp · recent replies" pad={0}>
        <div>
          {_threads.slice(0, 5).map((t, i) => (
            <div key={t.id} onClick={() => window.peakToast && window.peakToast('Thread with ' + t.name, 'info', t.child + ' · last: ' + t.last)} style={{
              display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12,
              padding: '12px 22px', borderTop: i ? '1px solid ' + T.border : 'none', alignItems: 'center',
              cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 999,
                background: t.preview === 'silent' ? T.redSft : 'rgba(255,255,255,0.06)',
                color: t.preview === 'silent' ? T.redInk : T.ink, display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 700,
              }}>{t.name.split(' ').slice(-1)[0][0]}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13.5, color: T.ink, fontWeight: 600 }}>{t.name}</span>
                  <span style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, marginLeft: 8 }}>{t.time}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ color: T.ink4 }}>{t.child} · </span>{t.last}
                </div>
              </div>
              {t.unread > 0 ? (
                <span style={{ background: T.red, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 8px' }}>{t.unread}</span>
              ) : t.preview === 'silent' ? (
                <Pill tone="bad">silent</Pill>
              ) : <span />}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // ─── compose ──────────────────────────────────────────────────────────────
  function Dashboard({ embed = false, onNav } = {}) {
    const [localActive, setLocalActive] = useState('dash');
    const active = 'dash';
    const setActive = onNav || setLocalActive;
    const [period, setPeriod] = useState('Today');
    return (
      <div className="today-shell" style={{
        width: embed ? '100%' : 1440, height: embed ? '100%' : 900,
        display: 'flex', background: T.bg, color: T.ink,
        fontFamily: T.font, fontSize: 13, overflow: 'hidden',
      }}>
        {!embed && <Sidebar active={active} setActive={setActive} />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TopBar onNav={onNav} />
          <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px 32px', background: T.bg }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
                  {window.getSchoolCalendarLabel ? window.getSchoolCalendarLabel().full : ''}
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
                  {(function(){var p=(window.PEAK_ROLE&&window.PEAK_ROLE.getProfile&&window.PEAK_ROLE.getProfile())||{};var n=((p.fullName||'').trim().split(' ')[0])||'there';var h=new Date().getHours();var g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';return g+', '+n+'.';})()}
                </div>
                <div style={{ fontSize: 14, color: T.ink2, marginTop: 8, maxWidth: 620 }}>
                  {((typeof D !== 'undefined' && D && D.kpis) || (window.PEAK && window.PEAK.kpis) || {}).presentToday || 0} of {((typeof D !== 'undefined' && D && D.kpis) || (window.PEAK && window.PEAK.kpis) || {}).students || 0} children on campus. Fees at {((typeof D !== 'undefined' && D && D.kpis) || (window.PEAK && window.PEAK.kpis) || {}).feesTargetTerm ? Math.round(100 * (((typeof D !== 'undefined' && D && D.kpis) || (window.PEAK && window.PEAK.kpis) || {}).feesCollectedTerm || 0) / (((typeof D !== 'undefined' && D && D.kpis) || (window.PEAK && window.PEAK.kpis) || {}).feesTargetTerm || 1)) : 0}%. {((typeof D !== 'undefined' && D && D.hasData) || (window.PEAK && window.PEAK.hasData)) ? 'Here is what needs your attention today.' : 'No roster imported yet — add students to bring this dashboard to life.'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, padding: 4, background: T.surface2, border: '1px solid ' + T.borderStr, borderRadius: 11 }}>
                {['Today','Week','Term 2'].map((p) => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    border: 'none',
                    background: period === p ? T.red : T.surface3,
                    color: period === p ? '#fff' : T.ink,
                    padding: '7px 16px', borderRadius: 8,
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                    letterSpacing: '0.01em',
                  }}>{p}</button>
                ))}
              </div>
            </div>

            <HeroKPIs period={period} />
            <SecondaryKPIs period={period} />

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
              <AttendanceGrid />
              <FeesBreakdown />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 14 }}>
              <AlertsCard />
              <ThreadsCard />
            </div>

            <AICard />
            <StaffNowCard />

            <div style={{ marginTop: 28, fontSize: 11, color: T.ink4, textAlign: 'center', fontFamily: T.mono, letterSpacing: '0.05em' }}>
              NEXT SCHOOL OS · POWERED BY NEXT · MULTI-TENANT SAAS
            </div>
          </main>
        </div>
      </div>
    );
  }

  return { Dashboard, T };
})();

window.V4 = V4;

  