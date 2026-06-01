/* os-ai-tools.jsx - NEXT AI Command Center: Tools, Automation, Analytics */

const AI_TOOLS = [
  {
    id: 'doc-ai', name: 'NEXT Docs', desc: 'Extract, classify, and process documents automatically using AI.',
    status: 'active', usage: 847, icon: 'N', color: 'var(--mint)',
    stats: { processed: '12.4K', accuracy: '96.2%', avgTime: '1.8s' },
  },
  {
    id: 'chat-ai', name: 'NEXT Assistant', desc: 'AI-powered chat assistant for internal queries, client support, and knowledge base.',
    status: 'active', usage: 2340, icon: 'N', color: 'var(--mint)',
    stats: { conversations: '2.3K', resolved: '89%', avgResponse: '0.4s' },
  },
  {
    id: 'analytics-ai', name: 'NEXT Insights', desc: 'Forecast trends, detect anomalies, and generate insights from project data.',
    status: 'active', usage: 412, icon: 'N', color: 'var(--emerald)',
    stats: { predictions: '1.8K', accuracy: '91.5%', datasets: '24' },
  },
  {
    id: 'auto-ai', name: 'NEXT Flow', desc: 'Design and deploy automated workflows across client operating systems.',
    status: 'active', usage: 1560, icon: 'N', color: 'var(--gold)',
    stats: { workflows: '67', executions: '14.2K', successRate: '98.7%' },
  },
  {
    id: 'code-ai', name: 'NEXT Code', desc: 'AI-assisted code generation, review, and deployment for NEXT projects.',
    status: 'beta', usage: 234, icon: 'N', color: 'var(--info)',
    stats: { generated: '4.2K lines', reviewed: '890 PRs', saved: '~120h' },
  },
  {
    id: 'report-ai', name: 'NEXT Reports', desc: 'Auto-generate client reports, financial summaries, and project status updates.',
    status: 'active', usage: 156, icon: 'N', color: 'var(--emerald)',
    stats: { reports: '342', templates: '18', clients: '12' },
  },
];

const RECENT_OPS = [
  { tool: 'NEXT Docs', action: 'Processed 48 invoices for KCCA Kampala', time: '15m ago', status: 'success' },
  { tool: 'NEXT Assistant', action: 'Resolved: "How to access Builder dashboard?" for Nairobi Hub', time: '32m ago', status: 'success' },
  { tool: 'NEXT Flow', action: 'Executed: Monthly membership renewal pipeline', time: '1h ago', status: 'success' },
  { tool: 'NEXT Insights', action: 'Generated Q3 revenue forecast for board review', time: '2h ago', status: 'success' },
  { tool: 'NEXT Code', action: 'PR #247: Auto-fix Safaricom queue processor null pointer', time: '3h ago', status: 'review' },
  { tool: 'NEXT Reports', action: 'Weekly status report - 6 active projects', time: '5h ago', status: 'success' },
  { tool: 'NEXT Flow', action: 'Alert: Safaricom auto-restart workflow triggered', time: '6h ago', status: 'warning' },
  { tool: 'NEXT Docs', action: 'Classified 120 training certificates for UBA Group', time: '1d ago', status: 'success' },
];

