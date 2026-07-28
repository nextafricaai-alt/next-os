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
  const SEED_INCOMES = [];
  const SEED_EXPENSES = [];

  let sb = null;
  let tenantId = null;

  // Initialize with empty arrays. We will fetch immediately.
  let state = {
    incomes: [],
    expenses: [],
    teachers: [],
    students: [],
    payments: [],
    attendance: [],
    staffSignins: []
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
      const [incRes, expRes, stuRes, tchRes, feeRes, attRes, staffAttRes] = await Promise.all([
        sb.from('school_income').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }),
        sb.from('school_expenses').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }),
        sb.from('students').select('*').eq('tenant_id', tenantId),
        sb.from('teachers').select('*').eq('tenant_id', tenantId),
        sb.from('fees').select('*').eq('tenant_id', tenantId).eq('kind', 'payment').order('id', { ascending: false }),
        sb.from('attendance').select('*, students(name, stream)').eq('tenant_id', tenantId).order('date', { ascending: false }),
        sb.from('staff_attendance').select('*, teachers(full_name, role)').eq('tenant_id', tenantId).order('date', { ascending: false })
      ]);

      if (incRes.data && !incRes.error) state.incomes = incRes.data.map(mapIncomeToApp);
      else state.incomes = SEED_INCOMES; // Table might not exist yet

      if (expRes.data && !expRes.error) state.expenses = expRes.data.map(mapExpenseToApp);
      else state.expenses = SEED_EXPENSES;

      if (stuRes.data) state.students = stuRes.data.map(mapStudentToApp);
      if (tchRes.data) state.teachers = tchRes.data.map(mapTeacherToApp);
      if (feeRes.data) state.payments = feeRes.data;
      if (attRes && attRes.data) state.attendance = attRes.data.map(mapAttendanceToApp);
      if (staffAttRes && staffAttRes.data) state.staffSignins = staffAttRes.data.map(mapStaffAttendanceToApp);

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

      if (!attRes?.error) {
        sb.channel('public:attendance')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `tenant_id=eq.${tenantId}` }, async () => {
            const r = await sb.from('attendance').select('*, students(name, stream)').eq('tenant_id', tenantId).order('date', { ascending: false });
            if (r.data) { state.attendance = r.data.map(mapAttendanceToApp); notify(); }
          }).subscribe();
      }

      if (!staffAttRes?.error) {
        sb.channel('public:staff_attendance')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_attendance', filter: `tenant_id=eq.${tenantId}` }, async () => {
            const r = await sb.from('staff_attendance').select('*, teachers(full_name, role)').eq('tenant_id', tenantId).order('date', { ascending: false });
            if (r.data) { state.staffSignins = r.data.map(mapStaffAttendanceToApp); notify(); }
          }).subscribe();
      }

      if (!stuRes?.error) {
        sb.channel('public:students')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `tenant_id=eq.${tenantId}` }, async () => {
            const r = await sb.from('students').select('*').eq('tenant_id', tenantId);
            if (r.data) { state.students = r.data.map(mapStudentToApp); notify(); }
          }).subscribe();
      }

      if (!tchRes?.error) {
        sb.channel('public:teachers')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers', filter: `tenant_id=eq.${tenantId}` }, async () => {
            const r = await sb.from('teachers').select('*').eq('tenant_id', tenantId);
            if (r.data) { state.teachers = r.data.map(mapTeacherToApp); notify(); }
          }).subscribe();
      }

      if (!feeRes?.error) {
        sb.channel('public:fees')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'fees', filter: `tenant_id=eq.${tenantId}` }, async () => {
            const r = await sb.from('fees').select('*').eq('tenant_id', tenantId).eq('kind', 'payment').order('id', { ascending: false });
            if (r.data) { state.payments = r.data; notify(); }
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
      role: 'Teacher',
      subject: Array.isArray(dbRow.subjects) ? dbRow.subjects.join(', ') : 'General',
      class: 'N/A',
      phone: dbRow.phone || dbRow.phone_number || '',
      email: dbRow.email || '',
      salary: Number(dbRow.monthly_salary || 500000),
      status: dbRow.status || 'Active',
      joinDate: dbRow.hire_date ? new Date(dbRow.hire_date).toLocaleDateString() : (dbRow.created_at ? new Date(dbRow.created_at).toLocaleDateString() : 'Unknown')
    };
  }

  function mapAttendanceToApp(dbRow) {
    // Attempt to extract method and gate from notes string, e.g. "07:45 AM - Main Gate - RFID Tag"
    const notesParts = (dbRow.notes || '').split(' - ');
    const time = notesParts[0] || '00:00 AM';
    const gate = notesParts[1] || 'Main Gate';
    const method = notesParts[2] || 'Manual Check-in';

    return {
      id: dbRow.id,
      name: dbRow.students?.name || 'Unknown Student',
      class: dbRow.students?.stream || 'N/A',
      time: time,
      status: dbRow.present ? 'Present' : 'Late',
      gate: gate,
      method: method
    };
  }

  function mapStaffAttendanceToApp(dbRow) {
    // Assuming time_in is 'HH:MM:SS'
    let timeFormatted = dbRow.time_in;
    if (timeFormatted && timeFormatted.length >= 5) {
      const parts = timeFormatted.split(':');
      let h = parseInt(parts[0], 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      timeFormatted = `${h < 10 ? '0'+h : h}:${parts[1]} ${ampm}`;
    }

    return {
      id: dbRow.id,
      name: dbRow.teachers?.full_name || 'Unknown Teacher',
      role: dbRow.teachers?.role || 'Staff',
      time: timeFormatted || '00:00 AM',
      status: dbRow.status || 'On Duty',
      room: dbRow.room,
      vehicle: dbRow.vehicle
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
    getAttendance: () => state.attendance,
    getStaffSignins: () => state.staffSignins,

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

    async addStudent(entry) {
      const tempId = 'temp-' + Date.now();
      const newAppEntry = { ...entry, id: tempId };
      state.students = [newAppEntry, ...state.students];
      notify();

      if (sb && tenantId) {
        const { data } = await sb.from('students').insert([{
          tenant_id: tenantId,
          name: entry.name,
          stream: entry.class,
          guardian_name: entry.guardian,
          guardian_phone: entry.guardianPhone,
          date_of_birth: entry.dob || null
        }]).select().single();

        if (data) {
          state.students = state.students.map(s => s.id === tempId ? mapStudentToApp(data) : s);
          notify();
        }
      }
    },

    async addTeacher(entry) {
      const tempId = 'temp-' + Date.now();
      const newAppEntry = { ...entry, id: tempId };
      state.teachers = [newAppEntry, ...state.teachers];
      notify();

      if (sb && tenantId) {
        const { data } = await sb.from('teachers').insert([{
          tenant_id: tenantId,
          full_name: entry.name,
          phone: entry.phone,
          email: entry.email,
          monthly_salary: entry.salary || 500000
        }]).select().single();

        if (data) {
          state.teachers = state.teachers.map(t => t.id === tempId ? mapTeacherToApp(data) : t);
          notify();
        }
      }
    },

    addPayment: () => {}
  };

})();
