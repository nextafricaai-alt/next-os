(function () {
  const { React, ReactDOM } = window;
  const { useState, useEffect } = React;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount) + ' UGX';
  };

  const SchoolBankStatement = ({
    period,
    summary: initialSummary,
    transactions: initialTransactions,
    weeklyTrend
  }) => {
    const brand = window.SCHOOL_BRAND || {
      name: "Kabs Lily Junior School & KinderCare Centre",
      colors: { primary: "#1e3a8a", secondary: "#f59e0b", accent: "#3b82f6" }
    };
    const Header = window.SchoolDocumentHeader || (({ docType }) => (
      <div style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a8a' }}>Kabs Lily Junior School & KinderCare Centre</h2>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Financial & Resource Ledger · Term 2 — 2026</div>
        </div>
        <span style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '6px 16px', borderRadius: '99px', fontSize: '13px', fontWeight: 'bold' }}>{docType}</span>
      </div>
    ));

    const [currentPage, setCurrentPage] = useState(1);
    const [animatedCollection, setAnimatedCollection] = useState(0);
    const [fundMode, setFundMode] = useState('all');
    const itemsPerPage = 20;

    const transactions = React.useMemo(() => {
      if (fundMode === 'all') return initialTransactions;
      return initialTransactions.filter(t => t.fund === fundMode);
    }, [initialTransactions, fundMode]);

    const summary = React.useMemo(() => {
      if (fundMode === 'all') return initialSummary;
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.credit, 0);
      const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.debit, 0);
      const netBalance = totalIncome - totalExpenses;
      return {
        ...initialSummary,
        totalIncome,
        totalExpenses,
        netBalance
      };
    }, [initialSummary, transactions, fundMode]);

    useEffect(() => {
      setCurrentPage(1);
    }, [fundMode]);

    useEffect(() => {
      setTimeout(() => {
        setAnimatedCollection(summary.collectionRate * 100);
      }, 300);
    }, [summary.collectionRate, fundMode]);

    if (!brand || !Header) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          Loading SchoolBrand & Header dependencies...
        </div>
      );
    }

    const totalPages = Math.ceil(transactions.length / itemsPerPage);
    const paginatedTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePrint = () => window.print();
    const handleExportCSV = () => {
      const headers = ['Date', 'Type', 'Category', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'];
      const rows = transactions.map(t => [
        t.date, t.type, t.category, `"${t.description}"`, t.reference, t.debit, t.credit, t.runningBalance
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-statement-${period.label}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const maxTrendValue = Math.max(...weeklyTrend.map(w => Math.max(w.income, w.expenses)));

    return (
      <div style={{ backgroundColor: '#111827', minHeight: '100vh', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
        <style>
          {`
            @media print {
              .no-print { display: none !important; }
              .print-container { padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
              body { background: white; }
            }
            .trend-bar {
              transition: height 1s ease-out;
            }
          `}
        </style>

        <div className="no-print" style={{ maxWidth: '1000px', margin: '0 auto 1rem auto', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint} style={btnStyle(brand.colors.primary)}>Print</button>
          <button style={btnStyle(brand.colors.primary)}>Export PNG</button>
          <button style={btnStyle(brand.colors.primary)}>Export PDF</button>
          <button onClick={handleExportCSV} style={btnStyle('#10b981')}>Export CSV</button>
        </div>

        <div className="print-container" style={{
          maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', padding: '40px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: '#1f2937', borderRadius: '8px'
        }}>
          <Header docType="FINANCIAL STATEMENT" />

          {/* Period selector */}
          <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
            {['Term 1', 'Term 2', 'Term 3', 'Custom'].map(t => (
              <div key={t} style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '0.875rem', cursor: 'pointer',
                backgroundColor: t === 'Term 2' ? brand.colors.primary : '#f3f4f6',
                color: t === 'Term 2' ? 'white' : '#4b5563',
                fontWeight: t === 'Term 2' ? 'bold' : 'normal'
              }}>
                {t}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginBottom: '30px', fontWeight: 'bold', fontSize: '1.25rem' }}>
            {period.label} ({new Date(period.from).toLocaleDateString()} - {new Date(period.to).toLocaleDateString()})
          </div>

          {/* Fund Switcher Filter Bar */}
          <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFundMode('all')}
              style={{
                ...btnStyle(fundMode === 'all' ? brand.colors.primary : '#f3f4f6'),
                color: fundMode === 'all' ? 'white' : '#4b5563'
              }}
            >
              📊 Combined Ledger
            </button>
            <button
              onClick={() => setFundMode('day')}
              style={{
                ...btnStyle(fundMode === 'day' ? brand.colors.primary : '#f3f4f6'),
                color: fundMode === 'day' ? 'white' : '#4b5563'
              }}
            >
              ☀️ Day Scholar Fund (45.2M UGX)
            </button>
            <button
              onClick={() => setFundMode('boarding')}
              style={{
                ...btnStyle(fundMode === 'boarding' ? brand.colors.primary : '#f3f4f6'),
                color: fundMode === 'boarding' ? 'white' : '#4b5563'
              }}
            >
              🌙 Boarding Scholar Fund (24.5M UGX)
            </button>
          </div>

          {/* Ring-Fenced Ledger Banner */}
          {(fundMode === 'boarding' || fundMode === 'all') && (
            <div style={{
              backgroundColor: '#eff6ff',
              color: '#1e3a8a',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #bfdbfe'
            }}>
              <span style={{ marginRight: '8px' }}>🛡️</span>
              <span><strong>Ring-Fenced Boarding Ledger:</strong> Boarding revenue is tracked separately to ensure boarding expenses do not encroach on day scholar resources.</span>
            </div>
          )}

          {/* Summary Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
            <div style={summaryBoxStyle('#f0fdf4', '#166534', 'Total Income', summary.totalIncome)} />
            <div style={summaryBoxStyle(summary.outstandingFees > 0 ? '#fef2f2' : '#f0fdf4', summary.outstandingFees > 0 ? '#991b1b' : '#166534', 'Outstanding Fees', summary.outstandingFees)} />
            <div style={summaryBoxStyle('#fffbeb', '#b45309', 'Total Expenses', summary.totalExpenses)} />
            <div style={summaryBoxStyle(summary.netBalance >= 0 ? '#f0fdf4' : '#fef2f2', summary.netBalance >= 0 ? '#166534' : '#991b1b', 'Net Balance', summary.netBalance)} />
          </div>

          {/* Collection Rate Bar */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.875rem', fontWeight: 'bold' }}>
              <span>Collection Rate</span>
              <span>{(summary.collectionRate * 100).toFixed(1)}%</span>
            </div>
            <div style={{ height: '12px', backgroundColor: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', backgroundColor: brand.colors.primary, width: `${animatedCollection}%`, transition: 'width 1s ease-out' }}></div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '5px' }}>
              Collected: {formatCurrency(summary.feesCollected)} / Expected: {formatCurrency(summary.feesCollected + summary.outstandingFees)}
            </div>
          </div>

          {/* Weekly Trend Chart */}
          <div style={{ marginBottom: '40px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: brand.colors.secondary }}>WEEKLY TREND</h3>
            <svg width="100%" height="200" style={{ overflow: 'visible' }}>
              {weeklyTrend.map((week, i) => {
                const totalWidth = 100 / weeklyTrend.length;
                const incomeHeight = (week.income / maxTrendValue) * 180;
                const expenseHeight = (week.expenses / maxTrendValue) * 180;
                return (
                  <g key={i} transform={`translate(${i * totalWidth}%, 0)`}>
                    <rect className="trend-bar" x="10%" y={180 - incomeHeight} width="35%" height={incomeHeight} fill={brand.colors.primary} />
                    <rect className="trend-bar" x="50%" y={180 - expenseHeight} width="35%" height={expenseHeight} fill="#ef4444" />
                    <text x="50%" y="200" textAnchor="middle" fontSize="12" fill="#6b7280">{week.week}</text>
                  </g>
                );
              })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', backgroundColor: brand.colors.primary }}></div> Income</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444' }}></div> Expenses</div>
            </div>
          </div>

          {/* Transactions Table */}
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: brand.colors.secondary }}>TRANSACTION HISTORY</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', color: '#374151', borderBottom: '2px solid #d1d5db' }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Ref</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Debit</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Credit</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((t, idx) => (
                <tr key={idx} style={{ 
                  backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb',
                  borderLeft: `4px solid ${t.type === 'income' ? '#10b981' : '#ef4444'}`,
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <td style={tdStyle}>{new Date(t.date).toLocaleDateString()}</td>
                  <td style={tdStyle}>{t.category}</td>
                  <td style={tdStyle}>{t.description}</td>
                  <td style={tdStyle}>{t.reference}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#ef4444' }}>{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#10b981' }}>{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(t.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, transactions.length)} of {transactions.length}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ ...btnStyle('#f3f4f6'), color: '#374151', opacity: currentPage === 1 ? 0.5 : 1 }}
              >Prev</button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ ...btnStyle('#f3f4f6'), color: '#374151', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >Next</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '30px', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
            Official Financial Statement • {brand.name} • Generated by NEXT OS
          </div>
        </div>
      </div>
    );
  };

  const btnStyle = (bg) => ({
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.875rem'
  });

  const summaryBoxStyle = (bg, color, title, value) => (
    <div style={{ backgroundColor: bg, color: color, padding: '20px', borderRadius: '8px', border: `1px solid ${color}33` }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', opacity: 0.8 }}>{title.toUpperCase()}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{formatCurrency(value)}</div>
    </div>
  );

  const thStyle = { padding: '12px 10px', textAlign: 'left', fontWeight: 'bold' };
  const tdStyle = { padding: '12px 10px' };

  const SchoolBankStatementDemo = () => {
    const demoData = {
      period: { label: 'Term 2 — 2026', from: '2026-05-01T00:00:00Z', to: '2026-08-31T23:59:59Z' },
      summary: {
        totalIncome: 125000000,
        totalExpenses: 45000000,
        netBalance: 80000000,
        outstandingFees: 15000000,
        feesCollected: 110000000,
        collectionRate: 0.88,
      },
      weeklyTrend: [
        { week: 'Wk1', income: 45000000, expenses: 5000000 },
        { week: 'Wk2', income: 30000000, expenses: 12000000 },
        { week: 'Wk3', income: 20000000, expenses: 8000000 },
        { week: 'Wk4', income: 15000000, expenses: 20000000 },
      ],
      transactions: Array.from({ length: 45 }).map((_, i) => ({
        date: new Date(2026, 4, i + 1).toISOString(),
        type: i % 4 === 0 ? 'expense' : 'income',
        category: i % 4 === 0 ? 'Supplies' : 'Tuition',
        description: i % 4 === 0 ? 'Bought stationery' : 'Term 2 Fee Payment',
        reference: `REF-${1000 + i}`,
        debit: i % 4 === 0 ? 500000 : 0,
        credit: i % 4 !== 0 ? 350000 : 0,
        runningBalance: 10000000 + (i * 100000),
        fund: i % 3 === 0 ? 'boarding' : 'day'
      }))
    };

    return <SchoolBankStatement {...demoData} />;
  };

  window.SchoolBankStatement = SchoolBankStatement;
  window.SchoolBankStatementDemo = SchoolBankStatementDemo;
})();
