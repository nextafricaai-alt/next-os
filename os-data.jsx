/* os-data.jsx — single source of truth for NEXT OS page data.
   Wired to Supabase production environment.
*/

(function () {
  const OS_DATA_MODE = 'production';
  const SUPABASE_URL = 'https://llxhvqkkgftqwefmrofn.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9';

  // ─── SEED DATA (Fallbacks) ───────────────────────────────────────────────
  const DEFAULT_PROJECTS = [
    { id: 'proj-001', name: 'Digital Services Platform', client: 'Ministry of ICT, Uganda', status: 'active', health: 'healthy', progress: 67, priority: 'high', platform: 'Supabase + Next.js', domain: 'services.gov.ug', team: ['HT', 'AO', 'DM'], startDate: '2026-01-15', deadline: '2026-07-30', uptime: 99.7, lastDeploy: '2 days ago', errors24h: 0, warnings24h: 1 },
    { id: 'proj-childcare', name: 'Charis Childcare OS', client: 'NEXT Internal · Charis Creations', status: 'active', health: 'healthy', progress: 85, priority: 'high', platform: 'Supabase + Vanilla JS', domain: 'childcare.nextafrica.ai', team: ['HT'], startDate: '2026-06-01', deadline: '2026-08-01', uptime: 99.9, lastDeploy: '1 hour ago', errors24h: 0, warnings24h: 0, alerts: [], milestones: [] },
  ];

  const FINANCE = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    revenueSeries: [186, 210, 245, 262, 284, 310],
    expenseSeries: [92, 105, 118, 124, 131, 142],
    currency: 'USD',
    unit: 'K',
  };

  const DEFAULT_TRANSACTIONS = [
    { id: 'TXN-CC-001', date: '5 Jul 2026', desc: 'Childcare OS - July Tuition Invoices (6 families)', type: 'income', amount: 1800, category: 'Childcare', status: 'completed' },
  ];

  const AI_TOOLS = [
    { id: 'doc-ai', name: 'NEXT Docs', usage: 847 },
    { id: 'chat-ai', name: 'NEXT Assistant', usage: 2340 },
    { id: 'analytics-ai', name: 'NEXT Insights', usage: 412 },
    { id: 'auto-ai', name: 'NEXT Flow', usage: 658 },
  ];

  const DEFAULT_TENANTS = [
    { id: 'peak-primary', name: 'Peak Primary School', vertical: 'school', country: 'Uganda', currency: 'UGX', health: 'advisory', lastSignalAt: '38s ago', prototypeUrl: 'prototypes/schools/peak-primary/index.html', kpis: { revenue: 412500000, expenses: 384200000 }, verticalKpis: { students: 286, teachers: 38, streams: 14, feesCollectedTerm: 412500000, feesCollectionRate: 0.71, feesOutstanding: 168800000, accountsOverdue30d: 3, overdueAmount: 1080000, attendanceWeek: 0.88, atRiskStudents: 12, topPerformers: 24, enrollmentInquiries: 4, lastSync: '38s ago' }, latest: { severity: 'warn', title: '3 fee accounts overdue 30+ days', summary: 'UGX 1.08M outstanding' } },
    { id: 'charis-childcare', name: 'Charis Childcare OS', vertical: 'childcare', country: 'Uganda', currency: 'UGX', health: 'advisory', lastSignalAt: '12s ago', prototypeUrl: '../index.html', kpis: { revenue: 2100000, expenses: 840000 }, verticalKpis: { enrolled: 24, presentToday: 21, absentToday: 3, attendanceRate: 0.875, caretakers: 3, activeParents: 20, invoicesDue: 3, invoicesOverdue30d: 1, overdueAmount: 300000, totalInvoiced: 2100000, collectionRate: 0.857, unreadParentMessages: 5, unansweredMessages24h: 2, milestonesThisWeek: 7, activitiesScheduledToday: 4, lastSync: '12s ago' }, latest: { severity: 'warn', title: '3 invoices due', summary: 'UGX 300K overdue (Nakamya family 30+ days).' } },
  ];

  // ─── STATE (In-Memory Caches) ────────────────────────────────────────────
  let _tenantsCache = [];
  let _projectsCache = [];
  let _transactionsCache = [];
  let _supabaseClient = null;
  let _isInitialized = false;

  function makeSlug(name, prefix) {
    const base = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return base || ((prefix || 'item') + '-' + Date.now());
  }

  function dispatchUpdate() {
    try { window.dispatchEvent(new CustomEvent('osdata:fleet', { detail: { count: _tenantsCache.length, source: 'supabase' } })); } catch (e) {}
  }

  // Best-effort: log a failed Supabase write to sync_errors so the Sentinel
  // worker's DB webhook can see it even if nobody has the tab open. Never
  // throws — telemetry must not break the caller's own error handling.
  function logSyncError(source, operation, tableName, tenantId, error) {
    if (!_supabaseClient || !error) return;
    _supabaseClient.from('sync_errors').insert({
      tenant_id: tenantId || null,
      source: source,
      operation: operation,
      table_name: tableName,
      message: error.message || String(error),
      detail: { code: error.code, hint: error.hint, details: error.details },
    }).then(function () {}, function () {});
  }

  // ─── SUPABASE INITIALIZATION ─────────────────────────────────────────────
  function initSupabase() {
    if (_isInitialized) return Promise.resolve();
    
    return new Promise((resolve) => {
      if (window.supabase) {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        _isInitialized = true;
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        _isInitialized = true;
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  // ─── DATA FETCHING ───────────────────────────────────────────────────────
  async function loadData() {
    await initSupabase();
    
    // Fetch Tenants
    const { data: tenantsData, error: tenantsError } = await _supabaseClient.from('tenants').select('*');
    if (!tenantsError && tenantsData) {
      _tenantsCache = tenantsData.map(t => Object.assign({}, t, t.meta || {}));
      if (_tenantsCache.length === 0) _tenantsCache = DEFAULT_TENANTS.slice();
    } else {
      _tenantsCache = DEFAULT_TENANTS.slice();
    }
    
    // Fetch Projects (stored in os_records)
    const { data: projectsData, error: projectsError } = await _supabaseClient.from('os_records').select('*').eq('tenant', 'next').eq('kind', 'project');
    if (!projectsError && projectsData) {
      _projectsCache = projectsData.map(r => Object.assign({ id: r.id }, r.payload));
      if (_projectsCache.length === 0) _projectsCache = DEFAULT_PROJECTS.slice();
    } else {
      _projectsCache = DEFAULT_PROJECTS.slice();
    }
    
    // Fetch Transactions (stored in os_records)
    const { data: txnData, error: txnError } = await _supabaseClient.from('os_records').select('*').eq('tenant', 'next').eq('kind', 'transaction');
    if (!txnError && txnData) {
      _transactionsCache = txnData.map(r => Object.assign({ dbId: r.id }, r.payload));
      if (_transactionsCache.length === 0) _transactionsCache = DEFAULT_TRANSACTIONS.slice();
    } else {
      _transactionsCache = DEFAULT_TRANSACTIONS.slice();
    }
    
    dispatchUpdate();
  }

  // ─── CRUD OPS ────────────────────────────────────────────────────────────
  
  // Tenants
  function getTenants() { return _tenantsCache.length ? _tenantsCache : DEFAULT_TENANTS; }
  
  function addTenant(input) {
    const id = input.id || makeSlug(input.name, 'tenant');
    const tenant = {
      id: id,
      name: input.name || 'Unnamed tenant',
      vertical: input.vertical || 'organisation',
      country: input.country || 'Uganda',
      currency: input.currency || 'UGX',
      meta: {
        health: input.health || 'unknown',
        lastSignalAt: 'just added',
        kpis: { revenue: Number(input.revenue) || 0, expenses: Number(input.expenses) || 0 },
        latest: null,
      }
    };
    
    // Optimistic update
    const flatTenant = Object.assign({}, tenant, tenant.meta);
    _tenantsCache.push(flatTenant);
    dispatchUpdate();
    
    // Remote
    if (_supabaseClient) {
      _supabaseClient.from('tenants').insert(tenant).then(({error}) => {
        if (error) { console.error('Failed to add tenant', error); logSyncError('addTenant', 'insert', 'tenants', id, error); }
      });
    }
    return _tenantsCache;
  }

  function removeTenant(id) {
    _tenantsCache = _tenantsCache.filter(t => t.id !== id);
    dispatchUpdate();
    if (_supabaseClient) {
      _supabaseClient.from('tenants').delete().eq('id', id).then(({error}) => {
         if (error) { console.error('Failed to delete tenant', error); logSyncError('removeTenant', 'delete', 'tenants', id, error); }
      });
    }
    return _tenantsCache;
  }

  // Projects
  function getProjects() { return _projectsCache.length ? _projectsCache : DEFAULT_PROJECTS; }
  
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
    };
    
    _projectsCache.push(project);
    dispatchUpdate();
    
    if (_supabaseClient) {
      _supabaseClient.from('os_records').insert({ tenant: 'next', kind: 'project', payload: project }).then(({error}) => {
         if (error) { console.error('Failed to add project', error); logSyncError('addProject', 'insert', 'os_records', 'next', error); }
      });
    }
    return _projectsCache;
  }

  function removeProject(id) {
    _projectsCache = _projectsCache.filter(p => p.id !== id);
    dispatchUpdate();

    if (_supabaseClient) {
      _supabaseClient.from('os_records').delete().eq('tenant', 'next').eq('kind', 'project').contains('payload', { id }).then(({error}) => {
         if (error) { console.error('Failed to delete project', error); logSyncError('removeProject', 'delete', 'os_records', 'next', error); }
      });
    }
    return _projectsCache;
  }

  // Transactions
  function getTransactions() { return _transactionsCache.length ? _transactionsCache : DEFAULT_TRANSACTIONS; }
  
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
    };
    
    _transactionsCache.unshift(tx);
    dispatchUpdate();
    
    if (_supabaseClient) {
      _supabaseClient.from('os_records').insert({ tenant: 'next', kind: 'transaction', payload: tx }).then(({error}) => {
         if (error) { console.error('Failed to add transaction', error); logSyncError('addTransaction', 'insert', 'os_records', 'next', error); }
      });
    }
    return _transactionsCache;
  }

  function removeTransaction(id) {
    _transactionsCache = _transactionsCache.filter(t => t.id !== id);
    dispatchUpdate();
    if (_supabaseClient) {
      _supabaseClient.from('os_records').delete().eq('tenant', 'next').eq('kind', 'transaction').contains('payload', { id }).then(({error}) => {
         if (error) { console.error('Failed to delete transaction', error); logSyncError('removeTransaction', 'delete', 'os_records', 'next', error); }
      });
    }
    return _transactionsCache;
  }

  // ─── CSV IMPORT PIPELINE ─────────────────────────────────────────────────
  // Generic CSV -> JSON parser (handles quoted fields with embedded commas).
  function parseCsv(text) {
    const lines = String(text || '').split(/\r\n|\n|\r/).filter(l => l.trim().length);
    if (!lines.length) return [];
    const splitRow = (line) => {
      const cells = []; let cur = ''; let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') { inQuotes = false; }
          else { cur += ch; }
        } else if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { cells.push(cur); cur = ''; }
        else { cur += ch; }
      }
      cells.push(cur);
      return cells.map(c => c.trim());
    };
    const headers = splitRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
    return lines.slice(1).map(line => {
      const cells = splitRow(line);
      const row = {};
      headers.forEach((h, i) => { row[h] = cells[i] !== undefined ? cells[i] : ''; });
      return row;
    });
  }

  // Bulk-insert parsed CSV rows into a Supabase table, stamping every row
  // with the active tenant's id, then triggers a fleet re-fetch on success.
  async function importCsv(tableName, tenantId, csvText, columnMap) {
    await initSupabase();
    if (!_supabaseClient) return { ok: false, error: 'Supabase not initialized' };
    if (!tenantId) return { ok: false, error: 'tenant_id is required for CSV import' };

    const rows = parseCsv(csvText);
    if (!rows.length) return { ok: false, error: 'No rows found in CSV' };

    const payload = rows.map(row => {
      const mapped = { tenant_id: tenantId };
      Object.keys(columnMap || {}).forEach(col => {
        const source = columnMap[col];
        mapped[col] = typeof source === 'function' ? source(row) : row[source];
      });
      return mapped;
    });

    const { data, error } = await _supabaseClient.from(tableName).insert(payload).select();
    if (error) {
      logSyncError('csv_import_' + tableName, 'insert', tableName, tenantId, error);
      return { ok: false, error: error.message, imported: 0 };
    }

    await loadData();
    return { ok: true, imported: (data || payload).length };
  }

  // ─── Finance object ──────────────────────────────────────────────────────
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
    refreshFleet:    loadData,
    parseCsv:        parseCsv,
    importCsv:       importCsv,
  };
  
  // Start async data hydration immediately
  loadData();

})();
