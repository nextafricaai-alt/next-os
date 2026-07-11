import re

with open('web/os-childcare.jsx', 'r') as f:
    content = f.read()

# Replace the state initialization
old_state_init = """  const ChildcareOSPage = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = React.useState('overview');
    const [selectedChild, setSelectedChild] = React.useState(null);
    const [niaOpen, setNiaOpen] = React.useState(false);
    const [childrenData, setChildrenData] = React.useState(CHILDREN);
    const [onboardingOpen, setOnboardingOpen] = React.useState(false);
    const kpi = CHILDCARE_KPIs;"""

new_state_init = """  const ChildcareOSPage = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = React.useState('overview');
    const [selectedCenterId, setSelectedCenterId] = React.useState('all');
    const [selectedChild, setSelectedChild] = React.useState(null);
    const [niaOpen, setNiaOpen] = React.useState(false);
    const [centersData, setCentersData] = React.useState(CENTERS);
    const [onboardingOpen, setOnboardingOpen] = React.useState(false);

    const kpi = React.useMemo(() => {
      if (selectedCenterId !== 'all') {
        return centersData.find(c => c.id === selectedCenterId)?.kpi || centersData[0].kpi;
      }
      const agg = {
        enrolled: 0, presentToday: 0, absentToday: 0,
        invoicesDue: 0, invoicesOverdue30d: 0, overdueAmount: 0,
        totalInvoiced: 0, unreadParentMessages: 0, unansweredMessages24h: 0,
        milestonesThisWeek: 0, activitiesScheduledToday: 0,
      };
      centersData.forEach(c => {
        agg.enrolled += c.kpi.enrolled;
        agg.presentToday += c.kpi.presentToday;
        agg.absentToday += c.kpi.absentToday;
        agg.invoicesDue += c.kpi.invoicesDue;
        agg.invoicesOverdue30d += c.kpi.invoicesOverdue30d;
        agg.overdueAmount += c.kpi.overdueAmount;
        agg.totalInvoiced += c.kpi.totalInvoiced;
        agg.unreadParentMessages += c.kpi.unreadParentMessages;
        agg.unansweredMessages24h += c.kpi.unansweredMessages24h;
        agg.milestonesThisWeek += c.kpi.milestonesThisWeek;
        agg.activitiesScheduledToday += c.kpi.activitiesScheduledToday;
      });
      agg.attendanceRate = agg.enrolled > 0 ? agg.presentToday / agg.enrolled : 0;
      agg.collectionRate = agg.totalInvoiced > 0 ? (agg.totalInvoiced - agg.overdueAmount) / agg.totalInvoiced : 0;
      return agg;
    }, [selectedCenterId, centersData]);

    const childrenData = React.useMemo(() => {
      if (selectedCenterId === 'all') return centersData.flatMap(c => c.children);
      return centersData.find(c => c.id === selectedCenterId)?.children || [];
    }, [selectedCenterId, centersData]);

    const TODAY_SCHEDULE = React.useMemo(() => {
      if (selectedCenterId === 'all') return centersData[0].schedule;
      return centersData.find(c => c.id === selectedCenterId)?.schedule || [];
    }, [selectedCenterId, centersData]);

    const MESSAGES = React.useMemo(() => {
      if (selectedCenterId === 'all') return centersData.flatMap(c => c.messages);
      return centersData.find(c => c.id === selectedCenterId)?.messages || [];
    }, [selectedCenterId, centersData]);

    const CAMERAS = React.useMemo(() => {
      if (selectedCenterId === 'all') return centersData.flatMap(c => c.cameras);
      return centersData.find(c => c.id === selectedCenterId)?.cameras || [];
    }, [selectedCenterId, centersData]);
"""

content = content.replace(old_state_init, new_state_init)