/* -- AI Command Terminal -- */
const AITerminal = () => {
  const [input, setInput] = React.useState('');
  const [history, setHistory] = React.useState([
    { type: 'system', text: 'NEXT AI Command Center v2.1 - Connected to 6 active operating systems' },
    { type: 'system', text: 'Type a command or ask a question. Try: "status all", "alert summary", "generate report"' },
  ]);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  const handleCommand = (cmd) => {
    if (!cmd.trim()) return;
    const newHistory = [...history, { type: 'user', text: cmd }];

    const lower = cmd.toLowerCase().trim();
    let response;

    if (lower.includes('status') && lower.includes('all')) {
      response = {
        type: 'response', text:
`System Status Report - ${new Date().toLocaleString()}
----------------------------------------
 Digital Services Platform  [HEALTHY]  Uptime: 99.7%  Progress: 67%
 AI Operations Suite        [WARNING]  Uptime: 98.2%  Progress: 42%
 Smart Campus               [HEALTHY]  Uptime: 99.9%  Progress: 89%
 Process Automation          [CRITICAL] Uptime: 94.1%  Progress: 31%
 Citizen Portal              [HEALTHY]  Uptime: 99.4%  Progress: 55%
 Digital Membership OS       [HEALTHY]  Uptime: 99.9%  Progress: 72%
----------------------------------------
4 Healthy | 1 Warning | 1 Critical - 15 active alerts total` };
    } else if (lower.includes('alert')) {
      response = {
        type: 'response', text:
`Active Alert Summary
---------------------
 CRITICAL: Safaricom - Production server unresponsive (45m ago)
 ERROR:    Safaricom - Workflow engine crash: null pointer (1h ago)
 ERROR:    Safaricom - Failed deployment rollback on staging (3h ago)
 ERROR:    UBA - API rate limit exceeded on AI endpoint (2h ago)
 WARNING:  UBA - DB connection pool at 85% capacity (3h ago)
 WARNING:  Uganda ICT - SSL cert expires in 14 days (6h ago)
---------------------
Recommendation: Priority 1 - Safaricom needs immediate attention.`};
    } else if (lower.includes('member') || lower.includes('card')) {
      response = {
        type: 'response', text:
`Membership Overview
-------------------
Catalyst:  623 members  | $92,877/mo | Static cards
Builder:   187 members  | $139,963/mo | Dynamic refresh
Architect:  37 members  | $110,963/mo | Dynamic+ premium
-------------------
Total: 847 members | $343,803 MRR | +24 new this month`};
    } else if (lower.includes('generate') && lower.includes('report')) {
      response = { type: 'response', text: `Generating weekly status report...\nOK Project data compiled (6 projects)\nOK Financial summary attached ($284K revenue)\nOK Alert digest included (15 alerts)\nOK Membership metrics added (847 members)\n\nReport generated -> Sent to hudson@nextafrica.ai` };
    } else if (lower.includes('help') || lower === '?') {
      response = { type: 'response', text: `Available Commands:\n-------------------\nstatus all      - View all project health\nalert summary   - View active alerts\nmembers         - Membership overview\ngenerate report - Create weekly status report\nrevenue         - Financial summary\npredict [topic] - Run predictive analysis\ndeploy [project]- Trigger deployment\nhelp            - Show this menu` };
    } else if (lower.includes('revenue') || lower.includes('financ')) {
      response = { type: 'response', text: `Financial Summary - May 2026\n-------------------\nRevenue:  $310K (+9.2% MoM)\nExpenses: $142K (+8.4% MoM)\nNet:      $168K (+10.1% MoM)\n-------------------\nTop source: Project contracts (65%)\nGrowing:   Membership MRR (+24 members)` };
    } else {
      response = { type: 'response', text: `Processing: "${cmd}"\n\nI understand your request. In a production environment, NEXT AI would route this to the appropriate module.\n\nTry: "status all", "alert summary", "members", "generate report", or "help"` };
    }

    setHistory([...newHistory, response]);
    setInput('');
  };

  return (
    <div style={{
      background: '#0a0a14', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 16px', background: '#0e0e1a',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }}></span>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }}></span>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }}></span>
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginLeft: 8 }}>
          next-ai - command center
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--mint)', background: 'rgba(0,252,143,0.1)', padding: '2px 8px', borderRadius: 3 }}>CONNECTED</span>
      </div>
      <div ref={scrollRef} style={{ padding: 16, height: 260, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7 }}>
        {history.map((entry, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            {entry.type === 'system' && <span style={{ color: 'var(--text-tertiary)' }}>{'>'} {entry.text}</span>}
            {entry.type === 'user' && <span style={{ color: 'var(--mint)' }}>next@ai ~ $ {entry.text}</span>}
            {entry.type === 'response' && <pre style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{entry.text}</pre>}
          </div>
        ))}
      </div>
      <div style={{
        padding: '10px 16px', borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: 'var(--mint)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>next@ai ~ $</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCommand(input)}
          placeholder="Type a command..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 12,
          }}
        />
      </div>
    </div>
  );
};

/* -- AI Tools Page -- */
const AIToolsPage = ({ onNavigate }) => {
  const [mounted, setMounted] = React.useState(false);
  const [selectedTool, setSelectedTool] = React.useState(null);
  React.useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const totalOps = AI_TOOLS.reduce((s, t) => s + t.usage, 0);

  const sectionStyle = {
    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)', padding: 22,
  };

  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: 'all 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          AI <span style={{ color: 'var(--mint)' }}>Command Center</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
          {totalOps.toLocaleString()} AI operations this month across {AI_TOOLS.length} active modules.
        </p>
      </div>

      {/* Terminal */}
      <div style={{ marginBottom: 20 }}>
        <AITerminal />
      </div>

      {/* Tools Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {AI_TOOLS.map(tool => (
          <div key={tool.id} onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)} style={{
            ...sectionStyle, cursor: 'pointer', transition: 'all 0.2s',
            border: selectedTool === tool.id ? `1px solid ${tool.color}40` : '1px solid var(--border-subtle)',
          }} className="project-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, color: tool.color }}>{tool.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{tool.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: tool.status === 'beta' ? 'var(--gold)' : 'var(--mint)', textTransform: 'uppercase', marginTop: 2 }}>
                    {tool.status === 'beta' ? ' BETA' : ' ACTIVE'}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {tool.usage.toLocaleString()} ops
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>{tool.desc}</p>

            {/* Expanded Stats */}
            {selectedTool === tool.id && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingTop: 12,
                borderTop: '1px solid var(--border-subtle)', marginTop: 4,
              }}>
                {Object.entries(tool.stats).map(([key, val]) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div style={{ fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 700, color: tool.color }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent AI Operations */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Recent AI Operations</div>
        {RECENT_OPS.map((op, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0',
            borderBottom: i < RECENT_OPS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <span style={{
              fontSize: 8, marginTop: 5,
              color: op.status === 'success' ? 'var(--mint)' : op.status === 'warning' ? 'var(--gold)' : 'var(--info)',
            }}></span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{op.action}</span>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {op.tool} - {op.time}
              </div>
            </div>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
              color: op.status === 'success' ? 'var(--mint)' : op.status === 'warning' ? 'var(--gold)' : 'var(--info)',
              background: op.status === 'success' ? 'var(--mint-glow)' : op.status === 'warning' ? 'var(--gold-glow)' : 'rgba(59,130,246,0.1)',
              padding: '2px 8px', borderRadius: 3, textTransform: 'uppercase',
            }}>{op.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { AIToolsPage });
