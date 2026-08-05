import React from 'react';
import ReactDOM from 'react-dom/client';
(function () {
  const { React, ReactDOM } = window;
  const { useState, useEffect } = React;

  const formatCurrency = (amount) => {
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
    issuedBy,
  }) => {
    const brand = window.SCHOOL_BRAND;
    const Header = window.SchoolDocumentHeader;

    if (!brand || !Header) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          Loading SchoolBrand & Header dependencies...
        </div>
      );
    }

    const totalFees = feeItems.reduce((sum, item) => sum + item.amount, 0);
    const totalPaid = feeItems.reduce((sum, item) => sum + item.paid, 0);
    const totalOutstanding = feeItems.reduce((sum, item) => sum + item.balance, 0);

    const docRef = React.useRef(null);
    const [exporting, setExporting] = useState('');

    const captureCanvas = async () => {
      if (!window.html2canvas || !docRef.current) throw new Error('Export engine still loading — try again in a moment.');
      return window.html2canvas(docRef.current, { scale: 2, backgroundColor: '#ffffff' });
    };
    const handleExportPNG = async () => {
      setExporting('png');
      try {
        const canvas = await captureCanvas();
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `fee-statement-${receiptNo}.png`;
        a.click();
      } catch (e) { window.peakToast ? window.peakToast(String(e.message || e), 'error') : alert(e.message || e); }
      setExporting('');
    };
    const handleExportPDF = async () => {
      setExporting('pdf');
      try {
        const canvas = await captureCanvas();
        const ctor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!ctor) throw new Error('PDF engine still loading — try again in a moment.');
        const pdf = new ctor({ unit: 'pt', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const imgH = (canvas.height * pageW) / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH);
        pdf.save(`fee-statement-${receiptNo}.pdf`);
      } catch (e) { window.peakToast ? window.peakToast(String(e.message || e), 'error') : alert(e.message || e); }
      setExporting('');
    };

    const handlePrint = () => window.print();
    const handleWhatsApp = () => {
      const text = `Fee Statement for ${student.name} (${term} ${year}). Total: ${formatCurrency(totalFees)}. Paid: ${formatCurrency(totalPaid)}. Outstanding: ${formatCurrency(totalOutstanding)}.`;
      window.open(`https://wa.me/${guardian.phone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
        {/* Toolbar - hide on print */}
        <style>
          {`
            @media print {
              .no-print { display: none !important; }
              .print-container { padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
              body { background: white; }
            }
          `}
        </style>
        <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 1rem auto', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint} style={btnStyle(brand.colors.primary)}>Print</button>
          <button onClick={handleExportPNG} disabled={!!exporting} style={btnStyle(brand.colors.primary)}>{exporting === 'png' ? 'Exporting…' : 'Export PNG'}</button>
          <button onClick={handleExportPDF} disabled={!!exporting} style={btnStyle(brand.colors.primary)}>{exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}</button>
          <button onClick={handleWhatsApp} style={btnStyle('#25D366')}>WhatsApp</button>
        </div>

        {/* A4 Container */}
        <div ref={docRef} className="print-container" style={{
          maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '40px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: '#1f2937'
        }}>
          <Header docType="FEE RECEIPT" />

          {/* Statement info bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid ' + brand.colors.primary, paddingBottom: '10px', marginBottom: '20px', fontSize: '0.875rem' }}>
            <div><strong>Receipt No:</strong> {receiptNo}</div>
            <div><strong>Issued:</strong> {new Date(issuedAt).toLocaleDateString()}</div>
            <div><strong>Issued by:</strong> {issuedBy}</div>
          </div>

          {/* Student + Guardian info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: brand.colors.primary }}>Student Details</h3>
              <p style={pStyle}><strong>Name:</strong> {student.name}</p>
              <p style={pStyle}><strong>Class/Stream:</strong> {student.class} {student.stream}</p>
              <p style={pStyle}><strong>Admission No:</strong> {student.admissionNo}</p>
            </div>
            <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: brand.colors.primary }}>Guardian Details</h3>
              <p style={pStyle}><strong>Name:</strong> {guardian.name}</p>
              <p style={pStyle}><strong>Phone:</strong> {guardian.phone}</p>
              <p style={pStyle}><strong>Email:</strong> {guardian.email}</p>
            </div>
          </div>

          {/* Fee Breakdown table */}
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: brand.colors.secondary }}>FEE BREAKDOWN</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: brand.colors.primary, color: 'white' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Amount (UGX)</th>
                <th style={thStyle}>Paid</th>
                <th style={thStyle}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {feeItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>{item.description}</td>
                  <td style={tdStyle}>{formatCurrency(item.amount)}</td>
                  <td style={tdStyle}>{formatCurrency(item.paid)}</td>
                  <td style={{ ...tdStyle, color: item.balance === 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {formatCurrency(item.balance)}
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: `${brand.colors.primary}20`, fontWeight: 'bold' }}>
                <td style={tdStyle} colSpan={2}>TOTALS</td>
                <td style={tdStyle}>{formatCurrency(totalFees)}</td>
                <td style={tdStyle}>{formatCurrency(totalPaid)}</td>
                <td style={tdStyle}>{formatCurrency(totalOutstanding)}</td>
              </tr>
            </tbody>
          </table>

          {/* Payment History section */}
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: brand.colors.secondary, fontVariant: 'small-caps' }}>PAYMENT HISTORY</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={tdStyle}>Date</th>
                <th style={tdStyle}>Method</th>
                <th style={tdStyle}>Reference</th>
                <th style={tdStyle}>Amount</th>
                <th style={tdStyle}>Received By</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9fafb' : 'white' }}>
                  <td style={tdStyle}>
                    <span style={{ color: '#10b981', marginRight: '5px' }}>✓</span>
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>{payment.method}</td>
                  <td style={tdStyle}>{payment.reference}</td>
                  <td style={tdStyle}>{formatCurrency(payment.amount)}</td>
                  <td style={tdStyle}>{payment.receivedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Balance Summary */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
            <div style={summaryBoxStyle('#f3f4f6', '#374151')}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px' }}>TOTAL FEES</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(totalFees)}</div>
            </div>
            <div style={summaryBoxStyle('#ecfdf5', '#065f46')}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px' }}>AMOUNT PAID</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(totalPaid)}</div>
            </div>
            <div style={summaryBoxStyle(totalOutstanding > 0 ? '#fef2f2' : '#ecfdf5', totalOutstanding > 0 ? '#991b1b' : '#065f46')}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px' }}>OUTSTANDING</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(totalOutstanding)}</div>
            </div>
          </div>

          {/* Signatures & Stamps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', marginBottom: '30px' }}>
            <div>
              <div style={{ marginBottom: '10px' }}>Authorised by: _____________________</div>
              <div style={{ fontStyle: 'italic', color: '#6b7280' }}>Bursar Signature</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', border: `2px dashed ${brand.colors.primary}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', textAlign: 'center', fontWeight: 'bold', color: brand.colors.primary, opacity: 0.6, transform: 'rotate(-15deg)' }}>
                SCHOOL<br/>STAMP
              </div>
              <div style={{ width: '100px', height: '100px', border: '1px dashed #9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', textAlign: 'center', color: '#6b7280' }}>
                <div style={{ width: '60px', height: '60px', backgroundColor: '#e5e7eb', marginBottom: '5px' }}></div>
                Scan to verify<br/>{receiptNo}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
            This is an official receipt • {brand.address} • {brand.phone} • Powered by NEXT OS
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

  const pStyle = { margin: '0 0 5px 0' };
  const thStyle = { padding: '10px', textAlign: 'left' };
  const tdStyle = { padding: '10px' };
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
      student: { name: 'John Doe', stream: 'Blue', admissionNo: 'ADM-2026-001', class: 'P4' },
      guardian: { name: 'Jane Doe', phone: '+256700000000', email: 'jane@example.com' },
      term: 'Term 2',
      year: '2026',
      receiptNo: 'RCT-2026-0042',
      feeItems: [
        { description: 'Tuition Fee', amount: 350000, paid: 350000, balance: 0 },
        { description: 'Books & Materials', amount: 75000, paid: 0, balance: 75000 },
        { description: 'Lunch Package', amount: 120000, paid: 120000, balance: 0 },
      ],
      payments: [
        { date: '2026-05-10T10:00:00Z', method: 'Mobile Money', reference: 'MMXXX123', amount: 200000, receivedBy: 'Admin' },
        { date: '2026-05-15T14:30:00Z', method: 'Bank Transfer', reference: 'BTXXX456', amount: 270000, receivedBy: 'System' }
      ],
      issuedAt: new Date().toISOString(),
      issuedBy: 'Bursar Mike'
    };

    return <SchoolFeeStatement {...demoData} />;
  };

  window.SchoolFeeStatement = SchoolFeeStatement;
  window.SchoolFeeStatementDemo = SchoolFeeStatementDemo;
})();
