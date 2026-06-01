/* os-shell.jsx - NEXT OS App Shell: Sidebar, Topbar, Routing */

/* -- SVG Icons -- */
const OSIcon = ({ name, size = 20 }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    fleet: <><circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="1.5"/><circle cx="20" cy="6" r="1.5"/><circle cx="4" cy="18" r="1.5"/><circle cx="20" cy="18" r="1.5"/><path d="M12 9L5.5 6.5"/><path d="M12 9L18.5 6.5"/><path d="M12 15L5.5 17.5"/><path d="M12 15L18.5 17.5"/></>,
    talk: <><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></>,
    projects: <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>,
    ai: <><path d="M12 2L3 7l9 5 9-5-9-5z"/><path d="M3 17l9 5 9-5"/><path d="M3 12l9 5 9-5"/></>,
    training: <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></>,
    members: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    comms: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
    billing: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    sentinel: <><path d="M12 2l7 3v6c0 5-3.4 9.4-7 11-3.6-1.6-7-6-7-11V5l7-3z"/><path d="M9 12l2 2 4-5"/></>,
    onboarding: <><path d="M12 5v14"/><path d="M5 12h14"/><rect x="4" y="4" width="16" height="16" rx="3"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    chevronDown: <><polyline points="6 9 12 15 18 9"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

/* -- Navigation Config -- */
const NAV_SECTIONS = [
  { id: 'main', label: 'Main', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'talk', label: 'Talk to Nia', icon: 'talk' },
    { id: 'fleet', label: 'Fleet', icon: 'fleet', badge: 5 },
    { id: 'projects', label: 'Projects', icon: 'projects', badge: 12 },
    { id: 'ai-tools', label: 'AI Tools', icon: 'ai' },
  ]},
  { id: 'manage', label: 'Manage', items: [
    { id: 'training', label: 'Training', icon: 'training' },
    { id: 'members', label: 'Members', icon: 'members', badge: 3 },
    { id: 'comms', label: 'Communications', icon: 'comms' },
  ]},
  { id: 'system', label: 'System', items: [
    { id: 'billing', label: 'Billing', icon: 'billing' },
    { id: 'sentinel', label: 'Nia HQ', icon: 'sentinel' },
    { id: 'onboarding', label: 'Onboarding', icon: 'onboarding' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]},
];

/* -- Sidebar -- */
const Sidebar = ({ activeTab, onTabChange, collapsed, onToggle }) => {
  const sidebarStyles = {
    root: {
      width: collapsed ? 64 : 240, height: '100vh', position: 'fixed',
      left: 0, top: 0, zIndex: 100,
      background: 'var(--bg-elevated)', borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease', overflow: 'hidden',
    },
    logo: {
      padding: collapsed ? '20px 12px' : '20px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', gap: 12, height: 64,
      cursor: 'pointer',
    },
    section: {
      padding: collapsed ? '12px 8px 4px' : '12px 12px 4px',
    },
    sectionLabel: {
      fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
      textTransform: 'uppercase', letterSpacing: '0.12em', padding: '4px 8px',
      marginBottom: 4, opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s',
      whiteSpace: 'nowrap',
    },
    navItem: (isActive) => ({
      display: 'flex', alignItems: 'center', gap: 12,
      padding: collapsed ? '10px 0' : '10px 12px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius: 'var(--radius-sm)', cursor: 'pointer',
      color: isActive ? 'var(--mint)' : 'var(--text-secondary)',
      background: isActive ? 'var(--mint-glow)' : 'transparent',
      transition: 'all 0.15s', fontSize: 13, fontWeight: isActive ? 600 : 400,
      fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', position: 'relative',
      border: 'none', width: '100%', textAlign: 'left',
    }),
    badge: {
      marginLeft: 'auto', fontSize: 10, fontWeight: 700,
      background: 'var(--mint)', color: '#140035',
      borderRadius: 10, padding: '1px 6px', fontFamily: 'var(--font-mono)',
    },
  };

  return (
    <nav style={sidebarStyles.root}>
      {/* Logo */}
      <div style={sidebarStyles.logo} onClick={onToggle}>
        <img 
          src={window.__resources?.faviconLogo || "uploads/NEXT Favicon Transperent Logo@3x.png"} 
          alt="N" style={{ width: 28, height: 28, flexShrink: 0 }} 
        />
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.08em' }}>NEXT</span>
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>DIGITAL OS</span>
          </div>
        )}
      </div>

      {/* Nav Sections */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.id} style={sidebarStyles.section}>
            <div style={sidebarStyles.sectionLabel}>{section.label}</div>
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={sidebarStyles.navItem(activeTab === item.id)}
                className="nav-item"
              >
                <OSIcon name={item.icon} size={18} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge && <span style={sidebarStyles.badge}>{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* User */}
      <div style={{
        padding: collapsed ? '16px 8px' : '16px', borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--mint), var(--emerald))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#140035',
        }}>HT</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Hudson T.</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Admin</div>
          </div>
        )}
      </div>
    </nav>
  );
};

