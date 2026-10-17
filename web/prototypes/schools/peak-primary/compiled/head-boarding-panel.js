// React and ReactDOM are page globals (UMD). No import lines: these files are
// loaded as plain classic scripts (precompiled by build-precompiled.cjs).
(function () {
  // NEXT OS Design Tokens
  const T = {
    bg: '#0F1115',
    panelBg: '#1C1F26',
    cardBg: '#232730',
    text: '#E2E8F0',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    accent: '#3B82F6',
    // Blue
    accentHover: '#2563EB',
    accentMuted: 'rgba(59, 130, 246, 0.1)',
    success: '#10B981',
    // Emerald
    successMuted: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B',
    // Amber
    warningMuted: 'rgba(245, 158, 11, 0.1)',
    info: '#0EA5E9',
    infoMuted: 'rgba(14, 165, 233, 0.1)',
    border: '#334155',
    borderLight: '#475569',
    radiusSm: '6px',
    radiusMd: '8px',
    radiusLg: '12px',
    fontMain: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  };
  const BoardingPanel = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [classFilter, setClassFilter] = React.useState('All Boarders');
    const [roster, setRoster] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [totalRevenue, setTotalRevenue] = React.useState(0);

    // No dorm/bed/matron assignment data exists in Supabase yet (that's a
    // separate onboarding step the school hasn't done) — show an honest
    // empty/setup state instead of fabricated hostel names and matrons.
    const dorms = [];
    React.useEffect(() => {
      let alive = true;
      const tenantId = typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'peak-primary';
      const sb = window.NextSession && window.NextSession.sb || window.SCHOOL_STORE && window.SCHOOL_STORE.getSupabase && window.SCHOOL_STORE.getSupabase() || window.supabase && window.supabase.createClient && window.supabase.createClient('https://llxhvqkkgftqwefmrofn.supabase.co', 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9');
      if (!sb || typeof sb.from !== 'function') {
        setLoading(false);
        return;
      }
      Promise.all([sb.from('students').select('id, name, stream, guardian_name, guardian_phone').eq('tenant_id', tenantId).eq('is_boarding', true), sb.from('fees').select('student_id, kind, amount').eq('tenant_id', tenantId)]).then(([studentsRes, feesRes]) => {
        if (!alive) return;
        const students = studentsRes && studentsRes.data || [];
        const boardingIds = new Set(students.map(s => s.id));
        const feeRows = (feesRes && feesRes.data || []).filter(f => boardingIds.has(f.student_id));
        const balanceByStudent = {};
        let revenue = 0;
        feeRows.forEach(f => {
          balanceByStudent[f.student_id] = (balanceByStudent[f.student_id] || 0) + Number(f.amount || 0);
          if (f.kind === 'payment') revenue += Math.abs(Number(f.amount || 0));
        });
        setTotalRevenue(revenue);
        setRoster(students.map(s => {
          const balance = balanceByStudent[s.id] || 0;
          return {
            id: s.id,
            name: s.name,
            class: s.stream || '—',
            dorm: 'Not assigned',
            bed: '—',
            guardian: s.guardian_name || '—',
            contact: s.guardian_phone || '—',
            status: 'Not checked in',
            statusType: 'default',
            feeStatus: balance <= 0 ? 'Paid' : 'Owing',
            feeType: balance <= 0 ? 'success' : 'warning'
          };
        }));
        setLoading(false);
      }).catch(() => {
        if (alive) setLoading(false);
      });
      return () => {
        alive = false;
      };
    }, []);
    const getBadgeStyle = type => {
      switch (type) {
        case 'success':
          return {
            bg: T.successMuted,
            color: T.success,
            border: `1px solid ${T.successMuted}`
          };
        case 'warning':
          return {
            bg: T.warningMuted,
            color: T.warning,
            border: `1px solid ${T.warningMuted}`
          };
        case 'info':
          return {
            bg: T.infoMuted,
            color: T.info,
            border: `1px solid ${T.infoMuted}`
          };
        default:
          return {
            bg: T.panelBg,
            color: T.text,
            border: `1px solid ${T.border}`
          };
      }
    };
    const Badge = ({
      label,
      type,
      dot
    }) => {
      const style = getBadgeStyle(type);
      return /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '99px',
          backgroundColor: style.bg,
          color: style.color,
          border: style.border,
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.02em'
        }
      }, dot && /*#__PURE__*/React.createElement("span", {
        style: {
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: style.color
        }
      }), label);
    };
    const HeaderStrip = () => /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '16px 32px',
        backgroundColor: T.panelBg,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: T.accent,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '14px'
      }
    }, "KL"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '15px',
        fontWeight: 700,
        color: T.text
      }
    }, "Kabs Lily Junior School & KinderCare Centre"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        color: T.textMuted
      }
    }, "Boarding & Hostel Command Center \xB7 Term 2 \u2014 2026"))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        padding: '4px 12px',
        borderRadius: '99px',
        backgroundColor: T.successMuted,
        color: T.success,
        border: `1px solid ${T.successMuted}`,
        fontWeight: 600
      }
    }, "\uD83C\uDFE0 Mixed Day & Boarding"));
    const filteredRoster = roster.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.guardian.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = classFilter === 'All Boarders' || student.class === classFilter;
      return matchesSearch && matchesClass;
    });
    const classOptions = Array.from(new Set(roster.map(s => s.class))).filter(Boolean).sort();
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: T.fontMain,
        backgroundColor: T.bg,
        color: T.text,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement(HeaderStrip, null), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '32px 48px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: '0 0 12px 0',
        fontSize: '28px',
        fontWeight: 700,
        letterSpacing: '-0.02em'
      }
    }, "Boarding & Hostel Command"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: '6px 12px',
        borderRadius: '99px',
        fontSize: '13px',
        fontWeight: 500,
        border: `1px solid ${T.border}`
      }
    }, "Mixed Day & Boarding School \uD83C\uDFE0")))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px'
      }
    }, [{
      label: 'Total Boarders',
      value: loading ? '—' : String(roster.length),
      sub: 'Marked boarding in Students',
      color: T.accent
    }, {
      label: 'Hostel Occupancy',
      value: '—',
      sub: 'No dorms configured yet',
      color: T.info
    }, {
      label: 'Boarding Revenue',
      value: loading ? '—' : 'UGX ' + totalRevenue.toLocaleString(),
      sub: 'Collected',
      color: T.success
    }, {
      label: 'Ring-fenced Surplus',
      value: '—',
      sub: 'Not tracked yet',
      color: T.textDim
    }].map((stat, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        backgroundColor: T.panelBg,
        padding: '24px',
        borderRadius: T.radiusLg,
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${stat.color}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: T.textMuted,
        fontSize: '13px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '8px'
      }
    }, stat.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '28px',
        fontWeight: 700,
        marginBottom: '4px'
      }
    }, stat.value), /*#__PURE__*/React.createElement("div", {
      style: {
        color: T.textDim,
        fontSize: '14px',
        fontWeight: 500
      }
    }, stat.sub)))), dorms.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        backgroundColor: T.panelBg,
        borderRadius: T.radiusLg,
        border: `1px dashed ${T.border}`,
        padding: '28px',
        textAlign: 'center',
        color: T.textMuted
      }
    }, "No hostels/dorms set up yet for this school \u2014 matron assignments and bed occupancy will show here once they're added in School Setup.") : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '24px'
      }
    }, dorms.map(dorm => /*#__PURE__*/React.createElement("div", {
      key: dorm.id,
      style: {
        backgroundColor: T.panelBg,
        borderRadius: T.radiusLg,
        border: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 24px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '24px'
      }
    }, dorm.icon), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 600
      }
    }, dorm.name)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '14px',
        color: T.textMuted,
        fontWeight: 500
      }
    }, "Occupancy: ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: T.text
      }
    }, dorm.occupied, "/", dorm.capacity))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: T.cardBg
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.textMuted,
        fontSize: '13px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }
    }, "Matron / Patron"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '15px',
        fontWeight: 500
      }
    }, dorm.matron, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.textDim
      }
    }, "(", dorm.matronPhone, ")"))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '8px 16px',
        backgroundColor: 'transparent',
        border: `1px solid ${T.borderLight}`,
        color: T.text,
        borderRadius: T.radiusSm,
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600
      }
    }, "\uD83D\uDCDE Call")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '12px 16px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: T.radiusSm,
        border: `1px dashed ${T.border}`
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '14px',
        fontWeight: 500
      }
    }, "Status:"), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '14px',
        color: T.textMuted
      }
    }, dorm.status)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        backgroundColor: T.panelBg,
        borderRadius: T.radiusLg,
        border: `1px solid ${T.border}`,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 24px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        backgroundColor: T.cardBg
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        fontSize: '16px',
        fontWeight: 600,
        width: '250px'
      }
    }, "Night Attendance & Roster"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "Find boarding student or matron...",
      value: searchQuery,
      onChange: e => setSearchQuery(e.target.value),
      style: {
        width: '100%',
        padding: '10px 16px',
        paddingLeft: '36px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        color: T.text,
        fontSize: '14px',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: T.textDim
      }
    }, "\uD83D\uDD0D")), /*#__PURE__*/React.createElement("select", {
      value: classFilter,
      onChange: e => setClassFilter(e.target.value),
      style: {
        padding: '10px 16px',
        backgroundColor: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        color: T.text,
        fontSize: '14px',
        outline: 'none',
        cursor: 'pointer',
        colorScheme: 'dark'
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "All Boarders",
      style: {
        background: T.cardBg,
        color: T.text
      }
    }, "All Boarders"), classOptions.map(c => /*#__PURE__*/React.createElement("option", {
      key: c,
      value: c,
      style: {
        background: T.cardBg,
        color: T.text
      }
    }, c)))), /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderBottom: `1px solid ${T.border}`
      }
    }, /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '16px 24px',
        color: T.textMuted,
        fontSize: '13px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }
    }, "Student"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '16px 24px',
        color: T.textMuted,
        fontSize: '13px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }
    }, "Dorm & Bed"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '16px 24px',
        color: T.textMuted,
        fontSize: '13px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }
    }, "Emergency Contact"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '16px 24px',
        color: T.textMuted,
        fontSize: '13px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }
    }, "Status"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '16px 24px',
        color: T.textMuted,
        fontSize: '13px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textAlign: 'right'
      }
    }, "Actions"))), /*#__PURE__*/React.createElement("tbody", null, filteredRoster.map(student => /*#__PURE__*/React.createElement("tr", {
      key: student.id,
      style: {
        borderBottom: `1px solid ${T.border}`
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '16px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: '15px'
      }
    }, student.name), /*#__PURE__*/React.createElement("div", {
      style: {
        color: T.textDim,
        fontSize: '13px',
        marginTop: '4px'
      }
    }, "Class: ", student.class)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '16px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: '14px'
      }
    }, student.dorm), /*#__PURE__*/React.createElement("div", {
      style: {
        color: T.textDim,
        fontSize: '13px',
        marginTop: '4px'
      }
    }, "Bed ", student.bed)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '16px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: '14px'
      }
    }, student.guardian), /*#__PURE__*/React.createElement("div", {
      style: {
        color: T.textDim,
        fontSize: '13px',
        marginTop: '4px'
      }
    }, student.contact)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '16px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      label: student.status,
      type: student.statusType,
      dot: true
    }), /*#__PURE__*/React.createElement(Badge, {
      label: `${student.feeStatus} Fees`,
      type: student.feeType
    }))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '16px 24px',
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '6px 12px',
        backgroundColor: 'transparent',
        border: `1px solid ${T.borderLight}`,
        color: T.text,
        borderRadius: T.radiusSm,
        cursor: 'pointer',
        fontSize: '12px'
      }
    }, "\uD83D\uDCDE Call Matron"), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '6px 12px',
        backgroundColor: 'transparent',
        border: `1px solid ${T.borderLight}`,
        color: T.text,
        borderRadius: T.radiusSm,
        cursor: 'pointer',
        fontSize: '12px'
      }
    }, "\uD83D\uDCAC Msg Parent"))))), filteredRoster.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
      colSpan: "5",
      style: {
        padding: '48px',
        textAlign: 'center',
        color: T.textMuted
      }
    }, loading ? 'Loading boarding roster…' : 'No boarding students found matching criteria.'))))), /*#__PURE__*/React.createElement("div", {
      style: {
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        border: `1px solid rgba(16, 185, 129, 0.2)`,
        borderRadius: T.radiusLg,
        padding: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '24px'
      }
    }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
      style: {
        margin: '0 0 8px 0',
        color: T.success,
        fontSize: '16px',
        fontWeight: 600
      }
    }, "Resource Protection"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        color: T.textMuted,
        fontSize: '14px',
        lineHeight: 1.6
      }
    }, "Boarding funds collected so far (", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: T.text
      }
    }, loading ? '—' : 'UGX ' + totalRevenue.toLocaleString()), ") should be ring-fenced from Day Scholar funds \u2014 meal, bedding, and matron costs are meant to be covered from boarding revenue without encroaching on day scholar resources.")))));
  };

  // Expose to window
  window.HeadBoardingPanel = BoardingPanel;

  // Demo Wrapper
  window.HeadBoardingPanelDemo = () => {
    return /*#__PURE__*/React.createElement(BoardingPanel, null);
  };
})();