// Source module of the NEXT School OS app (Phase 2 split from index.html).
// Loaded as a classic <script>; compiled to compiled/v4-profile.js by build-precompiled.cjs.

/* src/v4-profile.jsx */
/* global React, PEAK, V4 */
// Peak Dark · Student profile deep dive
// Student profile — loads the real child by id.

const PD_Profile = function () {
  const T = window.V4.T;
  const D = window.PEAK || window.PEAK_FALLBACK;
  const {
    useState
  } = React;
  function Rail({
    active,
    onNav
  }) {
    const items = [{
      k: 'dash',
      glyph: '◫'
    }, {
      k: 'today',
      glyph: '◉'
    }, {
      k: 'stud',
      glyph: '☰'
    }, {
      k: 'attn',
      glyph: '◐'
    }, {
      k: 'fees',
      glyph: '⌗'
    }, {
      k: 'comm',
      glyph: '◊'
    }, {
      k: 'teach',
      glyph: '◇'
    }];
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 72,
        background: T.bg,
        borderRight: '1px solid ' + T.border,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14px 0',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 10,
        background: '#fff',
        display: 'grid',
        placeItems: 'center',
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: window.__BRAND_LOGO || "/prototypes/schools/peak-primary/assets/peak-logo.png",
      alt: "",
      style: {
        width: 34,
        height: 34,
        objectFit: 'contain'
      }
    })), items.map(n => {
      const a = active === n.k;
      return /*#__PURE__*/React.createElement("button", {
        key: n.k,
        onClick: () => onNav && onNav(n.k),
        style: {
          width: 48,
          height: 44,
          borderRadius: 10,
          border: 'none',
          background: a ? T.surface2 : 'transparent',
          color: a ? T.red : T.ink3,
          fontSize: 18,
          cursor: 'pointer',
          marginBottom: 4,
          position: 'relative',
          display: 'grid',
          placeItems: 'center'
        }
      }, a && /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          left: -8,
          top: 10,
          bottom: 10,
          width: 3,
          background: T.red,
          borderRadius: 999
        }
      }), n.glyph);
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 999,
        background: T.gold,
        color: T.bg,
        display: 'grid',
        placeItems: 'center',
        fontSize: 11,
        fontWeight: 700
      }
    }, "SM"));
  }
  function Pill({
    children,
    tone
  }) {
    const map = {
      good: {
        bg: T.goodSft,
        fg: T.good
      },
      warn: {
        bg: T.warnSft,
        fg: T.warn
      },
      bad: {
        bg: T.redSft,
        fg: T.redInk
      },
      brand: {
        bg: 'rgba(58,79,156,0.30)',
        fg: '#a8b4e8'
      },
      neutral: {
        bg: T.surface2,
        fg: T.ink2
      }
    }[tone];
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 999,
        background: map.bg,
        color: map.fg,
        fontFamily: T.mono,
        letterSpacing: '0.02em'
      }
    }, children);
  }
  function Card({
    children,
    title,
    eyebrow,
    action,
    pad = 20
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.surface,
        border: '1px solid ' + T.border,
        borderRadius: 12,
        padding: pad
      }
    }, (title || eyebrow) && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: T.ink3,
        fontFamily: T.mono,
        letterSpacing: '0.08em',
        fontWeight: 600,
        marginBottom: 4
      }
    }, eyebrow), title && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: T.ink,
        fontWeight: 600
      }
    }, title)), action), children);
  }
  function ProfileNotes({
    studentId
  }) {
    const [notes, setNotes] = React.useState(null);
    React.useEffect(() => {
      const sb = window.NextSession && window.NextSession.sb;
      if (!sb || studentId == null) {
        setNotes([]);
        return;
      }
      let live = true;
      sb.from('student_health_records').select('id, category, severity, description, recorded_at, follow_up_needed, resolved_at').eq('student_id', studentId).order('recorded_at', {
        ascending: false
      }).limit(50).then(function (r) {
        if (live) setNotes(r && r.data || []);
      }).catch(function () {
        if (live) setNotes([]);
      });
      return function () {
        live = false;
      };
    }, [studentId]);
    const catColor = function (c) {
      return {
        illness: T.red,
        injury: T.gold,
        wellbeing: T.blue,
        behavior: T.green,
        behaviour: T.green
      }[c] || T.ink3;
    };
    const fmt = function (d) {
      try {
        return new Date(d).toLocaleDateString([], {
          month: 'short',
          day: 'numeric'
        }) + ' \u00b7 ' + new Date(d).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return '';
      }
    };
    return /*#__PURE__*/React.createElement(Card, {
      eyebrow: "NOTES & LOGS",
      title: "Teacher notes",
      action: /*#__PURE__*/React.createElement(Pill, {
        tone: "brand"
      }, notes ? notes.length : '\u2026')
    }, notes === null ? /*#__PURE__*/React.createElement("div", {
      style: {
        color: T.ink3,
        fontSize: 12.5
      }
    }, "Loading\\u2026") : notes.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        color: T.ink3,
        fontSize: 12.5,
        lineHeight: 1.5
      }
    }, "No notes logged for this student yet. When a teacher logs a wellbeing, behaviour or health note, it appears here automatically.") : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 10,
        maxHeight: 300,
        overflow: 'auto'
      }
    }, notes.map(function (h, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: h.id || i,
        style: {
          borderLeft: '3px solid ' + catColor(h.category),
          background: T.bg,
          borderRadius: 8,
          padding: '10px 12px',
          opacity: h.resolved_at ? 0.6 : 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontFamily: T.mono,
          color: catColor(h.category),
          textTransform: 'uppercase',
          fontWeight: 700
        }
      }, h.category, h.severity ? ' \u00b7 ' + h.severity : ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: T.ink4,
          fontFamily: T.mono
        }
      }, fmt(h.recorded_at))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: T.ink2,
          marginTop: 5,
          lineHeight: 1.45
        }
      }, h.description), h.follow_up_needed && !h.resolved_at ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10.5,
          color: T.gold,
          marginTop: 4
        }
      }, "\\u2691 follow-up needed") : h.resolved_at ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10.5,
          color: T.good,
          marginTop: 4
        }
      }, "\\u2713 resolved") : null);
    })));
  }

  // ── More actions: transfer class/stream, change combination (A-level), edit ──
  function StudentActionsMenu({
    stu,
    onUpdated
  }) {
    const [open, setOpen] = React.useState(false);
    const [modal, setModal] = React.useState(null); // 'transfer' | 'combo' | 'edit'
    const [busy, setBusy] = React.useState(false);
    const cfg = window.SCHOOL_CONFIG || {};
    const classes = cfg.classes || [];
    const combos = cfg.combinations || [];
    const vocab = cfg.vocab || {};
    const unit = vocab.unit || 'Class';
    const isALevel = combos.length > 0 && /s5|s6|year|senior\s*5|senior\s*6/i.test(stu.stream || '');
    const sb = window.NextSession && window.NextSession.sb;
    const [val, setVal] = React.useState({
      stream: stu.stream || '',
      combination: stu.combination || '',
      name: stu.name || '',
      guardian: stu.guardian || '',
      phone: stu.guardianPhone || '',
      age: stu.age || ''
    });
    React.useEffect(() => {
      setVal({
        stream: stu.stream || '',
        combination: stu.combination || '',
        name: stu.name || '',
        guardian: stu.guardian || '',
        phone: stu.guardianPhone || '',
        age: stu.age || ''
      });
    }, [stu.id]);
    const apply = async (dbFields, localApply, label) => {
      if (!sb || stu.id == null) {
        window.peakToast && window.peakToast('Not connected to the database', 'info', 'Sign in to the school to make changes.');
        return;
      }
      setBusy(true);
      try {
        const r = await sb.from('students').update(dbFields).eq('id', stu.id);
        if (r && r.error) throw r.error;
        localApply();
        if (window.peakStore && window.peakStore.notify) {
          try {
            window.peakStore.notify();
          } catch (e) {}
        }
        window.peakToast && window.peakToast(label, 'success', stu.name);
        setModal(null);
        setOpen(false);
        if (onUpdated) onUpdated();
      } catch (e) {
        window.peakToast && window.peakToast('Could not update', 'info', String(e && e.message || e));
      }
      setBusy(false);
    };
    const ov = {
      position: 'fixed',
      inset: 0,
      zIndex: 9200,
      background: 'rgba(5,8,22,0.72)',
      backdropFilter: 'blur(6px)',
      display: 'grid',
      placeItems: 'center',
      padding: 20
    };
    const card = {
      width: '100%',
      maxWidth: 440,
      background: T.surface,
      border: '1px solid ' + T.border,
      borderRadius: 16,
      padding: 22,
      color: T.ink,
      fontFamily: T.font
    };
    const inp = {
      width: '100%',
      background: T.bg,
      border: '1px solid ' + T.border,
      borderRadius: 9,
      padding: '10px 12px',
      fontSize: 13,
      color: T.ink,
      fontFamily: T.font,
      outline: 'none',
      boxSizing: 'border-box'
    };
    const lbl = {
      fontSize: 11,
      color: T.ink3,
      fontFamily: T.mono,
      marginBottom: 5
    };
    const item = (label, sub, fn) => /*#__PURE__*/React.createElement("button", {
      onClick: fn,
      style: {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid ' + T.border,
        padding: '11px 14px',
        cursor: 'pointer',
        color: T.ink
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.ink3,
        marginTop: 2
      }
    }, sub));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        display: 'inline-block'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(v => !v),
      style: {
        background: 'transparent',
        color: T.ink3,
        border: 'none',
        padding: '9px 12px',
        fontSize: 16,
        cursor: 'pointer'
      }
    }, '\u22EF'), open && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: 4,
        width: 250,
        background: T.surface,
        border: '1px solid ' + T.border,
        borderRadius: 12,
        boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
        zIndex: 50,
        overflow: 'hidden'
      }
    }, item('Transfer ' + unit.toLowerCase(), 'Move to another ' + unit.toLowerCase() + ' / stream', () => {
      setVal(v => ({
        ...v,
        stream: stu.stream || classes[0] || ''
      }));
      setModal('transfer');
    }), isALevel && item('Change combination', 'A-Level subject combination', () => {
      setVal(v => ({
        ...v,
        combination: stu.combination || ''
      }));
      setModal('combo');
    }), item('Edit details', 'Name, age, guardian, phone', () => {
      setVal({
        stream: stu.stream || '',
        combination: stu.combination || '',
        name: stu.name || '',
        guardian: stu.guardian || '',
        phone: stu.guardianPhone || '',
        age: stu.age || ''
      });
      setModal('edit');
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(false),
      style: {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        padding: '10px 14px',
        cursor: 'pointer',
        color: T.ink3,
        fontSize: 12.5
      }
    }, "Cancel")), modal === 'transfer' && /*#__PURE__*/React.createElement("div", {
      style: ov,
      onClick: () => setModal(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: card,
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 4
      }
    }, "Transfer ", stu.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.ink3,
        marginBottom: 16
      }
    }, "Currently in ", /*#__PURE__*/React.createElement("b", null, stu.stream || '—'), ". Choose the new ", unit.toLowerCase(), "."), /*#__PURE__*/React.createElement("div", {
      style: lbl
    }, unit.toUpperCase(), " / STREAM"), /*#__PURE__*/React.createElement("select", {
      style: inp,
      value: val.stream,
      onChange: e => setVal(v => ({
        ...v,
        stream: e.target.value
      }))
    }, (classes.length ? classes : [stu.stream]).map(c => /*#__PURE__*/React.createElement("option", {
      key: c,
      value: c
    }, c))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 18
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(null),
      style: {
        background: 'transparent',
        border: '1px solid ' + T.border,
        color: T.ink2,
        borderRadius: 9,
        padding: '9px 16px',
        fontSize: 13,
        cursor: 'pointer'
      }
    }, "Cancel"), /*#__PURE__*/React.createElement("button", {
      onClick: () => apply({
        stream: val.stream
      }, () => {
        stu.stream = val.stream;
      }, 'Transferred to ' + val.stream),
      disabled: busy || val.stream === stu.stream,
      style: {
        background: T.red,
        color: '#fff',
        border: 'none',
        borderRadius: 9,
        padding: '9px 18px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, busy ? 'Saving…' : 'Transfer')))), modal === 'combo' && /*#__PURE__*/React.createElement("div", {
      style: ov,
      onClick: () => setModal(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: card,
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 4
      }
    }, "Change combination"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.ink3,
        marginBottom: 16
      }
    }, stu.name, " \xB7 ", stu.stream, ". Current: ", /*#__PURE__*/React.createElement("b", null, stu.combination || '— none —')), /*#__PURE__*/React.createElement("div", {
      style: lbl
    }, "A-LEVEL COMBINATION"), /*#__PURE__*/React.createElement("select", {
      style: inp,
      value: val.combination,
      onChange: e => setVal(v => ({
        ...v,
        combination: e.target.value
      }))
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 none \u2014"), combos.map(c => /*#__PURE__*/React.createElement("option", {
      key: c.name,
      value: c.name
    }, c.name, c.subjects && c.subjects.length ? ' · ' + c.subjects.join('/') : ''))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 18
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(null),
      style: {
        background: 'transparent',
        border: '1px solid ' + T.border,
        color: T.ink2,
        borderRadius: 9,
        padding: '9px 16px',
        fontSize: 13,
        cursor: 'pointer'
      }
    }, "Cancel"), /*#__PURE__*/React.createElement("button", {
      onClick: () => apply({
        combination: val.combination || null
      }, () => {
        stu.combination = val.combination;
      }, 'Combination set to ' + (val.combination || 'none')),
      disabled: busy,
      style: {
        background: T.red,
        color: '#fff',
        border: 'none',
        borderRadius: 9,
        padding: '9px 18px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, busy ? 'Saving…' : 'Save')))), modal === 'edit' && /*#__PURE__*/React.createElement("div", {
      style: ov,
      onClick: () => setModal(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: card,
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 16
      }
    }, "Edit ", stu.name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("div", {
      style: lbl
    }, "FULL NAME"), /*#__PURE__*/React.createElement("input", {
      style: inp,
      value: val.name,
      onChange: e => setVal(v => ({
        ...v,
        name: e.target.value
      }))
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("div", {
      style: lbl
    }, "AGE"), /*#__PURE__*/React.createElement("input", {
      style: inp,
      type: "number",
      value: val.age,
      onChange: e => setVal(v => ({
        ...v,
        age: e.target.value
      })),
      placeholder: "e.g. 10"
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("div", {
      style: lbl
    }, "GUARDIAN NAME"), /*#__PURE__*/React.createElement("input", {
      style: inp,
      value: val.guardian,
      onChange: e => setVal(v => ({
        ...v,
        guardian: e.target.value
      }))
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("div", {
      style: lbl
    }, "GUARDIAN PHONE"), /*#__PURE__*/React.createElement("input", {
      style: inp,
      value: val.phone,
      onChange: e => setVal(v => ({
        ...v,
        phone: e.target.value
      })),
      placeholder: "+256 7..."
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 18
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(null),
      style: {
        background: 'transparent',
        border: '1px solid ' + T.border,
        color: T.ink2,
        borderRadius: 9,
        padding: '9px 16px',
        fontSize: 13,
        cursor: 'pointer'
      }
    }, "Cancel"), /*#__PURE__*/React.createElement("button", {
      onClick: () => apply({
        name: val.name.trim(),
        age: val.age ? Number(val.age) : null,
        guardian_name: val.guardian.trim(),
        guardian_phone: val.phone.replace(/[^0-9+]/g, '')
      }, () => {
        stu.name = val.name.trim();
        stu.age = val.age ? Number(val.age) : null;
        stu.guardian = val.guardian.trim();
        stu.guardianPhone = val.phone.trim();
      }, 'Details updated'),
      disabled: busy || !val.name.trim(),
      style: {
        background: T.red,
        color: '#fff',
        border: 'none',
        borderRadius: 9,
        padding: '9px 18px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, busy ? 'Saving…' : 'Save changes')))));
  }
  function Profile({
    embed = false,
    onNav,
    onBack,
    studentId
  } = {}) {
    const [tab, setTab] = useState('Overview');
    const [, _forceP] = React.useReducer(n => n + 1, 0);
    const tabs = ['Overview', 'Attendance', 'Academics', 'Behaviour', 'Fees', 'Comms'];

    // Opening a profile directly (deep link, or before the Students screen
    // has loaded its roster) could hit window.PEAK.students while it's
    // still empty and get stuck showing the placeholder "Student" forever
    // — this component never re-rendered once the real data arrived later.
    // Guarantee the load, and re-render once it lands.
    React.useEffect(() => {
      try {
        const tenantId = window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : null);
        if (tenantId && window.peakStore && window.peakStore.loadStudents && !(window.PEAK && window.PEAK.studentsLive)) window.peakStore.loadStudents(tenantId);
      } catch (e) {}
      window.addEventListener('schoolStoreChange', _forceP);
      return () => window.removeEventListener('schoolStoreChange', _forceP);
    }, []);

    // The REAL child this profile is for (looked up by id) — never the demo.
    const _all = window.__TEACHER_STUDENTS && window.__TEACHER_STUDENTS.length ? window.__TEACHER_STUDENTS : window.PEAK && window.PEAK.students || [];
    const stu = _all.find(x => String(x.id) === String(studentId)) || {};

    // Real Supabase Storage upload (worker creates the bucket + writes
    // students.photo_url) — replaces the old click-to-see-initials-only
    // avatar with an actual photo once one's been uploaded.
    const [photoUploading, setPhotoUploading] = React.useState(false);
    const [photoUrlOverride, setPhotoUrlOverride] = React.useState(null);
    const photoInputRef = React.useRef(null);
    const handlePhotoFile = e => {
      const file = e.target.files && e.target.files[0];
      if (!file || stu.id == null) return;
      if (file.size > 3 * 1024 * 1024) {
        window.peakToast ? window.peakToast('Photo must be under 3MB', 'error') : alert('Photo must be under 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        setPhotoUploading(true);
        try {
          const tenantId = window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre');
          const res = await fetch('https://nextos-sentinel.nextafricaai.workers.dev/students/photo-upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tenant: tenantId,
              studentId: stu.id,
              contentType: file.type || 'image/jpeg',
              imageBase64: reader.result
            })
          });
          const out = await res.json();
          if (out.error) {
            window.peakToast ? window.peakToast('Photo upload failed: ' + out.error, 'error') : alert(out.error);
          } else {
            setPhotoUrlOverride(out.photoUrl);
            stu.photoUrl = out.photoUrl;
            if (out.warning) window.peakToast && window.peakToast(out.warning, 'info');else window.peakToast && window.peakToast('Photo updated', 'success');
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
    const stuAttWk = stu.attendanceWk == null ? null : stu.attendanceWk;
    const stuLastSeen = stu.lastSeen || '—';
    const isRisk = stu.flag === 'risk';
    const isTop = stu.flag === 'top';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: embed ? '100%' : 1440,
        height: embed ? '100%' : 900,
        display: 'flex',
        background: T.bg,
        color: T.ink,
        fontFamily: T.font,
        fontSize: 13,
        overflow: 'hidden'
      }
    }, !embed && /*#__PURE__*/React.createElement(Rail, {
      active: "stud",
      onNav: onNav
    }), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '16px 32px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: T.ink3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        cursor: 'pointer'
      },
      onClick: () => onBack ? onBack() : onNav && onNav('stud')
    }, "Students"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.ink4
      }
    }, "\u203A"), /*#__PURE__*/React.createElement("span", {
      style: {
        cursor: 'pointer'
      }
    }, stuStream), /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.ink4
      }
    }, "\u203A"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.ink
      }
    }, stuName)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 32px 22px',
        background: 'linear-gradient(135deg, ' + T.bg + ' 0%, rgba(226,58,82,0.06) 100%)',
        borderBottom: '1px solid ' + T.border
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 20,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => stu.id != null && !photoUploading && photoInputRef.current && photoInputRef.current.click(),
      style: {
        width: 84,
        height: 84,
        borderRadius: 18,
        background: stuPhotoUrl ? 'center / cover no-repeat url(' + stuPhotoUrl + ')' : 'linear-gradient(135deg, ' + T.navyLite + ' 0%, ' + T.surface3 + ' 100%)',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        border: '1px solid ' + T.borderStr,
        flexShrink: 0,
        position: 'relative',
        cursor: stu.id != null ? 'pointer' : 'default',
        overflow: 'hidden'
      },
      title: stu.id != null ? 'Click to upload a photo' : ''
    }, !stuPhotoUrl && stuInitials, stu.id != null && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0,0,0,0.55)',
        opacity: photoUploading ? 1 : 0,
        transition: 'opacity 0.15s'
      },
      onMouseEnter: e => {
        if (!photoUploading) e.currentTarget.style.opacity = 1;
      },
      onMouseLeave: e => {
        if (!photoUploading) e.currentTarget.style.opacity = 0;
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontFamily: T.mono
      }
    }, photoUploading ? 'Uploading…' : '📷 Change')), /*#__PURE__*/React.createElement("input", {
      ref: photoInputRef,
      type: "file",
      accept: "image/png,image/jpeg,image/webp",
      onChange: handlePhotoFile,
      style: {
        display: 'none'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 30,
        fontWeight: 700,
        color: T.ink,
        letterSpacing: '-0.025em'
      }
    }, stuName), isRisk ? /*#__PURE__*/React.createElement(Pill, {
      tone: "bad"
    }, "\u25CF AT-RISK") : isTop ? /*#__PURE__*/React.createElement(Pill, {
      tone: "good"
    }, "\u25CF TOP") : null, stuStream ? /*#__PURE__*/React.createElement(Pill, {
      tone: "brand"
    }, stuStream) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 18,
        fontSize: 12.5,
        color: T.ink3,
        fontFamily: T.mono,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", null, "ID #", stu.id != null ? stu.id : '—'), /*#__PURE__*/React.createElement("span", null, "Age: ", stu.age || '—'), /*#__PURE__*/React.createElement("span", null, "Guardian: ", stuGuardian), /*#__PURE__*/React.createElement("span", null, stuPhone || 'no phone on file')), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        marginTop: 16
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.peakToast && window.peakToast('Reminder noted', 'success', 'Follow up with ' + stuGuardian + ' regarding ' + stuName.split(' ')[0] + '.'),
      style: {
        background: T.red,
        color: '#fff',
        border: 'none',
        padding: '9px 16px',
        borderRadius: 9,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, "Schedule director call"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.peakWhatsApp((stuPhone || '').replace(/[^0-9]/g, ''), 'Hello ' + stuGuardian + ', a message from ' + window.peakSchoolName() + ' regarding ' + stuName.split(' ')[0] + '.'),
      style: {
        background: 'transparent',
        color: T.ink,
        border: '1px solid ' + T.borderStr,
        padding: '9px 16px',
        borderRadius: 9,
        fontSize: 12.5,
        fontWeight: 500,
        cursor: 'pointer'
      }
    }, "WhatsApp guardian"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.peakStudentReport && window.peakStudentReport(stu && stu.id != null ? stu : {
        name: stuName
      }),
      style: {
        background: 'transparent',
        color: T.ink2,
        border: '1px solid ' + T.border,
        padding: '9px 14px',
        borderRadius: 9,
        fontSize: 12.5,
        cursor: 'pointer'
      }
    }, "Generate report"), /*#__PURE__*/React.createElement(StudentActionsMenu, {
      stu: stu,
      onUpdated: _forceP
    }), window.PEAK_MARKING && /*#__PURE__*/React.createElement(PEAK_MARKING.CarePlan, {
      stu: stu
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        width: 260,
        flexShrink: 0
      }
    }, [{
      l: 'Attend · wk',
      v: stuAttWk == null ? '—' : stuAttWk + '%',
      c: stuAttWk == null ? T.ink3 : stuAttWk >= 90 ? T.good : stuAttWk >= 70 ? T.warn : T.red
    }, {
      l: 'Standing',
      v: isRisk ? 'At-risk' : isTop ? 'Top' : 'OK',
      c: isRisk ? T.red : isTop ? T.good : T.ink
    }, {
      l: 'Fees balance',
      v: stuBalance > 0 ? 'UGX ' + stuBalance.toLocaleString() : 'Cleared',
      c: stuBalance > 0 ? T.red : T.good
    }, {
      l: 'Last seen',
      v: stuLastSeen,
      c: T.ink
    }].map(k => /*#__PURE__*/React.createElement("div", {
      key: k.l,
      style: {
        background: T.surface,
        border: '1px solid ' + T.border,
        borderRadius: 10,
        padding: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.ink3,
        fontFamily: T.mono,
        letterSpacing: '0.05em',
        fontWeight: 600,
        marginBottom: 6
      }
    }, k.l.toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 700,
        color: k.c,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums'
      }
    }, k.v)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 0,
        padding: '0 32px',
        borderBottom: '1px solid ' + T.border,
        background: T.bg
      }
    }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
      key: t,
      onClick: () => setTab(t),
      style: {
        border: 'none',
        background: 'transparent',
        padding: '13px 18px',
        fontSize: 13,
        fontWeight: tab === t ? 600 : 500,
        color: tab === t ? T.ink : T.ink3,
        cursor: 'pointer',
        borderBottom: '2px solid ' + (tab === t ? T.red : 'transparent'),
        marginBottom: -1
      }
    }, t)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 0',
        fontSize: 11,
        color: T.ink3,
        fontFamily: T.mono
      }
    }, /*#__PURE__*/React.createElement("span", null, stuName, " \xB7 live profile"))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: '22px 32px 32px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement(ProfileNotes, {
      studentId: studentId
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 16,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement(Card, {
      eyebrow: "OVERVIEW",
      title: stuName.split(' ')[0] + "’s status"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.ink2,
        lineHeight: 1.65
      }
    }, function () {
      var bits = [];
      bits.push(stuName + ' is in ' + (stuStream || 'their class') + '. Guardian: ' + stuGuardian + (stuPhone ? ' (' + stuPhone + ')' : '') + '.');
      if (stuAttWk != null) bits.push('Attendance this week is ' + stuAttWk + '%' + (stuAttWk < 70 ? ' — below the watch line; worth a check-in.' : '.'));else bits.push('Attendance history will build as the class teacher marks the daily register.');
      if (stuBalance > 0) bits.push('Fees: UGX ' + stuBalance.toLocaleString() + ' is outstanding this term.');else bits.push('Fees are cleared for this term.');
      bits.push('Standing: ' + (isRisk ? 'at-risk — keep an eye on attendance and fees.' : isTop ? 'top performer.' : 'steady.'));
      return bits.join(' ');
    }())), /*#__PURE__*/React.createElement(Card, {
      eyebrow: "ATTENDANCE",
      title: stuAttWk != null ? stuAttWk + '% this week' : 'No data yet'
    }, stuAttWk != null ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 10,
        borderRadius: 999,
        background: T.surface2,
        overflow: 'hidden',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: stuAttWk + '%',
        background: stuAttWk >= 90 ? T.good : stuAttWk >= 70 ? T.warn : T.red,
        borderRadius: 999
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.ink3
      }
    }, "Last seen: ", stuLastSeen, ". This is drawn from the real roll-call register.")) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.ink3,
        lineHeight: 1.55
      }
    }, stuName.split(' ')[0], "\u2019s attendance appears here once their class teacher starts marking the daily register."))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement(Card, {
      eyebrow: "ACADEMICS",
      title: "Exam results",
      pad: 18
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.ink3,
        lineHeight: 1.55
      }
    }, "No exam results recorded for ", stuName.split(' ')[0], " yet. Marks and trends appear here once you record an exam in the Reports screen.")), (() => {
      // Real figures only (audit D1): share paid = paid ÷ charged from the fees ledger.
      const charged = Number(stu.termFee) || 0,
        paid = Number(stu.paidAmount) || 0;
      const pct = charged > 0 ? Math.max(0, Math.min(100, Math.round(100 * paid / charged))) : null;
      const none = stu.fees === 'none';
      return /*#__PURE__*/React.createElement(Card, {
        eyebrow: "FEES",
        title: none ? 'No fees yet' : stuBalance > 0 ? 'UGX ' + stuBalance.toLocaleString() + ' due' : 'Cleared',
        pad: 18
      }, pct != null && /*#__PURE__*/React.createElement("div", {
        style: {
          height: 8,
          borderRadius: 999,
          background: T.surface2,
          overflow: 'hidden',
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          height: '100%',
          width: pct + '%',
          background: stuBalance > 0 ? T.red : T.good,
          borderRadius: 999
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: T.ink3,
          lineHeight: 1.5
        }
      }, none ? 'Nothing billed to this pupil yet. Bill the term in Fees → Terms & billing.' : (pct != null ? pct + '% of UGX ' + charged.toLocaleString() + ' paid. ' : '') + (stuBalance > 0 ? 'Record a payment in Fees to update it and issue a receipt.' : '')), window.PD_FeeStatement && stu.id && /*#__PURE__*/React.createElement("button", {
        onClick: () => window.PD_FeeStatement.open(stu),
        style: {
          marginTop: 10,
          border: '1px solid ' + T.borderStr,
          background: 'transparent',
          color: T.ink2,
          padding: '7px 12px',
          borderRadius: 8,
          fontSize: 12,
          cursor: 'pointer'
        }
      }, "Fee statement"));
    })()), /*#__PURE__*/React.createElement(Card, {
      eyebrow: "GUARDIAN COMMUNICATION",
      title: "Thread with " + stuGuardian,
      pad: 0
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.ink3,
        lineHeight: 1.6,
        marginBottom: 14
      }
    }, "No messages logged with ", stuGuardian, " yet. As you message this guardian, the conversation will appear here."), stuPhone ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.peakWhatsApp((stuPhone || '').replace(/[^0-9]/g, ''), 'Hello ' + stuGuardian + ', a message from ' + window.peakSchoolName() + ' regarding ' + stuName.split(' ')[0] + '.'),
      style: {
        background: '#00a884',
        color: '#fff',
        border: 'none',
        padding: '10px 18px',
        borderRadius: 9,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, "Message ", stuGuardian, " on WhatsApp") : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.ink4
      }
    }, "No phone number on file for this guardian."))))));
  }
  return {
    Profile
  };
}();
window.PD_Profile = PD_Profile;