/* os-cards.jsx - NEXT Membership Cards & Member Management */

const TIER_CONFIG = {
  catalyst: {
    name: 'Catalyst', price: '$149', period: '/month',
    color: 'var(--mint)', colorHex: '#00FC8F', colorRaw: '0,252,143',
    tagline: 'Ignite your digital journey',
    benefits: ['NEXT Community Platform access', 'Monthly AI briefing webinar', '2 hours consulting support', 'Basic analytics dashboard', 'Digital membership credential'],
    gradient: 'linear-gradient(135deg, #0d0028 0%, #140035 40%, #0a1a2a 100%)',
    borderGlow: 'rgba(0,252,143,0.25)',
  },
  builder: {
    name: 'Builder', price: '$749', period: '/month',
    color: 'var(--emerald)', colorHex: '#1B9B6F', colorRaw: '27,155,111',
    tagline: 'Build intelligent infrastructure',
    benefits: ['Full AI tools & analytics suite', '10 hours dedicated consulting', 'Quarterly training workshops', 'Priority support channel', 'Partner network access', 'Enhanced NFC credential'],
    gradient: 'linear-gradient(135deg, #051a14 0%, #0a2a20 40%, #140035 100%)',
    borderGlow: 'rgba(27,155,111,0.3)',
  },
  architect: {
    name: 'Architect', price: '$2,999', period: '/month',
    color: 'var(--gold)', colorHex: '#FFB400', colorRaw: '255,180,0',
    tagline: 'Shape Africa\'s digital future',
    benefits: ['Dedicated NEXT transformation team', 'Unlimited consulting hours', 'Custom AI solution development', 'Executive briefings & strategy', 'VIP event access', 'Premium credential with monthly refresh'],
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #140035 40%, #1a0f05 100%)',
    borderGlow: 'rgba(255,180,0,0.3)',
  },
};

const NLogoWatermark = ({ color = '#00FC8F', opacity = 0.07, size = 140 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity, position: 'absolute' }}>
    <path d="M25 80 L25 45 L50 20 L50 55 L75 80 L75 45" 
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const QRPlaceholder = ({ size = 48, color = 'rgba(255,255,255,0.4)' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <rect x="2" y="2" width="14" height="14" rx="2" fill="none" stroke={color} strokeWidth="1.5"/>
    <rect x="5" y="5" width="8" height="8" rx="1" fill={color}/>
    <rect x="32" y="2" width="14" height="14" rx="2" fill="none" stroke={color} strokeWidth="1.5"/>
    <rect x="35" y="5" width="8" height="8" rx="1" fill={color}/>
    <rect x="2" y="32" width="14" height="14" rx="2" fill="none" stroke={color} strokeWidth="1.5"/>
    <rect x="5" y="35" width="8" height="8" rx="1" fill={color}/>
    <rect x="20" y="2" width="4" height="4" fill={color}/>
    <rect x="20" y="10" width="4" height="4" fill={color}/>
    <rect x="20" y="20" width="4" height="8" fill={color}/>
    <rect x="28" y="20" width="4" height="4" fill={color}/>
    <rect x="36" y="20" width="4" height="4" fill={color}/>
    <rect x="20" y="32" width="8" height="4" fill={color}/>
    <rect x="32" y="32" width="4" height="8" fill={color}/>
    <rect x="40" y="36" width="4" height="8" fill={color}/>
    <rect x="20" y="40" width="4" height="4" fill={color}/>
    <rect x="28" y="40" width="4" height="4" fill={color}/>
  </svg>
);

/* -- Individual Membership Card -- */
const MembershipCard = ({ tierKey, member, large, onClick, flipped, onFlip }) => {
  const tier = TIER_CONFIG[tierKey];
  const isArchitect = tierKey === 'architect';
  const isBuilder = tierKey === 'builder';
  const scale = large ? 1.4 : 1;
  const w = 380; const h = 240;

  const cardBase = {
    width: w, height: h, borderRadius: 16, position: 'relative', overflow: 'hidden',
    background: tier.gradient, cursor: onClick ? 'pointer' : 'default',
    border: `1px solid ${tier.borderGlow}`,
    boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 40px rgba(${tier.colorRaw},0.06)`,
    fontFamily: 'var(--font-body)', transform: `scale(${scale})`,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    transformOrigin: 'center center',
    perspective: 800,
  };

  const front = (
    <div style={cardBase} onClick={onClick} className={`membership-card ${tierKey}-card`}>
      {/* Animated shine for Architect */}
      {isArchitect && <div className="card-shine-architect"></div>}
      {isBuilder && <div className="card-shine-builder"></div>}
      
      {/* Background pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: `radial-gradient(circle at 2px 2px, ${tier.colorHex} 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }}></div>

      {/* N Watermark */}
      <div style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)' }}>
        <NLogoWatermark color={tier.colorHex} opacity={isArchitect ? 0.08 : 0.05} size={180} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: '22px 26px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Top row: Logo + Tier */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <img src={window.__resources?.whiteLogo || "uploads/NEXT Landscape White Logo@3x.png"} alt="NEXT" style={{ height: 22, opacity: 0.9 }} />
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
            color: tier.colorHex, letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>
            {tier.name}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }}></div>

        {/* Member Info */}
        <div>
          <div style={{
            fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: '0.02em',
            marginBottom: 2,
          }}>
            {member?.name || 'HUDSON TIMOTHY TUMUSIIME'}
          </div>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em', marginBottom: 14,
          }}>
            {member?.role || 'Founder & CEO'}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                Member ID
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                {member?.id || 'NXT-2026-0001'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                Valid Through
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}>
                {member?.expiry || '12 / 2026'}
              </div>
            </div>
            <QRPlaceholder size={40} color={`rgba(${tier.colorRaw},0.35)`} />
          </div>
        </div>
      </div>

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${tier.colorHex}, transparent)`,
        opacity: 0.6,
      }}></div>
    </div>
  );

  return front;
};

/* -- Tier Comparison Card -- */
const TierCard = ({ tierKey, isSelected, onSelect }) => {
  const tier = TIER_CONFIG[tierKey];
  return (
    <div
      onClick={onSelect}
      style={{
        background: isSelected ? `rgba(${tier.colorRaw},0.08)` : 'var(--bg-deep)',
        border: `1px solid ${isSelected ? tier.borderGlow : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)', padding: 20, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      className="tier-select-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
          color: tier.colorHex, letterSpacing: '0.05em',
        }}>{tier.name}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          {tier.price}<span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>{tier.period}</span>
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.4, fontStyle: 'italic' }}>{tier.tagline}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tier.benefits.map((b, i) => (
          <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: tier.colorHex, fontSize: 10 }}></span> {b}
          </li>
        ))}
      </ul>
    </div>
  );
};

