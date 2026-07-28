/**
 * NEXT OS - Head Teacher / Administrator Operational & Cash Control Hub
 * Role holder: Nalukenge Jane (Head Teacher / Administrator)
 * Exposes: window.HeadTeacherView
 */
(function () {
  const React = window.React;
  const { useState, useEffect, useRef } = React;

  const T = {
    bg: '#0a1029',
    surface: '#141e3c',
    surface2: '#1a2548',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.15)',
    text: '#f5f6fa',
    textMuted: 'rgba(245,246,250,0.6)',
    mint: '#00FC8F',
    gold: '#FFB400',
    red: '#FF4757',
    blue: '#3B82F6',
    purple: '#8B5CF6'
  };

  // Pre-populated realistic initial data matching Nalukenge Jane's daily cash flow
  const INITIAL_INCOMES = [
    { id: 'INC-2026-001', date: '2026-07-28 07:30 AM', studentName: 'Brian Mukasa', class: 'P.4', sourceType: 'School Fees (Tuition)', amount: 750000, unspentBalance: 580000, paymentMethod: 'Cash', receivedBy: 'Nalukenge Jane', notes: 'Term 2 fees payment' },
    { id: 'INC-2026-002', date: '2026-07-28 08:15 AM', studentName: 'Grace Kintu', class: 'Baby', sourceType: 'School Fees (Tuition)', amount: 350000, unspentBalance: 305000, paymentMethod: 'Cash', receivedBy: 'Nalukenge Jane', notes: 'Full fee clearance' },
    { id: 'INC-2026-003', date: '2026-07-28 09:10 AM', studentName: 'Alvin Mwesigwa', class: 'P.1', sourceType: 'Admission & Books', amount: 350000, unspentBalance: 245000, paymentMethod: 'Mobile Money', receivedBy: 'Nalukenge Jane', notes: 'Materials & Reg fee' },
  ];

  const INITIAL_EXPENSES = [
    { id: 'EXP-2026-001', date: '2026-07-28 08:00 AM', category: 'Fuel & Transport', description: 'Shuttle Van Diesel (Mr. Bbosa)', amount: 50000, paidTo: 'Total Energies Kireka', incomeSourceId: 'INC-2026-001', studentSource: 'Brian Mukasa (P.4)', notes: 'Morning shuttle route fuel', receiptAttached: true },
    { id: 'EXP-2026-002', date: '2026-07-28 08:45 AM', category: 'Food & Groceries', description: 'Kitchen Posho & Beans Supply', amount: 120000, paidTo: 'Kireka Market Wholesale', incomeSourceId: 'INC-2026-001', studentSource: 'Brian Mukasa (P.4)', notes: 'Weekly lunch grains', receiptAttached: true },
    { id: 'EXP-2026-003', date: '2026-07-28 09:30 AM', category: 'Supplies', description: 'Classroom Chalk & Exercise Books', amount: 45000, paidTo: 'Aristoc Booklex', incomeSourceId: 'INC-2026-002', studentSource: 'Grace Kintu (Baby)', notes: 'Baby class supplies', receiptAttached: true },
    { id: 'EXP-2026-004', date: '2026-07-28 10:15 AM', category: 'Repairs & Maintenance', description: 'Plumbing Repair (P.1 Washroom Tap)', amount: 105000, paidTo: 'Fundi James', incomeSourceId: 'INC-2026-003', studentSource: 'Alvin Mwesigwa (P.1)', notes: 'Emergency pipe replacement', receiptAttached: false },
  ];

  const GATE_ATTENDANCE = [
    { id: 1, name: 'Brian Mukasa', class: 'P.4', time: '07:42 AM', status: 'Present', gate: 'Main Gate', method: 'RFID Tag' },
    { id: 2, name: 'Grace Kintu', class: 'Baby Class', time: '07:45 AM', status: 'Present', gate: 'Main Gate', method: 'Manual Check-in' },
    { id: 3, name: 'Alvin Mwesigwa', class: 'P.1', time: '07:50 AM', status: 'Present', gate: 'Main Gate', method: 'Shuttle Dropoff' },
    { id: 4, name: 'Divine Okello', class: 'P.7', time: '07:55 AM', status: 'Present', gate: 'Main Gate', method: 'Shuttle Dropoff' },
    { id: 5, name: 'Joy Babirye', class: 'Top Class', time: '08:10 AM', status: 'Late', gate: 'Main Gate', method: 'Parent Dropoff' },
  ];

  const STAFF_SIGNINS = [
    { id: 1, name: 'Nalukenge Jane', role: 'Head Teacher', time: '06:45 AM', status: 'On Duty', room: 'Administration' },
    { id: 2, name: 'Mr. Bbosa Yusufu', role: 'Shuttle Driver', time: '06:30 AM', status: 'On Route', vehicle: 'UAB 218 Y' },
    { id: 3, name: 'Tr. Sarah Namuli', role: 'P.4 Class Teacher', time: '07:15 AM', status: 'In Class', room: 'Room 4A' },
    { id: 4, name: 'Tr. Moses K.', role: 'P.1 Teacher', time: '07:20 AM', status: 'In Class', room: 'Room 1B' },
  ];

  function HeadTeacherView() {
    const [activeTab, setActiveTab] = useState('cash'); // 'cash' | 'gate' | 'transport' | 'staff'
    const [incomes, setIncomes] = useState(INITIAL_INCOMES);
    const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
    const [showIncomeModal, setShowIncomeModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Income Form State
    const [incStudent, setIncStudent] = useState('');
    const [incClass, setIncClass] = useState('P.4');
    const [incAmount, setIncAmount] = useState('');
    const [incSource, setIncSource] = useState('School Fees (Tuition)');
    const [incMethod, setIncMethod] = useState('Cash');
    const [incNotes, setIncNotes] = useState('');

    // Expense Form State
    const [expCategory, setExpCategory] = useState('Fuel & Transport');
    const [expDesc, setExpDesc] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expPaidTo, setExpPaidTo] = useState('');
    const [expIncomeSourceId, setExpIncomeSourceId] = useState(INITIAL_INCOMES[0].id);
    const [expNotes, setExpNotes] = useState('');

    // Calculated Totals
    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const cashOnHand = totalIncome - totalExpenses;

    // Handle Income Add
    const handleAddIncome = (e) => {
      e.preventDefault();
      if (!incStudent || !incAmount) return;
      const amt = Number(incAmount);
      const newInc = {
        id: `INC-2026-00${incomes.length + 1}`,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today',
        studentName: incStudent,
        class: incClass,
        sourceType: incSource,
        amount: amt,
        unspentBalance: amt,
        paymentMethod: incMethod,
        receivedBy: 'Nalukenge Jane',
        notes: incNotes || 'Direct cash received by Head Teacher'
      };
      setIncomes([newInc, ...incomes]);
      setIncStudent('');
      setIncAmount('');
      setIncNotes('');
      setShowIncomeModal(false);
    };

    // Handle Expense Add with Source Attribution Linkage
    const handleAddExpense = (e) => {
      e.preventDefault();
      if (!expDesc || !expAmount) return;
      const amt = Number(expAmount);

      const targetInc = incomes.find(i => i.id === expIncomeSourceId) || incomes[0];
      
      // Update unspent balance of source income
      const updatedIncomes = incomes.map(inc => {
        if (inc.id === targetInc.id) {
          return { ...inc, unspentBalance: Math.max(0, inc.unspentBalance - amt) };
        }
        return inc;
      });
      setIncomes(updatedIncomes);

      const newExp = {
        id: `EXP-2026-00${expenses.length + 1}`,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today',
        category: expCategory,
        description: expDesc,
        amount: amt,
        paidTo: expPaidTo || 'Vendor / Driver',
        incomeSourceId: targetInc.id,
        studentSource: `${targetInc.studentName} (${targetInc.class})`,
        notes: expNotes || 'Logged & linked by Nalukenge Jane',
        receiptAttached: true
      };

      setExpenses([newExp, ...expenses]);
      setExpDesc('');
      setExpAmount('');
      setExpPaidTo('');
      setExpNotes('');
      setShowExpenseModal(false);
    };

    // Sign out handler
    const handleSignOut = () => {
      localStorage.removeItem('nextos.profile');
      window.location.href = '/prototypes/schools/peak-primary/login.html';
    };

    const formatUgx = (num) => 'UGX ' + Number(num).toLocaleString();

    // Filtered Expense Log
    const filteredExpenses = expenses.filter(e => {
      const matchCat = filterCategory === 'All' ? true : e.category === filterCategory;
      const matchSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.studentSource.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.paidTo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text }}>
        
        {/* Header Bar */}
        <header style={{
          background: T.surface, borderBottom: `1px solid ${T.borderStrong}`, padding: '16px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', background: T.mint, color: '#0A1029',
              fontWeight: '900', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #FFF', boxShadow: `0 0 16px ${T.mint}`
            }}>
              NJ
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Nalukenge Jane</h1>
                <span style={{ background: 'rgba(0,252,143,0.15)', color: T.mint, border: `1px solid ${T.mint}`, padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                  HEAD TEACHER / ADMINISTRATOR
                </span>
              </div>
              <div style={{ fontSize: '12px', color: T.textMuted, marginTop: '2px' }}>
                Kabs Lily Kindercare & Primary School · On-Site Live Cash & Operations Supervisor
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowReconcileModal(true)}
              style={{
                background: 'rgba(255,180,0,0.15)', color: T.gold, border: `1px solid ${T.gold}`,
                padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px'
              }}
            >
              🔒 End-of-Day Cash Lock
            </button>

            <button
              onClick={handleSignOut}
              style={{
                background: 'rgba(255,71,87,0.15)', color: T.red, border: `1px solid ${T.red}`,
                padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px'
              }}
            >
              🔴 Sign-Out
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ padding: '24px', flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Operating Cash & Live Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Today's Cash Received */}
            <div style={{ background: T.surface, padding: '20px', borderRadius: '14px', border: `1px solid ${T.borderStrong}`, position: 'relative' }}>
              <div style={{ fontSize: '12px', color: T.textMuted, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                Today's Cash Income Logged
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: T.mint, marginTop: '8px' }}>
                {formatUgx(totalIncome)}
              </div>
              <div style={{ fontSize: '12px', color: T.textMuted, marginTop: '6px' }}>
                {incomes.length} incoming fee payments recorded
              </div>
              <button
                onClick={() => setShowIncomeModal(true)}
                style={{
                  marginTop: '14px', width: '100%', background: T.mint, color: '#0A1029', border: 'none',
                  padding: '10px', borderRadius: '8px', fontWeight: '800', fontSize: '13px', cursor: 'pointer'
                }}
              >
                ➕ Log Incoming Cash / Fee
              </button>
            </div>

            {/* Today's Expenses Paid Out */}
            <div style={{ background: T.surface, padding: '20px', borderRadius: '14px', border: `1px solid ${T.borderStrong}` }}>
              <div style={{ fontSize: '12px', color: T.textMuted, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                Today's Expenses Paid Out
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: T.red, marginTop: '8px' }}>
                {formatUgx(totalExpenses)}
              </div>
              <div style={{ fontSize: '12px', color: T.textMuted, marginTop: '6px' }}>
                {expenses.length} operating expenses logged & linked
              </div>
              <button
                onClick={() => setShowExpenseModal(true)}
                style={{
                  marginTop: '14px', width: '100%', background: 'rgba(255,71,87,0.2)', color: T.red, border: `1.5px solid ${T.red}`,
                  padding: '10px', borderRadius: '8px', fontWeight: '800', fontSize: '13px', cursor: 'pointer'
                }}
              >
                💸 Log Expense (Link to Fee)
              </button>
            </div>

            {/* Physical Cash in Hand Balance */}
            <div style={{ background: T.surface2, padding: '20px', borderRadius: '14px', border: `2px solid ${T.gold}`, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: T.gold, textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>
                  💵 Operating Cash Balance in Hand
                </div>
                <span style={{ background: T.gold, color: '#000', fontSize: '10px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px' }}>
                  LIVE
                </span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFF', marginTop: '8px' }}>
                {formatUgx(cashOnHand)}
              </div>
              <div style={{ fontSize: '12px', color: T.textMuted, marginTop: '6px' }}>
                Physical cash held by Nalukenge Jane right now
              </div>
              <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.06)', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: T.mint, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🛡️</span> Director Audit Trail Active (Source-Attributed)
              </div>
            </div>

          </div>

          {/* Navigation Tabs for Head Teacher Operations */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('cash')}
              style={{
                background: activeTab === 'cash' ? T.mint : T.surface,
                color: activeTab === 'cash' ? '#0A1029' : T.text,
                border: `1px solid ${activeTab === 'cash' ? T.mint : T.border}`,
                padding: '10px 18px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px'
              }}
            >
              💰 Cash & Expenditure Audit Log ({expenses.length})
            </button>
            
            <button
              onClick={() => setActiveTab('gate')}
              style={{
                background: activeTab === 'gate' ? T.mint : T.surface,
                color: activeTab === 'gate' ? '#0A1029' : T.text,
                border: `1px solid ${activeTab === 'gate' ? T.mint : T.border}`,
                padding: '10px 18px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px'
              }}
            >
              📋 Gate Attendance & Check-Ins ({GATE_ATTENDANCE.length})
            </button>

            <button
              onClick={() => setActiveTab('transport')}
              style={{
                background: activeTab === 'transport' ? T.mint : T.surface,
                color: activeTab === 'transport' ? '#0A1029' : T.text,
                border: `1px solid ${activeTab === 'transport' ? T.mint : T.border}`,
                padding: '10px 18px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px'
              }}
            >
              🚌 Live Shuttle Telemetry & Map
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              style={{
                background: activeTab === 'staff' ? T.mint : T.surface,
                color: activeTab === 'staff' ? '#0A1029' : T.text,
                border: `1px solid ${activeTab === 'staff' ? T.mint : T.border}`,
                padding: '10px 18px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px'
              }}
            >
              👩‍🏫 Staff Duty Roster & Attendance ({STAFF_SIGNINS.length})
            </button>
          </div>

          {/* TAB 1: CASH & EXPENDITURE ATTRIBUTION LOG */}
          {activeTab === 'cash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Core Feature Explanation Banner */}
              <div style={{
                background: 'linear-gradient(90deg, rgba(0,252,143,0.1), rgba(59,130,246,0.1))',
                border: `1px solid ${T.mint}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
              }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: T.mint }}>
                    🔗 SOURCE-TO-USE CASH ATTRIBUTION TRAIL (DIRECTOR VERIFIED)
                  </div>
                  <div style={{ fontSize: '12px', color: T.textMuted, marginTop: '4px' }}>
                    Every expense logged by Head Teacher Jane is explicitly linked to the exact student fee receipt that funded it (*e.g., Fees from Brian Mukasa ➔ Paid as Shuttle Fuel*).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowIncomeModal(true)}
                    style={{ background: T.mint, color: '#0A1029', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Income
                  </button>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    style={{ background: T.red, color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
                  >
                    - Expense
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['All', 'Fuel & Transport', 'Food & Groceries', 'Supplies', 'Repairs & Maintenance'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      style={{
                        background: filterCategory === cat ? T.surface2 : 'transparent',
                        color: filterCategory === cat ? T.mint : T.textMuted,
                        border: `1px solid ${filterCategory === cat ? T.mint : T.border}`,
                        padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search expense, student or vendor..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: T.surface, color: T.text, border: `1px solid ${T.border}`, padding: '8px 12px',
                    borderRadius: '6px', fontSize: '12px', width: '260px', outline: 'none'
                  }}
                />
              </div>

              {/* Expenditure Table with Source Attribution Linkage */}
              <div style={{ background: T.surface, borderRadius: '12px', border: `1px solid ${T.borderStrong}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: T.surface2, color: T.textMuted, borderBottom: `1px solid ${T.border}` }}>
                      <th style={{ padding: '12px 16px' }}>Date / Time</th>
                      <th style={{ padding: '12px 16px' }}>Category & Expense</th>
                      <th style={{ padding: '12px 16px' }}>Amount Spent</th>
                      <th style={{ padding: '12px 16px' }}>Funded From (Income Source)</th>
                      <th style={{ padding: '12px 16px' }}>Paid To</th>
                      <th style={{ padding: '12px 16px' }}>Receipt Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp, idx) => (
                      <tr key={exp.id} style={{ borderBottom: `1px solid ${T.border}`, background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '14px 16px', color: T.textMuted, fontSize: '12px' }}>
                          <div>{exp.date}</div>
                          <div style={{ fontSize: '10px', color: T.mint, marginTop: '2px' }}>ID: {exp.id}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: '800', color: '#FFF' }}>{exp.description}</div>
                          <div style={{ fontSize: '11px', color: T.gold, marginTop: '2px' }}>🏷️ {exp.category}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '900', color: T.red, fontSize: '14px' }}>
                          -{formatUgx(exp.amount)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ background: 'rgba(0,252,143,0.1)', border: `1px dashed ${T.mint}`, padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                            <div style={{ fontWeight: '700', color: T.mint, fontSize: '12px' }}>
                              🎓 {exp.studentSource}
                            </div>
                            <div style={{ fontSize: '10px', color: T.textMuted, marginTop: '2px' }}>
                              Source Ref: {exp.incomeSourceId}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', color: T.text }}>
                          {exp.paidTo}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            background: exp.receiptAttached ? 'rgba(0,252,143,0.15)' : 'rgba(255,180,0,0.15)',
                            color: exp.receiptAttached ? T.mint : T.gold,
                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700'
                          }}>
                            {exp.receiptAttached ? '🧾 Receipt Attached' : '⚠️ Pending Receipt'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Income Sources Running Balances */}
              <div style={{ background: T.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${T.borderStrong}` }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: T.mint, marginBottom: '14px' }}>
                  📥 Incoming Fee Collections & Remaining Allocation Balances
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {incomes.map(inc => (
                    <div key={inc.id} style={{ background: T.surface2, padding: '14px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: '800', color: '#FFF' }}>{inc.studentName} ({inc.class})</div>
                          <div style={{ fontSize: '11px', color: T.textMuted }}>{inc.sourceType} · {inc.date}</div>
                        </div>
                        <div style={{ fontWeight: '900', color: T.mint, fontSize: '14px' }}>
                          +{formatUgx(inc.amount)}
                        </div>
                      </div>
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: T.textMuted }}>Unspent Allocation Balance:</span>
                        <span style={{ fontWeight: '800', color: inc.unspentBalance > 0 ? T.gold : T.red }}>
                          {formatUgx(inc.unspentBalance)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: GATE ATTENDANCE */}
          {activeTab === 'gate' && (
            <div style={{ background: T.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${T.borderStrong}` }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: T.mint, marginBottom: '16px' }}>
                📋 Student Gate Attendance & Morning Check-Ins
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: T.surface2, color: T.textMuted }}>
                    <th style={{ padding: '12px' }}>Time</th>
                    <th style={{ padding: '12px' }}>Student Name</th>
                    <th style={{ padding: '12px' }}>Class</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Entry Method</th>
                  </tr>
                </thead>
                <tbody>
                  {GATE_ATTENDANCE.map(s => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '12px', color: T.textMuted }}>{s.time}</td>
                      <td style={{ padding: '12px', fontWeight: '800' }}>{s.name}</td>
                      <td style={{ padding: '12px' }}>{s.class}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: s.status === 'Present' ? 'rgba(0,252,143,0.15)' : 'rgba(255,180,0,0.15)',
                          color: s.status === 'Present' ? T.mint : T.gold,
                          padding: '4px 8px', borderRadius: '4px', fontWeight: '800', fontSize: '11px'
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: T.textMuted }}>{s.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: LIVE SHUTTLE TELEMETRY & MAP */}
          {activeTab === 'transport' && (
            <div style={{ background: T.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: T.mint, margin: 0 }}>
                  🚌 Live Shuttle Telemetry & Driver GPS Monitor
                </h2>
                <div style={{ fontSize: '12px', color: T.mint, fontWeight: '700' }}>
                  🟢 Driver: Mr. Bbosa Yusufu (UAB 218 Y)
                </div>
              </div>
              <HeadTeacherFleetMap />
            </div>
          )}

          {/* TAB 4: STAFF ATTENDANCE */}
          {activeTab === 'staff' && (
            <div style={{ background: T.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${T.borderStrong}` }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: T.mint, marginBottom: '16px' }}>
                👩‍🏫 Staff Duty Roster & On-Site Attendance
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: T.surface2, color: T.textMuted }}>
                    <th style={{ padding: '12px' }}>Staff Name</th>
                    <th style={{ padding: '12px' }}>Role / Designation</th>
                    <th style={{ padding: '12px' }}>Sign-In Time</th>
                    <th style={{ padding: '12px' }}>Current Status</th>
                  </tr>
                </thead>
                <tbody>
                  {STAFF_SIGNINS.map(st => (
                    <tr key={st.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '12px', fontWeight: '800' }}>{st.name}</td>
                      <td style={{ padding: '12px', color: T.textMuted }}>{st.role}</td>
                      <td style={{ padding: '12px' }}>{st.time}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: 'rgba(0,252,143,0.15)', color: T.mint, padding: '4px 8px', borderRadius: '4px', fontWeight: '800', fontSize: '11px' }}>
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </main>

        {/* MODAL 1: LOG INCOME */}
        {showIncomeModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
          }}>
            <div style={{ background: T.surface, border: `1.5px solid ${T.mint}`, borderRadius: '14px', width: '100%', maxWidth: '500px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: T.mint, marginBottom: '16px' }}>
                ➕ Log Incoming Cash / Fee Payment
              </h2>
              <form onSubmit={handleAddIncome} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: T.textMuted, fontWeight: '700' }}>Student Name</label>
                  <input
                    type="text" required placeholder="e.g. Brian Mukasa"
                    value={incStudent} onChange={e => setIncStudent(e.target.value)}
                    style={{ width: '100%', background: T.bg, color: T.text, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: T.textMuted, fontWeight: '700' }}>Class</label>
                    <select
                      value={incClass} onChange={e => setIncClass(e.target.value)}
                      style={{ width: '100%', background: T.bg, color: T.text, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                    >
                      <option value="Baby">Baby Class</option>
                      <option value="Middle">Middle Class</option>
                      <option value="Top">Top Class</option>
                      <option value="P.1">P.1</option>
                      <option value="P.2">P.2</option>
                      <option value="P.3">P.3</option>
                      <option value="P.4">P.4</option>
                      <option value="P.5">P.5</option>
                      <option value="P.6">P.6</option>
                      <option value="P.7">P.7</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: T.textMuted, fontWeight: '700' }}>Amount Received (UGX)</label>
                    <input
                      type="number" required placeholder="e.g. 350000"
                      value={incAmount} onChange={e => setIncAmount(e.target.value)}
                      style={{ width: '100%', background: T.bg, color: T.text, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: T.textMuted, fontWeight: '700' }}>Payment Source Type</label>
                  <select
                    value={incSource} onChange={e => setIncSource(e.target.value)}
                    style={{ width: '100%', background: T.bg, color: T.text, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                  >
                    <option value="School Fees (Tuition)">School Fees (Tuition)</option>
                    <option value="Admission & Books">Admission & Books</option>
                    <option value="Shuttle Transport Fee">Shuttle Transport Fee</option>
                    <option value="Uniforms & Badges">Uniforms & Badges</option>
                    <option value="Other Cash Deposit">Other Cash Deposit</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: T.textMuted, fontWeight: '700' }}>Notes / Remarks</label>
                  <input
                    type="text" placeholder="e.g. Cash handed over by guardian at gate"
                    value={incNotes} onChange={e => setIncNotes(e.target.value)}
                    style={{ width: '100%', background: T.bg, color: T.text, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowIncomeModal(false)} style={{ flex: 1, background: 'transparent', color: T.textMuted, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ flex: 1, background: T.mint, color: '#0A1029', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' }}>
                    Record Cash Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: LOG EXPENDITURE WITH SOURCE ATTRIBUTION */}
        {showExpenseModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
          }}>
            <div style={{ background: T.surface, border: `1.5px solid ${T.red}`, borderRadius: '14px', width: '100%', maxWidth: '540px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: T.red, marginBottom: '6px' }}>
                💸 Log Expenditure (Attributed Source Link)
              </h2>
              <div style={{ fontSize: '12px', color: T.textMuted, marginBottom: '16px' }}>
                Select which student fee payment funded this exact cash expense.
              </div>

              <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: T.gold, fontWeight: '800' }}>
                    🔗 SELECT INCOME SOURCE (WHICH FEE FUNDED THIS?)
                  </label>
                  <select
                    value={expIncomeSourceId} onChange={e => setExpIncomeSourceId(e.target.value)}
                    style={{ width: '100%', background: T.surface2, color: T.mint, border: `1.5px solid ${T.mint}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none', fontWeight: '700' }}
                  >
                    {incomes.map(inc => (
                      <option key={inc.id} value={inc.id}>
                        {inc.studentName} ({inc.class}) — Available: UGX {inc.unspentBalance.toLocaleString()} ({inc.sourceType})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: T.textMuted, fontWeight: '700' }}>Category</label>
                    <select
                      value={expCategory} onChange={e => setExpCategory(e.target.value)}
                      style={{ width: '100%', background: T.bg, color: T.text, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                    >
                      <option value="Fuel & Transport">Fuel & Transport</option>
                      <option value="Food & Groceries">Food & Groceries</option>
                      <option value="Supplies">Classroom Supplies</option>
                      <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                      <option value="Casual Wages">Casual Wages</option>
                      <option value="Emergency Cash">Emergency Cash</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: T.textMuted, fontWeight: '700' }}>Amount Spent (UGX)</label>
                    <input
                      type="number" required placeholder="e.g. 50000"
                      value={expAmount} onChange={e => setExpAmount(e.target.value)}
                      style={{ width: '100%', background: T.bg, color: T.text, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: T.textMuted, fontWeight: '700' }}>Expense Description</label>
                  <input
                    type="text" required placeholder="e.g. Shuttle Diesel Fuel for Mr. Bbosa"
                    value={expDesc} onChange={e => setExpDesc(e.target.value)}
                    style={{ width: '100%', background: T.bg, color: T.text, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: T.textMuted, fontWeight: '700' }}>Paid To (Vendor / Person)</label>
                  <input
                    type="text" placeholder="e.g. Total Energies Kireka"
                    value={expPaidTo} onChange={e => setExpPaidTo(e.target.value)}
                    style={{ width: '100%', background: T.bg, color: T.text, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowExpenseModal(false)} style={{ flex: 1, background: 'transparent', color: T.textMuted, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ flex: 1, background: T.red, color: '#FFF', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' }}>
                    Record & Link Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: END OF DAY RECONCILIATION */}
        {showReconcileModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
          }}>
            <div style={{ background: T.surface, border: `1.5px solid ${T.gold}`, borderRadius: '14px', width: '100%', maxWidth: '480px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: T.gold, marginBottom: '6px' }}>
                🔒 End-of-Day Physical Cash Reconciliation
              </h2>
              <div style={{ fontSize: '12px', color: T.textMuted, marginBottom: '16px' }}>
                Verify physical cash in hand matches system calculated balance before locking today's ledger for the Director.
              </div>

              <div style={{ background: T.surface2, padding: '16px', borderRadius: '8px', marginBottom: '16px', border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: T.textMuted }}>Total Cash Received:</span>
                  <span style={{ fontWeight: '800', color: T.mint }}>{formatUgx(totalIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: T.textMuted }}>Total Expenses Paid Out:</span>
                  <span style={{ fontWeight: '800', color: T.red }}>-{formatUgx(totalExpenses)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px solid ${T.border}`, fontSize: '15px' }}>
                  <span style={{ fontWeight: '800', color: '#FFF' }}>Expected Cash in Hand:</span>
                  <span style={{ fontWeight: '900', color: T.gold }}>{formatUgx(cashOnHand)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowReconcileModal(false)} style={{ flex: 1, background: 'transparent', color: T.textMuted, border: `1px solid ${T.border}`, padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>
                  Dismiss
                </button>
                <button onClick={() => { alert('End-of-day cash reconciliation locked! Submitted to Director Dashboard.'); setShowReconcileModal(false); }} style={{ flex: 1, background: T.gold, color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '900', cursor: 'pointer' }}>
                  Confirm & Lock Cash Log
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Embedded Head Teacher Shuttle Telemetry Map Component
  const HeadTeacherFleetMap = () => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);

    useEffect(() => {
      if (!mapRef.current || mapInstance.current) return;
      if (typeof window.L === 'undefined') return;

      const L = window.L;
      const map = L.map(mapRef.current, {
        center: [0.3540, 32.6200],
        zoom: 13,
        zoomControl: true,
        attributionControl: false
      });
      mapInstance.current = map;

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }).addTo(map);

      // School Gate Marker
      const schoolIcon = L.divIcon({
        className: 'school-gate-marker',
        html: `<div style="background:#00FC8F; color:#0A1029; font-weight:bold; font-size:11px; padding:4px 8px; border-radius:12px; border:2px solid #FFF; white-space:nowrap;">🏫 Kabs Lily Campus</div>`,
        iconSize: [110, 30]
      });
      L.marker([0.3600, 32.6250], { icon: schoolIcon }).addTo(map);

      // Shuttle Marker
      const carIcon = L.divIcon({
        className: 'shuttle-car-marker',
        html: `<div style="background:#00FC8F; color:#0A1029; font-size:20px; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFF; box-shadow:0 0 16px #00FC8F;">🚐</div>`,
        iconSize: [40, 40]
      });
      L.marker([0.3540, 32.6200], { icon: carIcon }).addTo(map).bindPopup('<b>🚐 Kabs Lily Shuttle #1 (Mr. Bbosa)</b><br/>Speed: 38 km/h');

      // Polyline trail
      L.polyline([
        [0.3472, 32.6325],
        [0.3485, 32.6482],
        [0.3685, 32.6285],
        [0.3542, 32.6142],
        [0.3600, 32.6250]
      ], { color: '#00FC8F', weight: 5 }).addTo(map);

      return () => {
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      };
    }, []);

    return (
      <div style={{ width: '100%', height: '400px', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${T.border}` }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
      </div>
    );
  };

  window.HeadTeacherView = HeadTeacherView;
})();
