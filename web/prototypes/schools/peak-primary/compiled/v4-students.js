// Source module of the NEXT School OS app (Phase 2 split from index.html).
// Loaded as a classic <script>; compiled to compiled/v4-students.js by build-precompiled.cjs.
/* src/v4-students.jsx */
/* global React, PEAK, V4 */
// Peak Dark · Students roster with detail drawer
// Working table — search, filter by stream, sort, click row to open drawer

const PD_Students = function () {
  const T = window.V4.T;
  const D = window.PEAK || window.PEAK_FALLBACK;
  const {
    useState,
    useMemo
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
          display: 'grid',
          placeItems: 'center',
          position: 'relative'
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
  function StudentRow({
    s,
    selected,
    onClick,
    idx
  }) {
    const tone = s.fees === 'paid' ? 'good' : s.fees === 'partial' ? 'warn' : s.fees === 'none' ? 'neutral' : 'bad';
    const attTone = s.attendanceWk == null ? T.ink3 : s.attendanceWk >= 90 ? T.good : s.attendanceWk >= 70 ? T.warn : T.red;
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => onClick(s),
      style: {
        display: 'grid',
        gridTemplateColumns: '32px 36px 1.8fr 70px 1fr 1.2fr 90px 80px 36px',
        gap: 14,
        padding: '11px 22px',
        alignItems: 'center',
        background: selected ? 'rgba(226,58,82,0.10)' : idx % 2 ? T.surface : T.bg,
        borderBottom: '1px solid ' + T.border,
        cursor: 'pointer',
        borderLeft: selected ? '3px solid ' + T.red : '3px solid transparent'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      defaultChecked: selected,
      style: {
        accentColor: T.red,
        width: 14,
        height: 14
      },
      onClick: e => e.stopPropagation()
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 999,
        background: 'oklch(0.62 0.07 ' + (40 + s.id * 21 % 320) + ')',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: 11,
        fontWeight: 700
      }
    }, s.name.split(' ').map(p => p[0]).slice(0, 2).join('')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: T.ink,
        fontWeight: 600
      }
    }, s.name, s.flag === 'top' ? /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 8,
        fontSize: 10,
        color: T.gold,
        fontFamily: T.mono
      }
    }, "\u2605 TOP") : '', s.flag === 'risk' ? /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 8,
        fontSize: 10,
        color: T.redInk,
        fontFamily: T.mono
      }
    }, "\u25CF RISK") : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.ink3
      }
    }, s.guardian)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.ink,
        fontFamily: T.mono,
        fontWeight: 600
      }
    }, s.stream), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 5,
        borderRadius: 999,
        background: T.surface2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: (s.attendanceWk == null ? 0 : s.attendanceWk) + '%',
        background: attTone,
        borderRadius: 999
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: attTone,
        fontFamily: T.mono,
        fontWeight: 600,
        width: 32
      }
    }, s.attendanceWk == null ? '\u2014' : s.attendanceWk + '%')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Pill, {
      tone: tone
    }, s.fees === 'none' ? 'No fees yet' : s.fees === 'paid' ? 'Paid' : D.fmtUGXshort(s.balance) + ' due')), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.ink3,
        fontFamily: T.mono,
        textAlign: 'right'
      }
    }, s.lastSeen), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.ink3,
        fontFamily: T.mono,
        textAlign: 'right'
      }
    }, s.id < 10 ? 'PK-00' + s.id : 'PK-0' + s.id), /*#__PURE__*/React.createElement("div", {
      style: {
        color: T.ink3,
        fontSize: 14,
        textAlign: 'center'
      }
    }, "\u22EF"));
  }
  function Drawer({
    s,
    onClose,
    onOpenProfile
  }) {
    if (!s) return null;
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 360,
        background: T.surface,
        borderLeft: '1px solid ' + T.border,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 22px',
        borderBottom: '1px solid ' + T.border,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        borderRadius: 999,
        background: 'oklch(0.62 0.07 ' + (40 + s.id * 21 % 320) + ')',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: 14,
        fontWeight: 700
      }
    }, s.name.split(' ').map(p => p[0]).slice(0, 2).join('')), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        lineHeight: 1.15,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 600
      }
    }, s.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.ink3,
        fontFamily: T.mono
      }
    }, s.stream, " \xB7 ", s.id < 10 ? 'PK-00' + s.id : 'PK-0' + s.id)), /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        border: 'none',
        background: T.surface2,
        color: T.ink,
        fontSize: 14,
        cursor: 'pointer'
      }
    }, "\u2715")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '18px 22px',
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Pill, {
      tone: s.attendanceWk == null ? 'neutral' : s.attendanceWk >= 90 ? 'good' : s.attendanceWk >= 70 ? 'warn' : 'bad'
    }, s.attendanceWk == null ? 'no attendance yet' : s.attendanceWk + '% wk'), /*#__PURE__*/React.createElement(Pill, {
      tone: s.fees === 'paid' ? 'good' : s.fees === 'partial' ? 'warn' : s.fees === 'none' ? 'neutral' : 'bad'
    }, s.fees === 'none' ? 'No fees yet' : s.fees === 'paid' ? 'Fees paid' : D.fmtUGXshort(s.balance) + ' due'), s.flag === 'top' && /*#__PURE__*/React.createElement(Pill, {
      tone: "brand"
    }, "\u2605 top-5 in class"), s.flag === 'risk' && /*#__PURE__*/React.createElement(Pill, {
      tone: "bad"
    }, "\u25CF risk this term")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: T.ink3,
        fontFamily: T.mono,
        letterSpacing: '0.05em',
        fontWeight: 600,
        marginBottom: 8
      }
    }, "GUARDIAN"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.surface2,
        borderRadius: 10,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: T.ink,
        fontWeight: 600
      }
    }, s.guardian), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: T.ink3,
        fontFamily: T.mono,
        marginTop: 2
      }
    }, "+256 70 234 1", s.id * 17 % 1000), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.peakWhatsApp(s.guardianPhone || '0702341' + s.id * 17 % 1000, 'Hello ' + (s.guardian || '') + ', a message from ' + window.peakSchoolName() + ' regarding ' + s.name + '.'),
      style: {
        flex: 1,
        padding: '7px 10px',
        background: 'transparent',
        border: '1px solid ' + T.borderStr,
        color: T.ink,
        borderRadius: 7,
        fontSize: 11.5,
        cursor: 'pointer'
      }
    }, "WhatsApp"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.peakCall(s.guardianPhone || '+256702341' + s.id * 17 % 1000),
      style: {
        flex: 1,
        padding: '7px 10px',
        background: 'transparent',
        border: '1px solid ' + T.borderStr,
        color: T.ink,
        borderRadius: 7,
        fontSize: 11.5,
        cursor: 'pointer'
      }
    }, "Call")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: T.ink3,
        fontFamily: T.mono,
        letterSpacing: '0.05em',
        fontWeight: 600,
        marginBottom: 8
      }
    }, "ATTENDANCE"), s.attendanceWk != null ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.surface2,
        borderRadius: 10,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        color: s.attendanceWk >= 85 ? T.good : s.attendanceWk >= 70 ? T.warn : T.red,
        fontVariantNumeric: 'tabular-nums'
      }
    }, s.attendanceWk, "%"), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: T.bg,
        borderRadius: 999,
        marginTop: 10,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: Math.max(0, Math.min(100, s.attendanceWk)) + '%',
        background: s.attendanceWk >= 85 ? T.good : s.attendanceWk >= 70 ? T.warn : T.red,
        borderRadius: 999
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.ink3,
        fontFamily: T.mono,
        marginTop: 6
      }
    }, "present or late, from roll call")) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.ink3
      }
    }, "No roll call recorded for this period yet.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: T.ink3,
        fontFamily: T.mono,
        letterSpacing: '0.05em',
        fontWeight: 600,
        marginBottom: 8
      }
    }, "FEES"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.surface2,
        borderRadius: 10,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        color: s.fees === 'none' ? T.ink3 : s.balance > 0 ? T.warn : T.good,
        fontVariantNumeric: 'tabular-nums'
      }
    }, s.fees === 'none' ? 'No fees yet' : s.balance > 0 ? 'UGX ' + Number(s.balance).toLocaleString() : 'Cleared'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: T.ink3,
        fontFamily: T.mono
      }
    }, s.fees === 'none' ? 'not billed' : s.balance > 0 ? 'outstanding' : 'no balance')), Number(s.termFee) > 0 && (() => {
      const pct = Math.max(0, Math.min(100, Math.round(100 * (Number(s.paidAmount) || 0) / Number(s.termFee))));
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          height: 6,
          background: T.bg,
          borderRadius: 999,
          marginTop: 10,
          overflow: 'hidden'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          height: '100%',
          width: pct + '%',
          background: s.balance > 0 ? T.warn : T.good,
          borderRadius: 999
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: T.ink3,
          fontFamily: T.mono,
          marginTop: 6
        }
      }, pct, "% of UGX ", Number(s.termFee).toLocaleString(), " paid"));
    })(), window.PD_FeeStatement && s.id && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.PD_FeeStatement.open(s),
      style: {
        marginTop: 10,
        border: '1px solid ' + T.borderStr,
        background: 'transparent',
        color: T.ink2,
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: 12,
        cursor: 'pointer'
      }
    }, "Fee statement"))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'linear-gradient(150deg, ' + T.surface3 + ' 0%, ' + T.surface + ' 70%)',
        border: '1px solid ' + T.borderStr,
        borderRadius: 12,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        borderRadius: 6,
        background: T.red,
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontFamily: T.mono,
        fontSize: 10,
        fontWeight: 700
      }
    }, "AI"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600
      }
    }, "This week")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.ink2,
        lineHeight: 1.55
      }
    }, s.flag === 'top' ? `${s.name.split(' ')[0]} is in the top 5 of ${s.stream} on quiz scores this term. Consistent attendance and strong engagement in Math.` : s.balance > 0 ? `${s.name.split(' ')[0]} has UGX ${(s.balance / 1000).toFixed(0)}K outstanding in fees${s.attendanceWk != null ? ` and ${s.attendanceWk}% attendance` : ''}. Attendance and performance build as the term runs.` : `${s.name.split(' ')[0]} is on the roster, fees cleared. Attendance and performance data will appear here as the term runs.`)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onOpenProfile && onOpenProfile(s),
      style: {
        flex: 1,
        padding: '10px 14px',
        background: T.red,
        color: '#fff',
        border: 'none',
        borderRadius: 9,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, "Open full profile \u2192"))));
  }
  function Students({
    embed = false,
    onNav,
    onOpenProfile,
    onAddStudent
  } = {}) {
    const [selectedId, setSelectedId] = useState(4); // Brian Mugisha — risk
    const [query, setQuery] = useState('');
    const [streamFilter, setStreamFilter] = useState('All');
    const [feesFilter, setFeesFilter] = useState('All');
    const [sort, setSort] = useState('name');
    const [attWin, setAttWin] = useState(window.peakStore && window.peakStore.attWindow || 7);
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [, force] = React.useReducer(n => n + 1, 0);
    React.useEffect(() => {
      if (window.peakStore && window.peakStore.subscribe) {
        return window.peakStore.subscribe(force);
      }
    }, []);
    const normalizeClass = str => {
      if (!str) return '';
      const s = String(str).trim();
      const lower = s.toLowerCase();
      if (lower.includes('baby')) return 'Baby Class';
      if (lower.includes('middle')) return 'Middle Class';
      if (lower.includes('top')) return 'Top Class';
      if (lower.includes('one') || lower === 'p1' || lower === 'p.1' || lower.includes('primary 1') || lower.includes('primary one')) return 'Primary One';
      if (lower.includes('two') || lower === 'p2' || lower === 'p.2' || lower.includes('primary 2') || lower.includes('primary two')) return 'Primary Two';
      if (lower.includes('three') || lower === 'p3' || lower === 'p.3' || lower.includes('primary 3') || lower.includes('primary three')) return 'Primary Three';
      if (lower.includes('four') || lower === 'p4' || lower === 'p.4' || lower.includes('primary 4') || lower.includes('primary four')) return 'Primary Four';
      if (lower.includes('five') || lower === 'p5' || lower === 'p.5' || lower.includes('primary 5') || lower.includes('primary five')) return 'Primary Five';
      if (lower.includes('six') || lower === 'p6' || lower === 'p.6' || lower.includes('primary 6') || lower.includes('primary six')) return 'Primary Six';
      if (lower.includes('seven') || lower === 'p7' || lower === 'p.7' || lower.includes('primary 7') || lower.includes('primary seven')) return 'Primary Seven';
      return s;
    };
    const studs = D && Array.isArray(D.students) ? D.students : [];
    const rows = useMemo(() => {
      let r = studs.slice();
      if (query) r = r.filter(s => ((s.name || '') + (s.guardian || '')).toLowerCase().includes(query.toLowerCase()));
      if (streamFilter !== 'All') {
        const filterNorm = normalizeClass(streamFilter);
        r = r.filter(s => {
          const sClass = s.stream || s.class || '';
          const sNorm = normalizeClass(sClass);
          return sNorm === filterNorm || sClass.toLowerCase().includes(streamFilter.toLowerCase()) || streamFilter.toLowerCase().includes(sClass.toLowerCase());
        });
      }
      if (feesFilter !== 'All') {
        if (feesFilter === 'overdue') {
          r = r.filter(s => (s.balance || 0) > 0 || s.fees === 'overdue' || s.fees === 'partial');
        } else if (feesFilter === 'paid') {
          r = r.filter(s => (s.balance || 0) <= 0 || s.fees === 'paid');
        } else if (feesFilter === 'partial') {
          r = r.filter(s => (s.balance || 0) > 0 && ((s.paidAmount || 0) > 0 || s.fees === 'partial'));
        }
      }
      if (sort === 'name') r.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (sort === 'risk') r.sort((a, b) => (a.attendanceWk == null ? 101 : a.attendanceWk) - (b.attendanceWk == null ? 101 : b.attendanceWk));
      if (sort === 'fees') r.sort((a, b) => (b.balance || 0) - (a.balance || 0));
      if (sort === 'recent') r.sort((a, b) => (a.lastSeen || '').localeCompare(b.lastSeen || ''));
      return r;
    }, [query, streamFilter, feesFilter, sort, studs.length]);
    const selected = studs.find(s => s.id === selectedId) || studs[0];

    // Build dynamic class dropdown options from students roster + standard Ugandan primary classes
    const classOpts = useMemo(() => {
      const standard = [{
        id: 'All',
        label: 'All classes'
      }, {
        id: 'Baby Class',
        label: 'Baby Class'
      }, {
        id: 'Middle Class',
        label: 'Middle Class'
      }, {
        id: 'Top Class',
        label: 'Top Class'
      }, {
        id: 'Primary One',
        label: 'Primary One (P1)'
      }, {
        id: 'Primary Two',
        label: 'Primary Two (P2)'
      }, {
        id: 'Primary Three',
        label: 'Primary Three (P3)'
      }, {
        id: 'Primary Four',
        label: 'Primary Four (P4)'
      }, {
        id: 'Primary Five',
        label: 'Primary Five (P5)'
      }, {
        id: 'Primary Six',
        label: 'Primary Six (P6)'
      }, {
        id: 'Primary Seven',
        label: 'Primary Seven (P7)'
      }];
      // Collect any extra classes from roster
      const extra = new Set();
      studs.forEach(s => {
        const c = s.stream || s.class;
        if (c) extra.add(c);
      });
      return standard;
    }, [studs.length]);
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
    }, /*#__PURE__*/React.createElement("header", {
      style: {
        padding: '22px 28px 16px',
        borderBottom: '1px solid ' + T.border
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.ink3,
        fontFamily: T.mono,
        letterSpacing: '0.08em',
        fontWeight: 600,
        marginBottom: 8
      }
    }, "ROSTER"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.05
      }
    }, "Students \xB7 ", (D && D.students || []).length, " enrolled"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.ink3,
        marginTop: 4
      }
    }, new Set((D && D.students || []).map(function (x) {
      return normalizeClass(x.stream || x.class);
    }).filter(Boolean)).size, " classes \xB7 ", window.getSchoolCalendarLabel ? window.getSchoolCalendarLabel().termWeekStr : 'Term 2')), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.peakModal && window.peakModal.open(React.createElement(window.PEAK_FORMS.ImportStudents)),
      style: {
        border: '1px solid ' + T.borderStr,
        background: 'transparent',
        color: T.ink2,
        padding: '8px 14px',
        borderRadius: 9,
        fontSize: 12.5,
        cursor: 'pointer'
      }
    }, "Import CSV"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onAddStudent ? onAddStudent() : window.peakNewStudent && window.peakNewStudent(),
      style: {
        border: 'none',
        background: T.red,
        color: '#fff',
        padding: '9px 16px',
        borderRadius: 9,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, "+ New student"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 9,
        background: T.surface,
        border: '1px solid ' + T.border,
        width: 280
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.ink3
      }
    }, "\u2315"), /*#__PURE__*/React.createElement("input", {
      value: query,
      onChange: e => setQuery(e.target.value),
      placeholder: "Search name or guardian\u2026",
      style: {
        border: 'none',
        outline: 'none',
        background: 'transparent',
        flex: 1,
        fontSize: 13,
        color: T.ink,
        fontFamily: T.font
      }
    })), /*#__PURE__*/React.createElement("select", {
      value: streamFilter,
      onChange: e => setStreamFilter(e.target.value),
      style: {
        background: T.surface,
        border: '1px solid ' + T.border,
        color: T.ink,
        padding: '8px 12px',
        borderRadius: 9,
        fontSize: 12.5,
        cursor: 'pointer',
        fontFamily: T.font
      }
    }, classOpts.map(c => /*#__PURE__*/React.createElement("option", {
      key: c.id,
      value: c.id
    }, c.label))), /*#__PURE__*/React.createElement("select", {
      value: feesFilter,
      onChange: e => setFeesFilter(e.target.value),
      style: {
        background: T.surface,
        border: '1px solid ' + T.border,
        color: T.ink,
        padding: '8px 12px',
        borderRadius: 9,
        fontSize: 12.5,
        cursor: 'pointer',
        fontFamily: T.font
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "All"
    }, "All fees"), /*#__PURE__*/React.createElement("option", {
      value: "paid"
    }, "Paid"), /*#__PURE__*/React.createElement("option", {
      value: "partial"
    }, "Partial"), /*#__PURE__*/React.createElement("option", {
      value: "overdue"
    }, "Overdue / Unpaid")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      title: "Attendance window",
      style: {
        display: 'flex',
        gap: 4,
        padding: 3,
        background: T.surface,
        border: '1px solid ' + T.border,
        borderRadius: 9
      }
    }, [[7, 'This week'], [120, 'Term-to-date']].map(([d, l]) => /*#__PURE__*/React.createElement("button", {
      key: d,
      onClick: () => {
        setAttWin(d);
        if (window.peakStore && window.peakStore.setAttendanceWindow) window.peakStore.setAttendanceWindow(d);
      },
      style: {
        padding: '5px 12px',
        borderRadius: 6,
        border: 'none',
        background: attWin === d ? T.ink : 'transparent',
        color: attWin === d ? '#fff' : T.ink2,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: T.font
      }
    }, l))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        padding: 3,
        background: T.surface,
        border: '1px solid ' + T.border,
        borderRadius: 9
      }
    }, [['name', 'Name'], ['risk', 'Risk'], ['fees', 'Fees due'], ['recent', 'Recent']].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setSort(k),
      style: {
        padding: '5px 12px',
        borderRadius: 6,
        border: 'none',
        background: sort === k ? T.red : 'transparent',
        color: sort === k ? '#fff' : T.ink2,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: T.font
      }
    }, l))))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '32px 36px 1.8fr 110px 1fr 1.2fr 90px 80px 36px',
        gap: 14,
        padding: '10px 22px',
        borderBottom: '1px solid ' + T.border,
        background: T.surface,
        color: T.ink3,
        fontSize: 10.5,
        fontFamily: T.mono,
        fontWeight: 600,
        letterSpacing: '0.05em'
      }
    }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null, "CHILD \xB7 GUARDIAN"), /*#__PURE__*/React.createElement("div", null, "CLASS"), /*#__PURE__*/React.createElement("div", null, "ATTENDANCE \xB7 WK"), /*#__PURE__*/React.createElement("div", null, "FEES"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, "LAST SEEN"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, "ID"), /*#__PURE__*/React.createElement("div", null)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto'
      }
    }, rows.map((s, i) => /*#__PURE__*/React.createElement(StudentRow, {
      key: s.id,
      s: s,
      idx: i,
      selected: s.id === selectedId,
      onClick: st => {
        setSelectedId(st.id);
        setDrawerOpen(true);
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 22px',
        fontSize: 11.5,
        color: T.ink3,
        fontFamily: T.mono,
        textAlign: 'center'
      }
    }, "Showing ", rows.length, " of ", (D && D.students || []).length)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '12px 22px',
        borderTop: '1px solid ' + T.border,
        background: T.surface,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Pill, {
      tone: "brand"
    }, "1 selected"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        background: 'transparent',
        border: '1px solid ' + T.border,
        color: T.ink2,
        padding: '6px 12px',
        borderRadius: 7,
        fontSize: 12,
        cursor: 'pointer'
      }
    }, "Send WhatsApp"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.open(window.peakSchoolLink ? window.peakSchoolLink('enroll') : './student-enrollment-form.html', '_blank'),
      style: {
        background: 'rgba(0,252,143,0.12)',
        border: '1px solid rgba(0,252,143,0.25)',
        color: T.green,
        padding: '6px 12px',
        borderRadius: 7,
        fontSize: 12,
        cursor: 'pointer',
        fontWeight: 600
      }
    }, "Share Enrollment Form \uD83D\uDD17"), /*#__PURE__*/React.createElement("button", {
      style: {
        background: 'transparent',
        border: '1px solid ' + T.border,
        color: T.ink2,
        padding: '6px 12px',
        borderRadius: 7,
        fontSize: 12,
        cursor: 'pointer'
      }
    }, "Generate report"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.peakExportRoster && window.peakExportRoster(),
      style: {
        background: 'transparent',
        border: '1px solid ' + T.border,
        color: T.ink2,
        padding: '6px 12px',
        borderRadius: 7,
        fontSize: 12,
        cursor: 'pointer'
      }
    }, "Export CSV")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.ink3,
        fontFamily: T.mono
      }
    }, rows.filter(s => s.flag === 'risk').length, " at-risk in current view"))), drawerOpen && /*#__PURE__*/React.createElement(Drawer, {
      s: selected,
      onClose: () => setDrawerOpen(false),
      onOpenProfile: onOpenProfile
    }))));
  }
  return {
    Students
  };
}();
window.PD_Students = PD_Students;