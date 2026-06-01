/* os-projects.jsx - Projects Dashboard: Status Monitoring, Credential Vault, System Health */

const PROJECT_DATA = [
  {
    id: 'proj-001', name: 'Digital Services Platform', client: 'Ministry of ICT, Uganda',
    status: 'active', health: 'healthy', progress: 67, priority: 'high',
    platform: 'Supabase + Next.js', domain: 'services.gov.ug',
    team: ['HT', 'AO', 'DM'], startDate: '2026-01-15', deadline: '2026-07-30',
    credentials: { supabaseUrl: 'https://xyzabc.supabase.co', supabaseKey: 'eyJhbG...redacted', adminEmail: 'admin@ict.gov.ug' },
    uptime: 99.7, lastDeploy: '2 days ago', errors24h: 0, warnings24h: 1,
    alerts: [{ type: 'warning', msg: 'SSL certificate expires in 14 days', time: '6h ago' }],
    milestones: [
      { name: 'Phase 1 - Auth & Portal', done: true },
      { name: 'Phase 2 - Service Registry', done: true },
      { name: 'Phase 3 - Payment Integration', done: false },
      { name: 'Phase 4 - Public Launch', done: false },
    ],
  },
  {
    id: 'proj-002', name: 'AI Operations Suite', client: 'UBA Group',
    status: 'active', health: 'warning', progress: 42, priority: 'high',
    platform: 'Supabase + React', domain: 'ai.ubagroup.com',
    team: ['HT', 'GN'], startDate: '2026-03-01', deadline: '2026-09-15',
    credentials: { supabaseUrl: 'https://ubaabc.supabase.co', supabaseKey: 'eyJhbG...redacted', adminEmail: 'tech@ubagroup.com' },
    uptime: 98.2, lastDeploy: '5 hours ago', errors24h: 3, warnings24h: 7,
    alerts: [
      { type: 'error', msg: 'API rate limit exceeded - AI inference endpoint', time: '2h ago' },
      { type: 'warning', msg: 'Database connection pool at 85% capacity', time: '3h ago' },
      { type: 'warning', msg: 'Slow query detected: analytics_aggregate (2.4s)', time: '5h ago' },
    ],
    milestones: [
      { name: 'Phase 1 - Data Pipeline', done: true },
      { name: 'Phase 2 - AI Model Integration', done: false },
      { name: 'Phase 3 - Dashboard & Reporting', done: false },
    ],
  },
  {
    id: 'proj-003', name: 'Smart Campus', client: 'University of Lagos',
    status: 'review', health: 'healthy', progress: 89, priority: 'medium',
    platform: 'Supabase + Vue.js', domain: 'smart.unilag.edu.ng',
    team: ['DM', 'EA'], startDate: '2025-11-01', deadline: '2026-06-01',
    credentials: { supabaseUrl: 'https://unilag.supabase.co', supabaseKey: 'eyJhbG...redacted', adminEmail: 'ict@unilag.edu.ng' },
    uptime: 99.9, lastDeploy: '1 week ago', errors24h: 0, warnings24h: 0,
    alerts: [],
    milestones: [
      { name: 'Phase 1 - Student Portal', done: true },
      { name: 'Phase 2 - Faculty Systems', done: true },
      { name: 'Phase 3 - Analytics Dashboard', done: true },
      { name: 'Phase 4 - QA & Handoff', done: false },
    ],
  },
  {
    id: 'proj-004', name: 'Process Automation', client: 'Safaricom',
    status: 'active', health: 'critical', progress: 31, priority: 'critical',
    platform: 'Supabase + Next.js', domain: 'auto.safaricom.internal',
    team: ['HT', 'WK', 'JP'], startDate: '2026-04-10', deadline: '2026-10-30',
    credentials: { supabaseUrl: 'https://safcom.supabase.co', supabaseKey: 'eyJhbG...redacted', adminEmail: 'devops@safaricom.co.ke' },
    uptime: 94.1, lastDeploy: '12 hours ago', errors24h: 12, warnings24h: 18,
    alerts: [
      { type: 'critical', msg: 'Production server unresponsive - auto-restart triggered', time: '45m ago' },
      { type: 'error', msg: 'Workflow engine crash: null pointer in queue processor', time: '1h ago' },
      { type: 'error', msg: 'Failed deployment rollback on staging', time: '3h ago' },
      { type: 'warning', msg: 'Memory usage at 92% on primary node', time: '4h ago' },
    ],
    milestones: [
      { name: 'Phase 1 - Workflow Engine', done: true },
      { name: 'Phase 2 - Integration Layer', done: false },
      { name: 'Phase 3 - Auto-scaling', done: false },
      { name: 'Phase 4 - Production Deploy', done: false },
    ],
  },
  {
    id: 'proj-005', name: 'Citizen Portal', client: 'KCCA Kampala',
    status: 'active', health: 'healthy', progress: 55, priority: 'medium',
    platform: 'Supabase + React', domain: 'portal.kcca.go.ug',
    team: ['GN', 'JP'], startDate: '2026-02-20', deadline: '2026-08-15',
    credentials: { supabaseUrl: 'https://kcca.supabase.co', supabaseKey: 'eyJhbG...redacted', adminEmail: 'digital@kcca.go.ug' },
    uptime: 99.4, lastDeploy: '3 days ago', errors24h: 0, warnings24h: 2,
    alerts: [{ type: 'warning', msg: 'CDN cache hit ratio dropped to 74%', time: '1d ago' }],
    milestones: [
      { name: 'Phase 1 - Citizen Registration', done: true },
      { name: 'Phase 2 - Service Requests', done: true },
      { name: 'Phase 3 - Payments & Receipts', done: false },
      { name: 'Phase 4 - Mobile App', done: false },
    ],
  },
  {
    id: 'proj-006', name: 'Digital Membership OS', client: 'NEXT Africa (Internal)',
    status: 'active', health: 'healthy', progress: 72, priority: 'high',
    platform: 'Supabase + React', domain: 'os.nextafrica.ai',
    team: ['HT'], startDate: '2026-04-01', deadline: '2026-06-30',
    credentials: { supabaseUrl: 'https://nextos.supabase.co', supabaseKey: 'eyJhbG...redacted', adminEmail: 'hudson@nextafrica.ai' },
    uptime: 99.9, lastDeploy: '1 hour ago', errors24h: 0, warnings24h: 0,
    alerts: [],
    milestones: [
      { name: 'Phase 1 - Dashboard & Shell', done: true },
      { name: 'Phase 2 - Card System', done: true },
      { name: 'Phase 3 - Full Module Build', done: false },
      { name: 'Phase 4 - Production Deploy', done: false },
    ],
  },
];

