import re

with open("web/os-childcare.jsx", "r") as f:
    data = f.read()

old_tab = """        {/* ── INVOICES TAB ── */}
        {activeTab === 'invoices' && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Invoice Register — July 2026</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                Collection: {Math.round(kpi.collectionRate * 100)}%
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Child', 'Parent', 'Amount (UGX)', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {childrenData.map(child => {
                  const statusColor = child.invoiceStatus === 'overdue' ? '#FF4757' : child.invoiceStatus === 'due' ? '#FFB400' : '#00FC8F';
                  const statusLabel = child.invoiceStatus === 'overdue' ? '⚠ OVERDUE 30d+' : child.invoiceStatus === 'due' ? '○ DUE' : '✓ PAID';
                  return (
                    <tr key={child.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="member-row">
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{child.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{child.parent}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>87,500</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, color: statusColor, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{statusLabel}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {child.invoiceStatus !== 'paid' && (
                          <button style={{ background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>REMIND</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}"""

new_tab = """        {/* ── INVOICES / FINANCES TAB ── */}
        {activeTab === 'invoices' && (
          <React.Fragment>
            {selectedCenterId === 'all' ? (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', padding: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Global Finances Overview — July 2026</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div style={{ background: 'var(--bg-deepest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Estimated Revenue</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#00FC8F' }}>UGX {(kpi.enrolled * 87500).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Based on {kpi.enrolled} enrolled students</div>
                  </div>
                  <div style={{ background: 'var(--bg-deepest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Estimated Staff Payment</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#FF4757' }}>UGX {(kpi.caretakers * 800000).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Based on {kpi.caretakers} active staff</div>
                  </div>
                  <div style={{ background: 'var(--bg-deepest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Projected Gross Margin</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>UGX {((kpi.enrolled * 87500) - (kpi.caretakers * 800000)).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Before facility expenses</div>
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Attendance Impact</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
                  Currently, <strong>{kpi.presentToday}</strong> out of {kpi.enrolled} students are present today across all centers ({(kpi.attendanceRate * 100).toFixed(1)}% attendance). Consistent attendance is key for reliable revenue collection. Outstanding invoices currently total UGX {kpi.overdueAmount.toLocaleString()}.
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Invoice Register — July 2026</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    Collection: {Math.round(kpi.collectionRate * 100)}%
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Child', 'Parent', 'Amount (UGX)', 'Status', 'Action'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {childrenData.map(child => {
                      const statusColor = child.invoiceStatus === 'overdue' ? '#FF4757' : child.invoiceStatus === 'due' ? '#FFB400' : '#00FC8F';
                      const statusLabel = child.invoiceStatus === 'overdue' ? '⚠ OVERDUE 30d+' : child.invoiceStatus === 'due' ? '○ DUE' : '✓ PAID';
                      return (
                        <tr key={child.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="member-row">
                          <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{child.name}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{child.parent}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>87,500</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, color: statusColor, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{statusLabel}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {child.invoiceStatus !== 'paid' && (
                              <button style={{ background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>REMIND</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </React.Fragment>
        )}"""

if old_tab in data:
    data = data.replace(old_tab, new_tab)
    with open("web/os-childcare.jsx", "w") as f:
        f.write(data)
    print("SUCCESS")
else:
    print("FAILED TO MATCH")
