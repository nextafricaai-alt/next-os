/**
 * Real-Time School Transport Telemetry & Routing Engine
 * Next OS - Peak Primary Prototype
 */
(function() {
    if (window.TRANSPORT_TELEMETRY) return;

    // --- Configuration & State ---
    const TENANT_ID = 'peak_primary'; // Default tenant
    let watchId = null;
    let isBroadcasting = false;
    let simulationInterval = null;
    let currentVanId = null;
    let currentDriverInfo = null;
    
    // Fallback/Simulated route around Kampala (Kabs Lily / Peak Primary area)
    const KAMPALA_SIM_WAYPOINTS = [
        { lat: 0.3136, lng: 32.5811 }, // Central Kampala
        { lat: 0.3180, lng: 32.5850 },
        { lat: 0.3220, lng: 32.5900 },
        { lat: 0.3280, lng: 32.5950 },
        { lat: 0.3340, lng: 32.5980 }
    ];
    let simWaypointIndex = 0;
    
    // --- Helper Functions ---
    
    // Haversine formula to calculate distance between two coordinates in km
    function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Save telemetry to localStorage ring buffer
    function saveTelemetry(tenantId, data) {
        const key = `nextos.transport.telemetry.${tenantId}`;
        let buffer = [];
        try {
            const stored = localStorage.getItem(key);
            if (stored) buffer = JSON.parse(stored);
        } catch (e) {
            console.warn('Error reading telemetry buffer from localStorage', e);
        }
        
        buffer.push(data);
        if (buffer.length > 100) {
            buffer.shift(); // keep only last 100 points
        }
        
        try {
            localStorage.setItem(key, JSON.stringify(buffer));
        } catch (e) {
            console.warn('Error writing telemetry to localStorage', e);
        }
    }

    // Emit custom events
    function emitEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }

    // --- Core Features ---

    // 1. GPS Telemetry Broadcaster
    function startBroadcasting(vanId, driverInfo) {
        if (isBroadcasting) {
            console.warn(`Already broadcasting telemetry for Van: ${currentVanId}`);
            return;
        }

        currentVanId = vanId;
        currentDriverInfo = driverInfo;
        isBroadcasting = true;
        console.log(`Starting telemetry broadcast for ${vanId} (Driver: ${driverInfo?.name || 'Unknown'})`);

        const handlePosition = (position) => {
            const coords = position.coords;
            const telemetryPoint = {
                vanId: currentVanId,
                driverInfo: currentDriverInfo,
                lat: coords.latitude,
                lng: coords.longitude,
                speed: coords.speed ? (coords.speed * 3.6) : null, // m/s to km/h
                heading: coords.heading,
                accuracy: coords.accuracy,
                timestamp: position.timestamp || Date.now()
            };
            
            saveTelemetry(TENANT_ID, telemetryPoint);
            emitEvent('transport-telemetry-update', telemetryPoint);
            // Optionally, push to Supabase Realtime here
        };

        const handleError = (error) => {
            console.warn(`Geolocation error (${error.code}): ${error.message}. Falling back to simulation.`);
            startSimulation();
        };

        if ('geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                handlePosition,
                handleError,
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        } else {
            console.warn('Geolocation not supported by this browser. Using simulation.');
            startSimulation();
        }
    }

    function startSimulation() {
        if (simulationInterval) clearInterval(simulationInterval);
        console.log('Starting simulated GPS movement...');
        
        simWaypointIndex = 0;
        
        simulationInterval = setInterval(() => {
            if (!isBroadcasting) {
                clearInterval(simulationInterval);
                return;
            }
            
            const currentWaypoint = KAMPALA_SIM_WAYPOINTS[simWaypointIndex];
            
            // Basic interpolation for smooth movement (simulate speed)
            const simulatedLat = currentWaypoint.lat + (Math.random() - 0.5) * 0.001;
            const simulatedLng = currentWaypoint.lng + (Math.random() - 0.5) * 0.001;
            
            const telemetryPoint = {
                vanId: currentVanId,
                driverInfo: currentDriverInfo,
                lat: simulatedLat,
                lng: simulatedLng,
                speed: 25 + (Math.random() * 10 - 5), // Simulated speed ~25km/h
                heading: 0, // Simplified
                accuracy: 10,
                timestamp: Date.now(),
                isSimulated: true
            };
            
            saveTelemetry(TENANT_ID, telemetryPoint);
            emitEvent('transport-telemetry-update', telemetryPoint);
            
            // Slowly move to next waypoint roughly
            if (Math.random() > 0.8) {
                 simWaypointIndex = (simWaypointIndex + 1) % KAMPALA_SIM_WAYPOINTS.length;
            }

        }, 3000); // Update every 3 seconds
    }

    function stopBroadcasting() {
        if (!isBroadcasting) return;
        
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
        
        isBroadcasting = false;
        console.log(`Stopped telemetry broadcast for ${currentVanId}`);
        currentVanId = null;
        currentDriverInfo = null;
    }

    function getLiveTelemetry(tenantId = TENANT_ID) {
        const key = `nextos.transport.telemetry.${tenantId}`;
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to get live telemetry', e);
            return [];
        }
    }

    // 2. Route Optimization (Nearest Neighbor)
    function calculateShortestRoute(driverPos, stops) {
        if (!driverPos || !stops || stops.length === 0) {
            return { orderedStops: [], totalDistanceKm: 0, totalDurationMins: 0, routeCoordinates: [] };
        }

        const pendingStops = stops.filter(s => s.status === 'waiting');
        const orderedStops = [];
        let currentPos = driverPos;
        let totalDistanceKm = 0;
        const routeCoordinates = [[driverPos.lat, driverPos.lng]];

        while (pendingStops.length > 0) {
            let nearestIndex = 0;
            let minDistance = Infinity;

            for (let i = 0; i < pendingStops.length; i++) {
                const stop = pendingStops[i];
                const dist = calculateHaversineDistance(currentPos.lat, currentPos.lng, stop.lat, stop.lng);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestIndex = i;
                }
            }

            const nearestStop = pendingStops[nearestIndex];
            orderedStops.push(nearestStop);
            totalDistanceKm += minDistance;
            routeCoordinates.push([nearestStop.lat, nearestStop.lng]);
            currentPos = { lat: nearestStop.lat, lng: nearestStop.lng };
            
            pendingStops.splice(nearestIndex, 1);
        }

        // Estimate time: Assume 25 km/h urban average speed
        const speedKmph = 25; 
        const totalDurationMins = (totalDistanceKm / speedKmph) * 60;

        return {
            orderedStops,
            totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
            totalDurationMins: Math.round(totalDurationMins),
            routeCoordinates
        };
    }

    // 3. Student Pickup State Machine
    function updateStudentStatus(vanId, studentId, newStatus, notes = '') {
        const validStatuses = ['waiting', 'arrived', 'picked_up', 'dropped_off', 'skipped'];
        if (!validStatuses.includes(newStatus)) {
            console.error(`Invalid status: ${newStatus}`);
            return false;
        }

        const tenantId = TENANT_ID;
        const manifestKey = `nextos.transport.manifest.${tenantId}`;
        let manifest = {};

        try {
            const stored = localStorage.getItem(manifestKey);
            if (stored) manifest = JSON.parse(stored);
        } catch (e) {
            console.warn('Error reading manifest from localStorage', e);
        }

        if (!manifest[vanId]) {
            manifest[vanId] = {};
        }

        manifest[vanId][studentId] = {
            status: newStatus,
            updatedAt: Date.now(),
            notes: notes
        };

        try {
            localStorage.setItem(manifestKey, JSON.stringify(manifest));
        } catch (e) {
            console.warn('Error saving manifest to localStorage', e);
        }

        const eventDetail = { vanId, studentId, status: newStatus, notes, timestamp: Date.now() };
        emitEvent('transport-student-status-changed', eventDetail);

        // Notify Nia Memory Engine if available
        if (window.NIA_MEMORY && typeof window.NIA_MEMORY.write === 'function') {
            window.NIA_MEMORY.write(tenantId, 'transport_pickup', { vanId, studentId, status: newStatus, notes });
        }

        console.log(`Student ${studentId} on ${vanId} status updated to: ${newStatus}`);
        return true;
    }

    function getStudentManifest(tenantId, vanId) {
        const manifestKey = `nextos.transport.manifest.${tenantId || TENANT_ID}`;
        try {
            const stored = localStorage.getItem(manifestKey);
            if (stored) {
                const manifest = JSON.parse(stored);
                return vanId ? (manifest[vanId] || {}) : manifest;
            }
        } catch (e) {
            console.error('Failed to get student manifest', e);
        }
        return {};
    }

    // Kampala Sample Route Data
    function getKampalaSampleRoute() {
        return {
            vanId: 'Van 01',
            driverInfo: {
                name: 'Tr. Moses K.',
                phone: '+256 772 123456'
            },
            stops: [
                { id: 'S001', studentName: 'Aisha N.', guardianPhone: '+256700111222', lat: 0.3300, lng: 32.5800, status: 'waiting', address: 'Bukoto' },
                { id: 'S002', studentName: 'David K.', guardianPhone: '+256700111333', lat: 0.3350, lng: 32.5850, status: 'waiting', address: 'Ntinda' },
                { id: 'S003', studentName: 'Sarah M.', guardianPhone: '+256700111444', lat: 0.3400, lng: 32.5950, status: 'waiting', address: 'Naalya' },
                { id: 'S004', studentName: 'Brian O.', guardianPhone: '+256700111555', lat: 0.3250, lng: 32.6000, status: 'waiting', address: 'Mutungo' },
                { id: 'S005', studentName: 'Chloe A.', guardianPhone: '+256700111666', lat: 0.3150, lng: 32.6100, status: 'waiting', address: 'Luzira' },
                { id: 'S006', studentName: 'Ethan T.', guardianPhone: '+256700111777', lat: 0.3100, lng: 32.5900, status: 'waiting', address: 'Bugolobi' }
            ]
        };
    }

    function logKilometers(vanId, addedKm, reason) {
        const key = `nextos.transport.km.${vanId || 'van-01'}`;
        let record = { totalKm: 14.8, logs: [] };
        try {
            const stored = localStorage.getItem(key);
            if (stored) record = JSON.parse(stored);
        } catch (e) {}

        const added = parseFloat(addedKm) || 0;
        record.totalKm = parseFloat((record.totalKm + added).toFixed(2));
        record.logs.push({
            addedKm: added,
            reason: reason || 'Manual odometer entry',
            timestamp: new Date().toISOString()
        });

        try {
            localStorage.setItem(key, JSON.stringify(record));
        } catch (e) {}

        emitEvent('transport-km-updated', { vanId, record });
        return record;
    }

    function getKilometers(vanId) {
        const key = `nextos.transport.km.${vanId || 'van-01'}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) return JSON.parse(stored);
        } catch (e) {}
        return { totalKm: 14.8, logs: [] };
    }

    function subscribe(vanId, callback) {
        if (typeof callback !== 'function') return () => {};
        const handler = (e) => {
            if (!vanId || (e.detail && e.detail.vanId === vanId)) {
                callback(e.detail);
            }
        };
        window.addEventListener('transport-telemetry-updated', handler);
        window.addEventListener('transport-student-status-changed', handler);
        window.addEventListener('transport-km-updated', handler);
        return () => {
            window.removeEventListener('transport-telemetry-updated', handler);
            window.removeEventListener('transport-student-status-changed', handler);
            window.removeEventListener('transport-km-updated', handler);
        };
    }

    // --- Public API ---
    window.TRANSPORT_TELEMETRY = {
        startBroadcasting,
        stopBroadcasting,
        getLiveTelemetry,
        calculateHaversineDistance,
        calculateShortestRoute,
        updateStudentStatus,
        getStudentManifest,
        getKampalaSampleRoute,
        logKilometers,
        getKilometers,
        subscribe
    };

    console.log('Next OS: Transport Telemetry Engine initialized.');

})();
