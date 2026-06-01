/* os-data.jsx — single source of truth for NEXT OS page data.
   Wrapped in an IIFE. Only window.OS_DATA escapes. Demo seeds plus a
   localStorage layer for user-added tenants / projects / transactions.
   When Supabase is wired, only this file changes.
*/

(function () {
  const OS_DATA_MODE = 'demo';
  const KEY_TENANTS      = 'nextos.tenants.v1';
  const KEY_PROJECTS     = 'nextos.projects.v1';
  const KEY_TRANSACTIONS = 'nextos.transactions.v1';

  // ─── PROJECTS (seed) ─────────────────────────────────────────────────────
  const DEFAULT_PROJECTS = [
    { id: 'proj-001', name: 'Digital Services Platform', client: 'Ministry of ICT, Uganda',
      status: 'active', health: 'healthy', progress: 67, priority: 'high',
      platform: 'Supabase + Next.js', domain: 'services.gov.ug',
      team: ['HT', 'AO', 'DM'], startDate: '2026-01-15', deadline: '2026-07-30',
      uptime: 99.7, lastDeploy: '2 days ago', errors24h: 0, warnings24h: 1 },
  ];

  // ─── FINANCE (seed) ──────────────────────────────────────────────────────
  const FINANCE = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    revenueSeries: [186, 210, 245, 262, 284, 310],
    expenseSeries: [92, 105, 118, 124, 131, 142],
    currency: 'USD',
    unit: 'K',
  };
  const DEFAULT_TRANSACTIONS = [
    { id: 'TXN-001', date: '20 May 2026', desc: 'Architect Membership - Kenya Ministry of Digital', type: 'income',  amount: 2999,  category: 'Membership',     status: 'completed' },
    { id: 'TXN-002', date: '19 May 2026', desc: 'Safaricom - Process Automation Phase 2 Invoice',     type: 'income',  amount: 45000, category: 'Project',        status: 'completed' },
    { id: 'TXN-003', date: '19 May 2026', desc: 'AWS Infrastructure - May billing',                   type: 'expense', amount: 8420,  category: 'Infrastructure', status: 'completed' },
    { id: 'TXN-004', date: '18 May 2026', desc: 'Builder Membership x 4 - Monthly renewals',          type: 'income',  amount: 2996,  category: 'Membership',     status: 'completed' },
    { id: 'TXN-005', date: '17 May 2026', desc: 'Supabase Pro Plan - 6 project instances',            type: 'expense', amount: 1500,  category: 'Infrastructure', status: 'completed' },
    { id: 'TXN-006', date: '17 May 2026', desc: 'University of Lagos - Smart Campus milestone',       type: 'income',  amount: 32000, category: 'Project',        status: 'pending'   },
    { id: 'TXN-007', date: '16 May 2026', desc: 'Team payroll - May cycle',                           type: 'expense', amount: 42000, category: 'Payroll',        status: 'completed' },
    { id: 'TXN-008', date: '15 May 2026', desc: 'Catalyst Membership x 12 - Monthly renewals',        type: 'income',  amount: 1788,  category: 'Membership',     status: 'completed' },
    { id: 'TXN-009', date: '15 May 2026', desc: 'Office lease - Kampala co-working space',            type: 'expense', amount: 3200,  category: 'Operations',     status: 'completed' },
    { id: 'TXN-010', date: '14 May 2026', desc: 'KCCA Kampala - Citizen Portal retainer',             type: 'income',  amount: 15000, category: 'Project',        status: 'completed' },
    { id: 'TXN-011', date: '13 May 2026', desc: 'Envato Elements - Annual subscription',              type: 'expense', amount: 198,   category: 'Tools',          status: 'completed' },
    { id: 'TXN-012', date: '12 May 2026', desc: 'UBA Group - AI Operations consulting hours',         type: 'income',  amount: 8500,  category: 'Consulting',     status: 'completed' },
  ];

  // ─── AI TOOLS (seed) ─────────────────────────────────────────────────────
  const AI_TOOLS = [
    { id: 'doc-ai',       name: 'NEXT Docs',      usage: 847 },
    { id: 'chat-ai',      name: 'NEXT Assistant', usage: 2340 },
    { id: 'analytics-ai', name: 'NEXT Insights',  usage: 412 },
    { id: 'auto-ai',      name: 'NEXT Flow',      usage: 658 },
  ];

  // ─── TENANT FLEET (seed) ─────────────────────────────────────────────────
  const DEFAULT_TENANTS = [
    { id: 'peak-primary',          name: 'Peak Primary School',    vertical: 'school',       country: 'Uganda', currency: 'UGX',
      health: 'advisory', lastSignalAt: '38s ago',
      prototypeUrl: 'prototypes/schools/peak-primary/index.html',
      kpis: { revenue: 412500000, expenses: 384200000 },
      // School-specific KPIs surfaced to the agent under `verticalKpis`
      verticalKpis: {
        students: 286, teachers: 38, streams: 14,
        feesCollectedTerm: 412500000, feesCollectionRate: 0.71,
        feesOutstanding: 168800000, accountsOverdue30d: 3, overdueAmount: 1080000,
        attendanceWeek: 0.88, atRiskStudents: 12, topPerformers: 24,
        enrollmentInquiries: 4, lastSync: '38s ago',
      },
      latest: { severity: 'warn', title: '3 fee accounts overdue 30+ days', summary: 'UGX 1.08M outstanding · WhatsApp gentle reminder draft is queued for your approval.' } },
    { id: 'st-marys-demo',         name: "St. Mary's Demo School", vertical: 'school',       country: 'Uganda', currency: 'UGX',
      health: 'advisory', lastSignalAt: '2m ago',
      kpis: { revenue: 1584000000, expenses: 1880000000 },
      latest: { severity: 'warn', title: 'Cash flow needs board attention', summary: 'Expenses exceed revenue by 296M UGX this term.' } },
    { id: 'grace-chapel-demo',     name: 'Grace Chapel',           vertical: 'church',       country: 'Uganda', currency: 'UGX',
      health: 'healthy',  lastSignalAt: '5m ago',
      kpis: { revenue: 48000000, expenses: 42000000 }, latest: null },
    { id: 'hope-program-demo',     name: 'Hope Program',           vertical: 'ngo',          country: 'Uganda', currency: 'UGX',
      health: 'advisory', lastSignalAt: '7m ago',
      kpis: { revenue: 92000000, expenses: 80000000 },
      latest: { severity: 'warn', title: 'Participation below capacity', summary: '1,850 of 2,000 beneficiaries active. Outreach summary recommended.' } },
    { id: 'next-services-demo',    name: 'NEXT Services',          vertical: 'company',      country: 'Uganda', currency: 'UGX',
      health: 'healthy',  lastSignalAt: '11m ago',
      kpis: { revenue: 150000000, expenses: 54500000 }, latest: null },
    { id: 'community-association-demo', name: 'Community Association', vertical: 'organisation', country: 'Uganda', currency: 'UGX',
      health: 'advisory', lastSignalAt: '13m ago',
      kpis: { revenue: 20000000, expenses: 14500000 },
      latest: { severity: 'warn', title: 'Participation below threshold', summary: '430 active members vs. 500 target.' } },
  ];

  // ─── Storage helpers ─────────────────────────────────────────────────────
  function safeLoad(key) {
    try {
      const raw = window.localStorage && window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function safeSave(key, list) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }
  function makeSlug(name, prefix) {
    const base = String(name || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 60);
    return base || ((prefix || 'item') + '-' + Date.now());
  }

  // ─── Tenants CRUD ────────────────────────────────────────────────────────
  let _tenantsCache = null;
  function getTenants() {
    if (_tenantsCache) return _tenantsCache;
    _tenantsCache = DEFAULT_TENANTS.concat(safeLoad(KEY_TENANTS));
    return _tenantsCache;
  }
  function addTenant(input) {
    const tenant = {
      id: input.id || makeSlug(input.name, 'tenant'),
      name: input.name || 'Unnamed tenant',
      vertical: input.vertical || 'organisation',
      country: input.country || 'Uganda',
      currency: input.currency || 'UGX',
      health: input.health || 'unknown',
      lastSignalAt: 'just added',
      kpis: { revenue: Number(input.revenue) || 0, expenses: Number(input.expenses) || 0 },
      latest: null,
      addedByUser: true,
      addedAt: new Date().toISOString(),
    };
    const added = safeLoad(KEY_TENANTS); added.push(tenant); safeSave(KEY_TENANTS, added);
    _tenantsCache = DEFAULT_TENANTS.concat(added);
    return _tenantsCache;
  }
  function removeTenant(id) {
    const added = safeLoad(KEY_TENANTS).filter(t => t.id !== id);
    safeSave(KEY_TENANTS, added);
    _tenantsCache = DEFAULT_TENANTS.concat(added);
    return _tenantsCache;
  }

  // ─── Projects CRUD ───────────────────────────────────────────────────────
  let _projectsCache = null;
  function getProjects() {
    if (_projectsCache) return _projectsCache;
    _projectsCache = DEFAULT_PROJECTS.concat(safeLoad(KEY_PROJECTS));
    return _projectsCache;
  }
  function addProject(input) {
    const project = {
      id: input.id || makeSlug(input.name, 'proj'),
      name: input.name || 'Unnamed project',
      client: input.client || '',
      status: input.status || 'active',
      health: input.health || 'healthy',
      progress: Number(input.progress) || 0,
      priority: input.priority || 'medium',
      platform: input.platform || '',
      domain: input.domain || '',
      team: input.team || [],
      startDate: input.startDate || new Date().toISOString().slice(0, 10),
      deadline: input.deadline || '',
      uptime: 100, lastDeploy: 'never', errors24h: 0, warnings24h: 0,
      alerts: [], milestones: [],
      credentials: { supabaseUrl: '', supabaseKey: '', adminEmail: '' },
      addedByUser: true,
      addedAt: new Date().toISOString(),
    };
    const added = safeLoad(KEY_PROJECTS); added.push(project); safeSave(KEY_PROJECTS, added);
    _projectsCache = DEFAULT_PROJECTS.concat(added);
    return _projectsCache;
  }
  function removeProject(id) {
    const added = safeLoad(KEY_PROJECTS).filter(p => p.id !== id);
    safeSave(KEY_PROJECTS, added);
    _projectsCache = DEFAULT_PROJECTS.concat(added);
    return _projectsCache;
  }

  // ─── Transactions CRUD ───────────────────────────────────────────────────
  let _transactionsCache = null;
  function getTransactions() {
    if (_transactionsCache) return _transactionsCache;
    const added = safeLoad(KEY_TRANSACTIONS);
    // Newest first.
    _transactionsCache = added.concat(DEFAULT_TRANSACTIONS);
    return _transactionsCache;
  }
  function addTransaction(input) {
    const today = new Date();
    const month = today.toLocaleString('en-US', { month: 'short' });
    const tx = {
      id: input.id || 'TXN-' + String(Date.now()).slice(-6),
      date: input.date || (today.getDate() + ' ' + month + ' ' + today.getFullYear()),
      desc: input.desc || 'Unnamed transaction',
      type: input.type === 'expense' ? 'expense' : 'income',
      amount: Number(input.amount) || 0,
      category: input.category || 'Other',
      status: input.status || 'completed',
      addedByUser: true,
      addedAt: new Date().toISOString(),
    };
    const added = safeLoad(KEY_TRANSACTIONS); added.unshift(tx); safeSave(KEY_TRANSACTIONS, added);
    _transactionsCache = added.concat(DEFAULT_TRANSACTIONS);
    return _transactionsCache;
  }
  function removeTransaction(id) {
    const added = safeLoad(KEY_TRANSACTIONS).filter(t => t.id !== id);
    safeSave(KEY_TRANSACTIONS, added);
    _transactionsCache = added.concat(DEFAULT_TRANSACTIONS);
    return _transactionsCache;
  }

  // ─── Finance object (legacy shape kept for existing FinancePage) ─────────
  function getFinance() {
    return Object.assign({}, FINANCE, { transactions: getTransactions() });
  }

  function rollups() {
    const totalRevenue   = FINANCE.revenueSeries.reduce((a, b) => a + b, 0);
    const totalExpenses  = FINANCE.expenseSeries.reduce((a, b) => a + b, 0);
    const netCashflow    = totalRevenue - totalExpenses;
    const activeProjects = getProjects().filter(p => p.status === 'active').length;
    return { totalRevenue, totalExpenses, netCashflow, activeProjects, currency: FINANCE.currency, unit: FINANCE.unit };
  }

  window.OS_DATA = {
    mode: OS_DATA_MODE,
    isDemo: () => OS_DATA_MODE === 'demo',
    getFinance:  getFinance,
    getAiTools:  () => AI_TOOLS,
    getRollups:  rollups,
    getTenants:      getTenants,      addTenant,      removeTenant,
    getProjects:     getProjects,     addProject,     removeProject,
    getTransactions: getTransactions, addTransaction, removeTransaction,
  };
})();
