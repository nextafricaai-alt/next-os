// React and ReactDOM are page globals (UMD). No import lines: these files are
// loaded as plain <script type="text/babel">, where import breaks the file.
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
  const SchoolFeeStatement = ({
    student,
    guardian,
    term,
    year,
    receiptNo,
    feeItems,
    payments,
    issuedAt,
    issuedBy
  }) => {
    const brand = window.SCHOOL_BRAND;
    const Header = window.SchoolDocumentHeader;
    if (!brand || !Header) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }
      }, "Loading SchoolBrand & Header dependencies...");
    }
    const totalFees = feeItems.reduce((sum, item) => sum + item.amount, 0);
    const totalPaid = feeItems.reduce((sum, item) => sum + item.paid, 0);
    const totalOutstanding = feeItems.reduce((sum, item) => sum + item.balance, 0);
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
        a.download = `fee-statement-${receiptNo}.png`;
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
        pdf.save(`fee-statement-${receiptNo}.pdf`);
      } catch (e) {
        window.peakToast ? window.peakToast(String(e.message || e), 'error') : alert(e.message || e);
      }
      setExporting('');
    };
    const handlePrint = () => window.print();
    const handleWhatsApp = () => {
      const text = `Fee Statement for ${student.name} (${term} ${year}). Total: ${formatCurrency(totalFees)}. Paid: ${formatCurrency(totalPaid)}. Outstanding: ${formatCurrency(totalOutstanding)}.`;
      window.open(`https://wa.me/${guardian.phone}?text=${encodeURIComponent(text)}`, '_blank');
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        backgroundColor: '#f3f4f6',
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
          `), /*#__PURE__*/React.createElement("div", {
      className: "no-print",
      style: {
        maxWidth: '800px',
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
      onClick: handleWhatsApp,
      style: btnStyle('#25D366')
    }, "WhatsApp")), /*#__PURE__*/React.createElement("div", {
      ref: docRef,
      className: "print-container",
      style: {
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '40px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        color: '#1f2937'
      }
    }, /*#__PURE__*/React.createElement(Header, {
      docType: "FEE RECEIPT"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom: '2px solid ' + brand.colors.primary,
        paddingBottom: '10px',
        marginBottom: '20px',
        fontSize: '0.875rem'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Receipt No:"), " ", receiptNo), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Issued:"), " ", new Date(issuedAt).toLocaleDateString()), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Issued by:"), " ", issuedBy)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '15px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '0 0 10px 0',
        fontSize: '1rem',
        color: brand.colors.primary
      }
    }, "Student Details"), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, /*#__PURE__*/React.createElement("strong", null, "Name:"), " ", student.name), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, /*#__PURE__*/React.createElement("strong", null, "Class/Stream:"), " ", student.class, " ", student.stream), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, /*#__PURE__*/React.createElement("strong", null, "Admission No:"), " ", student.admissionNo)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '15px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '0 0 10px 0',
        fontSize: '1rem',
        color: brand.colors.primary
      }
    }, "Guardian Details"), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, /*#__PURE__*/React.createElement("strong", null, "Name:"), " ", guardian.name), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, /*#__PURE__*/React.createElement("strong", null, "Phone:"), " ", guardian.phone), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, /*#__PURE__*/React.createElement("strong", null, "Email:"), " ", guardian.email))), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '0 0 10px 0',
        fontSize: '1rem',
        color: brand.colors.secondary
      }
    }, "FEE BREAKDOWN"), /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '30px',
        fontSize: '0.875rem'
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        backgroundColor: brand.colors.primary,
        color: 'white'
      }
    }, /*#__PURE__*/React.createElement("th", {
      style: thStyle
    }, "#"), /*#__PURE__*/React.createElement("th", {
      style: thStyle
    }, "Description"), /*#__PURE__*/React.createElement("th", {
      style: thStyle
    }, "Amount (UGX)"), /*#__PURE__*/React.createElement("th", {
      style: thStyle
    }, "Paid"), /*#__PURE__*/React.createElement("th", {
      style: thStyle
    }, "Outstanding"))), /*#__PURE__*/React.createElement("tbody", null, feeItems.map((item, idx) => /*#__PURE__*/React.createElement("tr", {
      key: idx,
      style: {
        borderBottom: '1px solid #e5e7eb'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, idx + 1), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, item.description), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, formatCurrency(item.amount)), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, formatCurrency(item.paid)), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdStyle,
        color: item.balance === 0 ? '#10b981' : '#ef4444',
        fontWeight: 'bold'
      }
    }, formatCurrency(item.balance)))), /*#__PURE__*/React.createElement("tr", {
      style: {
        backgroundColor: `${brand.colors.primary}20`,
        fontWeight: 'bold'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: tdStyle,
      colSpan: 2
    }, "TOTALS"), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, formatCurrency(totalFees)), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, formatCurrency(totalPaid)), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, formatCurrency(totalOutstanding))))), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '0 0 10px 0',
        fontSize: '1rem',
        color: brand.colors.secondary,
        fontVariant: 'small-caps'
      }
    }, "PAYMENT HISTORY"), /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '30px',
        fontSize: '0.875rem'
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        borderBottom: '2px solid #e5e7eb',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("th", {
      style: tdStyle
    }, "Date"), /*#__PURE__*/React.createElement("th", {
      style: tdStyle
    }, "Method"), /*#__PURE__*/React.createElement("th", {
      style: tdStyle
    }, "Reference"), /*#__PURE__*/React.createElement("th", {
      style: tdStyle
    }, "Amount"), /*#__PURE__*/React.createElement("th", {
      style: tdStyle
    }, "Received By"))), /*#__PURE__*/React.createElement("tbody", null, payments.map((payment, idx) => /*#__PURE__*/React.createElement("tr", {
      key: idx,
      style: {
        backgroundColor: idx % 2 === 0 ? '#f9fafb' : 'white'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#10b981',
        marginRight: '5px'
      }
    }, "\u2713"), new Date(payment.date).toLocaleDateString()), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, payment.method), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, payment.reference), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, formatCurrency(payment.amount)), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, payment.receivedBy))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '20px',
        marginBottom: '40px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: summaryBoxStyle('#f3f4f6', '#374151')
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        marginBottom: '5px'
      }
    }, "TOTAL FEES"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '1.25rem',
        fontWeight: 'bold'
      }
    }, formatCurrency(totalFees))), /*#__PURE__*/React.createElement("div", {
      style: summaryBoxStyle('#ecfdf5', '#065f46')
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        marginBottom: '5px'
      }
    }, "AMOUNT PAID"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '1.25rem',
        fontWeight: 'bold'
      }
    }, formatCurrency(totalPaid))), /*#__PURE__*/React.createElement("div", {
      style: summaryBoxStyle(totalOutstanding > 0 ? '#fef2f2' : '#ecfdf5', totalOutstanding > 0 ? '#991b1b' : '#065f46')
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        marginBottom: '5px'
      }
    }, "OUTSTANDING"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '1.25rem',
        fontWeight: 'bold'
      }
    }, formatCurrency(totalOutstanding)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        marginBottom: '30px'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: '10px'
      }
    }, "Authorised by: _____________________"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontStyle: 'italic',
        color: '#6b7280'
      }
    }, "Bursar Signature")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '20px',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '80px',
        height: '80px',
        border: `2px dashed ${brand.colors.primary}`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.6rem',
        textAlign: 'center',
        fontWeight: 'bold',
        color: brand.colors.primary,
        opacity: 0.6,
        transform: 'rotate(-15deg)'
      }
    }, "SCHOOL", /*#__PURE__*/React.createElement("br", null), "STAMP"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100px',
        height: '100px',
        border: '1px dashed #9ca3af',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.5rem',
        textAlign: 'center',
        color: '#6b7280'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '60px',
        height: '60px',
        backgroundColor: '#e5e7eb',
        marginBottom: '5px'
      }
    }), "Scan to verify", /*#__PURE__*/React.createElement("br", null), receiptNo))), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid #e5e7eb',
        paddingTop: '10px',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#6b7280'
      }
    }, "This is an official receipt \u2022 ", brand.address, " \u2022 ", brand.phone, " \u2022 Powered by NEXT OS")));
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
  const pStyle = {
    margin: '0 0 5px 0'
  };
  const thStyle = {
    padding: '10px',
    textAlign: 'left'
  };
  const tdStyle = {
    padding: '10px'
  };
  const summaryBoxStyle = (bg, color) => ({
    flex: 1,
    backgroundColor: bg,
    color: color,
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center'
  });
  const SchoolFeeStatementDemo = () => {
    const demoData = {
      student: {
        name: 'John Doe',
        stream: 'Blue',
        admissionNo: 'ADM-2026-001',
        class: 'P4'
      },
      guardian: {
        name: 'Jane Doe',
        phone: '+256700000000',
        email: 'jane@example.com'
      },
      term: 'Term 2',
      year: '2026',
      receiptNo: 'RCT-2026-0042',
      feeItems: [{
        description: 'Tuition Fee',
        amount: 350000,
        paid: 350000,
        balance: 0
      }, {
        description: 'Books & Materials',
        amount: 75000,
        paid: 0,
        balance: 75000
      }, {
        description: 'Lunch Package',
        amount: 120000,
        paid: 120000,
        balance: 0
      }],
      payments: [{
        date: '2026-05-10T10:00:00Z',
        method: 'Mobile Money',
        reference: 'MMXXX123',
        amount: 200000,
        receivedBy: 'Admin'
      }, {
        date: '2026-05-15T14:30:00Z',
        method: 'Bank Transfer',
        reference: 'BTXXX456',
        amount: 270000,
        receivedBy: 'System'
      }],
      issuedAt: new Date().toISOString(),
      issuedBy: 'Bursar Mike'
    };
    return /*#__PURE__*/React.createElement(SchoolFeeStatement, demoData);
  };
  window.SchoolFeeStatement = SchoolFeeStatement;
  window.SchoolFeeStatementDemo = SchoolFeeStatementDemo;
})();