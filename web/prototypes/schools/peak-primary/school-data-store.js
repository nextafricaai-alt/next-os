/**
 * school-data-store.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared, persisted data layer for Kabs Lily Junior School & Kindercare Centre.
 * Used by BOTH the Bursar Dashboard and the Head Teacher Dashboard.
 * 
 * Uses Supabase for real-time persistence. Falls back to mock data only if 
 * tables are missing or session is not active.
 *
 * Exposes: window.SCHOOL_STORE
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // Fallback seed data in case Supabase tables aren't created yet
  const SEED_INCOMES = [
    { id: 'INC-001', date: '2026-07-28 07:30', student_name: 'Brian Mukasa', class: 'P.4', source_type: 'School Fees (Tuition)', amount: 750000, unspent_balance: 580000, payment_method: 'Cash', received_by: 'Nalukenge Jane', notes: 'Term 2 fees — full payment', logged_by: 'bursar' }
  ];
  const SEED_EXPENSES = [
    { id: 'EXP-001', date: '2026-07-28 08:00', category: 'Fuel & Transport', description: 'Shuttle Van Diesel (Mr. Bbosa)', amount: 50000, paid_to: 'Total Energies Kireka', income_source_id: 'INC-001', notes: 'Morning shuttle route fuel', receipt_attached: true, logged_by: 'bursar' }
  ];

  let sb = null;
  let tenantId = null;

  // Initialize with empty arrays. We will fetch immediately.
  let state = {
    incomes: [],
    expenses: [],
    teachers: [],
    students: [],
    payments: []
  };

  const listeners = new Set();
  const notify = () => {
    window.dispatchEvent(new CustomEvent('schoolStoreChange'));
    listeners.forEach(fn => fn());
  };

  async function initSupabase() {
    sb = window.NextSession?.sb;
    tenantId = window.NextSession?.profile?.tenantId || new URLSearchParams(location.search).get('t');

    if (!sb || !tenantId) {
      console.warn("SCHOOL_STORE: No active Supabase session or tenant found. Falling back to local/seed mode.");
      state.incomes = SEED_INCOMES;
      state.expenses = SEED_EXPENSES;
      notify();
      return;
    }

    try {
      // Fetch initial data concurrently
      const [incRes, expRes, stuRes, tchRes, feeRes] = await Promise.all([
        sb.from('school_income').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }),
        sb.from('school_expenses').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }),
        sb.from('students').select('*').eq('tenant_id', tenantId),
        sb.from('teachers').select('*').eq('tenant_id', tenantId),
        sb.from('fees').select('*').eq('tenant_id', tenantId).eq('kind', 'payment').order('id', { ascending: false })
      ]);

      if (incRes.data && !incRes.error) state.incomes = incRes.data.map(mapIncomeToApp);
      else state.incomes = SEED_INCOMES; // Table might not exist yet

      if (expRes.data && !expRes.error) state.expenses = expRes.data.map(mapExpenseToApp);
      else state.expenses = SEED_EXPENSES;

      if (stuRes.data) state.students = stuRes.data.map(mapStudentToApp);
      if (tchRes.data) state.teachers = tchRes.data.map(mapTeacherToApp);
      if (feeRes.data) state.payments = feeRes.data;

      notify();

      // Subscribe to real-time changes if tables exist
      if (!incRes.error) {
        sb.channel('public:school_income')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'school_income', filter: `tenant_id=eq.${tenantId}` }, async () => {
            const r = await sb.from('school_income').select('*').eq('tenant_id', tenantId).order('date', { ascending: false });
            if (r.data) { state.incomes = r.data.map(mapIncomeToApp); notify(); }
          }).subscribe();
      }
      
      if (!expRes.error) {
        sb.channel('public:school_expenses')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'school_expenses', filter: `tenant_id=eq.${tenantId}` }, async () => {
            const r = await sb.from('school_expenses').select('*').eq('tenant_id', tenantId).order('date', { ascending: false });
            if (r.data) { state.expenses = r.data.map(mapExpenseToApp); notify(); }
          }).subscribe();
      }

    } catch (e) {
      console.error("SCHOOL_STORE Init Error:", e);
    }
  }

  // Transformers to map snake_case DB columns to camelCase App expectations
  function mapIncomeToApp(dbRow) {
    return {
      id: dbRow.id,
      date: new Date(dbRow.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(dbRow.date).toLocaleDateString(),
      studentName: dbRow.student_name,
      class: dbRow.class,
      sourceType: dbRow.source_type,
      amount: Number(dbRow.amount),
      unspentBalance: Number(dbRow.unspent_balance),
      paymentMethod: dbRow.payment_method,
      receivedBy: dbRow.received_by,
      notes: dbRow.notes,
      loggedBy: dbRow.logged_by
    };
  }

  function mapExpenseToApp(dbRow) {
    return {
      id: dbRow.id,
      date: new Date(dbRow.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(dbRow.date).toLocaleDateString(),
      category: dbRow.category,
      description: dbRow.description,
      amount: Number(dbRow.amount),
      paidTo: dbRow.paid_to,
      incomeSourceId: dbRow.income_source_id,
      notes: dbRow.notes,
      receiptAttached: dbRow.receipt_attached,
      loggedBy: dbRow.logged_by
    };
  }

  function mapStudentToApp(dbRow) {
    return {
      id: dbRow.id,
      name: dbRow.name || 'Unknown Student',
      class: dbRow.stream || 'Unknown Class',
      type: 'Day Scholar', // Not in standard DB schema yet
      termFee: 750000,     // Default dummy for prototype view
      paidAmount: 0,
      balance: 750000,
      guardian: dbRow.guardian_name || 'N/A',
      guardianPhone: dbRow.guardian_phone || ''
    };
  }

  function mapTeacherToApp(dbRow) {
    return {
      id: dbRow.id,
      name: dbRow.full_name || 'Unknown Teacher',
      role: dbRow.role || 'Teacher',
      subject: dbRow.department || 'General',
      class: 'N/A',
      phone: dbRow.phone_number || '',
      email: dbRow.email || '',
      salary: 500000, // Dummy
      status: 'Active',
      joinDate: dbRow.joined_at ? new Date(dbRow.joined_at).toLocaleDateString() : 'Unknown'
    };
  }



  // Kickoff initialization
  // We wait slightly to ensure session-guard has initialized sb
  setTimeout(initSupabase, 100);

  /* ── Public API ── */
  window.SCHOOL_STORE = {
    onChange: (callback) => {
      listeners.add(callback);
      window.addEventListener('schoolStoreChange', () => callback());
    },

    getIncomes: () => state.incomes,
    getExpenses: () => state.expenses,
    getTeachers: () => state.teachers,
    getStudents: () => state.students,
    getPayments: () => state.payments,

    async addIncome(entry) {
      // Optimistic update for UI feel
      const tempId = 'temp-' + Date.now();
      const newAppEntry = { ...entry, id: tempId, date: new Date().toISOString() };
      state.incomes = [newAppEntry, ...state.incomes];
      notify();

      if (sb && tenantId) {
        const { data, error } = await sb.from('school_income').insert([{
          tenant_id: tenantId,
          student_name: entry.studentName,
          class: entry.class,
          source_type: entry.sourceType,
          amount: entry.amount,
          unspent_balance: entry.unspentBalance || entry.amount,
          payment_method: entry.paymentMethod,
          received_by: entry.receivedBy,
          notes: entry.notes,
          logged_by: entry.loggedBy
        }]).select().single();

        if (data) {
          state.incomes = state.incomes.map(i => i.id === tempId ? mapIncomeToApp(data) : i);
          notify();
        }
      }
    },

    async addExpense(entry) {
      const tempId = 'temp-' + Date.now();
      const newAppEntry = { ...entry, id: tempId, date: new Date().toISOString() };
      state.expenses = [newAppEntry, ...state.expenses];
      
      // Optimistic deduct
      const incIdx = state.incomes.findIndex(i => i.id === entry.incomeSourceId);
      if (incIdx >= 0) {
        state.incomes[incIdx].unspentBalance = Math.max(0, state.incomes[incIdx].unspentBalance - entry.amount);
      }
      notify();

      if (sb && tenantId) {
        const { data } = await sb.from('school_expenses').insert([{
          tenant_id: tenantId,
          income_source_id: String(entry.incomeSourceId).startsWith('temp') ? null : entry.incomeSourceId, // Don't insert temp ID
          category: entry.category,
          description: entry.description,
          amount: entry.amount,
          paid_to: entry.paidTo,
          notes: entry.notes,
          receipt_attached: entry.receiptAttached,
          logged_by: entry.loggedBy
        }]).select().single();

        if (data) {
          state.expenses = state.expenses.map(e => e.id === tempId ? mapExpenseToApp(data) : e);
          notify();
        }
        
        // Actually deduct from income on DB
        if (!String(entry.incomeSourceId).startsWith('temp')) {
           const { data: currentInc } = await sb.from('school_income').select('unspent_balance').eq('id', entry.incomeSourceId).single();
           if (currentInc) {
             await sb.from('school_income').update({ unspent_balance: Math.max(0, currentInc.unspent_balance - entry.amount) }).eq('id', entry.incomeSourceId);
           }
        }
      }
    },

    // Stubbed additions for UI functionality
    addTeacher: () => {},
    addStudent: () => {},
    addPayment: () => {}
  };

})();
