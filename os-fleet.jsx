/* os-fleet.jsx — Mothership Bridge.
   The NEXT team's view of every client OS under Sentinel supervision.
   Vertical-agnostic by design. "VIEW DETAILS →" opens the vertical-specific
   prototype when wired.
*/

const VERTICAL_LABELS = {
  school: 'Schools',
  hospital: 'Hospitals',
  home: 'Homes',
  ngo: 'NGOs',
  company: 'Companies',
  church: 'Churches',
  organisation: 'Organisations',
};

const HEALTH_COLOR = {
  healthy: '#00FC8F',
  advisory: '#FFB400',
  repair: '#FF4757',
  unknown: 'rgba(255,255,255,0.4)',
};

const HEALTH_LABEL = {
  healthy: 'Healthy',
  advisory: 'Advisory',
  repair: 'Repair in progress',
  unknown: 'No signal',
};

function fleetFmtCurrency(amount, currency) {
  const abs = Math.abs(amount);
  if (abs >= 1e9) return (amount / 1e9).toFixed(2) + 'B ' + currency;
  if (abs >= 1e6) return (amount / 1e6).toFixed(1) + 'M ' + currency;
  if (abs >= 1e3) return (amount / 1e3).toFixed(0) + 'K ' + currency;
  return String(Math.round(amount)) + ' ' + currency;
}

const FilterChip = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? 'var(--mint-glow)' : 'var(--bg-elevated)',
      border: '1px solid ' + (active ? 'var(--mint)' : 'var(--border-subtle)'),
      color: active ? 'var(--mint)' : 'var(--text-secondary)',
      padding: '8px 14px',
      borderRadius: 'var(--radius-sm)',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      letterSpacing: 1,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
  >
    {label.toUpperCase()} {typeof count === 'number' && (
      <span style={{ marginLeft: 6, opacity: 0.6 }}>{count}</span>
    )}
  </button>
);

const TenantCard = ({ tenant, onOpen, onRemove }) => {
  const healthColor = HEALTH_COLOR[tenant.health] || HEALTH_COLOR.unknown;
  const gap = (tenant.kpis ? tenant.kpis.expenses : 0) - (tenant.kpis ? tenant.kpis.revenue : 0);
  const hasLeak = gap > 0;
  const hasKpis = tenant.kpis && (tenant.kpis.revenue || tenant.kpis.expenses);

  return (
    <div
      className="project-card"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: healthColor, flexShrink: 0,
              boxShadow: '0 0 8px ' + healthColor + '66',
            }} />
            <span style={{
              fontSize: 16, fontWeight: 600, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{tenant.name}</span>
            {tenant.addedByUser && (
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 1,
                color: 'var(--mint)', padding: '2px 6px', borderRadius: 4,
                background: 'var(--mint-glow)', border: '1px solid var(--mint)',
              }}>NEW</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
            {VERTICAL_LABELS[tenant.vertical] || tenant.vertical} · {tenant.country}
          </div>
        </div>
        <div style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1,
          color: healthColor, textTransform: 'uppercase',
          padding: '4px 8px', borderRadius: 4, background: healthColor + '12',
          border: '1px solid ' + healthColor + '40',
          flexShrink: 0,
        }}>
          {HEALTH_LABEL[tenant.health]}
        </div>
      </div>

      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 14,
        minHeight: 78,
      }}>
        {tenant.latest ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {tenant.latest.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {tenant.latest.summary}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--mint)' }}>✓</span>
            {tenant.health === 'unknown' ? 'Awaiting first signal.' : 'All systems clear. No open advisories.'}
          </div>
        )}
      </div>

      {hasKpis ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>REVENUE</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {fleetFmtCurrency(tenant.kpis.revenue, tenant.currency)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>EXPENSES</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {fleetFmtCurrency(tenant.kpis.expenses, tenant.currency)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
              {hasLeak ? 'GAP' : 'SURPLUS'}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 600, marginTop: 2,
              color: hasLeak ? 'var(--danger)' : 'var(--mint)',
            }}>
              {fleetFmtCurrency(Math.abs(gap), tenant.currency)}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          No KPIs yet. Will appear when the first health signal arrives.
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 8, borderTop: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          Updated {tenant.lastSignalAt}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {tenant.addedByUser && onRemove && (
            <button
              onClick={() => onRemove(tenant)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 1,
                cursor: 'pointer', padding: 0,
              }}
            >REMOVE</button>
          )}
          <button
            onClick={() => onOpen(tenant)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--mint)',
              fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: 1,
              cursor: 'pointer', padding: 0,
            }}
          >VIEW DETAILS →</button>
        </div>
      </div>
    </div>
  );
};

