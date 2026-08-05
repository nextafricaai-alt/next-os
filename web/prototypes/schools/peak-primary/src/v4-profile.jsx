
/* src/v4-profile.jsx */
/* global React, PEAK, V4 */
// Peak Dark · Student profile deep dive
// Student profile — loads the real child by id.

const PD_Profile = (function () {
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

  function Card({ children, title, eyebrow, action, pad = 20 }) {
    return (
      <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: pad }}>
        {(title || eyebrow) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div>
              {eyebrow && <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>{eyebrow}</div>}
              {title && <div style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>{title}</div>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    );
  }

  function ProfileNotes({ studentId }) {
    const [notes, setNotes] = React.useState(null);
    React.useEffect(() => {
      const sb = window.NextSession && window.NextSession.sb;
      if (!sb || studentId == null) { setNotes([]); return; }
      let live = true;
      sb.from('student_health_records').select('id, category, severity, description, recorded_at, follow_up_needed, resolved_at').eq('student_id', studentId).order('recorded_at', { ascending: false }).limit(50).then(function (r) { if (live) setNotes((r && r.data) || []); }).catch(function () { if (live) setNotes([]); });
      return function () { live = false; };
    }, [studentId]);
    const catColor = function (c) { return ({ illness: T.red, injury: T.gold, wellbeing: T.blue, behavior: T.green, behaviour: T.green }[c] || T.ink3); };
    const fmt = function (d) { try { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' \u00b7 ' + new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
    return (
      <Card eyebrow="NOTES & LOGS" title="Teacher notes" action={<Pill tone="brand">{notes ? notes.length : '\u2026'}</Pill>}>
        {notes === null ? <div style={{ color: T.ink3, fontSize: 12.5 }}>Loading\u2026</div> :
          notes.length === 0 ? <div style={{ color: T.ink3, fontSize: 12.5, lineHeight: 1.5 }}>No notes logged for this student yet. When a teacher logs a wellbeing, behaviour or health note, it appears here automatically.</div> : (
            <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflow: 'auto' }}>
              {notes.map(function (h, i) { return (
                <div key={h.id || i} style={{ borderLeft: '3px solid ' + catColor(h.category), background: T.bg, borderRadius: 8, padding: '10px 12px', opacity: h.resolved_at ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 10, fontFamily: T.mono, color: catColor(h.category), textTransform: 'uppercase', fontWeight: 700 }}>{h.category}{h.severity ? (' \u00b7 ' + h.severity) : ''}</span>
                    <span style={{ fontSize: 10, color: T.ink4, fontFamily: T.mono }}>{fmt(h.recorded_at)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 5, lineHeight: 1.45 }}>{h.description}</div>
                  {(h.follow_up_needed && !h.resolved_at) ? <div style={{ fontSize: 10.5, color: T.gold, marginTop: 4 }}>\u2691 follow-up needed</div> : (h.resolved_at ? <div style={{ fontSize: 10.5, color: T.good, marginTop: 4 }}>\u2713 resolved</div> : null)}
                </div>
              ); })}
            </div>
          )}
      </Card>
    );
  }

  // ── More actions: transfer class/stream, change combination (A-level), edit ──
  function StudentActionsMenu({ stu, onUpdated }) {
    const [open, setOpen] = React.useState(false);
    const [modal, setModal] = React.useState(null);   // 'transfer' | 'combo' | 'edit'
    const [busy, setBusy] = React.useState(false);
    const cfg = window.SCHOOL_CONFIG || {};
    const classes = cfg.classes || [];
    const combos = cfg.combinations || [];
    const vocab = cfg.vocab || {};
    const unit = (vocab.unit || 'Class');
    const isALevel = combos.length > 0 && /s5|s6|year|senior\s*5|senior\s*6/i.test(stu.stream || '');
    const sb = window.NextSession && window.NextSession.sb;
    const [val, setVal] = React.useState({ stream: stu.stream || '', combination: stu.combination || '', name: stu.name || '', guardian: stu.guardian || '', phone: stu.guardianPhone || '', age: stu.age || '' });
    React.useEffect(() => { setVal({ stream: stu.stream || '', combination: stu.combination || '', name: stu.name || '', guardian: stu.guardian || '', phone: stu.guardianPhone || '', age: stu.age || '' }); }, [stu.id]);

    const apply = async (dbFields, localApply, label) => {
      if (!sb || stu.id == null) { window.peakToast && window.peakToast('Not connected to the database', 'info', 'Sign in to the school to make changes.'); return; }
      setBusy(true);
      try {
        const r = await sb.from('students').update(dbFields).eq('id', stu.id);
        if (r && r.error) throw r.error;
        localApply();
        if (window.peakStore && window.peakStore.notify) { try { window.peakStore.notify(); } catch (e) {} }
        window.peakToast && window.peakToast(label, 'success', stu.name);
        setModal(null); setOpen(false);
        if (onUpdated) onUpdated();
      } catch (e) { window.peakToast && window.peakToast('Could not update', 'info', String((e && e.message) || e)); }
      setBusy(false);
    };

    const ov = { position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(5,8,22,0.72)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 20 };
    const card = { width: '100%', maxWidth: 440, background: T.surface, border: '1px solid ' + T.border, borderRadius: 16, padding: 22, color: T.ink, fontFamily: T.font };
    const inp = { width: '100%', background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: '10px 12px', fontSize: 13, color: T.ink, fontFamily: T.font, outline: 'none', boxSizing: 'border-box' };
    const lbl = { fontSize: 11, color: T.ink3, fontFamily: T.mono, marginBottom: 5 };
    const item = (label, sub, fn) => <button onClick={fn} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid ' + T.border, padding: '11px 14px', cursor: 'pointer', color: T.ink }}><div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{sub}</div></button>;

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button onClick={() => setOpen(v => !v)} style={{ background: 'transparent', color: T.ink3, border: 'none', padding: '9px 12px', fontSize: 16, cursor: 'pointer' }}>{'\u22EF'}</button>
        {open && (
          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 250, background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, boxShadow: '0 14px 34px rgba(0,0,0,0.5)', zIndex: 50, overflow: 'hidden' }}>
            {item('Transfer ' + unit.toLowerCase(), 'Move to another ' + unit.toLowerCase() + ' / stream', () => { setVal(v => ({ ...v, stream: stu.stream || (classes[0] || '') })); setModal('transfer'); })}
            {isALevel && item('Change combination', 'A-Level subject combination', () => { setVal(v => ({ ...v, combination: stu.combination || '' })); setModal('combo'); })}
            {item('Edit details', 'Name, age, guardian, phone', () => { setVal({ stream: stu.stream || '', combination: stu.combination || '', name: stu.name || '', guardian: stu.guardian || '', phone: stu.guardianPhone || '', age: stu.age || '' }); setModal('edit'); })}
            <button onClick={() => setOpen(false)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 14px', cursor: 'pointer', color: T.ink3, fontSize: 12.5 }}>Cancel</button>
          </div>
        )}

        {modal === 'transfer' && (
          <div style={ov} onClick={() => setModal(null)}>
            <div style={card} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Transfer {stu.name}</div>
              <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 16 }}>Currently in <b>{stu.stream || '—'}</b>. Choose the new {unit.toLowerCase()}.</div>
              <div style={lbl}>{unit.toUpperCase()} / STREAM</div>
              <select style={inp} value={val.stream} onChange={e => setVal(v => ({ ...v, stream: e.target.value }))}>
                {(classes.length ? classes : [stu.stream]).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button onClick={() => setModal(null)} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => apply({ stream: val.stream }, () => { stu.stream = val.stream; }, 'Transferred to ' + val.stream)} disabled={busy || val.stream === stu.stream} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Transfer'}</button>
              </div>
            </div>
          </div>
        )}

        {modal === 'combo' && (
          <div style={ov} onClick={() => setModal(null)}>
            <div style={card} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Change combination</div>
              <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 16 }}>{stu.name} · {stu.stream}. Current: <b>{stu.combination || '— none —'}</b></div>
              <div style={lbl}>A-LEVEL COMBINATION</div>
              <select style={inp} value={val.combination} onChange={e => setVal(v => ({ ...v, combination: e.target.value }))}>
                <option value="">— none —</option>
                {combos.map(c => <option key={c.name} value={c.name}>{c.name}{(c.subjects && c.subjects.length) ? (' · ' + c.subjects.join('/')) : ''}</option>)}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button onClick={() => setModal(null)} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => apply({ combination: val.combination || null }, () => { stu.combination = val.combination; }, 'Combination set to ' + (val.combination || 'none'))} disabled={busy} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {modal === 'edit' && (
          <div style={ov} onClick={() => setModal(null)}>
            <div style={card} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Edit {stu.name}</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <label><div style={lbl}>FULL NAME</div><input style={inp} value={val.name} onChange={e => setVal(v => ({ ...v, name: e.target.value }))} /></label>
                <label><div style={lbl}>AGE</div><input style={inp} type="number" value={val.age} onChange={e => setVal(v => ({ ...v, age: e.target.value }))} placeholder="e.g. 10" /></label>
                <label><div style={lbl}>GUARDIAN NAME</div><input style={inp} value={val.guardian} onChange={e => setVal(v => ({ ...v, guardian: e.target.value }))} /></label>
                <label><div style={lbl}>GUARDIAN PHONE</div><input style={inp} value={val.phone} onChange={e => setVal(v => ({ ...v, phone: e.target.value }))} placeholder="+256 7..." /></label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button onClick={() => setModal(null)} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => apply({ name: val.name.trim(), age: val.age ? Number(val.age) : null, guardian_name: val.guardian.trim(), guardian_phone: val.phone.replace(/[^0-9+]/g, '') }, () => { stu.name = val.name.trim(); stu.age = val.age ? Number(val.age) : null; stu.guardian = val.guardian.trim(); stu.guardianPhone = val.phone.trim(); }, 'Details updated')} disabled={busy || !val.name.trim()} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function Profile({ embed = false, onNav, onBack, studentId } = {}) {
    const [tab, setTab] = useState('Overview');
    const [, _forceP] = React.useReducer(n => n + 1, 0);
    const tabs = ['Overview','Attendance','Academics','Behaviour','Fees','Comms'];

    // Opening a profile directly (deep link, or before the Students screen
    // has loaded its roster) could hit window.PEAK.students while it's
    // still empty and get stuck showing the placeholder "Student" forever
    // — this component never re-rendered once the real data arrived later.
    // Guarantee the load, and re-render once it lands.
    React.useEffect(() => {
      try {
        const tenantId = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : null);
        if (tenantId && window.peakStore && window.peakStore.loadStudents && !(window.PEAK && window.PEAK.studentsLive)) window.peakStore.loadStudents(tenantId);
      } catch (e) {}
      window.addEventListener('schoolStoreChange', _forceP);
      return () => window.removeEventListener('schoolStoreChange', _forceP);
    }, []);

    // The REAL child this profile is for (looked up by id) — never the demo.
    const _all = (window.__TEACHER_STUDENTS && window.__TEACHER_STUDENTS.length) ? window.__TEACHER_STUDENTS : ((window.PEAK && window.PEAK.students) || []);
    const stu = _all.find(x => String(x.id) === String(studentId)) || {};

    // Real Supabase Storage upload (worker creates the bucket + writes
    // students.photo_url) — replaces the old click-to-see-initials-only
    // avatar with an actual photo once one's been uploaded.
    const [photoUploading, setPhotoUploading] = React.useState(false);
    const [photoUrlOverride, setPhotoUrlOverride] = React.useState(null);
    const photoInputRef = React.useRef(null);
    const handlePhotoFile = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || stu.id == null) return;
      if (file.size > 3 * 1024 * 1024) { window.peakToast ? window.peakToast('Photo must be under 3MB', 'error') : alert('Photo must be under 3MB'); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        setPhotoUploading(true);
        try {
          const tenantId = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre');
          const res = await fetch('https://nextos-sentinel.nextafricaai.workers.dev/students/photo-upload', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant: tenantId, studentId: stu.id, contentType: file.type || 'image/jpeg', imageBase64: reader.result }),
          });
          const out = await res.json();
          if (out.error) { window.peakToast ? window.peakToast('Photo upload failed: ' + out.error, 'error') : alert(out.error); }
          else {
            setPhotoUrlOverride(out.photoUrl);
            stu.photoUrl = out.photoUrl;
            if (out.warning) window.peakToast && window.peakToast(out.warning, 'info');
            else window.peakToast && window.peakToast('Photo updated', 'success');
          }
        } catch (err) {
          window.peakToast ? window.peakToast('Could not reach the school system.', 'error') : alert('Could not reach the school system.');
        }
        setPhotoUploading(false);
      };
      reader.readAsDataURL(file);
    };
    const stuPhotoUrl = photoUrlOverride || stu.photoUrl || stu.photo_url || null;
    const stuName = stu.name || 'Student';
    const stuStream = stu.stream || '';
    const stuGuardian = stu.guardian || '—';
    const stuPhone = stu.guardianPhone || '';
    const stuInitials = (stuName.match(/\b[A-Za-z]/g) || ['S']).slice(0, 2).join('').toUpperCase();
    const stuBalance = Number(stu.balance) || 0;
    const stuAttWk = (stu.attendanceWk == null) ? null : stu.attendanceWk;
    const stuLastSeen = stu.lastSeen || '—';
    const isRisk = stu.flag === 'risk';
    const isTop = stu.flag === 'top';

    return (
      <div style={{
        width: embed ? '100%' : 1440, height: embed ? '100%' : 900,
        display: 'flex', background: T.bg, color: T.ink,
        fontFamily: T.font, fontSize: 13, overflow: 'hidden',
      }}>
        {!embed && <Rail active="stud" onNav={onNav} />}

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* breadcrumb */}
          <div style={{ padding: '16px 32px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.ink3 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => onBack ? onBack() : (onNav && onNav('stud'))}>Students</span>
            <span style={{ color: T.ink4 }}>›</span>
            <span style={{ cursor: 'pointer' }}>{stuStream}</span>
            <span style={{ color: T.ink4 }}>›</span>
            <span style={{ color: T.ink }}>{stuName}</span>
          </div>

          {/* hero header */}
          <div style={{
            padding: '20px 32px 22px',
            background: 'linear-gradient(135deg, ' + T.bg + ' 0%, rgba(226,58,82,0.06) 100%)',
            borderBottom: '1px solid ' + T.border,
          }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div onClick={() => stu.id != null && !photoUploading && photoInputRef.current && photoInputRef.current.click()} style={{
                width: 84, height: 84, borderRadius: 18,
                background: stuPhotoUrl ? ('center / cover no-repeat url(' + stuPhotoUrl + ')') : ('linear-gradient(135deg, ' + T.navyLite + ' 0%, ' + T.surface3 + ' 100%)'),
                color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
                border: '1px solid ' + T.borderStr, flexShrink: 0, position: 'relative',
                cursor: stu.id != null ? 'pointer' : 'default', overflow: 'hidden',
              }} title={stu.id != null ? 'Click to upload a photo' : ''}>
                {!stuPhotoUrl && stuInitials}
                {stu.id != null && (
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.55)', opacity: photoUploading ? 1 : 0, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => { if (!photoUploading) e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={e => { if (!photoUploading) e.currentTarget.style.opacity = 0; }}>
                    <span style={{ fontSize: 11, fontFamily: T.mono }}>{photoUploading ? 'Uploading…' : '📷 Change'}</span>
                  </div>
                )}
                <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoFile} style={{ display: 'none' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: '-0.025em' }}>{stuName}</div>
                  {isRisk ? <Pill tone="bad">● AT-RISK</Pill> : isTop ? <Pill tone="good">● TOP</Pill> : null}
                  {stuStream ? <Pill tone="brand">{stuStream}</Pill> : null}
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: 12.5, color: T.ink3, fontFamily: T.mono, flexWrap: 'wrap' }}>
                  <span>ID #{stu.id != null ? stu.id : '—'}</span>
                  <span>Age: {stu.age || '—'}</span>
                  <span>Guardian: {stuGuardian}</span>
                  <span>{stuPhone || 'no phone on file'}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => window.peakToast && window.peakToast('Reminder noted', 'success', 'Follow up with ' + stuGuardian + ' regarding ' + stuName.split(' ')[0] + '.')} style={{ background: T.red, color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Schedule director call</button>
                  <button onClick={() => window.peakWhatsApp((stuPhone || '').replace(/[^0-9]/g,''), 'Hello ' + stuGuardian + ', a message from ' + window.peakSchoolName() + ' regarding ' + stuName.split(' ')[0] + '.')} style={{ background: 'transparent', color: T.ink, border: '1px solid ' + T.borderStr, padding: '9px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>WhatsApp guardian</button>
                  <button onClick={() => window.peakStudentReport && window.peakStudentReport(stu && stu.id != null ? stu : { name: stuName })} style={{ background: 'transparent', color: T.ink2, border: '1px solid ' + T.border, padding: '9px 14px', borderRadius: 9, fontSize: 12.5, cursor: 'pointer' }}>Generate report</button>
                  <StudentActionsMenu stu={stu} onUpdated={_forceP} />
                  {window.PEAK_MARKING && <PEAK_MARKING.CarePlan stu={stu} />}
                </div>
              </div>
              {/* right-side score stack */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, width: 260, flexShrink: 0 }}>
                {[
                  { l: 'Attend · wk', v: (stuAttWk == null ? '—' : stuAttWk + '%'), c: (stuAttWk == null ? T.ink3 : (stuAttWk >= 90 ? T.good : stuAttWk >= 70 ? T.warn : T.red)) },
                  { l: 'Standing', v: (isRisk ? 'At-risk' : isTop ? 'Top' : 'OK'), c: (isRisk ? T.red : isTop ? T.good : T.ink) },
                  { l: 'Fees balance', v: (stuBalance > 0 ? ('UGX ' + stuBalance.toLocaleString()) : 'Cleared'), c: (stuBalance > 0 ? T.red : T.good) },
                  { l: 'Last seen', v: stuLastSeen, c: T.ink },
                ].map(k => (
                  <div key={k.l} style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 10, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>{k.l.toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: k.c, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* tabs */}
          <div style={{ display: 'flex', gap: 0, padding: '0 32px', borderBottom: '1px solid ' + T.border, background: T.bg }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                border: 'none', background: 'transparent', padding: '13px 18px',
                fontSize: 13, fontWeight: tab === t ? 600 : 500,
                color: tab === t ? T.ink : T.ink3, cursor: 'pointer',
                borderBottom: '2px solid ' + (tab === t ? T.red : 'transparent'),
                marginBottom: -1,
              }}>{t}</button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', fontSize: 11, color: T.ink3, fontFamily: T.mono }}>
              <span>{stuName} · live profile</span>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '22px 32px 32px' }}>

            {/* ── OVERVIEW ─────────────────────────────────────────────── */}
            {tab === 'Overview' && (
              <div>
                <div style={{ marginBottom: 16 }}><ProfileNotes studentId={studentId} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
                  <Card eyebrow="OVERVIEW" title={stuName.split(' ')[0] + "'s status"}>
                    <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.65 }}>
                      {(function () {
                        var bits = [];
                        bits.push(stuName + ' is in ' + (stuStream || 'their class') + '. Guardian: ' + stuGuardian + (stuPhone ? (' (' + stuPhone + ')') : '') + '.');
                        if (stuAttWk != null) bits.push('Attendance this week is ' + stuAttWk + '%' + (stuAttWk < 70 ? ' — below the watch line; worth a check-in.' : '.'));
                        else bits.push('Attendance history will build as the class teacher marks the daily register.');
                        if (stuBalance > 0) bits.push('Fees: UGX ' + stuBalance.toLocaleString() + ' is outstanding this term.');
                        else bits.push('Fees are cleared for this term.');
                        bits.push('Standing: ' + (isRisk ? 'at-risk — keep an eye on attendance and fees.' : isTop ? 'top performer.' : 'steady.'));
                        return bits.join(' ');
                      })()}
                    </div>
                  </Card>
                  <Card eyebrow="ATTENDANCE" title={stuAttWk != null ? (stuAttWk + '% this week') : 'No data yet'}>
                    {stuAttWk != null ? (
                      <div>
                        <div style={{ height: 10, borderRadius: 999, background: T.surface2, overflow: 'hidden', marginBottom: 8 }}>
                          <div style={{ height: '100%', width: stuAttWk + '%', background: stuAttWk >= 90 ? T.good : stuAttWk >= 70 ? T.warn : T.red, borderRadius: 999 }} />
                        </div>
                        <div style={{ fontSize: 12, color: T.ink3 }}>Last seen: {stuLastSeen}. From the live roll-call register.</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.55 }}>{stuName.split(' ')[0]}'s attendance appears here once their class teacher starts marking the daily register.</div>
                    )}
                  </Card>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Card eyebrow="ACADEMICS" title="Exam results" pad={18}>
                    <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.55 }}>No exam results recorded for {stuName.split(' ')[0]} yet. Marks appear here once you record an exam in Reports.</div>
                  </Card>
                  <Card eyebrow="FEES · THIS TERM" title={stuBalance > 0 ? ('UGX ' + stuBalance.toLocaleString() + ' due') : 'Cleared'} pad={18}>
                    <div style={{ height: 8, borderRadius: 999, background: T.surface2, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: stuBalance > 0 ? '55%' : '100%', background: stuBalance > 0 ? T.red : T.good, borderRadius: 999 }} />
                    </div>
                    <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>{stuBalance > 0 ? 'Outstanding balance. Record a payment in Fees to update and issue a receipt.' : 'No outstanding balance this term.'}</div>
                  </Card>
                </div>
              </div>
            )}

            {/* ── ATTENDANCE ───────────────────────────────────────────── */}
            {tab === 'Attendance' && (
              <div>
                <Card eyebrow="ATTENDANCE RECORD" title={stuAttWk != null ? (stuAttWk + '% attendance this week') : 'No register data yet'} style={{ marginBottom: 16 }}>
                  {stuAttWk != null ? (
                    <div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                        {[
                          { l: 'This week', v: stuAttWk + '%', c: stuAttWk >= 90 ? T.good : stuAttWk >= 70 ? T.warn : T.red },
                          { l: 'Last seen', v: stuLastSeen, c: T.ink },
                          { l: 'Standing', v: isRisk ? 'At-risk' : isTop ? 'Top' : 'Steady', c: isRisk ? T.red : isTop ? T.good : T.ink2 },
                        ].map(k => (
                          <div key={k.l} style={{ background: T.surface2, borderRadius: 10, padding: '14px 20px', flex: 1, minWidth: 100 }}>
                            <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.06em', marginBottom: 6 }}>{k.l.toUpperCase()}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: k.c }}>{k.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ height: 12, borderRadius: 999, background: T.surface2, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ height: '100%', width: stuAttWk + '%', background: stuAttWk >= 90 ? T.good : stuAttWk >= 70 ? T.warn : T.red, borderRadius: 999, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: 12.5, color: T.ink3 }}>Drawn from the live roll-call register. Mark the daily register in Attendance to keep this up to date.</div>
                    </div>
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: T.ink3, fontSize: 13, lineHeight: 1.6 }}>
                      {stuName.split(' ')[0]}'s attendance history will appear here once their class teacher starts marking the daily register. <br />
                      <span style={{ fontSize: 12, color: T.ink4 }}>Go to Attendance → take register to begin.</span>
                    </div>
                  )}
                </Card>
                <Card eyebrow="GUARDIAN CONTACT" title={'WhatsApp ' + stuGuardian} pad={18}>
                  {stuPhone ? (
                    <button onClick={() => window.peakWhatsApp((stuPhone || '').replace(/[^0-9]/g, ''), 'Hello ' + stuGuardian + ', following up about ' + stuName.split(' ')[0] + "'s attendance this week.")} style={{ background: '#00a884', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Message {stuGuardian} on WhatsApp</button>
                  ) : (
                    <div style={{ fontSize: 12, color: T.ink4 }}>No phone number on file for this guardian.</div>
                  )}
                </Card>
              </div>
            )}

            {/* ── ACADEMICS ────────────────────────────────────────────── */}
            {tab === 'Academics' && (
              <div>
                <Card eyebrow="ACADEMIC PERFORMANCE" title="Exam results" style={{ marginBottom: 16 }}>
                  <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
                    <div style={{ fontSize: 14, color: T.ink2, fontWeight: 600, marginBottom: 8 }}>No exam results recorded yet</div>
                    <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                      Marks, grade trends, and subject breakdowns for {stuName.split(' ')[0]} will appear here once you record an exam in the <strong style={{ color: T.ink2 }}>Reports</strong> screen.
                    </div>
                    <button onClick={() => window.peakNav && window.peakNav('rep')} style={{ marginTop: 16, background: T.red, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Go to Reports →</button>
                  </div>
                </Card>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Card eyebrow="CLASS / STREAM" title={stuStream || '—'} pad={18}>
                    <div style={{ fontSize: 12.5, color: T.ink3 }}>Student is enrolled in <strong style={{ color: T.ink2 }}>{stuStream || 'their class'}</strong>. Use the Actions menu (⋯) to transfer to a different class or stream.</div>
                  </Card>
                  <Card eyebrow="COMBINATION" title={stu.combination || 'Not set'} pad={18}>
                    <div style={{ fontSize: 12.5, color: T.ink3 }}>{stu.combination ? ('Current A-Level combination: ' + stu.combination + '.') : 'No subject combination set. Use Actions → Change combination.'}</div>
                  </Card>
                </div>
              </div>
            )}

            {/* ── BEHAVIOUR ────────────────────────────────────────────── */}
            {tab === 'Behaviour' && (
              <div>
                <Card eyebrow="PASTORAL RECORD" title="Behaviour & wellbeing" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ background: isRisk ? T.redSft : T.goodSft, border: '1px solid ' + (isRisk ? T.red : T.good), borderRadius: 10, padding: '12px 20px', flex: 1 }}>
                      <div style={{ fontSize: 10.5, color: isRisk ? T.redInk : T.good, fontFamily: T.mono, letterSpacing: '0.06em', marginBottom: 4 }}>STANDING</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: isRisk ? T.redInk : T.good }}>{isRisk ? 'At-risk' : isTop ? 'Top' : 'Steady'}</div>
                    </div>
                    <div style={{ background: T.surface2, borderRadius: 10, padding: '12px 20px', flex: 2 }}>
                      <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.06em', marginBottom: 4 }}>NOTES</div>
                      <div style={{ fontSize: 12.5, color: T.ink2 }}>{isRisk ? stuName.split(' ')[0] + ' is flagged at-risk. Consider a check-in call with ' + stuGuardian + '.' : 'No pastoral concerns on file. Use the notes section above to log any incidents.'}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}><ProfileNotes studentId={studentId} /></div>
                </Card>
              </div>
            )}

            {/* ── FEES ─────────────────────────────────────────────────── */}
            {tab === 'Fees' && (
              <div>
                <Card eyebrow="FEES · THIS TERM" title={stuBalance > 0 ? ('UGX ' + stuBalance.toLocaleString() + ' outstanding') : 'Fees cleared'} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ height: 12, borderRadius: 999, background: T.surface2, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: stuBalance > 0 ? '55%' : '100%', background: stuBalance > 0 ? T.red : T.good, borderRadius: 999, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: T.ink3, fontFamily: T.mono }}>
                      <span>{stuBalance > 0 ? 'UGX ' + stuBalance.toLocaleString() + ' due' : 'No outstanding balance'}</span>
                      <span>{stuBalance > 0 ? 'Action required' : '✓ All clear'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => window.peakNav && window.peakNav('fees')} style={{ background: T.red, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Record payment in Fees →</button>
                    {stuPhone && stuBalance > 0 && (
                      <button onClick={() => window.peakWhatsApp((stuPhone || '').replace(/[^0-9]/g, ''), 'Dear ' + stuGuardian + ', a gentle reminder that ' + stuName.split(' ')[0] + "'s school fees of UGX " + stuBalance.toLocaleString() + ' are outstanding. Kindly arrange payment at your earliest convenience.')} style={{ background: 'transparent', color: T.ink, border: '1px solid ' + T.borderStr, padding: '10px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>Send fee reminder →</button>
                    )}
                  </div>
                </Card>
                <Card eyebrow="GUARDIAN" title={'Contact ' + stuGuardian} pad={18}>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: T.ink2 }}>
                    <span>👤 {stuGuardian}</span>
                    <span>📱 {stuPhone || 'no phone on file'}</span>
                  </div>
                </Card>
              </div>
            )}

            {/* ── COMMS ────────────────────────────────────────────────── */}
            {tab === 'Comms' && (
              <div>
                <Card eyebrow="GUARDIAN COMMUNICATION" title={'Thread with ' + stuGuardian} pad={0}>
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.6, marginBottom: 14 }}>
                      No messages logged with {stuGuardian} yet. As you message this guardian, the conversation will appear here.
                    </div>
                    {stuPhone ? (
                      <button onClick={() => window.peakWhatsApp((stuPhone || '').replace(/[^0-9]/g, ''), 'Hello ' + stuGuardian + ', a message from ' + window.peakSchoolName() + ' regarding ' + stuName.split(' ')[0] + '.')} style={{ background: '#00a884', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Message {stuGuardian} on WhatsApp</button>
                    ) : (
                      <div style={{ fontSize: 12, color: T.ink4 }}>No phone number on file for this guardian.</div>
                    )}
                  </div>
                </Card>
                <div style={{ marginTop: 16 }}>
                  <Card eyebrow="QUICK ACTIONS" title="Reach this guardian" pad={18}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button onClick={() => window.peakToast && window.peakToast('Reminder noted', 'success', 'Follow up with ' + stuGuardian + ' regarding ' + stuName.split(' ')[0] + '.')} style={{ background: T.red, color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Schedule director call</button>
                      {stuPhone && <button onClick={() => window.peakWhatsApp((stuPhone || '').replace(/[^0-9]/g, ''), 'Hello ' + stuGuardian + ', a message from ' + window.peakSchoolName() + '.')} style={{ background: 'transparent', color: T.ink, border: '1px solid ' + T.borderStr, padding: '9px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>WhatsApp guardian</button>}
                    </div>
                  </Card>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    );
  }

  return { Profile };
})();

window.PD_Profile = PD_Profile;

  