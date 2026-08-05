import React from 'react';
(function () {
  const T = {
    bg: '#0a1029', surface: '#141e3c', surface2: '#1a2548',
    border: 'rgba(255,255,255,0.06)', borderStr: 'rgba(255,255,255,0.10)',
    ink: '#f5f6fa', ink2: 'rgba(245,246,250,0.85)', ink3: 'rgba(245,246,250,0.55)',
    ink4: 'rgba(245,246,250,0.40)', red: '#FF4757', green: '#00FC8F',
    gold: '#FFB400', blue: '#3B82F6',
    font: "'Inter', -apple-system, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    serif: "'Instrument Serif', serif",
  };

  const { useState, useEffect, useRef } = React;

  // Polyfill for SCHOOL_BRAND if the real one hasn't loaded yet. This
  // mutates the SHARED global window.SCHOOL_BRAND — every other component
  // this session reads from it, so this must never contain another real
  // school's identity, or it poisons receipts/headers/etc. for whichever
  // tenant is actually logged in.
  if (!window.SCHOOL_BRAND) {
    const tenantLabel = (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant() : 'school').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    window.SCHOOL_BRAND = {
      config: {
        name: tenantLabel,
        shortName: (tenantLabel.match(/[A-Za-z0-9]/g) || ['S']).slice(0, 2).join('').toUpperCase(),
        motto: '',
        address: '',
        phone: '',
        email: '',
        colors: { primary: '#1a237e', secondary: '#c62828', accent: '#f5f0e8' },
        fonts: { heading: 'Georgia', body: 'Inter' },
        logoUrl: '',
        badgeUrl: ''
      },
      update: async (patch) => {
        window.SCHOOL_BRAND.config = { ...window.SCHOOL_BRAND.config, ...patch };
        window.dispatchEvent(new CustomEvent('school-brand-updated'));
        return new Promise(resolve => setTimeout(resolve, 800)); // fake delay
      },
      getBadgeSvg: () => '<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#1a237e"/><text x="20" y="25" fill="white" font-size="16" text-anchor="middle">' + ((tenantLabel.match(/[A-Za-z0-9]/g) || ['S'])[0]) + '</text></svg>'
    };
  }

  // A tiny dummy component for document header preview
  const DocumentHeaderPreview = ({ brand }) => {
    return (
      <div style={{ padding: '20px', background: '#fff', color: '#000', border: '1px solid #ccc', fontFamily: brand.fonts.body, display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div dangerouslySetInnerHTML={{ __html: window.SCHOOL_BRAND.getBadgeSvg() }} />
        <div>
          <h2 style={{ margin: 0, fontFamily: brand.fonts.heading, color: brand.colors.primary }}>{brand.name}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>{brand.motto}</p>
        </div>
      </div>
    );
  };

  const Tab1Identity = ({ brand, setBrand, saveBrand, isSaving }) => {
    const handleColorChange = (key, val) => {
      setBrand(prev => ({ ...prev, colors: { ...prev.colors, [key]: val } }));
    };
    
    const handleFontChange = (key, val) => {
      setBrand(prev => ({ ...prev, fonts: { ...prev.fonts, [key]: val } }));
    };

    const handleUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => setBrand(prev => ({ ...prev, badgeUrl: e.target.result }));
      reader.readAsDataURL(file);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <section>
          <h3 style={{ color: T.ink, margin: '0 0 16px', fontSize: '18px' }}>Basic Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="School Name" value={brand.name} onChange={v => setBrand(b => ({ ...b, name: v }))} />
            <Input label="Short Name" value={brand.shortName} onChange={v => setBrand(b => ({ ...b, shortName: v }))} />
            <Input label="Motto" value={brand.motto} onChange={v => setBrand(b => ({ ...b, motto: v }))} />
            <Input label="Address" value={brand.address} onChange={v => setBrand(b => ({ ...b, address: v }))} />
            <Input label="Phone" value={brand.phone} onChange={v => setBrand(b => ({ ...b, phone: v }))} />
            <Input label="Email" value={brand.email} onChange={v => setBrand(b => ({ ...b, email: v }))} />
          </div>
        </section>

        <section>
          <h3 style={{ color: T.ink, margin: '0 0 16px', fontSize: '18px' }}>Brand Colors</h3>
          <div style={{ display: 'flex', gap: '24px' }}>
            {Object.keys(brand.colors).map(key => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: T.ink3, textTransform: 'capitalize' }}>{key}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="color" value={brand.colors[key]} onChange={e => handleColorChange(key, e.target.value)} style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} />
                  <Input value={brand.colors[key]} onChange={v => handleColorChange(key, v)} style={{ width: '100px' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', height: '40px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ flex: 2, background: brand.colors.primary }} />
            <div style={{ flex: 1, background: brand.colors.secondary }} />
            <div style={{ flex: 1, background: brand.colors.accent }} />
          </div>
        </section>

        <section>
          <h3 style={{ color: T.ink, margin: '0 0 16px', fontSize: '18px' }}>Fonts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: T.ink3, display: 'block', marginBottom: '8px' }}>Heading Font</label>
              <select value={brand.fonts.heading} onChange={e => handleFontChange('heading', e.target.value)} style={{ width: '100%', padding: '10px', background: T.surface2, border: `1px solid ${T.borderStr}`, color: T.ink, borderRadius: '6px' }}>
                {['Georgia', 'Playfair Display', 'Merriweather', 'Instrument Serif', 'Libre Baskerville'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: T.ink3, display: 'block', marginBottom: '8px' }}>Body Font</label>
              <select value={brand.fonts.body} onChange={e => handleFontChange('body', e.target.value)} style={{ width: '100%', padding: '10px', background: T.surface2, border: `1px solid ${T.borderStr}`, color: T.ink, borderRadius: '6px' }}>
                {['Inter', 'Lato', 'Roboto', 'Nunito', 'Open Sans'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: '16px', padding: '16px', background: '#fff', color: '#000', borderRadius: '6px' }}>
            <h1 style={{ margin: 0, fontFamily: brand.fonts.heading }}>{brand.name}</h1>
            <p style={{ margin: '8px 0 0', fontFamily: brand.fonts.body }}>This is a sample sentence showing the selected body font. It should look clear and legible for school documents.</p>
          </div>
        </section>

        <section>
          <h3 style={{ color: T.ink, margin: '0 0 16px', fontSize: '18px' }}>Logo / Badge</h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Input label="Badge URL" value={brand.badgeUrl} onChange={v => setBrand(b => ({ ...b, badgeUrl: v }))} />
              <div style={{ margin: '16px 0', textAlign: 'center', color: T.ink3, fontSize: '14px' }}>OR</div>
              <div style={{ border: `1px dashed ${T.borderStr}`, padding: '24px', textAlign: 'center', borderRadius: '6px', cursor: 'pointer', background: T.surface2, position: 'relative' }}>
                <input type="file" accept="image/*" onChange={handleUpload} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                <div style={{ color: T.ink2 }}>Drag & Drop Badge Image</div>
                <div style={{ fontSize: '12px', color: T.ink4, marginTop: '4px' }}>PNG, JPG up to 2MB</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 style={{ color: T.ink, margin: '0 0 16px', fontSize: '18px' }}>Document Header Preview</h3>
          <DocumentHeaderPreview brand={brand} />
        </section>

        <div style={{ paddingTop: '16px', borderTop: `1px solid ${T.border}` }}>
          <button onClick={saveBrand} disabled={isSaving} style={{ background: T.green, color: '#000', border: 'none', padding: '12px 24px', borderRadius: '6px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  };

  const Tab2Nia = ({ brand, setBrand }) => {
    const fileRef = useRef(null);
    const canvasRef = useRef(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileDrop = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setResult({ type: 'pdf', name: file.name });
        return;
      }

      setAnalyzing(true);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Analyze image (simplified mockup for demo)
        setTimeout(() => {
          setResult({
            type: 'image',
            name: file.name,
            bg: '#f9f9fb',
            primary: '#2d3748',
            accent: '#e53e3e',
            density: 'Dense / Formal',
            docType: 'Report Card (Estimated)'
          });
          setAnalyzing(false);
        }, 1000);
      };
      img.src = url;
    };

    const applyStyle = () => {
      if (result && result.type === 'image') {
        setBrand(prev => ({
          ...prev,
          colors: { ...prev.colors, primary: result.primary, secondary: result.accent, accent: result.bg }
        }));
        alert('Nia has applied the style.');
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ background: T.surface2, padding: '24px', borderRadius: '8px', border: `1px solid ${T.borderStr}`, display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: T.green, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px' }}>N</div>
          <div style={{ color: T.ink2, fontSize: '15px', lineHeight: 1.5 }}>
            "Drop in any document — a report card, receipt, or letter — and I'll read its design language: the colors, spacing, layout, and feel. Then I'll apply that style to all your school documents."
          </div>
        </div>

        <div style={{ border: `2px dashed ${T.borderStr}`, borderRadius: '12px', padding: '64px 24px', textAlign: 'center', position: 'relative', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
          <input type="file" ref={fileRef} onChange={handleFileDrop} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} accept="image/*,.pdf,.doc,.docx" />
          <div style={{ color: T.ink, fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Drag and drop a sample document here</div>
          <div style={{ color: T.ink4, fontSize: '14px' }}>Supports PNG, JPG, PDF, DOCX</div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {analyzing && <div style={{ color: T.ink, textAlign: 'center' }}>Nia is analyzing your document...</div>}

        {result && result.type === 'pdf' && (
          <div style={{ background: T.surface2, padding: '24px', borderRadius: '8px', textAlign: 'center', color: T.ink }}>
            PDF/DOCX uploaded — Nia will analyze structure on the backend.
          </div>
        )}

        {result && result.type === 'image' && (
          <div style={{ background: T.surface2, padding: '24px', borderRadius: '8px', border: `1px solid ${T.borderStr}` }}>
            <h4 style={{ color: T.green, margin: '0 0 16px', fontSize: '16px' }}>◆ Nia detected:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: T.ink2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Background:</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', background: result.bg, borderRadius: '4px' }}/> {result.bg}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Primary Color:</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', background: result.primary, borderRadius: '4px' }}/> {result.primary}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Accent Color:</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', background: result.accent, borderRadius: '4px' }}/> {result.accent}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Layout:</span>
                <span>{result.density}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Document Type:</span>
                <span>{result.docType}</span>
              </div>
            </div>
            <button onClick={applyStyle} style={{ marginTop: '24px', width: '100%', background: T.blue, color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              Apply This Style
            </button>
          </div>
        )}
      </div>
    );
  };

  const Tab3Preview = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={{ background: T.surface2, color: T.ink, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Export All (ZIP)</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {['Report Card', 'Fee Receipt', 'Financial Statement'].map(doc => (
            <div key={doc} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ color: T.ink, fontWeight: 500 }}>{doc} Preview</div>
              <div style={{ height: '300px', background: '#fff', borderRadius: '4px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Scaled down preview mockup */}
                <div style={{ transform: 'scale(0.5)', width: '200%', height: '200%', transformOrigin: 'top left', padding: '24px', color: '#000' }}>
                  <h1>{window.SCHOOL_BRAND?.config?.name || 'School Name'}</h1>
                  <p>{doc} content layout goes here...</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ flex: 1, background: 'transparent', color: T.blue, border: `1px solid ${T.blue}`, padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Open Full</button>
                <button style={{ flex: 1, background: 'transparent', color: T.ink, border: `1px solid ${T.borderStr}`, padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Export PDF</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Input = ({ label, value, onChange, style = {} }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '12px', color: T.ink3 }}>{label}</label>}
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        style={{ padding: '10px', background: T.surface2, border: `1px solid ${T.borderStr}`, color: T.ink, borderRadius: '6px', ...style }} 
      />
    </div>
  );

  window.SchoolBrandAdmin = function SchoolBrandAdmin() {
    const [activeTab, setActiveTab] = useState(0);
    const [brand, setBrand] = useState(window.SCHOOL_BRAND.config);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      const handleUpdate = () => setBrand(window.SCHOOL_BRAND.config);
      window.addEventListener('school-brand-updated', handleUpdate);
      return () => window.removeEventListener('school-brand-updated', handleUpdate);
    }, []);

    const saveBrand = async () => {
      setIsSaving(true);
      await window.SCHOOL_BRAND.update(brand);
      setIsSaving(false);
      alert('Brand updated successfully!');
    };

    const tabs = ['School Identity', 'Nia Mimic Studio', 'Preview & Export'];

    return (
      <div style={{ background: T.bg, minHeight: '100vh', color: T.ink, fontFamily: T.font, padding: '32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: '0 0 32px' }}>School Brand Admin</h1>
          
          <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${T.border}`, marginBottom: '32px' }}>
            {tabs.map((tab, i) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(i)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: activeTab === i ? T.green : T.ink3,
                  borderBottom: `2px solid ${activeTab === i ? T.green : 'transparent'}`,
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: activeTab === i ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ background: T.surface, padding: '32px', borderRadius: '12px', border: `1px solid ${T.borderStr}` }}>
            {activeTab === 0 && <Tab1Identity brand={brand} setBrand={setBrand} saveBrand={saveBrand} isSaving={isSaving} />}
            {activeTab === 1 && <Tab2Nia brand={brand} setBrand={setBrand} />}
            {activeTab === 2 && <Tab3Preview />}
          </div>
        </div>
      </div>
    );
  };
})();