const HEALTH_CONFIG = {
  healthy: { color: 'var(--mint)', label: 'Healthy', icon: '' },
  warning: { color: 'var(--gold)', label: 'Warning', icon: '' },
  critical: { color: 'var(--danger)', label: 'Critical', icon: '' },
};

const ALERT_COLORS = { critical: '#FF4757', error: '#FF6B6B', warning: '#FFB400', info: '#3B82F6' };

/* -- Health Badge -- */
const HealthBadge = ({ health }) => {
  const cfg = HEALTH_CONFIG[health];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11,
      fontFamily: 'var(--font-mono)', fontWeight: 600, color: cfg.color,
      background: `${cfg.color}15`, padding: '3px 10px', borderRadius: 4,
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      <span style={{ fontSize: 8 }}>{cfg.icon}</span> {cfg.label}
    </span>
  );
};

/* -- Credential Vault Row -- */
const CredentialRow = ({ label, value, hidden }) => {
  const [shown, setShown] = React.useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 100 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hidden && !shown ? '******************' : value}
        </span>
        {hidden && (
          <button onClick={() => setShown(!shown)} style={{
            background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 4,
            color: 'var(--text-tertiary)', fontSize: 10, padding: '2px 8px', cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
          }}>{shown ? 'HIDE' : 'SHOW'}</button>
        )}
        <button onClick={() => navigator.clipboard?.writeText(value)} style={{
          background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 4,
          color: 'var(--text-tertiary)', fontSize: 10, padding: '2px 8px', cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
        }}>COPY</button>
      </div>
    </div>
  );
};