const AddTenantModal = ({ onSave, onClose }) => {
  const [name, setName] = React.useState('');
  const [vertical, setVertical] = React.useState('school');
  const [country, setCountry] = React.useState('Uganda');
  const [currency, setCurrency] = React.useState('UGX');
  const [revenue, setRevenue] = React.useState('');
  const [expenses, setExpenses] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const canSubmit = name.trim().length >= 2 && !submitting;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    onSave({
      name: name.trim(),
      vertical,
      country: country.trim() || 'Uganda',
      currency: currency.trim() || 'UGX',
      revenue: revenue ? Number(revenue) : 0,
      expenses: expenses ? Number(expenses) : 0,
    });
  };

  const inputStyle = {
    width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)', padding: '10px 12px',
    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-body)',
    outline: 'none',
  };
  const labelStyle = {
    fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1.5,
    color: 'var(--text-tertiary)', marginBottom: 6, display: 'block',
    textTransform: 'uppercase',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(6,0,18,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(8px)',
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 40px rgba(0,252,143,0.08)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 2,
            color: 'var(--text-tertiary)', marginBottom: 6,
          }}>ONBOARD A NEW TENANT</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
            color: 'var(--text-primary)', margin: 0,
          }}>Add to the Fleet</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
            New ship enters supervision immediately. KPIs hydrate when the first health signal arrives.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Institution name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. St. Mary's Secondary School" autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Vertical *</label>
              <select style={inputStyle} value={vertical} onChange={(e) => setVertical(e.target.value)}>
                {Object.keys(VERTICAL_LABELS).map(k => (
                  <option key={k} value={k}>{VERTICAL_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Currency</label>
              <input style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Revenue (optional)</label>
              <input style={inputStyle} type="number" min="0" value={revenue}
                onChange={(e) => setRevenue(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>Expenses (optional)</label>
              <input style={inputStyle} type="number" min="0" value={expenses}
                onChange={(e) => setExpenses(e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button type="button" onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)', padding: '10px 18px',
            borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}>Cancel</button>
          <button type="submit" disabled={!canSubmit} style={{
            background: canSubmit ? 'var(--mint)' : 'var(--bg-elevated)',
            border: '1px solid ' + (canSubmit ? 'var(--mint)' : 'var(--border-default)'),
            color: canSubmit ? 'var(--text-inverse)' : 'var(--text-tertiary)',
            padding: '10px 22px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}>{submitting ? 'Onboarding...' : 'Onboard tenant →'}</button>
        </div>
      </form>
    </div>
  );
};

const FleetPage = ({ onNavigate }) => {
  const [tenants, setTenants] = React.useState(() =>
    (window.OS_DATA && window.OS_DATA.getTenants) ? window.OS_DATA.getTenants() : []
  );
  const [filter, setFilter] = React.useState('all');
  const [showAddModal, setShowAddModal] = React.useState(false);

  const filtered = filter === 'all' ? tenants : tenants.filter(t => t.vertical === filter);

  const counts = {
    total: tenants.length,
    advisories: tenants.filter(t => t.health === 'advisory').length,
    critical: tenants.filter(t => t.health === 'repair').length,
  };
  const verticalCounts = {};
  tenants.forEach(t => { verticalCounts[t.vertical] = (verticalCounts[t.vertical] || 0) + 1; });

  const handleOpen = (tenant) => {
    // Schools open their own branded Schools OS (one template, branded per tenant).
    if (tenant.vertical === 'school') {
      var _b = 'prototypes/schools/peak-primary/login.html?t=' + encodeURIComponent(tenant.id) + '&n=' + encodeURIComponent(tenant.name || '') + (tenant.primaryColor ? '&c=' + encodeURIComponent(tenant.primaryColor) : '') + (tenant.logoUrl ? '&l=' + encodeURIComponent(tenant.logoUrl) : '');
      window.open(_b, '_blank', 'noopener,noreferrer');
      return;
    }
    // If the tenant has a wired prototype, open it in a new tab.
    if (tenant.prototypeUrl) {
      window.open(tenant.prototypeUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    alert(
      tenant.name + '\n\n' +
      'The ' + (VERTICAL_LABELS[tenant.vertical] || tenant.vertical) + ' OS prototype ' +
      'will open here when wired. For now, this is the fleet-level view only.'
    );
  };

  const handleAdd = (input) => {
    if (window.OS_DATA && window.OS_DATA.addTenant) {
      const updated = window.OS_DATA.addTenant(input);
      setTenants(updated);
    }
    setShowAddModal(false);
  };

  const handleRemove = (tenant) => {
    if (!window.confirm('Remove ' + tenant.name + ' from the fleet?')) return;
    if (window.OS_DATA && window.OS_DATA.removeTenant) {
      const updated = window.OS_DATA.removeTenant(tenant.id);
      setTenants(updated);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 2,
            color: 'var(--text-tertiary)', marginBottom: 6,
          }}>MOTHERSHIP BRIDGE</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700,
            color: 'var(--text-primary)', lineHeight: 1.1, margin: 0,
          }}>The Fleet</h1>
          <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 14, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <span><strong style={{ color: 'var(--text-primary)' }}>{counts.total}</strong> tenants under supervision</span>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
            <span><strong style={{ color: 'var(--gold)' }}>{counts.advisories}</strong> open advisories</span>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
            <span><strong style={{ color: counts.critical > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{counts.critical}</strong> critical</span>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'var(--mint)', color: 'var(--text-inverse)',
            border: 'none', padding: '12px 22px',
            borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-body)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 6px 24px rgba(0,252,143,0.25)',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: -2 }}>+</span> Add Tenant
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} count={counts.total} />
        {Object.keys(VERTICAL_LABELS).map(v => verticalCounts[v] ? (
          <FilterChip key={v} label={VERTICAL_LABELS[v]} active={filter === v} onClick={() => setFilter(v)} count={verticalCounts[v]} />
        ) : null)}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center',
          color: 'var(--text-secondary)',
        }}>
          {filter === 'all'
            ? 'No tenants yet. Click "Add Tenant" to onboard your first one.'
            : 'No tenants in this vertical yet.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(t => (
            <TenantCard key={t.id} tenant={t} onOpen={handleOpen} onRemove={handleRemove} />
          ))}
        </div>
      )}

      <div style={{
        fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
        textAlign: 'center', marginTop: 12, letterSpacing: 1,
      }}>
        FLEET HYDRATES FROM OS_DATA · USER-ADDED TENANTS PERSIST IN LOCALSTORAGE · SUPABASE WHEN WIRED
      </div>

      {showAddModal && (
        <AddTenantModal onSave={handleAdd} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};

Object.assign(window, { FleetPage, TenantCard, AddTenantModal, VERTICAL_LABELS });