/* -- BellButton — clickable bell with live unread badge -- */
const BellButton = () => {
  const [count, setCount] = React.useState(() => (window.NEXT_OS && window.NEXT_OS.unreadCount) ? window.NEXT_OS.unreadCount() : 0);
  React.useEffect(() => {
    const refresh = () => setCount((window.NEXT_OS && window.NEXT_OS.unreadCount) ? window.NEXT_OS.unreadCount() : 0);
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <button
      onClick={() => window.NEXT_OS && window.NEXT_OS.openNotificationPanel && window.NEXT_OS.openNotificationPanel()}
      title="Notifications"
      style={{
        background: 'none', border: 'none', color: 'var(--text-secondary)',
        cursor: 'pointer', position: 'relative', padding: 4,
      }}>
      <OSIcon name="bell" size={18} />
      {count > 0 && (
        <div style={{
          position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
          padding: '0 4px', borderRadius: 8,
          background: 'var(--mint)', color: '#140035',
          fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 6px rgba(0,252,143,0.5)',
        }}>{count > 99 ? '99+' : count}</div>
      )}
    </button>
  );
};

/* -- Topbar -- */
const Topbar = ({ pageTitle, sidebarWidth }) => {
  const [searchFocused, setSearchFocused] = React.useState(false);

  return (
    <header style={{
      height: 64, position: 'fixed', top: 0, right: 0,
      left: sidebarWidth, zIndex: 90,
      background: 'rgba(10,0,26,0.8)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', transition: 'left 0.25s ease',
    }}>
      {/* Page Title */}
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
        color: 'var(--text-primary)', letterSpacing: '0.03em', margin: 0,
      }}>{pageTitle}</h2>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: searchFocused ? 'var(--bg-surface)' : 'var(--bg-elevated)',
          border: `1px solid ${searchFocused ? 'var(--border-active)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-sm)', padding: '6px 12px',
          transition: 'all 0.2s', width: searchFocused ? 280 : 200,
        }}>
          <OSIcon name="search" size={14} />
          <input
            placeholder="Search..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 13,
              fontFamily: 'var(--font-body)', width: '100%',
            }}
          />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', background: 'var(--bg-deep)', padding: '2px 6px', borderRadius: 3 }}>Ctrl+K</span>
        </div>

        {/* Notifications */}
        <BellButton />

        {/* Time */}
        <div style={{
          fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
        }}>
          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </header>
  );
};

/* -- Placeholder Pages -- */
const PlaceholderPage = ({ title, description, icon }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);
  return (
    <div style={{
      opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)',
      transition: 'all 0.4s ease', display: 'flex', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 160px)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{icon}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', margin: '0 0 8px', fontWeight: 700 }}>{title}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{description}</p>
      </div>
    </div>
  );
};

/* -- Page Titles Map -- */
const PAGE_TITLES = {
  dashboard: 'Command Center',
  talk: 'Talk to Sentinel',
  fleet: 'Mothership Bridge',
  projects: 'Projects Command',
  'ai-tools': 'AI Command Center',
  training: 'Training',
  members: 'Members & Cards',
  comms: 'Communications',
  billing: 'Financial Overview',
  sentinel: 'NEXT Sentinel',
  onboarding: 'Onboarding',
  settings: 'Settings',
};

/* -- Apply Tweaks to CSS Vars -- */
const applyTweaks = (t) => {
  const root = document.documentElement;
  if (t.accentColor) {
    root.style.setProperty('--mint', t.accentColor);
    // Compute glow
    const hex = t.accentColor.replace('#','');
    const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
    root.style.setProperty('--mint-glow', `rgba(${r},${g},${b},0.1)`);
    root.style.setProperty('--mint-glow-strong', `rgba(${r},${g},${b},0.2)`);
  }
  if (t.bgDepth === 'deeper') {
    root.style.setProperty('--bg-deep', '#050010');
    root.style.setProperty('--bg-elevated', '#140035');
    root.style.setProperty('--bg-surface', '#1A0042');
  } else if (t.bgDepth === 'lighter') {
    root.style.setProperty('--bg-deep', '#120030');
    root.style.setProperty('--bg-elevated', '#220058');
    root.style.setProperty('--bg-surface', '#2A0068');
  } else {
    root.style.setProperty('--bg-deep', '#0A001A');
    root.style.setProperty('--bg-elevated', '#1A0042');
    root.style.setProperty('--bg-surface', '#220055');
  }
  if (t.fontScale) {
    root.style.setProperty('font-size', `${t.fontScale}%`);
  }
};

/* -- Main App Shell -- */
const AppShell = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  // Expose tab navigation globally so notifications can drive routing.
  React.useEffect(() => {
    if (typeof window !== 'undefined') window.NEXT_OS_NAVIGATE = (tab) => setActiveTab(tab);
  }, []);
  const sidebarCollapsed = t.sidebarCollapsed;
  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  React.useEffect(() => { applyTweaks(t); }, [t.accentColor, t.bgDepth, t.fontScale]);

  const renderPage = () => {
    if (typeof window !== 'undefined') window.__SENTINEL_HIDE_WIDGET = false;
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'talk':
        if (typeof window !== 'undefined') window.__SENTINEL_HIDE_WIDGET = true;
        return window.TalkToSentinelPage ? React.createElement(window.TalkToSentinelPage) : <PlaceholderPage title="Talk to Nia" description="Agent is loading." icon="" />;
      case 'fleet':
        return window.FleetPage ? React.createElement(window.FleetPage, { onNavigate: setActiveTab }) : <PlaceholderPage title="Mothership Bridge" description="Fleet view is loading." icon="" />;
      case 'members':
        return <MembersPage onNavigate={setActiveTab} />;
      case 'projects':
        return <ProjectsPage onNavigate={setActiveTab} />;
      case 'ai-tools':
        return <AIToolsPage onNavigate={setActiveTab} />;
      case 'billing':
        return <FinancePage onNavigate={setActiveTab} />;
      case 'sentinel':
        return window.SentinelPage ? React.createElement(window.SentinelPage, { onNavigate: setActiveTab }) : <PlaceholderPage title="NEXT Nia" description="The embedded supervisory agent bridge is loading." icon="" />;
      case 'onboarding':
        return window.OnboardingPage ? React.createElement(window.OnboardingPage, { onNavigate: setActiveTab }) : <PlaceholderPage title="Onboarding" description="Template onboarding is loading." icon="" />;
      case 'training':
        return <PlaceholderPage title="Training Programs" description="Manage AI capacity building programs, certifications, and workshop schedules across client organisations." icon="" />;
      case 'comms':
        return <PlaceholderPage title="Communications Hub" description="Reporting, client communications, and digital strategy coordination centre." icon="" />;
      case 'settings':
        return <PlaceholderPage title="Settings" description="System configuration, user management, and platform preferences." icon="Settings" />;
      default:
        return <DashboardPage onNavigate={setActiveTab} />;
    }
  };

  const density = t.density || 'regular';
  const padding = density === 'compact' ? '20px 24px' : density === 'comfortable' ? '36px 40px' : '28px 32px';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }} data-glow={t.cardGlow || 'medium'} data-shine={t.cardShine === false ? 'off' : 'on'}>
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        collapsed={sidebarCollapsed}
        onToggle={() => setTweak('sidebarCollapsed', !sidebarCollapsed)}
      />
      <Topbar pageTitle={PAGE_TITLES[activeTab] || 'Dashboard'} sidebarWidth={sidebarWidth} />
      <main style={{
        marginLeft: sidebarWidth, paddingTop: 64,
        transition: 'margin-left 0.25s ease',
      }}>
        <div style={{ padding, maxWidth: 1200, margin: '0 auto', transition: 'padding 0.25s ease' }}>
          {renderPage()}
        </div>
      </main>

      {/* Dev TweaksPanel: only visible with ?tweaks=1 query param or on localhost.
          Prevents it from leaking into the production deployment. */}
      {(typeof window !== 'undefined' && (
        window.location.search.includes('tweaks=1') ||
        ['127.0.0.1', 'localhost', ''].includes(window.location.hostname)
      )) && (
      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accentColor}
          options={['#00FC8F', '#1B9B6F', '#3B82F6', '#A855F7', '#FFB400']}
          onChange={v => setTweak('accentColor', v)} />
        <TweakRadio label="Background" value={t.bgDepth}
          options={['deeper', 'standard', 'lighter']}
          onChange={v => setTweak('bgDepth', v)} />
        <TweakSection label="Layout" />
        <TweakToggle label="Collapse sidebar" value={t.sidebarCollapsed}
          onChange={v => setTweak('sidebarCollapsed', v)} />
        <TweakRadio label="Density" value={t.density}
          options={['compact', 'regular', 'comfortable']}
          onChange={v => setTweak('density', v)} />
        <TweakSlider label="Font scale" value={t.fontScale} min={80} max={120} step={5} unit="%"
          onChange={v => setTweak('fontScale', v)} />
        <TweakSection label="Cards" />
        <TweakRadio label="Card glow" value={t.cardGlow}
          options={['subtle', 'medium', 'intense']}
          onChange={v => setTweak('cardGlow', v)} />
        <TweakToggle label="Card shine animation" value={t.cardShine}
          onChange={v => setTweak('cardShine', v)} />
      </TweaksPanel>
      )}

      {/* Global notification center — toasts from any module / Nia stack here */}
      {window.NotificationCenter ? React.createElement(window.NotificationCenter) : null}
      {window.NotificationPanel ? React.createElement(window.NotificationPanel) : null}
    </div>
  );
};

Object.assign(window, { AppShell, Sidebar, Topbar, OSIcon, PlaceholderPage });
