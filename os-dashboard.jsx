/* os-dashboard.jsx - NEXT OS Command Center Dashboard */

const DashboardKPI = ({ label, value, change, positive, icon, accentColor }) => {
  const kpiStyles = {
    card: {
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      border: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    iconWrap: {
      width: 36, height: 36, borderRadius: 8,
      background: accentColor ? `${accentColor}15` : 'var(--mint-glow)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: accentColor || 'var(--mint)',
    },
    value: {
      fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
      color: 'var(--text-primary)', letterSpacing: '0.02em', lineHeight: 1,
    },
    label: {
      fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-tertiary)',
      fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase',
    },
    change: {
      fontFamily: 'var(--font-mono)', fontSize: 12,
      color: positive ? 'var(--mint)' : 'var(--danger)',
      display: 'flex', alignItems: 'center', gap: 4,
    },
    glow: {
      position: 'absolute', top: -30, right: -30, width: 80, height: 80,
      borderRadius: '50%', filter: 'blur(30px)', opacity: 0.08,
      background: accentColor || 'var(--mint)',
      pointerEvents: 'none',
    }
  };

  return (
    <div style={kpiStyles.card} className="kpi-card">
      <div style={kpiStyles.glow}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={kpiStyles.iconWrap}>{icon}</div>
        <div style={kpiStyles.change}>
          <span>{positive ? '' : ''}</span> {change}
        </div>
      </div>
      <div>
        <div style={kpiStyles.value}>{value}</div>
        <div style={{ height: 4 }}></div>
        <div style={kpiStyles.label}>{label}</div>
      </div>
    </div>
  );
};

const ActivityItem = ({ text, time, type }) => {
  const dotColors = {
    member: 'var(--mint)', project: 'var(--info)', training: 'var(--gold)', card: 'var(--emerald)',
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
        background: dotColors[type] || 'var(--mint)',
        boxShadow: `0 0 6px ${dotColors[type] || 'var(--mint)'}`,
      }}></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>{time}</div>
      </div>
    </div>
  );
};

const QuickAction = ({ label, icon, onClick }) => (
  <button onClick={onClick} style={{
    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)', padding: '12px 16px',
    color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-body)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
    transition: 'all 0.2s', width: '100%',
  }} className="quick-action-btn">
    <span style={{ color: 'var(--mint)', fontSize: 16 }}>{icon}</span>
    {label}
  </button>
);

