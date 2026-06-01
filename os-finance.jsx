/* os-finance.jsx - Admin Financial Panel: Income, Expenses, Cash Flow.
   Reads finance data from window.OS_DATA. Source can swap to Supabase later
   without touching this file. See os-data.jsx for the contract. */

const _financeData = (window.OS_DATA && window.OS_DATA.getFinance && window.OS_DATA.getFinance()) || {};
const MONTHS = _financeData.months || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const REVENUE_DATA = _financeData.revenueSeries || [];
const EXPENSE_DATA = _financeData.expenseSeries || [];
const NET_DATA = REVENUE_DATA.map((r, i) => r - (EXPENSE_DATA[i] || 0));
const TRANSACTIONS = _financeData.transactions || [];

/* -- Bar Chart (SVG) -- */
const BarChart = ({ data1, data2, labels, color1 = 'var(--mint)', color2 = 'var(--danger)', height = 180, width = '100%' }) => {
  const max = Math.max(...data1, ...data2);
  const barW = 28; const gap = 6;
  const totalW = labels.length * (barW * 2 + gap * 3);
  return (
    <div style={{ width, overflowX: 'auto' }}>
      <svg width={totalW + 40} height={height + 30} style={{ display: 'block' }}>
        {labels.map((label, i) => {
          const x = 20 + i * (barW * 2 + gap * 3);
          const h1 = (data1[i] / max) * height * 0.85;
          const h2 = (data2[i] / max) * height * 0.85;
          return (
            <g key={i}>
              <rect x={x} y={height - h1} width={barW} height={h1} rx={4} fill={color1} opacity={0.8} />
              <rect x={x + barW + gap} y={height - h2} width={barW} height={h2} rx={4} fill={color2} opacity={0.6} />
              <text x={x + barW + gap / 2} y={height + 18} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="var(--font-mono)">{label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* -- Sparkline (inline) -- */
const Sparkline = ({ data, color = 'var(--mint)', w = 80, h = 24 }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h * 0.8 - h * 0.1}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

/* -- Add Transaction Modal -- */
const AddTransactionModal = ({ onSave, onClose }) => {
  const today = new Date();
  const todayStr = today.getDate() + ' ' + today.toLocaleString('en-US', { month: 'short' }) + ' ' + today.getFullYear();
  const [date, setDate] = React.useState(todayStr);
  const [desc, setDesc] = React.useState('');
  const [type, setType] = React.useState('income');
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState('Membership');
  const [status, setStatus] = React.useState('completed');
  const canSubmit = desc.trim().length >= 2 && Number(amount) > 0;
  const inputStyle = { width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' };
  const labelStyle = { fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1.5, color: 'var(--text-tertiary)', marginBottom: 6, display: 'block', textTransform: 'uppercase' };
  const submit = (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;
    onSave({ date, desc: desc.trim(), type, amount: Number(amount), category, status });
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,0,18,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 40px rgba(0,252,143,0.08)' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 2, color: 'var(--text-tertiary)', marginBottom: 6 }}>NEW TRANSACTION</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Log a transaction</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={labelStyle}>Description *</label><input style={inputStyle} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Safaricom Q3 retainer" autoFocus /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Type</label>
              <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="income">Income</option><option value="expense">Expense</option>
              </select></div>
            <div><label style={labelStyle}>Amount (USD) *</label><input style={inputStyle} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Category</label>
              <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Membership</option><option>Project</option><option>Consulting</option>
                <option>Payroll</option><option>Infrastructure</option><option>Operations</option>
                <option>Tools</option><option>Other</option>
              </select></div>
            <div><label style={labelStyle}>Status</label>
              <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="completed">Completed</option><option value="pending">Pending</option>
              </select></div>
          </div>
          <div><label style={labelStyle}>Date</label><input style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', padding: '10px 18px', borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={!canSubmit} style={{ background: canSubmit ? 'var(--mint)' : 'var(--bg-elevated)', border: '1px solid ' + (canSubmit ? 'var(--mint)' : 'var(--border-default)'), color: canSubmit ? 'var(--text-inverse)' : 'var(--text-tertiary)', padding: '10px 22px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>Save transaction</button>
        </div>
      </form>
    </div>
  );
};

/* -- Finance Page -- */
const FinancePage = ({ onNavigate }) => {
  const [mounted, setMounted] = React.useState(false);
  const [txFilter, setTxFilter] = React.useState('all');
  const [period, setPeriod] = React.useState('6m');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [txList, setTxList] = React.useState(() =>
    (window.OS_DATA && window.OS_DATA.getTransactions) ? window.OS_DATA.getTransactions() : TRANSACTIONS
  );
  React.useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const handleAddTx = (input) => {
    if (window.OS_DATA && window.OS_DATA.addTransaction) {
      const updated = window.OS_DATA.addTransaction(input);
      setTxList(updated);
    }
    setShowAddModal(false);
  };

  const totalIncome = txList.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = txList.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netCashFlow = totalIncome - totalExpense;
  const membershipRev = txList.filter(t => t.category === 'Membership').reduce((s, t) => s + t.amount, 0);
  const projectRev = txList.filter(t => t.category === 'Project' || t.category === 'Consulting').reduce((s, t) => s + t.amount, 0);
  const filtered = txFilter === 'all' ? txList : txList.filter(t => t.type === txFilter);

  const sectionStyle = { background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: 22 };
  const metricLabel = { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 };
  const metricValue = { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 };

  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: 'all 0.4s ease' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Financial <span style={{ color: 'var(--mint)' }}>Overview</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
            Track all income and expenses across NEXT operations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
            {['1m', '3m', '6m', '1y'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '6px 12px', borderRadius: 4, border: 'none', fontSize: 11,
                fontFamily: 'var(--font-mono)', cursor: 'pointer',
                background: period === p ? 'var(--bg-elevated)' : 'transparent',
                color: period === p ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}>{p.toUpperCase()}</button>
            ))}
          </div>
          <button onClick={() => setShowAddModal(true)} style={{
            background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none',
            padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 6px 24px rgba(0,252,143,0.2)',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1, marginTop: -2 }}>+</span> Add Transaction
          </button>
        </div>
      </div>
      {showAddModal && <AddTransactionModal onSave={handleAddTx} onClose={() => setShowAddModal(false)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Revenue', value: '$' + (totalIncome / 1000).toFixed(0) + 'K', change: '+12%', positive: true, color: 'var(--mint)', data: REVENUE_DATA },
          { label: 'Total Expenses', value: '$' + (totalExpense / 1000).toFixed(0) + 'K', change: '+8%', positive: false, color: 'var(--danger)', data: EXPENSE_DATA },
          { label: 'Net Cash Flow', value: '$' + (netCashFlow / 1000).toFixed(0) + 'K', change: '+18%', positive: true, color: 'var(--gold)', data: NET_DATA },
          { label: 'Membership MRR', value: '$' + (membershipRev / 1000).toFixed(1) + 'K', change: '+24', positive: true, color: 'var(--emerald)', data: [4,5,5.5,6.2,7,7.8] },
        ].map(kpi => (
          <div key={kpi.label} style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={metricLabel}>{kpi.label}</div>
              <Sparkline data={kpi.data} color={kpi.color} />
            </div>
            <div style={metricValue}>{kpi.value}</div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: kpi.positive ? 'var(--mint)' : 'var(--danger)', marginTop: 4 }}>
              {kpi.change} vs last period
            </div>
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Transactions</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'income', 'expense'].map(f => (
              <button key={f} onClick={() => setTxFilter(f)} style={{
                padding: '4px 12px', borderRadius: 4, border: 'none', fontSize: 11,
                cursor: 'pointer', fontFamily: 'var(--font-body)', textTransform: 'capitalize',
                background: txFilter === f ? 'var(--bg-surface)' : 'transparent',
                color: txFilter === f ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}>{f}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '110px 1fr 100px 100px 80px',
            padding: '0 0 8px', fontSize: 10, color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em',
            borderBottom: '1px solid var(--border-default)',
          }}>
            <span>Date</span><span>Description</span><span>Category</span>
            <span style={{ textAlign: 'right' }}>Amount</span><span style={{ textAlign: 'right' }}>Status</span>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>No transactions yet. Click "+ Add Transaction" to log one.</div>
          ) : filtered.map(tx => (
            <div key={tx.id} style={{
              display: 'grid', gridTemplateColumns: '110px 1fr 100px 100px 80px',
              padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
              fontSize: 12, alignItems: 'center',
            }} className="member-row">
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: 11 }}>{tx.date}</span>
              <span style={{ color: 'var(--text-primary)', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.desc}
                {tx.addedByUser && <span style={{ marginLeft: 8, fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1, color: 'var(--mint)', padding: '1px 6px', borderRadius: 4, background: 'var(--mint-glow)', border: '1px solid var(--mint)' }}>NEW</span>}
              </span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{tx.category}</span>
              <span style={{
                textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600,
                color: tx.type === 'income' ? 'var(--mint)' : 'var(--danger)',
              }}>
                {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
              </span>
              <span style={{
                textAlign: 'right', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
                color: tx.status === 'completed' ? 'var(--mint)' : 'var(--gold)',
              }}>{tx.status === 'completed' ? 'Done' : 'Pending'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { FinancePage, AddTransactionModal });
