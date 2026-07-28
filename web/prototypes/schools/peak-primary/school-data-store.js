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

  // Clean empty fallback seed data (no mock data)
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
    if (!sb && window.supabase) {
      try {
        sb = window.supabase.createClient('https://llxhvqkkgftqwefmrofn.supabase.co', 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9');
      } catch(e) {}
    }

    tenantId = window.NextSession?.profile?.tenantId || 
               new URLSearchParams(location.search).get('t') || 
               localStorage.getItem('nextos.tenant_id') || 
               'kabs-lily-junior-school-and-kindercare-centre';

    if (!sb) {
      console.warn("SCHOOL_STORE: No active Supabase connection found.");
      state.incomes = [];
      state.expenses = [];
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

      let rawStudents = stuRes.data || [];
      if (incRes.data && !incRes.error) state.incomes = incRes.data.map(mapIncomeToApp);
      else state.incomes = SEED_INCOMES; // Table might not exist yet

      if (expRes.data && !expRes.error) state.expenses = expRes.data.map(mapExpenseToApp);
      else state.expenses = SEED_EXPENSES;

      if (rawStudents.length) state.students = rawStudents.map(s => mapStudentToApp(s, state.incomes));
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
            if (r.data) {
              state.incomes = r.data.map(mapIncomeToApp);
              if (rawStudents.length) state.students = rawStudents.map(s => mapStudentToApp(s, state.incomes));
              notify();
            }
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

  function mapStudentToApp(dbRow, incomesList = state.incomes) {
    const studentFullName = dbRow.full_name || dbRow.name || 'Unknown Student';
    const sName = studentFullName.trim().toLowerCase();
    const inc = (incomesList || []).find(i => {
      const iName = (i.studentName || i.student_name || '').trim().toLowerCase();
      return iName && sName && (iName === sName || iName.includes(sName) || sName.includes(iName));
    });

    const isBoarding = dbRow.is_boarding === true ||
                       (inc && (inc.sourceType || inc.source_type || '').toLowerCase().includes('boarding')) || 
                       (inc && (inc.notes || '').toLowerCase().includes('boarding')) ||
                       (dbRow.stream || '').toLowerCase().includes('boarding');

    const termFee = inc ? Number(inc.amount) : (isBoarding ? 500000 : 250000);
    const balance = inc ? Number(inc.unspentBalance ?? inc.unspent_balance ?? 0) : (isBoarding ? 250000 : 100000);
    const paidAmount = Math.max(0, termFee - balance);

    return {
      id: dbRow.id,
      name: studentFullName,
      class: dbRow.stream || dbRow.class || 'Unknown Class',
      type: isBoarding ? 'Boarding' : 'Day Scholar',
      boarding: isBoarding,
      termFee: termFee,
      paidAmount: paidAmount,
      balance: balance,
      guardian: dbRow.guardian_name || `Parent of ${studentFullName}`,
      guardianPhone: dbRow.guardian_phone || '+256700000000'
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

    async addPayment(entry) {
      const tempId = 'temp-' + Date.now();
      const newAppEntry = { ...entry, id: tempId };
      state.payments = [newAppEntry, ...state.payments];
      notify();

      if (sb && tenantId) {
        // If student_id is provided, use it; otherwise search or skip constraint
        const { data } = await sb.from('fees').insert([{
          tenant_id: tenantId,
          student_id: entry.studentId || 1, // Fallback student ID if not passed
          kind: 'payment',
          amount: Number(entry.amount),
          notes: entry.notes || entry.description || 'Fee payment'
        }]).select().single();

        if (data) {
          state.payments = state.payments.map(p => p.id === tempId ? data : p);
          notify();
        }
      }
    },

    parseFeesCsv(text) {
      if (!text || typeof text !== 'string') return [];
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return [];

      function splitCsvLine(line) {
        const out = [];
        let cur = '', inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (c === ',' && !inQuotes) {
            out.push(cur.trim());
            cur = '';
          } else {
            cur += c;
          }
        }
        out.push(cur.trim());
        return out;
      }

      const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('student') || h.includes('pupil') || h.includes('learner'));
      const classIdx = headers.findIndex(h => h.includes('class') || h.includes('stream') || h.includes('grade'));
      const feeTypeIdx = headers.findIndex(h => h.includes('type') || h.includes('category'));
      const fullFeeIdx = headers.findIndex(h => h.includes('full') || h.includes('total') || h.includes('charge') || h.includes('billed') || h.includes('expected'));
      const paidIdx = headers.findIndex(h => h.includes('paid') || h.includes('received') || h.includes('deposit') || h.includes('cleared'));
      const balanceIdx = headers.findIndex(h => h.includes('balance') || h.includes('due') || h.includes('arrears') || h.includes('owing'));
      const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('remark') || h.includes('comment'));

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = splitCsvLine(lines[i]);
        const name = nameIdx >= 0 ? parts[nameIdx] : parts[0];
        if (!name || name.toLowerCase().includes('total') || name.toLowerCase().includes('student name')) continue;

        const studentClass = classIdx >= 0 ? parts[classIdx] : (parts[1] || 'N/A');
        const feeTypeRaw = feeTypeIdx >= 0 ? parts[feeTypeIdx] : (parts[2] || 'Tuition');
        const fullFee = fullFeeIdx >= 0 ? Number((parts[fullFeeIdx] || '0').replace(/[^0-9.]/g, '')) : Number((parts[3] || '0').replace(/[^0-9.]/g, ''));
        const amountPaid = paidIdx >= 0 ? Number((parts[paidIdx] || '0').replace(/[^0-9.]/g, '')) : Number((parts[4] || '0').replace(/[^0-9.]/g, ''));
        let balance = balanceIdx >= 0 ? Number((parts[balanceIdx] || '0').replace(/[^0-9.]/g, '')) : (fullFee - amountPaid);
        if (isNaN(balance)) balance = Math.max(0, fullFee - amountPaid);

        const notes = notesIdx >= 0 ? parts[notesIdx] : (parts[7] || parts[6] || '');
        const isBoarding = feeTypeRaw.toLowerCase().includes('boarding') || notes.toLowerCase().includes('boarding');
        const feeType = isBoarding ? 'School Fees (Boarding)' : 'School Fees (Tuition)';
        const defaultFullFee = isBoarding ? 500000 : 250000;

        rows.push({
          name: name,
          studentName: name,
          class: studentClass,
          stream: studentClass,
          feeType: feeType,
          fullFees: fullFee || defaultFullFee,
          amount: fullFee || defaultFullFee,
          paidAmount: amountPaid || 0,
          balance: balance,
          unspentBalance: balance,
          notes: notes
        });
      }

      return rows;
    },

    async importFees(rows) {
      if (!Array.isArray(rows) || !rows.length) {
        return { success: false, error: 'No fee rows to import' };
      }

      const storeClient = sb || (window.NextSession && window.NextSession.sb);
      const activeTenant = tenantId || 'kabs-lily-junior-school-and-kindercare-centre';

      if (!storeClient) {
        return { success: false, error: 'Supabase database engine not initialized' };
      }

      try {
        // Deduplicate rows by student name
        const uniqueMap = new Map();
        for (const r of rows) {
          const name = (r.name || r.studentName || '').trim();
          if (!name || name.toLowerCase().includes('total')) continue;
          if (!uniqueMap.has(name.toLowerCase())) {
            uniqueMap.set(name.toLowerCase(), r);
          }
        }
        const cleanRows = Array.from(uniqueMap.values());

        // Delete child tables first to avoid FK constraint errors on students
        await storeClient.from('fees').delete().eq('tenant_id', activeTenant);
        await storeClient.from('attendance').delete().eq('tenant_id', activeTenant);
        await storeClient.from('school_income').delete().eq('tenant_id', activeTenant);
        await storeClient.from('students').delete().eq('tenant_id', activeTenant);

        const payloadIncome = cleanRows.map(r => {
          const isBoarding = (r.feeType || '').toLowerCase().includes('boarding') || (r.notes || '').toLowerCase().includes('boarding');
          return {
            tenant_id: activeTenant,
            student_name: r.name || r.studentName,
            class: r.class || r.stream || 'N/A',
            source_type: isBoarding ? 'School Fees (Boarding)' : 'School Fees (Tuition)',
            amount: Number(r.fullFees || r.amount || (isBoarding ? 500000 : 250000)),
            unspent_balance: Number(r.balance ?? r.unspentBalance ?? 0),
            payment_method: 'Cash',
            received_by: 'Nalukenge Jane',
            notes: r.notes || (isBoarding ? 'Boarding student fee ledger' : 'Day scholar fee ledger'),
            logged_by: 'head'
          };
        });

        const { error: incErr } = await storeClient.from('school_income').insert(payloadIncome);
        if (incErr) {
          console.error("Supabase import income error:", incErr);
          return { success: false, error: 'Income table error: ' + incErr.message };
        }

        // Insert students
        const payloadStudents = cleanRows.map((r, idx) => {
          const isBoarding = (r.feeType || '').toLowerCase().includes('boarding') || (r.notes || '').toLowerCase().includes('boarding');
          return {
            tenant_id: activeTenant,
            name: r.name || r.studentName,
            stream: r.class || r.stream || 'N/A',
            is_boarding: isBoarding,
            guardian_name: `Parent of ${r.name || r.studentName}`,
            guardian_phone: `+256700000${String(idx + 1).padStart(3, '0')}`
          };
        });

        const { data: insertedStudents, error: stuErr } = await storeClient.from('students').insert(payloadStudents).select();
        if (stuErr) {
          console.error("Supabase import students error:", stuErr);
          return { success: false, error: 'Students table error: ' + stuErr.message };
        }

        // Insert fees (charges & payments)
        if (insertedStudents && insertedStudents.length) {
          const feesPayload = [];
          insertedStudents.forEach((stuRow, idx) => {
            const orig = cleanRows[idx] || {};
            const isBoarding = stuRow.is_boarding;
            const fullFee = Number(orig.fullFees || orig.amount || (isBoarding ? 500000 : 250000));
            const paid = Number(orig.paidAmount || (fullFee - (orig.balance || 0)));

            feesPayload.push({
              tenant_id: activeTenant,
              student_id: stuRow.id,
              term: 'Term 2 2026',
              kind: 'charge',
              amount: fullFee,
              channel: 'Cash',
              reference: 'FEE-CHARGE-2026',
              notes: isBoarding ? 'Boarding Student Full Fee' : 'Day Scholar Full Fee'
            });

            if (paid > 0) {
              feesPayload.push({
                tenant_id: activeTenant,
                student_id: stuRow.id,
                term: 'Term 2 2026',
                kind: 'payment',
                amount: -paid,
                channel: 'Cash',
                reference: 'FEE-PAY-2026',
                notes: 'Fee Payment Received'
              });
            }
          });

          await storeClient.from('fees').insert(feesPayload);
        }

        // Refresh state
        const freshInc = await storeClient.from('school_income').select('*').eq('tenant_id', activeTenant).order('date', { ascending: false });
        const freshStu = await storeClient.from('students').select('*').eq('tenant_id', activeTenant);

        if (freshInc.data) state.incomes = freshInc.data.map(mapIncomeToApp);
        if (freshStu.data) rawStudents = freshStu.data;

        state.students = rawStudents.map(s => mapStudentToApp(s, state.incomes));
        notify();

        const boardingCount = state.students.filter(s => s.type === 'Boarding').length;
        const dayCount = state.students.length - boardingCount;

        return { 
          success: true, 
          count: state.students.length, 
          boardingCount: boardingCount,
          dayCount: dayCount
        };
      } catch (err) {
        console.error("importFees exception:", err);
        return { success: false, error: err.message || String(err) };
      }
    }
  };

})();
