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

  const REAL_TELEMETRY_DATA = {
    vans: [
      { id: 'v1', name: 'Van 01 (Kabs Lily Shuttle #1)', reg: 'UAB 218 Y', driver: 'Mr. Bbosa Yusufu', phone: '+256 701 234567', speed: '38 km/h', status: 'normal', battery: '96%', currentStop: 'Plot 14 Acacia Ave, Kireka', stopsCompleted: 7, eta: '8 mins', lat: 0.3540, lng: 32.6200 },
      { id: 'v2', name: 'Van 02 (Naalya & Kyaliwajjala)', reg: 'UBL 412 Z', driver: 'Tr. Moses K.', phone: '+256 772 987654', speed: '42 km/h', status: 'normal', battery: '88%', currentStop: 'Naalya Quality Mall', stopsCompleted: 4, eta: '15 mins', lat: 0.3685, lng: 32.6285 },
      { id: 'v3', name: 'Van 03 (Ntinda & Kisaasi)', reg: 'UBM 890 C', driver: 'David O.', phone: '+256 750 334455', speed: '0 km/h', status: 'stopped', battery: '100%', currentStop: 'Kisaasi Stage', stopsCompleted: 2, eta: '25 mins', lat: 0.3542, lng: 32.6142 },
    ],
    students: [
      { id: 's1', name: 'Brian Mukasa', class: 'P.4', van: 'Van 01', stop: 'Plot 14 Acacia Ave, Kireka', status: 'Safely at School', time: '07:42 AM' },
      { id: 's2', name: 'Grace Kintu', class: 'Baby', van: 'Van 01', stop: 'Kireka Stage', status: 'Safely at School', time: '07:45 AM' },
      { id: 's3', name: 'Alvin Mwesigwa', class: 'P.1', van: 'Van 01', stop: 'Bweyogerere Trading Centre', status: 'On Board', time: '07:50 AM' },
      { id: 's4', name: 'Divine Okello', class: 'P.7', van: 'Van 01', stop: 'Naalya Housing Estate', status: 'On Board', time: '07:55 AM' },
      { id: 's5', name: 'Joy Babirye', class: 'Top', van: 'Van 01', stop: 'Kisaasi Central Stage', status: 'Waiting at Home', time: '-' },
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

  // Real Interactive Leaflet Map for Head Teacher showing Live Driver GPS & Journey Covered Trail
  const RealHeadFleetMap = () => {
    const mapRef = React.useRef(null);
    const mapInstance = React.useRef(null);
    const carMarkerRef = React.useRef(null);
    const trailPolylineRef = React.useRef(null);
    const [liveTelemetry, setLiveTelemetry] = useState(null);
    const [journeyPath, setJourneyPath] = useState([
      [0.3472, 32.6325], // Kireka
      [0.3485, 32.6482], // Bweyogerere
      [0.3685, 32.6285], // Naalya
      [0.3542, 32.6142], // Ntinda
      [0.3600, 32.6250]  // Kabs Lily School
    ]);

    const tileSources = {
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    };

    useEffect(() => {
      if (!mapRef.current || mapInstance.current) return;
      if (typeof window.L === 'undefined') return;

      const L = window.L;
      const map = L.map(mapRef.current, {
        center: [0.3540, 32.6200],
        zoom: 13,
        zoomControl: true,
        attributionControl: false
      });
      mapInstance.current = map;

      // Add Satellite imagery tiles
      L.tileLayer(tileSources.satellite, {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // School Gate Marker
      const schoolIcon = L.divIcon({
        className: 'custom-school-icon',
        html: `<div style="background:#00FC8F; color:#0A1029; font-weight:bold; font-size:11px; padding:4px 8px; border-radius:12px; border:2px solid #FFF; white-space:nowrap; box-shadow:0 0 12px #00FC8F;">🏫 Kabs Lily Campus</div>`,
        iconSize: [110, 30],
        iconAnchor: [55, 15]
      });
      L.marker([0.3600, 32.6250], { icon: schoolIcon }).addTo(map).bindPopup('<b>🏫 Kabs Lily Campus</b>');

      // Live Shuttle Van Marker
      const carIcon = L.divIcon({
        className: 'custom-car-icon',
        html: `<div style="background:#00FC8F; color:#0A1029; font-size:22px; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #FFF; box-shadow:0 0 24px #00FC8F;">🚐</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
      carMarkerRef.current = L.marker([0.3540, 32.6200], { icon: carIcon }).addTo(map)
        .bindPopup(`<b>🚐 Kabs Lily Shuttle #1</b><br/>Driver: Mr. Bbosa Yusufu<br/>Status: 🟢 LIVE GPS TRACKING`);

      // Initial Journey Trail Covered Polyline
      trailPolylineRef.current = L.polyline(journeyPath, {
        color: '#00FC8F',
        weight: 6,
        opacity: 0.95
      }).addTo(map);

      // Listen for Live Telemetry Events from Driver App
      const handleTelemetryUpdate = (e) => {
        if (!e.detail || !e.detail.lat || !e.detail.lng) return;
        const { lat, lng, speed } = e.detail;
        const newPos = [lat, lng];

        setLiveTelemetry(e.detail);
        if (carMarkerRef.current) {
          carMarkerRef.current.setLatLng(newPos);
          carMarkerRef.current.setPopupContent(`
            <b>🚐 Van 01 (Mr. Bbosa Yusufu)</b><br/>
            <b>📍 Live Location:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}<br/>
            <b>⚡ Live Speed:</b> ${speed ? speed.toFixed(1) : '38.0'} km/h<br/>
            <span style="color:#00FC8F; font-weight:bold;">🟢 LIVE GPS FEED CONNECTED</span>
          `);
        }

        // Append to Journey Covered Trail
        setJourneyPath(prev => {
          const updated = [...prev, newPos];
          if (trailPolylineRef.current) {
            trailPolylineRef.current.setLatLngs(updated);
          }
          return updated;
        });
      };

      window.addEventListener('transport-telemetry-update', handleTelemetryUpdate);

      return () => {
        window.removeEventListener('transport-telemetry-update', handleTelemetryUpdate);
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      };
    }, []);

    return (
      <div style={{ flex: '6', background: '#000', borderRadius: '12px', border: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }}></div>
        
        {/* Map Header Overlay */}
        <div style={{
          position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(4px)', padding: '8px 14px',
          borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '12px', color: '#FFF'
        }}>
          <span style={{ color: '#00FC8F', fontWeight: 'bold' }}>📡 LIVE DRIVER GPS TELEMETRY</span> ·
          <span style={{ marginLeft: '6px', color: '#94A3B8' }}>Journey Covered: <b>14.8 km</b></span>
        </div>
      </div>
    );
  };

  function HeadTransportPanel() {
    const [activeVan, setActiveVan] = useState('All');
    const [routeMode, setRouteMode] = useState('Morning');
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('All');

    const filteredStudents = REAL_TELEMETRY_DATA.students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.stop.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter === 'All' ? true : (classFilter === 'P1-P3' ? ['P1','P2','P3'].includes(s.class) : ['P4','P5','P6','P7'].includes(s.class));
      const matchVan = activeVan === 'All' ? true : s.van.includes(activeVan.substring(0,6)); // matching "Van 01" etc
      return matchSearch && matchClass && matchVan;
    });

    const activeVansToDisplay = activeVan === 'All' ? REAL_TELEMETRY_DATA.vans : REAL_TELEMETRY_DATA.vans.filter(v => v.name === activeVan);

    return (
      <div style={{ fontFamily: T.fontMain, background: T.bgMain, color: T.textPrimary, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <BadgeStrip pageName="LIVE SCHOOL TRANSPORT & FLEET" />

        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Control Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.bgCard, padding: '16px 24px', borderRadius: '12px', border: `1px solid ${T.border}`, flexWrap: 'wrap', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Fleet Command & Live Tracking</h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => window.open('/prototypes/schools/peak-primary/driver-dashboard.html', '_blank')}
                style={{ background: '#3B82F6', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
              >
                Open Driver App 🚌
              </button>
              <select 
                value={activeVan} 
                onChange={e => setActiveVan(e.target.value)}
                style={{ background: '#000', color: T.textPrimary, border: `1px solid ${T.border}`, padding: '8px 12px', borderRadius: '6px', outline: 'none' }}
              >
                <option value="All">All Vans ({REAL_TELEMETRY_DATA.vans.length})</option>
                {REAL_TELEMETRY_DATA.vans.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
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
            {/* Live Leaflet Satellite Fleet Map */}
            <RealHeadFleetMap activeVans={activeVansToDisplay} />

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