/* -- Project Detail Panel -- */
const ProjectDetail = ({ project, onBack }) => {
  const [tab, setTab] = React.useState('overview');
  const p = project;
  const hCfg = HEALTH_CONFIG[p.health];

  const sectionStyle = {
    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)', padding: 20,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
          padding: '6px 12px', cursor: 'pointer', fontSize: 13,
        }}>{'<- Back'}</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {p.name}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{p.client}</div>
        </div>
        <HealthBadge health={p.health} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
        {['overview', 'alerts', 'credentials', 'milestones'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 14px', border: 'none', borderRadius: 'var(--radius-sm)',
            background: tab === t ? 'var(--bg-elevated)' : 'transparent',
            color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
            textTransform: 'capitalize', transition: 'all 0.2s',
          }}>{t === 'alerts' ? `Alerts (${p.alerts.length})` : t}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={sectionStyle}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>System Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Uptime', value: `${p.uptime}%`, color: p.uptime > 99 ? 'var(--mint)' : p.uptime > 97 ? 'var(--gold)' : 'var(--danger)' },
                { label: 'Last Deploy', value: p.lastDeploy, color: 'var(--text-primary)' },
                { label: 'Errors (24h)', value: p.errors24h, color: p.errors24h > 0 ? 'var(--danger)' : 'var(--mint)' },
                { label: 'Warnings (24h)', value: p.warnings24h, color: p.warnings24h > 5 ? 'var(--gold)' : 'var(--text-primary)' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={sectionStyle}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Project Info</div>
            {[
              { label: 'Platform', value: p.platform },
              { label: 'Domain', value: p.domain },
              { label: 'Priority', value: p.priority.toUpperCase() },
              { label: 'Progress', value: `${p.progress}%` },
              { label: 'Deadline', value: p.deadline },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.label}</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>{r.value}</span>
              </div>
            ))}
            {/* Progress bar */}
            <div style={{ marginTop: 12, height: 6, background: 'var(--bg-deep)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${p.progress}%`, height: '100%', borderRadius: 3, background: p.progress > 75 ? 'var(--mint)' : p.progress > 40 ? 'var(--emerald)' : 'var(--info)', transition: 'width 1s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div style={sectionStyle}>
          {p.alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>OK</div>
              <div style={{ fontSize: 14 }}>No active alerts. All systems operational.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.alerts.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14,
                  background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)',
                  borderLeft: `3px solid ${ALERT_COLORS[a.type]}`,
                }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: ALERT_COLORS[a.type], fontWeight: 700, textTransform: 'uppercase', minWidth: 60 }}>{a.type}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, lineHeight: 1.4 }}>{a.msg}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Credentials Tab */}
      {tab === 'credentials' && (
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Credential Vault</div>
            <div style={{ fontSize: 10, color: 'var(--mint)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8 }}></span> ENCRYPTED
            </div>
          </div>
          <CredentialRow label="Supabase URL" value={p.credentials.supabaseUrl} />
          <CredentialRow label="API Key" value={p.credentials.supabaseKey} hidden />
          <CredentialRow label="Admin Email" value={p.credentials.adminEmail} />
          <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>
            Credentials are AES-256 encrypted at rest. Access is logged and restricted to admin roles.
          </div>
        </div>
      )}

      {/* Milestones Tab */}
      {tab === 'milestones' && (
        <div style={sectionStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {p.milestones.map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: 14,
                background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)',
                opacity: m.done ? 0.7 : 1,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: m.done ? 'var(--mint)' : 'var(--bg-surface)',
                  border: m.done ? 'none' : '2px solid var(--border-default)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#140035', fontSize: 12, fontWeight: 700,
                }}>
                  {m.done ? 'OK' : i + 1}
                </div>
                <span style={{
                  fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
                  textDecoration: m.done ? 'line-through' : 'none',
                  textDecorationColor: 'var(--text-tertiary)',
                }}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


/* -- Add Project Modal -- */
const AddProjectModal = ({ onSave, onClose }) => {
  const [name, setName] = React.useState('');
  const [client, setClient] = React.useState('');
  const [status, setStatus] = React.useState('active');
  const [health, setHealth] = React.useState('healthy');
  const [progress, setProgress] = React.useState('0');
  const [platform, setPlatform] = React.useState('');
  const [deadline, setDeadline] = React.useState('');
  const canSubmit = name.trim().length >= 2;
  const inputStyle = { width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' };
  const labelStyle = { fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1.5, color: 'var(--text-tertiary)', marginBottom: 6, display: 'block', textTransform: 'uppercase' };
  const submit = (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;
    onSave({ name: name.trim(), client: client.trim(), status, health, progress: Number(progress) || 0, platform: platform.trim(), deadline });
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,0,18,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 40px rgba(0,252,143,0.08)' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 2, color: 'var(--text-tertiary)', marginBottom: 6 }}>NEW PROJECT</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add a project</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={labelStyle}>Project name *</label><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Citizen Portal Rebuild" autoFocus /></div>
          <div><label style={labelStyle}>Client</label><input style={inputStyle} value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. KCCA Kampala" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Status</label>
              <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option><option value="planning">Planning</option><option value="paused">Paused</option><option value="completed">Completed</option>
              </select></div>
            <div><label style={labelStyle}>Health</label>
              <select style={inputStyle} value={health} onChange={(e) => setHealth(e.target.value)}>
                <option value="healthy">Healthy</option><option value="warning">Warning</option><option value="critical">Critical</option>
              </select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 160px', gap: 12 }}>
            <div><label style={labelStyle}>Progress %</label><input style={inputStyle} type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} /></div>
            <div><label style={labelStyle}>Platform</label><input style={inputStyle} value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="e.g. Supabase + React" /></div>
            <div><label style={labelStyle}>Deadline</label><input style={inputStyle} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          </div>
        </div>
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', padding: '10px 18px', borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={!canSubmit} style={{ background: canSubmit ? 'var(--mint)' : 'var(--bg-elevated)', border: '1px solid ' + (canSubmit ? 'var(--mint)' : 'var(--border-default)'), color: canSubmit ? 'var(--text-inverse)' : 'var(--text-tertiary)', padding: '10px 22px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>Add project</button>
        </div>
      </form>
    </div>
  );
};

/* -- Projects Page -- */
const ProjectsPage = ({ onNavigate }) => {
  const [mounted, setMounted] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState(null);
  const [filter, setFilter] = React.useState('all');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [projects, setProjects] = React.useState(() => {
    const userProjects = (window.OS_DATA && window.OS_DATA.getProjects) ? window.OS_DATA.getProjects().filter(p => p.addedByUser) : [];
    return PROJECT_DATA.concat(userProjects);
  });
  React.useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  const totalAlerts = projects.reduce((s, p) => s + (p.alerts ? p.alerts.length : 0), 0);
  const criticalCount = projects.filter(p => p.health === 'critical').length;
  const warningCount = projects.filter(p => p.health === 'warning').length;
  const filtered = filter === 'all' ? projects : projects.filter(p => p.health === filter);

  const handleAdd = (input) => {
    if (window.OS_DATA && window.OS_DATA.addProject) {
      window.OS_DATA.addProject(input);
      const userProjects = window.OS_DATA.getProjects().filter(p => p.addedByUser);
      setProjects(PROJECT_DATA.concat(userProjects));
    }
    setShowAddModal(false);
  };

  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: 'all 0.4s ease' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Projects <span style={{ color: 'var(--mint)' }}>Command</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
            Monitor all deployed operating systems. {totalAlerts > 0 && <span style={{ color: 'var(--gold)' }}>{totalAlerts} active alert{totalAlerts > 1 ? 's' : ''} across projects.</span>}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '10px 18px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 24px rgba(0,252,143,0.2)' }}>
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: -2 }}>+</span> Add Project
        </button>
        {showAddModal && <AddProjectModal onSave={handleAdd} onClose={() => setShowAddModal(false)} />}
      </div>

      {/* Health Summary Bar */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div style={{
          display: 'flex', gap: 12, marginBottom: 20, padding: 16,
          background: criticalCount > 0 ? 'rgba(255,71,87,0.08)' : 'rgba(255,180,0,0.06)',
          border: `1px solid ${criticalCount > 0 ? 'rgba(255,71,87,0.2)' : 'rgba(255,180,0,0.15)'}`,
          borderRadius: 'var(--radius-md)', alignItems: 'center',
        }}>
          <span style={{ fontSize: 18 }}>{criticalCount > 0 ? '!' : ''}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: criticalCount > 0 ? 'var(--danger)' : 'var(--gold)' }}>
              {criticalCount > 0 ? `${criticalCount} system${criticalCount > 1 ? 's' : ''} critical` : `${warningCount} system${warningCount > 1 ? 's' : ''} with warnings`}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 8 }}>- Immediate attention required</span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'all', label: `All (${projects.length})` },
          { id: 'critical', label: `Critical (${criticalCount})` },
          { id: 'warning', label: `Warning (${warningCount})` },
          { id: 'healthy', label: `Healthy (${projects.filter(p => p.health === 'healthy').length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12,
            fontFamily: 'var(--font-body)', cursor: 'pointer', fontWeight: 500,
            background: filter === f.id ? 'var(--bg-elevated)' : 'transparent',
            border: `1px solid ${filter === f.id ? 'var(--border-active)' : 'var(--border-subtle)'}`,
            color: filter === f.id ? 'var(--mint)' : 'var(--text-tertiary)',
            transition: 'all 0.15s',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Project Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(p => (
          <div key={p.id} onClick={() => setSelectedProject(p)} style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
            border: `1px solid ${p.health === 'critical' ? 'rgba(255,71,87,0.2)' : p.health === 'warning' ? 'rgba(255,180,0,0.12)' : 'var(--border-subtle)'}`,
            padding: 20, cursor: 'pointer', transition: 'all 0.2s',
            display: 'grid', gridTemplateColumns: '1fr auto',
          }} className="project-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                <HealthBadge health={p.health} />
                {p.alerts.length > 0 && (
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: ALERT_COLORS[p.alerts[0].type], background: `${ALERT_COLORS[p.alerts[0].type]}12`, padding: '2px 8px', borderRadius: 3 }}>
                    {p.alerts.length} alert{p.alerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{p.client}</div>
              <div style={{ display: 'flex', gap: 20, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                <span>Uptime: <span style={{ color: p.uptime > 99 ? 'var(--mint)' : p.uptime > 97 ? 'var(--gold)' : 'var(--danger)' }}>{p.uptime}%</span></span>
                <span>Platform: {p.platform.split(' + ')[0]}</span>
                <span>Deploy: {p.lastDeploy}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>{p.progress}%</div>
              <div style={{ width: 80, height: 4, background: 'var(--bg-deep)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${p.progress}%`, height: '100%', borderRadius: 2, background: p.progress > 75 ? 'var(--mint)' : p.progress > 40 ? 'var(--emerald)' : 'var(--info)' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { ProjectsPage, PROJECT_DATA });

Object.assign(window, { ProjectsPage, AddProjectModal });
