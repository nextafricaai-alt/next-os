(function() {
  const React = window.React;

  // NEXT OS Design Tokens
  const T = {
    bg: '#0F1115',
    panelBg: '#1C1F26',
    cardBg: '#232730',
    text: '#E2E8F0',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    accent: '#3B82F6', // Blue
    accentHover: '#2563EB',
    accentMuted: 'rgba(59, 130, 246, 0.1)',
    success: '#10B981', // Emerald
    successMuted: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B', // Amber
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
      const tenantId = (typeof window.getOSActiveTenant === 'function') ? window.getOSActiveTenant() : 'peak-primary';
      const sb = (window.NextSession && window.NextSession.sb) ||
                 (window.SCHOOL_STORE && window.SCHOOL_STORE.getSupabase && window.SCHOOL_STORE.getSupabase()) ||
                 (window.supabase && window.supabase.createClient && window.supabase.createClient('https://llxhvqkkgftqwefmrofn.supabase.co', 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9'));
      if (!sb || typeof sb.from !== 'function') { setLoading(false); return; }

      Promise.all([
        sb.from('students').select('id, name, stream, guardian_name, guardian_phone').eq('tenant_id', tenantId).eq('is_boarding', true),
        sb.from('fees').select('student_id, kind, amount').eq('tenant_id', tenantId),
      ]).then(([studentsRes, feesRes]) => {
        if (!alive) return;
        const students = (studentsRes && studentsRes.data) || [];
        const boardingIds = new Set(students.map(s => s.id));
        const feeRows = ((feesRes && feesRes.data) || []).filter(f => boardingIds.has(f.student_id));
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
            feeType: balance <= 0 ? 'success' : 'warning',
          };
        }));
        setLoading(false);
      }).catch(() => { if (alive) setLoading(false); });

      return () => { alive = false; };
    }, []);

    const getBadgeStyle = (type) => {
      switch (type) {
        case 'success': return { bg: T.successMuted, color: T.success, border: `1px solid ${T.successMuted}` };
        case 'warning': return { bg: T.warningMuted, color: T.warning, border: `1px solid ${T.warningMuted}` };
        case 'info': return { bg: T.infoMuted, color: T.info, border: `1px solid ${T.infoMuted}` };
        default: return { bg: T.panelBg, color: T.text, border: `1px solid ${T.border}` };
      }
    };

    const Badge = ({ label, type, dot }) => {
      const style = getBadgeStyle(type);
      return (
        <span style={{
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
        }}>
          {dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: style.color }}></span>}
          {label}
        </span>
      );
    };

    const HeaderStrip = () => (
      <div style={{ padding: '16px 32px', backgroundColor: T.panelBg, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>KL</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: T.text }}>Kabs Lily Junior School & KinderCare Centre</div>
            <div style={{ fontSize: '12px', color: T.textMuted }}>Boarding & Hostel Command Center · Term 2 — 2026</div>
          </div>
        </div>
        <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '99px', backgroundColor: T.successMuted, color: T.success, border: `1px solid ${T.successMuted}`, fontWeight: 600 }}>🏠 Mixed Day & Boarding</span>
      </div>
    );

    const filteredRoster = roster.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.guardian.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = classFilter === 'All Boarders' || student.class === classFilter;
      return matchesSearch && matchesClass;
    });
    const classOptions = Array.from(new Set(roster.map(s => s.class))).filter(Boolean).sort();

    return (
      <div style={{
        fontFamily: T.fontMain,
        backgroundColor: T.bg,
        color: T.text,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <HeaderStrip />
        
        <div style={{ padding: '32px 48px', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Header Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: '0 0 12px 0', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Boarding & Hostel Command
              </h1>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  padding: '6px 12px', 
                  borderRadius: '99px', 
                  fontSize: '13px', 
                  fontWeight: 500,
                  border: `1px solid ${T.border}`
                }}>
                  Mixed Day & Boarding School 🏠
                </span>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              { label: 'Total Boarders', value: loading ? '—' : String(roster.length), sub: 'Marked boarding in Students', color: T.accent },
              { label: 'Hostel Occupancy', value: '—', sub: 'No dorms configured yet', color: T.info },
              { label: 'Boarding Revenue', value: loading ? '—' : ('UGX ' + totalRevenue.toLocaleString()), sub: 'Collected', color: T.success },
              { label: 'Ring-fenced Surplus', value: '—', sub: 'Not tracked yet', color: T.textDim }
            ].map((stat, i) => (
              <div key={i} style={{ 
                backgroundColor: T.panelBg, 
                padding: '24px', 
                borderRadius: T.radiusLg, 
                border: `1px solid ${T.border}`,
                borderTop: `3px solid ${stat.color}`
              }}>
                <div style={{ color: T.textMuted, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                  {stat.value}
                </div>
                <div style={{ color: T.textDim, fontSize: '14px', fontWeight: 500 }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Dormitory & Matron Cards */}
          {dorms.length === 0 ? (
            <div style={{ backgroundColor: T.panelBg, borderRadius: T.radiusLg, border: `1px dashed ${T.border}`, padding: '28px', textAlign: 'center', color: T.textMuted }}>
              No hostels/dorms set up yet for this school — matron assignments and bed occupancy will show here once they're added in School Setup.
            </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            {dorms.map(dorm => (
              <div key={dorm.id} style={{ 
                backgroundColor: T.panelBg, 
                borderRadius: T.radiusLg, 
                border: `1px solid ${T.border}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{dorm.icon}</span>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{dorm.name}</h3>
                  </div>
                  <div style={{ fontSize: '14px', color: T.textMuted, fontWeight: 500 }}>
                    Occupancy: <strong style={{ color: T.text }}>{dorm.occupied}/{dorm.capacity}</strong>
                  </div>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: T.cardBg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: T.textMuted, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matron / Patron</span>
                      <span style={{ fontSize: '15px', fontWeight: 500 }}>{dorm.matron} <span style={{ color: T.textDim }}>({dorm.matronPhone})</span></span>
                    </div>
                    <button style={{ 
                      padding: '8px 16px', 
                      backgroundColor: 'transparent', 
                      border: `1px solid ${T.borderLight}`, 
                      color: T.text, 
                      borderRadius: T.radiusSm,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600
                    }}>
                      📞 Call
                    </button>
                  </div>
                  <div style={{ padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: T.radiusSm, border: `1px dashed ${T.border}` }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Status:</span> <span style={{ fontSize: '14px', color: T.textMuted }}>{dorm.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Main Roster Section */}
          <div style={{ backgroundColor: T.panelBg, borderRadius: T.radiusLg, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            
            {/* Toolbar */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: T.cardBg }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, width: '250px' }}>Night Attendance & Roster</h2>
              
              <div style={{ flex: 1, position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Find boarding student or matron..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    paddingLeft: '36px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radiusSm,
                    color: T.text,
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: T.textDim }}>🔍</span>
              </div>

              <select 
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radiusSm,
                  color: T.text,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option>All Boarders</option>
                {classOptions.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: '16px 24px', color: T.textMuted, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student</th>
                  <th style={{ padding: '16px 24px', color: T.textMuted, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dorm & Bed</th>
                  <th style={{ padding: '16px 24px', color: T.textMuted, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emergency Contact</th>
                  <th style={{ padding: '16px 24px', color: T.textMuted, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '16px 24px', color: T.textMuted, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map(student => (
                  <tr key={student.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{student.name}</div>
                      <div style={{ color: T.textDim, fontSize: '13px', marginTop: '4px' }}>Class: {student.class}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{student.dorm}</div>
                      <div style={{ color: T.textDim, fontSize: '13px', marginTop: '4px' }}>Bed {student.bed}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{student.guardian}</div>
                      <div style={{ color: T.textDim, fontSize: '13px', marginTop: '4px' }}>{student.contact}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                        <Badge label={student.status} type={student.statusType} dot />
                        <Badge label={`${student.feeStatus} Fees`} type={student.feeType} />
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button style={{ padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${T.borderLight}`, color: T.text, borderRadius: T.radiusSm, cursor: 'pointer', fontSize: '12px' }}>
                          📞 Call Matron
                        </button>
                        <button style={{ padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${T.borderLight}`, color: T.text, borderRadius: T.radiusSm, cursor: 'pointer', fontSize: '12px' }}>
                          💬 Msg Parent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRoster.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: T.textMuted }}>
                      {loading ? 'Loading boarding roster…' : 'No boarding students found matching criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Banner */}
          <div style={{ 
            backgroundColor: 'rgba(16, 185, 129, 0.05)', 
            border: `1px solid rgba(16, 185, 129, 0.2)`, 
            borderRadius: T.radiusLg, 
            padding: '24px',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: '24px' }}>🛡️</div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: T.success, fontSize: '16px', fontWeight: 600 }}>Resource Protection</h4>
              <p style={{ margin: 0, color: T.textMuted, fontSize: '14px', lineHeight: 1.6 }}>
                Boarding funds collected so far (<strong style={{ color: T.text }}>{loading ? '—' : ('UGX ' + totalRevenue.toLocaleString())}</strong>) should be ring-fenced from Day Scholar funds — meal, bedding, and matron costs are meant to be covered from boarding revenue without encroaching on day scholar resources.
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  };

  // Expose to window
  window.HeadBoardingPanel = BoardingPanel;
  
  // Demo Wrapper
  window.HeadBoardingPanelDemo = () => {
    return <BoardingPanel />;
  };

})();
