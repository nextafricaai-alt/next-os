/**
 * Parent Portal Component — School OS
 * Kabs Lily Kindercare Center & Junior School
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

  const mockChildren = [
    {
      id: 'KL-2026-042',
      name: 'Brian Mukasa',
      class: 'P.4 Blue',
      admissionNo: 'KL-2026-042',
      house: 'Nile House',
      teacher: 'Nalukenge Jane (0750845160)',
      driver: 'Mr. Bbosa Yusufu (Van 01)',
      todayAttendance: 'present', // 'present' | 'absent' | 'late'
      checkInTime: '07:42 AM',
      attendanceRate: '96%',
      totalTuition: 350000,
      paidTuition: 200000,
      balance: 150000,
      teacherNotes: [
        { date: 'Today, 09:30 AM', subject: 'Social Studies', note: 'Brian was very active in today\'s discussion on African physical features and scored 92% in the quick quiz!' },
        { date: 'Yesterday, 02:15 PM', subject: 'Mathematics', note: 'Completed all fraction exercises accurately. Good progress in problem solving.' },
      ],
      shuttleStatus: {
        riding: true,
        vanName: 'Van 01',
        eta: '8 mins',
        currentStage: 'Kireka Police Stage',
      }
    },
    {
      id: 'KL-2026-015',
      name: 'Grace Kintu',
      class: 'Baby Class',
      admissionNo: 'KL-2026-015',
      house: 'Victoria House',
      teacher: 'Ikubu Christine (0771791911)',
      driver: 'Walker (Self Pickup)',
      todayAttendance: 'present',
      checkInTime: '08:05 AM',
      attendanceRate: '98%',
      totalTuition: 380000,
      paidTuition: 380000,
      balance: 0,
      teacherNotes: [
        { date: 'Today, 11:00 AM', subject: 'LIT 2 / Phonics', note: 'Grace learned sounds /s/ and /a/ today. Enjoyed building blocks during free play.' }
      ],
      shuttleStatus: { riding: false }
    }
  ];

  const mockHeadAnnouncements = [
    { id: 1, title: '📢 Term 2 General Parents Association (PTA) Meeting', date: 'Sat, 15th Aug 2026', body: 'All parents are cordially invited to our Term 2 AGM at the campus main hall starting 10:00 AM. Refreshments provided.' },
    { id: 2, title: '⚽ Annual Inter-House Sports Day', date: 'Fri, 28th Aug 2026', body: 'Sports uniforms are available at the bursar office. Please clear sports activity fees before 20th August.' },
  ];

  const ParentView = () => {
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'fees' | 'academics' | 'notices' | 'shuttle'
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentPhone, setPaymentPhone] = useState('0772111222');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('mtn'); // 'mtn' | 'airtel' | 'card'
    const [paymentSuccessMsg, setPaymentSuccessMsg] = useState(null);

    const child = mockChildren[selectedChildIndex];

    const handleProcessPayment = () => {
      const amt = parseFloat(paymentAmount) || child.balance;
      setPaymentSuccessMsg(`SUCCESS! Received ${amt.toLocaleString()} UGX payment for ${child.name}. Balance updated.`);
      setTimeout(() => {
        child.paidTuition += amt;
        child.balance = Math.max(0, child.balance - amt);
        setIsPaymentModalOpen(false);
        setPaymentSuccessMsg(null);
        setPaymentAmount('');
      }, 2500);
    };

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
              <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>KABS LILY PARENT PORTAL</h1>
              <p style={{ fontSize: '12px', color: T.colors.textMuted, margin: 0 }}>
                Logged as: <b>Mrs. Sarah Mukasa</b> · Guardian Access Code: <b>KL-2026-042</b>
              </p>
            </div>
          </div>

          {/* Child Switcher if multiple children */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: T.colors.textMuted }}>Select Child:</span>
            {mockChildren.map((c, idx) => (
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
                👶 {c.name} ({c.class})
              </button>
            ))}
          </div>
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
            { id: 'academics', label: '📊 Teacher Notes & Report Cards' },
            { id: 'notices', label: '📢 Headteacher Notices' },
            { id: 'shuttle', label: '🚐 Live Shuttle Tracker' },
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
                    {child.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{child.name}</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#60A5FA', fontWeight: '700' }}>
                      Class: {child.class} · Admission No: {child.admissionNo}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: T.colors.textMuted }}>Class Teacher:</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>{child.teacher}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: T.colors.textMuted }}>House & Shuttle:</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>{child.house} · {child.driver}</div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <a
                    href={`https://wa.me/256750845160?text=Hello%20Teacher,%20I%20am%20inquiring%20about%20${child.name}`}
                    target="_blank"
                    style={{
                      flex: 1, padding: '10px', backgroundColor: '#10B981', color: '#FFF', textDecoration: 'none',
                      borderRadius: T.radii.md, fontSize: '12px', fontWeight: '700', textAlign: 'center'
                    }}
                  >
                    💬 WhatsApp Class Teacher
                  </a>
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
                <h3 style={{ margin: 0, fontSize: '16px', color: '#00FC8F' }}>🟢 Live Attendance & Check-In</h3>
                
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10B981',
                  padding: '16px',
                  borderRadius: T.radii.md,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#A7F3D0', fontWeight: '600' }}>TODAY'S STATUS</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#FFF', marginTop: '2px' }}>
                      PRESENT AT CAMPUS 🟢
                    </div>
                    <div style={{ fontSize: '12px', color: '#D1D5DB', marginTop: '2px' }}>
                      Checked in at gate: <b>{child.checkInTime}</b>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#00FC8F' }}>{child.attendanceRate}</div>
                    <div style={{ fontSize: '11px', color: T.colors.textMuted }}>Term 2 Attendance Rate</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: T.colors.textMuted, marginBottom: '8px' }}>Recent 5 Days Rhythm:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                      <div key={day} style={{
                        background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center',
                        border: i === 4 ? '1px solid #10B981' : 'none'
                      }}>
                        <div style={{ fontSize: '11px', color: T.colors.textMuted }}>{day}</div>
                        <div style={{ fontSize: '14px', marginTop: '4px' }}>🟢</div>
                        <div style={{ fontSize: '10px', color: '#10B981', fontWeight: '700', marginTop: '2px' }}>Present</div>
                      </div>
                    ))}
                  </div>
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
                  <div style={{ fontSize: '12px', color: T.colors.textMuted }}>Total Term Tuition:</div>
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
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#00FC8F' }}>💳 Online Tuition Clearance Portal</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: T.colors.textMuted }}>
                    Clear tuition balances instantly via MTN Mobile Money (*165#), Airtel Money (*185#), or Visa/Mastercard.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {child.balance > 0 ? (
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      style={{
                        padding: '12px 24px', backgroundColor: '#00FC8F', color: '#0A1029',
                        border: 'none', borderRadius: T.radii.md, fontSize: '14px', fontWeight: '900', cursor: 'pointer'
                      }}
                    >
                      💳 Pay Tuition Balance Now
                    </button>
                  ) : (
                    <div style={{ padding: '10px 16px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', borderRadius: '8px', fontWeight: '800' }}>
                      ✅ Tuition Fully Cleared!
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (window.SchoolFeeStatementDemo) {
                        alert('Opening official fee statement preview...');
                      }
                    }}
                    style={{
                      padding: '12px 20px', backgroundColor: 'transparent', color: '#FFF',
                      border: `1px solid ${T.colors.border}`, borderRadius: T.radii.md, fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    📄 Download Official Fee Statement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACADEMICS & TEACHER NOTES */}
          {activeTab === 'academics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                backgroundColor: T.colors.surface,
                borderRadius: T.radii.lg,
                padding: '24px',
                border: `1px solid ${T.colors.border}`
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#60A5FA' }}>📝 Teacher Logged Daily Notes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {child.teacherNotes.map((note, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: T.radii.md,
                      borderLeft: '4px solid #3B82F6'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: T.colors.textMuted }}>
                        <span style={{ fontWeight: '700', color: '#60A5FA' }}>Subject: {note.subject}</span>
                        <span>{note.date}</span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px', lineHeight: '1.5' }}>{note.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Term Report Cards Banner */}
              <div style={{
                backgroundColor: T.colors.surface,
                borderRadius: T.radii.lg,
                padding: '24px',
                border: `1px solid ${T.colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#00FC8F' }}>📊 Term 2 Official Report Card</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: T.colors.textMuted }}>
                    View complete subject breakdown, grades, attendance, and head teacher remarks.
                  </p>
                </div>
                <button
                  onClick={() => alert(`Opening official report card for ${child.name}...`)}
                  style={{
                    padding: '12px 20px', backgroundColor: '#3B82F6', color: '#FFF',
                    border: 'none', borderRadius: T.radii.md, fontSize: '13px', fontWeight: '800', cursor: 'pointer'
                  }}
                >
                  📄 View Report Card
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: HEADTEACHER NOTICES */}
          {activeTab === 'notices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mockHeadAnnouncements.map(ann => (
                <div key={ann.id} style={{
                  backgroundColor: T.colors.surface,
                  borderRadius: T.radii.lg,
                  padding: '24px',
                  border: `1px solid ${T.colors.border}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#00FC8F' }}>{ann.title}</h3>
                    <span style={{ fontSize: '12px', color: T.colors.textMuted }}>{ann.date}</span>
                  </div>
                  <p style={{ margin: '12px 0 0 0', fontSize: '14px', lineHeight: '1.6', color: T.colors.text }}>{ann.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: SHUTTLE LIVE TRACKER */}
          {activeTab === 'shuttle' && (
            <div style={{
              backgroundColor: T.colors.surface,
              borderRadius: T.radii.lg,
              padding: '24px',
              border: `1px solid ${T.colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#00FC8F' }}>🚐 Live Shuttle GPS Tracker</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: T.colors.textMuted }}>
                    Tracking <b>{child.shuttleStatus.vanName}</b> carrying {child.name}. ETA: <b>{child.shuttleStatus.eta}</b>
                  </p>
                </div>
                <a
                  href="/prototypes/schools/peak-primary/driver-dashboard.html"
                  target="_blank"
                  style={{
                    padding: '8px 16px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#60A5FA',
                    border: '1px solid #3B82F6', borderRadius: T.radii.md, textDecoration: 'none', fontSize: '12px', fontWeight: '800'
                  }}
                >
                  🔗 Open Full Driver Telemetry App
                </a>
              </div>

              <div style={{ height: '360px', backgroundColor: '#0B0F19', borderRadius: T.radii.md, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.colors.border}` }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px' }}>🚐</div>
                  <h4 style={{ margin: '8px 0 0 0', color: '#00FC8F' }}>{child.shuttleStatus.vanName} Live Location</h4>
                  <p style={{ fontSize: '13px', color: T.colors.textMuted }}>Current Stage: <b>{child.shuttleStatus.currentStage}</b> · Speed: 38 km/h</p>
                </div>
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
              <h3 style={{ margin: 0, fontSize: '18px', color: '#00FC8F' }}>💳 Mobile Money / Card Tuition Clearance</h3>
              <p style={{ margin: 0, fontSize: '12px', color: T.colors.textMuted }}>
                Pay tuition clearance for <b>{child.name}</b> ({child.class})
              </p>

              {paymentSuccessMsg ? (
                <div style={{ padding: '16px', background: 'rgba(16,185,129,0.2)', border: '1px solid #10B981', borderRadius: '8px', color: '#10B981', fontWeight: '700', textAlign: 'center' }}>
                  {paymentSuccessMsg}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setPaymentMethod('mtn')} style={{ flex: 1, padding: '10px', background: paymentMethod === 'mtn' ? '#FBBF24' : 'rgba(255,255,255,0.05)', color: paymentMethod === 'mtn' ? '#000' : '#FFF', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>🟡 MTN MoMo</button>
                    <button onClick={() => setPaymentMethod('airtel')} style={{ flex: 1, padding: '10px', background: paymentMethod === 'airtel' ? '#EF4444' : 'rgba(255,255,255,0.05)', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>🔴 Airtel Money</button>
                    <button onClick={() => setPaymentMethod('card')} style={{ flex: 1, padding: '10px', background: paymentMethod === 'card' ? '#3B82F6' : 'rgba(255,255,255,0.05)', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>💳 Card</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '12px', color: T.colors.textMuted }}>Phone Number for Mobile Money Push Prompt:</label>
                    <input
                      type="text" value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)}
                      style={{ background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                    />
                    <label style={{ fontSize: '12px', color: T.colors.textMuted }}>Amount to Pay (UGX):</label>
                    <input
                      type="number" placeholder={child.balance.toString()} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                      style={{ background: '#0F172A', color: '#FFF', border: `1px solid ${T.colors.border}`, padding: '12px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', outline: 'none' }}
                    />
                  </div>

                  <button
                    onClick={handleProcessPayment}
                    style={{
                      padding: '14px', backgroundColor: '#00FC8F', color: '#0A1029', border: 'none',
                      borderRadius: T.radii.md, fontSize: '15px', fontWeight: '900', cursor: 'pointer'
                    }}
                  >
                    Confirm & Send MoMo Payment Push 📲
                  </button>
                  <button onClick={() => setIsPaymentModalOpen(false)} style={{ padding: '10px', background: 'transparent', color: T.colors.textMuted, border: `1px solid ${T.colors.border}`, borderRadius: T.radii.md, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  window.ParentView = ParentView;
})();
