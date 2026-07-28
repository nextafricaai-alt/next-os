/**
 * school-data-store.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared, persisted data layer for Kabs Lily Junior School & Kindercare Centre.
 * Used by BOTH the Bursar Dashboard and the Head Teacher Dashboard.
 * Reads/writes localStorage. Broadcasts cross-tab StorageEvent so both
 * dashboards update in real-time when either user makes a change.
 *
 * Exposes: window.SCHOOL_STORE
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const KEYS = {
    incomes:      'nextos.school.incomes',
    expenses:     'nextos.school.expenses',
    payments:     'nextos.school.payment_records',
    teachers:     'nextos.school.teachers',
    students:     'nextos.school.students',
  };

  /* ── Seed Data ── */

  const SEED_TEACHERS = [
    { id: 'TCH-001', name: 'Nalukenge Jane', role: 'Head Teacher / Bursar', subject: 'Administration', class: '—', phone: '+256 772 001 001', email: 'head@kabs-lily.ac.ug', salary: 1200000, status: 'On Duty', joinDate: '2019-01-10', qualification: 'Diploma in Education', photo: null },
    { id: 'TCH-002', name: 'Tr. Sarah Namuli', role: 'Class Teacher', subject: 'English & Science', class: 'P.4 (Room 4A)', phone: '+256 772 002 002', email: 'sarah.namuli@kabs-lily.ac.ug', salary: 650000, status: 'In Class', joinDate: '2021-03-01', qualification: 'Grade III Certificate', photo: null },
    { id: 'TCH-003', name: 'Tr. Moses Kizito', role: 'Class Teacher', subject: 'Math & SST', class: 'P.1 (Room 1B)', phone: '+256 772 003 003', email: 'moses.k@kabs-lily.ac.ug', salary: 580000, status: 'In Class', joinDate: '2022-02-14', qualification: 'Grade III Certificate', photo: null },
    { id: 'TCH-004', name: 'Tr. Patience Namutebi', role: 'Class Teacher', subject: 'Pre-Primary', class: 'Baby Class', phone: '+256 772 004 004', email: 'patience.n@kabs-lily.ac.ug', salary: 520000, status: 'In Class', joinDate: '2020-08-20', qualification: 'ECD Certificate', photo: null },
    { id: 'TCH-005', name: 'Mr. Bbosa Yusufu', role: 'Shuttle Driver', subject: '—', class: '—', phone: '+256 772 005 005', email: 'driver.bbosa@kabs-lily.ac.ug', salary: 400000, status: 'On Route', joinDate: '2020-06-01', qualification: 'Class B Driving Permit', photo: null },
    { id: 'TCH-006', name: 'Tr. Christine Akello', role: 'Class Teacher', subject: 'P.E & Arts', class: 'P.3', phone: '+256 772 006 006', email: 'christine.a@kabs-lily.ac.ug', salary: 560000, status: 'In Class', joinDate: '2023-01-09', qualification: 'Grade III Certificate', photo: null },
  ];

  const SEED_STUDENTS = [
    { id: 'STU-001', name: 'Brian Mukasa', class: 'P.4', type: 'Day Scholar', termFee: 750000, paidAmount: 750000, balance: 0, guardian: 'Mr. Mukasa Joseph', guardianPhone: '+256 700 101 001', admissionDate: '2022-01-15', dob: '2015-03-12' },
    { id: 'STU-002', name: 'Grace Kintu', class: 'Baby Class', type: 'Day Scholar', termFee: 350000, paidAmount: 350000, balance: 0, guardian: 'Mrs. Kintu Agnes', guardianPhone: '+256 700 101 002', admissionDate: '2024-01-10', dob: '2020-06-01' },
    { id: 'STU-003', name: 'Alvin Mwesigwa', class: 'P.1', type: 'Day Scholar', termFee: 400000, paidAmount: 350000, balance: 50000, guardian: 'Mr. Mwesigwa Robert', guardianPhone: '+256 700 101 003', admissionDate: '2023-01-12', dob: '2017-11-20' },
    { id: 'STU-004', name: 'Divine Okello', class: 'P.7', type: 'Day Scholar', termFee: 850000, paidAmount: 600000, balance: 250000, guardian: 'Mrs. Okello Doreen', guardianPhone: '+256 700 101 004', admissionDate: '2018-02-01', dob: '2010-08-15' },
    { id: 'STU-005', name: 'Joy Babirye', class: 'Top Class', type: 'Day Scholar', termFee: 380000, paidAmount: 380000, balance: 0, guardian: 'Mr. Babirye Steven', guardianPhone: '+256 700 101 005', admissionDate: '2023-09-01', dob: '2018-04-22' },
    { id: 'STU-006', name: 'Sharon Nabakooza', class: 'Baby Class', type: 'Day Scholar', termFee: 350000, paidAmount: 0, balance: 350000, guardian: 'Mrs. Nabakooza Lydia', guardianPhone: '+256 700 101 006', admissionDate: '2024-01-10', dob: '2020-09-10' },
    { id: 'STU-007', name: 'Ivan Sserunkuuma', class: 'P.5', type: 'Boarding', termFee: 1500000, paidAmount: 1500000, balance: 0, guardian: 'Mr. Sserunkuuma Philip', guardianPhone: '+256 700 101 007', admissionDate: '2020-01-20', dob: '2012-05-30' },
    { id: 'STU-008', name: 'Esther Nakazibwe', class: 'P.6', type: 'Boarding', termFee: 1500000, paidAmount: 1000000, balance: 500000, guardian: 'Mrs. Nakazibwe Ruth', guardianPhone: '+256 700 101 008', admissionDate: '2019-01-08', dob: '2011-12-01' },
    { id: 'STU-009', name: 'Daniel Okello', class: 'P.4', type: 'Day Scholar', termFee: 750000, paidAmount: 600000, balance: 150000, guardian: 'Mr. Okello Daniel Sr.', guardianPhone: '+256 700 101 009', admissionDate: '2022-01-17', dob: '2015-07-14' },
    { id: 'STU-010', name: 'Ruth Asiimwe', class: 'P.3', type: 'Day Scholar', termFee: 600000, paidAmount: 600000, balance: 0, guardian: 'Mrs. Asiimwe Grace', guardianPhone: '+256 700 101 010', admissionDate: '2022-09-05', dob: '2016-02-28' },
  ];

  const SEED_INCOMES = [
    { id: 'INC-001', date: '2026-07-28 07:30', studentName: 'Brian Mukasa', class: 'P.4', sourceType: 'School Fees (Tuition)', amount: 750000, unspentBalance: 580000, paymentMethod: 'Cash', receivedBy: 'Nalukenge Jane', notes: 'Term 2 fees — full payment', loggedBy: 'bursar' },
    { id: 'INC-002', date: '2026-07-28 08:15', studentName: 'Grace Kintu', class: 'Baby Class', sourceType: 'School Fees (Tuition)', amount: 350000, unspentBalance: 305000, paymentMethod: 'Cash', receivedBy: 'Nalukenge Jane', notes: 'Full fee clearance', loggedBy: 'bursar' },
    { id: 'INC-003', date: '2026-07-28 09:10', studentName: 'Alvin Mwesigwa', class: 'P.1', sourceType: 'Admission & Books', amount: 350000, unspentBalance: 245000, paymentMethod: 'Mobile Money', receivedBy: 'Nalukenge Jane', notes: 'Materials & registration fee', loggedBy: 'bursar' },
    { id: 'INC-004', date: '2026-07-28 10:00', studentName: 'Daniel Okello', class: 'P.4', sourceType: 'School Fees (Tuition)', amount: 600000, unspentBalance: 600000, paymentMethod: 'Cash', receivedBy: 'Nalukenge Jane', notes: 'Term 2 fees — partial balance', loggedBy: 'bursar' },
    { id: 'INC-005', date: '2026-07-28 11:30', studentName: 'Ruth Asiimwe', class: 'P.3', sourceType: 'Other Income', amount: 80000, unspentBalance: 80000, paymentMethod: 'Cash', receivedBy: 'Nalukenge Jane', notes: 'Swimming levy contribution', loggedBy: 'bursar' },
  ];

  const SEED_EXPENSES = [
    { id: 'EXP-001', date: '2026-07-28 08:00', category: 'Fuel & Transport', description: 'Shuttle Van Diesel (Mr. Bbosa)', amount: 50000, paidTo: 'Total Energies Kireka', incomeSourceId: 'INC-001', notes: 'Morning shuttle route fuel', receiptAttached: true, loggedBy: 'bursar' },
    { id: 'EXP-002', date: '2026-07-28 08:45', category: 'Food & Kitchen', description: 'Posho & Beans — Weekly Supply', amount: 120000, paidTo: 'Kireka Market Wholesale', incomeSourceId: 'INC-001', notes: 'Weekly lunch grains for 40 children', receiptAttached: true, loggedBy: 'bursar' },
    { id: 'EXP-003', date: '2026-07-28 09:30', category: 'Supplies & Stationery', description: 'Chalk, Exercise Books — Baby Class', amount: 45000, paidTo: 'Aristoc Booklex', incomeSourceId: 'INC-002', notes: 'Baby class stationery restocking', receiptAttached: true, loggedBy: 'bursar' },
    { id: 'EXP-004', date: '2026-07-28 10:15', category: 'Repairs & Maintenance', description: 'Plumbing — P.1 Washroom Tap', amount: 105000, paidTo: 'Fundi James', incomeSourceId: 'INC-003', notes: 'Emergency pipe replacement', receiptAttached: false, loggedBy: 'bursar' },
  ];

  const SEED_PAYMENTS = [
    { id: 'PAY-001', date: '2026-07-28 07:30', studentId: 'STU-001', studentName: 'Brian Mukasa', class: 'P.4', amount: 750000, type: 'School Fees (Tuition)', method: 'Cash', term: 'Term 2 2026', receivedBy: 'Nalukenge Jane', status: 'Cleared', incomeRef: 'INC-001' },
    { id: 'PAY-002', date: '2026-07-28 08:15', studentId: 'STU-002', studentName: 'Grace Kintu', class: 'Baby Class', amount: 350000, type: 'School Fees (Tuition)', method: 'Cash', term: 'Term 2 2026', receivedBy: 'Nalukenge Jane', status: 'Cleared', incomeRef: 'INC-002' },
    { id: 'PAY-003', date: '2026-07-28 09:10', studentId: 'STU-003', studentName: 'Alvin Mwesigwa', class: 'P.1', amount: 350000, type: 'Admission & Books', method: 'Mobile Money', term: 'Term 2 2026', receivedBy: 'Nalukenge Jane', status: 'Partial', incomeRef: 'INC-003' },
    { id: 'PAY-004', date: '2026-07-28 10:00', studentId: 'STU-009', studentName: 'Daniel Okello', class: 'P.4', amount: 600000, type: 'School Fees (Tuition)', method: 'Cash', term: 'Term 2 2026', receivedBy: 'Nalukenge Jane', status: 'Partial', incomeRef: 'INC-004' },
    { id: 'PAY-005', date: '2026-07-28 11:30', studentId: 'STU-010', studentName: 'Ruth Asiimwe', class: 'P.3', amount: 80000, type: 'Other Income', method: 'Cash', term: 'Term 2 2026', receivedBy: 'Nalukenge Jane', status: 'Cleared', incomeRef: 'INC-005' },
    { id: 'PAY-006', date: '2026-07-15 09:00', studentId: 'STU-007', studentName: 'Ivan Sserunkuuma', class: 'P.5', amount: 1500000, type: 'School Fees (Boarding)', method: 'Bank Transfer', term: 'Term 2 2026', receivedBy: 'Nalukenge Jane', status: 'Cleared', incomeRef: null },
    { id: 'PAY-007', date: '2026-07-16 10:30', studentId: 'STU-008', studentName: 'Esther Nakazibwe', class: 'P.6', amount: 1000000, type: 'School Fees (Boarding)', method: 'Mobile Money', term: 'Term 2 2026', receivedBy: 'Nalukenge Jane', status: 'Partial', incomeRef: null },
  ];

  /* ── Storage helpers ── */
  function load(key, seed) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // First run — seed the data
    save(key, seed);
    return seed;
  }

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      // Dispatch a custom event so same-tab listeners also react
      window.dispatchEvent(new CustomEvent('schoolStoreChange', { detail: { key } }));
    } catch (e) {}
  }

  /* ── Public API ── */
  window.SCHOOL_STORE = {

    // ── Incomes ──────────────────────────────────────────────
    getIncomes: () => load(KEYS.incomes, SEED_INCOMES),

    addIncome: (entry) => {
      const list = load(KEYS.incomes, SEED_INCOMES);
      const id = 'INC-' + String(list.length + 1).padStart(3, '0');
      const newEntry = { ...entry, id };
      list.unshift(newEntry);
      save(KEYS.incomes, list);

      // Auto-create a payment record for fee-type incomes
      if (entry.sourceType && entry.sourceType.includes('Fees')) {
        const payments = load(KEYS.payments, SEED_PAYMENTS);
        const payId = 'PAY-' + String(payments.length + 1).padStart(3, '0');
        const student = (window.SCHOOL_STORE.getStudents() || []).find(s =>
          s.name.toLowerCase() === entry.studentName.toLowerCase()
        );
        payments.unshift({
          id: payId, date: entry.date, studentId: student ? student.id : null,
          studentName: entry.studentName, class: entry.class, amount: entry.amount,
          type: entry.sourceType, method: entry.paymentMethod, term: 'Term 2 2026',
          receivedBy: entry.receivedBy || 'Nalukenge Jane', status: 'Cleared', incomeRef: id,
        });
        save(KEYS.payments, payments);

        // Update student's paidAmount
        if (student) {
          const students = load(KEYS.students, SEED_STUDENTS);
          const idx = students.findIndex(s => s.id === student.id);
          if (idx >= 0) {
            students[idx].paidAmount = Math.min(
              students[idx].termFee,
              (students[idx].paidAmount || 0) + entry.amount
            );
            students[idx].balance = Math.max(0, students[idx].termFee - students[idx].paidAmount);
            save(KEYS.students, students);
          }
        }
      }

      return { ...newEntry };
    },

    updateIncomeBalance: (id, deductAmount) => {
      const list = load(KEYS.incomes, SEED_INCOMES);
      const idx = list.findIndex(i => i.id === id);
      if (idx >= 0) {
        list[idx].unspentBalance = Math.max(0, (list[idx].unspentBalance || 0) - deductAmount);
        save(KEYS.incomes, list);
      }
    },

    // ── Expenses ─────────────────────────────────────────────
    getExpenses: () => load(KEYS.expenses, SEED_EXPENSES),

    addExpense: (entry) => {
      const list = load(KEYS.expenses, SEED_EXPENSES);
      const id = 'EXP-' + String(list.length + 1).padStart(3, '0');
      const newEntry = { ...entry, id };
      list.unshift(newEntry);
      save(KEYS.expenses, list);
      // Deduct from income source
      if (entry.incomeSourceId) {
        window.SCHOOL_STORE.updateIncomeBalance(entry.incomeSourceId, entry.amount);
      }
      return { ...newEntry };
    },

    // ── Payment Records ───────────────────────────────────────
    getPayments: () => load(KEYS.payments, SEED_PAYMENTS),

    addPayment: (entry) => {
      const list = load(KEYS.payments, SEED_PAYMENTS);
      const id = 'PAY-' + String(list.length + 1).padStart(3, '0');
      const newEntry = { ...entry, id };
      list.unshift(newEntry);
      save(KEYS.payments, list);
      return { ...newEntry };
    },

    // ── Teachers ──────────────────────────────────────────────
    getTeachers: () => load(KEYS.teachers, SEED_TEACHERS),

    addTeacher: (entry) => {
      const list = load(KEYS.teachers, SEED_TEACHERS);
      const id = 'TCH-' + String(list.length + 1).padStart(3, '0');
      const newEntry = { ...entry, id };
      list.push(newEntry);
      save(KEYS.teachers, list);
      return { ...newEntry };
    },

    updateTeacher: (id, patch) => {
      const list = load(KEYS.teachers, SEED_TEACHERS);
      const idx = list.findIndex(t => t.id === id);
      if (idx >= 0) { list[idx] = { ...list[idx], ...patch }; save(KEYS.teachers, list); }
    },

    // ── Students ──────────────────────────────────────────────
    getStudents: () => load(KEYS.students, SEED_STUDENTS),

    addStudent: (entry) => {
      const list = load(KEYS.students, SEED_STUDENTS);
      const id = 'STU-' + String(list.length + 1).padStart(3, '0');
      const newEntry = { ...entry, id };
      list.push(newEntry);
      save(KEYS.students, list);
      return { ...newEntry };
    },

    updateStudent: (id, patch) => {
      const list = load(KEYS.students, SEED_STUDENTS);
      const idx = list.findIndex(s => s.id === id);
      if (idx >= 0) { list[idx] = { ...list[idx], ...patch }; save(KEYS.students, list); }
    },

    // ── Listen for cross-tab / cross-component changes ────────
    onChange: (callback) => {
      window.addEventListener('schoolStoreChange', () => callback());
      window.addEventListener('storage', () => callback());
    },
  };

})();
