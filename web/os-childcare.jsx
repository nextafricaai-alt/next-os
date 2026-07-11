/* os-childcare.jsx — Charis Childcare OS Panel
   Renders as a full NEXT OS page when the 'childcare' tab is active.
   Supervised by Nia. Data mirrors os-data.jsx charis-childcare tenant.
*/

(function () {

  // ── Childcare data seed (mirrors os-data.jsx verticalKpis) ──────────────
  const CHILDCARE_KPIs = {
    enrolled: 24, presentToday: 21, absentToday: 3,
    attendanceRate: 0.875, caretakers: 3, activeParents: 20,
    invoicesDue: 3, invoicesOverdue30d: 1, overdueAmount: 300000,
    totalInvoiced: 2100000, collectionRate: 0.857,
    unreadParentMessages: 5, unansweredMessages24h: 2,
    milestonesThisWeek: 7, activitiesScheduledToday: 4,
  };

  const CHILDREN = [
    { id: 1,  name: 'Aiden Nakamya',   age: 3, mood: '😊', present: true,  nap: false, milestone: 'First full sentence',   invoiceStatus: 'overdue',  parent: 'Mrs. Nakamya',   parentPhone: '256772001001' },
    { id: 2,  name: 'Bella Okello',    age: 2, mood: '😴', present: true,  nap: true,  milestone: 'Counting to 10',         invoiceStatus: 'paid',     parent: 'Ms. Okello',     parentPhone: '256772001002' },
    { id: 3,  name: 'Caleb Ssemanda',  age: 4, mood: '😄', present: true,  nap: false, milestone: 'Drawing shapes',         invoiceStatus: 'paid',     parent: 'Mr. Ssemanda',   parentPhone: '256772001003' },
    { id: 4,  name: 'Daisy Mutebe',    age: 3, mood: '😢', present: false, nap: false, milestone: null,                     invoiceStatus: 'due',      parent: 'Mrs. Mutebe',    parentPhone: '256772001004' },
    { id: 5,  name: 'Ethan Lubega',    age: 2, mood: '😊', present: true,  nap: false, milestone: 'Walking stairs alone',   invoiceStatus: 'paid',     parent: 'Mr. Lubega',     parentPhone: '256772001005' },
    { id: 6,  name: 'Fiona Atim',      age: 4, mood: '😄', present: true,  nap: false, milestone: 'Reading own name',       invoiceStatus: 'paid',     parent: 'Ms. Atim',       parentPhone: '256772001006' },
    { id: 7,  name: 'Grace Wamala',    age: 3, mood: '😊', present: true,  nap: true,  milestone: 'Sharing during play',    invoiceStatus: 'due',      parent: 'Mrs. Wamala',    parentPhone: '256772001007' },
    { id: 8,  name: 'Henry Kato',      age: 2, mood: '😴', present: true,  nap: true,  milestone: null,                     invoiceStatus: 'paid',     parent: 'Mr. Kato',       parentPhone: '256772001008' },
    { id: 9,  name: 'Ivy Kyomuhendo',  age: 4, mood: '😄', present: true,  nap: false, milestone: 'Puzzle (12 pieces)',     invoiceStatus: 'paid',     parent: 'Ms. Kyomuhendo', parentPhone: '256772001009' },
    { id: 10, name: 'Joel Byaruhanga', age: 3, mood: '😊', present: false, nap: false, milestone: null,                     invoiceStatus: 'paid',     parent: 'Mr. Byaruhanga', parentPhone: '256772001010' },
  ];

  const TODAY_SCHEDULE = [
    { time: '07:30', activity: 'Arrival & Free Play',               caretaker: 'Ms. Maria L.',   icon: '🌅', color: '#00FC8F' },
    { time: '09:00', activity: 'Morning Circle & Songs',            caretaker: 'Ms. Maria L.',   icon: '🎵', color: '#A855F7' },
    { time: '09:30', activity: 'Structured Learning — Letters',     caretaker: 'Ms. Faith A.',   icon: '📚', color: '#3B82F6' },
    { time: '10:30', activity: 'Snack Time',                        caretaker: 'All caretakers', icon: '🍎', color: '#FFB400' },
    { time: '11:00', activity: 'Creative Arts & Craft',             caretaker: 'Ms. Ruth K.',    icon: '🎨', color: '#F43F5E' },
    { time: '12:00', activity: 'Lunch',                             caretaker: 'All caretakers', icon: '🍽️', color: '#10B981' },
    { time: '12:45', activity: 'Nap Time',                          caretaker: 'Ms. Maria L.',   icon: '😴', color: '#6366F1' },
    { time: '14:00', activity: 'Outdoor Play & Story Time',         caretaker: 'Ms. Faith A.',   icon: '🌳', color: '#00FC8F' },
    { time: '15:00', activity: 'Parent Pick-up Window',             caretaker: 'All caretakers', icon: '🚗', color: '#FFB400' },
  ];

  const MESSAGES = [
    { id: 1, parent: 'Mrs. Nakamya',  time: '8:42 AM',  text: 'Will pick up Aiden at 2pm today, please note.',          read: false, answered: false },
    { id: 2, parent: 'Ms. Okello',    time: '9:15 AM',  text: 'Bella is feeling better, thanks for yesterday\'s care!', read: true,  answered: true  },
    { id: 3, parent: 'Mr. Ssemanda',  time: '9:50 AM',  text: 'Can you share today\'s activity photos on WhatsApp?',    read: false, answered: false },
    { id: 4, parent: 'Mrs. Mutebe',   time: '10:20 AM', text: 'Daisy is home sick today, she has a mild fever.',        read: true,  answered: true  },
    { id: 5, parent: 'Mr. Lubega',    time: '11:05 AM', text: 'Please give Ethan his medication at 1pm. Thanks.',       read: false, answered: false },
  ];

  // ── Helper: current time highlight for schedule ──────────────────────────
  function getCurrentTimeSlot() {
    const now = new Date();
    const hhmm = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < TODAY_SCHEDULE.length - 1; i++) {
      const [ah, am] = TODAY_SCHEDULE[i].time.split(':').map(Number);
      const [bh, bm] = TODAY_SCHEDULE[i + 1].time.split(':').map(Number);
      if (hhmm >= ah * 60 + am && hhmm < bh * 60 + bm) return i;
    }
    return -1;
  }

  // ── KPI Card Component ───────────────────────────────────────────────────
  const CcKpiCard = ({ label, value, sub, accent, icon }) => (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      borderRadius: 12, padding: '20px 22px', flex: 1, minWidth: 140,
      position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s',
    }} className="kpi-card">
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 70, height: 70,
        borderRadius: '50%', background: accent, opacity: 0.08, filter: 'blur(20px)',
      }} />
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
    </div>
  );

  // ── Child Card Component ─────────────────────────────────────────────────
  const ChildCard = ({ child, onMessage }) => {
    const statusColor = child.present ? '#00FC8F' : '#FF4757';
    const invoiceColor = child.invoiceStatus === 'overdue' ? '#FF4757' : child.invoiceStatus === 'due' ? '#FFB400' : '#00FC8F';
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: `1px solid ${child.present ? 'var(--border-subtle)' : 'rgba(255,71,87,0.2)'}`,
        borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color 0.2s, transform 0.2s',
      }} className="kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: `${statusColor}20`, border: `2px solid ${statusColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>{child.mood}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{child.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{child.age} yrs · {child.parent}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {child.present ? (child.nap ? '😴 Napping' : '✓ Present') : '✗ Absent'}
            </div>
            <div style={{ fontSize: 10, color: invoiceColor, marginTop: 2, textTransform: 'uppercase' }}>
              {child.invoiceStatus === 'overdue' ? '⚠ Overdue' : child.invoiceStatus === 'due' ? '○ Due' : '✓ Paid'}
            </div>
          </div>
        </div>
        {child.milestone && (
          <div style={{ background: 'rgba(0,252,143,0.06)', border: '1px solid rgba(0,252,143,0.15)', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: 'var(--mint)' }}>
            🏆 New milestone: {child.milestone}
          </div>
        )}
        <button onClick={() => onMessage(child)} style={{
          background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 8,
          padding: '6px 10px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
        }} className="quick-action-btn">
          <span>💬</span> Message {child.parent.split(' ')[1] || child.parent}
        </button>
      </div>
    );
  };

  // ── Nia Advisory Banner ──────────────────────────────────────────────────
  const NiaAdvisoryBanner = ({ onTalkToNia }) => (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0,252,143,0.06) 0%, rgba(0,252,143,0.02) 100%)',
      border: '1px solid rgba(0,252,143,0.2)', borderRadius: 12, padding: '16px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00FC8F, #1B9B6F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, boxShadow: '0 0 16px rgba(0,252,143,0.3)',
        }}>🛡️</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mint)' }}>Nia is watching Childcare OS</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            2 parent messages unanswered · Nakamya invoice 30+ days overdue · 3 children absent today
          </div>
        </div>
      </div>
      <button onClick={onTalkToNia} style={{
        background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8,
        padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        whiteSpace: 'nowrap', fontFamily: 'var(--font-body)',
      }}>Talk to Nia →</button>
    </div>
  );

  // ── Nia AI Chat Overlay ──────────────────────────────────────────────────
  const ChildcareNiaOverlay = ({ isOpen, onClose, contextData }) => {
    const [messages, setMessages] = React.useState([{ role: 'assistant', content: 'Hello Hudson. I am monitoring Charis Childcare OS. What do you need to know?' }]);
    const [input, setInput] = React.useState('');
    const [pending, setPending] = React.useState(false);
    const messagesEndRef = React.useRef(null);

    React.useEffect(() => {
      if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!isOpen) return null;

    const handleSend = async () => {
      if (!input.trim() || pending) return;
      const userMsg = { role: 'user', content: input.trim() };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setPending(true);

      const systemPrompt = `You are Nia, the AI Chief of Staff for NEXT OS. You are currently viewing the Charis Childcare OS dashboard for Hudson Tumusiime (Global Director).
You have complete access to the current dashboard state. Answer the user's questions based ONLY on this data. Be concise, direct, and helpful. Do not use markdown headers.

CURRENT DASHBOARD STATE:
KPIs: ${JSON.stringify(contextData.kpi)}
CHILDREN ROSTER: ${JSON.stringify(contextData.children.map(c => ({ name: c.name, age: c.age, present: c.present, nap: c.nap, milestone: c.milestone, invoice: c.invoiceStatus })))}
TODAY'S SCHEDULE: ${JSON.stringify(contextData.schedule.map(s => ({ time: s.time, activity: s.activity, caretaker: s.caretaker })))}
MESSAGES FROM PARENTS: ${JSON.stringify(contextData.messages)}`;

      try {
        const res = await fetch('https://nextos-sentinel.nextafricaai.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: systemPrompt,
            messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
            tools: []
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        
        const textRespObj = (data.content || []).find(c => c.type === 'text');
        const textResp = (textRespObj && textRespObj.text) || "I'm sorry, I couldn't process that.";
        setMessages(prev => [...prev, { role: 'assistant', content: textResp }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error connecting to Nia: ' + err.message }]);
      } finally {
        setPending(false);
      }
    };

    return (
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-default)', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', zIndex: 1000 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #00FC8F, #1B9B6F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
            <div style={{ fontWeight: 700, color: 'var(--mint)' }}>Nia Advisory</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 24, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                {m.role === 'user' ? 'Hudson' : 'Nia'}
              </div>
              <div style={{ background: m.role === 'user' ? 'var(--mint)' : 'var(--bg-surface)', color: m.role === 'user' ? '#060012' : 'var(--text-primary)', padding: '10px 14px', borderRadius: 12, borderBottomRightRadius: m.role === 'user' ? 2 : 12, borderBottomLeftRadius: m.role === 'user' ? 12 : 2, fontSize: 13, lineHeight: 1.5 }}>
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 12, fontSize: 13, color: 'var(--text-tertiary)' }}>
              Nia is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ padding: 20, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask Nia about the dashboard..." style={{ flex: 1, background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
            <button onClick={handleSend} disabled={pending || !input.trim()} style={{ background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 700, cursor: (pending || !input.trim()) ? 'not-allowed' : 'pointer', opacity: (pending || !input.trim()) ? 0.5 : 1 }}>Send</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Main Page Component ──────────────────────────────────────────────────
  const ChildcareOSPage = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = React.useState('overview');
    const [selectedChild, setSelectedChild] = React.useState(null);
    const [niaOpen, setNiaOpen] = React.useState(false);
    const kpi = CHILDCARE_KPIs;
    const currentSlot = getCurrentTimeSlot();

    function handleMessage(child) {
      const url = 'https://wa.me/' + child.parentPhone + '?text=' + encodeURIComponent(
        'Hello ' + child.parent + ', this is a message from the Charis Childcare team regarding ' + child.name + '. '
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    const tabs = [
      { id: 'overview',  label: 'Overview', icon: '📊' },
      { id: 'children',  label: 'Children', icon: '🧒' },
      { id: 'schedule',  label: 'Schedule', icon: '🗓️' },
      { id: 'messages',  label: 'Messages', icon: '💬', badge: kpi.unreadParentMessages },
      { id: 'invoices',  label: 'Invoices', icon: '💳' },
    ];

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-default)' }}>
        {/* ── SIDEBAR ── */}
        <div style={{
          width: 260, background: 'var(--bg-elevated)', borderRight: '1px solid var(--border-subtle)',
          padding: '32px 20px', display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, bottom: 0, left: 0, overflowY: 'auto', zIndex: 50
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, paddingLeft: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #FFB400, #FF8C00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: '0 4px 20px rgba(255,180,0,0.3)', flexShrink: 0
            }}>👶</div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                Charis OS
              </h1>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                Global Director
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 12 }}>Menu</div>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                background: activeTab === tab.id ? 'rgba(0,252,143,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer', padding: '12px 14px', fontSize: 14,
                fontWeight: activeTab === tab.id ? 600 : 500,
                color: activeTab === tab.id ? 'var(--mint)' : 'var(--text-secondary)',
                borderRadius: 10, transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{tab.icon}</span>
                  {tab.label}
                </div>
                {tab.badge > 0 && (
                  <span style={{ background: '#A855F7', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button onClick={() => setNiaOpen(true)} style={{
            background: 'linear-gradient(135deg, rgba(0,252,143,0.1), rgba(0,252,143,0.02))',
            border: '1px solid rgba(0,252,143,0.2)', borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12, marginTop: 40, cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left'
          }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #00FC8F, #1B9B6F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mint)' }}>Talk to Nia</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>AI Chief of Staff</div>
            </div>
          </button>
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div style={{ flex: 1, padding: '40px 60px', marginLeft: 260, maxWidth: 1200 }}>
          {/* Top Bar inside content */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--mint)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Welcome back, Hudson Tumusiime
            </div>
          </div>

        {/* Nia Banner */}
        <NiaAdvisoryBanner onTalkToNia={() => setNiaOpen(true)} />

        {/* KPI Strip */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
          <CcKpiCard label="Enrolled" value={kpi.enrolled} sub="July cohort" accent="#00FC8F" icon="🧒" />
          <CcKpiCard label="Present Today" value={kpi.presentToday} sub={`${kpi.absentToday} absent`} accent="#3B82F6" icon="✅" />
          <CcKpiCard label="Attendance" value={Math.round(kpi.attendanceRate * 100) + '%'} sub="Target: 90%+" accent={kpi.attendanceRate >= 0.9 ? '#00FC8F' : '#FFB400'} icon="📊" />
          <CcKpiCard label="Invoices Due" value={kpi.invoicesDue} sub={kpi.invoicesOverdue30d + ' overdue 30d+'} accent="#FF4757" icon="💳" />
          <CcKpiCard label="Messages" value={kpi.unreadParentMessages} sub={kpi.unansweredMessages24h + ' need reply'} accent="#A855F7" icon="💬" />
          <CcKpiCard label="Milestones" value={kpi.milestonesThisWeek} sub="This week" accent="#FFB400" icon="🏆" />
        </div>



        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Today's Pulse */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Today's Pulse</div>
              {[
                { label: 'Present', val: kpi.presentToday, total: kpi.enrolled, color: '#00FC8F' },
                { label: 'Fee Collection', val: Math.round(kpi.collectionRate * 100), total: 100, color: '#3B82F6', pct: true },
                { label: 'Attendance Rate', val: Math.round(kpi.attendanceRate * 100), total: 100, color: '#FFB400', pct: true },
              ].map(({ label, val, total, color, pct }) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color }}>{pct ? val + '%' : val + '/' + total}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-surface)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: (pct ? val : Math.round(val / total * 100)) + '%', background: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Next Activity */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Today's Schedule</div>
              {TODAY_SCHEDULE.slice(0, 5).map((slot, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
                  borderRadius: 8, marginBottom: 4,
                  background: i === currentSlot ? 'rgba(0,252,143,0.08)' : 'transparent',
                  border: i === currentSlot ? '1px solid rgba(0,252,143,0.2)' : '1px solid transparent',
                }}>
                  <span style={{ fontSize: 16 }}>{slot.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: i === currentSlot ? 'var(--mint)' : 'var(--text-secondary)', fontWeight: i === currentSlot ? 600 : 400 }}>{slot.activity}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{slot.caretaker}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{slot.time}</div>
                </div>
              ))}
              <button onClick={() => setActiveTab('schedule')} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', width: '100%', marginTop: 8, fontFamily: 'var(--font-body)' }}>
                View full schedule →
              </button>
            </div>

            {/* Recent Milestones */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Recent Milestones</div>
              {CHILDREN.filter(c => c.milestone).slice(0, 5).map(child => (
                <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 20 }}>{child.mood}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{child.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mint)' }}>🏆 {child.milestone}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Quick Actions</div>
              {[
                { label: '📣 Broadcast to All Parents', action: () => { const url = 'https://wa.me/?text=' + encodeURIComponent('Hello from Charis Childcare! '); window.open(url, '_blank'); } },
                { label: '💬 View Messages', action: () => setActiveTab('messages') },
                { label: '📋 View Invoices', action: () => setActiveTab('invoices') },
                { label: '🛡️ Ask Nia for Advisory', action: () => setNiaOpen(true) },
              ].map(({ label, action }) => (
                <button key={label} onClick={action} style={{
                  display: 'block', width: '100%', background: 'transparent',
                  border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px',
                  fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left',
                  marginBottom: 8, transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                }} className="quick-action-btn">{label}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── CHILDREN TAB ── */}
        {activeTab === 'children' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'All',     val: CHILDREN.length,                       color: 'var(--text-secondary)' },
                { label: 'Present', val: CHILDREN.filter(c => c.present).length, color: '#00FC8F' },
                { label: 'Absent',  val: CHILDREN.filter(c => !c.present).length, color: '#FF4757' },
                { label: 'Napping', val: CHILDREN.filter(c => c.nap).length,    color: '#A855F7' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 16px', fontSize: 12 }}>
                  <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{val}</span>
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {CHILDREN.map(child => <ChildCard key={child.id} child={child} onMessage={handleMessage} />)}
            </div>
          </div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {activeTab === 'schedule' && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Today's Programme</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
              Generated by Global Director Hudson · {new Date().toDateString()}
            </div>
            {TODAY_SCHEDULE.map((slot, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 16px', borderRadius: 10, marginBottom: 8,
                background: i === currentSlot ? 'rgba(0,252,143,0.06)' : i < currentSlot ? 'rgba(255,255,255,0.02)' : 'transparent',
                border: i === currentSlot ? '1px solid rgba(0,252,143,0.25)' : '1px solid var(--border-subtle)',
                opacity: i < currentSlot ? 0.55 : 1,
                transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: slot.color + '18', border: `1px solid ${slot.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>{slot.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: i === currentSlot ? 600 : 400, color: i === currentSlot ? 'var(--mint)' : 'var(--text-primary)' }}>
                    {slot.activity}
                    {i === currentSlot && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--mint)', color: '#060012', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>NOW</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Led by {slot.caretaker}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{slot.time}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {activeTab === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MESSAGES.map(msg => (
              <div key={msg.id} style={{
                background: 'var(--bg-elevated)', border: `1px solid ${!msg.read ? 'rgba(168,85,247,0.3)' : 'var(--border-subtle)'}`,
                borderRadius: 12, padding: '16px 18px',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: !msg.read ? '#A855F7' : 'var(--border-default)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{msg.parent}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{msg.time}</span>
                    {!msg.answered && (
                      <span style={{ fontSize: 10, background: 'rgba(255,71,87,0.15)', color: '#FF4757', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>Needs reply</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{msg.text}</div>
                </div>
                <button onClick={() => {
                  const child = CHILDREN.find(c => c.parent === msg.parent);
                  if (child) handleMessage(child);
                }} style={{
                  background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8,
                  padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)',
                }}>
                  Reply via WhatsApp
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── INVOICES TAB ── */}
        {activeTab === 'invoices' && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Invoice Register — July 2026</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                Collection: {Math.round(CHILDCARE_KPIs.collectionRate * 100)}%
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Child', 'Parent', 'Amount (UGX)', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHILDREN.map(child => {
                  const statusColor = child.invoiceStatus === 'overdue' ? '#FF4757' : child.invoiceStatus === 'due' ? '#FFB400' : '#00FC8F';
                  const statusLabel = child.invoiceStatus === 'overdue' ? '⚠ OVERDUE 30d+' : child.invoiceStatus === 'due' ? '○ DUE' : '✓ PAID';
                  return (
                    <tr key={child.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="member-row">
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{child.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{child.parent}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>87,500</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, color: statusColor, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{statusLabel}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {child.invoiceStatus !== 'paid' && (
                          <button onClick={() => handleMessage(child)} style={{
                            background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 6,
                            padding: '5px 10px', fontSize: 11, color: 'var(--mint)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                          }} className="quick-action-btn">Send reminder</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Nia Overlay */}
        <ChildcareNiaOverlay isOpen={niaOpen} onClose={() => setNiaOpen(false)} contextData={{ kpi: CHILDCARE_KPIs, children: CHILDREN, schedule: TODAY_SCHEDULE, messages: MESSAGES }} />

      </div>
    );
  };

  window.ChildcareOSPage = ChildcareOSPage;
})();
