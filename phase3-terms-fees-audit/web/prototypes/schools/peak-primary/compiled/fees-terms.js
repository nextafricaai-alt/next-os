// Source module of the NEXT School OS app.
// Loaded as a classic <script>; compiled to compiled/fees-terms.js by build-precompiled.cjs.
/* global React */
// Audit P3 + P4 — terms, the fee structure per term, bursaries, and billing.
// Everything here reads and writes the database directly (RLS lets only the
// head teacher, admin and bursar change it); billing itself runs in the
// database (nx_bill_term) so it can't double-charge or be half-done.

const PD_FeesTerms = function () {
  const {
    useState,
    useEffect,
    useMemo
  } = React;
  const T = () => window.V4.T;
  const fmt = n => 'UGX ' + Math.round(Number(n) || 0).toLocaleString();
  const sb = () => window.NextSession && window.NextSession.sb || null;
  const tenantId = () => window.NextSession && window.NextSession.profile && window.NextSession.profile.tenantId || window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId || '';
  const role = () => window.NextSession && window.NextSession.profile && window.NextSession.profile.role || '';
  const canEdit = () => ['head', 'admin', 'bursar'].indexOf(role()) >= 0;
  const toast = (a, b, c) => window.peakToast && window.peakToast(a, b, c);
  const report = (where, e) => {
    try {
      window.nxReport && window.nxReport(e, 'fees-terms:' + where);
    } catch (x) {}
  };
  // Same rule as the database's nx_class_key(): "P5 Blue" → P5, "Baby Class" → BABY CLASS
  const classKey = stream => {
    const s = String(stream || '').trim();
    const m = s.match(/^([A-Za-z]*\s*\d+)/);
    return m ? m[1].replace(/\s+/g, '').toUpperCase() : s.toUpperCase();
  };
  const APPLIES = [['all', 'All pupils'], ['day', 'Day pupils'], ['boarding', 'Boarders'], ['transport', 'Van users']];
  const KINDS = [['bursary', 'Bursary'], ['sibling', 'Sibling discount'], ['staff_child', "Staff child"], ['waiver', 'Waiver'], ['other', 'Other']];
  const inp = extra => Object.assign({
    background: T().bg,
    border: '1px solid ' + T().border,
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    color: T().ink,
    fontFamily: T().font,
    outline: 'none',
    minWidth: 0
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

  // ─── shared data hook: terms + the selected term ───────────────────────
  function useTerms() {
    const [terms, setTerms] = useState(null);
    const [err, setErr] = useState('');
    const load = async () => {
      const c = sb();
      if (!c) {
        setErr('Not signed in.');
        setTerms([]);
        return;
      }
      const r = await c.from('academic_terms').select('*').eq('tenant_id', tenantId()).order('year', {
        ascending: false
      }).order('term_no', {
        ascending: false
      });
      if (r.error) {
        setErr(/does not exist|schema cache/i.test(r.error.message) ? 'Terms are not set up in the database yet — run the P3/P4 SQL first.' : r.error.message);
        setTerms([]);
        return;
      }
      setErr('');
      setTerms(r.data || []);
    };
    useEffect(() => {
      load();
    }, []);
    return {
      terms,
      err,
      reload: load
    };
  }
  function TermPicker({
    terms,
    value,
    onChange
  }) {
    return /*#__PURE__*/React.createElement("select", {
      value: value || '',
      onChange: e => onChange(Number(e.target.value) || null),
      style: inp({
        width: 220
      })
    }, (terms || []).map(t => /*#__PURE__*/React.createElement("option", {
      key: t.id,
      value: t.id
    }, t.name, t.status === 'current' ? ' · current' : t.status === 'closed' ? ' · closed' : '')));
  }

  // ─── Terms & billing ───────────────────────────────────────────────────
  function TermsBilling({
    students
  }) {
    const {
      terms,
      err,
      reload
    } = useTerms();
    const [sel, setSel] = useState(null);
    const [items, setItems] = useState([]);
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState(null);
    const [newTerm, setNewTerm] = useState(null);
    const edit = canEdit();
    const yearNow = new Date().getFullYear();
    useEffect(() => {
      if (terms && terms.length && !sel) {
        const cur = terms.find(t => t.status === 'current') || terms[0];
        setSel(cur.id);
      }
    }, [terms]);
    const term = (terms || []).find(t => t.id === sel) || null;
    const loadItems = async () => {
      if (!sel) {
        setItems([]);
        return;
      }
      const r = await sb().from('fee_items').select('*').eq('term_id', sel).order('class_key').order('name');
      if (r.error) {
        report('items', r.error);
        toast('Could not load the fee structure', 'error', r.error.message);
        return;
      }
      setItems((r.data || []).map(x => Object.assign({}, x, {
        _saved: true
      })));
    };
    useEffect(() => {
      setPreview(null);
      loadItems();
    }, [sel]);
    const classes = useMemo(() => {
      const ks = [];
      (students || []).forEach(s => {
        const k = classKey(s.stream);
        if (k && ks.indexOf(k) < 0) ks.push(k);
      });
      items.forEach(i => {
        if (i.class_key && i.class_key !== '*' && ks.indexOf(i.class_key) < 0) ks.push(i.class_key);
      });
      return ks.sort((a, b) => a.localeCompare(b, undefined, {
        numeric: true
      }));
    }, [students, items]);

    // create a term
    const saveTerm = async () => {
      const n = newTerm;
      if (!n) return;
      const year = Number(n.year),
        no = Number(n.term_no);
      if (!year || !no) {
        toast('Pick the year and term', 'error');
        return;
      }
      setBusy(true);
      const row = {
        tenant_id: tenantId(),
        year,
        term_no: no,
        name: 'Term ' + no + ' ' + year,
        starts_on: n.starts_on || null,
        ends_on: n.ends_on || null
      };
      const r = await sb().from('academic_terms').insert(row).select('id').single();
      setBusy(false);
      if (r.error) {
        toast('Term not saved', 'error', /duplicate/i.test(r.error.message) ? row.name + ' already exists.' : r.error.message);
        return;
      }
      // copy last term's fee structure so the bursar only adjusts amounts
      if (n.copyFrom) {
        const src = await sb().from('fee_items').select('class_key,name,amount,applies_to').eq('term_id', n.copyFrom);
        if (!src.error && src.data && src.data.length) {
          const ins = await sb().from('fee_items').insert(src.data.map(x => Object.assign({}, x, {
            tenant_id: tenantId(),
            term_id: r.data.id
          })));
          if (ins.error) toast('Term saved, but the fee structure was not copied', 'error', ins.error.message);
        }
      }
      setNewTerm(null);
      await reload();
      setSel(r.data.id);
      toast(row.name + ' added', 'success');
    };
    const makeCurrent = async () => {
      if (!term) return;
      setBusy(true);
      const r = await sb().rpc('nx_set_current_term', {
        p_term_id: term.id
      });
      setBusy(false);
      if (r.error) {
        toast('Could not change the current term', 'error', r.error.message);
        return;
      }
      await reload();
      toast(term.name + ' is now the current term', 'success');
    };

    // fee items
    const setItem = (i, k, v) => {
      const next = items.slice();
      next[i] = Object.assign({}, next[i], {
        [k]: v,
        _dirty: true
      });
      setItems(next);
    };
    const addItem = cls => setItems(items.concat([{
      class_key: cls || '*',
      name: 'Tuition',
      amount: '',
      applies_to: 'all',
      _dirty: true
    }]));
    const delItem = async i => {
      const it = items[i];
      if (it.id) {
        if (term && term.billed_at && !window.confirm('This term has already been billed. Removing "' + it.name + '" will NOT take it off pupils who were already charged — add a bursary/waiver for that. Remove it for future billing?')) return;
        const r = await sb().from('fee_items').delete().eq('id', it.id);
        if (r.error) {
          toast('Not removed', 'error', r.error.message);
          return;
        }
      }
      setItems(items.filter((_, j) => j !== i));
    };
    const saveItems = async () => {
      const dirty = items.filter(x => x._dirty);
      const bad = dirty.find(x => !String(x.name || '').trim() || !(Number(x.amount) > 0));
      if (bad) {
        toast('Every line needs a name and an amount', 'error');
        return;
      }
      setBusy(true);
      for (const x of dirty) {
        const row = {
          tenant_id: tenantId(),
          term_id: sel,
          class_key: x.class_key === '*' ? '*' : classKey(x.class_key),
          name: String(x.name).trim(),
          amount: Number(x.amount),
          applies_to: x.applies_to || 'all'
        };
        const r = x.id ? await sb().from('fee_items').update(row).eq('id', x.id) : await sb().from('fee_items').insert(row);
        if (r.error) {
          setBusy(false);
          report('save-item', r.error);
          toast('Fee structure not saved', 'error', r.error.message);
          return;
        }
      }
      setBusy(false);
      setPreview(null);
      await loadItems();
      toast('Fee structure saved', 'success', term && term.billed_at ? 'Run "Bill this term" again to charge new lines.' : 'Next: preview the bill.');
    };
    const importOld = async () => {
      const old = window.__FEE_STRUCTURE && window.__FEE_STRUCTURE.classes || [];
      const rows = old.filter(c => String(c.name || '').trim() && Number(c.fee) > 0).map(c => ({
        tenant_id: tenantId(),
        term_id: sel,
        class_key: classKey(c.name),
        name: 'Tuition',
        amount: Number(c.fee),
        applies_to: 'all'
      }));
      if (!rows.length) {
        toast('No saved fee list to copy', 'info');
        return;
      }
      setBusy(true);
      const r = await sb().from('fee_items').insert(rows);
      setBusy(false);
      if (r.error) {
        toast('Not copied', 'error', r.error.message);
        return;
      }
      await loadItems();
      toast(rows.length + ' class fees copied', 'success', 'Add boarding, transport, lunch lines if you charge them.');
    };

    // billing
    const bill = async apply => {
      if (!term) return;
      if (items.some(x => x._dirty)) {
        toast('Save the fee structure first', 'info');
        return;
      }
      setBusy(true);
      const r = await sb().rpc('nx_bill_term', {
        p_term_id: term.id,
        p_apply: !!apply
      });
      setBusy(false);
      if (r.error) {
        report('bill', r.error);
        toast(apply ? 'Billing failed — nothing was charged' : 'Preview failed', 'error', r.error.message);
        return;
      }
      setPreview(r.data);
      if (apply) {
        toast(term.name + ' billed', 'success', (r.data.new_lines || 0) + ' new line' + (r.data.new_lines === 1 ? '' : 's') + ' added to pupils’ accounts.');
        await reload();
        try {
          window.peakStore && window.peakStore.loadStudents && window.peakStore.loadStudents(tenantId());
        } catch (e) {}
      }
    };
    const t = T();
    if (!terms) return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 30,
        color: t.ink3
      }
    }, "Loading terms\u2026");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: '20px 28px 28px'
      }
    }, err && /*#__PURE__*/React.createElement(Box, {
      style: {
        borderColor: t.redInk,
        color: t.redInk
      }
    }, err), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        marginBottom: 14
      }
    }, terms.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "TERM"), /*#__PURE__*/React.createElement(TermPicker, {
      terms: terms,
      value: sel,
      onChange: setSel
    })), term && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: t.ink3,
        paddingBottom: 9
      }
    }, term.starts_on ? term.starts_on + ' → ' + (term.ends_on || '?') : 'no dates set', term.billed_at ? ' · billed ' + String(term.billed_at).slice(0, 10) : ' · not billed yet'), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), edit && term && term.status !== 'current' && /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: makeCurrent,
      style: btn(false)
    }, "Make current term"), edit && /*#__PURE__*/React.createElement("button", {
      onClick: () => setNewTerm({
        year: yearNow,
        term_no: 1,
        starts_on: '',
        ends_on: '',
        copyFrom: term ? term.id : null
      }),
      style: btn(false)
    }, "+ New term")), newTerm && /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "YEAR"), /*#__PURE__*/React.createElement("input", {
      value: newTerm.year,
      inputMode: "numeric",
      onChange: e => setNewTerm(Object.assign({}, newTerm, {
        year: e.target.value.replace(/[^0-9]/g, '')
      })),
      style: inp({
        width: '100%'
      })
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "TERM"), /*#__PURE__*/React.createElement("select", {
      value: newTerm.term_no,
      onChange: e => setNewTerm(Object.assign({}, newTerm, {
        term_no: e.target.value
      })),
      style: inp({
        width: '100%'
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: "1"
    }, "Term 1"), /*#__PURE__*/React.createElement("option", {
      value: "2"
    }, "Term 2"), /*#__PURE__*/React.createElement("option", {
      value: "3"
    }, "Term 3"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "OPENS"), /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: newTerm.starts_on,
      onChange: e => setNewTerm(Object.assign({}, newTerm, {
        starts_on: e.target.value
      })),
      style: inp({
        width: '100%'
      })
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "CLOSES"), /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: newTerm.ends_on,
      onChange: e => setNewTerm(Object.assign({}, newTerm, {
        ends_on: e.target.value
      })),
      style: inp({
        width: '100%'
      })
    })), terms.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "COPY FEES FROM"), /*#__PURE__*/React.createElement("select", {
      value: newTerm.copyFrom || '',
      onChange: e => setNewTerm(Object.assign({}, newTerm, {
        copyFrom: Number(e.target.value) || null
      })),
      style: inp({
        width: '100%'
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Don\u2019t copy"), terms.map(x => /*#__PURE__*/React.createElement("option", {
      key: x.id,
      value: x.id
    }, x.name))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: saveTerm,
      style: btn(true)
    }, busy ? 'Saving…' : 'Add term'), /*#__PURE__*/React.createElement("button", {
      onClick: () => setNewTerm(null),
      style: btn(false)
    }, "Cancel"))), !terms.length && !newTerm && !err && /*#__PURE__*/React.createElement(Box, {
      style: {
        textAlign: 'center',
        color: t.ink3,
        borderStyle: 'dashed'
      }
    }, "No terms yet. ", edit ? /*#__PURE__*/React.createElement("span", null, "Tap ", /*#__PURE__*/React.createElement("b", null, "+ New term"), " to add the current term, then set what each class pays.") : 'Ask the head teacher or bursar to set up the term.'), term && /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
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
        fontWeight: 700
      }
    }, "Fee structure \xB7 ", term.name), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), edit && !items.length && window.__FEE_STRUCTURE && (window.__FEE_STRUCTURE.classes || []).length > 0 && /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: importOld,
      style: btn(false)
    }, "Copy from my saved fee list"), edit && /*#__PURE__*/React.createElement("button", {
      onClick: () => addItem('*'),
      style: btn(false)
    }, "+ Line for every class")), !items.length && /*#__PURE__*/React.createElement("div", {
      style: {
        color: t.ink3,
        fontSize: 13,
        padding: '6px 0 12px'
      }
    }, "No fees for this term yet. Add Tuition for each class below, plus any lines everyone pays (e.g. Lunch for day pupils, Boarding for boarders, Transport for van users)."), ['*'].concat(classes).map(cls => {
      const rows = items.map((x, i) => [x, i]).filter(p => (p[0].class_key || '*') === cls);
      if (!rows.length && !edit) return null;
      const sub = rows.reduce((s, p) => s + (p[0].applies_to === 'all' ? Number(p[0].amount) || 0 : 0), 0);
      return /*#__PURE__*/React.createElement("div", {
        key: cls,
        style: {
          borderTop: '1px solid ' + t.border,
          padding: '10px 0'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: rows.length ? 8 : 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 13,
          minWidth: 110
        }
      }, cls === '*' ? 'Every class' : cls), sub > 0 && cls !== '*' && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11.5,
          color: t.ink3,
          fontFamily: t.mono
        }
      }, fmt(sub), " for all pupils"), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }), edit && cls !== '*' && /*#__PURE__*/React.createElement("button", {
        onClick: () => addItem(cls),
        style: btn(false, {
          padding: '5px 10px',
          fontSize: 11.5
        })
      }, "+ line")), rows.map(([x, i]) => /*#__PURE__*/React.createElement("div", {
        key: x.id || 'n' + i,
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 36px',
          gap: 8,
          marginBottom: 6
        }
      }, /*#__PURE__*/React.createElement("input", {
        disabled: !edit,
        value: x.name || '',
        onChange: e => setItem(i, 'name', e.target.value),
        placeholder: "Tuition",
        style: inp()
      }), /*#__PURE__*/React.createElement("input", {
        disabled: !edit,
        value: x.amount || '',
        inputMode: "numeric",
        onChange: e => setItem(i, 'amount', e.target.value.replace(/[^0-9]/g, '')),
        placeholder: "450000",
        style: inp({
          fontFamily: t.mono
        })
      }), /*#__PURE__*/React.createElement("select", {
        disabled: !edit,
        value: x.applies_to || 'all',
        onChange: e => setItem(i, 'applies_to', e.target.value),
        style: inp()
      }, APPLIES.map(a => /*#__PURE__*/React.createElement("option", {
        key: a[0],
        value: a[0]
      }, a[1]))), edit ? /*#__PURE__*/React.createElement("button", {
        onClick: () => delItem(i),
        title: "Remove",
        style: btn(false, {
          padding: 0
        })
      }, "\xD7") : /*#__PURE__*/React.createElement("span", null))));
    }), edit && items.some(x => x._dirty) && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: saveItems,
      style: btn(true)
    }, busy ? 'Saving…' : 'Save fee structure'))), term && edit && items.length > 0 && /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        marginBottom: 6
      }
    }, "Bill ", term.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: t.ink3,
        lineHeight: 1.55,
        marginBottom: 12
      }
    }, "Adds this term\u2019s fees (minus bursaries) to every active pupil\u2019s account. Preview first \u2014 nothing is charged until you confirm. Running it again later only bills what is new (new pupils, new lines), never twice. Arrears from earlier terms stay on the account."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: () => bill(false),
      style: btn(false)
    }, busy && !preview ? 'Working…' : 'Preview bill'), preview && !preview.applied && preview.new_lines > 0 && /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: () => bill(true),
      style: btn(true)
    }, busy ? 'Billing…' : 'Charge ' + preview.pupils_billed + ' pupils')), preview && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 1,
        background: t.border,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid ' + t.border
      }
    }, [['Pupils billed', preview.pupils_billed + ' of ' + preview.pupils], ['Fees', fmt(preview.total_charged)], ['Bursaries', '− ' + fmt(preview.total_discount)], [preview.applied ? 'New lines added' : 'Not billed yet', String(preview.new_lines)]].map(k => /*#__PURE__*/React.createElement("div", {
      key: k[0],
      style: {
        background: t.surface2 || t.surface,
        padding: '10px 12px'
      }
    }, /*#__PURE__*/React.createElement(Label, null, k[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums'
      }
    }, k[1])))), (preview.classes_without_fees || []).length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        fontSize: 12.5,
        color: t.warn
      }
    }, "\u26A0 No class fee set for: ", preview.classes_without_fees.join(', '), ". Pupils there only get the \u201CEvery class\u201D lines."), !preview.applied && preview.new_lines === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        fontSize: 12.5,
        color: t.good
      }
    }, "\u2713 Everything for this term is already billed."), !preview.applied && (preview.lines || []).length > 0 && /*#__PURE__*/React.createElement("details", {
      style: {
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement("summary", {
      style: {
        cursor: 'pointer',
        fontSize: 12.5,
        color: t.ink2
      }
    }, "See the lines (", preview.charges, preview.charges > 500 ? ', first 500 shown' : '', ")"), /*#__PURE__*/React.createElement("div", {
      style: {
        maxHeight: 300,
        overflow: 'auto',
        marginTop: 8,
        fontSize: 12,
        fontFamily: t.mono
      }
    }, preview.lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 10,
        padding: '3px 0',
        borderBottom: '1px solid ' + t.border
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 2
      }
    }, l.student_name), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        color: t.ink3
      }
    }, l.stream), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, l.item), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        textAlign: 'right'
      }
    }, fmt(l.amount)))))))));
  }

  // ─── Bursaries & discounts ─────────────────────────────────────────────
  function Bursaries({
    students
  }) {
    const {
      terms,
      err
    } = useTerms();
    const [sel, setSel] = useState(null);
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState({
      q: '',
      student_id: null,
      kind: 'bursary',
      mode: 'percent',
      value: '',
      reason: ''
    });
    const [busy, setBusy] = useState(false);
    const edit = canEdit();
    useEffect(() => {
      if (terms && terms.length && !sel) setSel((terms.find(t => t.status === 'current') || terms[0]).id);
    }, [terms]);
    const term = (terms || []).find(t => t.id === sel) || null;
    const byId = useMemo(() => {
      const m = {};
      (students || []).forEach(s => {
        m[s.id] = s;
      });
      return m;
    }, [students]);
    const load = async () => {
      if (!sel) return;
      const r = await sb().from('fee_adjustments').select('*').eq('term_id', sel).order('created_at', {
        ascending: false
      });
      if (r.error) {
        report('adj', r.error);
        toast('Could not load bursaries', 'error', r.error.message);
        return;
      }
      setRows(r.data || []);
    };
    useEffect(() => {
      load();
    }, [sel]);
    const matches = form.q.trim().length >= 2 ? (students || []).filter(s => String(s.name || '').toLowerCase().indexOf(form.q.trim().toLowerCase()) >= 0).slice(0, 8) : [];
    const add = async () => {
      const v = Number(form.value);
      if (!form.student_id) {
        toast('Pick a pupil', 'error');
        return;
      }
      if (!(v > 0) || form.mode === 'percent' && v > 100) {
        toast(form.mode === 'percent' ? 'Enter a percentage from 1 to 100' : 'Enter an amount', 'error');
        return;
      }
      setBusy(true);
      const row = {
        tenant_id: tenantId(),
        term_id: sel,
        student_id: form.student_id,
        kind: form.kind,
        reason: form.reason.trim() || null
      };
      row[form.mode === 'percent' ? 'percent' : 'amount'] = v;
      const r = await sb().from('fee_adjustments').insert(row);
      setBusy(false);
      if (r.error) {
        toast('Not saved', 'error', r.error.message);
        return;
      }
      setForm({
        q: '',
        student_id: null,
        kind: form.kind,
        mode: form.mode,
        value: '',
        reason: ''
      });
      await load();
      toast('Saved', 'success', term && term.billed_at ? 'Run "Bill this term" again in Terms & billing to apply it.' : 'It is applied when the term is billed.');
    };
    const remove = async a => {
      if (term && term.billed_at && !window.confirm('This bursary may already be on the pupil’s account. Removing it here does not take it off the account. Remove it anyway?')) return;
      const r = await sb().from('fee_adjustments').delete().eq('id', a.id);
      if (r.error) {
        toast('Not removed', 'error', r.error.message);
        return;
      }
      load();
    };
    const t = T();
    if (!terms) return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 30,
        color: t.ink3
      }
    }, "Loading\u2026");
    if (!edit) return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 30,
        color: t.ink3
      }
    }, "Only the head teacher and bursar can see bursaries.");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: '20px 28px 28px'
      }
    }, err && /*#__PURE__*/React.createElement(Box, {
      style: {
        borderColor: t.redInk,
        color: t.redInk
      }
    }, err), !terms.length && !err && /*#__PURE__*/React.createElement(Box, {
      style: {
        color: t.ink3
      }
    }, "Add a term in ", /*#__PURE__*/React.createElement("b", null, "Terms & billing"), " first."), term && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement(Label, null, "TERM"), /*#__PURE__*/React.createElement(TermPicker, {
      terms: terms,
      value: sel,
      onChange: setSel
    })), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        marginBottom: 10
      }
    }, "Add a bursary or discount"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(Label, null, "PUPIL"), /*#__PURE__*/React.createElement("input", {
      value: form.student_id ? (byId[form.student_id] || {}).name || '' : form.q,
      onChange: e => setForm(Object.assign({}, form, {
        q: e.target.value,
        student_id: null
      })),
      placeholder: "Type a name\u2026",
      style: inp({
        width: '100%'
      })
    }), !form.student_id && matches.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        zIndex: 5,
        left: 0,
        right: 0,
        background: t.surface,
        border: '1px solid ' + t.borderStr,
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 220,
        overflow: 'auto'
      }
    }, matches.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.id,
      onClick: () => setForm(Object.assign({}, form, {
        student_id: s.id,
        q: ''
      })),
      style: {
        padding: '8px 10px',
        cursor: 'pointer',
        fontSize: 13
      }
    }, s.name, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: t.ink3
      }
    }, "\xB7 ", s.stream))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "TYPE"), /*#__PURE__*/React.createElement("select", {
      value: form.kind,
      onChange: e => setForm(Object.assign({}, form, {
        kind: e.target.value
      })),
      style: inp({
        width: '100%'
      })
    }, KINDS.map(k => /*#__PURE__*/React.createElement("option", {
      key: k[0],
      value: k[0]
    }, k[1])))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "HOW MUCH"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("select", {
      value: form.mode,
      onChange: e => setForm(Object.assign({}, form, {
        mode: e.target.value
      })),
      style: inp({
        width: 70
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: "percent"
    }, "%"), /*#__PURE__*/React.createElement("option", {
      value: "amount"
    }, "UGX")), /*#__PURE__*/React.createElement("input", {
      value: form.value,
      inputMode: "numeric",
      onChange: e => setForm(Object.assign({}, form, {
        value: e.target.value.replace(/[^0-9.]/g, '')
      })),
      placeholder: form.mode === 'percent' ? '50' : '100000',
      style: inp({
        flex: 1,
        fontFamily: t.mono
      })
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "REASON"), /*#__PURE__*/React.createElement("input", {
      value: form.reason,
      onChange: e => setForm(Object.assign({}, form, {
        reason: e.target.value
      })),
      placeholder: "Approved by board, 12 Sep",
      style: inp({
        width: '100%'
      })
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: add,
      style: btn(true)
    }, busy ? 'Saving…' : 'Add'))), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        marginBottom: 10
      }
    }, rows.length, " for ", term.name), !rows.length && /*#__PURE__*/React.createElement("div", {
      style: {
        color: t.ink3,
        fontSize: 13
      }
    }, "None yet."), rows.map(a => {
      const s = byId[a.student_id] || {};
      return /*#__PURE__*/React.createElement("div", {
        key: a.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 0',
          borderTop: '1px solid ' + t.border,
          fontSize: 13
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 2,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("b", null, s.name || 'Pupil #' + a.student_id), " ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: t.ink3
        }
      }, "\xB7 ", s.stream || ''), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11.5,
          color: t.ink3
        }
      }, (KINDS.find(k => k[0] === a.kind) || ['', a.kind])[1], a.reason ? ' · ' + a.reason : '')), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: t.mono,
          fontWeight: 700
        }
      }, a.percent ? Number(a.percent) + '%' : fmt(a.amount)), /*#__PURE__*/React.createElement("button", {
        onClick: () => remove(a),
        style: btn(false, {
          padding: '5px 10px'
        })
      }, "\xD7"));
    }))));
  }
  return {
    TermsBilling,
    Bursaries,
    classKey
  };
}();
window.PD_FeesTerms = PD_FeesTerms;