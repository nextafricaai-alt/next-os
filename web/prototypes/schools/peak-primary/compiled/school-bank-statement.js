// React and ReactDOM are page globals (UMD). No import lines: these files are
// loaded as plain classic scripts (precompiled by build-precompiled.cjs).
(function () {
  const {
    React,
    ReactDOM
  } = window;
  const {
    useState,
    useEffect
  } = React;
  const formatCurrency = amount => {
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
      colors: {
        primary: "#1e3a8a",
        secondary: "#f59e0b",
        accent: "#3b82f6"
      }
    };
    const Header = window.SchoolDocumentHeader || (({
      docType
    }) => /*#__PURE__*/React.createElement("div", {
      style: {
        borderBottom: '2px solid #3b82f6',
        paddingBottom: '12px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        color: '#1e3a8a'
      }
    }, "Kabs Lily Junior School & KinderCare Centre"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        color: '#6b7280'
      }
    }, "Financial & Resource Ledger \xB7 Term 2 \u2014 2026")), /*#__PURE__*/React.createElement("span", {
      style: {
        backgroundColor: '#1e3a8a',
        color: '#fff',
        padding: '6px 16px',
        borderRadius: '99px',
        fontSize: '13px',
        fontWeight: 'bold'
      }
    }, docType)));
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
      return /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }
      }, "Loading SchoolBrand & Header dependencies...");
    }
    const totalPages = Math.ceil(transactions.length / itemsPerPage);
    const paginatedTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const docRef = React.useRef(null);
    const [exporting, setExporting] = useState('');
    const captureCanvas = async () => {
      if (!window.html2canvas || !docRef.current) throw new Error('Export engine still loading — try again in a moment.');
      return window.html2canvas(docRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
    };
    const handleExportPNG = async () => {
      setExporting('png');
      try {
        const canvas = await captureCanvas();
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `financial-statement-${period.label}.png`;
        a.click();
      } catch (e) {
        window.peakToast ? window.peakToast(String(e.message || e), 'error') : alert(e.message || e);
      }
      setExporting('');
    };
    const handleExportPDF = async () => {
      setExporting('pdf');
      try {
        const canvas = await captureCanvas();
        const ctor = window.jspdf && window.jspdf.jsPDF || window.jsPDF;
        if (!ctor) throw new Error('PDF engine still loading — try again in a moment.');
        const pdf = new ctor({
          unit: 'pt',
          format: 'a4'
        });
        const pageW = pdf.internal.pageSize.getWidth();
        const imgH = canvas.height * pageW / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH);
        pdf.save(`financial-statement-${period.label}.pdf`);
      } catch (e) {
        window.peakToast ? window.peakToast(String(e.message || e), 'error') : alert(e.message || e);
      }
      setExporting('');
    };
    const handlePrint = () => window.print();
    const handleExportCSV = () => {
      const headers = ['Date', 'Type', 'Category', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'];
      const rows = transactions.map(t => [t.date, t.type, t.category, `"${t.description}"`, t.reference, t.debit, t.credit, t.runningBalance]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], {
        type: 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-statement-${period.label}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
    const maxTrendValue = Math.max(...weeklyTrend.map(w => Math.max(w.income, w.expenses)));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        backgroundColor: '#111827',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'Inter, sans-serif'
      }
    }, /*#__PURE__*/React.createElement("style", null, `
            @media print {
              .no-print { display: none !important; }
              .print-container { padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
              body { background: white; }
            }
            .trend-bar {
              transition: height 1s ease-out;
            }
          `), /*#__PURE__*/React.createElement("div", {
      className: "no-print",
      style: {
        maxWidth: '1000px',
        margin: '0 auto 1rem auto',
        display: 'flex',
        gap: '0.5rem',
        justifyContent: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: handlePrint,
      style: btnStyle(brand.colors.primary)
    }, "Print"), /*#__PURE__*/React.createElement("button", {
      onClick: handleExportPNG,
      disabled: !!exporting,
      style: btnStyle(brand.colors.primary)
    }, exporting === 'png' ? 'Exporting…' : 'Export PNG'), /*#__PURE__*/React.createElement("button", {
      onClick: handleExportPDF,
      disabled: !!exporting,
      style: btnStyle(brand.colors.primary)
    }, exporting === 'pdf' ? 'Exporting…' : 'Export PDF'), /*#__PURE__*/React.createElement("button", {
      onClick: handleExportCSV,
      style: btnStyle('#10b981')
    }, "Export CSV")), /*#__PURE__*/React.createElement("div", {
      ref: docRef,
      className: "print-container",
      style: {
        maxWidth: '1000px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '40px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        color: '#1f2937',
        borderRadius: '8px'
      }
    }, /*#__PURE__*/React.createElement(Header, {
      docType: "FINANCIAL STATEMENT"
    }), /*#__PURE__*/React.createElement("div", {
      className: "no-print",
      style: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        justifyContent: 'center'
      }
    }, ['Term 1', 'Term 2', 'Term 3', 'Custom'].map(t => /*#__PURE__*/React.createElement("div", {
      key: t,
      style: {
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '0.875rem',
        cursor: 'pointer',
        backgroundColor: t === 'Term 2' ? brand.colors.primary : '#f3f4f6',
        color: t === 'Term 2' ? 'white' : '#4b5563',
        fontWeight: t === 'Term 2' ? 'bold' : 'normal'
      }
    }, t))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        marginBottom: '30px',
        fontWeight: 'bold',
        fontSize: '1.25rem'
      }
    }, period.label, " (", new Date(period.from).toLocaleDateString(), " - ", new Date(period.to).toLocaleDateString(), ")"), /*#__PURE__*/React.createElement("div", {
      className: "no-print",
      style: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setFundMode('all'),
      style: {
        ...btnStyle(fundMode === 'all' ? brand.colors.primary : '#f3f4f6'),
        color: fundMode === 'all' ? 'white' : '#4b5563'
      }
    }, "\uD83D\uDCCA Combined Ledger"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setFundMode('day'),
      style: {
        ...btnStyle(fundMode === 'day' ? brand.colors.primary : '#f3f4f6'),
        color: fundMode === 'day' ? 'white' : '#4b5563'
      }
    }, "\u2600\uFE0F Day Scholar Fund (45.2M UGX)"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setFundMode('boarding'),
      style: {
        ...btnStyle(fundMode === 'boarding' ? brand.colors.primary : '#f3f4f6'),
        color: fundMode === 'boarding' ? 'white' : '#4b5563'
      }
    }, "\uD83C\uDF19 Boarding Scholar Fund (24.5M UGX)")), (fundMode === 'boarding' || fundMode === 'all') && /*#__PURE__*/React.createElement("div", {
      style: {
        backgroundColor: '#eff6ff',
        color: '#1e3a8a',
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #bfdbfe'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        marginRight: '8px'
      }
    }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Ring-Fenced Boarding Ledger:"), " Boarding revenue is tracked separately to ensure boarding expenses do not encroach on day scholar resources.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '15px',
        marginBottom: '30px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: summaryBoxStyle('#f0fdf4', '#166534', 'Total Income', summary.totalIncome)
    }), /*#__PURE__*/React.createElement("div", {
      style: summaryBoxStyle(summary.outstandingFees > 0 ? '#fef2f2' : '#f0fdf4', summary.outstandingFees > 0 ? '#991b1b' : '#166534', 'Outstanding Fees', summary.outstandingFees)
    }), /*#__PURE__*/React.createElement("div", {
      style: summaryBoxStyle('#fffbeb', '#b45309', 'Total Expenses', summary.totalExpenses)
    }), /*#__PURE__*/React.createElement("div", {
      style: summaryBoxStyle(summary.netBalance >= 0 ? '#f0fdf4' : '#fef2f2', summary.netBalance >= 0 ? '#166534' : '#991b1b', 'Net Balance', summary.netBalance)
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: '40px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '5px',
        fontSize: '0.875rem',
        fontWeight: 'bold'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Collection Rate"), /*#__PURE__*/React.createElement("span", null, (summary.collectionRate * 100).toFixed(1), "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: '12px',
        backgroundColor: '#e5e7eb',
        borderRadius: '6px',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        backgroundColor: brand.colors.primary,
        width: `${animatedCollection}%`,
        transition: 'width 1s ease-out'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '5px'
      }
    }, "Collected: ", formatCurrency(summary.feesCollected), " / Expected: ", formatCurrency(summary.feesCollected + summary.outstandingFees))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: '40px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '0 0 20px 0',
        fontSize: '1rem',
        color: brand.colors.secondary
      }
    }, "WEEKLY TREND"), /*#__PURE__*/React.createElement("svg", {
      width: "100%",
      height: "200",
      style: {
        overflow: 'visible'
      }
    }, weeklyTrend.map((week, i) => {
      const totalWidth = 100 / weeklyTrend.length;
      const incomeHeight = week.income / maxTrendValue * 180;
      const expenseHeight = week.expenses / maxTrendValue * 180;
      return /*#__PURE__*/React.createElement("g", {
        key: i,
        transform: `translate(${i * totalWidth}%, 0)`
      }, /*#__PURE__*/React.createElement("rect", {
        className: "trend-bar",
        x: "10%",
        y: 180 - incomeHeight,
        width: "35%",
        height: incomeHeight,
        fill: brand.colors.primary
      }), /*#__PURE__*/React.createElement("rect", {
        className: "trend-bar",
        x: "50%",
        y: 180 - expenseHeight,
        width: "35%",
        height: expenseHeight,
        fill: "#ef4444"
      }), /*#__PURE__*/React.createElement("text", {
        x: "50%",
        y: "200",
        textAnchor: "middle",
        fontSize: "12",
        fill: "#6b7280"
      }, week.week));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '10px',
        fontSize: '0.75rem'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '12px',
        height: '12px',
        backgroundColor: brand.colors.primary
      }
    }), " Income"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '12px',
        height: '12px',
        backgroundColor: '#ef4444'
      }
    }), " Expenses"))), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '0 0 10px 0',
        fontSize: '1rem',
        color: brand.colors.secondary
      }
    }, "TRANSACTION HISTORY"), /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '20px',
        fontSize: '0.875rem'
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        backgroundColor: '#f3f4f6',
        color: '#374151',
        borderBottom: '2px solid #d1d5db'
      }
    }, /*#__PURE__*/React.createElement("th", {
      style: thStyle
    }, "Date"), /*#__PURE__*/React.createElement("th", {
      style: thStyle
    }, "Category"), /*#__PURE__*/React.createElement("th", {
      style: thStyle
    }, "Description"), /*#__PURE__*/React.createElement("th", {
      style: thStyle
    }, "Ref"), /*#__PURE__*/React.createElement("th", {
      style: {
        ...thStyle,
        textAlign: 'right'
      }
    }, "Debit"), /*#__PURE__*/React.createElement("th", {
      style: {
        ...thStyle,
        textAlign: 'right'
      }
    }, "Credit"), /*#__PURE__*/React.createElement("th", {
      style: {
        ...thStyle,
        textAlign: 'right'
      }
    }, "Balance"))), /*#__PURE__*/React.createElement("tbody", null, paginatedTransactions.map((t, idx) => /*#__PURE__*/React.createElement("tr", {
      key: idx,
      style: {
        backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb',
        borderLeft: `4px solid ${t.type === 'income' ? '#10b981' : '#ef4444'}`,
        borderBottom: '1px solid #e5e7eb'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, new Date(t.date).toLocaleDateString()), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, t.category), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, t.description), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, t.reference), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdStyle,
        textAlign: 'right',
        color: '#ef4444'
      }
    }, t.debit > 0 ? formatCurrency(t.debit) : '-'), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdStyle,
        textAlign: 'right',
        color: '#10b981'
      }
    }, t.credit > 0 ? formatCurrency(t.credit) : '-'), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdStyle,
        textAlign: 'right',
        fontWeight: 'bold'
      }
    }, formatCurrency(t.runningBalance)))))), /*#__PURE__*/React.createElement("div", {
      className: "no-print",
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.875rem',
        color: '#6b7280'
      }
    }, "Showing ", (currentPage - 1) * itemsPerPage + 1, " - ", Math.min(currentPage * itemsPerPage, transactions.length), " of ", transactions.length), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '10px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setCurrentPage(p => Math.max(1, p - 1)),
      disabled: currentPage === 1,
      style: {
        ...btnStyle('#f3f4f6'),
        color: '#374151',
        opacity: currentPage === 1 ? 0.5 : 1
      }
    }, "Prev"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setCurrentPage(p => Math.min(totalPages, p + 1)),
      disabled: currentPage === totalPages,
      style: {
        ...btnStyle('#f3f4f6'),
        color: '#374151',
        opacity: currentPage === totalPages ? 0.5 : 1
      }
    }, "Next"))), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid #e5e7eb',
        paddingTop: '10px',
        marginTop: '30px',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#6b7280'
      }
    }, "Official Financial Statement \u2022 ", brand.name, " \u2022 Generated by NEXT OS")));
  };
  const btnStyle = bg => ({
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.875rem'
  });
  const summaryBoxStyle = (bg, color, title, value) => /*#__PURE__*/React.createElement("div", {
    style: {
      backgroundColor: bg,
      color: color,
      padding: '20px',
      borderRadius: '8px',
      border: `1px solid ${color}33`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.75rem',
      fontWeight: 'bold',
      marginBottom: '8px',
      opacity: 0.8
    }
  }, title.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.5rem',
      fontWeight: '900'
    }
  }, formatCurrency(value)));
  const thStyle = {
    padding: '12px 10px',
    textAlign: 'left',
    fontWeight: 'bold'
  };
  const tdStyle = {
    padding: '12px 10px'
  };
  const SchoolBankStatementDemo = () => {
    const demoData = {
      period: {
        label: 'Term 2 — 2026',
        from: '2026-05-01T00:00:00Z',
        to: '2026-08-31T23:59:59Z'
      },
      summary: {
        totalIncome: 125000000,
        totalExpenses: 45000000,
        netBalance: 80000000,
        outstandingFees: 15000000,
        feesCollected: 110000000,
        collectionRate: 0.88
      },
      weeklyTrend: [{
        week: 'Wk1',
        income: 45000000,
        expenses: 5000000
      }, {
        week: 'Wk2',
        income: 30000000,
        expenses: 12000000
      }, {
        week: 'Wk3',
        income: 20000000,
        expenses: 8000000
      }, {
        week: 'Wk4',
        income: 15000000,
        expenses: 20000000
      }],
      transactions: Array.from({
        length: 45
      }).map((_, i) => ({
        date: new Date(2026, 4, i + 1).toISOString(),
        type: i % 4 === 0 ? 'expense' : 'income',
        category: i % 4 === 0 ? 'Supplies' : 'Tuition',
        description: i % 4 === 0 ? 'Bought stationery' : 'Term 2 Fee Payment',
        reference: `REF-${1000 + i}`,
        debit: i % 4 === 0 ? 500000 : 0,
        credit: i % 4 !== 0 ? 350000 : 0,
        runningBalance: 10000000 + i * 100000,
        fund: i % 3 === 0 ? 'boarding' : 'day'
      }))
    };
    return /*#__PURE__*/React.createElement(SchoolBankStatement, demoData);
  };
  window.SchoolBankStatement = SchoolBankStatement;
  window.SchoolBankStatementDemo = SchoolBankStatementDemo;
})();