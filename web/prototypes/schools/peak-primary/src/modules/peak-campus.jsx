import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } from 'react';

const T = window.V4.T;
  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
  function tenant() { const p = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()); return (p && p.tenantId) || 'peak-primary'; }
  function me() { const p = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()); return (p && (p.fullName || p.email)) || ''; }
  const card = { background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 };
  const inp = { background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '9px 11px', fontSize: 13, color: T.ink, fontFamily: T.font, outline: 'none', width: '100%' };
  const btn = (p) => ({ border: p ? 'none' : '1px solid ' + T.borderStr, background: p ? T.red : 'transparent', color: p ? '#fff' : T.ink2, padding: '8px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' });
  const FLAG = { fight: { label: 'Possible fight', icon: '⚠️', c: '#ff5a72' }, fall_injury: { label: 'Child may be hurt', icon: '🚑', c: '#ff5a72' }, escape_perimeter: { label: 'Possible escape', icon: '🏃', c: '#e8a23a' }, overcrowding: { label: 'Crowding', icon: '👥', c: '#e8a23a' }, other: { label: 'Flag', icon: '🔍', c: '#d8a200' } };

  // ── Face recognition (in-browser, same engine as the gate). Matches faces in a frame to enrolled profiles. ──
  const FA_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
  const FA_MODELS = '/prototypes/schools/peak-primary/assets/models/face-api';
  let _faPromise = null;
  function loadFaceApi() {
    if (window.faceapi && window.faceapi.nets && window.faceapi.nets.faceRecognitionNet && window.faceapi.nets.faceRecognitionNet.params) return Promise.resolve(true);
    if (_faPromise) return _faPromise;
    _faPromise = new Promise((resolve) => {
      const loadModels = () => { Promise.all([window.faceapi.nets.ssdMobilenetv1.loadFromUri(FA_MODELS), window.faceapi.nets.faceLandmark68Net.loadFromUri(FA_MODELS), window.faceapi.nets.faceRecognitionNet.loadFromUri(FA_MODELS)]).then(() => resolve(true)).catch((e) => { console.error('FaceEngine Error:', e); resolve(false); }); };
      if (window.faceapi) return loadModels();
      const sc = document.createElement('script'); sc.src = FA_CDN; sc.onload = loadModels; sc.onerror = () => resolve(false); document.head.appendChild(sc);
    });
    return _faPromise;
  }
  function imgFromSrc(src) { return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; }); }

  function WebcamTestTab({ matcher }) {
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const [status, setStatus] = React.useState('Starting camera...');
    
    React.useEffect(() => {
      let isMounted = true;
      let reqId = null;
      navigator.mediaDevices.getUserMedia({ video: {} }).then(stream => {
        if (isMounted && videoRef.current) videoRef.current.srcObject = stream;
      }).catch(() => setStatus('Camera access denied or unavailable.'));
      
      return () => {
        isMounted = false;
        if (reqId) cancelAnimationFrame(reqId);
        if (videoRef.current && videoRef.current.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      };
    }, []);

    const onPlay = () => {
       setStatus('');
       const loop = async () => {
         if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
           return setTimeout(() => loop(), 1000);
         }
         const video = videoRef.current;
         const canvas = canvasRef.current;
         const displaySize = { width: video.videoWidth, height: video.videoHeight };
         if (displaySize.width === 0) { requestAnimationFrame(loop); return; }
         
         window.faceapi.matchDimensions(canvas, displaySize);
         const detections = await window.faceapi.detectAllFaces(video, new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptors();
         const resized = window.faceapi.resizeResults(detections, displaySize);
         
         const ctx = canvas.getContext('2d');
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         
         resized.forEach(d => {
            const box = d.detection.box;
            let label = 'Unknown', color = T.warn;
            if (matcher) {
               const match = matcher.findBestMatch(d.descriptor);
               if (match.label !== 'unknown') {
                 label = match.toString(); color = T.good;
               }
            }
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(box.x, box.y, box.width, box.height);
            ctx.fillStyle = color; ctx.fillRect(box.x, box.y - 24, ctx.measureText(label).width + 12, 24);
            ctx.fillStyle = '#000'; ctx.font = '14px ' + T.mono; ctx.fillText(label, box.x + 6, box.y - 6);
         });
         requestAnimationFrame(loop);
       };
       loop();
    };

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: 720, background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
         {status && <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontFamily: T.mono }}>{status}</div>}
         <video ref={videoRef} onPlay={onPlay} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted playsInline />
         <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      </div>
    );
  }

  function SmartCampus() {
    const [cams, setCams] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [tab, setTab] = useState('live');
    const [form, setForm] = useState(null);
    const [res, setRes] = useState({});
    const [busy, setBusy] = useState({});
    const roster = (window.PEAK && window.PEAK.students) || [];
    const [matcher, setMatcher] = useState(null);
    const [faReady, setFaReady] = useState(null); // null=loading, true/false
    const [enrolledCount, setEnrolledCount] = useState(0);
    const [enrolling, setEnrolling] = useState(false);
    const [enrolStats, setEnrolStats] = useState('');
    useEffect(() => {
      loadFaceApi().then(ok => {
        setFaReady(ok);
        fetch(WK + '/os-data?kind=face_enroll&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => {
          const enr = ((d && d.records) || []).map(x => x.payload).filter(p => p && p.descriptor);
          setEnrolledCount(enr.length);
          if (ok && enr.length && window.faceapi) { try { const labeled = enr.map(e => new window.faceapi.LabeledFaceDescriptors(String(e.studentId), [new Float32Array(e.descriptor)])); setMatcher(new window.faceapi.FaceMatcher(labeled, 0.5)); } catch (e) {} }
        }).catch(() => {});
      });
    }, []);
    const nameById = {}; roster.forEach(s => { nameById[String(s.id)] = s.name; });
    const matchFrame = async (src) => {
      if (!window.faceapi || !matcher || !src) return null;
      try {
        const img = await imgFromSrc(src);
        const opts = new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
        const dets = await window.faceapi.detectAllFaces(img, opts).withFaceLandmarks().withFaceDescriptors();
        const byId = {}; let unknown = 0;
        dets.forEach(dt => { const best = matcher.findBestMatch(dt.descriptor); if (best.label !== 'unknown' && best.distance <= 0.5) { const m = { id: best.label, name: nameById[best.label] || ('#' + best.label), distance: best.distance, conf: Math.max(0, Math.round((1 - best.distance) * 100)), strong: best.distance <= 0.4 }; if (!byId[m.id] || m.distance < byId[m.id].distance) byId[m.id] = m; } else unknown++; });
        return { faces: dets.length, matched: Object.values(byId).sort((a, b) => a.distance - b.distance), unknown: unknown };
      } catch (e) { return { error: 'Could not read faces in this frame (the camera image may block cross-origin access).' }; }
    };
    const markPresent = (matched) => { Promise.all((matched || []).map(m => fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'gate_checkin', tenant: tenant(), record: { studentId: Number(m.id), name: m.name, via: 'camera', at: new Date().toISOString() } }) }))).then(() => window.peakToast && window.peakToast('Marked ' + (matched || []).length + ' present', 'success', 'Counts toward school attendance.')); };
    const getFrame = (cam) => { if (!cam.snapshotUrl) return Promise.resolve(null); return fetch(WK + '/camera/frame', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant: tenant(), imageUrl: cam.snapshotUrl }) }).then(r => r.json()).then(d => (d && d.ok) ? d.frame : null).catch(() => null); };
    const [watch, setWatch] = useState(false);
    useEffect(() => {
      if (!watch) return; let alive = true;
      const tick = () => { cams.filter(c => c.snapshotUrl).forEach(cam => { getFrame(cam).then(fr => { if (!alive || !fr) return; setRes(rr => Object.assign({}, rr, { [cam._id]: Object.assign({}, rr[cam._id] || {}, { frame: fr }) })); if (matcher) matchFrame(fr).then(fm => { if (alive && fm) setRes(rr => Object.assign({}, rr, { [cam._id]: Object.assign({}, rr[cam._id] || {}, { face: fm }) })); }); }); }); };
      tick(); const iv = setInterval(tick, 20000); return () => { alive = false; clearInterval(iv); };
    }, [watch, cams, matcher]);
    const [findId, setFindId] = useState('');
    const [finding, setFinding] = useState(false);
    const [sightings, setSightings] = useState(null);
    const findLearner = async () => {
      if (!findId) return;
      if (!matcher) { window.peakToast && window.peakToast('Face engine not ready', 'info', enrolledCount ? 'Give it a moment.' : 'No learners enrolled yet — enrol faces at the gate.'); return; }
      const withUrl = cams.filter(c => c.snapshotUrl);
      if (!withUrl.length) { window.peakToast && window.peakToast('No live cameras to sweep', 'info', 'Add a camera with a snapshot URL first.'); return; }
      setFinding(true); setSightings(null); const found = [];
      for (const cam of withUrl) { const fr = await getFrame(cam); if (!fr) continue; const fm = await matchFrame(fr); if (fm && fm.matched) { const hit = fm.matched.find(m => String(m.id) === String(findId)); if (hit) found.push({ camera: cam.name, zone: cam.zone, conf: hit.conf, frame: fr, at: new Date() }); } }
      setFinding(false); setSightings(found);
      const stu = roster.find(s => String(s.id) === String(findId));
      if (found.length) window.peakToast && window.peakToast((stu && stu.name) + ' located', 'success', 'Seen on ' + found.length + ' camera' + (found.length === 1 ? '' : 's') + '.'); else window.peakToast && window.peakToast('Not seen right now', 'info', 'No camera currently sees ' + ((stu && stu.name) || 'them') + '.');
    };
    
    const runEnrollment = async () => {
       if (!roster || roster.length === 0) { window.peakToast && window.peakToast('No students loaded.', 'error'); return; }
       setEnrolling(true); setEnrolStats('');
       let success = 0, failed = 0, skipped = 0;
       for (let i = 0; i < roster.length; i++) {
         const s = roster[i];
         const photo = s.photoUrl || s.photo_url;
         setEnrolStats(`Processing ${i+1}/${roster.length}: ${s.name}`);
         if (photo && !photo.includes('ui-avatars')) {
           try {
             const img = await imgFromSrc(photo);
             const det = await window.faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
             if (det) {
               await fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'face_enroll', tenant: tenant(), record: { studentId: s.id, studentName: s.name, descriptor: Array.from(det.descriptor) } }) });
               success++;
             } else failed++;
           } catch(e) { failed++; }
         } else { skipped++; }
       }
       setEnrolStats(`Done. Enrolled: ${success}, No Face Found: ${failed}, No Photo: ${skipped}`);
       fetch(WK + '/os-data?kind=face_enroll&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => {
          const enr = ((d && d.records) || []).map(x => x.payload).filter(p => p && p.descriptor);
          setEnrolledCount(enr.length);
          if (enr.length && window.faceapi) { try { const labeled = enr.map(e => new window.faceapi.LabeledFaceDescriptors(String(e.studentId), [new Float32Array(e.descriptor)])); setMatcher(new window.faceapi.FaceMatcher(labeled, 0.5)); } catch (e) {} }
       });
       setEnrolling(false);
    };

    const loadCams = () => fetch(WK + '/os-data?kind=camera&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => setCams(((d && d.records) || []).map(x => Object.assign({ _id: x.id }, x.payload)))).catch(() => {});
    const loadInc = () => fetch(WK + '/os-data?kind=campus_incident&tenant=' + encodeURIComponent(tenant())).then(r => r.json()).then(d => setIncidents(((d && d.records) || []).map(x => Object.assign({ _id: x.id }, x.payload)).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))))).catch(() => {});
    useEffect(() => { loadCams(); loadInc(); }, []);

    const saveCam = () => {
      if (!form.name || !form.name.trim()) { window.peakToast && window.peakToast('Name the camera', 'info'); return; }
      const rec = { name: form.name.trim(), zone: (form.zone || '').trim(), snapshotUrl: (form.snapshotUrl || '').trim(), type: form.type || 'ip', addedBy: me() };
      const body = form._id ? { kind: 'camera', tenant: tenant(), record: rec, id: form._id } : { kind: 'camera', tenant: tenant(), record: rec };
      fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).then(() => { setForm(null); loadCams(); window.peakToast && window.peakToast('Camera saved', 'success', rec.name); });
    };
    const delCam = (c) => { fetch(WK + '/os-data/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'camera', tenant: tenant(), id: c._id }) }).then(() => loadCams()); };

    const runAnalyze = (cam, image) => {
      const key = cam._id || 'upload';
      setBusy(b => Object.assign({}, b, { [key]: true }));
      const payload = { tenant: tenant(), cameraName: cam.name, zone: cam.zone || '', returnFrame: true };
      if (image) payload.image = image; else payload.imageUrl = cam.snapshotUrl;
      fetch(WK + '/camera/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(r => r.json()).then(d => {
          setBusy(b => Object.assign({}, b, { [key]: false }));
          if (d && d.ok) {
            const base = d.analysis || {};
            setRes(rr => Object.assign({}, rr, { [key]: base }));
            loadInc();
            if (d.incidents) window.peakToast && window.peakToast('Nia flagged ' + d.incidents + ' concern' + (d.incidents === 1 ? '' : 's'), 'info', 'See Incidents.');
            const src = image || d.frame;
            if (src) setRes(rr => Object.assign({}, rr, { [key]: Object.assign({}, rr[key] || base, { frame: src }) }));
            if (src && matcher) matchFrame(src).then(fm => { if (fm) setRes(rr => Object.assign({}, rr, { [key]: Object.assign({}, rr[key] || base, { face: fm }) })); });
          } else window.peakToast && window.peakToast('Nia couldn’t read it', 'info', (d && d.error) || 'Try again');
        }).catch(() => setBusy(b => Object.assign({}, b, { [key]: false })));
    };
    const onUpload = (cam, file) => { const rd = new FileReader(); rd.onload = () => runAnalyze(cam, rd.result); rd.readAsDataURL(file); };

    const tagChild = (inc, sid) => {
      const stu = roster.find(s => String(s.id) === String(sid)); if (!stu) return;
      const rec = Object.assign({}, inc, { studentId: stu.id, studentName: stu.name, taggedBy: me(), status: 'identified' }); delete rec._id;
      fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'campus_incident', tenant: tenant(), record: rec, id: inc._id }) }).then(r => r.json()).then(() => {
        // also drop a note on the child's profile timeline
        fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'student_incident', tenant: tenant(), record: { studentId: stu.id, studentName: stu.name, type: inc.type, note: (FLAG[inc.type] || FLAG.other).label + ' — ' + (inc.detail || inc.summary || ''), camera: inc.camera, at: inc.at, by: me() } }) }).catch(() => {});
        loadInc(); window.peakToast && window.peakToast('Linked to ' + stu.name, 'success', 'Added to their profile.');
      });
    };
    const resolveInc = (inc) => { const rec = Object.assign({}, inc, { status: 'resolved', resolvedBy: me(), resolvedAt: new Date().toISOString() }); delete rec._id; fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'campus_incident', tenant: tenant(), record: rec, id: inc._id }) }).then(() => loadInc()); };

    const openIncidents = incidents.filter(i => i.status !== 'resolved');
    const totalHeads = Object.values(res).reduce((a, r) => a + (Number(r && r.childrenCount) || 0), 0);

    return (
      <div style={{ height: '100%', overflow: 'auto', background: T.bg, color: T.ink, fontFamily: T.font, fontSize: 13 }}>
        <header style={{ padding: '22px 28px 14px', borderBottom: '1px solid ' + T.border }}>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>SMART CAMPUS · HEAD TEACHER ONLY</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Campus cameras · Nia’s eyes</div>
          <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>Connect cameras and Nia watches for safety — fights, falls, escapes — counts who’s on campus, and flags it for you to confirm. She never names a child on her own; you confirm identity.</div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 8, fontFamily: T.mono }}>{faReady === null ? 'Loading face engine…' : faReady ? ('Face engine ready · ' + enrolledCount + ' learner' + (enrolledCount === 1 ? '' : 's') + ' enrolled' + (enrolledCount === 0 ? ' — enrol faces at the gate so Nia can name them' : '')) : 'Face engine unavailable on this device.'}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {[['live', 'Live'], ['cameras', 'Cameras'], ['incidents', 'Incidents' + (openIncidents.length ? ' (' + openIncidents.length + ')' : '')], ['webcam', 'Webcam Test']].map(t => (
              <button key={t[0]} onClick={() => setTab(t[0])} style={{ background: 'transparent', border: 'none', borderBottom: '2px solid ' + (tab === t[0] ? T.red : 'transparent'), color: tab === t[0] ? T.ink : T.ink3, padding: '8px 4px', marginRight: 12, fontSize: 13.5, fontWeight: tab === t[0] ? 700 : 500, cursor: 'pointer' }}>{t[1]}</button>
            ))}
          </div>
        </header>
        <div style={{ padding: 24 }}>
          {tab === 'webcam' && (
            <div style={{ display: 'grid', gap: 16 }}>
               <div style={{ ...card }}>
                 <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Webcam Live Recognition Test</div>
                 <div style={{ fontSize: 13, color: T.ink3, marginBottom: 16 }}>Use your device's camera to verify that the Smart Campus Face Engine is correctly identifying enrolled learners in real-time.</div>
                 <WebcamTestTab matcher={matcher} />
                 
                 <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid ' + T.border }}>
                   <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Enrol Learner Faces</div>
                   <div style={{ fontSize: 12, color: T.ink3, marginBottom: 12 }}>Sync the latest uploaded profile photos and compute their 128-dimensional facial signatures for the recognition engine.</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                     <button onClick={runEnrollment} disabled={enrolling} style={{ ...btn(true), opacity: enrolling ? 0.6 : 1 }}>{enrolling ? 'Enrolling...' : 'Run Enrollment Sync'}</button>
                     {enrolStats && <span style={{ fontSize: 12, color: T.ink2, fontFamily: T.mono }}>{enrolStats}</span>}
                   </div>
                 </div>
               </div>
            </div>
          )}
          {tab === 'live' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ ...card }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Find a learner on campus</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select value={findId} onChange={e => setFindId(e.target.value)} style={{ ...inp, width: 240, flex: '0 1 240px' }}><option value="">— choose learner —</option>{roster.map(s => <option key={s.id} value={s.id}>{s.name}{s.stream ? ' · ' + s.stream : ''}</option>)}</select>
                  <button onClick={findLearner} disabled={finding} style={btn(true)}>{finding ? 'Searching cameras…' : '🔍 Find them'}</button>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => setWatch(w => !w)} style={{ ...btn(false), borderColor: watch ? (T.green || '#00c389') : T.borderStr, color: watch ? (T.green || '#00c389') : T.ink2 }}>{watch ? '● Auto-watch ON' : '○ Auto-watch'}</button>
                </div>
                <div style={{ fontSize: 11, color: T.ink4, marginTop: 8 }}>Nia sweeps every connected camera, runs face recognition, and tells you where she sees them. Needs cameras with a snapshot URL + the learner enrolled.</div>
                {sightings ? (sightings.length ? (
                  <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                    {sightings.map((sg, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, background: T.bg, border: '1px solid ' + (T.green || '#00c389'), borderRadius: 10 }}>
                        <img src={sg.frame} alt="" style={{ width: 90, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                        <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>Seen at {sg.camera}{sg.zone ? ' · ' + sg.zone : ''}</div><div style={{ fontSize: 12, color: T.ink3 }}>{sg.conf}% match · {sg.at.toLocaleTimeString()}</div></div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ marginTop: 12, padding: 12, background: T.bg, borderRadius: 10, fontSize: 13, color: T.ink3 }}>No camera currently sees this learner. They may be indoors, off-camera, or not on campus.</div>) : null}
              </div>
              <div style={{ ...card, display: 'flex', gap: 22, alignItems: 'center' }}>
                <div><div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>CHILDREN SEEN (latest reads)</div><div style={{ fontSize: 26, fontWeight: 700, color: T.green || '#00c389', marginTop: 4 }}>{totalHeads || '—'}</div></div>
                <div style={{ width: 1, height: 36, background: T.border }} />
                <div><div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>OPEN SAFETY FLAGS</div><div style={{ fontSize: 26, fontWeight: 700, color: openIncidents.length ? '#ff5a72' : T.ink, marginTop: 4 }}>{openIncidents.length}</div></div>
              </div>
              {cams.length === 0 ? <div style={{ ...card, color: T.ink3, textAlign: 'center', padding: 36 }}>No cameras yet. Add one under <b>Cameras</b> — an IP camera’s snapshot URL, or just upload a frame to see Nia read it.</div> : cams.map(cam => (
                <div key={cam._id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <div><div style={{ fontSize: 14, fontWeight: 700 }}>{cam.name}</div><div style={{ fontSize: 11.5, color: T.ink3 }}>{cam.zone || 'unzoned'}{cam.snapshotUrl ? ' · snapshot connected' : ' · upload only'}</div></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {cam.snapshotUrl ? <button onClick={() => runAnalyze(cam)} disabled={busy[cam._id]} style={btn(true)}>{busy[cam._id] ? 'Reading…' : 'Analyze now'}</button> : null}
                      <label style={{ ...btn(false), cursor: 'pointer' }}>Upload frame<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) onUpload(cam, e.target.files[0]); }} /></label>
                    </div>
                  </div>
                  {res[cam._id] && res[cam._id].frame ? <img src={res[cam._id].frame} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 10, marginBottom: 10, border: '1px solid ' + T.border }} /> : null}
                  {res[cam._id] ? (
                    <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: 13 }}>
                      <div style={{ fontSize: 13, color: T.ink }}>{res[cam._id].summary}</div>
                      <div style={{ fontSize: 12, color: T.ink3, marginTop: 4, fontFamily: T.mono }}>{res[cam._id].childrenCount || 0} children · {res[cam._id].adultsCount || 0} adults · confidence {res[cam._id].confidence || '—'}</div>
                      {(res[cam._id].flags || []).map((fl, i) => { const F = FLAG[fl.type] || FLAG.other; return <div key={i} style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,90,114,0.08)', border: '1px solid ' + F.c, fontSize: 12.5, color: T.ink }}>{F.icon} <b style={{ color: F.c }}>{F.label}</b> — {fl.detail}</div>; })}
                      {(!res[cam._id].flags || res[cam._id].flags.length === 0) ? <div style={{ marginTop: 8, fontSize: 12, color: T.green || '#00c389' }}>✓ Nothing concerning in this frame.</div> : null}
                      {res[cam._id].face ? (res[cam._id].face.error ? <div style={{ marginTop: 10, fontSize: 12, color: T.ink4 }}>{res[cam._id].face.error}</div> : (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + T.border }}>
                          <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginBottom: 6 }}>NIA RECOGNISED {res[cam._id].face.matched.length} OF {res[cam._id].face.faces} FACE{res[cam._id].face.faces === 1 ? '' : 'S'}</div>
                          {res[cam._id].face.matched.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res[cam._id].face.matched.map((m, i) => <span key={i} style={{ fontSize: 12, padding: '4px 9px', borderRadius: 999, background: m.strong ? 'rgba(0,195,137,0.14)' : 'rgba(216,162,0,0.14)', border: '1px solid ' + (m.strong ? (T.green || '#00c389') : (T.gold || '#d8a200')), color: T.ink }}>{m.name} · {m.conf}%{m.strong ? '' : ' (likely)'}</span>)}</div> : <div style={{ fontSize: 12, color: T.ink4 }}>No enrolled learner matched these faces.</div>}
                          {res[cam._id].face.unknown ? <div style={{ fontSize: 11, color: T.ink4, marginTop: 6 }}>{res[cam._id].face.unknown} face{res[cam._id].face.unknown === 1 ? '' : 's'} not recognised (not enrolled).</div> : null}
                          {res[cam._id].face.matched.length ? <button onClick={() => markPresent(res[cam._id].face.matched)} style={{ ...btn(false), marginTop: 10, fontSize: 11.5, padding: '6px 11px' }}>✓ Mark {res[cam._id].face.matched.length} present</button> : null}
                        </div>
                      )) : (matcher ? <div style={{ marginTop: 8, fontSize: 11, color: T.ink4 }}>Reading faces…</div> : null)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {tab === 'cameras' && (
            <div style={{ display: 'grid', gap: 14 }}>
              <button onClick={() => setForm({ type: 'ip' })} style={{ ...btn(true), justifySelf: 'start' }}>+ Add camera</button>
              {cams.map(cam => (
                <div key={cam._id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{cam.name}</div><div style={{ fontSize: 11.5, color: T.ink3, wordBreak: 'break-all' }}>{cam.zone || 'unzoned'} · {cam.snapshotUrl || 'no snapshot URL'}</div></div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setForm(Object.assign({}, cam))} style={btn(false)}>Edit</button>
                    <button onClick={() => delCam(cam)} style={{ ...btn(false), color: '#ff5a72' }}>Delete</button>
                  </div>
                </div>
              ))}
              {cams.length === 0 ? <div style={{ color: T.ink3, fontSize: 13 }}>No cameras yet.</div> : null}
              <div style={{ ...card, fontSize: 12, color: T.ink3, lineHeight: 1.6 }}><b style={{ color: T.ink2 }}>Privacy:</b> camera images of children are sensitive personal data under Uganda’s Data Protection &amp; Privacy Act. Keep parental consent on file, restrict this screen to the head, and store footage securely. Nia flags for a human to confirm — she never accuses a child automatically.</div>
            </div>
          )}
          {tab === 'incidents' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {incidents.length === 0 ? <div style={{ ...card, color: T.ink3, textAlign: 'center', padding: 30 }}>No incidents logged. When Nia flags a fight, fall or escape, it appears here for you to confirm.</div> : incidents.map(inc => { const F = FLAG[inc.type] || FLAG.other; return (
                <div key={inc._id} style={{ ...card, borderColor: inc.status === 'resolved' ? T.border : F.c }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div><div style={{ fontSize: 13.5, fontWeight: 700, color: F.c }}>{F.icon} {F.label}{inc.status === 'resolved' ? ' · resolved' : ''}</div><div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2, fontFamily: T.mono }}>{inc.camera}{inc.zone ? ' · ' + inc.zone : ''} · {inc.at ? new Date(inc.at).toLocaleString() : ''}</div></div>
                  </div>
                  <div style={{ fontSize: 13, color: T.ink, marginTop: 8 }}>{inc.detail || inc.summary}</div>
                  {(inc.people || []).length ? <div style={{ fontSize: 12, color: T.ink3, marginTop: 6 }}>Nia saw: {(inc.people || []).map(p => p.description).join(' · ')}</div> : null}
                  {inc.studentName ? <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 8 }}>Confirmed: <b>{inc.studentName}</b></div> : (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: T.ink3 }}>Who is this?</span>
                      <select onChange={e => { if (e.target.value) tagChild(inc, e.target.value); }} style={{ ...inp, width: 220 }} defaultValue=""><option value="">— choose learner —</option>{roster.map(s => <option key={s.id} value={s.id}>{s.name}{s.stream ? ' · ' + s.stream : ''}</option>)}</select>
                    </div>
                  )}
                  {inc.status !== 'resolved' ? <button onClick={() => resolveInc(inc)} style={{ ...btn(false), marginTop: 10 }}>Mark resolved</button> : null}
                </div>
              ); })}
            </div>
          )}
        </div>
        {form && (
          <div onClick={() => setForm(null)} style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(5,8,22,0.7)', display: 'grid', placeItems: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: '1px solid ' + T.borderStr, borderRadius: 16, width: '100%', maxWidth: 460 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid ' + T.border, fontSize: 15, fontWeight: 700 }}>{form._id ? 'Edit camera' : 'Add camera'}</div>
              <div style={{ padding: 22, display: 'grid', gap: 12 }}>
                <label><div style={{ fontSize: 11, color: T.ink2, marginBottom: 5, fontFamily: T.mono }}>NAME</div><input style={inp} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main gate" /></label>
                <label><div style={{ fontSize: 11, color: T.ink2, marginBottom: 5, fontFamily: T.mono }}>ZONE / LOCATION</div><input style={inp} value={form.zone || ''} onChange={e => setForm({ ...form, zone: e.target.value })} placeholder="e.g. Front entrance" /></label>
                <label><div style={{ fontSize: 11, color: T.ink2, marginBottom: 5, fontFamily: T.mono }}>SNAPSHOT URL (optional)</div><input style={inp} value={form.snapshotUrl || ''} onChange={e => setForm({ ...form, snapshotUrl: e.target.value })} placeholder="http://camera-ip/snapshot.jpg" /><div style={{ fontSize: 11, color: T.ink4, marginTop: 4 }}>An ONVIF/IP camera’s JPEG snapshot URL. Leave blank to use uploads only.</div></label>
              </div>
              <div style={{ padding: '0 22px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button style={btn(false)} onClick={() => setForm(null)}>Cancel</button>
                <button style={btn(true)} onClick={saveCam}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

export { SmartCampus };
