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
    const [activeDormTab, setActiveDormTab] = React.useState('All Hostels');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [classFilter, setClassFilter] = React.useState('All Boarders');

    // Demo Data
    const dorms = [
      { id: 'b1', name: 'St. Kizito Boys Dorm', icon: '👦', capacity: 25, occupied: 18, matron: 'Tr. Sarah N.', matronPhone: '+256 772 111222', status: '🟢 All 18 present at 8:00 PM roll-call' },
      { id: 'g1', name: 'St. Mary Girls House', icon: '👧', capacity: 25, occupied: 20, matron: 'Tr. Agnes K.', matronPhone: '+256 701 333444', status: '🟢 All 20 present at 8:00 PM roll-call' }
    ];

    const roster = [
      { id: 1, name: 'Ssebaggala Ivan', class: 'P.7', dorm: 'St. Kizito Boys Dorm', bed: 'B04', guardian: 'Mr. Ssebaggala', contact: '+256 772 000111', status: 'Present in Dorm', statusType: 'success', feeStatus: 'Paid', feeType: 'success' },
      { id: 2, name: 'Namukasa Juliet', class: 'P.6', dorm: 'St. Mary Girls House', bed: 'G12', guardian: 'Mrs. Namukasa', contact: '+256 701 000222', status: 'In Infirmary', statusType: 'warning', feeStatus: 'Partial', feeType: 'warning' },
      { id: 3, name: 'Opio Denis', class: 'P.5', dorm: 'St. Kizito Boys Dorm', bed: 'B10', guardian: 'Mr. Opio', contact: '+256 752 000333', status: 'Weekend Home Pass', statusType: 'info', feeStatus: 'Paid', feeType: 'success' },
      { id: 4, name: 'Akatukunda Mercy', class: 'P.7', dorm: 'St. Mary Girls House', bed: 'G01', guardian: 'Mr. Tumwine', contact: '+256 774 000444', status: 'Present in Dorm', statusType: 'success', feeStatus: 'Paid', feeType: 'success' },
      { id: 5, name: 'Mugisha Paul', class: 'P.4', dorm: 'St. Kizito Boys Dorm', bed: 'B18', guardian: 'Mrs. Mugisha', contact: '+256 703 000555', status: 'Present in Dorm', statusType: 'success', feeStatus: 'Paid', feeType: 'success' }
    ];

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

    const SchoolBadgeStrip = window.SchoolBadgeStrip || (({ pageName }) => (
      <div style={{ padding: '12px 24px', backgroundColor: T.panelBg, borderBottom: `1px solid ${T.border}`, color: T.textMuted, fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em' }}>
        {pageName}
      </div>
    ));

    const filteredRoster = roster.filter(student => {
      const matchesDorm = activeDormTab === 'All Hostels' || student.dorm.includes(activeDormTab.replace(/👦|👧|St. /g, '').trim());
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.guardian.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = classFilter === 'All Boarders' || student.class === classFilter;
      // Note: The logic for dorm matching is slightly fuzzy here for demo purposes, 
      // since the tab name has emojis. A robust implementation would use IDs.
      const isDormMatch = activeDormTab === 'All Hostels' || student.dorm === activeDormTab.replace(/ (👦|👧)/, '');
      
      return isDormMatch && matchesSearch && matchesClass;
    });

    return (
      <div style={{
        fontFamily: T.fontMain,
        backgroundColor: T.bg,
        color: T.text,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <SchoolBadgeStrip pageName="BOARDING & HOSTEL MANAGEMENT" />
        
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

            {/* Top Dorm Filter Tabs */}
            <div style={{ display: 'flex', backgroundColor: T.panelBg, padding: '4px', borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
              {['All Hostels', 'St. Kizito Boys Dorm 👦', 'St. Mary Girls House 👧'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveDormTab(tab)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeDormTab === tab ? T.cardBg : 'transparent',
                    color: activeDormTab === tab ? '#fff' : T.textMuted,
                    border: 'none',
                    borderRadius: T.radiusMd,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: activeDormTab === tab ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              { label: 'Total Boarders', value: '38 Boarders', sub: '32% of School', color: T.accent },
              { label: 'Hostel Occupancy', value: '76%', sub: 'Bed Capacity Used', color: T.info },
              { label: 'Boarding Revenue', value: '24.5M UGX', sub: 'Collected', color: T.success },
              { label: 'Ring-fenced Surplus', value: '4.7M UGX', sub: 'Boarding Reserve 🟢', color: T.success }
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
                <option>P.4</option>
                <option>P.5</option>
                <option>P.6</option>
                <option>P.7</option>
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
                      No boarding students found matching criteria.
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
              <h4 style={{ margin: '0 0 8px 0', color: T.success, fontSize: '16px', fontWeight: 600 }}>Resource Protection Active</h4>
              <p style={{ margin: 0, color: T.textMuted, fontSize: '14px', lineHeight: 1.6 }}>
                Boarding funds (<strong style={{ color: T.text }}>24,500,000 UGX</strong>) are ring-fenced from Day Scholar funds. Boarding meal, bedding, and matron costs are strictly covered from boarding revenue without encroaching on day scholar resources.
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
