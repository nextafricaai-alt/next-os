/* PEAK_EVENTS — termly events with coordinators; reads term dates, auto-anchors term start/end, feeds Nia + the calendar. */
window.PEAK_EVENTS = (function () {
  const { useState, useEffect, useCallback } = React;
  const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  function prof() { return (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || { tenantId: 'peak-primary' }; }
  function tenant() { return window.getOSActiveTenant(); }
  function osGet(kind) { return fetch(WK + '/os-data?kind=' + kind + '&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => (d && d.records) || []).catch(() => []); }
  function osSave(kind, record, id) { return fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { kind, tenant: tenant(), record, id } : { kind, tenant: tenant(), record }) }).then(r => r.json()).catch(e => ({ error: String(e && e.message || e) })); }
  function osDel(id) { return fetch(WK + '/os-data/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => r.json()).catch(() => ({})); }
  const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 };
  const TYPES = [['event', 'Event'], ['exam', 'Exam'], ['holiday', 'Holiday'], ['meeting', 'Meeting / PTA'], ['sports', 'Sports'], ['trip', 'Trip / visit'], ['term', 'Term marker']];
  const typeColor = (t) => t === 'holiday' ? T.warn : t === 'exam' ? T.red : t === 'term' ? (T.green || '#00c389') : t === 'sports' ? T.gold : (T.navyLite || '#7c8cff');
  const fmtDate = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; } }

  function Events() {
    const [list, setList] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [term, setTerm] = useState({ start: '', end: '' });
    const [form, setForm] = useState({ title: '', date: '', type: 'event', coordinator: '', coordinatorEmail: '', notes: '' });
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
      osGet('school_event').then(rs => { const ev = rs.map(x => Object.assign({ _id: x.id }, x.payload)).sort((a, b) => String(a.date).localeCompare(String(b.date))); setList(ev); try { window.__SCHOOL_EVENTS = ev.slice(0, 30); } catch (e) {} });
      osGet('term_config').then(rs => { if (rs[0]) { setTerm(rs[0].payload || { start: '', end: '' }); try { window.__TERM = rs[0].payload; } catch (e) {} } });
      fetch(WK + '/teachers?tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => setTeachers((d && d.teachers) || [])).catch(() => {});
    }, []);
    useEffect(load, [load]);

    const add = () => {
      if (!form.title.trim() || !form.date) { window.peakToast && window.peakToast('Title and date needed', 'info'); return; }
      setBusy(true);
      const t = teachers.find(x => String(x.id) === String(form.coordinator));
      const rec = { title: form.title.trim(), date: form.date, type: form.type, coordinator: t ? t.full_name : '', coordinatorEmail: t ? (t.email || '') : '', notes: form.notes.trim(), at: new Date().toISOString() };
      osSave('school_event', rec).then(() => { setBusy(false); setForm({ title: '', date: '', type: form.type, coordinator: '', coordinatorEmail: '', notes: '' }); load(); window.peakToast && window.peakToast('Event added', 'success', rec.title + ' · ' + fmtDate(rec.date)); }).catch(() => setBusy(false));
    };
    const del = (e) => { if (!window.confirm('Remove "' + e.title + '"?')) return; osDel(e._id).then(load); };
    const notify = async (e) => {
      if (!e.coordinatorEmail) { window.peakToast && window.peakToast('No coordinator email', 'info', 'Pick a coordinator with a login to notify them.'); return; }
      try { const sb = window.NextSession && window.NextSession.sb; const tok = sb ? ((await sb.auth.getSession()).data.session || {}).access_token : ''; const res = await window.NX_PUSH.notify({ tenant: tenant(), emails: [e.coordinatorEmail], title: 'You are coordinating: ' + e.title, body: fmtDate(e.date) + (e.notes ? ' — ' + e.notes : ''), url: window.location.pathname, tag: 'event-' + (e._id || Date.now()) }, tok);
        if (res && res.sent > 0) window.peakToast && window.peakToast('Coordinator notified', 'success', e.coordinator + ' · on their phone'); else window.peakToast && window.peakToast('No phone yet', 'info', (e.coordinator || '') + " hasn't enabled phone alerts."); } catch (x) { window.peakToast && window.peakToast('Could not notify', 'info', String(x && x.message || x)); }
    };
    const anchorTerm = () => {
      if (!term.start && !term.end) { window.peakToast && window.peakToast('Set term dates first', 'info', 'Learning → set term start & end.'); return; }
      const have = {}; list.forEach(e => { if (e.type === 'term') have[e.date] = true; });
      const adds = [];
      if (term.start && !have[term.start]) adds.push({ title: 'Term begins', date: term.start, type: 'term', coordinator: '', coordinatorEmail: '', notes: 'Start of term', at: new Date().toISOString() });
      if (term.end && !have[term.end]) adds.push({ title: 'Term ends', date: term.end, type: 'term', coordinator: '', coordinatorEmail: '', notes: 'End of term', at: new Date().toISOString() });
      if (!adds.length) { window.peakToast && window.peakToast('Already on the calendar', 'info'); return; }
      setBusy(true); Promise.all(adds.map(a => osSave('school_event', a))).then(() => { setBusy(false); load(); window.peakToast && window.peakToast('Term added to calendar', 'success', adds.map(a => a.title).join(' · ')); });
    };

    const inp = { width: '100%', background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '9px 11px', fontSize: 13, color: T.ink, outline: 'none' };
    const lbl = { fontSize: 10, color: T.ink4, fontFamily: T.mono, marginBottom: 4 };
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = list.filter(e => String(e.date) >= today);
    const past = list.filter(e => String(e.date) < today);
    const weeks = (term.start && term.end) ? Math.max(1, Math.round((new Date(term.end) - new Date(term.start)) / 6048e5)) : null;

    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13, padding: '26px 28px 60px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>SCHOOL EVENTS &amp; CALENDAR</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>Termly events</div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 6, maxWidth: 680 }}>Add this term's events and who coordinates each. Nia knows your term dates, puts everything on the calendar, and keeps the coordinators in the loop.</div>
        </div>

        <div style={{ ...card, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10.5, color: T.ink4, fontFamily: T.mono }}>THIS TERM</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{term.start && term.end ? (fmtDate(term.start) + '  →  ' + fmtDate(term.end)) : 'Term dates not set'}{weeks ? <span style={{ fontSize: 12, color: T.ink3, fontWeight: 400 }}>  ·  {weeks} weeks</span> : null}</div>
            {!term.start && <div style={{ fontSize: 12, color: T.ink4, marginTop: 4 }}>Set them in Learning → term dates, and Nia anchors the calendar.</div>}
          </div>
          <button onClick={anchorTerm} disabled={busy} style={{ background: 'transparent', border: '1px solid ' + (T.green || '#00c389'), color: (T.green || '#00c389'), borderRadius: 9, padding: '9px 15px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>＋ Put term start &amp; end on calendar</button>
        </div>

        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add an event</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <label><div style={lbl}>EVENT</div><input style={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sports Day · PTA meeting · Mid-term exams" /></label>
            <label><div style={lbl}>DATE</div><input style={inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label><div style={lbl}>TYPE</div><select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(t => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 10 }}>
            <label><div style={lbl}>COORDINATOR (responsible)</div><select style={inp} value={form.coordinator} onChange={e => setForm({ ...form, coordinator: e.target.value })}><option value="">— assign later —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label>
            <label><div style={lbl}>NOTE <span style={{ color: T.ink4 }}>· optional</span></div><input style={inp} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Venue, time, what's needed…" /></label>
          </div>
          <button onClick={add} disabled={busy} style={{ marginTop: 12, background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Saving…' : '+ Add event'}</button>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Upcoming <span style={{ color: T.ink3, fontWeight: 400 }}>· {upcoming.length}</span></div>
          {upcoming.length === 0 ? <div style={{ color: T.ink4, fontSize: 13 }}>No upcoming events yet. Add one above, or put the term markers on the calendar.</div> : upcoming.map((e, i) => (
            <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? '1px solid ' + T.border : 'none', flexWrap: 'wrap' }}>
              <div style={{ width: 4, alignSelf: 'stretch', minHeight: 34, borderRadius: 999, background: typeColor(e.type) }} />
              <div style={{ minWidth: 90 }}><div style={{ fontSize: 12, fontWeight: 700, color: typeColor(e.type) }}>{fmtDate(e.date)}</div></div>
              <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.title}</div><div style={{ fontSize: 11.5, color: T.ink3 }}>{e.coordinator ? ('Coordinated by ' + e.coordinator) : 'No coordinator yet'}{e.notes ? ' · ' + e.notes : ''}</div></div>
              <div style={{ display: 'flex', gap: 6 }}>
                {e.coordinatorEmail && <button onClick={() => notify(e)} title="Notify the coordinator" style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>🔔 Notify</button>}
                <button onClick={() => del(e)} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink4, borderRadius: 7, width: 26, height: 26, cursor: 'pointer' }}>×</button>
              </div>
            </div>
          ))}
          {past.length > 0 && <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid ' + T.border, fontSize: 11.5, color: T.ink4 }}>{past.length} past event{past.length === 1 ? '' : 's'} this year.</div>}
        </div>
      </div>
    );
  }
  return { Events, typeColor };
})();
