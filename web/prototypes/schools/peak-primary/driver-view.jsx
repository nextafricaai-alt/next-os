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

  // Mock initial manifest data
  const mockStudents = [
    { id: 's1', name: 'Brian Mukasa', class: 'P.4', guardian: 'Sarah Mukasa', phone: '+256 772 111222', address: 'Plot 14, Acacia Avenue', status: 'waiting', distance: '1.2 km', time: '4 mins' },
    { id: 's2', name: 'Esther Namuli', class: 'P.2', guardian: 'Peter Namuli', phone: '+256 752 333444', address: 'Kisaasi, Bahai Road', status: 'waiting', distance: '2.5 km', time: '8 mins' },
    { id: 's3', name: 'Joshua Kigozi', class: 'P.6', guardian: 'Mary Kigozi', phone: '+256 701 555666', address: 'Ntinda, Minister\'s Village', status: 'picked_up', distance: '-', time: '-' },
  ];

  // Map Component Fallback (Rich SVG)
  const SvgMap = () => (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#0B1120',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: T.radii.lg,
      border: `1px solid ${T.colors.border}`,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style={{ opacity: 0.8 }}>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={T.colors.surface} strokeWidth="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Route Path */}
        <path d="M 50 250 Q 150 250 200 150 T 350 50" fill="none" stroke={T.colors.primary} strokeWidth="6" strokeDasharray="8, 8" />
        
        {/* Next Stop Pin */}
        <g transform="translate(200, 150)">
          <circle cx="0" cy="0" r="12" fill={T.colors.warning} />
          <text x="0" y="4" fontSize="10" fill="#000" textAnchor="middle" fontWeight="bold">1</text>
        </g>
        
        {/* Driver position */}
        <g transform="translate(100, 250)">
          <circle cx="0" cy="0" r="16" fill={T.colors.primary} opacity="0.3">
            <animate attributeName="r" values="16; 24; 16" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="0" r="8" fill={T.colors.primary} />
          <polygon points="-4,-6 6,0 -4,6" fill="#fff" transform="rotate(-45)" />
        </g>
      </svg>
    </div>
  );

  const DriverView = ({ vanId = 'van-01' }) => {
    const [students, setStudents] = useState(mockStudents);
    const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
    const [skipModalOpen, setSkipModalOpen] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [filter, setFilter] = useState('All');

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
      } catch (e) {
        // Audio fallback
      }
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
      <div style={{
        backgroundColor: '#000',
        color: T.colors.text,
        fontFamily: T.fonts.sans,
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>🚐 VAN 01 — MORNING PICKUP</div>
                <div style={{ fontSize: '14px', color: T.colors.textMuted, marginTop: '4px' }}>
                  Driver: Tr. Moses K. · +256 701 234567
                </div>
              </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.colors.success, fontWeight: '600' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: T.colors.success, borderRadius: '50%', boxShadow: `0 0 8px ${T.colors.success}`, animation: 'pulse 2s infinite' }}></div>
              GPS Live
            </div>
          </div>

          {/* Map Panel */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, padding: '12px' }}>
               <SvgMap />
            </div>
            
            {activeStudent && (
              <div style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                right: '24px',
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                backdropFilter: 'blur(8px)',
                padding: '14px 16px',
                borderRadius: T.radii.lg,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: T.shadows.md,
                border: `1px solid ${T.colors.border}`,
              }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
                  Next: {activeStudent.name}
                </div>
                <div style={{ fontSize: '13px', color: T.colors.primary, fontWeight: '600' }}>
                  {activeStudent.distance} · ~{activeStudent.time}
                </div>
              </div>
            )}
            
            <button style={{
              margin: '0 12px 12px',
              padding: '12px',
              backgroundColor: T.colors.surface,
              color: T.colors.text,
              border: `1px solid ${T.colors.border}`,
              borderRadius: T.radii.md,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}>
              📍 Recalculate Shortest Route
            </button>
          </div>

          {/* Action Card */}
          {activeStudent ? (
            <div style={{
              backgroundColor: T.colors.surface,
              padding: '20px',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.3)',
              zIndex: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '60px', height: '60px',
                  borderRadius: T.radii.full,
                  backgroundColor: T.colors.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 'bold',
                }}>
                  {activeStudent.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{activeStudent.name}</div>
                  <div style={{ color: T.colors.primary, fontWeight: '600', marginTop: '2px' }}>{activeStudent.class}</div>
                  <div style={{ fontSize: '14px', color: T.colors.textMuted, marginTop: '4px' }}>
                    {activeStudent.guardian} · {activeStudent.phone} <br/>
                    {activeStudent.address}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                {activeStudent.status === 'waiting' && (
                  <button 
                    onClick={() => updateStatus(activeStudent.id, 'arrived')}
                    style={{
                      height: '56px', backgroundColor: T.colors.warning, color: '#000',
                      border: 'none', borderRadius: T.radii.md, fontSize: '18px', fontWeight: '800', cursor: 'pointer',
                    }}
                  >
                    📍 ARRIVED AT STOP
                  </button>
                )}
                
                {activeStudent.status === 'arrived' && (
                  <button 
                    onClick={() => handlePickedUp(activeStudent.id)}
                    style={{
                      height: '64px', backgroundColor: T.colors.success, color: '#fff',
                      border: 'none', borderRadius: T.radii.md, fontSize: '20px', fontWeight: '900', cursor: 'pointer',
                    }}
                  >
                    🟢 CHILD PICKED UP
                  </button>
                )}

                <button 
                  onClick={() => setSkipModalOpen(activeStudent.id)}
                  style={{
                    height: '48px', backgroundColor: 'transparent', color: T.colors.warning,
                    border: `2px solid ${T.colors.warning}`, borderRadius: T.radii.md, fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                  }}
                >
                  🟠 SKIPPED / ABSENT
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: T.colors.surface, padding: '32px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', zIndex: 20,
            }}>
               <div style={{ fontSize: '20px', fontWeight: 'bold' }}>🎉 All Stops Completed</div>
               <div style={{ color: T.colors.textMuted }}>Drive safely back to the campus.</div>
            </div>
          )}

          {/* Drawer Overlay */}
          <div style={{
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
                        <div style={{ fontSize: '13px', color: T.colors.textMuted }}>{s.address}</div>
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

        </div>
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