const ProjectRow = ({ client, project, status, progress }) => {
  const statusColors = { Active: 'var(--mint)', Review: 'var(--gold)', Paused: 'var(--text-tertiary)' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 80px 120px',
      padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
      fontSize: 13, alignItems: 'center',
    }}>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{client}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{project}</span>
      <span style={{
        color: statusColors[status], fontFamily: 'var(--font-mono)', fontSize: 11,
        background: `${statusColors[status]}12`, padding: '3px 8px', borderRadius: 4,
        textAlign: 'center', fontWeight: 600,
      }}>{status}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1, height: 4, background: 'var(--bg-deep)', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`, height: '100%', borderRadius: 2,
            background: progress > 75 ? 'var(--mint)' : progress > 40 ? 'var(--emerald)' : 'var(--info)',
            transition: 'width 1s ease',
          }}></div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', minWidth: 28, textAlign: 'right' }}>{progress}%</span>
      </div>
    </div>
  );
};

const MiniChart = ({ data, color = 'var(--mint)', height = 40, width = 120 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height * 0.8) - height * 0.1;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace(/[^a-z]/gi,'')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const DashboardPage = ({ onNavigate }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const sectionStyle = {
    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)', padding: 24,
  };
  const sectionTitle = {
    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', letterSpacing: '0.01em', marginBottom: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  };

  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: 'all 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{today}</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
          color: 'var(--text-primary)', margin: 0, letterSpacing: '0.02em',
        }}>
          {greeting}, <span style={{ color: 'var(--mint)' }}>Hudson</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
          Here's your command center overview for NEXT operations.
        </p>
      </div>

      {/* Nia's Watch — what happened while Hudson was away */}
      {window.NiaWatchWidget ? React.createElement(window.NiaWatchWidget) : null}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <DashboardKPI
          label="Active Projects" value="12" change="+3 this month" positive
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>}
        />
        <DashboardKPI
          label="Total Members" value="847" change="+24 this month" positive
          accentColor="var(--emerald)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
        />
        <DashboardKPI
          label="Monthly Revenue" value="$284K" change="+12% MoM" positive
          accentColor="var(--gold)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
        />
        <DashboardKPI
          label="AI Operations" value="1.2K" change="+180 running" positive
          accentColor="var(--info)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
        />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recent Projects */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>
              <span>Active Projects</span>
              <button onClick={() => onNavigate && onNavigate('projects')} style={{
                background: 'none', border: 'none', color: 'var(--mint)', fontSize: 12,
                cursor: 'pointer', fontFamily: 'var(--font-mono)', padding: 0,
              }}>VIEW ALL -></button>
            </div>
            <div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 80px 120px',
                padding: '0 0 8px', fontSize: 11, color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em',
                borderBottom: '1px solid var(--border-default)',
              }}>
                <span>Client</span><span>Project</span><span>Status</span><span>Progress</span>
              </div>
              <ProjectRow client="Ministry of ICT" project="Digital Services Platform" status="Active" progress={67} />
              <ProjectRow client="UBA Group" project="AI Operations Suite" status="Active" progress={42} />
              <ProjectRow client="University of Lagos" project="Smart Campus" status="Review" progress={89} />
              <ProjectRow client="Safaricom" project="Process Automation" status="Active" progress={31} />
              <ProjectRow client="KCCA Kampala" project="Citizen Portal" status="Active" progress={55} />
            </div>
          </div>

          {/* Tier Distribution */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>
              <span>Membership Distribution</span>
              <button onClick={() => onNavigate && onNavigate('members')} style={{
                background: 'none', border: 'none', color: 'var(--mint)', fontSize: 12,
                cursor: 'pointer', fontFamily: 'var(--font-mono)', padding: 0,
              }}>MANAGE -></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { name: 'Catalyst', count: 623, color: 'var(--mint)', data: [10,14,18,22,20,25,30,28,35,38] },
                { name: 'Builder', count: 187, color: 'var(--emerald)', data: [5,8,7,10,12,14,16,15,18,20] },
                { name: 'Architect', count: 37, color: 'var(--gold)', data: [2,3,3,4,5,4,6,7,6,8] },
              ].map(tier => (
                <div key={tier.name} style={{
                  background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)',
                  padding: 16, border: `1px solid ${tier.color}15`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: tier.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {tier.name}
                    </span>
                    <span style={{ fontSize: 20, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {tier.count}
                    </span>
                  </div>
                  <MiniChart data={tier.data} color={tier.color} width={160} height={32} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Activity Feed */}
          <div style={sectionStyle}>
            <div style={sectionTitle}><span>Activity Feed</span></div>
            <div>
              <ActivityItem type="member" text="New Architect member: Kenya Ministry of Digital Economy" time="2 hours ago" />
              <ActivityItem type="project" text="Project milestone: Kampala Smart City - Phase 2 complete" time="4 hours ago" />
              <ActivityItem type="training" text="Training completed: Executive AI Briefing - UBA Group" time="1 day ago" />
              <ActivityItem type="member" text="New Builder member: Nairobi Innovation Hub" time="1 day ago" />
              <ActivityItem type="card" text="Card issued: NXT-2026-0389 - Catalyst tier" time="2 days ago" />
              <ActivityItem type="project" text="New project kickoff: Safaricom Process Automation" time="3 days ago" />
            </div>
          </div>

          {/* Quick Actions */}
          <div style={sectionStyle}>
            <div style={sectionTitle}><span>Quick Actions</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <QuickAction label="Issue Member Card" icon="" onClick={() => onNavigate && onNavigate('members')} />
              <QuickAction label="Create New Project" icon="+" onClick={() => onNavigate && onNavigate('projects')} />
              <QuickAction label="Schedule Training" icon="" />
              <QuickAction label="Generate Report" icon="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { DashboardPage });
