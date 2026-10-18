// Source module of the NEXT School OS app.
// Loaded as a classic <script>; compiled to compiled/boarding.js by build-precompiled.cjs.
/* global React */
// Boarding & hostels — real data only (replaces head-boarding-panel.jsx, which
// showed a fixed school name/term and had no hostels or roll call behind it).
//   • Night roll call: present / absent / sick / on leave, per hostel, per night
//   • Hostels: name, boys/girls/mixed, beds, matron and phone
//   • Boarders: which pupils board, their hostel and bed
// Tables: hostels, boarding_assignments, boarding_rollcall, students.is_boarding
// (supabase/migrations/20261018_boarding_and_staff.sql).

(function () {
  const {
    useState,
    useEffect,
    useMemo
  } = React;
  const T = () => window.V4.T;
  const sb = () => window.NextSession && window.NextSession.sb || null;
  const tenantId = () => window.NextSession && window.NextSession.profile && window.NextSession.profile.tenantId || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : '');
  const role = () => window.NextSession && window.NextSession.profile && window.NextSession.profile.role || '';
  const canManage = () => ['head', 'admin'].indexOf(role()) >= 0;
  const canMark = () => ['head', 'admin', 'teacher'].indexOf(role()) >= 0;
  const toast = (a, b, c) => window.peakToast && window.peakToast(a, b, c);
  const report = (e, w) => {
    try {
      window.nxReport && window.nxReport(e, 'boarding:' + w);
    } catch (x) {}
  };
  const kampalaToday = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  const phoneDigits = p => String(p || '').replace(/[^0-9]/g, '');
  const missingTable = e => /does not exist|schema cache|relation|column/i.test(e && e.message || '');
  const STATUS = [['present', 'Present', 'good'], ['absent', 'Absent', 'red'], ['sick', 'Sick bay', 'warn'], ['leave', 'On leave', 'ink3']];
  const inp = x => Object.assign({
    background: T().bg,
    border: '1px solid ' + T().border,
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    color: T().ink,
    fontFamily: T().font,
    outline: 'none',
    minWidth: 0
  }, x || {});
  const btn = (primary, x) => Object.assign(primary ? {
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
  }, x || {});
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
  function useBoardingData() {
    const [d, setD] = useState({
      loading: true
    });
    const load = async () => {
      const c = sb();
      const tn = tenantId();
      if (!c || !tn) {
        setD({
          loading: false,
          err: 'Not signed in.'
        });
        return;
      }
      try {
        const [st, ho, as, term] = await Promise.all([c.from('students').select('*').eq('tenant_id', tn).order('name'), c.from('hostels').select('*').eq('tenant_id', tn).order('name'), c.from('boarding_assignments').select('*').eq('tenant_id', tn), c.from('academic_terms').select('name').eq('tenant_id', tn).eq('status', 'current').maybeSingle()]);
        if (st.error) throw st.error;
        if (ho.error) {
          if (missingTable(ho.error)) {
            setD({
              loading: false,
              setup: true
            });
            return;
          }
          throw ho.error;
        }
        const all = (st.data || []).filter(s => String(s.status || 'active') === 'active');
        const isB = s => s.is_boarding === true || s.meta && s.meta.boarding === true;
        const assign = {};
        (as.data || []).forEach(a => {
          assign[a.student_id] = a;
        });
        setD({
          loading: false,
          students: all,
          boarders: all.filter(isB),
          hostels: ho.data || [],
          assign,
          term: term && term.data && term.data.name || ''
        });
      } catch (e) {
        report(e, 'load');
        setD({
          loading: false,
          err: e && e.message || 'Could not load boarding.'
        });
      }
    };
    useEffect(() => {
      load();
    }, []);
    return [d, load];
  }

  // ─── Night roll call ───────────────────────────────────────────────────
  function RollCall({
    d
  }) {
    const [date, setDate] = useState(kampalaToday());
    const [hostel, setHostel] = useState('all');
    const [marks, setMarks] = useState({});
    const [busy, setBusy] = useState('');
    const [q, setQ] = useState('');
    const load = async () => {
      const r = await sb().from('boarding_rollcall').select('*').eq('tenant_id', tenantId()).eq('roll_date', date);
      if (r.error) {
        report(r.error, 'roll-load');
        toast('Could not load roll call', 'error', r.error.message);
        return;
      }
      const m = {};
      (r.data || []).forEach(x => {
        m[x.student_id] = x;
      });
      setMarks(m);
    };
    useEffect(() => {
      load();
    }, [date]);
    const list = d.boarders.filter(s => (hostel === 'all' || (hostel === 'none' ? !(d.assign[s.id] && d.assign[s.id].hostel_id) : String((d.assign[s.id] || {}).hostel_id) === hostel)) && (!q || String(s.name).toLowerCase().indexOf(q.toLowerCase()) >= 0));
    const mark = async (s, status) => {
      if (!canMark()) return;
      setBusy(String(s.id));
      const row = {
        tenant_id: tenantId(),
        roll_date: date,
        student_id: s.id,
        hostel_id: d.assign[s.id] && d.assign[s.id].hostel_id || null,
        status,
        marked_at: new Date().toISOString()
      };
      const r = await sb().from('boarding_rollcall').upsert(row, {
        onConflict: 'tenant_id,roll_date,student_id'
      }).select().single();
      setBusy('');
      if (r.error) {
        report(r.error, 'mark');
        toast('Not saved', 'error', r.error.message);
        return;
      }
      setMarks(Object.assign({}, marks, {
        [s.id]: r.data || row
      }));
    };
    const markRest = async () => {
      const rest = list.filter(s => !marks[s.id]);
      if (!rest.length) return;
      setBusy('all');
      const rows = rest.map(s => ({
        tenant_id: tenantId(),
        roll_date: date,
        student_id: s.id,
        hostel_id: d.assign[s.id] && d.assign[s.id].hostel_id || null,
        status: 'present',
        marked_at: new Date().toISOString()
      }));
      const r = await sb().from('boarding_rollcall').upsert(rows, {
        onConflict: 'tenant_id,roll_date,student_id'
      });
      setBusy('');
      if (r.error) {
        toast('Not saved', 'error', r.error.message);
        return;
      }
      toast(rest.length + ' marked present', 'success');
      load();
    };
    const tellParent = s => {
      const ph = phoneDigits(s.guardian_phone);
      const st = (marks[s.id] || {}).status;
      const msg = 'Dear ' + (s.guardian_name || 'Parent') + ', ' + s.name + ' was ' + (st === 'sick' ? 'in the sick bay' : 'not present') + ' at night roll call on ' + date + ' at ' + (window.__BRAND_NAME || 'school') + '. Please call the school.';
      if (ph) window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(msg), '_blank');else toast('No guardian phone on file', 'info');
    };
    const t = T();
    const counts = {
      present: 0,
      absent: 0,
      sick: 0,
      leave: 0
    };
    list.forEach(s => {
      const m = marks[s.id];
      if (m) counts[m.status]++;
    });
    const unmarked = list.length - counts.present - counts.absent - counts.sick - counts.leave;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10,
        marginBottom: 14,
        alignItems: 'end'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "NIGHT OF"), /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: date,
      max: kampalaToday(),
      onChange: e => setDate(e.target.value || kampalaToday()),
      style: inp({
        width: '100%'
      })
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "HOSTEL"), /*#__PURE__*/React.createElement("select", {
      value: hostel,
      onChange: e => setHostel(e.target.value),
      style: inp({
        width: '100%'
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, "All hostels"), d.hostels.map(h => /*#__PURE__*/React.createElement("option", {
      key: h.id,
      value: String(h.id)
    }, h.name)), /*#__PURE__*/React.createElement("option", {
      value: "none"
    }, "No hostel yet"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "SEARCH"), /*#__PURE__*/React.createElement("input", {
      value: q,
      onChange: e => setQ(e.target.value),
      placeholder: "Pupil name",
      style: inp({
        width: '100%'
      })
    })), canMark() && /*#__PURE__*/React.createElement("button", {
      disabled: busy === 'all' || !unmarked,
      onClick: markRest,
      style: btn(false, {
        opacity: unmarked ? 1 : 0.5
      })
    }, busy === 'all' ? 'Saving…' : 'Mark the rest present (' + unmarked + ')')), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 14,
        flexWrap: 'wrap',
        fontSize: 12.5,
        color: t.ink3,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
      style: {
        color: t.good
      }
    }, counts.present), " present"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
      style: {
        color: t.redInk
      }
    }, counts.absent), " absent"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
      style: {
        color: t.warn
      }
    }, counts.sick), " sick bay"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, counts.leave), " on leave"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, unmarked), " not marked")), !list.length && /*#__PURE__*/React.createElement(Box, {
      style: {
        color: t.ink3,
        textAlign: 'center'
      }
    }, d.boarders.length ? 'No boarders match.' : 'No boarders yet — add them in the Boarders tab.'), list.map(s => {
      const m = marks[s.id];
      const h = d.hostels.find(x => x.id === (d.assign[s.id] || {}).hostel_id);
      return /*#__PURE__*/React.createElement("div", {
        key: s.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 4px',
          borderBottom: '1px solid ' + t.border,
          flexWrap: 'wrap'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: '2 1 180px',
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 600,
          fontSize: 13.5
        }
      }, s.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: t.ink3
        }
      }, s.stream || '', h ? ' · ' + h.name : ' · no hostel', (d.assign[s.id] || {}).bed ? ' · bed ' + d.assign[s.id].bed : '')), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap'
        }
      }, STATUS.map(([k, l, c]) => {
        const on = m && m.status === k;
        const col = c === 'good' ? t.good : c === 'red' ? t.redInk : c === 'warn' ? t.warn : t.ink2;
        return /*#__PURE__*/React.createElement("button", {
          key: k,
          disabled: !canMark() || busy === String(s.id),
          onClick: () => mark(s, k),
          style: {
            border: '1px solid ' + (on ? col : t.border),
            background: on ? 'rgba(127,127,127,0.12)' : 'transparent',
            color: on ? col : t.ink3,
            fontWeight: on ? 700 : 500,
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 12,
            cursor: canMark() ? 'pointer' : 'default'
          }
        }, l);
      }), m && (m.status === 'absent' || m.status === 'sick') && /*#__PURE__*/React.createElement("button", {
        onClick: () => tellParent(s),
        style: btn(false, {
          padding: '6px 10px',
          fontSize: 12
        })
      }, "Tell parent")));
    }));
  }

  // ─── Hostels ───────────────────────────────────────────────────────────
  function Hostels({
    d,
    reload
  }) {
    const [form, setForm] = useState(null);
    const [busy, setBusy] = useState(false);
    const used = id => d.boarders.filter(s => (d.assign[s.id] || {}).hostel_id === id).length;
    const save = async () => {
      if (!form.name.trim()) {
        toast('Give the hostel a name', 'error');
        return;
      }
      setBusy(true);
      const row = {
        tenant_id: tenantId(),
        name: form.name.trim(),
        gender: form.gender,
        capacity: Math.max(0, Number(form.capacity) || 0),
        matron_name: form.matron_name.trim() || null,
        matron_phone: form.matron_phone.trim() || null
      };
      const r = form.id ? await sb().from('hostels').update(row).eq('id', form.id) : await sb().from('hostels').insert(row);
      setBusy(false);
      if (r.error) {
        toast('Hostel not saved', 'error', /duplicate/i.test(r.error.message) ? 'A hostel with that name already exists.' : r.error.message);
        return;
      }
      setForm(null);
      reload();
      toast('Hostel saved', 'success');
    };
    const del = async h => {
      if (used(h.id) && !window.confirm(used(h.id) + ' boarders sleep in ' + h.name + '. Delete it anyway? They will show as "no hostel".')) return;
      const r = await sb().from('hostels').delete().eq('id', h.id);
      if (r.error) {
        toast('Not deleted', 'error', r.error.message);
        return;
      }
      reload();
    };
    const t = T();
    return /*#__PURE__*/React.createElement("div", null, canManage() && !form && /*#__PURE__*/React.createElement("button", {
      onClick: () => setForm({
        name: '',
        gender: 'boys',
        capacity: '',
        matron_name: '',
        matron_phone: ''
      }),
      style: btn(true, {
        marginBottom: 14
      })
    }, "+ Add hostel"), form && /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "NAME"), /*#__PURE__*/React.createElement("input", {
      value: form.name,
      onChange: e => setForm(Object.assign({}, form, {
        name: e.target.value
      })),
      placeholder: "Nile House",
      style: inp({
        width: '100%'
      })
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "FOR"), /*#__PURE__*/React.createElement("select", {
      value: form.gender,
      onChange: e => setForm(Object.assign({}, form, {
        gender: e.target.value
      })),
      style: inp({
        width: '100%'
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: "boys"
    }, "Boys"), /*#__PURE__*/React.createElement("option", {
      value: "girls"
    }, "Girls"), /*#__PURE__*/React.createElement("option", {
      value: "mixed"
    }, "Mixed / juniors"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "BEDS"), /*#__PURE__*/React.createElement("input", {
      value: form.capacity,
      inputMode: "numeric",
      onChange: e => setForm(Object.assign({}, form, {
        capacity: e.target.value.replace(/[^0-9]/g, '')
      })),
      placeholder: "40",
      style: inp({
        width: '100%'
      })
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "MATRON / PATRON"), /*#__PURE__*/React.createElement("input", {
      value: form.matron_name,
      onChange: e => setForm(Object.assign({}, form, {
        matron_name: e.target.value
      })),
      style: inp({
        width: '100%'
      })
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "THEIR PHONE"), /*#__PURE__*/React.createElement("input", {
      value: form.matron_phone,
      inputMode: "tel",
      onChange: e => setForm(Object.assign({}, form, {
        matron_phone: e.target.value
      })),
      placeholder: "2567\u2026",
      style: inp({
        width: '100%'
      })
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: save,
      style: btn(true)
    }, busy ? 'Saving…' : 'Save hostel'), /*#__PURE__*/React.createElement("button", {
      onClick: () => setForm(null),
      style: btn(false)
    }, "Cancel"))), !d.hostels.length && !form && /*#__PURE__*/React.createElement(Box, {
      style: {
        color: t.ink3,
        textAlign: 'center'
      }
    }, "No hostels yet.", canManage() ? ' Add each dormitory with its number of beds and matron.' : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12
      }
    }, d.hostels.map(h => {
      const u = used(h.id);
      const pct = h.capacity ? Math.min(100, Math.round(100 * u / h.capacity)) : null;
      return /*#__PURE__*/React.createElement(Box, {
        key: h.id,
        style: {
          marginBottom: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 700,
          flex: 1
        }
      }, h.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11.5,
          color: t.ink3,
          textTransform: 'capitalize'
        }
      }, h.gender)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 22,
          fontWeight: 700,
          margin: '8px 0 4px',
          fontVariantNumeric: 'tabular-nums'
        }
      }, u, h.capacity ? /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          color: t.ink3,
          fontWeight: 500
        }
      }, " / ", h.capacity, " beds") : /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          color: t.ink3,
          fontWeight: 500
        }
      }, " boarders")), pct != null && /*#__PURE__*/React.createElement("div", {
        style: {
          height: 6,
          background: t.bg,
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          height: '100%',
          width: pct + '%',
          background: pct >= 100 ? t.redInk : t.good
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: t.ink2
        }
      }, h.matron_name || 'No matron set', h.matron_phone ? ' · ' + h.matron_phone : ''), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 6,
          marginTop: 10,
          flexWrap: 'wrap'
        }
      }, h.matron_phone && /*#__PURE__*/React.createElement("a", {
        href: 'tel:+' + phoneDigits(h.matron_phone),
        style: Object.assign(btn(false, {
          padding: '5px 10px',
          fontSize: 12
        }), {
          textDecoration: 'none'
        })
      }, "Call"), canManage() && /*#__PURE__*/React.createElement("button", {
        onClick: () => setForm({
          id: h.id,
          name: h.name,
          gender: h.gender,
          capacity: String(h.capacity || ''),
          matron_name: h.matron_name || '',
          matron_phone: h.matron_phone || ''
        }),
        style: btn(false, {
          padding: '5px 10px',
          fontSize: 12
        })
      }, "Edit"), canManage() && /*#__PURE__*/React.createElement("button", {
        onClick: () => del(h),
        style: btn(false, {
          padding: '5px 10px',
          fontSize: 12,
          color: t.redInk
        })
      }, "Delete")));
    })));
  }

  // ─── Boarders ──────────────────────────────────────────────────────────
  function Boarders({
    d,
    reload
  }) {
    const [q, setQ] = useState('');
    const [adding, setAdding] = useState('');
    const [busy, setBusy] = useState('');
    const setAssign = async (s, patch) => {
      setBusy(String(s.id));
      const cur = d.assign[s.id] || {};
      const row = {
        tenant_id: tenantId(),
        student_id: s.id,
        hostel_id: 'hostel_id' in patch ? patch.hostel_id : cur.hostel_id || null,
        bed: 'bed' in patch ? patch.bed : cur.bed || null,
        updated_at: new Date().toISOString()
      };
      const r = await sb().from('boarding_assignments').upsert(row, {
        onConflict: 'tenant_id,student_id'
      });
      setBusy('');
      if (r.error) {
        toast('Not saved', 'error', r.error.message);
        return;
      }
      reload();
    };
    const setBoarding = async (s, on) => {
      if (!on && !window.confirm('Make ' + s.name + ' a day pupil? Their hostel and bed are cleared.')) return;
      setBusy(String(s.id));
      const r = await sb().from('students').update({
        is_boarding: on
      }).eq('id', s.id).eq('tenant_id', tenantId());
      if (!r.error && !on) await sb().from('boarding_assignments').delete().eq('tenant_id', tenantId()).eq('student_id', s.id);
      setBusy('');
      if (r.error) {
        toast('Not changed', 'error', r.error.message);
        return;
      }
      setAdding('');
      reload();
      toast(on ? s.name + ' is now a boarder' : s.name + ' is now a day pupil', 'success');
    };
    const t = T();
    const list = d.boarders.filter(s => !q || String(s.name).toLowerCase().indexOf(q.toLowerCase()) >= 0 || String(s.stream || '').toLowerCase().indexOf(q.toLowerCase()) >= 0);
    const dayMatches = adding.trim().length >= 2 ? d.students.filter(s => !d.boarders.includes(s) && String(s.name).toLowerCase().indexOf(adding.trim().toLowerCase()) >= 0).slice(0, 8) : [];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 10,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "SEARCH BOARDERS"), /*#__PURE__*/React.createElement("input", {
      value: q,
      onChange: e => setQ(e.target.value),
      placeholder: "Name or class",
      style: inp({
        width: '100%'
      })
    })), canManage() && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(Label, null, "MAKE A PUPIL A BOARDER"), /*#__PURE__*/React.createElement("input", {
      value: adding,
      onChange: e => setAdding(e.target.value),
      placeholder: "Type a day pupil\u2019s name\u2026",
      style: inp({
        width: '100%'
      })
    }), dayMatches.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        zIndex: 5,
        left: 0,
        right: 0,
        background: t.surface,
        border: '1px solid ' + t.borderStr,
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 240,
        overflow: 'auto'
      }
    }, dayMatches.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.id,
      onClick: () => setBoarding(s, true),
      style: {
        padding: '8px 10px',
        cursor: 'pointer',
        fontSize: 13
      }
    }, s.name, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: t.ink3
      }
    }, "\xB7 ", s.stream)))))), !list.length && /*#__PURE__*/React.createElement(Box, {
      style: {
        color: t.ink3,
        textAlign: 'center'
      }
    }, d.boarders.length ? 'No boarders match.' : 'No pupils are marked as boarders yet.'), list.map(s => {
      const a = d.assign[s.id] || {};
      const ph = phoneDigits(s.guardian_phone);
      return /*#__PURE__*/React.createElement("div", {
        key: s.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 4px',
          borderBottom: '1px solid ' + t.border,
          flexWrap: 'wrap'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: '2 1 180px',
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 600,
          fontSize: 13.5
        }
      }, s.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: t.ink3
        }
      }, s.stream || '', s.guardian_name ? ' · ' + s.guardian_name : '', s.guardian_phone ? ' · ' + s.guardian_phone : '')), /*#__PURE__*/React.createElement("select", {
        disabled: !canManage() || busy === String(s.id),
        value: a.hostel_id ? String(a.hostel_id) : '',
        onChange: e => setAssign(s, {
          hostel_id: e.target.value ? Number(e.target.value) : null
        }),
        style: inp({
          width: 150
        })
      }, /*#__PURE__*/React.createElement("option", {
        value: ""
      }, "No hostel"), d.hostels.map(h => /*#__PURE__*/React.createElement("option", {
        key: h.id,
        value: String(h.id)
      }, h.name))), /*#__PURE__*/React.createElement("input", {
        disabled: !canManage(),
        defaultValue: a.bed || '',
        key: 'bed' + s.id + (a.bed || ''),
        onBlur: e => {
          const v = e.target.value.trim();
          if (v !== (a.bed || '')) setAssign(s, {
            bed: v || null
          });
        },
        placeholder: "Bed",
        style: inp({
          width: 80
        })
      }), ph && /*#__PURE__*/React.createElement("a", {
        href: 'https://wa.me/' + ph,
        target: "_blank",
        rel: "noopener",
        style: Object.assign(btn(false, {
          padding: '6px 10px',
          fontSize: 12
        }), {
          textDecoration: 'none'
        })
      }, "Message parent"), canManage() && /*#__PURE__*/React.createElement("button", {
        disabled: busy === String(s.id),
        onClick: () => setBoarding(s, false),
        style: btn(false, {
          padding: '6px 10px',
          fontSize: 12
        })
      }, "Make day pupil"));
    }));
  }
  function BoardingPanel() {
    const [d, reload] = useBoardingData();
    const [tab, setTab] = useState('roll');
    const [tonight, setTonight] = useState(null);
    useEffect(() => {
      if (!d.boarders) return;
      sb().from('boarding_rollcall').select('status').eq('tenant_id', tenantId()).eq('roll_date', kampalaToday()).then(r => {
        if (r.error) return;
        const c = {
          present: 0,
          other: 0
        };
        (r.data || []).forEach(x => {
          if (x.status === 'present') c.present++;else c.other++;
        });
        setTonight(c);
      });
    }, [d.boarders && d.boarders.length, tab]);
    const t = T();
    const owed = useMemo(() => {
      if (!d.boarders) return null;
      const bal = {};
      (window.PEAK && window.PEAK.students || []).forEach(s => {
        bal[s.id] = Number(s.balance) || 0;
      });
      return d.boarders.reduce((a, s) => a + Math.max(0, bal[s.id] || 0), 0);
    }, [d.boarders]);
    const beds = d.hostels ? d.hostels.reduce((a, h) => a + (Number(h.capacity) || 0), 0) : 0;
    const assigned = d.boarders ? d.boarders.filter(s => (d.assign[s.id] || {}).hostel_id).length : 0;
    const KPI = ({
      l,
      v,
      s,
      c
    }) => /*#__PURE__*/React.createElement("div", {
      style: {
        background: t.surface,
        padding: '14px 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: t.ink3,
        fontFamily: t.mono,
        letterSpacing: '0.05em',
        fontWeight: 600,
        marginBottom: 6
      }
    }, l.toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        fontWeight: 700,
        color: c || t.ink,
        fontVariantNumeric: 'tabular-nums'
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: t.ink3,
        marginTop: 3,
        fontFamily: t.mono
      }
    }, s));
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
    }, "BOARDING & HOSTELS", d.term ? ' · ' + d.term.toUpperCase() : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        marginBottom: 12
      }
    }, window.__BRAND_NAME || 'Boarding'), !d.loading && !d.err && !d.setup && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 1,
        background: t.border,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid ' + t.border,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement(KPI, {
      l: "Boarders",
      v: d.boarders.length,
      s: assigned + ' with a hostel'
    }), /*#__PURE__*/React.createElement(KPI, {
      l: "Beds",
      v: beds ? assigned + ' / ' + beds : '—',
      s: beds ? Math.round(100 * assigned / beds) + '% full' : 'add hostels to track beds'
    }), /*#__PURE__*/React.createElement(KPI, {
      l: "Tonight",
      v: tonight ? tonight.present + ' / ' + d.boarders.length : '—',
      s: tonight ? d.boarders.length - tonight.present - tonight.other + ' not marked yet' : 'roll call not started',
      c: tonight && tonight.present === d.boarders.length && d.boarders.length ? t.good : t.ink
    }), /*#__PURE__*/React.createElement(KPI, {
      l: "Fees owed by boarders",
      v: owed != null && window.PEAK && window.PEAK.studentsLive ? 'UGX ' + owed.toLocaleString() : '—',
      s: "from the fees ledger",
      c: owed ? t.redInk : t.ink
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, [['roll', 'Night roll call'], ['boarders', 'Boarders'], ['hostels', 'Hostels']].map(x => /*#__PURE__*/React.createElement("button", {
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
    }, d.loading && /*#__PURE__*/React.createElement("div", {
      style: {
        color: t.ink3
      }
    }, "Loading boarding\u2026"), d.err && /*#__PURE__*/React.createElement(Box, {
      style: {
        color: t.redInk
      }
    }, d.err), d.setup && /*#__PURE__*/React.createElement(Box, {
      style: {
        color: t.ink2
      }
    }, "Boarding isn\u2019t set up in the database yet. Run ", /*#__PURE__*/React.createElement("b", null, "20261018_boarding_and_staff.sql"), " in Supabase, then refresh."), !d.loading && !d.err && !d.setup && (tab === 'roll' ? /*#__PURE__*/React.createElement(RollCall, {
      d: d
    }) : tab === 'hostels' ? /*#__PURE__*/React.createElement(Hostels, {
      d: d,
      reload: reload
    }) : /*#__PURE__*/React.createElement(Boarders, {
      d: d,
      reload: reload
    }))));
  }
  window.HeadBoardingPanel = BoardingPanel;
})();