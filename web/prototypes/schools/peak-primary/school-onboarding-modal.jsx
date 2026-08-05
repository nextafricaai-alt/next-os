import React from 'react';
import ReactDOM from 'react-dom/client';
(function (global) {
  const { useState, useEffect } = React;

  // Design Tokens
  const T = {
    bg: '#0F1115', // Dark background
    surface: '#1A1D24', // Card background
    surfaceHover: '#22262F',
    border: '#2E333D',
    borderActive: '#00D084', // Mint green
    textPrimary: '#F1F3F5',
    textSecondary: '#A0AABF',
    textMuted: '#687387',
    primary: '#00D084',
    primaryHover: '#00E691',
    successBg: 'rgba(0, 208, 132, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  };

  const SchoolOnboardingModal = ({ isOpen, onClose, onComplete, tenantId = 'DEFAULT_TENANT' }) => {
    const [selectedType, setSelectedType] = useState('mixed_day_boarding');
    const [isSaving, setIsSaving] = useState(false);
    
    // Reset state when opened
    useEffect(() => {
      if (isOpen) {
        setSelectedType('mixed_day_boarding');
        setIsSaving(false);
      }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
      setIsSaving(true);
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (window.SCHOOL_BOARDING_ENGINE && window.SCHOOL_BOARDING_ENGINE.setSchoolModel) {
        window.SCHOOL_BOARDING_ENGINE.setSchoolModel(tenantId, selectedType);
      } else {
        console.warn('SCHOOL_BOARDING_ENGINE not found. Simulated save for:', selectedType);
      }

      // Emit event
      window.dispatchEvent(new CustomEvent('school-operating-model-changed', {
        detail: { tenantId, type: selectedType }
      }));

      // Show toast
      if (window.showToast) {
        window.showToast('School operating model updated successfully!', 'success');
      } else {
        alert('✅ School operating model updated successfully!');
      }

      setIsSaving(false);
      if (onComplete) onComplete(selectedType);
      if (onClose) onClose();
    };

    const models = [
      {
        value: 'day_only',
        icon: '☀️',
        title: 'Day Scholar Institution',
        description: 'All students commute daily. Standard tuition, day lunch, and timetable tracking.',
        features: 'Class Registers · Day Fee Tracking · Parent Transport',
        preview: '✅ Enables standard student tracking, day transport modules, and standard tuition ledgers.'
      },
      {
        value: 'boarding_only',
        icon: '🌙',
        title: '100% Boarding Institution',
        description: 'All enrolled students reside in campus hostels. Full boarding welfare, night roll-call, & meal ledgers.',
        features: 'Dorm Allocations · Night Roll-Call · Boarding Fee Ledger',
        preview: '✅ Enables full Hostel Management, Night Roll-Call, and dedicated Boarding Fee Ledgers.'
      },
      {
        value: 'mixed_day_boarding',
        icon: '🏠',
        title: 'Mixed Day & Boarding School',
        description: 'Operates both day commuters and resident hostel boarders. Enables ring-fenced split financial ledgers.',
        features: 'Split Financial Ledger · Boarder Tags · Hostel Management',
        preview: '✅ Enables Boarding & Hostels 🏠 sidebar panel, student Day/Boarder tags, and Ring-Fenced Boarding Financial Ledger.'
      }
    ];

    const activeModel = models.find(m => m.value === selectedType);

    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.eyebrow}>NEXT OS · SCHOOL ONBOARDING</div>
            <h2 style={styles.title}>Select Your School Operating Type</h2>
            <p style={styles.subtitle}>
              Choose how your institution operates to enable the appropriate modules, ledgers, and student tracking.
            </p>
          </div>

          {/* Body */}
          <div style={styles.body}>
            <div style={styles.grid}>
              {models.map((model) => {
                const isActive = selectedType === model.value;
                return (
                  <div
                    key={model.value}
                    onClick={() => setSelectedType(model.value)}
                    style={{
                      ...styles.card,
                      ...(isActive ? styles.cardActive : {}),
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = T.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = T.surface;
                    }}
                  >
                    <div style={styles.cardIcon}>{model.icon}</div>
                    <h3 style={styles.cardTitle}>{model.title}</h3>
                    <p style={styles.cardDesc}>{model.description}</p>
                    <div style={styles.cardFeatures}>{model.features}</div>
                    {isActive && (
                      <div style={styles.activeCheck}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill={T.primary} />
                          <path d="M7 12L10.5 15.5L18 8" stroke="#0F1115" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Preview Banner */}
            <div style={styles.previewBanner}>
              <strong>Active Model Impact:</strong><br />
              <span dangerouslySetInnerHTML={{ __html: activeModel.preview.replace(/Boarding & Hostels 🏠|Day\/Boarder tags|Ring-Fenced Boarding Financial Ledger/g, '<strong>$&</strong>') }} />
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button onClick={onClose} style={styles.cancelBtn} disabled={isSaving}>
              Cancel
            </button>
            <button onClick={handleSave} style={styles.saveBtn} disabled={isSaving}>
              {isSaving ? 'Configuring...' : 'Save & Configure School OS'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: T.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    modal: {
      backgroundColor: T.bg,
      borderRadius: '16px',
      width: '100%',
      maxWidth: '900px',
      boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
      border: `1px solid ${T.border}`,
      overflow: 'hidden',
      animation: 'modalSlideUp 0.3s ease-out forwards',
    },
    header: {
      padding: '32px 32px 24px',
      borderBottom: `1px solid ${T.border}`,
      textAlign: 'center',
    },
    eyebrow: {
      color: T.primary,
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '1.5px',
      marginBottom: '12px',
      textTransform: 'uppercase',
    },
    title: {
      color: T.textPrimary,
      fontSize: '28px',
      fontWeight: '600',
      margin: '0 0 12px 0',
    },
    subtitle: {
      color: T.textSecondary,
      fontSize: '16px',
      lineHeight: '1.5',
      margin: 0,
      maxWidth: '600px',
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    body: {
      padding: '32px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '24px',
      marginBottom: '32px',
    },
    card: {
      backgroundColor: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: '12px',
      padding: '24px',
      cursor: 'pointer',
      position: 'relative',
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
    },
    cardActive: {
      borderColor: T.borderActive,
      backgroundColor: 'rgba(0, 208, 132, 0.03)',
      boxShadow: `0 0 0 1px ${T.borderActive}, 0 8px 24px rgba(0, 208, 132, 0.1)`,
      transform: 'translateY(-2px)',
    },
    cardIcon: {
      fontSize: '40px',
      marginBottom: '20px',
      lineHeight: 1,
    },
    cardTitle: {
      color: T.textPrimary,
      fontSize: '18px',
      fontWeight: '600',
      margin: '0 0 12px 0',
    },
    cardDesc: {
      color: T.textSecondary,
      fontSize: '14px',
      lineHeight: '1.5',
      margin: '0 0 20px 0',
      flexGrow: 1,
    },
    cardFeatures: {
      color: T.textMuted,
      fontSize: '12px',
      fontWeight: '500',
      borderTop: `1px dashed ${T.border}`,
      paddingTop: '16px',
      lineHeight: '1.4',
    },
    activeCheck: {
      position: 'absolute',
      top: '20px',
      right: '20px',
    },
    previewBanner: {
      backgroundColor: T.surface,
      borderRadius: '8px',
      padding: '16px 20px',
      borderLeft: `4px solid ${T.primary}`,
      color: T.textSecondary,
      fontSize: '14px',
      lineHeight: '1.6',
    },
    footer: {
      padding: '24px 32px',
      borderTop: `1px solid ${T.border}`,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '16px',
      backgroundColor: T.surface,
    },
    cancelBtn: {
      backgroundColor: 'transparent',
      border: `1px solid ${T.border}`,
      color: T.textPrimary,
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    saveBtn: {
      backgroundColor: T.primary,
      border: 'none',
      color: T.bg,
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s, opacity 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(0, 208, 132, 0.2)',
    }
  };

  // Add styles for keyframes
  if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.innerText = `
      @keyframes modalSlideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Export to global scope
  global.SchoolOnboardingModal = SchoolOnboardingModal;

  // Render helper function
  global.openSchoolOnboardingModal = (tenantId = 'DEFAULT_TENANT') => {
    const containerId = 'school-onboarding-modal-container';
    let container = document.getElementById(containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }
    
    const onClose = () => {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    };
    
    ReactDOM.render(
      <SchoolOnboardingModal 
        isOpen={true} 
        onClose={onClose} 
        tenantId={tenantId}
      />,
      container
    );
  };

})(window);
