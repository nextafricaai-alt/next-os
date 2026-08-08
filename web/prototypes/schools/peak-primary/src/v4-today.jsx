import React from 'react';

/* src/v4-today.jsx */
/* global React, PEAK, V4 */
// Peak Dark · Director's morning ritual — the screen Sarah opens at 07:00
// Focused, chronological, one-thing-at-a-time. Less dashboard, more checklist.

const PD_Today = (function () {
  const T = window.V4.T;
  const D = window.PEAK || window.PEAK_FALLBACK;
  const { useState } = React;

  // Reusable left rail (compact version of the V4 sidebar)
  function Rail({ active, onNav }) {
    const items = [
      { k: 'dash',  glyph: '◫', label: 'Dashboard' },
      { k: 'today', glyph: '◉', label: 'Today' },
      { k: 'stud',  glyph: '☰', label: 'Students' },
      { k: 'attn',  glyph: '◐', label: 'Attendance' },
      { k: 'fees',  glyph: '⌗', label: 'Fees' },
      { k: 'comm',  glyph: '◊', label: 'Comms' },
      { k: 'teach', glyph: '◇', label: 'Teachers' },
    ];
    return (
      <aside style={{
        width: 72, background: T.bg, borderRight: '1px solid ' + T.border,
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', marginBottom: 18,
        }}>
          <img src={window.__BRAND_LOGO || "/prototypes/schools/peak-primary/assets/peak-logo.png"} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        </div>
        {items.map(n => {
          const a = active === n.k;
          return (
            <button key={n.k} title={n.label} onClick={() => onNav && onNav(n.k)} style={{
              width: 48, height: 44, borderRadius: 10, border: 'none',
              background: a ? T.surface2 : 'transparent', color: a ? T.red : T.ink3,
              fontSize: 18, cursor: 'pointer', marginBottom: 4,
              display: 'grid', placeItems: 'center', position: 'relative',
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

  // AI composer at the bottom of the co-pilot rail
  function AIComposer() {
    const [val, setVal] = useState('');
    const send = () => {
      if (!val.trim()) return;
      if (window.PEAK_ASKNEXT) window.PEAK_ASKNEXT.open(val);
      setVal('');
    };
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        background: T.bg, border: '1px solid ' + T.border, borderRadius: 12,
      }}>
        <input
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Ask anything about your school…"
          style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 13, color: T.ink, fontFamily: T.font }}
        />
        <button onClick={send} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: T.red, color: '#fff', fontSize: 13, cursor: 'pointer' }}>↑</button>
      </div>
    );
  }

  function Pill({ children, tone }) {
    const map = {
      good:  { bg: T.goodSft, fg: T.good },
      warn:  { bg: T.warnSft, fg: T.warn },
      bad:   { bg: T.redSft,  fg: T.redInk },
      brand: { bg: 'rgba(58,79,156,0.30)', fg: '#a8b4e8' },
      neutral: { bg: T.surface2, fg: T.ink2 },
    }[tone];
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
        padding: '3px 9px', borderRadius: 999, background: map.bg, color: map.fg, fontFamily: T.mono, letterSpacing: '0.02em',
      }}>{children}</span>
    );
  }

  // ─── individual ritual step ───────────────────────────────────────────────
  function Step({ idx, time, title, status, body, action, body2 }) {
    const cfg = {
      done:    { ring: T.good,   tag: 'DONE',    pill: 'good' },
      now:     { ring: T.red,    tag: 'NOW',     pill: 'bad' },
      next:    { ring: T.gold,   tag: 'NEXT',    pill: 'warn' },
      later:   { ring: T.ink4,   tag: 'LATER',   pill: 'neutral' },
    }[status];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 18, position: 'relative' }}>
        {/* timeline column */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 999,
            background: status === 'done' ? cfg.ring : T.bg,
            border: '2px solid ' + cfg.ring,
            color: status === 'done' ? T.bg : cfg.ring,
            display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 13, fontWeight: 700,
            zIndex: 2, position: 'relative',
          }}>{status === 'done' ? '✓' : idx}</div>
          <div style={{ flex: 1, width: 2, background: T.border, marginTop: -2 }} />
        </div>
        {/* content column */}
        <div style={{ paddingBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <span style={{ fontFamily: T.mono, fontSize: 13, color: T.ink3, fontWeight: 600 }}>{time}</span>
            <Pill tone={cfg.pill}>{cfg.tag}</Pill>
          </div>
          <div style={{
            background: status === 'now' ? 'linear-gradient(150deg, ' + T.surface3 + ' 0%, ' + T.surface + ' 70%)' : T.surface,
            border: '1px solid ' + (status === 'now' ? T.borderStr : T.border),
            borderRadius: 14, padding: 18, position: 'relative', overflow: 'hidden',
          }}>
            {status === 'now' && (
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)' }} />
            )}
            <div style={{ fontSize: 17, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', marginBottom: 8 }}>{title}</div>
            {body}
            {body2}
            {action && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                {action}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function brandColor() { try { var b = JSON.parse(localStorage.getItem('nextos.brand') || 'null'); if (b && b.color) return b.color; } catch (e) {} return (window.__BRAND_COLOR) || T.red; }
  function ugHolidays(year) {
    var H = [['01-01', "New Year's Day"], ['01-26', 'Liberation Day'], ['02-16', 'Janani Luwum Day'], ['03-08', "Women's Day"], ['05-01', 'Labour Day'], ['06-03', 'Martyrs Day'], ['06-09', 'National Heroes Day'], ['10-09', 'Independence Day'], ['12-25', 'Christmas Day'], ['12-26', 'Boxing Day']];
    return H.map(function (h) { return { date: year + '-' + h[0], title: h[1], type: 'holiday' }; });
  }
  function DailyTasks({ onNav }) {
    var tasks = [
      { dot: T.red,  t: 'Reach today’s unreached absences', cta: 'Send nudges', go: function () { window.peakBulkWhatsApp(window.peakOverdueRecipients(), 'Absence nudges'); } },
      { dot: T.warn, t: 'Fee accounts overdue 30+ days',       cta: 'Open fees',   go: function () { onNav && onNav('fees'); } },
      { dot: T.good, t: 'Take / review today’s register',    cta: 'Attendance', go: function () { onNav && onNav('attn'); } },
      { dot: T.warn, t: 'At-risk students need a check-in',     cta: 'Students',    go: function () { onNav && onNav('stud'); } },
      { dot: T.ink3, t: 'Enter or release exam reports',        cta: 'Exams',       go: function () { onNav && onNav('exam'); } },
      { dot: T.ink3, t: 'Bus departure · 4 routes · 16:30', cta: 'Transport',   go: function () { onNav && onNav('trans'); } },
    ];
    return (
      <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Daily Tasks</div>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>{tasks.length} to do</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tasks.map(function (k, i) { return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 4px', borderBottom: i < tasks.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: k.dot, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: T.ink2, lineHeight: 1.4 }}>{k.t}</span>
              <button onClick={k.go} style={{ flexShrink: 0, background: 'transparent', border: '1px solid ' + T.borderStr, color: T.ink, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{k.cta}</button>
            </div>
          ); })}
        </div>
      </div>
    );
  }
  function SchoolCalendar() {
    const [cur, setCur] = React.useState(new Date());
    const [events, setEvents] = React.useState([]);
    const [adding, setAdding] = React.useState(false);
    const [nt, setNt] = React.useState(''); const [nd, setNd] = React.useState('');
    const tenant = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'peak-primary';
    const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
    const reload = React.useCallback(function () {
      Promise.all([
        fetch(WK + '/events?tenant=' + encodeURIComponent(tenant)).then(function (r) { return r.json(); }).catch(function () { return {}; }),
        fetch(WK + '/os-data?kind=school_event&tenant=' + encodeURIComponent(tenant)).then(function (r) { return r.json(); }).catch(function () { return {}; }),
        fetch(WK + '/os-data?kind=term_config&tenant=' + encodeURIComponent(tenant)).then(function (r) { return r.json(); }).catch(function () { return {}; })
      ]).then(function (res) {
        var ev = (res[0] && res[0].events) || [];
        var rich = ((res[1] && res[1].records) || []).map(function (x) { var p = x.payload || {}; return { date: p.date, title: p.title, type: p.type || 'event', coordinator: p.coordinator }; });
        var term = ((res[2] && res[2].records) || [])[0]; term = term && term.payload;
        var tev = [];
        if (term && term.start) tev.push({ date: term.start, title: 'Term begins', type: 'term' });
        if (term && term.end) tev.push({ date: term.end, title: 'Term ends', type: 'term' });
        setEvents(ev.concat(rich).concat(tev));
      });
    }, [tenant]);
    React.useEffect(function () { reload(); }, [reload]);
    const BC = brandColor();
    const y = cur.getFullYear(), m = cur.getMonth();
    const all = ugHolidays(y).concat(ugHolidays(y + 1)).concat(events.map(function (e) { return { date: e.date, title: e.title, type: e.type || 'event' }; }));
    const byDate = {}; all.forEach(function (e) { (byDate[e.date] = byDate[e.date] || []).push(e); });
    const pad = function (n) { return (n < 10 ? '0' : '') + n; };
    const dstr = function (yy, mm, dd) { return yy + '-' + pad(mm + 1) + '-' + pad(dd); };
    const today = new Date(); const isToday = function (dd) { return today.getFullYear() === y && today.getMonth() === m && today.getDate() === dd; };
    const first = new Date(y, m, 1).getDay(); const dim = new Date(y, m + 1, 0).getDate();
    const cells = []; for (var i = 0; i < first; i++) cells.push(null); for (var d = 1; d <= dim; d++) cells.push(d);
    const monthName = cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const upcoming = all.filter(function (e) { return e.date >= dstr(today.getFullYear(), today.getMonth(), today.getDate()); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 5);
    const addEvent = function () { const t = nt.trim(), dd = nd.trim(); if (!t || !dd) return; fetch(WK + '/events/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenant, event: { title: t, date: dd, type: 'event' } }) }).then(function (r) { return r.json(); }).then(function (res) { if (res.error) { window.peakToast && window.peakToast('Could not save', 'info', res.error); return; } setNt(''); setNd(''); setAdding(false); reload(); window.peakToast && window.peakToast('Event added', 'success', t); }).catch(function () {}); };
    const typeColor = function (t) { return t === 'holiday' ? T.warn : (t === 'exam' ? T.red : BC); };
    return (
      <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{monthName}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={function () { setCur(new Date(y, m - 1, 1)); }} style={{ background: T.surface2, border: '1px solid ' + T.borderStr, color: T.ink, borderRadius: 7, width: 28, height: 28, cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'‹'}</button>
            <button onClick={function () { setCur(new Date(y, m + 1, 1)); }} style={{ background: T.surface2, border: '1px solid ' + T.borderStr, color: T.ink, borderRadius: 7, width: 28, height: 28, cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'›'}</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, fontSize: 10.5, color: T.ink4, fontFamily: T.mono, marginBottom: 4, textAlign: 'center' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (d, i) { return <div key={i}>{d}</div>; })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {cells.map(function (d, i) {
            if (!d) return <div key={i} />;
            const ds = dstr(y, m, d); const ev = byDate[ds]; const tod = isToday(d);
            return (
              <div key={i} title={ev ? ev.map(function (e) { return e.title; }).join(', ') : ''} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: 12.5, color: tod ? '#fff' : T.ink2, borderRadius: '50%', background: tod ? BC : 'transparent', fontWeight: tod ? 700 : 400 }}>
                {d}
                {ev && !tod && <span style={{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: '50%', background: typeColor(ev[0].type) }} />}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid ' + T.border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.06em' }}>UPCOMING</div>
            <button onClick={function () { setAdding(!adding); }} style={{ background: 'transparent', border: 'none', color: BC, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>{adding ? 'Close' : '+ Add'}</button>
          </div>
          {adding && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input value={nt} onChange={function (e) { setNt(e.target.value); }} placeholder="Event" style={{ flex: 1, background: T.bg, border: '1px solid ' + T.border, borderRadius: 7, padding: '7px 9px', color: T.ink, fontSize: 12, outline: 'none' }} />
              <input value={nd} onChange={function (e) { setNd(e.target.value); }} type="date" style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 7, padding: '7px 9px', color: T.ink, fontSize: 12, outline: 'none' }} />
              <button onClick={addEvent} style={{ background: BC, color: '#062b18', border: 'none', borderRadius: 7, padding: '0 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
            </div>
          )}
          {upcoming.length === 0 ? <div style={{ fontSize: 12, color: T.ink4 }}>Nothing scheduled.</div> : upcoming.map(function (e, i) {
            const dd = new Date(e.date + 'T00:00:00');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: typeColor(e.type), flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: T.ink2, flex: 1 }}>{e.title}{e.type === 'holiday' ? <span style={{ color: T.ink4, fontSize: 11 }}> · holiday</span> : null}</span>
                <span style={{ fontSize: 11.5, color: T.ink3, fontFamily: T.mono }}>{dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function Today({ embed = false, onNav } = {}) {
    const _D = window.PEAK || {}; const _k = _D.kpis || {}; const _studs = _D.students || [];
    const _overdue = _studs.filter(s => (Number(s.balance) || 0) > 0);
    const _overdueTot = _overdue.reduce((a, s) => a + (Number(s.balance) || 0), 0);
    const _atRisk = _studs.filter(s => s.flag === 'risk' || (s.attendanceWk != null && s.attendanceWk < 70));
    const _noPhone = _studs.filter(s => !s.guardianPhone);
    const _present = Math.min(Number(_k.presentToday) || 0, _studs.length);
    const _absent = Number(_k.absentToday) || 0;
    const _feesToday = Number(_k.feesCollectedToday) || 0;
    const _firstName = (function () { var p = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || {}; return ((p.fullName || '').trim().split(' ')[0]) || 'there'; })();
    const _brief = (function () {
      const out = [];
      if (!_studs.length) { out.push({ tag: 'SETUP', t: 'No students imported yet.', d: 'Import your roster (Students → Import CSV) to bring this dashboard to life.', c: T.warn }); return out; }
      if (_overdue.length) out.push({ tag: 'FEES', t: _overdue.length + ' fee account' + (_overdue.length === 1 ? '' : 's') + ' outstanding.', d: 'UGX ' + _overdueTot.toLocaleString() + ' due in total. Send gentle reminders from Fees.', c: T.red });
      if (_atRisk.length) out.push({ tag: 'WATCH', t: _atRisk.length + ' learner' + (_atRisk.length === 1 ? '' : 's') + ' need a check-in.', d: _atRisk.slice(0, 3).map(s => s.name).join(', ') + (_atRisk.length > 3 ? '…' : '') + '. Low attendance or flagged at-risk.', c: T.warn });
      if (_present > 0) out.push({ tag: 'GOOD', t: _present + ' of ' + _studs.length + ' marked present today.', d: 'Register is being taken. Follow up the ' + _absent + ' not yet in.', c: T.good });
      if (!out.length) out.push({ tag: 'GOOD', t: 'All clear — ' + _studs.length + ' students on the roll.', d: 'No overdue fees or at-risk flags right now.', c: T.good });
      return out.slice(0, 3);
    })();
    const _suggest = (function () {
      const out = [];
      if (_overdue.length) out.push('Send fee reminders to ' + _overdue.length + ' guardian' + (_overdue.length === 1 ? '' : 's'));
      if (_atRisk.length) out.push('Follow up on ' + _atRisk.length + ' at-risk learner' + (_atRisk.length === 1 ? '' : 's'));
      if (_noPhone.length) out.push('Add phone numbers for ' + _noPhone.length + ' guardian' + (_noPhone.length === 1 ? '' : 's'));
      if (!out.length) out.push('Take today\u2019s register');
      return out.slice(0, 4);
    })();
    return (
      <div style={{
        width: embed ? '100%' : 1440, height: embed ? '100%' : 900,
        display: 'flex', background: T.bg, color: T.ink,
        fontFamily: T.font, fontSize: 13, overflow: 'hidden',
      }}>
        {!embed && <Rail active="today" onNav={onNav} />}
        <main className="today-main" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', minWidth: 0 }}>
          {/* left scroll column */}
          <div className="today-left" style={{ overflow: 'auto', padding: '32px 40px 60px' }}>
            {/* page header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.05, marginBottom: 8 }}>
                Today
              </div>
              <div style={{ fontSize: 14, color: T.ink2, maxWidth: 600 }}>
                Your day at a glance — the tasks that need you, and what's coming up.
              </div>
            </div>

            {window.PEAK_WATCH && <PEAK_WATCH.Card onNav={onNav} />}

            {/* pulse strip */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 32,
              border: '1px solid ' + T.border, borderRadius: 12, overflow: 'hidden', background: T.border,
            }}>
              {[
                { l: 'Children on campus',  v: _present > 0 ? String(_present) : '\u2014', s: _present > 0 ? ('of ' + _studs.length + ' · ' + (_k.attendancePct || 0) + '%') : (_studs.length + ' enrolled · register not taken'), c: T.good },
                { l: 'Students enrolled',   v: String(_studs.length), s: (_atRisk.length ? (_atRisk.length + ' at-risk') : 'all steady'), c: T.ink },
                { l: 'Fees collected today',v: _feesToday > 0 ? D.fmtUGXshort(_feesToday) : '\u2014', s: _feesToday > 0 ? 'recorded today' : 'none recorded yet', c: T.good },
                { l: 'Need attention',      v: String(_overdue.length + _atRisk.length), s: _overdue.length + ' owing · ' + _atRisk.length + ' at-risk', c: (_overdue.length + _atRisk.length) ? T.red : T.good },
              ].map(k => (
                <div key={k.l} style={{ background: T.surface, padding: '16px 18px' }}>
                  <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>{k.l.toUpperCase()}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.c, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
                  <div style={{ fontSize: 11, color: T.ink3, marginTop: 4, fontFamily: T.mono }}>{k.s}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="today-grid">
              <DailyTasks onNav={onNav} />
              <SchoolCalendar />
            </div>
          </div>

          {/* right side: AI co-pilot for today */}
          <aside className="today-aside" style={{
            background: T.surface, borderLeft: '1px solid ' + T.border, display: 'flex', flexDirection: 'column', minHeight: 0,
          }}>
            <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid ' + T.border }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: T.red, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 12, fontWeight: 700 }}>AI</div>
                <div style={{ flex: 1, lineHeight: 1.15 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>NEXT · today briefing</div>
                  <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>live · from your school data</div>
                </div>
              </div>
              <div style={{
                background: 'rgba(58,79,156,0.16)', borderRadius: 12, padding: 14, border: '1px solid ' + T.borderStr,
                fontSize: 13, color: T.ink, lineHeight: 1.55,
              }}>
                {'Good morning ' + (function(){var p=(window.PEAK_ROLE&&window.PEAK_ROLE.getProfile&&window.PEAK_ROLE.getProfile())||{};return ((p.fullName||'').trim().split(' ')[0])||'there';})() + '. The school is calm. Three things worth knowing before you start:'}
              </div>
            </div>

            <div className="today-aside-scroll" style={{ padding: 18, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {_brief.map((s, i) => (
                <div key={i} style={{
                  background: T.surface2, borderRadius: 12, padding: 14,
                  border: '1px solid ' + T.border, borderLeft: '3px solid ' + s.c,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 9.5, fontFamily: T.mono, color: s.c, fontWeight: 700, letterSpacing: '0.08em' }}>{s.tag}</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.4, fontWeight: 500, marginBottom: 6 }}>{s.t}</div>
                  <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>{s.d}</div>
                </div>
              ))}

              <div style={{ marginTop: 4, fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em' }}>SUGGESTED FOR YOU</div>
              {_suggest.map(s => (
                <button key={s} onClick={() => window.peakToast && window.peakToast(s, 'info', 'Added to your daily checklist · 16:00 reminder set.')} style={{
                  textAlign: 'left', padding: '11px 13px', borderRadius: 10, background: 'transparent',
                  border: '1px solid ' + T.border, color: T.ink2, fontSize: 12.5, cursor: 'pointer',
                  fontFamily: T.font, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{s}</span>
                  <span style={{ color: T.ink3 }}>↗</span>
                </button>
              ))}
            </div>

            <div style={{ padding: 14, borderTop: '1px solid ' + T.border }}>
              <AIComposer />
            </div>
          </aside>
        </main>
      </div>
    );
  }

  return { Today };
})();

window.PD_Today = PD_Today;

  