/* -- Card Issuance Modal -- */
const CardIssueModal = ({ tierKey, onClose }) => {
  const tier = TIER_CONFIG[tierKey];
  const [step, setStep] = React.useState(0);
  const [formData, setFormData] = React.useState({ name: '', email: '', org: '', country: 'Uganda' });
  const [issuing, setIssuing] = React.useState(false);
  const [issued, setIssued] = React.useState(false);

  const handleIssue = () => {
    setIssuing(true);
    setTimeout(() => { setIssuing(false); setIssued(true); }, 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)', padding: 32, width: 480,
        maxHeight: '80vh', overflow: 'auto',
      }}>
        {!issued ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  Issue <span style={{ color: tier.colorHex }}>{tier.name}</span> Card
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
                  {tier.price}{tier.period}
                </p>
              </div>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', color: 'var(--text-tertiary)',
                fontSize: 20, cursor: 'pointer', padding: 4,
              }}>x</button>
            </div>

            {[
              { label: 'Full Name', key: 'name', placeholder: 'Hudson Timothy Tumusiime' },
              { label: 'Email Address', key: 'email', placeholder: 'hudson@nextafrica.ai' },
              { label: 'Organisation', key: 'org', placeholder: 'NEXT Africa' },
              { label: 'Country', key: 'country', placeholder: 'Uganda' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                  {field.label}
                </label>
                <input
                  value={formData[field.key]}
                  onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'var(--bg-deep)',
                    border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-body)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            <button onClick={handleIssue} disabled={issuing} style={{
              width: '100%', padding: '12px 20px', marginTop: 8,
              background: issuing ? 'var(--bg-surface)' : tier.colorHex,
              color: issuing ? 'var(--text-secondary)' : '#140035',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)',
              cursor: issuing ? 'wait' : 'pointer', textTransform: 'uppercase',
              letterSpacing: '0.05em', transition: 'all 0.2s',
            }}>
              {issuing ? 'Generating Credential...' : 'Issue Card'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>OK</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: tier.colorHex, margin: '0 0 8px', fontWeight: 700 }}>
              Card Issued Successfully
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
              {tier.name} membership credential generated for
            </p>
            <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 20px' }}>
              {formData.name || 'New Member'}
            </p>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 24 }}>
              ID: NXT-2026-{String(Math.floor(Math.random()*9000)+1000)}
            </div>
            <button onClick={onClose} style={{
              padding: '10px 24px', background: 'var(--bg-surface)', color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
              fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

/* -- Members Page -- */
const MembersPage = ({ onNavigate }) => {
  const [mounted, setMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('cards');
  const [selectedTier, setSelectedTier] = React.useState('catalyst');
  const [issueModal, setIssueModal] = React.useState(null);
  const [cardView, setCardView] = React.useState('grid'); // grid | detail

  React.useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members' },
    { id: 'cards', label: 'Card System' },
  ];

  const sectionStyle = {
    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)', padding: 24,
  };

  const sampleMembers = [
    { name: 'Hudson Timothy Tumusiime', org: 'NEXT Africa', tier: 'architect', id: 'NXT-2026-0001', status: 'Active' },
    { name: 'Amina Okafor', org: 'Kenya Ministry of Digital', tier: 'architect', id: 'NXT-2026-0023', status: 'Active' },
    { name: 'David Mwangi', org: 'Nairobi Innovation Hub', tier: 'builder', id: 'NXT-2026-0089', status: 'Active' },
    { name: 'Grace Nakamya', org: 'Makerere University', tier: 'builder', id: 'NXT-2026-0112', status: 'Active' },
    { name: 'Emmanuel Asante', org: 'Accra Digital Labs', tier: 'catalyst', id: 'NXT-2026-0201', status: 'Active' },
    { name: 'Fatima Ibrahim', org: 'Lagos Tech Collective', tier: 'catalyst', id: 'NXT-2026-0245', status: 'Pending' },
    { name: 'Jean-Pierre Habimana', org: 'Rwanda ICT Chamber', tier: 'builder', id: 'NXT-2026-0156', status: 'Active' },
    { name: 'Wanjiku Kamau', org: 'Safaricom', tier: 'catalyst', id: 'NXT-2026-0310', status: 'Active' },
  ];

  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: 'all 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
            color: 'var(--text-primary)', margin: 0, letterSpacing: '0.02em',
          }}>
            Membership & <span style={{ color: 'var(--mint)' }}>Cards</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
            Manage member credentials and card issuance across all tiers.
          </p>
        </div>
        <button onClick={() => setIssueModal(selectedTier)} style={{
          padding: '10px 20px', background: 'var(--mint)', color: '#140035',
          border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700,
          fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          + Issue New Card
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 'var(--radius-sm)',
            background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'all 0.2s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Card System Tab */}
      {activeTab === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Card Designs - All 3 tiers */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Card Designs</div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
              Three tiers of membership credentials. Click to select for card issuance.
            </p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              {Object.keys(TIER_CONFIG).map(key => (
                <div key={key} onClick={() => setSelectedTier(key)} style={{
                  padding: 4, borderRadius: 20, cursor: 'pointer',
                  border: selectedTier === key ? `2px solid ${TIER_CONFIG[key].colorHex}` : '2px solid transparent',
                  transition: 'all 0.3s', transform: selectedTier === key ? 'scale(1.02)' : 'scale(1)',
                }}>
                  <MembershipCard tierKey={key} />
                </div>
              ))}
            </div>
          </div>

          {/* Tier Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {Object.keys(TIER_CONFIG).map(key => (
              <TierCard key={key} tierKey={key} isSelected={selectedTier === key} onSelect={() => setSelectedTier(key)} />
            ))}
          </div>

          {/* Card Model Recommendation */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
              Card Generation Model - <span style={{ color: 'var(--mint)' }}>Hybrid Recommended</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { tier: 'Catalyst', model: 'Static', desc: 'Issued once at signup. Valid for subscription duration. Simple, cost-effective. Card refreshes only on renewal.', color: 'var(--mint)' },
                { tier: 'Builder', model: 'Dynamic', desc: 'Monthly credential refresh. Updated usage stats and access tokens. Signals active engagement to partners.', color: 'var(--emerald)' },
                { tier: 'Architect', model: 'Dynamic+', desc: 'Monthly refresh with personalized elements. Unique monthly visual accent. Signals exclusive, evolving membership.', color: 'var(--gold)' },
              ].map(item => (
                <div key={item.tier} style={{
                  background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)',
                  padding: 16, borderLeft: `3px solid ${item.color}`,
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.tier}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', marginBottom: 8, fontWeight: 600 }}>{item.model}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { label: 'Total Members', value: '847', sub: '+24 this month', color: 'var(--mint)' },
            { label: 'Cards Issued', value: '812', sub: '96% issuance rate', color: 'var(--emerald)' },
            { label: 'Monthly Revenue', value: '$284K', sub: '+12% MoM', color: 'var(--gold)' },
          ].map(stat => (
            <div key={stat.label} style={{ ...sectionStyle, borderLeft: `3px solid ${stat.color}` }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{stat.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: stat.color, marginTop: 4 }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div style={sectionStyle}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px',
            padding: '0 0 10px', fontSize: 11, color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em',
            borderBottom: '1px solid var(--border-default)',
          }}>
            <span>Name</span><span>Organisation</span><span>Tier</span><span>ID</span><span>Status</span>
          </div>
          {sampleMembers.map(m => (
            <div key={m.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px',
              padding: '14px 0', borderBottom: '1px solid var(--border-subtle)',
              fontSize: 13, alignItems: 'center',
            }} className="member-row">
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.name}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{m.org}</span>
              <span style={{
                color: TIER_CONFIG[m.tier].colorHex, fontFamily: 'var(--font-mono)', fontSize: 11,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{TIER_CONFIG[m.tier].name}</span>
              <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.id}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, textAlign: 'center',
                color: m.status === 'Active' ? 'var(--mint)' : 'var(--gold)',
                background: m.status === 'Active' ? 'var(--mint-glow)' : 'var(--gold-glow)',
              }}>{m.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Issue Modal */}
      {issueModal && <CardIssueModal tierKey={issueModal} onClose={() => setIssueModal(null)} />}
    </div>
  );
};

Object.assign(window, { MembersPage, MembershipCard, TIER_CONFIG });
