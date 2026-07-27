(function () {
  const { React } = window;
  const { useState, useEffect } = React || { useState: function(){}, useEffect: function(){} };

  // Fallback brand if not available
  const DEFAULT_BRAND = {
    name: "Peak Primary School",
    motto: "Striving for Excellence",
    address: "123 Education Lane, Learning City",
    phone: "+254 700 123 456",
    email: "info@peakprimary.edu",
    colors: {
      primary: "#1e3a8a", // blue-900
      secondary: "#f59e0b", // amber-500
      accent: "#3b82f6", // blue-500
    },
    fonts: {
      heading: "'Inter', sans-serif",
      body: "'Roboto', sans-serif",
    }
  };

  const getBrand = () => window.SCHOOL_BRAND || DEFAULT_BRAND;

  const SchoolDocumentHeader = ({ docType = "DOCUMENT", subtitle, children }) => {
    const brand = getBrand();
    
    // Print styles injected if not already present
    useEffect(() => {
      if (!document.getElementById('print-styles-header')) {
        const style = document.createElement('style');
        style.id = 'print-styles-header';
        style.innerHTML = `
          @media print {
            body * {
              visibility: hidden;
            }
            .document-print-area, .document-print-area * {
              visibility: visible !important;
            }
            .document-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }, []);

    const renderBadge = () => {
      if (brand.badgeUrl) {
        return (
          <img 
            src={brand.badgeUrl} 
            alt={`${brand.name} Badge`} 
            style={{ width: 72, height: 72, borderRadius: '50%', border: `2px solid ${brand.colors.secondary}`, objectFit: 'cover' }} 
          />
        );
      } else if (brand.getBadgeSvg) {
        return (
          <div dangerouslySetInnerHTML={{ __html: brand.getBadgeSvg(72) }} />
        );
      } else {
        const initials = brand.name.split(' ').map(w => w[0]).join('').substring(0, 2);
        return (
          <div style={{
            width: 72, height: 72, borderRadius: '50%', backgroundColor: brand.colors.primary, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 'bold',
            border: `2px solid ${brand.colors.secondary}`
          }}>
            {initials}
          </div>
        );
      }
    };

    return (
      <div style={{ width: '100%', backgroundColor: '#fff', fontFamily: brand.fonts?.body || 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {renderBadge()}
            <div>
              <h1 style={{ margin: 0, fontSize: 22, color: brand.colors.primary, fontFamily: brand.fonts?.heading || 'sans-serif', fontWeight: 'bold' }}>
                {brand.name.toUpperCase()}
              </h1>
              <div style={{ margin: '4px 0', fontSize: 12, fontStyle: 'italic', color: brand.colors.secondary }}>
                {brand.motto}
              </div>
              <div style={{ fontSize: 11, color: '#4b5563' }}>
                {brand.address} | {brand.phone} | {brand.email}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{
              backgroundColor: brand.colors.primary,
              color: 'white',
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: 14,
              fontWeight: 'bold',
              letterSpacing: '0.05em'
            }}>
              {docType}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Date: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: 3, backgroundColor: brand.colors.primary }}></div>
        <div style={{ width: '100%', height: 1, backgroundColor: brand.colors.secondary, marginTop: 2 }}></div>
        {children}
      </div>
    );
  };

  const SchoolBadgeStrip = ({ termInfo = "Term 1 - 2026" }) => {
    const brand = getBrand();
    const [visible, setVisible] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 4000);
      return () => clearTimeout(timer);
    }, []);

    if (!mounted) return null;

    const renderSmallBadge = () => {
      if (brand.badgeUrl) {
        return <img src={brand.badgeUrl} alt="Badge" style={{ width: 32, height: 32, borderRadius: '50%' }} />;
      }
      return (
        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>
          {brand.name.substring(0, 1)}
        </div>
      );
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: visible ? 56 : 0,
        backgroundColor: `${brand.colors.primary}ee`,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: visible ? '0 24px' : '0 24px',
        justifyContent: 'space-between',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        zIndex: 50,
        fontFamily: brand.fonts?.body || 'sans-serif',
        backdropFilter: 'blur(4px)',
        boxShadow: visible ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {renderSmallBadge()}
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>{brand.name}</span>
        </div>
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          {termInfo}
        </div>
      </div>
    );
  };

  window.SchoolDocumentHeader = SchoolDocumentHeader;
  window.SchoolBadgeStrip = SchoolBadgeStrip;

})();
