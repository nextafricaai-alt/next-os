/**
 * Parent Portal — School OS
 *
 * Parents sign in with the phone number the school has on file as a pupil's
 * guardian phone (audit C8):
 *   1. parent types their number → the Worker texts a 6-digit code
 *      (POST /parent/otp/send) — only if that number is on a pupil's record
 *   2. parent types the code → the Worker returns a signed 30-day pass and
 *      the list of THEIR children (POST /parent/otp/verify)
 *   3. every call after that sends the pass in the X-Parent-Token header;
 *      the Worker only returns data for pupils linked to that phone.
 * Nobody can look a child up by name any more, and guardian phone numbers
 * are never sent to the browser.
 */
(function() {
  const { useState, useEffect, useMemo } = React;

  const T = {
    colors: {
      background: '#0B0F19',
      surface: '#151D2A',
      surfaceHover: '#1E293B',
      border: 'rgba(255, 255, 255, 0.1)',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      primary: '#00FC8F',
      primaryDark: '#00D679',
      accent: '#3B82F6',
      warning: '#F59E0B',
      danger: '#EF4444',
      success: '#10B981',
    },
    radii: { sm: '6px', md: '10px', lg: '16px', xl: '24px', full: '9999px' },
    fonts: { sans: "'Inter', system-ui, -apple-system, sans-serif" }
  };

  const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';

  function getTenant() {
    return (typeof window.getOSActiveTenant === 'function') ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre';
  }

  // ─── Parent pass (kept on this phone for 30 days) ─────────────────────
  function sessionKey() { return 'nextos.parent.' + getTenant(); }
  function loadSession() {
    try {
      const s = JSON.parse(localStorage.getItem(sessionKey()) || 'null');
      if (s && s.token && Array.isArray(s.children) && s.tenant === getTenant() && (!s.until || s.until > Date.now())) return s;
    } catch (e) {}
    return null;
  }
  function saveSession(s) { try { localStorage.setItem(sessionKey(), JSON.stringify(s)); } catch (e) {} }
  function clearSession() { try { localStorage.removeItem(sessionKey()); } catch (e) {} }
  function signOutParent() { clearSession(); window.dispatchEvent(new Event('nx-parent-signout')); }
  // fetch() to the Worker with the parent pass attached. A rejected pass
  // (expired, or the number was removed from the pupil) signs the parent out.
  async function pfetch(path, init) {
    init = Object.assign({}, init || {});
    const h = Object.assign({}, init.headers || {});
    const s = loadSession();
    if (s) h['X-Parent-Token'] = s.token;
    init.headers = h;
    const res = await fetch(WK + path, init);
    if (res.status === 401) {
      const d = await res.clone().json().catch(() => ({}));
      if (d && (d.parentSignIn || /sign in/i.test(d.error || ''))) signOutParent();
    }
    return res;
  }

  // ─── Push notifications: absence / note alerts ──────────────────────────
  // Same VAPID key + worker used by the staff push client in index.html
  // (window.NX_PUSH), reimplemented minimally here rather than shared —
  // parent-dashboard.html doesn't load that inline block. A parent
  // subscription is targeted by student_id (no email/login exists for
  // parents), matched server-side in deliverPushByStudent.
  const NX_VAPID = 'BN6fZK3_ipRqATydKqGPB22d-Iaf9knXLDZrLGqAuPeSfac0C8elNLovSBtKlEugC-t7XeMoYg8FsEUwTwb6Y-c';
  function vapidKey() {
    const raw = atob(NX_VAPID.replace(/-/g, '+').replace(/_/g, '/'));
    const a = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i);
    return a;
  }
  function pushSupported() {
    return (typeof navigator !== 'undefined') && ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
  }
  async function enablePushForChildren(studentIds) {
    if (!pushSupported()) throw new Error('This browser can’t receive phone alerts.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notifications were not allowed.');
    const reg = await navigator.serviceWorker.register('/sw.js').catch(() => navigator.serviceWorker.ready);
    const readyReg = await navigator.serviceWorker.ready;
    let sub = await readyReg.pushManager.getSubscription();
    if (!sub) sub = await readyReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() });
    const j = sub.toJSON();
    const res = await pfetch('/push/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant: getTenant(), role: 'parent', student_ids: studentIds, subscription: { endpoint: j.endpoint, keys: j.keys } }),
    });
    const d = await res.json();
    if (!d.ok) throw new Error(d.error || 'Could not register this device.');
    return true;
  }

  // Loads everything the dashboard needs for one child: fee ledger,
  // this week's roll call, and teacher notes.
  //
  // Goes through the Worker's /parent/child-data, which checks the parent
  // pass and that this pupil is linked to the parent's phone.
  async function loadChildData(studentId, tenantId) {
    try {
      const res = await pfetch('/parent/child-data?tenant=' + encodeURIComponent(tenantId) + '&student_id=' + encodeURIComponent(studentId));
      const out = await res.json();
      if (out.error) return { fees: [], rollCalls: [], notes: [], profile: null };
      return { fees: out.fees || [], rollCalls: out.rollCalls || [], notes: out.notes || [], profile: out.profile || null };
    } catch (e) {
      return { fees: [], rollCalls: [], notes: [], profile: null };
    }
  }

  function summarizeFees(feeRows) {
    let charged = 0, paid = 0;
    feeRows.forEach(f => {
      const amt = Number(f.amount || 0);
      if (f.kind === 'charge') charged += amt;
      else if (f.kind === 'payment') paid += Math.abs(amt);
    });
    return { totalTuition: charged, paidTuition: paid, balance: Math.max(0, charged - paid) };
  }

  // ─── Phone sign-in (audit C8) ──────────────────────────────────────────
  function PhoneSignIn({ onSignedIn }) {
    const [step, setStep] = useState('phone'); // 'phone' | 'code'
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const schoolName = (window.SCHOOL_BRAND && window.SCHOOL_BRAND.name) || 'your school';

    const post = async (path, body) => {
      const res = await fetch(WK + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      return { ok: res.ok && !d.error, d };
    };
    const sendCode = async () => {
      const digits = phone.replace(/[^0-9]/g, '');
      if (digits.length < 9) { setError('Enter the phone number the school has for you, e.g. 0772 123 456.'); return; }
      setBusy(true); setError(''); setInfo('');
      try {
        const r = await post('/parent/otp/send', { tenant: getTenant(), phone });
        if (!r.ok) setError(r.d.error || 'Could not send the code. Try again.');
        else { setInfo(r.d.message || 'Code sent.'); setStep('code'); setCode(''); }
      } catch (e) { setError('Could not reach the school. Check your internet connection.'); }
      setBusy(false);
    };
    const verify = async () => {
      if (code.replace(/[^0-9]/g, '').length !== 6) { setError('Enter the 6-digit code from the SMS.'); return; }
      setBusy(true); setError('');
      try {
        const r = await post('/parent/otp/verify', { tenant: getTenant(), phone, code });
        if (!r.ok || !r.d.token) setError(r.d.error || 'That code did not work.');
        else {
          const s = { token: r.d.token, tenant: getTenant(), children: r.d.children || [], until: Date.now() + (r.d.expiresInDays || 30) * 86400000 };
          saveSession(s);
          onSignedIn(s.children);
        }
      } catch (e) { setError('Could not reach the school. Check your internet connection.'); }
      setBusy(false);
    };

    const inputStyle = { width: '100%', marginTop: 8, background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: 12, borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box' };
    const btn = (on) => ({ width: '100%', marginTop: 12, padding: 12, background: on ? T.colors.primary : T.colors.surfaceHover, color: on ? '#0A1029' : T.colors.textMuted, border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: on ? 'pointer' : 'default' });

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: T.colors.background, color: T.colors.text, fontFamily: T.fonts.sans, padding: 16,
      }}>
        <div style={{ width: '100%', maxWidth: 420, background: T.colors.surface, border: `1px solid ${T.colors.border}`, borderRadius: T.radii.xl, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #00FC8F 0%, #3B82F6 100%)', color: '#0A1029', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>👪</div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Parent sign-in</h1>
              <p style={{ fontSize: 12, color: T.colors.textMuted, margin: 0 }}>{schoolName}</p>
            </div>
          </div>
          {step === 'phone' ? (
            <div>
              <label htmlFor="nx-parent-phone" style={{ fontSize: 12.5, color: T.colors.textMuted }}>Your phone number (the one the school has for you)</label>
              <input id="nx-parent-phone" type="tel" inputMode="tel" autoComplete="tel" autoFocus value={phone}
                onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendCode()}
                placeholder="07XX XXX XXX" style={inputStyle} />
              <button onClick={sendCode} disabled={busy} style={btn(!busy)}>{busy ? 'Sending…' : 'Send me a code'}</button>
              <p style={{ fontSize: 11.5, color: T.colors.textMuted, marginTop: 12, lineHeight: 1.5 }}>We will text you a 6-digit code. If no code arrives, your number may not be on your child's record yet — please ask the school office to add it.</p>
            </div>
          ) : (
            <div>
              {info && <div style={{ fontSize: 12.5, color: T.colors.success, marginBottom: 10 }}>{info}</div>}
              <label htmlFor="nx-parent-code" style={{ fontSize: 12.5, color: T.colors.textMuted }}>6-digit code sent to {phone}</label>
              <input id="nx-parent-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code}
                onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && verify()}
                placeholder="123456" style={{ ...inputStyle, letterSpacing: 6, fontSize: 20, textAlign: 'center' }} />
              <button onClick={verify} disabled={busy} style={btn(!busy)}>{busy ? 'Checking…' : 'Sign in'}</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <button onClick={() => { setStep('phone'); setError(''); setInfo(''); }} style={{ background: 'none', border: 'none', color: '#60A5FA', fontSize: 12.5, cursor: 'pointer', padding: 0 }}>Change number</button>
                <button onClick={sendCode} disabled={busy} style={{ background: 'none', border: 'none', color: '#60A5FA', fontSize: 12.5, cursor: 'pointer', padding: 0 }}>Send a new code</button>
              </div>
            </div>
          )}
          {error && <div role="alert" style={{ marginTop: 12, fontSize: 12.5, color: T.colors.danger }}>{error}</div>}
        </div>
      </div>
    );
  }

  // ─── Communications Hub: threaded messages with the child's class teacher ──
  function MessagesPanel({ studentId, childName, childClass }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [parentName, setParentName] = useState('');

    const load = () => {
      pfetch('/messages/list?tenant=' + encodeURIComponent(getTenant()) + '&student_id=' + encodeURIComponent(studentId))
        .then(r => r.json()).then(out => { setMessages(out.messages || []); setLoading(false); })
        .catch(() => setLoading(false));
    };

    useEffect(() => { setLoading(true); load(); }, [studentId]);

    // Parents have no database sign-in (the database is closed to the public
    // since audit C5), so the thread refreshes through the Worker every 15 s.
    useEffect(() => {
      const poll = setInterval(load, 15000);
      return () => clearInterval(poll);
    }, [studentId]);

    const send = async () => {
      const body = draft.trim();
      const name = parentName.trim();
      if (!body) return;
      if (!name) { window.peakToast && window.peakToast('Enter your name first so the teacher knows who\'s writing.', 'error'); return; }
      setSending(true);
      try {
        const res = await pfetch('/messages/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: getTenant(), studentId, senderRole: 'parent', senderName: name, body }),
        });
        const out = await res.json();
        if (out.error) { window.peakToast && window.peakToast('Could not send: ' + out.error, 'error'); }
        else { setDraft(''); load(); }
      } catch (e) {
        window.peakToast && window.peakToast('Could not reach the school right now.', 'error');
      }
      setSending(false);
    };

    return (
      <div style={{ backgroundColor: T.colors.surface, borderRadius: T.radii.lg, padding: '24px', border: `1px solid ${T.colors.border}` }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#00FC8F' }}>💬 Message {childName}'s teacher</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: T.colors.textMuted }}>Goes straight to {childClass}'s class teacher — they'll get an alert if they've turned on notifications.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', marginBottom: 14, paddingRight: 4 }}>
          {loading ? (
            <div style={{ fontSize: 13, color: T.colors.textMuted }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ fontSize: 13, color: T.colors.textMuted }}>No messages yet. Say hello below.</div>
          ) : messages.map(m => (
            <div key={m.id} style={{
              alignSelf: m.sender_role === 'parent' ? 'flex-end' : 'flex-start',
              maxWidth: '80%', background: m.sender_role === 'parent' ? 'rgba(0,252,143,0.12)' : 'rgba(59,130,246,0.12)',
              border: '1px solid ' + (m.sender_role === 'parent' ? 'rgba(0,252,143,0.3)' : 'rgba(59,130,246,0.3)'),
              borderRadius: 10, padding: '9px 12px',
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: m.sender_role === 'parent' ? '#00FC8F' : '#60A5FA', marginBottom: 3 }}>
                {m.sender_name} {m.sender_role !== 'parent' ? '· ' + m.sender_role : ''}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{m.body}</div>
              <div style={{ fontSize: 10, color: T.colors.textMuted, marginTop: 3 }}>{new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>

        <input
          value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Your name"
          style={{ width: '100%', marginBottom: 8, background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: 10, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a message…" rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={{ flex: 1, background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: 10, borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: T.fonts.sans }}
          />
          <button onClick={send} disabled={sending || !draft.trim()} style={{
            padding: '0 18px', background: sending ? T.colors.surfaceHover : T.colors.primary,
            color: sending ? T.colors.textMuted : '#0A1029', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13,
            cursor: sending ? 'default' : 'pointer',
          }}>{sending ? '…' : 'Send'}</button>
        </div>
      </div>
    );
  }

  const ParentView = () => {
    const [children, setChildren] = useState(() => { const s = loadSession(); return s ? s.children : null; }); // null = not signed in
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('overview');
    const [childData, setChildData] = useState({ fees: [], rollCalls: [], notes: [], profile: null, loading: true });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentPhone, setPaymentPhone] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentEmail, setPaymentEmail] = useState('');
    const [paymentBusy, setPaymentBusy] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [alertsOn, setAlertsOn] = useState(false);
    const [alertsBusy, setAlertsBusy] = useState(false);

    useEffect(() => {
      if (!pushSupported()) return;
      navigator.serviceWorker.getRegistration().then(reg => reg && reg.pushManager.getSubscription()).then(sub => setAlertsOn(!!sub)).catch(() => {});
    }, [children && children.length]);

    // Signed out (button, or the Worker rejected the pass) → back to sign-in.
    useEffect(() => {
      const off = () => { setChildren(null); setSelectedChildIndex(0); };
      window.addEventListener('nx-parent-signout', off);
      return () => window.removeEventListener('nx-parent-signout', off);
    }, []);
    // On open, refresh the list of children from the school (a pupil added to
    // or removed from this phone number shows up without signing in again).
    useEffect(() => {
      if (!loadSession()) return;
      pfetch('/parent/children').then(r => r.json()).then(d => {
        if (d && Array.isArray(d.children) && d.children.length) {
          const s = loadSession(); if (s) saveSession({ ...s, children: d.children });
          setChildren(d.children); setSelectedChildIndex(0);
        }
      }).catch(() => {});
    }, []);

    const handleEnableAlerts = async () => {
      if (alertsBusy || !children) return;
      setAlertsBusy(true);
      try {
        await enablePushForChildren(children.map(c => c.id));
        setAlertsOn(true);
        window.peakToast && window.peakToast('Alerts on — you\'ll be notified of absences and new notes.', 'success');
      } catch (e) {
        window.peakToast && window.peakToast(String((e && e.message) || e), 'error');
      }
      setAlertsBusy(false);
    };

    const rawChild = children && children[selectedChildIndex];
    const fees = useMemo(() => summarizeFees(childData.fees || []), [childData.fees]);
    const child = rawChild ? {
      id: rawChild.id,
      name: rawChild.name,
      class: rawChild.stream || '—',
      admissionNo: 'ID-' + rawChild.id,
      teacher: '—',
      totalTuition: fees.totalTuition,
      paidTuition: fees.paidTuition,
      balance: fees.balance,
    } : null;

    useEffect(() => {
      if (!rawChild) return;
      let alive = true;
      setChildData(prev => ({ ...prev, loading: true }));
      loadChildData(rawChild.id, getTenant()).then(d => { if (alive) setChildData({ ...d, loading: false }); });
      return () => { alive = false; };
    }, [rawChild && rawChild.id]);

    // Refresh this child's data every 20 s through the Worker (parents have
    // no direct database access since audit C5).
    useEffect(() => {
      if (!rawChild) return;
      const poll = setInterval(() => { loadChildData(rawChild.id, getTenant()).then(d => setChildData({ ...d, loading: false })); }, 20000);
      return () => clearInterval(poll);
    }, [rawChild && rawChild.id]);

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayRoll = (childData.rollCalls || []).find(r => r.roll_date === todayIso);
    const weekDays = (childData.rollCalls || []).slice(0, 5);
    const weekPresent = weekDays.filter(r => r.status === 'present' || r.status === 'late').length;
    const weekRate = weekDays.length ? Math.round((weekPresent / weekDays.length) * 100) : null;

    const handleProcessPayment = async () => {
      if (!child) return;
      const amt = Math.round(Number(paymentAmount) || child.balance);
      if (!(amt > 0)) { setPaymentError('Enter an amount greater than 0.'); return; }
      setPaymentBusy(true); setPaymentError('');
      try {
        const res = await fetch(WK + '/fees/checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: getTenant(), studentId: child.id, amount: amt, email: paymentEmail, phone: paymentPhone }),
        }).then(r => r.json());
        if (res && res.link) {
          window.location.href = res.link; // hands off to Flutterwave's real checkout
        } else {
          setPaymentError((res && res.error) || 'Could not start payment. Try again shortly.');
        }
      } catch (e) {
        setPaymentError('Could not reach the payment service: ' + String((e && e.message) || e));
      }
      setPaymentBusy(false);
    };

    if (!children) {
      return <PhoneSignIn onSignedIn={(kids) => { setSelectedChildIndex(0); setChildren(kids); }} />;
    }

    return (
      <div style={{
        backgroundColor: T.colors.background,
        color: T.colors.text,
        fontFamily: T.fonts.sans,
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top Header Bar */}
        <header style={{
          backgroundColor: T.colors.surface,
          borderBottom: `1px solid ${T.colors.border}`,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #00FC8F 0%, #3B82F6 100%)',
              color: '#0A1029', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', fontSize: '18px'
            }}>
              KL
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>PARENT PORTAL</h1>
              <p style={{ fontSize: '12px', color: T.colors.textMuted, margin: 0 }}>
                Viewing: <b>{child.name}</b>
                <button onClick={signOutParent} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#60A5FA', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}>Sign out</button>
              </p>
            </div>
          </div>

          {children.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: T.colors.textMuted }}>Select Child:</span>
              {children.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildIndex(idx)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: T.radii.full,
                    border: selectedChildIndex === idx ? '1.5px solid #00FC8F' : `1px solid ${T.colors.border}`,
                    backgroundColor: selectedChildIndex === idx ? 'rgba(0, 252, 143, 0.15)' : T.colors.surface,
                    color: selectedChildIndex === idx ? '#00FC8F' : T.colors.text,
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  👶 {c.name} ({c.stream || '—'})
                </button>
              ))}
            </div>
          )}

          {pushSupported() && (
            <button onClick={handleEnableAlerts} disabled={alertsBusy || alertsOn} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: T.radii.full,
              border: alertsOn ? '1px solid rgba(0,252,143,0.4)' : `1px solid ${T.colors.border}`,
              backgroundColor: alertsOn ? 'rgba(0,252,143,0.12)' : T.colors.surfaceHover,
              color: alertsOn ? T.colors.primary : T.colors.text, fontSize: 12, fontWeight: 700,
              cursor: alertsOn ? 'default' : (alertsBusy ? 'wait' : 'pointer'),
            }}>
              {alertsOn ? '🔔 Alerts on' : (alertsBusy ? 'Turning on…' : '🔕 Get absence & note alerts')}
            </button>
          )}
        </header>

        {/* Tab Navigation */}
        <div style={{
          backgroundColor: T.colors.surface,
          borderBottom: `1px solid ${T.colors.border}`,
          padding: '0 24px',
          display: 'flex',
          gap: '16px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'overview', label: '📌 Overview & Attendance' },
            { id: 'fees', label: '💳 Tuition Clearance & Payments' },
            { id: 'academics', label: '📝 Teacher Notes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 8px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #00FC8F' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#00FC8F' : T.colors.textMuted,
                fontWeight: activeTab === tab.id ? '800' : '600',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>

          {/* TAB 1: OVERVIEW & ATTENDANCE */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Child Profile Card */}
              <div style={{
                backgroundColor: T.colors.surface,
                borderRadius: T.radii.lg,
                padding: '24px',
                border: `1px solid ${T.colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {childData.profile && childData.profile.photo_url ? (
                    <img src={childData.profile.photo_url} alt={child.name} style={{
                      width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                      border: '2px solid #3B82F6',
                    }} />
                  ) : (
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      backgroundColor: '#3B82F6', color: '#FFF', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', flexShrink: 0,
                    }}>
                      {child.name.split(' ').map(n=>n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{child.name}</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#60A5FA', fontWeight: '700' }}>
                      Class: {child.class} · {child.admissionNo}
                    </p>
                  </div>
                </div>

                {childData.profile && childData.profile.meta && (() => {
                  const m = childData.profile.meta;
                  const bits = [
                    m.bloodGroup && m.bloodGroup !== 'Unknown' ? 'Blood group: ' + m.bloodGroup : null,
                    m.allergies ? 'Allergies: ' + m.allergies : null,
                    m.conditions && m.conditions.toLowerCase() !== 'none' ? m.conditions : null,
                  ].filter(Boolean);
                  return bits.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {bits.map((b, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: '#F87171', fontWeight: 600 }}>⚕ {b}</span>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* Direct Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={() => setActiveTab('academics')}
                    style={{
                      flex: 1, padding: '10px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#60A5FA',
                      border: '1px solid #3B82F6', borderRadius: T.radii.md, fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    💬 Message the school
                  </button>
                  <button
                    onClick={() => setActiveTab('fees')}
                    style={{
                      flex: 1, padding: '10px', backgroundColor: 'rgba(0, 252, 143, 0.15)', color: '#00FC8F',
                      border: '1px solid #00FC8F', borderRadius: T.radii.md, fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    💳 Pay Tuition
                  </button>
                </div>
              </div>

              {/* Attendance Tracker Card */}
              <div style={{
                backgroundColor: T.colors.surface,
                borderRadius: T.radii.lg,
                padding: '24px',
                border: `1px solid ${T.colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#00FC8F' }}>🟢 Attendance</h3>

                {childData.loading ? (
                  <div style={{ fontSize: 13, color: T.colors.textMuted }}>Loading…</div>
                ) : (
                <div style={{
                  background: todayRoll && todayRoll.status !== 'present' ? 'rgba(239,68,68,0.12)' : 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid ' + (todayRoll && todayRoll.status !== 'present' ? '#EF4444' : '#10B981'),
                  padding: '16px',
                  borderRadius: T.radii.md,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#A7F3D0', fontWeight: '600' }}>TODAY'S STATUS</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#FFF', marginTop: '2px' }}>
                      {!todayRoll ? 'NOT MARKED YET' : todayRoll.status === 'present' ? 'PRESENT AT SCHOOL 🟢' : todayRoll.status === 'late' ? 'ARRIVED LATE 🟡' : todayRoll.status.toUpperCase() + ' 🔴'}
                    </div>
                    {todayRoll && (
                      <div style={{ fontSize: '12px', color: '#D1D5DB', marginTop: '2px' }}>
                        Marked at <b>{new Date(todayRoll.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#00FC8F' }}>{weekRate == null ? '—' : weekRate + '%'}</div>
                    <div style={{ fontSize: '11px', color: T.colors.textMuted }}>Last 5 school days</div>
                  </div>
                </div>
                )}

                <div>
                  <div style={{ fontSize: '12px', color: T.colors.textMuted, marginBottom: '8px' }}>Recent days:</div>
                  {weekDays.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: T.colors.textMuted }}>No roll call recorded yet this week.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weekDays.length}, 1fr)`, gap: '8px' }}>
                      {weekDays.map((r, i) => {
                        const icon = r.status === 'present' ? '🟢' : r.status === 'late' ? '🟡' : r.status === 'excused' ? '⚪' : '🔴';
                        const color = r.status === 'present' || r.status === 'late' ? '#10B981' : '#EF4444';
                        return (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: T.colors.textMuted }}>{new Date(r.roll_date).toLocaleDateString([], { weekday: 'short' })}</div>
                            <div style={{ fontSize: '14px', marginTop: '4px' }}>{icon}</div>
                            <div style={{ fontSize: '10px', color, fontWeight: '700', marginTop: '2px', textTransform: 'capitalize' }}>{r.status}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TUITION CLEARANCE & PAYMENTS */}
          {activeTab === 'fees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Fee Summary Banner */}
              <div style={{
                backgroundColor: T.colors.surface,
                borderRadius: T.radii.lg,
                padding: '24px',
                border: `1px solid ${T.colors.border}`,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: T.radii.md }}>
                  <div style={{ fontSize: '12px', color: T.colors.textMuted }}>Total Charged:</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px' }}>{child.totalTuition.toLocaleString()} UGX</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: T.radii.md, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ fontSize: '12px', color: '#A7F3D0' }}>Amount Paid:</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#10B981', marginTop: '4px' }}>{child.paidTuition.toLocaleString()} UGX</div>
                </div>
                <div style={{ background: child.balance > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: T.radii.md, border: `1px solid ${child.balance > 0 ? '#EF4444' : '#10B981'}` }}>
                  <div style={{ fontSize: '12px', color: child.balance > 0 ? '#FCA5A5' : '#A7F3D0' }}>Outstanding Balance:</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: child.balance > 0 ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                    {child.balance.toLocaleString()} UGX
                  </div>
                </div>
              </div>

              {/* Fee Clearance Actions */}
              <div style={{
                backgroundColor: T.colors.surface,
                borderRadius: T.radii.lg,
                padding: '24px',
                border: `1px solid ${T.colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#00FC8F' }}>💳 Online Tuition Clearance</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: T.colors.textMuted }}>
                    Pay via card or mobile money — this hands off to the school's real Flutterwave checkout.
                  </p>
                </div>
                {child.balance > 0 ? (
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    style={{
                      padding: '12px 24px', backgroundColor: '#00FC8F', color: '#0A1029',
                      border: 'none', borderRadius: T.radii.md, fontSize: '14px', fontWeight: '900', cursor: 'pointer'
                    }}
                  >
                    💳 Pay Balance Now
                  </button>
                ) : (
                  <div style={{ padding: '10px 16px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', borderRadius: '8px', fontWeight: '800' }}>
                    ✅ Tuition Fully Cleared!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TEACHER NOTES */}
          {activeTab === 'academics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                backgroundColor: T.colors.surface,
                borderRadius: T.radii.lg,
                padding: '24px',
                border: `1px solid ${T.colors.border}`
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#60A5FA' }}>📝 Teacher Logged Notes</h3>
                {childData.loading ? (
                  <div style={{ fontSize: 13, color: T.colors.textMuted }}>Loading…</div>
                ) : (childData.notes || []).length === 0 ? (
                  <div style={{ fontSize: 13, color: T.colors.textMuted }}>No notes logged for {child.name} yet. Behavioral, academic, or roll-call notes teachers log will show up here.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {childData.notes.map((note, i) => (
                      <div key={i} style={{
                        background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: T.radii.md,
                        borderLeft: '4px solid #3B82F6'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: T.colors.textMuted }}>
                          <span style={{ fontWeight: '700', color: '#60A5FA', textTransform: 'capitalize' }}>{(note.note_type || 'general').replace(/_/g, ' ')}</span>
                          <span>{new Date(note.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ margin: '8px 0 0 0', fontSize: '14px', lineHeight: '1.5' }}>{note.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <MessagesPanel studentId={child.id} childName={child.name} childClass={child.class} />
            </div>
          )}
        </main>

        {/* Tuition Payment Modal */}
        {isPaymentModalOpen && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div style={{
              backgroundColor: T.colors.surface, padding: '24px', borderRadius: T.radii.xl,
              width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid #00FC8F'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#00FC8F' }}>💳 Pay Tuition — {child.name}</h3>
              <p style={{ margin: 0, fontSize: '12px', color: T.colors.textMuted }}>
                Outstanding balance: <b>{child.balance.toLocaleString()} UGX</b>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '12px', color: T.colors.textMuted }}>Phone number (for the payment prompt):</label>
                <input
                  type="text" value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  style={{ background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
                <label style={{ fontSize: '12px', color: T.colors.textMuted }}>Email (for the receipt):</label>
                <input
                  type="email" value={paymentEmail} onChange={e => setPaymentEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
                <label style={{ fontSize: '12px', color: T.colors.textMuted }}>Amount to Pay (UGX):</label>
                <input
                  type="number" placeholder={child.balance.toString()} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                  style={{ background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '12px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', outline: 'none' }}
                />
              </div>

              {paymentError && <div style={{ fontSize: 12.5, color: T.colors.danger }}>{paymentError}</div>}

              <button
                onClick={handleProcessPayment}
                disabled={paymentBusy}
                style={{
                  padding: '14px', backgroundColor: paymentBusy ? T.colors.surfaceHover : '#00FC8F', color: paymentBusy ? T.colors.textMuted : '#0A1029', border: 'none',
                  borderRadius: T.radii.md, fontSize: '15px', fontWeight: '900', cursor: paymentBusy ? 'default' : 'pointer'
                }}
              >
                {paymentBusy ? 'Starting checkout…' : 'Continue to Payment 📲'}
              </button>
              <button onClick={() => { setIsPaymentModalOpen(false); setPaymentError(''); }} style={{ padding: '10px', background: 'transparent', color: T.colors.textMuted, border: `1px solid ${T.colors.border}`, borderRadius: T.radii.md, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  window.ParentView = ParentView;
})();
