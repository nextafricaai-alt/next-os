    const { useState, useEffect, useMemo, useCallback, useRef } = React;
    const SS = window.SCHOOL_STORE;

    const FMT = n => 'UGX ' + Number(n || 0).toLocaleString();
    const NOW = () => new Date().toISOString().slice(0,16).replace('T',' ');

    /* ─── Shared small components ─── */
    function Badge({ label, color='#3B82F6' }) {
      return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'999px', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', background:`${color}22`, color, border:`1px solid ${color}44` }}>{label}</span>;
    }
    function Field({ label, children }) {
      return (
        <div style={{ marginBottom:'13px' }}>
          <label style={{ display:'block', fontSize:'10px', fontFamily:'var(--mono)', letterSpacing:'0.08em', color:'var(--muted)', marginBottom:'5px', textTransform:'uppercase' }}>{label}</label>
          {children}
        </div>
      );
    }
    const IS = { width:'100%', background:'rgba(10,16,41,0.7)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'9px 12px', color:'#F8FAFC', fontFamily:'var(--font)', fontSize:'13px', outline:'none' };
    function Modal({ title, onClose, children, wide }) {
      return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'#0F172A', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'16px', width:'100%', maxWidth: wide ? '640px' : '500px', maxHeight:'90vh', overflowY:'auto', animation:'fadeIn 0.2s ease' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#0F172A', zIndex:1 }}>
              <h3 style={{ fontSize:'15px', fontWeight:'800' }}>{title}</h3>
              <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(248,250,252,0.4)', fontSize:'22px', cursor:'pointer', lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:'22px' }}>{children}</div>
          </div>
        </div>
      );
    }

    
    /* ─── Financial Charts ─── */
    function FinanceChart({ expenses }) {
      const canvasRef = useRef(null);
      const chartInstance = useRef(null);

      useEffect(() => {
        if (!canvasRef.current || !window.Chart) return;
        const expByCategory = expenses.reduce((acc, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
          return acc;
        }, {});
        const labels = Object.keys(expByCategory);
        const data = Object.values(expByCategory);

        if (chartInstance.current) chartInstance.current.destroy();
        const ctx = canvasRef.current.getContext('2d');
        chartInstance.current = new window.Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: ['#FF4757', '#FFB400', '#3B82F6', '#8B5CF6', '#00FC8F', '#F5F6FA'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { position: 'right', labels: { color: '#f5f6fa', font: { size: 11 } } },
              title: { display: true, text: 'Expenditure by Category', color: '#f5f6fa', font: { size: 14, weight: 'bold' } }
            }
          }
        });
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
      }, [expenses]);

      return (
        <div style={{ background: '#141e3c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '13px', padding: '18px 20px', height: '300px' }}>
          <canvas ref={canvasRef}></canvas>
        </div>
      );
    }

    function CashFlowTrend({ incomes, expenses }) {
      const canvasRef = useRef(null);
      const chartInstance = useRef(null);

      useEffect(() => {
        if (!canvasRef.current || !window.Chart) return;
        const getDay = (d) => d ? d.split(' ')[0] : 'Unknown';
        const dates = [...new Set([...incomes.map(i => getDay(i.date)), ...expenses.map(e => getDay(e.date))])].sort();
        const incData = dates.map(d => incomes.filter(i => getDay(i.date) === d).reduce((s, i) => s + i.amount, 0));
        const expData = dates.map(d => expenses.filter(e => getDay(e.date) === d).reduce((s, e) => s + e.amount, 0));

        if (chartInstance.current) chartInstance.current.destroy();
        const ctx = canvasRef.current.getContext('2d');
        chartInstance.current = new window.Chart(ctx, {
          type: 'bar',
          data: {
            labels: dates,
            datasets: [
              { label: 'Income', data: incData, backgroundColor: '#00FC8F', borderRadius: 4 },
              { label: 'Expenditure', data: expData, backgroundColor: '#FF4757', borderRadius: 4 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
              y: { ticks: { color: 'rgba(245,246,250,0.6)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              x: { ticks: { color: 'rgba(245,246,250,0.6)' }, grid: { display: false } }
            },
            plugins: {
              legend: { labels: { color: '#f5f6fa', font: { size: 11 } } },
              title: { display: true, text: 'Cash Flow Trend', color: '#f5f6fa', font: { size: 14, weight: 'bold' } }
            }
          }
        });
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
      }, [incomes, expenses]);

      return (
        <div style={{ background: '#141e3c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '13px', padding: '18px 20px', height: '300px' }}>
          <canvas ref={canvasRef}></canvas>
        </div>
      );
    }

    /* ─────────────────────────────────────────────────────────
       SIDE PANEL — Teachers, Students, Payment Records
    ───────────────────────────────────────────────────────── */
    function SidePanel({ onClose, tick }) {
      const [panelTab, setPanelTab] = useState('teachers');
      const [search, setSearch] = useState('');
      const [typeFilter, setTypeFilter] = useState('All');
      const [showAddTeacher, setShowAddTeacher] = useState(false);
      const [showAddStudent, setShowAddStudent] = useState(false);

      // Form state — teacher
      const [tName, setTName] = useState('');
      const [tRole, setTRole] = useState('Class Teacher');
      const [tSubject, setTSubject] = useState('');
      const [tClass, setTClass] = useState('');
      const [tPhone, setTPhone] = useState('');
      const [tEmail, setTEmail] = useState('');
      const [tSalary, setTSalary] = useState('');
      const [tQual, setTQual] = useState('Grade III Certificate');

      // Form state — student
      const [sName, setSName] = useState('');
      const [sClass, setSClass] = useState('P.1');
      const [sType, setSType] = useState('Day Scholar');
      const [sFee, setSFee] = useState('');
      const [sGuardian, setSGuardian] = useState('');
      const [sPhone, setSPhone] = useState('');

      const teachers = useMemo(() => SS.getTeachers(), [tick]);
      const students = useMemo(() => SS.getStudents(), [tick]);
      const payments = useMemo(() => SS.getPayments(), [tick]);

      const totalSalaryBill = useMemo(() => teachers.reduce((s,t) => s+(t.salary||0), 0), [teachers]);

      const filteredStudents = useMemo(() => {
        return students.filter(s => {
          const matchType = typeFilter === 'All' || s.type === typeFilter;
          const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.class.toLowerCase().includes(search.toLowerCase());
          return matchType && matchSearch;
        });
      }, [students, typeFilter, search, tick]);

      const filteredPayments = useMemo(() => {
        return payments.filter(p =>
          !search || p.studentName.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
        );
      }, [payments, search, tick]);

      const handleAddTeacher = () => {
        if (!tName || !tSalary) return;
        SS.addTeacher({ name:tName, role:tRole, subject:tSubject, class:tClass||'—', phone:tPhone, email:tEmail, salary:parseInt(tSalary.replace(/,/g,'')), status:'On Duty', joinDate:new Date().toISOString().slice(0,10), qualification:tQual, photo:null });
        setShowAddTeacher(false);
        setTName(''); setTSalary(''); setTPhone(''); setTEmail(''); setTSubject(''); setTClass('');
      };

      const handleAddStudent = () => {
        if (!sName || !sFee) return;
        const fee = parseInt(sFee.replace(/,/g,''));
        SS.addStudent({ name:sName, class:sClass, type:sType, termFee:fee, paidAmount:0, balance:fee, guardian:sGuardian, guardianPhone:sPhone, admissionDate:new Date().toISOString().slice(0,10), dob:'' });
        setShowAddStudent(false);
        setSName(''); setSFee(''); setSGuardian(''); setSPhone('');
      };

      const PTABS = [
        { k:'teachers', label:'👩‍🏫 Teachers' },
        { k:'students', label:'🎒 Students' },
        { k:'payments', label:'🧾 Payment Records' },
      ];

      return (
        <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
          {/* Panel Header */}
          <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, background:'var(--surf2)' }}>
            <div style={{ fontWeight:'800', fontSize:'14px' }}>School Registry</div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:'20px', cursor:'pointer', lineHeight:1 }}>×</button>
          </div>

          {/* Panel Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {PTABS.map(t => (
              <button key={t.k} onClick={() => { setPanelTab(t.k); setSearch(''); }} style={{
                flex:1, padding:'10px 4px', border:'none', fontSize:'11px', fontWeight:'700',
                background: panelTab===t.k ? 'rgba(255,180,0,0.1)' : 'transparent',
                color: panelTab===t.k ? '#FFB400' : 'var(--muted)',
                borderBottom: panelTab===t.k ? '2px solid #FFB400' : '2px solid transparent',
                cursor:'pointer', transition:'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Search */}
          <div style={{ padding:'12px 14px', flexShrink:0 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${panelTab}…`} style={{ ...IS, fontSize:'12px', padding:'8px 10px' }} />
          </div>

          {/* ── TEACHERS ── */}
          {panelTab === 'teachers' && (
            <div style={{ flex:1, overflowY:'auto', padding:'0 14px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:'var(--muted)' }}>
                  {teachers.length} staff · Monthly bill: <b style={{ color:'#FF4757' }}>{FMT(totalSalaryBill)}</b>
                </div>
                <button onClick={() => setShowAddTeacher(true)} style={{ background:'rgba(0,252,143,0.12)', border:'1px solid rgba(0,252,143,0.3)', color:'#00FC8F', borderRadius:'6px', padding:'5px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>+ Add</button>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {teachers.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase())).map(t => (
                  <div key={t.id} style={{ background:'var(--surf2)', borderRadius:'10px', padding:'13px 14px', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                        <div style={{ width:'38px', height:'38px', borderRadius:'50%', background:'linear-gradient(135deg,#3B82F6,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'800', flexShrink:0 }}>
                          {t.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <div style={{ fontWeight:'700', fontSize:'13px' }}>{t.name}</div>
                          <div style={{ fontSize:'11px', color:'var(--muted)' }}>{t.role} · {t.class}</div>
                        </div>
                      </div>
                      <Badge label={t.status} color={t.status==='On Duty'||t.status==='In Class' ? '#00FC8F' : '#3B82F6'} />
                    </div>
                    <div style={{ marginTop:'10px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', fontSize:'11px' }}>
                      <div style={{ color:'var(--muted)' }}>Subject: <b style={{ color:'var(--text)' }}>{t.subject||'—'}</b></div>
                      <div style={{ color:'var(--muted)' }}>Phone: <b style={{ color:'var(--text)' }}>{t.phone||'—'}</b></div>
                      <div style={{ color:'var(--muted)' }}>Joined: <b style={{ color:'var(--text)' }}>{t.joinDate}</b></div>
                      <div style={{ color:'var(--muted)' }}>Qual: <b style={{ color:'var(--text)' }}>{t.qualification}</b></div>
                    </div>
                    <div style={{ marginTop:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.2)', borderRadius:'6px', padding:'7px 10px' }}>
                      <span style={{ fontSize:'11px', color:'var(--muted)', fontWeight:'600' }}>Monthly Salary</span>
                      <span style={{ fontSize:'14px', fontWeight:'900', color:'#FF4757' }}>{FMT(t.salary)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STUDENTS ── */}
          {panelTab === 'students' && (
            <div style={{ flex:1, overflowY:'auto', padding:'0 14px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', flexWrap:'wrap', gap:'6px' }}>
                <div style={{ display:'flex', gap:'6px' }}>
                  {['All','Day Scholar','Boarding'].map(f => (
                    <button key={f} onClick={() => setTypeFilter(f)} style={{
                      padding:'4px 10px', borderRadius:'999px', border:'none', fontSize:'10px', fontWeight:'700', cursor:'pointer',
                      background: typeFilter===f ? '#FFB400' : 'rgba(255,255,255,0.07)',
                      color: typeFilter===f ? '#0a1029' : 'var(--muted)',
                    }}>{f}</button>
                  ))}
                </div>
                <button onClick={() => setShowAddStudent(true)} style={{ background:'rgba(0,252,143,0.12)', border:'1px solid rgba(0,252,143,0.3)', color:'#00FC8F', borderRadius:'6px', padding:'5px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>+ Add</button>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {filteredStudents.map(s => (
                  <div key={s.id} style={{ background:'var(--surf2)', borderRadius:'10px', padding:'12px 13px', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                      <div>
                        <div style={{ fontWeight:'700', fontSize:'13px' }}>{s.name}</div>
                        <div style={{ fontSize:'11px', color:'var(--muted)' }}>{s.class} · <span style={{ color: s.type==='Boarding' ? '#8B5CF6' : '#3B82F6' }}>{s.type}</span></div>
                      </div>
                      <Badge label={s.balance===0 ? 'CLEARED' : 'BALANCE DUE'} color={s.balance===0 ? '#00FC8F' : '#FF4757'} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'4px', marginTop:'8px' }}>
                      {[
                        { label:'Term Fee', val: FMT(s.termFee), color:'var(--text)' },
                        { label:'Paid', val: FMT(s.paidAmount), color:'#00FC8F' },
                        { label:'Balance', val: FMT(s.balance), color: s.balance>0 ? '#FF4757' : 'var(--muted)' },
                      ].map(x => (
                        <div key={x.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'6px', padding:'6px 8px', textAlign:'center' }}>
                          <div style={{ fontSize:'9px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{x.label}</div>
                          <div style={{ fontSize:'12px', fontWeight:'800', color:x.color, marginTop:'2px' }}>{x.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'7px' }}>Guardian: {s.guardian} · {s.guardianPhone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PAYMENT RECORDS ── */}
          {panelTab === 'payments' && (
            <div style={{ flex:1, overflowY:'auto', padding:'0 14px 14px' }}>
              <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'10px' }}>
                {payments.length} payment records · Total collected: <b style={{ color:'#00FC8F' }}>{FMT(payments.reduce((s,p)=>s+p.amount,0))}</b>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {filteredPayments.map(p => (
                  <div key={p.id} style={{ background:'var(--surf2)', borderRadius:'9px', padding:'11px 13px', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <span style={{ fontFamily:'var(--mono)', fontSize:'9px', color:'#00FC8F', fontWeight:'600' }}>{p.id}</span>
                        <div style={{ fontWeight:'700', fontSize:'13px', marginTop:'2px' }}>{p.studentName}</div>
                        <div style={{ fontSize:'11px', color:'var(--muted)' }}>{p.class} · {p.type}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontWeight:'900', fontSize:'15px', color:'#00FC8F' }}>{FMT(p.amount)}</div>
                        <Badge label={p.status} color={p.status==='Cleared' ? '#00FC8F' : '#FFB400'} />
                      </div>
                    </div>
                    <div style={{ marginTop:'7px', display:'flex', justifyContent:'space-between', fontSize:'10px', color:'var(--muted)' }}>
                      <span>{p.method} · {p.term}</span>
                      <span>{p.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Teacher Modal */}
          {showAddTeacher && (
            <Modal title="👩‍🏫 Add Staff Member" onClose={() => setShowAddTeacher(false)}>
              <Field label="Full Name *"><input style={IS} value={tName} onChange={e=>setTName(e.target.value)} placeholder="e.g. Tr. Mary Nakato" /></Field>
              <Field label="Role">
                <select style={IS} value={tRole} onChange={e=>setTRole(e.target.value)}>
                  {['Head Teacher','Class Teacher','Shuttle Driver','Bursar','School Nurse','Cleaner','Cook','Security Guard'].map(r=><option key={r}>{r}</option>)}
                </select>
              </Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <Field label="Subject / Dept"><input style={IS} value={tSubject} onChange={e=>setTSubject(e.target.value)} placeholder="e.g. Math & SST" /></Field>
                <Field label="Class Assigned"><input style={IS} value={tClass} onChange={e=>setTClass(e.target.value)} placeholder="e.g. P.3" /></Field>
                <Field label="Phone"><input style={IS} value={tPhone} onChange={e=>setTPhone(e.target.value)} placeholder="+256 7XX XXX XXX" /></Field>
                <Field label="Email"><input style={IS} value={tEmail} onChange={e=>setTEmail(e.target.value)} placeholder="email@school.ac.ug" /></Field>
              </div>
              <Field label="Monthly Salary (UGX) *"><input style={IS} type="number" value={tSalary} onChange={e=>setTSalary(e.target.value)} placeholder="e.g. 600000" /></Field>
              <Field label="Qualification">
                <select style={IS} value={tQual} onChange={e=>setTQual(e.target.value)}>
                  {['Grade III Certificate','Diploma in Education','ECD Certificate','Degree in Education','Class B Driving Permit','Other'].map(q=><option key={q}>{q}</option>)}
                </select>
              </Field>
              <button onClick={handleAddTeacher} disabled={!tName||!tSalary} style={{ width:'100%', padding:'12px', background: tName&&tSalary ? '#00FC8F' : '#334155', color: tName&&tSalary ? '#0a1029' : 'var(--muted)', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'800', cursor: tName&&tSalary ? 'pointer' : 'not-allowed', marginTop:'4px' }}>
                Save Staff Member
              </button>
            </Modal>
          )}

          {/* Add Student Modal */}
          {showAddStudent && (
            <Modal title="🎒 Add Student" onClose={() => setShowAddStudent(false)}>
              <Field label="Full Name *"><input style={IS} value={sName} onChange={e=>setSName(e.target.value)} placeholder="e.g. Aisha Nanteza" /></Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <Field label="Class">
                  <select style={IS} value={sClass} onChange={e=>setSClass(e.target.value)}>
                    {['Baby Class','Middle Class','Top Class','P.1','P.2','P.3','P.4','P.5','P.6','P.7'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Type">
                  <select style={IS} value={sType} onChange={e=>setSType(e.target.value)}>
                    <option>Day Scholar</option><option>Boarding</option>
                  </select>
                </Field>
              </div>
              <Field label="Term Fee (UGX) *"><input style={IS} type="number" value={sFee} onChange={e=>setSFee(e.target.value)} placeholder={sType==='Boarding' ? 'e.g. 1500000' : 'e.g. 650000'} /></Field>
              <Field label="Guardian Name"><input style={IS} value={sGuardian} onChange={e=>setSGuardian(e.target.value)} placeholder="e.g. Mr. Nanteza Joseph" /></Field>
              <Field label="Guardian Phone"><input style={IS} value={sPhone} onChange={e=>setSPhone(e.target.value)} placeholder="+256 7XX XXX XXX" /></Field>
              <div style={{ padding:'9px 11px', background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'8px', fontSize:'11px', color:'#60A5FA', marginBottom:'14px' }}>
                Day Scholar fees: UGX 350,000 – 850,000 · Boarding fees: UGX 1,200,000 – 1,600,000
              </div>
              <button onClick={handleAddStudent} disabled={!sName||!sFee} style={{ width:'100%', padding:'12px', background: sName&&sFee ? '#3B82F6' : '#334155', color:'#fff', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'800', cursor: sName&&sFee ? 'pointer' : 'not-allowed' }}>
                Enrol Student
              </button>
            </Modal>
          )}
        </div>
      );
    }

    /* ─────────────────────────────────────────────────────────
       MAIN BURSAR APP
    ───────────────────────────────────────────────────────── */
    window.BursarView = function BursarDashboard() {
    // Top-level Navigation tabs for the sleek headteacher-style layout
    const [activeTab, setActiveTab] = useState('finances'); // 'finances' | 'students' | 'teachers' | 'payments'
      const [tab, setTab] = useState('cash');
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      const [tick, setTick] = useState(0); // increment to re-render when store changes

      // Data from shared store
      const [incomes, setIncomes] = useState(() => SS.getIncomes());
      const [expenses, setExpenses] = useState(() => SS.getExpenses());

      // Refresh from store on any change (cross-tab sync)
      useEffect(() => {
        const refresh = () => {
          setIncomes(SS.getIncomes());
          setExpenses(SS.getExpenses());
          setTick(t => t + 1);
        };
        SS.onChange(refresh);
      }, []);

      // Modals
      const [showIncModal, setShowIncModal] = useState(false);
      const [showExpModal, setShowExpModal] = useState(false);
      const [showRecModal, setShowRecModal] = useState(false);
      const [showImportFeesModal, setShowImportFeesModal] = useState(false);
      const [parsedCsvRows, setParsedCsvRows] = useState([]);
      const [isImporting, setIsImporting] = useState(false);

      const handleCsvFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result || '';
          const rows = SS && SS.parseFeesCsv ? SS.parseFeesCsv(text) : [];
          setParsedCsvRows(rows);
        };
        reader.readAsText(file);
      };

      const handleDoImportFees = async () => {
        if (!parsedCsvRows.length) return;
        setIsImporting(true);
        if (SS && SS.importFees) {
          const res = await SS.importFees(parsedCsvRows);
          if (res && res.success) {
            setIncomes(SS.getIncomes());
            setExpenses(SS.getExpenses());
            alert(`✅ Successfully imported ${res.count} unique student fee records into Supabase!\n\n• Boarding Students: ${res.boardingCount}\n• Day Scholars: ${res.dayCount}\n\nBoth Head Teacher and Bursar dashboards are now live in sync.`);
          } else {
            alert(`❌ Import Failed: ${res?.error || 'Unknown Supabase error'}`);
          }
        }
        setIsImporting(false);
        setShowImportFeesModal(false);
        setParsedCsvRows([]);
      };

      // Income form
      const [incStudent, setIncStudent] = useState('');
      const [incClass, setIncClass] = useState('P.1');
      const [incAmount, setIncAmount] = useState('');
      const [incSource, setIncSource] = useState('School Fees (Tuition)');
      const [incMethod, setIncMethod] = useState('Cash');
      const [incNotes, setIncNotes] = useState('');

      // Expense form
      const [expCat, setExpCat] = useState('Fuel & Transport');
      const [expDesc, setExpDesc] = useState('');
      const [expAmount, setExpAmount] = useState('');
      const [expPaidTo, setExpPaidTo] = useState('');
      const [expSrcId, setExpSrcId] = useState('');
      const [expNotes, setExpNotes] = useState('');

      // Reconcile
      const [actualCash, setActualCash] = useState('');
      const [reconResult, setReconResult] = useState(null);

      // Report filters
      const [reportSearch, setReportSearch] = useState('');
      const [reportFilter, setReportFilter] = useState('All');

      /* ── Totals ── */
      const totalIn  = useMemo(() => incomes.reduce((s,i) => s+i.amount,  0), [incomes]);
      const totalOut = useMemo(() => expenses.reduce((s,e) => s+e.amount, 0), [expenses]);
      const cashBal  = totalIn - totalOut;

      /* ── Financial Rollup (fees expected/received/overdue, synced from Supabase) ── */
      const rollup = useMemo(() => (SS.getFinancialRollup ? SS.getFinancialRollup() : {
        totalFeesExpected: 0, totalFeesReceived: 0, balanceOverdue: 0, studentsOverdue: 0, collectionRate: 0, status: 'No fee data',
      }), [tick]);
      const STATUS_COLOR = { 'Healthy': '#00FC8F', 'Needs Attention': '#FFB400', 'Critical': '#FF4757', 'No fee data': 'var(--muted)' };

      // Payroll / Cash Outflow — recomputed live from the actual teacher
      // roster on every render (via SS.getTeachers()), not a stored
      // snapshot. Add/remove a teacher or change a salary and this figure
      // — and everything derived from it — updates the next time this
      // component renders, with nothing for the Bursar to manually re-enter.
      const activeTeachers = useMemo(() => SS.getTeachers().filter(t => (t.status || 'Active').toLowerCase() !== 'inactive'), [tick]);
      const monthlyPayroll = useMemo(() => activeTeachers.reduce((s, t) => s + Number(t.salary || 0), 0), [activeTeachers]);
      const netCashPosition = rollup.totalFeesReceived - totalOut - monthlyPayroll;

      /* ── Add Income ── */
      const handleAddIncome = () => {
        const amt = parseInt(incAmount.replace(/,/g,''));
        if (!incStudent || isNaN(amt) || amt <= 0) return;
        const entry = SS.addIncome({ date:NOW(), studentName:incStudent, class:incClass, sourceType:incSource, amount:amt, unspentBalance:amt, paymentMethod:incMethod, receivedBy:'Nalukenge Jane', notes:incNotes, loggedBy:'bursar' });
        setIncomes(SS.getIncomes());
        if (!expSrcId) setExpSrcId(entry.id);
        setShowIncModal(false);
        setIncStudent(''); setIncAmount(''); setIncNotes('');
      };

      /* ── Add Expense ── */
      const handleAddExpense = () => {
        const amt = parseInt(expAmount.replace(/,/g,''));
        if (!expDesc || isNaN(amt) || amt <= 0) return;
        const src = incomes.find(i => i.id === expSrcId) || incomes[0];
        if (!src) return;
        if (amt > (src.unspentBalance || 0)) {
          alert(`⚠️ Cannot allocate more than unspent balance of ${FMT(src.unspentBalance)} from ${src.id}.`);
          return;
        }
        SS.addExpense({ date:NOW(), category:expCat, description:expDesc, amount:amt, paidTo:expPaidTo, incomeSourceId:src.id, notes:expNotes, receiptAttached:false, loggedBy:'bursar' });
        setIncomes(SS.getIncomes());
        setExpenses(SS.getExpenses());
        setShowExpModal(false);
        setExpDesc(''); setExpAmount(''); setExpPaidTo(''); setExpNotes('');
      };

      /* ── Reconcile ── */
      const handleReconcile = () => {
        const actual = parseInt(actualCash.replace(/,/g,''));
        if (isNaN(actual)) return;
        setReconResult({ expected:cashBal, actual, diff:actual-cashBal });
      };

      /* ── Report filter ── */
      const filteredIncomes = useMemo(() => {
        return incomes.filter(i => {
          if (reportFilter !== 'All' && i.sourceType !== reportFilter) return false;
          if (reportSearch && !i.studentName.toLowerCase().includes(reportSearch.toLowerCase()) && !i.id.toLowerCase().includes(reportSearch.toLowerCase())) return false;
          return true;
        });
      }, [incomes, reportFilter, reportSearch]);

      const getExpensesFor = id => expenses.filter(e => e.incomeSourceId === id);

      /* ── Profile ── */
      let profile = null;
      try { profile = JSON.parse(localStorage.getItem('nextos.profile')||'null'); } catch(e){}
      const userName = profile?.fullName || 'Nalukenge Jane';

      const TABS = [
        { k:'cash',        label:'💰 Cash Flow' },
        { k:'report',      label:'📊 Full Report' },
        { k:'supervision', label:'👁️ Supervision' },
        { k:'reconcile',   label:'🧾 Reconcile' },
      ];

      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a1029', color: '#f5f6fa' }}>
          {/* Header Bar */}
          <header style={{
            background: '#141e3c', borderBottom: `1px solid rgba(255,255,255,0.15)`, padding: '16px 24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', background: '#FFB400', color: '#0A1029',
                fontWeight: '900', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #FFF', boxShadow: `0 0 16px rgba(255,180,0,0.4)`
              }}>
                ₿
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>{userName}</h1>
                  <span style={{ background: 'rgba(255,180,0,0.15)', color: '#FFB400', border: `1px solid #FFB400`, padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                    BURSAR / CASH HUB
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(245,246,250,0.6)', marginTop: '2px' }}>
                  Kabs Lily Kindercare & Primary School · Financial Operations & Fees
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => {
                  localStorage.removeItem('nextos.profile');
                  window.location.href = '/prototypes/schools/peak-primary/login.html';
                }}
                style={{
                  background: 'rgba(255,71,87,0.15)', color: '#FF4757', border: `1px solid #FF4757`,
                  padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px'
                }}
              >
                🔴 Sign-Out
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <main style={{ padding: '24px', flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid rgba(255,255,255,0.08)`, paddingBottom: '12px', overflowX: 'auto' }}>
              {[
                { id: 'finances', label: '💰 Finances & Cash flow' },
                { id: 'students', label: '🎒 Students & Enrollment' },
                { id: 'teachers', label: '👩‍🏫 Teachers Registry' },
                { id: 'payments', label: '🧾 Payment Records' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    background: activeTab === t.id ? '#FFB400' : '#141e3c',
                    color: activeTab === t.id ? '#0A1029' : '#f5f6fa',
                    border: `1px solid ${activeTab === t.id ? '#FFB400' : 'rgba(255,255,255,0.08)'}`,
                    padding: '10px 18px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: FINANCES */}
            {activeTab === 'finances' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px' }}>
                  {[
                    { icon:'📥', label:'Total Received', val:FMT(totalIn), sub:`${incomes.length} entries`, color:'#00FC8F' },
                    { icon:'📤', label:'Total Spent', val:FMT(totalOut), sub:`${expenses.length} entries`, color:'#FF4757' },
                    { icon:'💵', label:'Cash on Hand', val:FMT(cashBal), sub:'Expected balance', color:'#FFB400' },
                    { icon:'🎒', label:'Students Enrolled', val:SS.getStudents().length, sub:`${SS.getStudents().filter(s=>s.type==='Boarding').length} boarding`, color:'#3B82F6' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#141e3c', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'12px', padding:'16px 18px' }}>
                      <div style={{ fontSize:'20px', marginBottom:'4px' }}>{s.icon}</div>
                      <div style={{ fontSize:'11px', color:'rgba(245,246,250,0.6)', marginBottom:'3px', fontWeight:'500' }}>{s.label}</div>
                      <div style={{ fontSize:'18px', fontWeight:'900', color:s.color, letterSpacing:'-0.01em' }}>{s.val}</div>
                      <div style={{ fontSize:'10px', color:'rgba(245,246,250,0.6)', marginTop:'2px' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background:'#141e3c', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'13px', padding:'18px 20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
                    <h2 style={{ fontSize:'14px', fontWeight:'800', color:'#FFB400' }}>🏦 Fee Collection This Term — Live Rollup</h2>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'4px 10px', borderRadius:'999px', background:`${STATUS_COLOR[rollup.status]}1a`, border:`1px solid ${STATUS_COLOR[rollup.status]}55`, fontSize:'11px', fontWeight:'800', color:STATUS_COLOR[rollup.status] }}>
                      {rollup.status} · {(rollup.collectionRate*100).toFixed(0)}% collected
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
                    {[
                      { label:'Fees Expected This Term', val:FMT(rollup.totalFeesExpected), color:'#3B82F6' },
                      { label:'Fees Collected This Term', val:FMT(rollup.totalFeesReceived), color:'#00FC8F' },
                      { label:'Balance Overdue', val:FMT(rollup.balanceOverdue), color:'#FF4757' },
                      { label:'Students Owing', val:rollup.studentsOverdue, color:'#FFB400' },
                    ].map(x => (
                      <div key={x.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'9px', padding:'11px 13px' }}>
                        <div style={{ fontSize:'10px', color:'rgba(245,246,250,0.6)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>{x.label}</div>
                        <div style={{ fontSize:'16px', fontWeight:'900', color:x.color }}>{x.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:'12px', height:'6px', borderRadius:'999px', background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100, rollup.collectionRate*100)}%`, background:STATUS_COLOR[rollup.status], transition:'width 0.3s ease' }}></div>
                  </div>
                  {rollup.unmatchedIncome > 0 && (
                    <div style={{ marginTop:'12px', padding:'9px 12px', background:'rgba(255,180,0,0.08)', border:'1px solid rgba(255,180,0,0.25)', borderRadius:'8px', fontSize:'11px', color:'#FFB400' }}>
                      ⚠️ {FMT(rollup.unmatchedIncome)} logged in the Income Log doesn't match any enrolled student by name — it's real cash on hand, but not reflected in the fee totals above. Check spelling or confirm these students are enrolled.
                    </div>
                  )}
                </div>

                <div style={{ background:'#141e3c', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'13px', padding:'18px 20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
                    <h2 style={{ fontSize:'14px', fontWeight:'800', color:'#FFB400' }}>💼 Payroll / Cash Outflow — Synced to Teaching Staff</h2>
                    <span style={{ fontSize:'10.5px', color:'rgba(245,246,250,0.6)', fontFamily:'var(--mono)' }}>{activeTeachers.length} active staff · updates automatically</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
                    {[
                      { label:'Monthly Payroll (Live)', val:FMT(monthlyPayroll), color:'#FF4757' },
                      { label:'Cash Spent (Logged)', val:FMT(totalOut), color:'#FFB400' },
                      { label:'Net Cash Position', val:FMT(netCashPosition), color: netCashPosition >= 0 ? '#00FC8F' : '#FF4757' },
                    ].map(x => (
                      <div key={x.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'9px', padding:'11px 13px' }}>
                        <div style={{ fontSize:'10px', color:'rgba(245,246,250,0.6)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>{x.label}</div>
                        <div style={{ fontSize:'16px', fontWeight:'900', color:x.color }}>{x.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                
                {/* Advanced Finance Monitoring Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <CashFlowTrend incomes={incomes} expenses={expenses} />
                  <FinanceChart expenses={expenses} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px' }}>
                  {/* Income */}
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                      <h2 style={{ fontSize:'14px', fontWeight:'800', color:'#00FC8F' }}>📥 Income Log</h2>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <button onClick={() => setShowImportFeesModal(true)} style={{ background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.35)', color:'#3B82F6', padding:'6px 12px', borderRadius:'7px', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>📥 Import Fees CSV</button>
                        <button onClick={() => setShowIncModal(true)} style={{ background:'rgba(0,252,143,0.12)', border:'1px solid rgba(0,252,143,0.35)', color:'#00FC8F', padding:'6px 12px', borderRadius:'7px', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>+ Log Income</button>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
                      {incomes.map(inc => (
                        <div key={inc.id} style={{ background:'#141e3c', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'11px', padding:'13px 15px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'5px' }}>
                            <div>
                              <span style={{ fontFamily:'var(--mono)', fontSize:'9px', color:'#00FC8F', fontWeight:'600' }}>{inc.id}</span>
                              <div style={{ fontWeight:'700', fontSize:'13px', marginTop:'2px' }}>{inc.studentName} <span style={{ color:'rgba(245,246,250,0.6)', fontWeight:'400', fontSize:'11px' }}>({inc.class})</span></div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ color:'#00FC8F', fontWeight:'800', fontSize:'14px' }}>{FMT(inc.amount)}</div>
                              <div style={{ fontSize:'10px', color:'rgba(245,246,250,0.6)', marginTop:'3px' }}>Unspent: {FMT(inc.unspentBalance)}</div>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                            <Badge label={inc.sourceType} color="#3B82F6" />
                            <Badge label={inc.paymentMethod} color="#8B5CF6" />
                          </div>
                          {inc.notes && <div style={{ fontSize:'11px', color:'rgba(245,246,250,0.6)', marginTop:'8px', fontStyle:'italic' }}>Notes: {inc.notes}</div>}
                          <div style={{ fontSize:'10px', color:'rgba(245,246,250,0.4)', marginTop:'8px' }}>{inc.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                      <h2 style={{ fontSize:'14px', fontWeight:'800', color:'#FF4757' }}>📤 Expenditure Log</h2>
                      <button onClick={() => setShowExpModal(true)} style={{ background:'rgba(255,71,87,0.12)', border:'1px solid rgba(255,71,87,0.35)', color:'#FF4757', padding:'6px 12px', borderRadius:'7px', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>+ Log Expense</button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
                      {expenses.map(exp => {
                        const src = incomes.find(i => i.id === exp.incomeSourceId);
                        return (
                          <div key={exp.id} style={{ background:'#141e3c', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'11px', padding:'13px 15px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'5px' }}>
                              <div>
                                <span style={{ fontFamily:'var(--mono)', fontSize:'9px', color:'#FF4757', fontWeight:'600' }}>{exp.id}</span>
                                <div style={{ fontWeight:'700', fontSize:'13px', marginTop:'2px' }}>{exp.paidTo} <span style={{ color:'rgba(245,246,250,0.6)', fontWeight:'400', fontSize:'11px' }}>({exp.category})</span></div>
                              </div>
                              <div style={{ color:'#FF4757', fontWeight:'800', fontSize:'14px' }}>{FMT(exp.amount)}</div>
                            </div>
                            <div style={{ fontSize:'11px', color:'rgba(245,246,250,0.6)', marginBottom:'8px' }}>{exp.description}</div>
                            {src && (
                              <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 8px', borderRadius:'6px', background:'rgba(255,180,0,0.1)', border:'1px solid rgba(255,180,0,0.2)', fontSize:'9px', color:'#FFB400', fontFamily:'var(--mono)' }}>
                                🔗 FUNDED FROM: {src.studentName} ({src.class})
                              </div>
                            )}
                            <div style={{ fontSize:'10px', color:'rgba(245,246,250,0.4)', marginTop:'8px' }}>{exp.date}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: STUDENTS */}
            {activeTab === 'students' && (
              <div style={{ background: '#141e3c', padding: '24px', borderRadius: '12px', border: `1px solid rgba(255,255,255,0.15)` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                  <h2 style={{ fontSize:'16px', fontWeight:'800', color:'#3B82F6' }}>🎒 Students & Enrollment ({students.length})</h2>
                  <button onClick={() => setShowAddStudent(true)} style={{ background:'rgba(0,252,143,0.12)', border:'1px solid rgba(0,252,143,0.3)', color:'#00FC8F', borderRadius:'6px', padding:'6px 14px', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>+ Add Student</button>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1a2548', color: 'rgba(245,246,250,0.6)' }}>
                      <th style={{ padding: '12px' }}>Student Name</th>
                      <th style={{ padding: '12px' }}>Class</th>
                      <th style={{ padding: '12px' }}>Type</th>
                      <th style={{ padding: '12px' }}>Full Fees</th>
                      <th style={{ padding: '12px' }}>Fee Balance</th>
                      <th style={{ padding: '12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{s.name}</td>
                        <td style={{ padding: '12px' }}>{s.class}</td>
                        <td style={{ padding: '12px' }}><Badge label={s.type} color="#3B82F6" /></td>
                        <td style={{ padding: '12px' }}>{FMT(s.termFee)}</td>
                        <td style={{ padding: '12px', fontWeight: '800', color: s.balance > 0 ? '#FF4757' : '#00FC8F' }}>{FMT(s.balance)}</td>
                        <td style={{ padding: '12px' }}>
                          <Badge label={s.balance > 0 ? 'Unpaid' : 'Cleared'} color={s.balance > 0 ? '#FF4757' : '#00FC8F'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: TEACHERS */}
            {activeTab === 'teachers' && (
              <div style={{ background: '#141e3c', padding: '24px', borderRadius: '12px', border: `1px solid rgba(255,255,255,0.15)` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                  <h2 style={{ fontSize:'16px', fontWeight:'800', color:'#FFB400' }}>👩‍🏫 Teachers Registry ({teachers.length})</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '13px', color: 'rgba(245,246,250,0.6)' }}>
                      Monthly Salary Bill: <b style={{ color: '#FF4757' }}>{FMT(monthlyPayroll)}</b>
                    </div>
                    <button onClick={() => setShowAddTeacher(true)} style={{ background:'rgba(0,252,143,0.12)', border:'1px solid rgba(0,252,143,0.3)', color:'#00FC8F', borderRadius:'6px', padding:'6px 14px', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>+ Add Teacher</button>
                  </div>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1a2548', color: 'rgba(245,246,250,0.6)' }}>
                      <th style={{ padding: '12px' }}>Staff Name</th>
                      <th style={{ padding: '12px' }}>Role & Subject</th>
                      <th style={{ padding: '12px' }}>Phone</th>
                      <th style={{ padding: '12px' }}>Joined</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Monthly Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{t.name}</td>
                        <td style={{ padding: '12px', color: 'rgba(245,246,250,0.8)' }}>
                          <div>{t.role}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(245,246,250,0.5)' }}>{t.subject}</div>
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'var(--mono)' }}>{t.phone}</td>
                        <td style={{ padding: '12px', color: 'rgba(245,246,250,0.6)' }}>{t.joinDate}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: '#FF4757' }}>{FMT(t.salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: PAYMENTS */}
            {activeTab === 'payments' && (
              <div style={{ background: '#141e3c', padding: '24px', borderRadius: '12px', border: `1px solid rgba(255,255,255,0.15)` }}>
                <h2 style={{ fontSize:'16px', fontWeight:'800', color:'#00FC8F', marginBottom:'16px' }}>🧾 All Payment Records ({payments.length})</h2>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1a2548', color: 'rgba(245,246,250,0.6)' }}>
                      <th style={{ padding: '12px' }}>Receipt No</th>
                      <th style={{ padding: '12px' }}>Student</th>
                      <th style={{ padding: '12px' }}>Amount</th>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Bursar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <td style={{ padding: '12px', fontFamily: 'var(--mono)', color: '#3B82F6' }}>{p.id}</td>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{p.studentName} <span style={{ color: 'rgba(245,246,250,0.6)', fontWeight: 'normal' }}>({p.class})</span></td>
                        <td style={{ padding: '12px', fontWeight: '800', color: '#00FC8F' }}>{FMT(p.amount)}</td>
                        <td style={{ padding: '12px', color: 'rgba(245,246,250,0.6)' }}>{p.date}</td>
                        <td style={{ padding: '12px' }}>{p.bursar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </main>

          {/* ═══ INCOME MODAL ═══ */}
          {showIncModal && (
            <Modal title="📥 Log New Income (Cash/Bank)" onClose={() => setShowIncModal(false)}>
              <Field label="Student Name *">
                <select style={IS} value={incStudent} onChange={e => {
                  const s = students.find(x => x.name === e.target.value);
                  setIncStudent(e.target.value);
                  if (s) setIncClass(s.class);
                }}>
                  <option value="">Select Student...</option>
                  {students.map(s => <option key={s.id} value={s.name}>{s.name} ({s.class}) — Bal: {FMT(s.balance)}</option>)}
                </select>
              </Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <Field label="Amount (UGX) *"><input style={IS} type="number" value={incAmount} onChange={e=>setIncAmount(e.target.value)} placeholder="e.g. 150000" /></Field>
                <Field label="Class"><input style={IS} value={incClass} onChange={e=>setIncClass(e.target.value)} disabled /></Field>
              </div>
              <Field label="Source Type">
                <select style={IS} value={incSource} onChange={e=>setIncSource(e.target.value)}>
                  {['School Fees (Tuition)','Admission & Books','Uniforms','Transport / Bus','Other'].map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Payment Method">
                <select style={IS} value={incMethod} onChange={e=>setIncMethod(e.target.value)}>
                  {['Cash','Bank Transfer','Mobile Money'].map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Notes"><input style={IS} value={incNotes} onChange={e=>setIncNotes(e.target.value)} placeholder="e.g. Term 2 — full payment" /></Field>
              <div style={{ padding:'9px 11px', background:'rgba(0,252,143,0.06)', border:'1px solid rgba(0,252,143,0.2)', borderRadius:'8px', fontSize:'11px', color:'#00FC8F', marginBottom:'14px' }}>
                Received by: <b>{userName}</b> · Entry auto-syncs to Head Teacher Dashboard & Payment Records.
              </div>
              <button onClick={handleAddIncome} disabled={!incStudent||!incAmount} style={{ width:'100%', padding:'12px', background: incStudent&&incAmount ? '#00FC8F' : '#334155', color: incStudent&&incAmount ? '#0a1029' : 'rgba(245,246,250,0.6)', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'800', cursor: incStudent&&incAmount ? 'pointer':'not-allowed' }}>
                Save Income Entry
              </button>
            </Modal>
          )}

          {/* ═══ EXPENSE MODAL ═══ */}
          {showExpModal && (
            <Modal title="📤 Log Expenditure" onClose={() => setShowExpModal(false)}>
              <Field label="Category">
                <select style={IS} value={expCat} onChange={e=>setExpCat(e.target.value)}>
                  {['Fuel & Transport','Food & Kitchen','Supplies & Stationery','Repairs & Maintenance','Staff Wages','Utilities','Other'].map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Description *"><input style={IS} value={expDesc} onChange={e=>setExpDesc(e.target.value)} placeholder="e.g. Diesel for shuttle van" /></Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <Field label="Amount (UGX) *"><input style={IS} type="number" value={expAmount} onChange={e=>setExpAmount(e.target.value)} placeholder="e.g. 50000" /></Field>
                <Field label="Paid To"><input style={IS} value={expPaidTo} onChange={e=>setExpPaidTo(e.target.value)} placeholder="e.g. Total Energies" /></Field>
              </div>
              <Field label="🔗 Funded From (Income Entry) *">
                <select style={IS} value={expSrcId} onChange={e=>setExpSrcId(e.target.value)}>
                  {incomes.map(i=>(
                    <option key={i.id} value={i.id}>{i.id} — {i.studentName} ({i.class}) · Unspent: {FMT(i.unspentBalance)}</option>
                  ))}
                </select>
              </Field>
              <div style={{ padding:'7px 10px', background:'rgba(255,180,0,0.07)', border:'1px solid rgba(255,180,0,0.22)', borderRadius:'7px', fontSize:'10px', color:'#FFB400', marginBottom:'10px' }}>
                System deducts from selected income entry's unspent balance. Over-allocation is blocked.
              </div>
              <Field label="Notes"><input style={IS} value={expNotes} onChange={e=>setExpNotes(e.target.value)} placeholder="e.g. Emergency repair" /></Field>
              <button onClick={handleAddExpense} disabled={!expDesc||!expAmount} style={{ width:'100%', padding:'12px', background: expDesc&&expAmount ? '#FF4757' : '#334155', color:'#fff', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'800', cursor: expDesc&&expAmount ? 'pointer':'not-allowed' }}>
                Save Expenditure Entry
              </button>
            </Modal>
          )}

          {/* ═══ IMPORT FEES CSV MODAL ═══ */}
          {showImportFeesModal && (
            <Modal title="📥 Bulk Import Fees (CSV)" onClose={() => setShowImportFeesModal(false)}>
              <p style={{ fontSize:'12px', color:'rgba(245,246,250,0.6)', marginBottom:'14px' }}>
                Upload your fee ledger CSV file (e.g. <code>kabs_lily_fees.csv</code>). The rows will write directly to Supabase and update all dashboards in real-time.
              </p>
              <Field label="Option A: Choose CSV File">
                <input type="file" accept=".csv" onChange={handleCsvFileChange} style={{ background:'#1a2548', color:'#f5f6fa', padding:'10px', borderRadius:'8px', width:'100%' }} />
              </Field>

              <Field label="Option B: Or Paste CSV / Excel Data">
                <textarea
                  rows="4"
                  placeholder="Paste CSV rows here (e.g. Student Name, Class, Fee Type, Full Fees, Amount Paid)..."
                  onChange={(e) => {
                    const text = e.target.value || '';
                    const store = window.SCHOOL_STORE || SS;
                    const rows = store && store.parseFeesCsv ? store.parseFeesCsv(text) : [];
                    setParsedCsvRows(rows);
                  }}
                  style={{ background:'#1a2548', color:'#f5f6fa', padding:'10px', borderRadius:'8px', width:'100%', fontFamily:'var(--mono)', fontSize:'11px', outline:'none' }}
                />
              </Field>

              {parsedCsvRows.length > 0 && (
                <div style={{ marginTop:'14px', background:'#1a2548', borderRadius:'9px', padding:'12px', maxHeight:'200px', overflowY:'auto' }}>
                  <div style={{ fontWeight:'800', fontSize:'12px', color:'#00FC8F', marginBottom:'8px' }}>
                    Previewing {parsedCsvRows.length} rows to import:
                  </div>
                  <table style={{ width:'100%', fontSize:'11px', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ color:'rgba(245,246,250,0.6)', textAlign:'left' }}>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Fee Type</th>
                        <th>Full Fee</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCsvRows.slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                          <td style={{ padding:'4px 0' }}>{r.name}</td>
                          <td>{r.class}</td>
                          <td>{r.feeType}</td>
                          <td>{FMT(r.fullFees || r.amount)}</td>
                          <td style={{ color: r.balance > 0 ? '#FF4757' : '#00FC8F' }}>{FMT(r.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedCsvRows.length > 10 && <div style={{ fontSize:'10px', color:'rgba(245,246,250,0.6)', marginTop:'6px' }}>+ {parsedCsvRows.length - 10} more rows...</div>}
                </div>
              )}

              <button
                onClick={handleDoImportFees}
                disabled={!parsedCsvRows.length || isImporting}
                style={{
                  width:'100%', padding:'12px', marginTop:'16px',
                  background: parsedCsvRows.length ? '#3B82F6' : '#334155',
                  color: parsedCsvRows.length ? '#ffffff' : 'rgba(245,246,250,0.6)',
                  border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'800',
                  cursor: parsedCsvRows.length ? 'pointer' : 'not-allowed'
                }}
              >
                {isImporting ? 'Importing into Supabase...' : `Import ${parsedCsvRows.length} Fee Records →`}
              </button>
            </Modal>
          )}

          {/* Add Modals for Teachers and Students (From side panel) */}
          {/* TEACHER MODAL */}
          {showAddTeacher && (
            <Modal title="👩‍🏫 Add Teacher" onClose={() => setShowAddTeacher(false)}>
              <Field label="Full Name *"><input style={IS} value={tName} onChange={e=>setTName(e.target.value)} placeholder="e.g. Nalukenge Jane" /></Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <Field label="Role">
                  <select style={IS} value={tRole} onChange={e=>setTRole(e.target.value)}>
                    <option>Class Teacher</option><option>Subject Teacher</option><option>Administrator</option><option>Bursar</option>
                  </select>
                </Field>
                <Field label="Primary Subject"><input style={IS} value={tSubject} onChange={e=>setTSubject(e.target.value)} placeholder="e.g. Mathematics" /></Field>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <Field label="Class / Stream"><input style={IS} value={tClass} onChange={e=>setTClass(e.target.value)} placeholder="e.g. P.4 Lion" /></Field>
                <Field label="Monthly Salary (UGX) *"><input style={IS} type="number" value={tSalary} onChange={e=>setTSalary(e.target.value)} placeholder="e.g. 500000" /></Field>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <Field label="Phone Number"><input style={IS} value={tPhone} onChange={e=>setTPhone(e.target.value)} placeholder="e.g. +256 772 001 001" /></Field>
                <Field label="Qualification">
                  <select style={IS} value={tQual} onChange={e=>setTQual(e.target.value)}>
                    <option>Grade III Certificate</option><option>Diploma in Education</option><option>Bachelor's Degree</option><option>ECD Certificate</option>
                  </select>
                </Field>
              </div>
              <button onClick={handleAddTeacher} disabled={!tName||!tSalary} style={{ width:'100%', padding:'12px', background: tName&&tSalary ? '#00FC8F' : '#334155', color: tName&&tSalary ? '#0a1029' : 'rgba(245,246,250,0.6)', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'800', cursor: tName&&tSalary ? 'pointer':'not-allowed' }}>
                Save Teacher
              </button>
            </Modal>
          )}

          {/* STUDENT MODAL */}
          {showAddStudent && (
            <Modal title="🎒 Enroll Student" onClose={() => setShowAddStudent(false)}>
              <Field label="Full Name *"><input style={IS} value={sName} onChange={e=>setSName(e.target.value)} placeholder="e.g. Brian Mukasa" /></Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <Field label="Class">
                  <select style={IS} value={sClass} onChange={e=>setSClass(e.target.value)}>
                    <option>Baby Class</option><option>Middle Class</option><option>Top Class</option>
                    <option>P.1</option><option>P.2</option><option>P.3</option><option>P.4</option><option>P.5</option><option>P.6</option><option>P.7</option>
                  </select>
                </Field>
                <Field label="Enrollment Type">
                  <select style={IS} value={sType} onChange={e=>setSType(e.target.value)}>
                    <option>Day Scholar</option><option>Boarding</option>
                  </select>
                </Field>
              </div>
              <Field label="Term Full Fees (UGX) *"><input style={IS} type="number" value={sFee} onChange={e=>setSFee(e.target.value)} placeholder="e.g. 750000" /></Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <Field label="Guardian Name"><input style={IS} value={sGuardian} onChange={e=>setSGuardian(e.target.value)} placeholder="e.g. Mr. Musoke" /></Field>
                <Field label="Guardian Phone"><input style={IS} value={sPhone} onChange={e=>setSPhone(e.target.value)} placeholder="e.g. +256 700 123 456" /></Field>
              </div>
              <button onClick={handleAddStudent} disabled={!sName||!sFee} style={{ width:'100%', padding:'12px', background: sName&&sFee ? '#3B82F6' : '#334155', color: '#fff', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'800', cursor: sName&&sFee ? 'pointer':'not-allowed' }}>
                Save Student
              </button>
            </Modal>
          )}

        </div>
      );

    // Expose for index.html wrapper
    }
    window.BursarView = BursarDashboard;
