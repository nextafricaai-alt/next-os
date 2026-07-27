(() => {
  const { useState, useEffect, useRef, useMemo } = React;

  // --- Inline Styles ---
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '24px 32px',
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-elevated)',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    title: {
      margin: 0,
      fontSize: '24px',
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      letterSpacing: '-0.5px',
      color: 'var(--text-primary)',
    },
    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: 'var(--mint)',
      boxShadow: '0 0 10px var(--mint), 0 0 20px var(--mint)',
      animation: 'pulseDot 2s infinite',
    },
    subtitle: {
      fontSize: '13px',
      color: 'var(--mint)',
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      opacity: 0.8,
    },
    tabs: {
      display: 'flex',
      gap: '24px',
      padding: '0 32px',
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-surface)',
    },
    tab: (isActive) => ({
      padding: '16px 0',
      fontSize: '14px',
      fontWeight: 500,
      color: isActive ? 'var(--mint)' : 'var(--text-secondary)',
      borderBottom: isActive ? '2px solid var(--mint)' : '2px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
    }),
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '32px',
      gap: '24px',
      overflowY: 'auto',
    },
    canvasArea: {
      flex: 1,
      minHeight: '400px',
      borderRadius: '16px',
      backgroundColor: '#0A0A0C', // Very dark for contrast
      border: '1px solid rgba(0, 252, 143, 0.1)',
      boxShadow: '0 0 40px rgba(0, 252, 143, 0.05), inset 0 0 100px rgba(0,0,0,0.8)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    canvasContent: {
      width: '100%',
      height: '100%',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    idleState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      zIndex: 10,
    },
    idleText: {
      color: 'var(--text-secondary)',
      fontFamily: 'var(--font-display)',
      fontSize: '18px',
      letterSpacing: '0.5px',
      textShadow: '0 2px 10px rgba(0,0,0,0.5)',
      opacity: 0.7,
    },
    inputArea: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backgroundColor: 'var(--bg-elevated)',
      padding: '24px',
      borderRadius: '16px',
      border: '1px solid var(--border-subtle)',
    },
    promptBar: {
      display: 'flex',
      gap: '12px',
    },
    input: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      padding: '16px 20px',
      color: 'var(--text-primary)',
      fontSize: '16px',
      fontFamily: 'var(--font-body)',
      outline: 'none',
      transition: 'all 0.3s ease',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
    },
    inputFocus: {
      border: '1px solid var(--mint)',
      boxShadow: '0 0 15px rgba(0, 252, 143, 0.15), inset 0 2px 4px rgba(0,0,0,0.2)',
    },
    button: {
      backgroundColor: 'var(--mint)',
      color: '#000',
      border: 'none',
      borderRadius: '8px',
      padding: '0 32px',
      fontSize: '16px',
      fontWeight: 600,
      fontFamily: 'var(--font-display)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 15px rgba(0, 252, 143, 0.2)',
    },
    chips: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
    },
    chip: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '8px 16px',
      fontSize: '13px',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    exportArea: {
      position: 'absolute',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      gap: '12px',
      zIndex: 20,
    },
    exportBtn: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: 'var(--text-primary)',
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }
  };

  // --- Helpers ---
  const downloadDataUrl = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCanvasToPNG = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (window.html2canvas) {
      const canvas = await window.html2canvas(el, { backgroundColor: '#0A0A0C' });
      downloadDataUrl(canvas.toDataURL('image/png'), 'nia-design.png');
    } else {
      // Basic SVG fallback
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth}" height="${el.offsetHeight}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="background:#0A0A0C; width:100%; height:100%;">
              ${el.innerHTML}
            </div>
          </foreignObject>
        </svg>
      `;
      const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      downloadDataUrl(url, 'nia-design.svg');
    }
  };

  const exportToPDF = () => {
    if (window.jspdf?.jsPDF) {
      const doc = new window.jspdf.jsPDF();
      doc.text("Nia Design Studio Export", 10, 10);
      doc.save("nia-design.pdf");
    } else {
      window.print();
    }
  };

  // --- Components ---
  const Particles = () => {
    const particles = Array.from({ length: 15 }).map((_, i) => {
      const size = Math.random() * 6 + 2;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const duration = Math.random() * 20 + 10;
      const delay = Math.random() * 5;
      
      return (
        <div key={i} style={{
          position: 'absolute',
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: i % 3 === 0 ? 'var(--mint)' : 'rgba(255,255,255,0.2)',
          borderRadius: '50%',
          left: `${left}%`,
          top: `${top}%`,
          opacity: Math.random() * 0.5 + 0.1,
          boxShadow: i % 3 === 0 ? '0 0 10px var(--mint)' : 'none',
          animation: `floatParticle ${duration}s ease-in-out ${delay}s infinite alternate`
        }} />
      );
    });
    
    return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>{particles}</div>;
  };

  const DataArtAttendance = () => {
    const students = Array.from({ length: 40 });
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '80%', justifyContent: 'center' }}>
          {students.map((_, i) => {
            const status = Math.random();
            let color = 'var(--mint)';
            if (status > 0.8) color = '#FF3B30'; // Red
            else if (status > 0.7) color = '#AF52DE'; // Purple
            
            return (
              <div key={i} style={{
                width: '30px', height: '30px', borderRadius: '50%',
                backgroundColor: color,
                boxShadow: `0 0 15px ${color}40`,
                animation: `zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${i * 0.05}s both`
              }} />
            )
          })}
        </div>
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          TENANT: OAKWOOD ACADEMY | DATE: TODAY
        </div>
      </div>
    );
  };

  const DataArtFees = () => {
    const bars = [80, 45, 95, 20, 60, 100, 30];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '70%' }}>
        {bars.map((val, i) => {
          let color = 'var(--mint)';
          if (val < 40) color = '#FF3B30'; // Red
          else if (val < 70) color = 'var(--gold)'; // Amber
          
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', color: 'var(--text-secondary)', fontSize: '12px' }}>G-{i+1}</div>
              <div style={{ flex: 1, height: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${val}%`, height: '100%', backgroundColor: color, borderRadius: '6px',
                  boxShadow: `0 0 10px ${color}`,
                  animation: `slideRight 1s ease-out ${i * 0.1}s both`
                }} />
              </div>
            </div>
          )
        })}
      </div>
    );
  };

  const DataArtFleet = () => {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ animation: 'spinSlow 60s linear infinite', position: 'relative', width: '300px', height: '300px' }}>
          {[0, 1, 2, 3, 4, 5, 6].map(i => {
            const angle = (i / 7) * Math.PI * 2;
            const x = Math.cos(angle) * 120 + 150;
            const y = Math.sin(angle) * 120 + 150;
            const size = Math.random() * 30 + 10;
            
            return (
              <div key={i} style={{
                position: 'absolute', left: `${x}px`, top: `${y}px`,
                width: `${size}px`, height: `${size}px`,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #fff, var(--mint))',
                boxShadow: '0 0 20px var(--mint), inset -5px -5px 10px rgba(0,0,0,0.5)',
                transform: 'translate(-50%, -50%)',
                animation: 'pulseGlow 3s infinite alternate'
              }} />
            );
          })}
          {/* Central Star */}
          <div style={{
            position: 'absolute', left: '150px', top: '150px',
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #fff, var(--gold))',
            boxShadow: '0 0 40px var(--gold), 0 0 80px var(--gold)',
            transform: 'translate(-50%, -50%)'
          }} />
        </div>
      </div>
    );
  };

  const ReportA4 = () => {
    return (
      <div style={{ 
        width: '450px', height: '600px', backgroundColor: '#fff', 
        borderRadius: '8px', padding: '40px', color: '#1A1A1A',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', gap: '24px',
        animation: 'fadeInUp 0.6s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #EEE', paddingBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'var(--font-display)', color: '#000' }}>Term Report</div>
            <div style={{ fontSize: '14px', color: '#666' }}>October 2026</div>
          </div>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#00FC8F', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px' }}>N</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: '#F8F9FA', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Attendance</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00FC8F' }}>94.2%</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#F8F9FA', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Fee Collection</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFB400' }}>88.5%</div>
          </div>
        </div>
        
        <div style={{ flex: 1, backgroundColor: '#F8F9FA', borderRadius: '8px', padding: '16px', position: 'relative' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '16px' }}>Performance Trend</div>
          <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100px', overflow: 'visible' }}>
            <path d="M0,30 L20,25 L40,10 L60,15 L80,5 L100,0" fill="none" stroke="#00FC8F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                  style={{ animation: 'drawPath 2s ease-out forwards', strokeDasharray: 200, strokeDashoffset: 200 }} />
          </svg>
        </div>
        
        <div style={{ borderTop: '1px solid #EEE', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
          <span>Powered by NEXT OS</span>
          <span>Confidential</span>
        </div>
      </div>
    );
  };
  
  const CertificateLayout = () => {
    return (
      <div style={{
        width: '600px', height: '420px', backgroundColor: '#FAFAFA',
        border: '1px solid #E0E0E0', borderRadius: '4px',
        padding: '24px', position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'fadeInUp 0.6s ease-out',
        color: '#222'
      }}>
        <div style={{ border: '2px solid #D4AF37', height: '100%', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
          <div style={{ color: '#D4AF37', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Certificate of Achievement</div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-display)', fontWeight: 'bold', margin: '16px 0 32px 0', color: '#111' }}>Outstanding Performance</div>
          <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>This is proudly presented to</div>
          <div style={{ fontSize: '28px', fontFamily: 'cursive', color: '#00FC8F', borderBottom: '1px solid #CCC', paddingBottom: '8px', minWidth: '300px', marginBottom: '24px' }}>Alex Johnson</div>
          <div style={{ fontSize: '12px', color: '#777', maxWidth: '400px' }}>For exceptional dedication and continuous excellence during the academic term.</div>
          
          <div style={{ position: 'absolute', bottom: '32px', width: '100%', display: 'flex', justifyContent: 'space-around', padding: '0 40px' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '8px', width: '150px', fontSize: '12px' }}>Principal</div>
            <div style={{ borderTop: '1px solid #000', paddingTop: '8px', width: '150px', fontSize: '12px' }}>Date</div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardSkin = () => {
    return (
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center', animation: 'fadeIn 0.5s ease' }}>
        <div style={{
          width: '300px', height: '200px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #1A1A24, #0A0A0F)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--mint)' }} />
            <div style={{ flex: 1, height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)' }} />
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
          <div style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold' }}>Bloomberg Dark Preview</div>
          <div>Primary: <span style={{ color: 'var(--mint)' }}>#00FC8F</span></div>
          <div>Surface: #1A1A24</div>
          <div>Typography: Inter / Roboto Mono</div>
        </div>
      </div>
    );
  };


  const NiaDesignStudio = () => {
    const [activeTab, setActiveTab] = useState('Data Art');
    const [prompt, setPrompt] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [renderState, setRenderState] = useState(null); // null = idle, string = rendering type
    
    const tabs = ['Data Art', 'Report', 'Brand Assets', 'Dashboard Skin'];
    const chips = ['📊 Attendance Chart', '💰 Fee Collection Visual', '🌐 Fleet Galaxy', '📋 School Report', '🏆 Certificate'];

    // Inject global keyframes if they don't exist
    useEffect(() => {
      if (!document.getElementById('nia-keyframes')) {
        const style = document.createElement('style');
        style.id = 'nia-keyframes';
        style.innerHTML = `
          @keyframes pulseDot {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes floatParticle {
            0% { transform: translateY(0) translateX(0); }
            100% { transform: translateY(-100px) translateX(20px); }
          }
          @keyframes zoomIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes slideRight {
            from { width: 0; opacity: 0; }
          }
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulseGlow {
            0% { opacity: 0.6; filter: brightness(1); }
            100% { opacity: 1; filter: brightness(1.5); }
          }
          @keyframes fadeInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes drawPath {
            to { stroke-dashoffset: 0; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
    }, []);

    const handleGenerate = (text = prompt) => {
      if (!text) return;
      const lowerText = text.toLowerCase();
      
      // Basic routing logic based on prompt
      if (lowerText.includes('attendance')) {
        setActiveTab('Data Art');
        setRenderState('attendance');
      } else if (lowerText.includes('fee')) {
        setActiveTab('Data Art');
        setRenderState('fees');
      } else if (lowerText.includes('fleet') || lowerText.includes('galaxy')) {
        setActiveTab('Data Art');
        setRenderState('fleet');
      } else if (lowerText.includes('report')) {
        setActiveTab('Report');
        setRenderState('report');
      } else if (lowerText.includes('certificate')) {
        setActiveTab('Brand Assets');
        setRenderState('certificate');
      } else if (lowerText.includes('dashboard') || lowerText.includes('skin')) {
        setActiveTab('Dashboard Skin');
        setRenderState('dashboard');
      } else {
        // Fallback based on active tab
        if (activeTab === 'Data Art') setRenderState('fleet');
        else if (activeTab === 'Report') setRenderState('report');
        else if (activeTab === 'Brand Assets') setRenderState('certificate');
        else setRenderState('dashboard');
      }
    };

    const handleChipClick = (chip) => {
      setPrompt(chip);
      handleGenerate(chip);
    };

    const renderCanvas = () => {
      if (!renderState) {
        return (
          <div style={styles.idleState}>
            <div style={styles.idleText}>Ask Nia to generate a graphic</div>
          </div>
        );
      }

      switch (renderState) {
        case 'attendance': return <DataArtAttendance />;
        case 'fees': return <DataArtFees />;
        case 'fleet': return <DataArtFleet />;
        case 'report': return <ReportA4 />;
        case 'certificate': return <CertificateLayout />;
        case 'dashboard': return <DashboardSkin />;
        default: return null;
      }
    };

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>Nia Design Studio</h1>
            <div style={styles.statusDot} />
          </div>
          <div style={styles.subtitle}>Powered by Nia Intelligence</div>
        </div>

        <div style={styles.tabs}>
          {tabs.map(tab => (
            <div 
              key={tab} 
              style={styles.tab(activeTab === tab)}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        <div style={styles.main}>
          <div style={styles.canvasArea} id="nia-render-target">
            {!renderState && <Particles />}
            <div style={styles.canvasContent}>
              {renderCanvas()}
            </div>
            
            {renderState && (
              <div style={styles.exportArea}>
                <button style={styles.exportBtn} onClick={() => exportCanvasToPNG('nia-render-target')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  Export PNG
                </button>
                <button style={styles.exportBtn} onClick={exportToPDF}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Export PDF
                </button>
              </div>
            )}
          </div>

          <div style={styles.inputArea}>
            <div style={styles.promptBar}>
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Describe what you want Nia to design..."
                style={{ ...styles.input, ...(isFocused ? styles.inputFocus : {}) }}
              />
              <button 
                style={styles.button}
                onClick={() => handleGenerate()}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
              >
                Generate
              </button>
            </div>
            
            <div style={styles.chips}>
              {chips.map(chip => (
                <div 
                  key={chip} 
                  style={styles.chip}
                  onClick={() => handleChipClick(chip)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                >
                  {chip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Expose to window
  window.NiaDesignStudio = NiaDesignStudio;
})();
