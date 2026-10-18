// Source module of the NEXT School OS app.
// Loaded as a classic <script>; compiled to compiled/fee-statement.js by build-precompiled.cjs.
/* global React */
// Pupil fee statement (audit P4): every charge, bursary and payment on the
// pupil's account, grouped by term, with the balance brought forward from the
// term before and carried into the next. Built only from real fees rows.
//   window.PD_FeeStatement.open(student)   → modal
//   window.PD_FeeStatement.load(studentId) → { sections, totals }
//   window.PD_FeeStatement.pdf(student, data)

const PD_FeeStatement = function () {
  const {
    useState,
    useEffect
  } = React;
  const sb = () => window.NextSession && window.NextSession.sb || null;
  const tenantId = () => window.NextSession && window.NextSession.profile && window.NextSession.profile.tenantId || window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId || '';
  const ugx = n => 'UGX ' + Math.round(Number(n) || 0).toLocaleString();
  const day = d => {
    if (!d) return '';
    const x = new Date(d);
    return isNaN(x) ? String(d).slice(0, 10) : x.toISOString().slice(0, 10);
  };
  const brandName = () => window.__BRAND_NAME || window.SCHOOL_BRAND && window.SCHOOL_BRAND.name || 'School';
  async function pageAll(q) {
    const out = [];
    let from = 0;
    for (;;) {
      const r = await q().range(from, from + 999);
      if (r.error) throw r.error;
      out.push(...(r.data || []));
      if (!r.data || r.data.length < 1000) break;
      from += 1000;
    }
    return out;
  }

  // ─── build the statement from fees rows ────────────────────────────────
  function compute(rows, terms) {
    const ts = (terms || []).slice().sort((a, b) => a.year - b.year || a.term_no - b.term_no);
    const byId = {};
    ts.forEach(t => {
      byId[t.id] = t;
    });
    const byName = {};
    ts.forEach(t => {
      byName[String(t.name).toLowerCase()] = t;
    });
    const dateOf = r => r.occurred_at || r.created_at || null;
    const termFor = r => {
      if (r.term_id && byId[r.term_id]) return byId[r.term_id];
      if (r.term && byName[String(r.term).toLowerCase()]) return byName[String(r.term).toLowerCase()];
      const d = day(dateOf(r));
      if (!d) return null;
      for (let i = ts.length - 1; i >= 0; i--) if (ts[i].starts_on && d >= ts[i].starts_on) return ts[i];
      return null;
    };
    const sections = [];
    const idx = {};
    const sec = (t, label) => {
      const k = t ? 't' + t.id : 'x:' + label;
      if (!idx[k]) {
        idx[k] = {
          key: k,
          term: t,
          label: t ? t.name : label,
          lines: []
        };
        sections.push(idx[k]);
      }
      return idx[k];
    };
    rows.forEach(r => {
      const t = termFor(r);
      const s = sec(t, t ? '' : r.term ? String(r.term) : 'Earlier balances');
      const amt = Math.abs(Number(r.amount) || 0);
      const credit = r.kind === 'payment' || r.kind === 'discount';
      s.lines.push({
        date: day(dateOf(r)),
        kind: r.kind,
        text: r.kind === 'payment' ? 'Payment' + (r.channel ? ' · ' + (r.channel === 'online' ? 'online (Mobile Money / card)' : r.channel) : '') + (r.notes && r.notes !== 'Parent portal' && r.notes !== r.channel ? ' · ' + r.notes : '') : r.kind === 'discount' ? (r.notes || 'Bursary') + ' (bursary / discount)' : r.notes || 'Fees',
        debit: credit ? 0 : amt,
        credit: credit ? amt : 0,
        id: r.id
      });
    });
    const order = s => s.term ? ts.indexOf(s.term) + 1 : 0; // untermed lines first
    sections.sort((a, b) => order(a) - order(b));
    let run = 0,
      charged = 0,
      credited = 0,
      paid = 0;
    sections.forEach(s => {
      s.lines.sort((a, b) => (a.debit ? 0 : 1) - (b.debit ? 0 : 1) || String(a.date).localeCompare(String(b.date)) || a.id - b.id);
      s.bf = run;
      s.lines.forEach(l => {
        run += l.debit - l.credit;
        l.bal = run;
        charged += l.debit;
        credited += l.credit;
        if (l.kind === 'payment') paid += l.credit;
      });
      s.cf = run;
      s.charges = s.lines.reduce((a, l) => a + l.debit, 0);
      s.credits = s.lines.reduce((a, l) => a + l.credit, 0);
    });
    return {
      sections,
      totals: {
        charged,
        credited,
        paid,
        discounts: credited - paid,
        balance: run
      }
    };
  }
  async function load(studentId) {
    const c = sb();
    if (!c) throw new Error('Not signed in.');
    const T = tenantId();
    const rows = await pageAll(() => c.from('fees').select('*').eq('tenant_id', T).eq('student_id', studentId).order('id'));
    let terms = [];
    const tr = await c.from('academic_terms').select('*').eq('tenant_id', T);
    if (!tr.error) terms = tr.data || [];
    return compute(rows, terms);
  }

  // ─── PDF (jsPDF, same look as receipts) ────────────────────────────────
  function pdf(student, data) {
    const Ctor = window.jspdf && window.jspdf.jsPDF || window.jsPDF;
    if (!Ctor) {
      window.peakToast && window.peakToast('PDF engine still loading — try again', 'info');
      return;
    }
    const doc = new Ctor({
      unit: 'pt',
      format: 'a4'
    });
    const W = doc.internal.pageSize.getWidth(),
      H = doc.internal.pageSize.getHeight();
    let c = [180, 30, 30];
    try {
      const m = String(window.__ACCENT || '').match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      if (m) c = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    } catch (e) {}
    const head = () => {
      doc.setFillColor(c[0], c[1], c[2]);
      doc.rect(0, 0, W, 64, 'F');
      let x = 40;
      if (window.__PEAK_LOGO_DATA) {
        const L = window.__PEAK_LOGO_DATA;
        const lh = 36,
          lw = Math.max(20, lh * (L.w / L.h));
        try {
          doc.addImage(L.data, 'PNG', 40, 14, lw, lh);
          x = 40 + lw + 12;
        } catch (e) {}
      }
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text(brandName(), x, 38);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('FEE STATEMENT', W - 40, 38, {
        align: 'right'
      });
      doc.setTextColor(30, 30, 30);
    };
    head();
    let y = 92;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(student.name || 'Pupil', 40, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text((student.stream || '') + (student.guardian ? '   ·   Guardian: ' + student.guardian : ''), 40, y + 16);
    doc.text('Issued ' + day(new Date()), W - 40, y, {
      align: 'right'
    });
    y += 40;
    const cols = [40, 110, 360, 440, W - 40];
    const row = (cells, bold) => {
      if (y > H - 70) {
        doc.addPage();
        head();
        y = 92;
      }
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(String(cells[0] || ''), cols[0], y);
      doc.text(doc.splitTextToSize(String(cells[1] || ''), 240)[0], cols[1], y);
      if (cells[2] !== '') doc.text(String(cells[2]), cols[3] - 10, y, {
        align: 'right'
      });
      if (cells[3] !== '') doc.text(String(cells[3]), cols[4] - 70, y, {
        align: 'right'
      });
      if (cells[4] !== '') doc.text(String(cells[4]), cols[4], y, {
        align: 'right'
      });
      y += 15;
    };
    const n = v => v ? Math.round(v).toLocaleString() : '';
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    row(['DATE', 'DESCRIPTION', 'CHARGED', 'PAID / CREDIT', 'BALANCE'], true);
    doc.setTextColor(30, 30, 30);
    data.sections.forEach(s => {
      y += 4;
      if (y > H - 90) {
        doc.addPage();
        head();
        y = 92;
      }
      doc.setFillColor(242, 242, 242);
      doc.rect(36, y - 11, W - 72, 16, 'F');
      doc.setFontSize(10);
      row(['', s.label + (s.term && s.term.starts_on ? '  (' + s.term.starts_on + ' – ' + (s.term.ends_on || '') + ')' : ''), '', '', ''], true);
      doc.setFontSize(9);
      if (s.bf) row(['', 'Balance brought forward', '', '', Math.round(s.bf).toLocaleString()]);
      s.lines.forEach(l => row([l.date, l.text, n(l.debit), n(l.credit), Math.round(l.bal).toLocaleString()]));
      row(['', 'Balance at end of ' + s.label, '', '', Math.round(s.cf).toLocaleString()], true);
    });
    y += 14;
    if (y > H - 110) {
      doc.addPage();
      head();
      y = 92;
    }
    const t = data.totals;
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(1);
    doc.line(40, y - 8, W - 40, y - 8);
    doc.setFontSize(10);
    [['Total charged', t.charged], ['Bursaries / discounts', t.discounts], ['Total paid', t.paid]].forEach(k => {
      doc.setFont('helvetica', 'normal');
      doc.text(k[0], 300, y);
      doc.text(ugx(k[1]), W - 40, y, {
        align: 'right'
      });
      y += 15;
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(t.balance > 0 ? 'Balance due' : t.balance < 0 ? 'In credit' : 'Fully paid', 300, y + 4);
    doc.text(ugx(Math.abs(t.balance)), W - 40, y + 4, {
      align: 'right'
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Generated from the school’s records by NEXT OS. Contact the bursar about any line you don’t recognise.', W / 2, H - 30, {
      align: 'center'
    });
    doc.save('fee-statement-' + String(student.name || 'pupil').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() + '.pdf');
  }

  // ─── on-screen view ────────────────────────────────────────────────────
  function View({
    student
  }) {
    const T = window.V4 && window.V4.T;
    const [data, setData] = useState(null);
    const [err, setErr] = useState('');
    useEffect(() => {
      load(student.id).then(setData).catch(e => {
        setErr(String(e && e.message || e));
        try {
          window.nxReport && window.nxReport(e, 'fee-statement');
        } catch (x) {}
      });
    }, [student && student.id]);
    const ink = T && T.ink || '#111',
      ink3 = T && T.ink3 || '#777',
      border = T && T.border || '#ddd',
      surf = T && T.surface || '#fff',
      red = T && T.red || '#c33';
    const share = () => {
      const t = data.totals;
      const ph = String(student.guardianPhone || '').replace(/[^0-9]/g, '');
      const msg = 'Dear ' + (student.guardian || 'Parent') + ', fee statement for ' + student.name + ' at ' + brandName() + ': charged ' + ugx(t.charged) + (t.discounts ? ', bursary ' + ugx(t.discounts) : '') + ', paid ' + ugx(t.paid) + '. ' + (t.balance > 0 ? 'Balance due ' + ugx(t.balance) + '.' : 'Fully paid — thank you.');
      if (ph) window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(msg), '_blank');else window.peakToast && window.peakToast('No guardian phone on file', 'info');
    };
    const cell = {
      padding: '6px 8px',
      fontSize: 12.5,
      borderBottom: '1px solid ' + border
    };
    const num = Object.assign({}, cell, {
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap'
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        color: ink,
        maxWidth: 760,
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 14,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 180
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: ink3,
        letterSpacing: '0.06em',
        fontWeight: 700
      }
    }, "FEE STATEMENT"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 19,
        fontWeight: 700
      }
    }, student.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: ink3
      }
    }, student.stream || '', student.guardian ? ' · ' + student.guardian : '')), data && /*#__PURE__*/React.createElement("button", {
      onClick: () => pdf(student, data),
      style: {
        border: 'none',
        background: red,
        color: '#fff',
        padding: '8px 14px',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 12.5,
        cursor: 'pointer'
      }
    }, "Download PDF"), data && /*#__PURE__*/React.createElement("button", {
      onClick: share,
      style: {
        border: '1px solid ' + border,
        background: 'transparent',
        color: ink,
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 12.5,
        cursor: 'pointer'
      }
    }, "WhatsApp summary")), err && /*#__PURE__*/React.createElement("div", {
      style: {
        color: red,
        fontSize: 13
      }
    }, "Could not load the statement: ", err), !data && !err && /*#__PURE__*/React.createElement("div", {
      style: {
        color: ink3,
        fontSize: 13
      }
    }, "Loading\u2026"), data && !data.sections.length && /*#__PURE__*/React.createElement("div", {
      style: {
        color: ink3,
        fontSize: 13,
        padding: 20,
        textAlign: 'center'
      }
    }, "No fees, bursaries or payments on this account yet."), data && data.sections.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        overflowX: 'auto',
        border: '1px solid ' + border,
        borderRadius: 10,
        background: surf
      }
    }, /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: 520
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        color: ink3,
        fontSize: 11,
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("th", {
      style: cell
    }, "Date"), /*#__PURE__*/React.createElement("th", {
      style: cell
    }, "Description"), /*#__PURE__*/React.createElement("th", {
      style: num
    }, "Charged"), /*#__PURE__*/React.createElement("th", {
      style: num
    }, "Paid / credit"), /*#__PURE__*/React.createElement("th", {
      style: num
    }, "Balance"))), /*#__PURE__*/React.createElement("tbody", null, data.sections.map(s => /*#__PURE__*/React.createElement(React.Fragment, {
      key: s.key
    }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
      colSpan: 5,
      style: Object.assign({}, cell, {
        fontWeight: 700,
        background: 'rgba(127,127,127,0.10)'
      })
    }, s.label, s.term && s.term.starts_on ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: ink3
      }
    }, '  ' + s.term.starts_on + ' → ' + (s.term.ends_on || '')) : null)), s.bf !== 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
      style: cell
    }), /*#__PURE__*/React.createElement("td", {
      style: Object.assign({}, cell, {
        color: ink3
      })
    }, "Balance brought forward"), /*#__PURE__*/React.createElement("td", {
      style: num
    }), /*#__PURE__*/React.createElement("td", {
      style: num
    }), /*#__PURE__*/React.createElement("td", {
      style: num
    }, Math.round(s.bf).toLocaleString())), s.lines.map((l, i) => /*#__PURE__*/React.createElement("tr", {
      key: i
    }, /*#__PURE__*/React.createElement("td", {
      style: Object.assign({}, cell, {
        whiteSpace: 'nowrap',
        color: ink3
      })
    }, l.date), /*#__PURE__*/React.createElement("td", {
      style: cell
    }, l.text), /*#__PURE__*/React.createElement("td", {
      style: num
    }, l.debit ? Math.round(l.debit).toLocaleString() : ''), /*#__PURE__*/React.createElement("td", {
      style: Object.assign({}, num, {
        color: l.credit ? '#1a9b62' : ink
      })
    }, l.credit ? Math.round(l.credit).toLocaleString() : ''), /*#__PURE__*/React.createElement("td", {
      style: num
    }, Math.round(l.bal).toLocaleString()))), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
      style: cell
    }), /*#__PURE__*/React.createElement("td", {
      style: Object.assign({}, cell, {
        fontWeight: 700
      })
    }, "End of ", s.label), /*#__PURE__*/React.createElement("td", {
      style: num
    }), /*#__PURE__*/React.createElement("td", {
      style: num
    }), /*#__PURE__*/React.createElement("td", {
      style: Object.assign({}, num, {
        fontWeight: 700
      })
    }, Math.round(s.cf).toLocaleString()))))))), data && data.sections.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8,
        marginTop: 12
      }
    }, [['Charged', data.totals.charged], ['Bursaries', data.totals.discounts], ['Paid', data.totals.paid], [data.totals.balance > 0 ? 'Balance due' : data.totals.balance < 0 ? 'In credit' : 'Fully paid', Math.abs(data.totals.balance)]].map(k => /*#__PURE__*/React.createElement("div", {
      key: k[0],
      style: {
        border: '1px solid ' + border,
        borderRadius: 10,
        padding: '10px 12px',
        background: surf
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: ink3,
        fontWeight: 700,
        letterSpacing: '0.05em'
      }
    }, k[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums'
      }
    }, ugx(k[1]))))));
  }
  function open(student) {
    if (!student || !student.id) return;
    if (window.peakModal && window.peakModal.open) window.peakModal.open(React.createElement(View, {
      student
    }));
  }
  return {
    open,
    load,
    compute,
    pdf,
    View
  };
}();
window.PD_FeeStatement = PD_FeeStatement;