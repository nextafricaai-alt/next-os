// Source module of the NEXT School OS app.
// Loaded as a classic <script>; compiled to compiled/student-edit.js by build-precompiled.cjs.
/* global React */
// Edit a pupil from anywhere: photo, name, class, parent/guardian, notes,
// and whether they are still at the school. Used by the Students side panel
// and the full profile. Saves straight to the students table (head, admin
// and bursar are allowed by the database rules); the photo goes through the
// Worker's /students/photo-upload.

const PD_StudentEdit = (function () {
  const { useState, useRef } = React;
  const T = () => window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  const tenantId = () => (window.NextSession && window.NextSession.profile && window.NextSession.profile.tenantId)
    || (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId)
    || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : '');
  const toast = (a, b, c) => window.peakToast && window.peakToast(a, b, c);
  const report = (e, where) => { try { window.nxReport && window.nxReport(e, 'student-edit:' + where); } catch (x) {} };
  const initials = n => (String(n || 'S').match(/\b[A-Za-z]/g) || ['S']).slice(0, 2).join('').toUpperCase();
  const refreshAll = () => {
    try { if (window.peakStore && window.peakStore.notify) window.peakStore.notify(); } catch (e) {}
    try { window.dispatchEvent(new Event('schoolStoreChange')); } catch (e) {}
  };

  // Shrink big phone photos before upload (max 800px, JPEG) — faster on mobile data.
  function shrink(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 800, k = Math.min(1, max / Math.max(img.width, img.height));
          if (k === 1 && file.size < 600 * 1024) { resolve({ data: reader.result, type: file.type || 'image/jpeg' }); return; }
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve({ data: c.toDataURL('image/jpeg', 0.85), type: 'image/jpeg' });
        };
        img.onerror = () => resolve({ data: reader.result, type: file.type || 'image/jpeg' });
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function Avatar({ stu, size, radius }) {
    const t = T();
    const url = stu && (stu.photoUrl || stu.photo_url);
    return (
      <div style={{ width: size, height: size, borderRadius: radius == null ? 999 : radius, flexShrink: 0, overflow: 'hidden',
        background: url ? ('center / cover no-repeat url("' + url + '")') : ('oklch(0.62 0.07 ' + (40 + ((Number(stu && stu.id) || 0) * 21) % 320) + ')'),
        color: '#fff', display: 'grid', placeItems: 'center', fontSize: Math.round(size / 3.1), fontWeight: 700 }}>{url ? null : initials(stu && stu.name)}</div>
    );
  }

  function Modal({ stu, onClose, onSaved }) {
    const t = T();
    const studs = (window.PEAK && window.PEAK.students) || [];
    const cfg = window.SCHOOL_CONFIG || {};
    const classes = Array.from(new Set([].concat(cfg.classes || [], studs.map(s => s.stream).filter(Boolean), stu.stream ? [stu.stream] : []))).sort();
    const [v, setV] = useState({
      name: stu.name || '', stream: stu.stream || '', guardian: stu.guardian || '', phone: stu.guardianPhone || stu.guardian_phone || '',
      notes: stu.notes || '', status: stu.status || 'active',
    });
    const [photo, setPhoto] = useState(stu.photoUrl || stu.photo_url || null);
    const [busy, setBusy] = useState('');
    const fileRef = useRef(null);
    const set = (k, x) => setV(Object.assign({}, v, { [k]: x }));

    const upload = async (e) => {
      const file = e.target.files && e.target.files[0]; e.target.value = '';
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast('Choose a photo (JPG or PNG)', 'error'); return; }
      if (file.size > 12 * 1024 * 1024) { toast('That photo is too big', 'error', 'Use one under 12 MB.'); return; }
      setBusy('photo');
      try {
        const img = await shrink(file);
        const r = await fetch(WK + '/students/photo-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant: tenantId(), studentId: stu.id, contentType: img.type, imageBase64: img.data }) });
        const out = await r.json().catch(() => ({ error: 'Bad reply (' + r.status + ')' }));
        if (out.error) toast('Photo not saved', 'error', out.error);
        else { setPhoto(out.photoUrl); stu.photoUrl = out.photoUrl; refreshAll(); toast(out.warning ? 'Photo uploaded' : 'Photo updated', out.warning ? 'info' : 'success', out.warning || ''); }
      } catch (err) { report(err, 'photo'); toast('Could not reach the school system', 'error'); }
      setBusy('');
    };

    const save = async () => {
      const name = v.name.replace(/\s+/g, ' ').trim();
      if (!name) { toast('The pupil needs a name', 'error'); return; }
      const phone = v.phone.replace(/[^0-9+]/g, '');
      if (phone && phone.replace(/\D/g, '').length < 9) { toast('That phone number looks too short', 'error', 'Use e.g. 0772 123456 or +256 772 123456.'); return; }
      const sb = window.NextSession && window.NextSession.sb;
      if (!sb || stu.id == null) { toast('Not connected', 'error', 'Sign in to the school to make changes.'); return; }
      const row = { name, stream: v.stream.trim() || null, guardian_name: v.guardian.trim() || null, guardian_phone: phone || null, notes: v.notes.trim() || null, status: v.status };
      setBusy('save');
      try {
        let r = await sb.from('students').update(row).eq('id', stu.id).select('id');
        let noNotes = false;
        if (r.error && /notes/.test(r.error.message || '')) { noNotes = true; const r2 = Object.assign({}, row); delete r2.notes; r = await sb.from('students').update(r2).eq('id', stu.id).select('id'); }
        if (r.error) throw r.error;
        if (!r.data || !r.data.length) throw new Error('You don’t have permission to change pupils. Ask the head teacher.');
        Object.assign(stu, { name, stream: row.stream || '', class: row.stream || '', guardian: row.guardian_name || '', guardianPhone: row.guardian_phone || '', status: row.status });
        if (!noNotes) stu.notes = row.notes || '';
        refreshAll();
        toast('Saved', 'success', name + (noNotes ? ' · notes need the latest database update' : ''));
        if (onSaved) onSaved(stu);
        onClose();
      } catch (e) { report(e, 'save'); toast('Not saved', 'error', String((e && e.message) || e)); }
      setBusy('');
    };

    const inp = { width: '100%', background: t.bg, border: '1px solid ' + t.border, borderRadius: 9, padding: '10px 12px', fontSize: 14, color: t.ink, fontFamily: t.font, outline: 'none', boxSizing: 'border-box' };
    const lbl = { fontSize: 10.5, color: t.ink3, fontFamily: t.mono, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 5, display: 'block' };
    const btn = (p) => p ? { background: t.red, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' } : { background: 'transparent', border: '1px solid ' + t.border, color: t.ink2, borderRadius: 9, padding: '9px 14px', fontSize: 13, cursor: 'pointer' };

    return (
      <div role="dialog" aria-label={'Edit ' + (stu.name || 'pupil')} onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9300, background: 'rgba(5,8,22,0.72)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 16, overflow: 'auto' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: t.surface, border: '1px solid ' + t.border, borderRadius: 16, padding: 20, color: t.ink, fontFamily: t.font, maxHeight: 'calc(100vh - 32px)', overflow: 'auto', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Edit pupil</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Avatar stu={{ id: stu.id, name: v.name, photoUrl: photo }} size={72} radius={16} />
            <div style={{ display: 'grid', gap: 6 }}>
              <button onClick={() => fileRef.current && fileRef.current.click()} disabled={!!busy} style={btn(false)}>{busy === 'photo' ? 'Uploading…' : photo ? 'Change photo' : 'Add photo'}</button>
              <span style={{ fontSize: 11, color: t.ink3 }}>Take a picture or choose one. Saved straight away.</span>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={upload} style={{ display: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <label><span style={lbl}>FULL NAME</span><input style={inp} value={v.name} onChange={e => set('name', e.target.value)} /></label>
            <label><span style={lbl}>CLASS</span>
              <input style={inp} list="pd-student-edit-classes" value={v.stream} onChange={e => set('stream', e.target.value)} placeholder="e.g. Primary Three" />
              <datalist id="pd-student-edit-classes">{classes.map(c => <option key={c} value={c} />)}</datalist>
            </label>
            <label><span style={lbl}>PARENT / GUARDIAN NAME</span><input style={inp} value={v.guardian} onChange={e => set('guardian', e.target.value)} /></label>
            <label><span style={lbl}>PARENT PHONE</span><input style={inp} type="tel" inputMode="tel" value={v.phone} onChange={e => set('phone', e.target.value)} placeholder="+256 7…" /></label>
            <label><span style={lbl}>NOTES</span><textarea style={Object.assign({}, inp, { minHeight: 90, resize: 'vertical', lineHeight: 1.5 })} value={v.notes} onChange={e => set('notes', e.target.value)} placeholder="Allergies, who picks them up, sponsor, anything staff should know…" /></label>
            <label><span style={lbl}>STATUS</span>
              <select style={inp} value={v.status} onChange={e => set('status', e.target.value)}>
                <option value="active">At the school</option>
                <option value="left">Left the school</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <button onClick={onClose} style={btn(false)}>Cancel</button>
            <button onClick={save} disabled={!!busy} style={btn(true)}>{busy === 'save' ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </div>
    );
  }

  // <PD_StudentEdit.Button stu={s} /> — a button that opens the editor.
  function Button({ stu, label, style, onSaved }) {
    const t = T();
    const [open, setOpen] = useState(false);
    if (!stu || stu.id == null) return null;
    return (
      <>
        <button onClick={() => setOpen(true)} style={Object.assign({ border: '1px solid ' + (t.borderStr || t.border), background: 'transparent', color: t.ink, padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }, style || {})}>{label || 'Edit'}</button>
        {open && <Modal stu={stu} onClose={() => setOpen(false)} onSaved={onSaved} />}
      </>
    );
  }

  return { Modal, Button, Avatar };
})();

window.PD_StudentEdit = PD_StudentEdit;
