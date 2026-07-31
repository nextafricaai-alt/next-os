/**
 * Parent Portal Component — School OS
 * Kabs Lily Kindercare Center & Junior School
 *
 * Real Supabase data (students/fees/student_roll_call/student_notes),
 * scoped to whichever child(ren) the parent identifies. There's no parent
 * login/auth system yet (no `parents` table, no guardian-to-auth-user
 * linkage — see login.html, which only offers Head Teacher/Teacher/Bursar/
 * Driver roles), so this gates on a lightweight lookup instead: search by
 * child name or guardian phone against this tenant's real `students` table.
 * guardian_phone is currently empty for most students (not collected during
 * import), so name search is the practical path today — phone lookup will
 * start working automatically once that field gets populated.
 *
 * This is app-level isolation (the query only ever returns rows matching
 * what was searched, same permissive-RLS + client-filtering pattern used
 * everywhere else in this app), not cryptographic per-user Postgres RLS —
 * a true "only this auth'd parent can ever see this row" guarantee needs a
 * real parent auth flow (magic-link/OTP tied to guardian_phone + a users
 * row), which doesn't exist yet.
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

  function getSb() {
    return (window.NextSession && window.NextSession.sb) ||
           (window.SCHOOL_STORE && window.SCHOOL_STORE.getSupabase && window.SCHOOL_STORE.getSupabase()) ||
           (window.supabase && window.supabase.createClient && window.supabase.createClient('https://llxhvqkkgftqwefmrofn.supabase.co', 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9'));
  }
  function getTenant() {
    return (typeof window.getOSActiveTenant === 'function') ? window.getOSActiveTenant() : 'kabs-lily-junior-school-and-kindercare-centre';
  }

  // Loads everything the dashboard needs for one child: fee ledger,
  // this week's roll call, and teacher notes.
  //
  // Goes through the worker's /parent/child-data (service-role, scoped
  // server-side to this exact tenant+student) rather than querying
  // Supabase directly with the anon key — the anon key currently has no
  // real per-user isolation (see the note at the top of this file and
  // cloudflare-worker/supabase-parent-rls-remediation-plan.sql), so a
  // direct client query here would be able to read ANY tenant's fees/
  // health notes, not just this family's. The worker enforces the scoping
  // instead, the same pattern already used for /fees/checkout etc.
  async function loadChildData(studentId, tenantId) {
    try {
      const res = await fetch(WK + '/parent/child-data?tenant=' + encodeURIComponent(tenantId) + '&student_id=' + encodeURIComponent(studentId));
      const out = await res.json();
      if (out.error) return { fees: [], rollCalls: [], notes: [] };
      return { fees: out.fees || [], rollCalls: out.rollCalls || [], notes: out.notes || [] };
    } catch (e) {
      return { fees: [], rollCalls: [], notes: [] };
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

  // ─── Guardian lookup gate ──────────────────────────────────────────────
  function GuardianLookup({ onFound }) {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const search = async () => {
      const q = query.trim();
      if (!q) return;
      setSearching(true); setError(''); setResults(null);
      const tenantId = getTenant();
      try {
        // Server-mediated (see loadChildData above for why): the worker
        // does this lookup with the service-role key, scoped to this one
        // tenant, instead of the anon key running an open query.
        const res = await fetch(WK + '/parent/search-child', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: tenantId, query: q }),
        });
        const out = await res.json();
        if (out.error) { setError('Search failed: ' + out.error); setSearching(false); return; }
        const data = out.matches || [];
        if (!data.length) { setError('No student found matching "' + q + '". Check the spelling, or ask the school office for your child\'s exact name on file.'); setSearching(false); return; }
        setResults(data);
      } catch (e) {
        setError('Search failed: ' + String((e && e.message) || e));
      }
      setSearching(false);
    };

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: T.colors.background, color: T.colors.text, fontFamily: T.fonts.sans, padding: 20,
      }}>
        <div style={{ width: '100%', maxWidth: 460, background: T.colors.surface, border: `1px solid ${T.colors.border}`, borderRadius: T.radii.xl, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #00FC8F 0%, #3B82F6 100%)', color: '#0A1029', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>KL</div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Parent Portal</h1>
              <p style={{ fontSize: 12, color: T.colors.textMuted, margin: 0 }}>Find your child to continue</p>
            </div>
          </div>
          <label style={{ fontSize: 12, color: T.colors.textMuted }}>Child's full name, or your registered phone number</label>
          <input
            autoFocus value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="e.g. Arinaitwe Elijah, or 07XXXXXXXX"
            style={{ width: '100%', marginTop: 8, background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: 12, borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          <button onClick={search} disabled={searching || !query.trim()} style={{
            width: '100%', marginTop: 12, padding: 12, background: searching ? T.colors.surfaceHover : T.colors.primary,
            color: searching ? T.colors.textMuted : '#0A1029', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14,
            cursor: searching ? 'default' : 'pointer',
          }}>{searching ? 'Searching…' : 'Find my child'}</button>
          {error && <div style={{ marginTop: 12, fontSize: 12.5, color: T.colors.danger }}>{error}</div>}
          {results && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: T.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Is this your child?</div>
              {results.map(s => (
                <button key={s.id} onClick={() => onFound([s])} style={{
                  textAlign: 'left', padding: '10px 14px', background: T.colors.surfaceHover, border: `1px solid ${T.colors.border}`,
                  borderRadius: 9, color: T.colors.text, cursor: 'pointer', fontSize: 13.5,
                }}>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: T.colors.textMuted, marginTop: 2 }}>{s.stream || '—'}{s.guardian_name ? ' · Guardian on file: ' + s.guardian_name : ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const ParentView = () => {
    const [children, setChildren] = useState(null); // null = not identified yet
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('overview');
    const [childData, setChildData] = useState({ fees: [], rollCalls: [], notes: [], loading: true });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentPhone, setPaymentPhone] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentEmail, setPaymentEmail] = useState('');
    const [paymentBusy, setPaymentBusy] = useState(false);
    const [paymentError, setPaymentError] = useState('');

    const rawChild = children && children[selectedChildIndex];
    const fees = useMemo(() => summarizeFees(childData.fees || []), [childData.fees]);
    const child = rawChild ? {
      id: rawChild.id,
      name: rawChild.name,
      class: rawChild.stream || '—',
      admissionNo: 'ID-' + rawChild.id,
      teacher: rawChild.guardian_name || '—',
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

    // Real-time: refresh this child's data the moment a roll call, fee, or
    // note comes in for them — the same live-sync pattern used elsewhere
    // in this app (school-data-store.js's postgres_changes subscriptions).
    useEffect(() => {
      const sb = getSb();
      if (!sb || !rawChild) return;
      const ch = sb.channel('parent-watch-' + rawChild.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_roll_call', filter: 'student_id=eq.' + rawChild.id }, () => {
          loadChildData(rawChild.id, getTenant()).then(setChildData);
          window.peakToast && window.peakToast(child ? child.name + "'s attendance was just updated" : 'Attendance updated', 'info');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_notes', filter: 'student_id=eq.' + rawChild.id }, () => {
          loadChildData(rawChild.id, getTenant()).then(setChildData);
          window.peakToast && window.peakToast('A teacher just logged a new note', 'info');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fees', filter: 'student_id=eq.' + rawChild.id }, () => {
          loadChildData(rawChild.id, getTenant()).then(setChildData);
        })
        .subscribe();
      return () => { try { sb.removeChannel(ch); } catch (e) {} };
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
      return <GuardianLookup onFound={setChildren} />;
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
                <button onClick={() => setChildren(null)} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#60A5FA', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}>Not you? Search again</button>
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
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    backgroundColor: '#3B82F6', color: '#FFF', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold'
                  }}>
                    {child.name.split(' ').map(n=>n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{child.name}</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#60A5FA', fontWeight: '700' }}>
                      Class: {child.class} · {child.admissionNo}
                    </p>
                  </div>
                </div>

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

              <div style={{
                backgroundColor: T.colors.surface, borderRadius: T.radii.lg, padding: '24px',
                border: `1px solid ${T.colors.border}`,
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#00FC8F' }}>💬 Message the school</h3>
                <p style={{ margin: '4px 0 12px 0', fontSize: '13px', color: T.colors.textMuted }}>
                  Real-time in-app messaging isn't wired up yet — reach the school directly for now.
                </p>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent('Hello, I am the guardian of ' + child.name + ' (' + child.class + ') at Kabs Lily.')}`}
                  target="_blank"
                  style={{
                    display: 'inline-block', padding: '10px 18px', backgroundColor: '#10B981', color: '#FFF', textDecoration: 'none',
                    borderRadius: T.radii.md, fontSize: '13px', fontWeight: '700',
                  }}
                >
                  💬 WhatsApp the school
                </a>
              </div>
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
