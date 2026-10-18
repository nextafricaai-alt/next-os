// Source module of the NEXT School OS app.
// Loaded as a classic <script>; compiled to compiled/head-controls.js by build-precompiled.cjs.
/* global React */
// Head teacher's "Rules & audit" screen.
//  • Check-in rules (audit D3): late cut-off, penalty, gate location and
//    radius, merit points — stored in staff_rules and enforced by the database.
//  • Audit trail (audit P5): who changed fees, marks, attendance, pupils and
//    deductions, and when — read from audit_log (head/admin only).

const PD_HeadControls = function () {
  const {
    useState,
    useEffect,
    useMemo
  } = React;
  const T = () => window.V4.T;
  const sb = () => window.NextSession && window.NextSession.sb || null;
  const tenantId = () => window.NextSession && window.NextSession.profile && window.NextSession.profile.tenantId || window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId || '';
  const role = () => window.NextSession && window.NextSession.profile && window.NextSession.profile.role || '';
  const toast = (a, b, c) => window.peakToast && window.peakToast(a, b, c);
  const report = (e, where) => {
    try {
      window.nxReport && window.nxReport(e, 'head-controls:' + where);
    } catch (x) {}
  };
  const inp = extra => Object.assign({
    background: T().bg,
    border: '1px solid ' + T().border,
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    color: T().ink,
    fontFamily: T().font,
    outline: 'none',
    minWidth: 0,
    width: '100%'
  }, extra || {});
  const btn = (primary, extra) => Object.assign(primary ? {
    border: 'none',
    background: T().red,
    color: '#fff',
    padding: '9px 16px',
    borderRadius: 9,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer'
  } : {
    border: '1px solid ' + T().borderStr,
    background: 'transparent',
    color: T().ink2,
    padding: '8px 14px',
    borderRadius: 9,
    fontSize: 12.5,
    cursor: 'pointer'
  }, extra || {});
  const Label = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: T().ink3,
      fontFamily: T().mono,
      fontWeight: 600,
      letterSpacing: '0.05em',
      marginBottom: 6
    }
  }, children);
  const Box = ({
    children,
    style
  }) => /*#__PURE__*/React.createElement("div", {
    style: Object.assign({
      background: T().surface,
      border: '1px solid ' + T().border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 14
    }, style || {})
  }, children);
  const missingTable = e => /does not exist|schema cache|relation/i.test(e && e.message || '');

  // ─── Check-in rules ────────────────────────────────────────────────────
  const DEFAULTS = {
    late_after: '07:15',
    late_penalty_ugx: 2000,
    gate_lat: '',
    gate_lng: '',
    gate_radius_m: 300,
    max_gps_accuracy_m: 300,
    merit_on_time: 5,
    merit_roll_call: 2,
    merit_lesson_plan: 10
  };
  function StaffRules() {
    const [r, setR] = useState(null);
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
      const c = sb();
      if (!c) {
        setErr('Not signed in.');
        return;
      }
      c.from('staff_rules').select('*').eq('tenant_id', tenantId()).maybeSingle().then(res => {
        if (res.error) {
          setErr(missingTable(res.error) ? 'Check-in rules are not set up in the database yet — run the D3 SQL first.' : res.error.message);
          return;
        }
        const d = res.data || {};
        setR(Object.assign({}, DEFAULTS, d, {
          late_after: String(d.late_after || DEFAULTS.late_after).slice(0, 5),
          gate_lat: d.gate_lat == null ? '' : String(d.gate_lat),
          gate_lng: d.gate_lng == null ? '' : String(d.gate_lng)
        }));
      });
    }, []);
    const set = (k, v) => {
      setR(Object.assign({}, r, {
        [k]: v
      }));
      setDirty(true);
    };
    const here = () => {
      if (!navigator.geolocation) {
        toast('This device has no GPS', 'error');
        return;
      }
      toast('Getting your position…', 'info', 'Stand at the school gate.');
      navigator.geolocation.getCurrentPosition(p => {
        if (p.coords.accuracy > 60) toast('GPS is weak (±' + Math.round(p.coords.accuracy) + ' m)', 'info', 'Step outside and try again for a better fix.');
        setR(Object.assign({}, r, {
          gate_lat: p.coords.latitude.toFixed(7),
          gate_lng: p.coords.longitude.toFixed(7)
        }));
        setDirty(true);
      }, e => toast('Could not get location', 'error', e.message), {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      });
    };
    const save = async () => {
      const lat = r.gate_lat === '' ? null : Number(r.gate_lat),
        lng = r.gate_lng === '' ? null : Number(r.gate_lng);
      if (lat == null !== (lng == null) || lat != null && (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
        toast('Gate location needs both a valid latitude and longitude', 'error');
        return;
      }
      if (!/^\d{2}:\d{2}$/.test(r.late_after)) {
        toast('Late cut-off must be a time like 07:15', 'error');
        return;
      }
      const row = {
        tenant_id: tenantId(),
        late_after: r.late_after,
        late_penalty_ugx: Math.max(0, Number(r.late_penalty_ugx) || 0),
        gate_lat: lat,
        gate_lng: lng,
        gate_radius_m: Math.max(30, Math.min(5000, Number(r.gate_radius_m) || 300)),
        max_gps_accuracy_m: Math.max(20, Math.min(2000, Number(r.max_gps_accuracy_m) || 300)),
        merit_on_time: Math.max(0, Number(r.merit_on_time) || 0),
        merit_roll_call: Math.max(0, Number(r.merit_roll_call) || 0),
        merit_lesson_plan: Math.max(0, Number(r.merit_lesson_plan) || 0),
        updated_at: new Date().toISOString()
      };
      setBusy(true);
      const res = await sb().from('staff_rules').upsert(row, {
        onConflict: 'tenant_id'
      });
      setBusy(false);
      if (res.error) {
        report(res.error, 'rules-save');
        toast('Rules not saved', 'error', res.error.message);
        return;
      }
      setDirty(false);
      toast('Check-in rules saved', 'success', 'They apply from the next check-in.');
    };
    const t = T();
    if (err) return /*#__PURE__*/React.createElement(Box, {
      style: {
        color: t.redInk
      }
    }, err);
    if (!r) return /*#__PURE__*/React.createElement("div", {
      style: {
        color: t.ink3,
        padding: 20
      }
    }, "Loading\u2026");
    const num = (k, label, hint) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, label), /*#__PURE__*/React.createElement("input", {
      value: r[k],
      inputMode: "numeric",
      onChange: e => set(k, e.target.value.replace(/[^0-9]/g, '')),
      style: inp({
        fontFamily: t.mono
      })
    }), hint && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: t.ink3,
        marginTop: 4
      }
    }, hint));
    const hasGate = r.gate_lat !== '' && r.gate_lng !== '';
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: t.ink3,
        lineHeight: 1.6,
        marginBottom: 14,
        maxWidth: 680
      }
    }, "These rules are applied by the database on every staff check-in, using the server\u2019s clock (Kampala time) \u2014 a teacher\u2019s phone can\u2019t change them. Changes apply from the next check-in."), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        marginBottom: 12
      }
    }, "Lateness"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "LATE AFTER (KAMPALA TIME)"), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: r.late_after,
      onChange: e => set('late_after', e.target.value),
      style: inp()
    })), num('late_penalty_ugx', 'PENALTY (UGX)', 'Added to that month’s payroll deductions. 0 = no penalty.'))), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        flex: 1
      }
    }, "School gate"), /*#__PURE__*/React.createElement("button", {
      onClick: here,
      style: btn(false)
    }, "\u2316 Use my current location"), hasGate && /*#__PURE__*/React.createElement("a", {
      href: 'https://www.google.com/maps?q=' + r.gate_lat + ',' + r.gate_lng,
      target: "_blank",
      rel: "noopener",
      style: Object.assign(btn(false), {
        textDecoration: 'none'
      })
    }, "Check on map \u2197")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "LATITUDE"), /*#__PURE__*/React.createElement("input", {
      value: r.gate_lat,
      onChange: e => set('gate_lat', e.target.value.replace(/[^0-9.\-]/g, '')),
      placeholder: "0.3283056",
      style: inp({
        fontFamily: t.mono
      })
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "LONGITUDE"), /*#__PURE__*/React.createElement("input", {
      value: r.gate_lng,
      onChange: e => set('gate_lng', e.target.value.replace(/[^0-9.\-]/g, '')),
      placeholder: "32.4716944",
      style: inp({
        fontFamily: t.mono
      })
    })), num('gate_radius_m', 'ALLOWED DISTANCE (M)', 'How far from the gate a check-in may be.'), num('max_gps_accuracy_m', 'WEAKEST GPS ALLOWED (M)', 'Refuse check-ins with a worse GPS fix.')), !hasGate && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: t.warn,
        marginTop: 10
      }
    }, "No gate set \u2014 staff can check in from anywhere.")), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        marginBottom: 12
      }
    }, "Merit points"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12
      }
    }, num('merit_on_time', 'ON-TIME CHECK-IN'), num('merit_roll_call', 'ROLL CALL DONE'), num('merit_lesson_plan', 'LESSON PLAN WRITTEN'))), /*#__PURE__*/React.createElement("button", {
      disabled: busy || !dirty,
      onClick: save,
      style: btn(true, {
        opacity: dirty ? 1 : 0.5
      })
    }, busy ? 'Saving…' : 'Save rules'));
  }

  // ─── Audit trail ───────────────────────────────────────────────────────
  const AREAS = [['', 'Everything'], ['fees,receipts', 'Fees & receipts'], ['exam_results', 'Marks'], ['students', 'Pupils'], ['payroll_deductions,teacher_checkins', 'Staff check-ins & deductions'], ['student_roll_call', 'Roll call'], ['academic_terms,fee_items,fee_adjustments', 'Terms, fee structure & bursaries'], ['teachers,users,staff_rules', 'Staff & settings']];
  const TABLE_LABEL = {
    fees: 'Fees',
    receipts: 'Receipt',
    exam_results: 'Marks',
    students: 'Pupil',
    payroll_deductions: 'Deduction',
    teacher_checkins: 'Check-in',
    student_roll_call: 'Roll call',
    academic_terms: 'Term',
    fee_items: 'Fee line',
    fee_adjustments: 'Bursary',
    teachers: 'Teacher',
    users: 'Account',
    staff_rules: 'Check-in rules',
    finance_entries: 'Finance',
    school_finance_ledgers: 'Ledger'
  };
  const VERB = {
    insert: 'added',
    update: 'changed',
    delete: 'deleted'
  };
  const HIDE = {
    id: 1,
    tenant_id: 1,
    created_at: 1,
    updated_at: 1,
    auth_id: 1,
    meta: 1,
    photo_url: 1
  };
  const show = v => v == null ? '—' : typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v).slice(0, 60);
  const kampala = ts => {
    try {
      return new Date(ts).toLocaleString('en-GB', {
        timeZone: 'Africa/Kampala',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(ts).slice(0, 16);
    }
  };
  function AuditTrail() {
    const [rows, setRows] = useState([]);
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const [more, setMore] = useState(false);
    const [area, setArea] = useState('');
    const [days, setDays] = useState(30);
    const [who, setWho] = useState('');
    const pupils = useMemo(() => {
      const m = {};
      (window.PEAK && window.PEAK.students || []).forEach(s => {
        m[s.id] = s.name;
      });
      return m;
    }, []);
    const PAGE = 100;
    const fetchPage = async offset => {
      const c = sb();
      if (!c) {
        setErr('Not signed in.');
        return;
      }
      setBusy(true);
      let q = c.from('audit_log').select('*').eq('tenant_id', tenantId()).gte('at', new Date(Date.now() - days * 86400000).toISOString()).order('at', {
        ascending: false
      }).range(offset, offset + PAGE - 1);
      if (area) q = q.in('table_name', area.split(','));
      if (who.trim()) q = q.ilike('actor_email', '%' + who.trim() + '%');
      const res = await q;
      setBusy(false);
      if (res.error) {
        setErr(missingTable(res.error) ? 'The audit trail is not set up in the database yet — run the P5 SQL first.' : res.error.message);
        return;
      }
      setErr('');
      setRows(offset ? rows.concat(res.data || []) : res.data || []);
      setMore((res.data || []).length === PAGE);
    };
    useEffect(() => {
      fetchPage(0);
    }, [area, days]);
    const describe = r => {
      const a = r.after || {},
        b = r.before || {};
      const rec = r.action === 'delete' ? b : Object.assign({}, b, a);
      const pupil = rec.student_id != null ? pupils[rec.student_id] || rec.student_name || 'pupil #' + rec.student_id : rec.name && r.table_name === 'students' ? rec.name : '';
      let what = (TABLE_LABEL[r.table_name] || r.table_name) + (pupil ? ' · ' + pupil : '');
      if (r.table_name === 'fees' && rec.kind) what += ' · ' + rec.kind + (rec.amount != null ? ' ' + Math.abs(Number(rec.amount)).toLocaleString() : '');
      if (r.table_name === 'exam_results' && rec.subject) what += ' · ' + rec.subject;
      let detail = '';
      if (r.action === 'update') detail = Object.keys(a).filter(k => !HIDE[k]).map(k => k + ': ' + show(b[k]) + ' → ' + show(a[k])).join(';  ');else if (r.action === 'delete') detail = Object.keys(b).filter(k => !HIDE[k] && b[k] != null).slice(0, 6).map(k => k + ': ' + show(b[k])).join(';  ');
      return {
        what,
        detail
      };
    };
    const csv = () => {
      const lines = [['time (Kampala)', 'who', 'role', 'action', 'what', 'details']].concat(rows.map(r => {
        const d = describe(r);
        return [kampala(r.at), r.actor_email || '', r.actor_role || '', r.action, d.what, d.detail];
      }));
      const text = lines.map(l => l.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], {
        type: 'text/csv'
      }));
      a.download = 'audit-trail-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
    };
    const t = T();
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 10,
        marginBottom: 14,
        alignItems: 'end'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "AREA"), /*#__PURE__*/React.createElement("select", {
      value: area,
      onChange: e => setArea(e.target.value),
      style: inp()
    }, AREAS.map(x => /*#__PURE__*/React.createElement("option", {
      key: x[0],
      value: x[0]
    }, x[1])))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "PERIOD"), /*#__PURE__*/React.createElement("select", {
      value: days,
      onChange: e => setDays(Number(e.target.value)),
      style: inp()
    }, /*#__PURE__*/React.createElement("option", {
      value: 1
    }, "Today"), /*#__PURE__*/React.createElement("option", {
      value: 7
    }, "Last 7 days"), /*#__PURE__*/React.createElement("option", {
      value: 30
    }, "Last 30 days"), /*#__PURE__*/React.createElement("option", {
      value: 120
    }, "This term (120 days)"), /*#__PURE__*/React.createElement("option", {
      value: 366
    }, "Last year"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "WHO (EMAIL)"), /*#__PURE__*/React.createElement("input", {
      value: who,
      onChange: e => setWho(e.target.value),
      onKeyDown: e => {
        if (e.key === 'Enter') fetchPage(0);
      },
      placeholder: "bursar@\u2026  then Enter",
      style: inp()
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => fetchPage(0),
      style: btn(false)
    }, "Refresh"), rows.length > 0 && /*#__PURE__*/React.createElement("button", {
      onClick: csv,
      style: btn(false)
    }, "Export CSV"))), err && /*#__PURE__*/React.createElement(Box, {
      style: {
        color: t.redInk
      }
    }, err), !err && !busy && !rows.length && /*#__PURE__*/React.createElement(Box, {
      style: {
        color: t.ink3,
        textAlign: 'center'
      }
    }, "No changes recorded for this filter."), rows.map(r => {
      const d = describe(r);
      return /*#__PURE__*/React.createElement("div", {
        key: r.id,
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(92px, 110px) minmax(0, 1fr)',
          gap: 12,
          padding: '10px 4px',
          borderBottom: '1px solid ' + t.border
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11.5,
          color: t.ink3,
          fontFamily: t.mono
        }
      }, kampala(r.at)), /*#__PURE__*/React.createElement("div", {
        style: {
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13
        }
      }, /*#__PURE__*/React.createElement("b", null, r.actor_email || 'unknown'), r.actor_role ? /*#__PURE__*/React.createElement("span", {
        style: {
          color: t.ink3
        }
      }, " (", r.actor_role, ")") : null, " ", VERB[r.action] || r.action, " ", /*#__PURE__*/React.createElement("b", null, d.what)), d.detail && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: t.ink2,
          marginTop: 3,
          wordBreak: 'break-word',
          fontFamily: t.mono
        }
      }, d.detail)));
    }), more && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: () => fetchPage(rows.length),
      style: btn(false)
    }, busy ? 'Loading…' : 'Load more')), busy && !rows.length && /*#__PURE__*/React.createElement("div", {
      style: {
        color: t.ink3,
        padding: 20
      }
    }, "Loading\u2026"));
  }
  function Controls() {
    const [tab, setTab] = useState('audit');
    const t = T();
    const ok = ['head', 'admin'].indexOf(role()) >= 0 || window.PEAK_ROLE && window.PEAK_ROLE.getRole && ['head', 'admin'].indexOf(window.PEAK_ROLE.getRole()) >= 0;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: t.bg,
        color: t.ink,
        fontFamily: t.font,
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("header", {
      style: {
        padding: '22px 28px 0',
        borderBottom: '1px solid ' + t.border
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: t.ink3,
        fontFamily: t.mono,
        letterSpacing: '0.08em',
        fontWeight: 600,
        marginBottom: 8
      }
    }, "HEAD TEACHER"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        marginBottom: 12
      }
    }, "Rules & audit"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, [['audit', 'Audit trail'], ['rules', 'Check-in rules']].map(x => /*#__PURE__*/React.createElement("button", {
      key: x[0],
      onClick: () => setTab(x[0]),
      style: {
        background: 'transparent',
        border: 'none',
        borderBottom: '2px solid ' + (tab === x[0] ? t.red : 'transparent'),
        color: tab === x[0] ? t.ink : t.ink3,
        padding: '10px 6px',
        marginRight: 10,
        fontSize: 13.5,
        fontWeight: tab === x[0] ? 700 : 500,
        cursor: 'pointer'
      }
    }, x[1])))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: '20px 28px 28px'
      }
    }, !ok ? /*#__PURE__*/React.createElement("div", {
      style: {
        color: t.ink3
      }
    }, "Only the head teacher can see this.") : tab === 'rules' ? /*#__PURE__*/React.createElement(StaffRules, null) : /*#__PURE__*/React.createElement(AuditTrail, null)));
  }
  return {
    Controls,
    StaffRules,
    AuditTrail
  };
}();
window.PD_HeadControls = PD_HeadControls;