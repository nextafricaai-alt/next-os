/* sentinel-ui.jsx - local NEXT Sentinel advisory bridge */

const SentinelPanel = () => {
  const [status, setStatus] = React.useState('connecting');
  const [advisories, setAdvisories] = React.useState([]);

  React.useEffect(() => {
    // Sentinel WebSocket only attempts connection on local development.
    // In production (Hostinger), the backend ws-bridge is not reachable from a
    // static host, so we stay offline and show the fallback copy.
    // Override with ?sentinel=<host>:<port> if running a remote bridge.
    const params = new URLSearchParams(window.location.search);
    const override = params.get('sentinel');
    const isLocal = ['127.0.0.1', 'localhost', ''].includes(window.location.hostname);
    if (!isLocal && !override) {
      setStatus('offline');
      return;
    }
    const target = override
      ? (override.startsWith('ws') ? override : `ws://${override}`)
      : 'ws://127.0.0.1:8787';
    let ws;
    try {
      ws = new WebSocket(target);
      ws.onopen = () => setStatus('connected');
      ws.onclose = () => setStatus('offline');
      ws.onerror = () => setStatus('offline');
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'sentinel.advisory') {
          setAdvisories((items) => [data.advisory, ...items].slice(0, 6));
        }
      };
    } catch (error) {
      setStatus('offline');
    }
    return () => ws && ws.close();
  }, []);

  const latest = advisories[0];
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>NEXT Sentinel</div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: status === 'connected' ? 'var(--mint)' : 'var(--gold)',
          textTransform: 'uppercase'
        }}>{status}</span>
      </div>
      {latest ? (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>{latest.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{latest.message}</div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Monitoring local health, financial signals, and operational thresholds from inside NEXT OS.
        </div>
      )}
    </div>
  );
};

const TEMPLATE_CARDS = [
  { title: 'Schools', type: 'K-12', profile: 'templates/schools/sample-school-profile.json', target: 'data/onboarding/st-marys-demo' },
  { title: 'Churches', type: 'Church', profile: 'templates/churches/sample-church-profile.json', target: 'data/onboarding/grace-chapel-demo' },
  { title: 'NGOs', type: 'Nonprofit', profile: 'templates/ngos/sample-ngo-profile.json', target: 'data/onboarding/hope-program-demo' },
  { title: 'Companies', type: 'Business', profile: 'templates/companies/sample-company-profile.json', target: 'data/onboarding/next-services-demo' },
  { title: 'Organisations', type: 'General', profile: 'templates/organisations/sample-organisation-profile.json', target: 'data/onboarding/community-association-demo' },
];

const SentinelButton = ({ children, onClick }) => (
  <button onClick={onClick} style={{
    background: 'var(--mint)', color: '#140035', border: 'none',
    borderRadius: 'var(--radius-sm)', padding: '9px 14px',
    fontSize: 12, fontWeight: 700, cursor: 'pointer'
  }}>
    {children}
  </button>
);

const SentinelPage = ({ onNavigate }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const sectionStyle = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)', padding: 22
  };
  const itemStyle = {
    padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5
  };

  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: 'all 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              NEXT <span style={{ color: 'var(--mint)' }}>Sentinel</span>
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
              Embedded local supervisory agent for system health, financial intelligence, and board-ready advisories.
            </p>
          </div>
          <SentinelButton onClick={() => onNavigate && onNavigate('onboarding')}>Open Onboarding</SentinelButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Runtime Loops</div>
            {[
              'Observability Loop: Rust daemon writes signed CPU, memory, storage, and database integrity logs.',
              'Reasoning Loop: local LLM prompt engine turns raw state into empathetic institutional advisories.',
              'Action Loop: sandboxed repair engine runs approved recovery actions after preflight checks.'
            ].map(text => <div key={text} style={itemStyle}>{text}</div>)}
          </div>
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Governance</div>
            {[
              'All data remains local to NEXT OS.',
              'Financial recommendations require human board approval.',
              'Recovery actions are least-privilege and restricted to approved targets.',
              'Every failure, recovery action, and advisory is recorded in the local SQLite audit log.'
            ].map(text => <div key={text} style={itemStyle}>{text}</div>)}
          </div>
        </div>
        <div>
          <SentinelPanel />
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Supported Verticals</div>
            {['K-12 schools', 'Higher education institutions', 'Churches', 'NGOs and nonprofits', 'Companies', 'Organisations'].map(text => (
              <div key={text} style={{ ...itemStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }}></span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const OnboardingPage = () => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const sectionStyle = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)', padding: 22
  };

  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: 'all 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Client <span style={{ color: 'var(--mint)' }}>Onboarding</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
          Start from a template, change the client profile, then generate a local Sentinel bundle.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        {TEMPLATE_CARDS.map(card => (
          <div key={card.title} style={sectionStyle}>
            <div style={{ fontSize: 11, color: 'var(--mint)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8 }}>{card.type}</div>
            <div style={{ fontSize: 17, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 10 }}>{card.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              Profile: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{card.profile}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              Output: <span style={{ fontFamily: 'var(--font-mono)' }}>{card.target}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Onboarding Command</div>
        <pre style={{
          margin: 0, padding: 14, background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.7,
          fontFamily: 'var(--font-mono)'
        }}>{`npm.cmd run onboard -- templates/schools/sample-school-profile.json
npm.cmd run aggregator -- data/onboarding/st-marys-demo`}</pre>
      </div>
    </div>
  );
};

Object.assign(window, { SentinelPanel, SentinelPage, OnboardingPage });