# Fix childrenData modification in onboarding
old_onboard_submit = """      setChildrenData(prev => [newChild, ...prev]);"""
new_onboard_submit = """      const centerId = selectedCenterId === 'all' ? 'charis-kampala' : selectedCenterId;
      setCentersData(prev => prev.map(c => 
        c.id === centerId ? { ...c, children: [newChild, ...c.children], kpi: { ...c.kpi, enrolled: c.kpi.enrolled + 1 } } : c
      ));"""

content = content.replace(old_onboard_submit, new_onboard_submit)

# Fix cameras array mapping
old_camera_map = """            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
              {[
                { id: 'cam1', name: 'Playroom A - North View', source: 'camera_mock_1', children: [{ name: 'Ivy Kyomuhendo', milestone: 'Puzzle (12 pieces)', x: 60, y: 40 }, { name: 'Aiden Nakamya', milestone: 'First full sentence', x: 20, y: 70 }] },
                { id: 'cam2', name: 'Nap Area - East Wing', source: 'camera_mock_2', children: [{ name: 'Henry Kato', milestone: 'Sleeping calmly', x: 40, y: 50 }] },
                { id: 'cam3', name: 'Outdoor Sandbox', source: 'camera_mock_3', children: [{ name: 'Ethan Lubega', milestone: 'Walking alone', x: 70, y: 30 }] }
              ].map(cam => ("""
new_camera_map = """            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
              {CAMERAS.map(cam => ("""
content = content.replace(old_camera_map, new_camera_map)


# Add Dropdown to Sidebar
old_sidebar_header = """          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, paddingLeft: 8 }}>"""
new_sidebar_header = """          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingLeft: 8 }}>"""

content = content.replace(old_sidebar_header, new_sidebar_header)

old_nav_menu = """          {/* Navigation Menu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>"""
new_nav_menu = """          {/* Center Selector */}
          <div style={{ marginBottom: 30, paddingLeft: 8, paddingRight: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Facility</div>
            <select 
              value={selectedCenterId}
              onChange={(e) => setSelectedCenterId(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg-default)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', outline: 'none'
              }}
            >
              <option value="all">🌐 All Centers (Global)</option>
              {centersData.map(c => (
                <option key={c.id} value={c.id}>📍 {c.name}</option>
              ))}
            </select>
          </div>

          {/* Navigation Menu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>"""
content = content.replace(old_nav_menu, new_nav_menu)


# Remove enrolled/present stats from children tab
old_children_header = """        {/* ── CHILDREN TAB ── */}
        {activeTab === 'children' && !selectedChild && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'All',     val: childrenData.length,                       color: 'var(--text-secondary)' },
                  { label: 'Present', val: childrenData.filter(c => c.present).length, color: '#00FC8F' },
                  { label: 'Absent',  val: childrenData.filter(c => !c.present).length, color: '#FF4757' },
                  { label: 'Napping', val: childrenData.filter(c => c.nap).length,    color: '#A855F7' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 16px', fontSize: 12 }}>
                    <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{val}</span>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>{label}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setOnboardingOpen(true)} style={{ background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>➕</span> Onboard Child
              </button>
            </div>"""

new_children_header = """        {/* ── CHILDREN TAB ── */}
        {activeTab === 'children' && !selectedChild && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
              <button onClick={() => setOnboardingOpen(true)} style={{ background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>➕</span> Onboard Child
              </button>
            </div>"""

content = content.replace(old_children_header, new_children_header)


# Setup player timeout fix: use CAMERAS
old_setup_timer = """        const timer = setTimeout(() => {
          setupPlayer('camera-canvas-1', 9999);
          setupPlayer('camera-canvas-2', 9998);
        }, 300);"""
new_setup_timer = """        const timer = setTimeout(() => {
          CAMERAS.forEach(cam => {
            if (cam.wsPort) setupPlayer(`camera-canvas-${cam.id}`, cam.wsPort);
          });
        }, 300);"""
content = content.replace(old_setup_timer, new_setup_timer)

with open('web/os-childcare.jsx', 'w') as f:
    f.write(content)

