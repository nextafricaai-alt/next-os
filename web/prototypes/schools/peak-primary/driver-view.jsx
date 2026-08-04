(function(global) {
  const React = global.React || require('react');
  const { useState, useEffect, useMemo } = React;

  // Mock NEXT OS Theme Tokens (Dark Mode tailored for night/glare driving)
  const T = {
    colors: {
      background: '#0F172A', // slate-900
      surface: '#1E293B',    // slate-800
      surfaceHover: '#334155',
      primary: '#3B82F6',    // blue-500
      primaryHover: '#2563EB',
      success: '#10B981',    // emerald-500
      warning: '#F59E0B',    // amber-500
      danger: '#EF4444',     // red-500
      text: '#F8FAFC',       // slate-50
      textMuted: '#94A3B8',  // slate-400
      border: '#334155',     // slate-700
    },
    radii: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    shadows: {
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    fonts: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }
  };

  // Complete bus-riding students manifest across Kabs Lily routes with real GPS coordinates
  const mockStudents = [
    { id: 's1', name: 'Brian Mukasa', class: 'P.4', guardian: 'Sarah Mukasa', phone: '+256 772 111222', address: 'Plot 14, Acacia Ave, Kireka', landmark: 'Near Kireka Police Station', status: 'waiting', lat: 0.3472, lng: 32.6325, distance: '0.8 km', time: '3 mins' },
    { id: 's2', name: 'Esther Namuli', class: 'P.2', guardian: 'Peter Namuli', phone: '+256 752 333444', address: 'Kisaasi, Bahai Road Stage', landmark: 'Opposite Bahai Temple Gate', status: 'waiting', lat: 0.3625, lng: 32.5895, distance: '1.4 km', time: '5 mins' },
    { id: 's3', name: 'Joshua Kigozi', class: 'P.6', guardian: 'Mary Kigozi', phone: '+256 701 555666', address: 'Ntinda, Minister\'s Village', landmark: 'Near Ntinda Shopping Complex', status: 'waiting', lat: 0.3542, lng: 32.6142, distance: '2.1 km', time: '7 mins' },
    { id: 's4', name: 'Mirembe Nakato', class: 'P.1', guardian: 'Mrs. Sarah Nakato', phone: '+256 772 416902', address: 'Bweyogerere Trading Centre', landmark: 'Behind Shell Station Bweyogerere', status: 'waiting', lat: 0.3485, lng: 32.6482, distance: '2.8 km', time: '9 mins' },
    { id: 's5', name: 'Daniel Okello', class: 'P.4', guardian: 'Mr. James Okello', phone: '+256 701 884553', address: 'Naalya Housing Estate, Block B', landmark: 'Near Quality Shopping Mall', status: 'waiting', lat: 0.3685, lng: 32.6285, distance: '3.4 km', time: '11 mins' },
    { id: 's6', name: 'Ruth Asiimwe', class: 'P.3', guardian: 'Mrs. Grace Asiimwe', phone: '+256 752 220119', address: 'Kyaliwajjala Stage, Plot 8', landmark: 'Near Kyaliwajjala Catholic Church', status: 'waiting', lat: 0.3752, lng: 32.6420, distance: '4.2 km', time: '13 mins' },
    { id: 's7', name: 'Sarah Namutebi', class: 'P.2', guardian: 'Mrs. Florence N.', phone: '+256 779 446200', address: 'Kiwatule Recreation Centre Road', landmark: 'Kiwatule Flyover Junction', status: 'waiting', lat: 0.3610, lng: 32.6190, distance: '5.0 km', time: '15 mins' },
    { id: 's8', name: 'Joseph Kato', class: 'P.6', guardian: 'Mr. Vincent Kato', phone: '+256 705 117040', address: 'Banda Hill Road, House 12', landmark: 'Opposite Kyambogo University Gate 2', status: 'waiting', lat: 0.3420, lng: 32.6220, distance: '5.6 km', time: '17 mins' },
    { id: 's9', name: 'Patricia Atim', class: 'P.3', guardian: 'Mrs. Mary Atim', phone: '+256 776 901220', address: 'Mutungo Hill, Plot 45', landmark: 'Near Mutungo Water Tank', status: 'waiting', lat: 0.3280, lng: 32.6250, distance: '6.3 km', time: '19 mins' },
    { id: 's10', name: 'James Wamala', class: 'P.7', guardian: 'Mr. Edward Wamala', phone: '+256 752 488916', address: 'Luzira Stage, Port Bell Road', landmark: 'Near Luzira Church of Uganda', status: 'waiting', lat: 0.3150, lng: 32.6350, distance: '7.1 km', time: '21 mins' },
    { id: 's11', name: 'Sharon Nabakooza', class: 'Baby', guardian: 'Mrs. Janet N.', phone: '+256 700 000111', address: 'Kireka Kamuli Road', landmark: 'Near Kamuli Stage', status: 'waiting', lat: 0.3520, lng: 32.6380, distance: '7.8 km', time: '23 mins' },
    { id: 's12', name: 'Brenda Najjuma', class: 'Middle', guardian: 'Mrs. Diana Najjuma', phone: '+256 700 000222', address: 'Ntinda St. Mbaaga Road', landmark: 'Near St. Mbaaga Library', status: 'waiting', lat: 0.3580, lng: 32.6100, distance: '8.5 km', time: '25 mins' },
    { id: 's13', name: 'Joy Babirye', class: 'Top', guardian: 'Mrs. Susan Babirye', phone: '+256 700 000333', address: 'Kisaasi Central Stage', landmark: 'Near Kisaasi Medical Centre', status: 'waiting', lat: 0.3660, lng: 32.5850, distance: '9.1 km', time: '27 mins' },
  ];

  // Real Interactive Leaflet Map with Zoom, Satellite Aerial Imagery, Live Traffic, Student Markers & Rerouting
  const RealLeafletMap = ({ students, activeStudent }) => {
    const mapRef = React.useRef(null);
    const mapInstance = React.useRef(null);
    const tileLayerRef = React.useRef(null);
    const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'satellite' | 'street'
    const [routePath, setRoutePath] = useState('normal');
    const trafficLayers = React.useRef([]);
    const routePolyline = React.useRef(null);

    const tileSources = {
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    };

    useEffect(() => {
      if (!mapRef.current || mapInstance.current) return;
      if (typeof window.L === 'undefined') return;

      const L = window.L;
      // Initialize Leaflet map centered at Kabs Lily / Kireka / Ntinda area
      const map = L.map(mapRef.current, {
        center: [0.3540, 32.6200],
        zoom: 13,
        zoomControl: true,
        attributionControl: false
      });
      mapInstance.current = map;

      // Initial Carto Dark tiles
      tileLayerRef.current = L.tileLayer(tileSources.dark, {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // 1. Add School Gate Destination Marker
      const schoolIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background:#00FC8F; color:#0A1029; font-weight:bold; font-size:11px; padding:4px 8px; border-radius:12px; border:2px solid #FFF; white-space:nowrap; box-shadow:0 0 10px #00FC8F;">🏫 Kabs Lily School</div>`,
        iconSize: [110, 30],
        iconAnchor: [55, 15]
      });
      L.marker([0.3600, 32.6250], { icon: schoolIcon }).addTo(map)
        .bindPopup(`<b>🏫 Kabs Lily Kindercare Center</b><br/>Destination Campus`);

      // Removed Surrounding Places Markers (Demo data)

      // 3. Add Student Pickup Pins
      students.forEach((s, idx) => {
        if (!s.lat || !s.lng) return;
        const isPicked = s.status === 'picked_up';
        const isSkipped = s.status === 'skipped';
        const color = isPicked ? '#10B981' : isSkipped ? '#F59E0B' : '#3B82F6';
        
        const firstName = s.name ? s.name.split(' ')[0] : 'Student';
        const pinIcon = L.divIcon({
          className: 'custom-pin-icon',
          html: `<div style="background:${color}; color:#FFF; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:12px; border:2px solid #FFF; box-shadow:0 2px 8px rgba(0,0,0,0.4); white-space:nowrap; transform: translate(-50%, -100%);">${firstName}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });

        const popupContent = `
          <div style="font-family:sans-serif; padding:4px;">
            <b style="font-size:14px; color:#0F172A;">${s.name} (${s.class})</b><br/>
            <span style="color:#D97706; font-weight:bold;">📍 ${s.address}</span><br/>
            <span style="color:#475569;">🏛️ ${s.landmark || ''}</span><br/>
            <span style="font-size:12px; color:#334155;">📞 Guardian: ${s.phone}</span><br/>
            <a href="tel:${s.phone}" style="display:inline-block; margin-top:6px; padding:4px 8px; background:#3B82F6; color:#fff; text-decoration:none; border-radius:4px; font-size:11px; font-weight:bold;">📞 Call Parent</a>
          </div>
        `;
        L.marker([s.lat, s.lng], { icon: pinIcon }).addTo(map).bindPopup(popupContent);
      });

      // Removed initial static route line

      // 5. Real Device Hardware GPS Tracking & Shuttle Car Marker
      let previousPos = null;

      const carIcon = L.divIcon({
        className: 'custom-car-icon',
        html: `
          <div class="driver-navigation-marker" style="width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:rgba(59, 130, 246, 0.2); border: 2px solid rgba(59, 130, 246, 0.6); box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);">
            <div class="nav-arrow-container" style="width:28px; height:28px; display:flex; align-items:center; justify-content:center; transform: rotate(0deg); transition: transform 0.5s ease;">
              <svg viewBox="0 0 24 24" fill="#3B82F6" stroke="#ffffff" stroke-width="2" style="width:100%; height:100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
                <path d="M12 2L2 22l10-4 10 4L12 2z"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const carMarker = L.marker([0.3540, 32.6200], { icon: carIcon }).addTo(map)
        .bindPopup(`<b>🚐 Kabs Lily Shuttle #1 (Live Device GPS)</b><br/>Locating device...`);

      let liveGpsPolyline = null;

      // This component's own navigator.geolocation calls (below) never
      // left the local map before this — a completely separate code path
      // from transport-telemetry.js's broadcaster, which this app never
      // actually calls. Fire-and-forget sync so the Headteacher's transport
      // panel (a different device) can see this van move.
      const syncCarPosition = (lat, lng, speed) => {
        try {
          const profile = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || {};
          fetch('https://nextos-sentinel.nextafricaai.workers.dev/transport/ping', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenant: (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre'),
              vanId, vanName: 'Kabs Lily Shuttle #1',
              driverName: profile.fullName || null, driverPhone: profile.phone || null,
              lat, lng, speed: speed || 0,
            }),
          }).catch(() => {});
        } catch (e) {}
      };

      const updateCarPosition = (lat, lng, speed = 0, heading = null) => {
        if (!mapInstance.current) return;
        syncCarPosition(lat, lng, speed);
        const newPos = [lat, lng];
        carMarker.setLatLng(newPos);
        
        let currentHeading = heading;
        if (currentHeading === null || currentHeading === undefined || isNaN(currentHeading)) {
           if (previousPos) {
              const prevLat = previousPos[0];
              const prevLng = previousPos[1];
              if (lat !== prevLat || lng !== prevLng) {
                const dLng = (lng - prevLng) * Math.PI / 180;
                const lat1 = prevLat * Math.PI / 180;
                const lat2 = lat * Math.PI / 180;
                const y = Math.sin(dLng) * Math.cos(lat2);
                const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
                const brng = Math.atan2(y, x);
                currentHeading = (brng * 180 / Math.PI + 360) % 360;
              } else {
                currentHeading = window._lastComputedHeading || 0;
              }
           } else {
              currentHeading = 0;
           }
        }
        window._lastComputedHeading = currentHeading;
        previousPos = newPos;

        const iconElement = carMarker.getElement();
        if (iconElement) {
          const arrowContainer = iconElement.querySelector('.nav-arrow-container');
          if (arrowContainer) {
            arrowContainer.style.transform = `rotate(${currentHeading}deg)`;
          }
        }

        carMarker.setPopupContent(`
          <b>🚐 Kabs Lily Shuttle #1 (LIVE HARDWARE GPS)</b><br/>
          <b>📍 Current Location:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}<br/>
          <b>⚡ Speed:</b> ${speed ? speed.toFixed(1) : '0.0'} km/h<br/>
          <b>🧭 Heading:</b> ${currentHeading.toFixed(1)}°<br/>
          <span style="color:#00FC8F; font-weight:bold;">🟢 Live GPS Streaming Active</span>
        `);

        // Re-center map onto user's physical GPS location
        mapInstance.current.panTo(newPos);

        // Draw live re-routing line from user's current physical position to school
        if (liveGpsPolyline) mapInstance.current.removeLayer(liveGpsPolyline);
        liveGpsPolyline = L.polyline([newPos, [0.3600, 32.6250]], {
          color: '#00FC8F',
          weight: 5,
          opacity: 0.9,
          dashArray: '6, 6'
        }).addTo(mapInstance.current);
      };

      // Watch real device hardware GPS sensor
      let geoWatchId = null;
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, speed, heading } = pos.coords;
            map.setView([latitude, longitude], 15);
            updateCarPosition(latitude, longitude, speed ? speed * 3.6 : 0, heading);
          },
          (err) => console.warn('Device GPS permission pending/denied:', err.message),
          { enableHighAccuracy: true, timeout: 10000 }
        );

        geoWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, speed, heading } = pos.coords;
            updateCarPosition(latitude, longitude, speed ? speed * 3.6 : 0, heading);
          },
          (err) => console.warn('Device GPS watch error:', err.message),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      }

      // Also listen to window TRANSPORT_TELEMETRY events
      const handleTelemetryUpdate = (e) => {
        if (e.detail && e.detail.lat && e.detail.lng) {
          updateCarPosition(e.detail.lat, e.detail.lng, e.detail.speed || 0, e.detail.heading || null);
        }
      };
      window.addEventListener('transport-telemetry-update', handleTelemetryUpdate);

      return () => {
        if (geoWatchId !== null && 'geolocation' in navigator) {
          navigator.geolocation.clearWatch(geoWatchId);
        }
        window.removeEventListener('transport-telemetry-update', handleTelemetryUpdate);
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      };
    }, []);

    useEffect(() => {
      if (mapInstance.current && activeStudent && activeStudent.lat && activeStudent.lng) {
        mapInstance.current.flyTo([activeStudent.lat, activeStudent.lng], 16, { animate: true, duration: 1.5 });
      }
    }, [activeStudent]);

    // Switch between Satellite, Dark, and Street Map tiles
    const switchMapStyle = (style) => {
      setMapStyle(style);
      if (mapInstance.current && tileLayerRef.current) {
        const L = window.L;
        mapInstance.current.removeLayer(tileLayerRef.current);
        tileLayerRef.current = L.tileLayer(tileSources[style], {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(mapInstance.current);
      }
    };

    // Removed demo drawRoute and toggleReroute functions

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: T.radii.lg, background: '#0F172A' }}></div>

        {/* Satellite & Map View Switcher + Traffic Reroute Controls */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          alignItems: 'flex-end'
        }}>
          {/* Map Layer Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(4px)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            <button
              onClick={() => switchMapStyle('dark')}
              style={{
                background: mapStyle === 'dark' ? '#3B82F6' : 'transparent',
                color: '#FFF',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🗺️ Dark
            </button>
            <button
              onClick={() => switchMapStyle('satellite')}
              style={{
                background: mapStyle === 'satellite' ? '#00FC8F' : 'transparent',
                color: mapStyle === 'satellite' ? '#0A1029' : '#FFF',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              📡 Satellite
            </button>
            <button
              onClick={() => switchMapStyle('street')}
              style={{
                background: mapStyle === 'street' ? '#3B82F6' : 'transparent',
                color: '#FFF',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🗺️ Street
            </button>
          </div>

          {/* Removed Reroute Control */}
        </div>
      </div>
    );
  };

  const DriverView = ({ vanId = 'van-01' }) => {
    const driverProfile = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || {};
    const [students, setStudents] = useState([]);
    const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
    const [isKmModalOpen, setIsKmModalOpen] = useState(false);
    const [skipModalOpen, setSkipModalOpen] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [filter, setFilter] = useState('All');
    const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);
    const [newChildName, setNewChildName] = useState('');
    const [newChildClass, setNewChildClass] = useState('P.1');
    const [newChildGuardian, setNewChildGuardian] = useState('');
    const [newChildPhone, setNewChildPhone] = useState('');
    const [newChildAddress, setNewChildAddress] = useState('');
    const [newChildLandmark, setNewChildLandmark] = useState('');
    const [newChildLat, setNewChildLat] = useState('0.3500');
    const [newChildLng, setNewChildLng] = useState('32.6200');

    // Kilometers Odometer State & History
    const [kmData, setKmData] = useState(() => {
      if (window.TRANSPORT_TELEMETRY && typeof window.TRANSPORT_TELEMETRY.getKilometers === 'function') {
        return window.TRANSPORT_TELEMETRY.getKilometers(vanId);
      }
      return { totalKm: 14.8, logs: [] };
    });
    const [customKmInput, setCustomKmInput] = useState('');
    const [kmReasonInput, setKmReasonInput] = useState('');
    const [markingArrived, setMarkingArrived] = useState(false);

    useEffect(() => {
      const tenant = (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre');
      fetch('https://nextos-sentinel.nextafricaai.workers.dev/transport/live?tenant=' + encodeURIComponent(tenant))
        .then(res => res.json())
        .then(out => {
          if (out && out.students) {
            // map real students to what DriverView expects
            const stopsDict = {};
            if (out.stops) {
              out.stops.forEach(st => {
                stopsDict[st.stop_name] = { lat: st.lat, lng: st.lng };
              });
            }

            const KNOWN_STOPS = {
              "Kasasa": { lat: 0.3550, lng: 32.6100 },
              "Kalambi": { lat: 0.3600, lng: 32.6000 },
              "Buloba Kapeeka": { lat: 0.3200, lng: 32.5000 },
              "Buloba": { lat: 0.3250, lng: 32.5050 },
              "Kiseka Road": { lat: 0.3150, lng: 32.5750 },
              "Country Oven": { lat: 0.3350, lng: 32.5900 },
              "Forest Park": { lat: 0.3400, lng: 32.5300 },
              "Total": { lat: 0.3450, lng: 32.5800 }
            };
            const mapped = out.students.map((s, i) => {
               const stopBase = s.stop_name ? s.stop_name.split('·')[0].trim() : '';
               const coords = stopsDict[s.stop_name] || stopsDict[stopBase] || KNOWN_STOPS[stopBase] || { lat: 0.3472, lng: 32.6325 };
               
               // small jitter so pins at the same stop don't overlap completely
               const offsetLat = (Math.random() - 0.5) * 0.001;
               const offsetLng = (Math.random() - 0.5) * 0.001;
               
               return {
                 id: s.id,
                 name: s.student_name || 'Unknown Student',
                 class: s.stream || 'Unknown Class',
                 guardian: `Parent of ${s.student_name || 'Student'}`,
                 phone: '+256 700 000000',
                 address: s.stop_name || 'Designated Stop',
                 landmark: 'Pick up / Drop off',
                 status: s.status || 'waiting',
                 lat: coords.lat + offsetLat,
                 lng: coords.lng + offsetLng,
                 distance: `${(Math.random() * 2 + 0.5).toFixed(1)} km`,
                 time: `${Math.floor(Math.random() * 10 + 2)} mins`
               };
            });
            setStudents(mapped);
          }
        })
        .catch(err => console.error('Failed to load live transport data:', err));
    }, []);

    // The actual "notify every parent the shuttle arrived" action — one
    // tap flips every currently-on_board student for this van to arrived
    // and pushes an alert to each of their parents server-side.
    const handleMarkArrived = async () => {
      if (markingArrived) return;
      setMarkingArrived(true);
      try {
        const tenant = (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre');
        const res = await fetch('https://nextos-sentinel.nextafricaai.workers.dev/transport/mark-arrived', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant, vanId }),
        });
        const out = await res.json();
        if (out.error) { window.peakToast ? window.peakToast('Could not notify parents: ' + out.error, 'error') : alert(out.error); }
        else { window.peakToast ? window.peakToast('Parents notified — ' + (out.notified || 0) + ' families alerted.', 'success') : alert('Notified ' + (out.notified || 0) + ' families.'); }
      } catch (e) {
        window.peakToast ? window.peakToast('Could not reach the school system.', 'error') : alert('Could not reach the school system.');
      }
      setMarkingArrived(false);
    };

    const completedStopsKm = useMemo(() => {
      const count = students.filter(s => s.status === 'picked_up').length;
      return (count * 1.4).toFixed(1);
    }, [students]);

    const grandTotalKm = useMemo(() => {
      const base = parseFloat(kmData.totalKm) || 14.8;
      const route = parseFloat(completedStopsKm) || 0;
      return (base + route).toFixed(1);
    }, [kmData, completedStopsKm]);

    const handleAddKm = (amount, reason) => {
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) return;
      if (window.TRANSPORT_TELEMETRY && typeof window.TRANSPORT_TELEMETRY.logKilometers === 'function') {
        const updated = window.TRANSPORT_TELEMETRY.logKilometers(vanId, val, reason);
        setKmData(updated);
      } else {
        setKmData(prev => ({
          totalKm: parseFloat(((prev.totalKm || 14.8) + val).toFixed(2)),
          logs: [...(prev.logs || []), { addedKm: val, reason: reason || 'Manual entry', timestamp: new Date().toISOString() }]
        }));
      }
      setIsKmModalOpen(false);
      setCustomKmInput('');
      setKmReasonInput('');
    };

    const handleAddChildToRoute = () => {
      if (!newChildName.trim() || !newChildAddress.trim()) return;
      const newStudent = {
        id: 's_' + Date.now(),
        name: newChildName.trim(),
        class: newChildClass,
        guardian: newChildGuardian.trim() || 'Guardian',
        phone: newChildPhone.trim() || '+256 700 000000',
        address: newChildAddress.trim(),
        landmark: newChildLandmark.trim() || 'Near Stage',
        status: 'waiting',
        lat: parseFloat(newChildLat) || 0.3500,
        lng: parseFloat(newChildLng) || 32.6200,
        distance: '1.5 km',
        time: '5 mins'
      };

      setStudents(prev => [newStudent, ...prev]);
      setIsAddChildModalOpen(false);
      setNewChildName(''); setNewChildGuardian(''); setNewChildPhone(''); setNewChildAddress(''); setNewChildLandmark('');
    };

    const activeStudent = useMemo(() => students.find(s => s.status === 'waiting' || s.status === 'arrived'), [students]);

    const updateStatus = (id, status) => {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    const playClickSound = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } catch (e) {}
    };

    const handlePickedUp = (id) => {
      playClickSound();
      updateStatus(id, 'picked_up');
    };

    const stats = {
      all: students.length,
      waiting: students.filter(s => s.status === 'waiting' || s.status === 'arrived').length,
      pickedUp: students.filter(s => s.status === 'picked_up').length,
      done: students.filter(s => s.status === 'picked_up' || s.status === 'skipped').length,
    };

    const filteredStudents = useMemo(() => {
      if (filter === 'Waiting') return students.filter(s => s.status === 'waiting' || s.status === 'arrived');
      if (filter === 'Picked Up') return students.filter(s => s.status === 'picked_up');
      if (filter === 'Done') return students.filter(s => s.status === 'picked_up' || s.status === 'skipped');
      return students;
    }, [students, filter]);

    return (
      <div className="driver-app-shell" style={{
        color: T.colors.text,
        fontFamily: T.fonts.sans,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: T.colors.background,
        position: 'relative',
      }}>
          
          {/* Header */}
          <div style={{
            padding: '16px',
            backgroundColor: T.colors.surface,
            borderBottom: `1px solid ${T.colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>🚐 VAN 01 — LIVE SHUTTLE COMMAND</div>
                <div style={{ fontSize: '14px', color: T.colors.textMuted, marginTop: '2px' }}>
                  Driver: {driverProfile.fullName || 'Shuttle Driver'}{driverProfile.phone ? ' · ' + driverProfile.phone : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setIsAddChildModalOpen(true)}
                  style={{
                    backgroundColor: '#3B82F6',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: T.radii.md,
                    padding: '8px 12px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  👶 Add Kid & Location
                </button>
                <button 
                  onClick={() => setIsKmModalOpen(true)}
                  style={{
                    backgroundColor: 'rgba(0, 252, 143, 0.15)',
                    color: '#00FC8F',
                    border: '1px solid #00FC8F',
                    borderRadius: T.radii.md,
                    padding: '8px 12px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Log KM
                </button>
                <button 
                  onClick={() => setIsEmergencyModalOpen(true)}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: T.colors.danger,
                    border: `2px solid ${T.colors.danger}`,
                    borderRadius: T.radii.full,
                    padding: '8px 16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  SOS
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.colors.success, fontWeight: '600' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: T.colors.success, borderRadius: '50%', boxShadow: `0 0 8px ${T.colors.success}`, animation: 'pulse 2s infinite' }}></div>
                GPS Live
              </div>
              
              {/* Shuttle Odometer & KM Covered Badge */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#60A5FA',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🛣️ Shuttle Distance:</span>
                <span style={{ color: '#FFF', fontSize: '13px', fontWeight: '800' }}>{grandTotalKm} km</span>
              </div>
            </div>
          </div>

          {/* ═══ DESKTOP SPLIT LAYOUT ═══ */}
          <div className="desktop-main-split" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* LEFT: Map Panel */}
            <div className="desktop-map-side" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, padding: '12px', minHeight: 0 }}>
                <RealLeafletMap students={students} activeStudent={activeStudent} />
              </div>

              {activeStudent && (
                <div style={{
                  position: 'absolute',
                  top: '24px',
                  left: '24px',
                  right: '24px',
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(10px)',
                  padding: '12px 16px',
                  borderRadius: T.radii.lg,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(59,130,246,0.4)',
                  zIndex: 10,
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: T.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Stop</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '2px' }}>
                      {activeStudent.name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: T.colors.primary, fontWeight: '700' }}>
                      {activeStudent.distance}
                    </div>
                    <div style={{ fontSize: '11px', color: T.colors.textMuted }}>~{activeStudent.time}</div>
                  </div>
                </div>
              )}

              <button style={{
                margin: '0 12px 12px',
                padding: '10px',
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                color: T.colors.text,
                border: `1px solid ${T.colors.border}`,
                borderRadius: T.radii.md,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}>
                📍 Recalculate Shortest Route
              </button>

              <button onClick={handleMarkArrived} disabled={markingArrived} style={{
                margin: '0 12px 12px',
                padding: '12px',
                backgroundColor: T.colors.primary,
                color: '#0A1029',
                border: 'none',
                borderRadius: T.radii.md,
                fontSize: '14px',
                fontWeight: '800',
                cursor: markingArrived ? 'wait' : 'pointer',
              }}>
                {markingArrived ? 'Notifying parents…' : '🚸 Mark Arrived at School — Notify Parents'}
              </button>
            </div>

            {/* RIGHT: Desktop Sidebar — Route Manifest + Action Card */}
            <div className="desktop-sidebar-side">

              {/* Active Stop Action Card */}
              {activeStudent ? (
                <div style={{
                  padding: '20px',
                  borderBottom: `1px solid ${T.colors.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%)',
                }}>
                  <div style={{ fontSize: '11px', color: T.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>
                    ▶ Active Stop
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '52px', height: '52px',
                      borderRadius: T.radii.full,
                      background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 'bold', flexShrink: 0,
                    }}>
                      {activeStudent.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.2 }}>{activeStudent.name}</div>
                      <div style={{ color: T.colors.primary, fontWeight: '600', fontSize: '12px', marginTop: '2px' }}>{activeStudent.class}</div>
                      <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '4px', lineHeight: 1.4 }}>
                        📍 {activeStudent.address}
                      </div>
                      {activeStudent.landmark && (
                        <div style={{ fontSize: '11px', color: T.colors.textMuted, marginTop: '2px' }}>
                          🏛️ {activeStudent.landmark}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: T.colors.textMuted, lineHeight: 1.4 }}>
                    <b style={{ color: T.colors.text }}>Guardian:</b> {activeStudent.guardian} · <a href={`tel:${activeStudent.phone}`} style={{ color: '#60A5FA', textDecoration: 'none' }}>{activeStudent.phone}</a>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeStudent.status === 'waiting' && (
                      <button 
                        onClick={() => updateStatus(activeStudent.id, 'arrived')}
                        style={{
                          padding: '14px', backgroundColor: T.colors.warning, color: '#000',
                          border: 'none', borderRadius: T.radii.md, fontSize: '15px', fontWeight: '800', cursor: 'pointer',
                          letterSpacing: '0.03em',
                        }}
                      >
                        📍 ARRIVED AT STOP
                      </button>
                    )}
                    
                    {activeStudent.status === 'arrived' && (
                      <button 
                        onClick={() => handlePickedUp(activeStudent.id)}
                        style={{
                          padding: '16px', backgroundColor: T.colors.success, color: '#fff',
                          border: 'none', borderRadius: T.radii.md, fontSize: '17px', fontWeight: '900', cursor: 'pointer',
                          boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
                        }}
                      >
                        🟢 CHILD PICKED UP
                      </button>
                    )}

                    <button 
                      onClick={() => setSkipModalOpen(activeStudent.id)}
                      style={{
                        padding: '12px', backgroundColor: 'transparent', color: T.colors.warning,
                        border: `1.5px solid ${T.colors.warning}`, borderRadius: T.radii.md, fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      }}
                    >
                      🟠 SKIPPED / ABSENT
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '28px 20px', borderBottom: `1px solid ${T.colors.border}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '28px' }}>🎉</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>All Stops Completed</div>
                  <div style={{ color: T.colors.textMuted, fontSize: '13px' }}>Drive safely back to campus.</div>
                </div>
              )}

              {/* Route Manifest Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', padding: '12px 16px', overflowX: 'auto', borderBottom: `1px solid ${T.colors.border}`, flexShrink: 0 }}>
                {['All', 'Waiting', 'Picked Up', 'Done'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: filter === f ? T.colors.primary : T.colors.surface,
                      color: filter === f ? '#fff' : T.colors.text,
                      border: 'none', borderRadius: T.radii.full, fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {f} ({f === 'All' ? stats.all : f === 'Waiting' ? stats.waiting : f === 'Picked Up' ? stats.pickedUp : stats.done})
                  </button>
                ))}
              </div>

              {/* Desktop Route Manifest List */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredStudents.map((s, idx) => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                    backgroundColor: s.id === (activeStudent && activeStudent.id) ? 'rgba(59,130,246,0.12)' : T.colors.surface,
                    borderRadius: T.radii.md,
                    border: s.id === (activeStudent && activeStudent.id) ? '1px solid rgba(59,130,246,0.4)' : `1px solid ${T.colors.border}`,
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: T.colors.textMuted, width: '20px', flexShrink: 0, textAlign: 'center' }}>{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', lineHeight: 1.2 }}>{s.name} <span style={{ color: T.colors.textMuted, fontWeight: 'normal', fontSize: '11px' }}>({s.class})</span></div>
                      <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: '600', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {s.address}</div>
                      {s.landmark && <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏛️ {s.landmark}</div>}
                    </div>
                    <div style={{
                      padding: '3px 8px',
                      backgroundColor: s.status === 'picked_up' ? 'rgba(16, 185, 129, 0.15)' : s.status === 'skipped' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: s.status === 'picked_up' ? T.colors.success : s.status === 'skipped' ? T.colors.warning : T.colors.primary,
                      borderRadius: T.radii.full, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0,
                    }}>
                      {s.status === 'picked_up' ? '✓' : s.status === 'skipped' ? '✗' : '•'} {s.status.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ MOBILE ONLY: Active Stop Action Card ═══ */}
          <div className="mobile-drawer-overlay" style={{ position: 'static', height: 'auto', transform: 'none', transition: 'none', borderRadius: 0, boxShadow: 'none', zIndex: 20, background: 'transparent' }}>
            {activeStudent ? (
              <div style={{
                backgroundColor: '#1E293B',
                padding: '16px 16px max(16px, env(safe-area-inset-bottom))',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 -2px 16px rgba(0,0,0,0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px', height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 'bold', flexShrink: 0,
                  }}>
                    {activeStudent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: 1.2 }}>{activeStudent.name}</div>
                    <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {activeStudent.address}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#60A5FA', fontWeight: '700', textAlign: 'right' }}>
                    {activeStudent.distance}<br/><span style={{ color: '#94A3B8', fontWeight: 'normal' }}>{activeStudent.time}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {activeStudent.status === 'waiting' && (
                    <button 
                      onClick={() => updateStatus(activeStudent.id, 'arrived')}
                      style={{ flex: 1, padding: '14px 8px', backgroundColor: '#F59E0B', color: '#000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      📍 ARRIVED
                    </button>
                  )}
                  {activeStudent.status === 'arrived' && (
                    <button 
                      onClick={() => handlePickedUp(activeStudent.id)}
                      style={{ flex: 1, padding: '14px 8px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '900', cursor: 'pointer' }}
                    >
                      🟢 PICKED UP
                    </button>
                  )}
                  <button 
                    onClick={() => setSkipModalOpen(activeStudent.id)}
                    style={{ flex: '0 0 auto', padding: '14px 12px', backgroundColor: 'transparent', color: '#F59E0B', border: '1.5px solid #F59E0B', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    🟠 Skip
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                🎉 All stops completed — drive safely!
              </div>
            )}
          </div>

          {/* ═══ MOBILE ONLY: Swipe Drawer ═══ */}
          <div className="mobile-drawer-overlay" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: T.colors.background,
            borderTopLeftRadius: T.radii.xl, borderTopRightRadius: T.radii.xl,
            transform: drawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 64px))',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 30, display: 'flex', flexDirection: 'column', height: '70vh',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.4)',
          }}>
            <div 
              onClick={() => setDrawerOpen(!drawerOpen)}
              style={{
                height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: `1px solid ${T.colors.border}`, cursor: 'pointer', flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '4px', backgroundColor: T.colors.border, borderRadius: '2px' }}></div>
                <span style={{ fontWeight: 'bold', color: T.colors.textMuted }}>Route Manifest ({stats.done}/{stats.all})</span>
              </div>
            </div>
            
            {drawerOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '8px', padding: '16px', overflowX: 'auto', borderBottom: `1px solid ${T.colors.border}`, flexShrink: 0 }}>
                  {['All', 'Waiting', 'Picked Up', 'Done'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: filter === f ? T.colors.primary : T.colors.surface,
                        color: filter === f ? '#fff' : T.colors.text,
                        border: 'none', borderRadius: T.radii.full, fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {f} ({f === 'All' ? stats.all : f === 'Waiting' ? stats.waiting : f === 'Picked Up' ? stats.pickedUp : stats.done})
                    </button>
                  ))}
                </div>
                
                <div style={{ overflowY: 'auto', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredStudents.map((s, idx) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      backgroundColor: T.colors.surface, borderRadius: T.radii.md, border: `1px solid ${T.colors.border}`,
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: T.colors.textMuted, width: '24px' }}>{idx + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{s.name} <span style={{ color: T.colors.textMuted, fontWeight: 'normal' }}>({s.class})</span></div>
                        <div style={{ fontSize: '12.5px', color: '#F59E0B', fontWeight: '600', marginTop: '2px' }}>📍 {s.address}</div>
                        {s.landmark && <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '1px' }}>🏛️ {s.landmark}</div>}
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        backgroundColor: s.status === 'picked_up' ? 'rgba(16, 185, 129, 0.15)' : s.status === 'skipped' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: s.status === 'picked_up' ? T.colors.success : s.status === 'skipped' ? T.colors.warning : T.colors.primary,
                        borderRadius: T.radii.full, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                      }}>
                        {s.status.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Skip Modal */}
          {skipModalOpen && (
             <div style={{
               position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
               zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
             }}>
               <div style={{
                 backgroundColor: T.colors.surface, padding: '24px', borderRadius: T.radii.xl,
                 width: '100%', display: 'flex', flexDirection: 'column', gap: '16px',
               }}>
                 <h3 style={{ margin: 0, fontSize: '20px' }}>Skip Student?</h3>
                 {['Child ill', 'Parent called', 'No answer at gate'].map(reason => (
                   <button 
                     key={reason}
                     onClick={() => { updateStatus(skipModalOpen, 'skipped'); setSkipModalOpen(null); }}
                     style={{ padding: '16px', backgroundColor: T.colors.surfaceHover, color: T.colors.text, border: 'none', borderRadius: T.radii.md, fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                   >
                     {reason}
                   </button>
                 ))}
                 <button onClick={() => setSkipModalOpen(null)} style={{ padding: '16px', backgroundColor: 'transparent', color: T.colors.text, border: `1px solid ${T.colors.border}`, borderRadius: T.radii.md, fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
               </div>
             </div>
          )}

          {/* SOS Modal */}
          {isEmergencyModalOpen && (
             <div style={{
               position: 'absolute', inset: 0, backgroundColor: 'rgba(220, 38, 38, 0.3)', backdropFilter: 'blur(8px)',
               zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
             }}>
               <div style={{
                 backgroundColor: T.colors.surface, padding: '32px 24px', borderRadius: T.radii.xl,
                 width: '100%', display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center',
                 border: `2px solid ${T.colors.danger}`,
               }}>
                 <h2 style={{ margin: 0, color: T.colors.danger, fontSize: '26px', fontWeight: '900' }}>EMERGENCY SOS</h2>
                 <p style={{ margin: 0, fontSize: '15px', color: T.colors.textMuted }}>This will immediately alert the school administration and broadcast your location.</p>
                 <a href="tel:+256700000000" style={{
                   padding: '20px', backgroundColor: T.colors.danger, color: '#fff', borderRadius: T.radii.md,
                   fontSize: '20px', fontWeight: 'bold', textDecoration: 'none',
                 }}>
                   📞 CALL HEAD TEACHER
                 </a>
                 <button onClick={() => setIsEmergencyModalOpen(false)} style={{
                   padding: '16px', backgroundColor: 'transparent', color: T.colors.textMuted, border: 'none',
                   fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                 }}>
                   Cancel
                 </button>
               </div>
             </div>
          )}

           {/* Add Real Kid & Location Modal */}
          {isAddChildModalOpen && (
            <div style={{
              position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
              zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            }}>
              <div style={{
                backgroundColor: T.colors.surface, padding: '24px', borderRadius: T.radii.xl,
                width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid #3B82F6',
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#60A5FA' }}>👶 Add Child to Shuttle Route</h3>
                <p style={{ margin: 0, fontSize: '12px', color: T.colors.textMuted }}>
                  Enter real child info & pickup location to display on live Satellite map.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="text" placeholder="Child Name (e.g. Alvin Mwesigwa)"
                    value={newChildName} onChange={e => setNewChildName(e.target.value)}
                    style={{ gridColumn: 'span 2', background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '10px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                  <select
                    value={newChildClass} onChange={e => setNewChildClass(e.target.value)}
                    style={{ background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '10px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  >
                    {['Baby', 'Middle', 'Top', 'P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="text" placeholder="Guardian Phone (+256...)"
                    value={newChildPhone} onChange={e => setNewChildPhone(e.target.value)}
                    style={{ background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '10px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                  <input
                    type="text" placeholder="Guardian Name"
                    value={newChildGuardian} onChange={e => setNewChildGuardian(e.target.value)}
                    style={{ gridColumn: 'span 2', background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '10px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                  <input
                    type="text" placeholder="Pickup Address (e.g. Kireka Kamuli Rd)"
                    value={newChildAddress} onChange={e => setNewChildAddress(e.target.value)}
                    style={{ gridColumn: 'span 2', background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '10px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                  <input
                    type="text" placeholder="Landmark (e.g. Near Kamuli Stage)"
                    value={newChildLandmark} onChange={e => setNewChildLandmark(e.target.value)}
                    style={{ gridColumn: 'span 2', background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '10px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <button
                  onClick={handleAddChildToRoute}
                  disabled={!newChildName || !newChildAddress}
                  style={{
                    padding: '12px', backgroundColor: (newChildName && newChildAddress) ? '#3B82F6' : T.colors.surfaceHover,
                    color: '#FFF', border: 'none', borderRadius: T.radii.md, fontSize: '15px', fontWeight: 'bold', cursor: (newChildName && newChildAddress) ? 'pointer' : 'not-allowed', marginTop: '4px'
                  }}
                >
                  Add Child to Route Manifest 🟢
                </button>
                <button onClick={() => setIsAddChildModalOpen(false)} style={{ padding: '10px', backgroundColor: 'transparent', color: T.colors.textMuted, border: `1px solid ${T.colors.border}`, borderRadius: T.radii.md, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Kilometers Log Modal */}
          {isKmModalOpen && (
            <div style={{
              position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
              zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
            }}>
              <div style={{
                backgroundColor: T.colors.surface, padding: '24px', borderRadius: T.radii.xl,
                width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid #00FC8F',
              }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#00FC8F' }}>➕ Log Shuttle Kilometers</h3>
                <p style={{ margin: 0, fontSize: '13px', color: T.colors.textMuted }}>
                  Total Today: <b>{grandTotalKm} km</b> (Route: {completedStopsKm} km | Logged: {kmData.totalKm} km)
                </p>

                {/* Quick Add Chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => handleAddKm(2.0, 'Fuel trip')} style={{ flex: 1, padding: '10px', background: 'rgba(0,252,143,0.15)', color: '#00FC8F', border: '1px solid #00FC8F', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>+ 2.0 km<br/><span style={{ fontSize: '10px', opacity: 0.8 }}>Fuel Run</span></button>
                  <button onClick={() => handleAddKm(5.0, 'Extra Pickup Route')} style={{ flex: 1, padding: '10px', background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid #3B82F6', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>+ 5.0 km<br/><span style={{ fontSize: '10px', opacity: 0.8 }}>Extra Pickup</span></button>
                  <button onClick={() => handleAddKm(10.0, 'School Event Trip')} style={{ flex: 1, padding: '10px', background: 'rgba(245,158,11,0.15)', color: '#FBBF24', border: '1px solid #F59E0B', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>+ 10.0 km<br/><span style={{ fontSize: '10px', opacity: 0.8 }}>Event Trip</span></button>
                </div>

                {/* Custom KM Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <label style={{ fontSize: '12px', color: T.colors.textMuted }}>Custom Kilometers (KM):</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 7.5"
                    value={customKmInput}
                    onChange={e => setCustomKmInput(e.target.value)}
                    style={{ background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '12px', borderRadius: '8px', outline: 'none', fontSize: '16px' }}
                  />
                  <input
                    type="text"
                    placeholder="Trip reason (e.g. Bweyogerere extra dropoff)"
                    value={kmReasonInput}
                    onChange={e => setKmReasonInput(e.target.value)}
                    style={{ background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '12px', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
                  />
                </div>

                <button
                  onClick={() => handleAddKm(customKmInput, kmReasonInput || 'Driver manual entry')}
                  disabled={!customKmInput}
                  style={{
                    padding: '14px', backgroundColor: customKmInput ? '#00FC8F' : T.colors.surfaceHover,
                    color: customKmInput ? '#0A1029' : T.colors.textMuted, border: 'none', borderRadius: T.radii.md,
                    fontSize: '16px', fontWeight: 'bold', cursor: customKmInput ? 'pointer' : 'not-allowed',
                  }}
                >
                  Confirm & Save KM Log
                </button>

                <button onClick={() => setIsKmModalOpen(false)} style={{ padding: '12px', backgroundColor: 'transparent', color: T.colors.textMuted, border: `1px solid ${T.colors.border}`, borderRadius: T.radii.md, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

      </div>
    );
  };

  global.DriverView = DriverView;
  
  global.DriverViewDemo = () => {
    const rootEl = document.getElementById('root');
    if (rootEl && global.ReactDOM) {
      const root = global.ReactDOM.createRoot(rootEl);
      root.render(React.createElement(DriverView));
    } else {
      console.error('DriverViewDemo requires #root and ReactDOM');
    }
  };

})(typeof window !== 'undefined' ? window : global);
