/**
 * NEXT OS - Head Teacher Live Transport Control Panel
 * Exposes: window.HeadTransportPanel, window.HeadTransportPanelDemo
 */
(function () {
  const React = window.React;
  const useState = React.useState;
  const useEffect = React.useEffect;

  // Mock global data if not present
  const MOCK_BRAND = window.SCHOOL_BRAND || {
    primaryColor: '#00F0FF',
    accentColor: '#FF0055',
    schoolName: 'Peak Primary School'
  };

  const MOCK_TELEMETRY = window.TRANSPORT_TELEMETRY || {
    vans: [
      { id: 'v1', name: 'Van 01 (Kampala East)', reg: 'UBL 123A', driver: 'Musa K.', phone: '+256 772 123456', speed: '45 km/h', status: 'normal', battery: '92%', currentStop: 'Ntinda Complex', stopsCompleted: 60, eta: '12 mins', lat: 40, lng: 30 },
      { id: 'v2', name: 'Van 02 (Entebbe Road)', reg: 'UBM 456B', driver: 'Sarah N.', phone: '+256 701 987654', speed: '55 km/h', status: 'normal', battery: '85%', currentStop: 'Zana Roundabout', stopsCompleted: 40, eta: '25 mins', lat: 60, lng: 50 },
      { id: 'v3', name: 'Van 03 (Ntinda Route)', reg: 'UBP 789C', driver: 'John D.', phone: '+256 750 112233', speed: '0 km/h', status: 'stopped', battery: '100%', currentStop: 'Naalya', stopsCompleted: 10, eta: '45 mins', lat: 20, lng: 70 },
    ],
    students: [
      { id: 's1', name: 'Alvin Mwesigwa', class: 'P3', van: 'Van 01', stop: 'Ntinda Complex', status: 'On Board', time: '07:14 AM' },
      { id: 's2', name: 'Betty Namuli', class: 'P1', van: 'Van 01', stop: 'Kiwatule', status: 'Safely at School', time: '07:30 AM' },
      { id: 's3', name: 'Chris Opolot', class: 'P5', van: 'Van 02', stop: 'Namadi', status: 'Waiting at Home', time: '-' },
      { id: 's4', name: 'Diana Katusiime', class: 'P7', van: 'Van 02', stop: 'Seguku', status: 'Arrived at Stop', time: '07:05 AM' },
      { id: 's5', name: 'Emma K', class: 'P4', van: 'Van 03', stop: 'Naalya', status: 'Skipped', time: '-' },
    ]
  };

  // Safe fallback for SchoolBadgeStrip
  const BadgeStrip = window.SchoolBadgeStrip || function({ pageName }) {
    return (
      <div style={{ padding: '12px 20px', background: 'linear-gradient(90deg, #1A1A24, #0F0F14)', borderBottom: `2px solid ${MOCK_BRAND.primaryColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: MOCK_BRAND.primaryColor, display: 'grid', placeItems: 'center', color: '#000', fontWeight: 'bold' }}>PP</div>
          <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>{MOCK_BRAND.schoolName}</div>
        </div>
        <div style={{ color: MOCK_BRAND.primaryColor, fontWeight: '600', fontSize: '14px', letterSpacing: '2px' }}>{pageName}</div>
      </div>
    );
  };

  const T = {
    bgMain: '#0B0C10',
    bgCard: '#1A1A24',
    bgCardHover: '#252533',
    textPrimary: '#FFFFFF',
    textSecondary: '#8B949E',
    accent: MOCK_BRAND.primaryColor,
    border: 'rgba(255, 255, 255, 0.1)',
    fontMain: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    status: {
      green: '#00FF66',
      blue: '#00CCFF',
      amber: '#FFB300',
      purple: '#B366FF',
      orange: '#FF6600'
    }
  };

  const getStatusColor = (status) => {
    if (status.includes('On Board')) return T.status.green;
    if (status.includes('Safely')) return T.status.blue;
    if (status.includes('Waiting')) return T.status.amber;
    if (status.includes('Arrived')) return T.status.purple;
    if (status.includes('Skipped')) return T.status.orange;
    return T.textSecondary;
  };

  function HeadTransportPanel() {
    const [activeVan, setActiveVan] = useState('All');
    const [routeMode, setRouteMode] = useState('Morning');
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('All');

    const filteredStudents = MOCK_TELEMETRY.students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.stop.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter === 'All' ? true : (classFilter === 'P1-P3' ? ['P1','P2','P3'].includes(s.class) : ['P4','P5','P6','P7'].includes(s.class));
      const matchVan = activeVan === 'All' ? true : s.van.includes(activeVan.substring(0,6)); // matching "Van 01" etc
      return matchSearch && matchClass && matchVan;
    });

    const activeVansToDisplay = activeVan === 'All' ? MOCK_TELEMETRY.vans : MOCK_TELEMETRY.vans.filter(v => v.name === activeVan);

    return (
      <div style={{ fontFamily: T.fontMain, background: T.bgMain, color: T.textPrimary, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <BadgeStrip pageName="LIVE SCHOOL TRANSPORT & FLEET" />

        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Control Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.bgCard, padding: '16px 24px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Fleet Command & Live Tracking</h1>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <select 
                value={activeVan} 
                onChange={e => setActiveVan(e.target.value)}
                style={{ background: '#000', color: T.textPrimary, border: `1px solid ${T.border}`, padding: '8px 12px', borderRadius: '6px', outline: 'none' }}
              >
                <option value="All">All Vans ({MOCK_TELEMETRY.vans.length})</option>
                {MOCK_TELEMETRY.vans.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
              </select>
              
              <div style={{ display: 'flex', background: '#000', borderRadius: '6px', padding: '4px' }}>
                <button 
                  onClick={() => setRouteMode('Morning')}
                  style={{ background: routeMode === 'Morning' ? T.bgCardHover : 'transparent', color: T.textPrimary, border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Morning Pickups 🌅
                </button>
                <button 
                  onClick={() => setRouteMode('Afternoon')}
                  style={{ background: routeMode === 'Afternoon' ? T.bgCardHover : 'transparent', color: T.textPrimary, border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Afternoon Dropoffs 🌇
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.status.green }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.status.green, boxShadow: `0 0 8px ${T.status.green}` }}></div>
                Live tracking (syncs every 4s)
              </div>
            </div>
          </div>

          {/* Stat Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ background: T.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSecondary, fontSize: '13px', textTransform: 'uppercase', marginBottom: '8px' }}>Active Vans on Road</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: T.accent }}>3 / 3 <span style={{fontSize:'16px', color:T.textSecondary, fontWeight:'normal'}}>vans active</span></div>
            </div>
            <div style={{ background: T.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSecondary, fontSize: '13px', textTransform: 'uppercase', marginBottom: '8px' }}>Students On Board</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>42 / 58 <span style={{fontSize:'16px', color:T.textSecondary, fontWeight:'normal'}}>boarded</span></div>
            </div>
            <div style={{ background: T.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSecondary, fontSize: '13px', textTransform: 'uppercase', marginBottom: '8px' }}>On-Time Completion</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: T.status.green }}>88% <span style={{fontSize:'16px', color:T.textSecondary, fontWeight:'normal'}}>on schedule</span></div>
            </div>
            <div style={{ background: T.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textSecondary, fontSize: '13px', textTransform: 'uppercase', marginBottom: '8px' }}>Safety Status</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: T.status.green, display: 'flex', alignItems: 'center', height: '34px' }}>
                🟢 All drivers normal speed
              </div>
            </div>
          </div>

          {/* Main Interactive Fleet Map & Driver Monitor */}
          <div style={{ display: 'flex', gap: '24px', height: '500px' }}>
            {/* Map Placeholder */}
            <div style={{ flex: '6', background: '#000', borderRadius: '12px', border: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden' }}>
              {/* Mock Map Background Grid */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center' }}></div>
              
              {/* Mock Route Lines */}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <path d="M 100 100 Q 300 150 400 300 T 700 400" fill="none" stroke={T.accent} strokeWidth="3" strokeDasharray="8 4" opacity="0.3" />
                <path d="M 200 400 Q 400 300 600 200" fill="none" stroke={T.status.purple} strokeWidth="3" strokeDasharray="8 4" opacity="0.3" />
              </svg>

              {/* Mock School Marker */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', background: T.bgCard, border: `2px solid ${T.accent}`, borderRadius: '50%', display: 'grid', placeItems: 'center', zIndex: 10, boxShadow: `0 0 20px ${T.accent}` }}>
                  🎓
                </div>
                <div style={{ background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', marginTop: '4px', border: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                  {MOCK_BRAND.schoolName}
                </div>
              </div>

              {/* Mock Van Markers */}
              {activeVansToDisplay.map((van, i) => (
                <div key={van.id} style={{ position: 'absolute', top: `${van.lat}%`, left: `${van.lng}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                   <div style={{ width: '24px', height: '24px', background: van.status === 'stopped' ? T.status.orange : T.status.green, borderRadius: '50%', display: 'grid', placeItems: 'center', boxShadow: `0 0 15px ${van.status === 'stopped' ? T.status.orange : T.status.green}` }}>
                    🚌
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.9)', padding: '6px', borderRadius: '6px', fontSize: '11px', marginTop: '6px', border: `1px solid ${T.border}`, textAlign: 'center', width: '120px' }}>
                    <div style={{ fontWeight: 'bold', color: T.accent }}>{van.reg}</div>
                    <div style={{ color: T.textSecondary }}>{van.speed} • {van.eta}</div>
                  </div>
                </div>
              ))}
              
              <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.7)', padding: '8px 16px', borderRadius: '8px', border: `1px solid ${T.border}`, backdropFilter: 'blur(4px)', color: T.textSecondary, fontSize: '12px' }}>
                <span style={{color: T.textPrimary, fontWeight:'bold'}}>MAP VIEW</span> / Live GPS Data
              </div>
            </div>

            {/* Telemetry Cards */}
            <div style={{ flex: '4', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {activeVansToDisplay.map(van => (
                <div key={van.id} style={{ background: T.bgCard, borderRadius: '12px', border: `1px solid ${T.border}`, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: T.accent }}>{van.name}</h3>
                      <div style={{ color: T.textSecondary, fontSize: '13px', marginTop: '4px' }}>{van.reg} • Driver: {van.driver}</div>
                    </div>
                    <div style={{ background: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: T.status.green, border: `1px solid ${T.border}` }}>
                      {van.speed}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
                    <div style={{ background: '#000', padding: '8px', borderRadius: '6px' }}>
                      <div style={{ color: T.textSecondary, marginBottom: '2px' }}>Current Stop</div>
                      <div>{van.currentStop}</div>
                    </div>
                    <div style={{ background: '#000', padding: '8px', borderRadius: '6px' }}>
                      <div style={{ color: T.textSecondary, marginBottom: '2px' }}>ETA to School</div>
                      <div>{van.eta}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: T.textSecondary, marginBottom: '6px' }}>
                      <span>Route Progress</span>
                      <span>{van.stopsCompleted}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#000', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${van.stopsCompleted}%`, height: '100%', background: T.accent, borderRadius: '3px' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '6px', color: T.textPrimary, cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background=T.bgCardHover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      📞 Call
                    </button>
                    <button style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '6px', color: T.textPrimary, cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background=T.bgCardHover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      💬 WhatsApp
                    </button>
                    <button style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '6px', color: T.textPrimary, cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background=T.bgCardHover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      📍 Focus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Student Transport Manifest Board */}
          <div style={{ background: T.bgCard, borderRadius: '12px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Live Student Manifest</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Find student or guardian..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: '#000', border: `1px solid ${T.border}`, color: T.textPrimary, padding: '8px 12px', borderRadius: '6px', outline: 'none', width: '250px' }}
                />
                <select 
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  style={{ background: '#000', border: `1px solid ${T.border}`, color: T.textPrimary, padding: '8px 12px', borderRadius: '6px', outline: 'none' }}
                >
                  <option value="All">All Classes</option>
                  <option value="P1-P3">P1 - P3</option>
                  <option value="P4-P7">P4 - P7</option>
                </select>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ background: '#000', color: T.textSecondary, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>
                  <tr>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Student Name & Class</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Van Assigned</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Pickup Location</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Boarded Time</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? filteredStudents.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '500' }}>{s.name}</div>
                        <div style={{ color: T.textSecondary, fontSize: '12px', marginTop: '2px' }}>{s.class}</div>
                      </td>
                      <td style={{ padding: '16px 20px', color: T.textSecondary }}>{s.van}</td>
                      <td style={{ padding: '16px 20px', color: T.textSecondary }}>{s.stop}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '6px', 
                          background: `${getStatusColor(s.status)}20`, 
                          color: getStatusColor(s.status), 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                          border: `1px solid ${getStatusColor(s.status)}40`
                        }}>
                          {s.status.includes('On Board') && '🟢 '}
                          {s.status.includes('Safely') && '🔵 '}
                          {s.status.includes('Waiting') && '⏳ '}
                          {s.status.includes('Arrived') && '🟣 '}
                          {s.status.includes('Skipped') && '🟠 '}
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', color: T.textSecondary, fontFamily: 'monospace' }}>{s.time}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.textPrimary, padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }} onMouseOver={e=>e.currentTarget.style.background=T.bgCardHover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                          Notify Parent
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: T.textSecondary }}>No students found matching current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  window.HeadTransportPanel = HeadTransportPanel;
  
  // Demo wrapper
  window.HeadTransportPanelDemo = function() {
    return <HeadTransportPanel />;
  };

})();
