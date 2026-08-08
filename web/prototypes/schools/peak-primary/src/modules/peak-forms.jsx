import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } from 'react';

const T = window.V4.T;
  const D = window.PEAK || window.PEAK_FALLBACK;

  // ─── Shared form atoms ────────────────────────────────────────────────────
  function Field({ label, hint, error, children, span = 1 }) {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span ' + span }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.ink2, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: T.mono }}>{label}</span>
          {hint && <span style={{ fontSize: 10.5, color: T.ink4, fontFamily: T.mono }}>{hint}</span>}
        </div>
        {children}
        {error && <span style={{ fontSize: 11, color: T.redInk, marginTop: 1 }}>{error}</span>}
      </label>
    );
  }

  const inputStyle = {
    background: T.bg, border: '1px solid ' + T.border, borderRadius: 9,
    padding: '10px 12px', fontSize: 13.5, color: T.ink, fontFamily: T.font,
    outline: 'none', width: '100%',
  };
  const inputFocusStyle = { border: '1px solid ' + T.navyLite, background: T.surface2 };

  function TextInput({ value, onChange, placeholder, type = 'text' }) {
    const [focus, setFocus] = useState(false);
    return (
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...inputStyle, ...(focus ? inputFocusStyle : null) }}
      />
    );
  }

  function Select({ value, onChange, options }) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        ...inputStyle,
        appearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8'><path d='M0 0L6 8L12 0' fill='%238a91b0'/></svg>\")",
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
        paddingRight: 34,
      }}>
        {options.map(o => <option key={o.value || o} value={o.value || o} style={{ background: T.bg }}>{o.label || o}</option>)}
      </select>
    );
  }

  function PrimaryButton({ children, onClick, disabled }) {
    return (
      <button onClick={onClick} disabled={disabled} style={{
        padding: '11px 18px', background: disabled ? T.surface2 : T.red, color: '#fff',
        border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: T.font,
        opacity: disabled ? 0.5 : 1, transition: 'opacity 0.12s',
      }}>{children}</button>
    );
  }

  function SecondaryButton({ children, onClick }) {
    return (
      <button onClick={onClick} style={{
        padding: '11px 18px', background: 'transparent', color: T.ink2,
        border: '1px solid ' + T.borderStr, borderRadius: 9, fontSize: 13, fontWeight: 500,
        cursor: 'pointer', fontFamily: T.font,
      }}>{children}</button>
    );
  }

  function ModalHeader({ eyebrow, title, subtitle }) {
    return (
      <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid ' + T.border }}>
        <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{eyebrow}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: T.ink2, marginTop: 6 }}>{subtitle}</div>}
      </div>
    );
  }

  function ModalFooter({ children }) {
    return (
      <div style={{
        padding: '16px 26px', borderTop: '1px solid ' + T.border,
        display: 'flex', justifyContent: 'flex-end', gap: 10,
      }}>{children}</div>
    );
  }

  // ─── Add Student ──────────────────────────────────────────────────────────
  function AddStudent({ store }) {
    const _CL = (window.SCHOOL_CONFIG && window.SCHOOL_CONFIG.classes && window.SCHOOL_CONFIG.classes.length) ? window.SCHOOL_CONFIG.classes : D.streams.map(s => s.id);
    const _COMBOS = (window.SCHOOL_CONFIG && window.SCHOOL_CONFIG.combinations) || [];
    const [name, setName] = useState('');
    const [stream, setStream] = useState(_CL[0] || 'P1V');
    const [residenceType, setResidenceType] = useState('day');
    const [combination, setCombination] = useState('');
    const [guardian, setGuardian] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [feesStatus, setFeesStatus] = useState('paid');
    const [balance, setBalance] = useState('0');
    const [errors, setErrors] = useState({});

    const submit = () => {
      const errs = {};
      if (!name.trim()) errs.name = 'Name is required';
      if (!guardian.trim()) errs.guardian = 'Guardian name is required';
      if (!phone.trim()) errs.phone = 'Phone is required';
      if (Object.keys(errs).length) { setErrors(errs); return; }
      const bal = feesStatus === 'paid' ? 0 : Number(balance.replace(/[^0-9]/g, '')) || 0;
      store.addStudent({
        name: name.trim(),
        stream,
        residenceType,
        combination: combination || null,
        guardian: guardian.trim(),
        phone: phone.trim(),
        fees: feesStatus,
        balance: bal,
        dob: dob || null,
      });
      window.peakToast(name.trim() + ' added to ' + stream + ' (' + (residenceType === 'boarding' ? 'Boarder 🌙' : 'Day ☀️') + ')', 'success', 'Guardian ' + guardian + ' will receive a welcome WhatsApp.');
      window.peakModal.close();
    };

    return (
      <div style={{ width: '100%' }}>
        <ModalHeader
          eyebrow="Add new student · Term 2"
          title="Enrol a new student"
          subtitle="Guardian gets an automatic welcome WhatsApp + parent-portal login."
        />
        <div style={{ padding: '12px 26px', background: 'rgba(0,252,143,0.1)', borderBottom: '1px solid rgba(0,252,143,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '12.5px', color: '#00FC8F', fontWeight: '600' }}>📄 Send parent full 3-page Kabs Lily Enrollment Form?</span>
          <button onClick={() => window.open(window.peakSchoolLink ? window.peakSchoolLink('enroll') : '/prototypes/schools/peak-primary/student-enrollment-form.html', '_blank')} style={{ background: '#00FC8F', color: '#0A1029', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' }}>
            Open Digital Enrollment Form 🔗
          </button>
        </div>
        <div style={{ padding: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Student name" error={errors.name} span={2}>
            <TextInput value={name} onChange={v => { setName(v); setErrors(e => ({ ...e, name: null })); }} placeholder="e.g. Esther Nakimuli" />
          </Field>
          <Field label="Class · stream" hint={(window.SCHOOL_CONFIG && window.SCHOOL_CONFIG.type === 'secondary') ? 'S1–S6' : ((window.SCHOOL_CONFIG && (window.SCHOOL_CONFIG.type === 'nursery' || window.SCHOOL_CONFIG.type === 'nursery-primary')) ? 'Baby–Top / P1–P7' : 'P1–P7')}>
            <Select value={stream} onChange={setStream} options={_CL.map(c => ({ value: c, label: c }))} />
          </Field>
          <Field label="Residence Type" hint="Day Scholar or Boarder">
            <Select value={residenceType} onChange={setResidenceType} options={[
              { value: 'day',      label: '☀️ Day Scholar' },
              { value: 'boarding', label: '🌙 Boarder (Hostel)' },
            ]} />
          </Field>
          {_COMBOS.length > 0 && (
            <Field label="Combination" hint="A-Level (S5/S6)">
              <Select value={combination} onChange={setCombination} options={[{ value: '', label: '— none / O-Level —' }].concat(_COMBOS.map(c => ({ value: c.name, label: c.name + ' · ' + (c.subjects || []).join('/') })))} />
            </Field>
          )}
          <Field label="Date of birth" hint="optional">
            <TextInput value={dob} onChange={setDob} placeholder="14 March 2019" />
          </Field>
          <Field label="Primary guardian" error={errors.guardian}>
            <TextInput value={guardian} onChange={v => { setGuardian(v); setErrors(e => ({ ...e, guardian: null })); }} placeholder="Mrs. Joyce Namutebi" />
          </Field>
          <Field label="WhatsApp phone" hint="+256 …" error={errors.phone}>
            <TextInput value={phone} onChange={v => { setPhone(v); setErrors(e => ({ ...e, phone: null })); }} placeholder="+256 772 416 902" />
          </Field>
          <Field label="Fees status">
            <Select value={feesStatus} onChange={setFeesStatus} options={[
              { value: 'paid',    label: 'Fully paid' },
              { value: 'partial', label: 'Partial payment' },
              { value: 'overdue', label: 'Outstanding · overdue' },
            ]} />
          </Field>
          {feesStatus !== 'paid' && (
            <Field label="Outstanding balance" hint="UGX">
              <TextInput value={balance} onChange={setBalance} placeholder="0" />
            </Field>
          )}
        </div>
        <div style={{
          padding: '0 26px 16px', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 12, color: T.ink3,
        }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: T.redSft, color: T.redInk, display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, fontWeight: 700 }}>AI</span>
          <span>NEXT will auto-create a parent portal login and queue a welcome WhatsApp in English + Luganda.</span>
        </div>
        <ModalFooter>
          <SecondaryButton onClick={() => window.peakModal.close()}>Cancel</SecondaryButton>
          <PrimaryButton onClick={submit}>Enrol student →</PrimaryButton>
        </ModalFooter>
      </div>
    );
  }

  // ─── Add Teacher ──────────────────────────────────────────────────────────
  function AddTeacher({ store }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [streams, setStreams] = useState(['P1V']);
    const [subjects, setSubjects] = useState('');
    const [phone, setPhone] = useState('');
    const [errors, setErrors] = useState({});

    const toggleStream = (id) => {
      setStreams(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
    };

    const submit = () => {
      const errs = {};
      if (!name.trim()) errs.name = 'Name is required';
      if (!role.trim()) errs.role = 'Role is required';
      if (!phone.trim()) errs.phone = 'Phone is required';
      if (Object.keys(errs).length) { setErrors(errs); return; }
      const subj = subjects.split(',').map(s => s.trim()).filter(Boolean);
      store.addTeacher({
        name: name.trim(),
        role: role.trim(),
        subjects: subj.length ? subj : ['General'],
        streams,
        phone: phone.trim(),
      });
      window.peakToast(name.trim() + ' added to staff', 'success', 'Teacher dashboard login will be sent to ' + phone);
      window.peakModal.close();
    };

    return (
      <div style={{ width: '100%' }}>
        <ModalHeader
          eyebrow="Add new teacher · staff"
          title="Add a teacher"
          subtitle="Teacher will get login access to the classroom dashboard."
        />
        <div style={{ padding: '12px 26px', background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '12.5px', color: '#3B82F6', fontWeight: '600' }}>💼 Send 2-page Digital HR & Payroll Form to staff/teacher?</span>
          <button onClick={() => window.open(window.peakSchoolLink ? window.peakSchoolLink('join-staff') : '/prototypes/schools/peak-primary/staff-hr-form.html', '_blank')} style={{ background: '#3B82F6', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' }}>
            Open Digital Staff HR Form 🔗
          </button>
        </div>
        <div style={{ padding: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Full name" error={errors.name} span={2}>
            <TextInput value={name} onChange={v => { setName(v); setErrors(e => ({ ...e, name: null })); }} placeholder="Mrs. Sarah Namugga" />
          </Field>
          <Field label="Role · title" error={errors.role}>
            <TextInput value={role} onChange={v => { setRole(v); setErrors(e => ({ ...e, role: null })); }} placeholder="P5 Vigilant teacher" />
          </Field>
          <Field label="WhatsApp phone" error={errors.phone}>
            <TextInput value={phone} onChange={v => { setPhone(v); setErrors(e => ({ ...e, phone: null })); }} placeholder="+256 772 416 902" />
          </Field>
          <Field label="Subjects taught" hint="comma-separated" span={2}>
            <TextInput value={subjects} onChange={setSubjects} placeholder="Mathematics, Science" />
          </Field>
          <Field label="Streams" hint="select all that apply" span={2}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 0' }}>
              {D.streams.map(s => {
                const sel = streams.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggleStream(s.id)} style={{
                    padding: '6px 11px', borderRadius: 999,
                    border: '1px solid ' + (sel ? T.red : T.border),
                    background: sel ? T.redSft : 'transparent',
                    color: sel ? T.redInk : T.ink2,
                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: T.mono,
                  }}>{s.id}</button>
                );
              })}
            </div>
          </Field>
        </div>
        <ModalFooter>
          <SecondaryButton onClick={() => window.peakModal.close()}>Cancel</SecondaryButton>
          <PrimaryButton onClick={submit}>Add teacher →</PrimaryButton>
        </ModalFooter>
      </div>
    );
  }

  // ─── Record Payment ───────────────────────────────────────────────────────
  function RecordPayment({ store, defaultStudentId, defaultAmount, defaultMethod }) {
    const studs = (D && Array.isArray(D.students)) ? D.students : [];
    const owing = studs.filter(s => (s.balance || 0) > 0);
    const [studentId, setStudentId] = useState(defaultStudentId || (owing[0] && owing[0].id) || (studs[0] && studs[0].id));
    const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
    const [method, setMethod] = useState(defaultMethod || 'mtn');
    const [ref, setRef] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const student = studs.find(s => s.id === Number(studentId));
    const balance = student ? (student.balance || 0) : 0;

    const submit = async () => {
      if (saving) return;
      const amt = Number(amount.replace(/[^0-9]/g, ''));
      if (!amt || amt <= 0) { window.peakToast('Enter a payment amount', 'error'); return; }
      setSaving(true);

      // Write the REAL payment row first — this is what every balance figure
      // in the app (fees-balances, Reports, Parent dashboard, Head Teacher's
      // outstanding-fees total) actually reads from. store.recordPayment()
      // below only mutates this browser's in-memory D.students, which used
      // to be the ONLY thing that happened here: the bursar would see the
      // balance drop, but nothing was ever saved — a refresh (or anyone else
      // looking) showed the old, unpaid balance, because the fees table
      // itself was never touched. Fail loudly here rather than let that
      // silent desync happen again.
      const sess = window.NextSession || {};
      const sb = sess.sb;
      const tenantId = sess.profile && sess.profile.tenantId;
      if (!sb || !tenantId) {
        setSaving(false);
        window.peakToast('Not signed in — payment was NOT saved', 'error');
        return;
      }
      const { error: feeErr } = await sb.from('fees').insert({
        tenant_id: tenantId,
        student_id: Number(studentId),
        term: 'Term 2 2026',
        kind: 'payment',
        amount: -amt, // negative = payment, per the fees table's own convention
        channel: method,
        reference: ref || null,
      });
      if (feeErr) {
        setSaving(false);
        window.peakToast('Payment could NOT be saved to the database', 'error', feeErr.message);
        return; // Stop here — do not update local state or issue a receipt for a payment that isn't actually recorded.
      }

      // The real write succeeded — now safe to reflect it locally and issue the receipt.
      store.recordPayment({ studentId: Number(studentId), amount: amt, method, ref });
      const newBal = Math.max(0, balance - amt);
      try {
        const rec = await window.NextReceipts.issue({
          studentName: student ? student.name : null,
          guardianName: student ? student.guardian : null,
          guardianPhone: phone,
          amount: amt, method, reference: ref,
          balanceAfter: newBal, term: 'Term 2 2026',
        });
        setSaving(false);
        window.peakModal.close();
        window.peakModal.open(React.createElement(ReceiptResult, { rec }));
      } catch (e) {
        setSaving(false);
        window.peakModal.close();
        // The payment itself is safely in the database at this point — only the receipt row failed.
        window.peakToast('Payment saved — receipt not saved', 'warn', String((e && e.message) || e) + ' (run the receipts SQL?)');
      }
    };

    return (
      <div style={{ width: '100%' }}>
        <ModalHeader
          eyebrow="Record payment · bursar"
          title="Record a fee payment"
          subtitle="Receipt + WhatsApp confirmation sent to guardian automatically."
        />
        <div style={{ padding: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Student" span={2}>
            <Select value={studentId} onChange={setStudentId} options={studs.map(s => ({
              value: s.id, label: (s.name || '') + ' · ' + (s.stream || '') + ((s.balance || 0) > 0 ? ' · ' + (D.fmtUGXshort ? D.fmtUGXshort(s.balance) : s.balance) + ' due' : ' · paid'),
            }))} />
          </Field>
          {student && (
            <div style={{ gridColumn: 'span 2', background: T.surface2, borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.04em', fontWeight: 600 }}>CURRENT BALANCE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: balance > 0 ? T.redInk : T.good, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{D.fmtUGXshort(balance)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, fontWeight: 600 }}>GUARDIAN</div>
                <div style={{ fontSize: 13, color: T.ink, marginTop: 4 }}>{student.guardian}</div>
              </div>
            </div>
          )}
          <Field label="Amount" hint="UGX">
            <TextInput value={amount} onChange={setAmount} placeholder="280,000" />
          </Field>
          <Field label="Payment method">
            <Select value={method} onChange={setMethod} options={[
              { value: 'mtn',     label: 'MTN Mobile Money' },
              { value: 'airtel',  label: 'Airtel Money' },
              { value: 'stanbic', label: 'Stanbic bank deposit' },
              { value: 'cash',    label: 'Cash at bursar' },
              { value: 'cheque',  label: 'Cheque' },
            ]} />
          </Field>
          <Field label="Reference / receipt no." hint="optional" span={2}>
            <TextInput value={ref} onChange={setRef} placeholder="MTN TX 4F8K22A · or leave blank" />
          </Field>
          <Field label="Guardian WhatsApp" hint="for receipt · optional" span={2}>
            <TextInput value={phone} onChange={setPhone} placeholder="256772123456" />
          </Field>
        </div>
        <ModalFooter>
          <SecondaryButton onClick={() => window.peakModal.close()} disabled={saving}>Cancel</SecondaryButton>
          <PrimaryButton onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Record payment →'}</PrimaryButton>
        </ModalFooter>
      </div>
    );
  }

  // ─── Confirm dialog (generic) ─────────────────────────────────────────────
  function Confirm({ title, body, confirmLabel = 'Confirm', tone = 'red', onConfirm }) {
    return (
      <div style={{ width: '100%' }}>
        <ModalHeader eyebrow="Confirm" title={title} subtitle={body} />
        <ModalFooter>
          <SecondaryButton onClick={() => window.peakModal.close()}>Cancel</SecondaryButton>
          <PrimaryButton onClick={() => { onConfirm && onConfirm(); window.peakModal.close(); }}>{confirmLabel}</PrimaryButton>
        </ModalFooter>
      </div>
    );
  }

  function ReceiptResult({ rec }) {
    return (
      <div style={{ width: '100%' }}>
        <ModalHeader eyebrow={'Receipt ' + rec.receipt_no} title="Receipt issued ✓" subtitle={(window.NextReceipts ? window.NextReceipts.fmt(rec.amount) : rec.amount) + ' received' + (rec.student_name ? ' · ' + rec.student_name : '')} />
        <div style={{ padding: '6px 26px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton onClick={() => window.NextReceipts && window.NextReceipts.download(rec)}>⤓ Download PDF receipt</PrimaryButton>
          <SecondaryButton onClick={() => { if (rec.guardian_phone) { window.open(window.NextReceipts.whatsappUrl(rec), '_blank'); } else { window.peakToast('No guardian WhatsApp number on file', 'warn', 'Add one on the payment form to send.'); } }}>Send receipt on WhatsApp</SecondaryButton>
        </div>
        <ModalFooter><PrimaryButton onClick={() => window.peakModal.close()}>Done</PrimaryButton></ModalFooter>
      </div>
    );
  }

  function Receipts() {
    const [rows, setRows] = React.useState(null);
    React.useEffect(() => { (async () => { try { setRows(await window.NextReceipts.list()); } catch (e) { setRows([]); } })(); }, []);
    return (
      <div style={{ width: '100%' }}>
        <ModalHeader eyebrow="Bursar" title="Receipts" subtitle="Payment receipts issued for your school." />
        <div style={{ padding: '8px 22px', maxHeight: 440, overflow: 'auto' }}>
          {rows === null && <div style={{ color: '#9aa3c0', fontSize: 13, padding: '12px 0' }}>Loading…</div>}
          {rows && rows.length === 0 && <div style={{ color: '#9aa3c0', fontSize: 13, padding: '12px 0' }}>No receipts yet. Record a payment to issue one.</div>}
          {rows && rows.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#f5f6fa', fontWeight: 600 }}>{r.student_name || '—'} <span style={{ color: '#8b93b5', fontWeight: 400, fontFamily: 'monospace', fontSize: 11 }}>· {r.receipt_no}</span></div>
                <div style={{ fontSize: 11, color: '#9aa3c0' }}>{window.NextReceipts.fmt(r.amount)} · {new Date(r.issued_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => window.NextReceipts.download(r)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#f5f6fa', borderRadius: 8, padding: '6px 11px', fontSize: 12, cursor: 'pointer' }}>PDF</button>
              {r.guardian_phone && <button onClick={() => window.open(window.NextReceipts.whatsappUrl(r), '_blank')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#f5f6fa', borderRadius: 8, padding: '6px 11px', fontSize: 12, cursor: 'pointer' }}>WhatsApp</button>}
            </div>
          ))}
        </div>
        <ModalFooter><PrimaryButton onClick={() => window.peakModal.close()}>Close</PrimaryButton></ModalFooter>
      </div>
    );
  }

  function ImportStudents() {
    const prof = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile) ? window.PEAK_ROLE.getProfile() : { tenantId: 'peak-primary' };
    const tenantId = prof.tenantId || 'peak-primary';
    const [raw, setRaw] = useState('');
    const [parsed, setParsed] = useState(null); // { headers, rows }
    const [map, setMap] = useState({ name: -1, stream: -1, guardian: -1, phone: -1 });
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    function splitLine(line, delim) {
      const out = []; let cur = '', q = false;
      for (let i = 0; i < line.length; i++) { const c = line[i];
        if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (c === delim && !q) { out.push(cur); cur = ''; }
        else cur += c;
      }
      out.push(cur); return out.map(x => x.trim());
    }
    function guess(headers, keys) {
      for (let i = 0; i < headers.length; i++) { const h = (headers[i] || '').toLowerCase(); for (let k = 0; k < keys.length; k++) if (h.indexOf(keys[k]) >= 0) return i; }
      return -1;
    }
    function doParse(text) {
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '');
      if (!lines.length) { setParsed(null); return; }
      const delim = (lines[0].split('\t').length > lines[0].split(',').length) ? '\t' : ',';
      const all = lines.map(l => splitLine(l, delim));
      const headers = all[0], rows = all.slice(1);
      setParsed({ headers, rows });
      setMap({
        name: guess(headers, ['name', 'student', 'pupil', 'learner', 'full']),
        stream: guess(headers, ['stream', 'class', 'grade', 'level', 'form']),
        guardian: guess(headers, ['guardian', 'parent', 'mother', 'father', 'next of kin', 'contact name']),
        phone: guess(headers, ['phone', 'tel', 'mobile', 'whatsapp', 'msisdn', 'number', 'contact']),
      });
      setResult(null);
    }
    function onFile(e) { const fl = e.target.files && e.target.files[0]; if (!fl) return; const rd = new FileReader(); rd.onload = () => { setRaw(rd.result || ''); doParse(rd.result || ''); }; rd.readAsText(fl); }

    const students = parsed ? parsed.rows.map(r => ({
      name: map.name >= 0 ? (r[map.name] || '') : '',
      stream: map.stream >= 0 ? (r[map.stream] || '') : '',
      guardian_name: map.guardian >= 0 ? (r[map.guardian] || '') : '',
      guardian_phone: map.phone >= 0 ? (r[map.phone] || '') : '',
    })).filter(x => (x.name || '').trim()) : [];

    const colOpts = parsed ? [{ value: '-1', label: '— none —' }].concat(parsed.headers.map((h, i) => ({ value: String(i), label: h || ('Column ' + (i + 1)) }))) : [];
    const setCol = (k, v) => setMap(m => Object.assign({}, m, { [k]: parseInt(v, 10) }));

    const doImport = () => {
      if (!students.length) return;
      setBusy(true); setResult(null);
      const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
      fetch(WK + '/students/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenantId, students }) })
        .then(r => r.json()).then(res => {
          setBusy(false);
          if (res.error) { setResult({ err: res.error }); return; }
          if (window.peakStore && window.peakStore.loadStudents) window.peakStore.loadStudents(tenantId);
          window.peakToast((res.imported || 0) + ' students imported', 'success', (res.skipped ? res.skipped + ' duplicates skipped. ' : '') + 'They are live in the roster now.');
          window.peakModal.close();
        }).catch(e => { setBusy(false); setResult({ err: String((e && e.message) || e) }); });
    };

    return (
      <div style={{ width: '100%' }}>
        <ModalHeader eyebrow="Bulk import · students" title="Import students from a file" subtitle="Upload a CSV (in Excel: File → Save As → CSV) or paste rows. Nia maps the columns — you confirm." />
        <div style={{ padding: 24 }}>
          {!parsed && (
            <div>
              <div style={{ border: '1px dashed ' + T.borderStr, borderRadius: 12, padding: 22, textAlign: 'center', marginBottom: 14 }}>
                <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} style={{ fontSize: 13, color: T.ink2 }} />
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 8 }}>CSV or tab-separated. First row should be the column headers.</div>
              </div>
              <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, margin: '6px 0' }}>OR PASTE ROWS</div>
              <textarea value={raw} onChange={e => { setRaw(e.target.value); doParse(e.target.value); }} placeholder={'Name, Class, Guardian, Phone\nMirembe Nakato, P4V, Mrs. Sarah Nakato, +256772000111'} rows={6} style={{ width: '100%', background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: 12, fontSize: 12.5, color: T.ink, fontFamily: T.mono, outline: 'none' }} />
            </div>
          )}
          {parsed && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Field label="Name column"><Select value={String(map.name)} onChange={v => setCol('name', v)} options={colOpts} /></Field>
                <Field label="Class / stream column"><Select value={String(map.stream)} onChange={v => setCol('stream', v)} options={colOpts} /></Field>
                <Field label="Guardian column"><Select value={String(map.guardian)} onChange={v => setCol('guardian', v)} options={colOpts} /></Field>
                <Field label="Phone column"><Select value={String(map.phone)} onChange={v => setCol('phone', v)} options={colOpts} /></Field>
              </div>
              <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginBottom: 6 }}>PREVIEW · {students.length} students ready</div>
              <div style={{ border: '1px solid ' + T.border, borderRadius: 10, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ background: T.surface }}>{['Name', 'Stream', 'Guardian', 'Phone'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: T.ink3, fontFamily: T.mono, fontSize: 10.5, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {students.slice(0, 10).map((s, i) => (
                      <tr key={i} style={{ borderTop: '1px solid ' + T.border }}>
                        <td style={{ padding: '7px 10px', color: T.ink }}>{s.name || <span style={{ color: T.redInk }}>—</span>}</td>
                        <td style={{ padding: '7px 10px', color: T.ink2 }}>{s.stream || '—'}</td>
                        <td style={{ padding: '7px 10px', color: T.ink2 }}>{s.guardian_name || '—'}</td>
                        <td style={{ padding: '7px 10px', color: T.ink2 }}>{s.guardian_phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {students.length > 10 && <div style={{ fontSize: 11, color: T.ink3, marginTop: 6 }}>…and {students.length - 10} more.</div>}
              <div style={{ marginTop: 8 }}><span onClick={() => { setParsed(null); setRaw(''); }} style={{ fontSize: 12, color: T.ink3, cursor: 'pointer', textDecoration: 'underline' }}>Start over / use a different file</span></div>
            </div>
          )}
          {result && result.err && <div style={{ marginTop: 12, fontSize: 12.5, color: T.redInk }}>Import failed: {result.err}</div>}
        </div>
        <div style={{ padding: '0 24px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: T.ink3 }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: T.redSft, color: T.redInk, display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, fontWeight: 700 }}>AI</span>
          <span>Duplicates (same name + stream) are skipped automatically. Students go straight into this school's roster.</span>
        </div>
        <ModalFooter>
          <SecondaryButton onClick={() => window.peakModal.close()}>Cancel</SecondaryButton>
          <PrimaryButton onClick={doImport} disabled={busy || !students.length}>{busy ? 'Importing…' : (students.length ? ('Import ' + students.length + ' students →') : 'Import students →')}</PrimaryButton>
        </ModalFooter>
      </div>
    );
  }

  function NewAssignment() {
    const [title, setTitle] = useState('');
    const [stream, setStream] = useState((D.streams && D.streams[0] && D.streams[0].id) || 'P1V');
    const [subject, setSubject] = useState('');
    const [due, setDue] = useState('');
    const [details, setDetails] = useState('');
    const [err, setErr] = useState('');
    const submit = () => {
      if (!title.trim()) { setErr('Give the assignment a title.'); return; }
      window.peakSaveAssignment({ title: title.trim(), stream, subject: subject.trim(), due: due.trim(), details: details.trim() });
      window.peakToast && window.peakToast('Assignment created', 'success', title.trim() + ' - ' + stream + (due ? (' - due ' + due) : ''));
      window.peakModal.close();
    };
    return (
      <div style={{ width: '100%' }}>
        <ModalHeader eyebrow="New assignment" title="Set work for a class" subtitle="Saved to the class - guardians can be notified from Communications." />
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Title" error={err} span={2}><TextInput value={title} onChange={v => { setTitle(v); setErr(''); }} placeholder="e.g. Fractions worksheet 3" /></Field>
          <Field label="Class / stream"><Select value={stream} onChange={setStream} options={((D && D.streams) || []).map(s => ({ value: s.id, label: s.label || s.id }))} /></Field>
          <Field label="Subject"><TextInput value={subject} onChange={setSubject} placeholder="Mathematics" /></Field>
          <Field label="Due date" span={2}><TextInput value={due} onChange={setDue} placeholder="Friday 19 June" /></Field>
          <Field label="Instructions" span={2}><textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="What should the pupils do?" style={{ width: '100%', minHeight: 80, background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: 11, fontSize: 13, color: T.ink, fontFamily: T.font, outline: 'none' }} /></Field>
        </div>
        <ModalFooter>
          <SecondaryButton onClick={() => window.peakModal.close()}>Cancel</SecondaryButton>
          <PrimaryButton onClick={submit}>Create assignment</PrimaryButton>
        </ModalFooter>
      </div>
    );
  }

  function FeesImport() {
    const prof = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile) ? window.PEAK_ROLE.getProfile() : { tenantId: 'peak-primary' };
    const tenantId = prof.tenantId || 'peak-primary';
    const nowYear = new Date().getFullYear();
    const [term, setTerm] = useState('Term 2 ' + nowYear);
    const [raw, setRaw] = useState('');
    const [parsed, setParsed] = useState(null);
    const [map, setMap] = useState({ name: -1, stream: -1, charge: -1, paid: -1 });
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    function splitLine(line, delim) {
      const out = []; let cur = '', q = false;
      for (let i = 0; i < line.length; i++) { const c = line[i];
        if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (c === delim && !q) { out.push(cur); cur = ''; }
        else cur += c;
      }
      out.push(cur); return out.map(x => x.trim());
    }
    function guess(headers, keys) {
      for (let i = 0; i < headers.length; i++) { const h = (headers[i] || '').toLowerCase(); for (let k = 0; k < keys.length; k++) if (h.indexOf(keys[k]) >= 0) return i; }
      return -1;
    }
    function num(v) { return Math.round(Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')) || 0); }
    function doParse(text) {
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '');
      if (!lines.length) { setParsed(null); return; }
      const delim = (lines[0].split('\t').length > lines[0].split(',').length) ? '\t' : ',';
      const all = lines.map(l => splitLine(l, delim));
      const headers = all[0], rows = all.slice(1);
      setParsed({ headers, rows });
      setMap({
        name: guess(headers, ['name', 'student', 'pupil', 'learner', 'full']),
        stream: guess(headers, ['stream', 'class', 'grade', 'level', 'form']),
        charge: guess(headers, ['fee', 'charge', 'expected', 'billed', 'amount due', 'total fee', 'tuition']),
        paid: guess(headers, ['paid', 'payment', 'received', 'amount paid', 'deposit', 'cleared']),
      });
      setResult(null);
    }
    function onFile(e) { const fl = e.target.files && e.target.files[0]; if (!fl) return; const rd = new FileReader(); rd.onload = () => { setRaw(rd.result || ''); doParse(rd.result || ''); }; rd.readAsText(fl); }

    const recs = parsed ? parsed.rows.map(r => ({
      name: map.name >= 0 ? (r[map.name] || '') : '',
      stream: map.stream >= 0 ? (r[map.stream] || '') : '',
      charge: map.charge >= 0 ? num(r[map.charge]) : 0,
      paid: map.paid >= 0 ? num(r[map.paid]) : 0,
    })).filter(x => (x.name || '').trim()) : [];
    const totCharge = recs.reduce((a, x) => a + (x.charge || 0), 0);
    const totPaid = recs.reduce((a, x) => a + (x.paid || 0), 0);
    const fmt = (n) => 'UGX ' + (n || 0).toLocaleString();

    const colOpts = parsed ? [{ value: '-1', label: '— none —' }].concat(parsed.headers.map((h, i) => ({ value: String(i), label: h || ('Column ' + (i + 1)) }))) : [];
    const setCol = (k, v) => setMap(m => Object.assign({}, m, { [k]: parseInt(v, 10) }));

    const doImport = () => {
      if (!recs.length) return;
      setBusy(true); setResult(null);
      const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
      fetch(WK + '/fees/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenantId, term: term.trim() || 'Term', rows: recs }) })
        .then(async r => { const txt = await r.text(); try { return JSON.parse(txt); } catch (e) { return { error: r.status === 404 ? 'Fees import is not switched on yet — the worker needs the latest update (paste sentinel-worker.js in Cloudflare and Deploy).' : ('Server returned an unexpected response (' + r.status + ').') }; } })
        .then(res => {
          res = res || {};
          setBusy(false);
          if (res.error) { setResult({ err: res.error }); return; }
          if (!res.imported) { setResult({ err: res.message || 'No fees matched a student. Import students first, or check the name spelling.' }); return; }
          if (window.peakStore && window.peakStore.loadStudents) window.peakStore.loadStudents(tenantId);
          const un = (res.unmatched || []).length;
          window.peakToast((res.students || 0) + ' students\' fees imported', 'success', (un ? un + ' names did not match a student (skipped). ' : '') + 'Balances are live now.');
          window.peakModal.close();
        }).catch(e => { setBusy(false); setResult({ err: String((e && e.message) || e) }); });
    };

    return (
      <div style={{ width: '100%' }}>
        <ModalHeader eyebrow="Bulk import · fees" title="Import the fees ledger" subtitle="One row per student: the term fee and how much they have paid. Balance = fee − paid, computed for you." />
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <Field label="Which term is this for?"><TextInput value={term} onChange={setTerm} placeholder="Term 2 2026" /></Field>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 5 }}>Re-importing the same term replaces those students' figures — safe to fix and re-upload.</div>
          </div>
          {!parsed && (
            <div>
              <div style={{ border: '1px dashed ' + T.borderStr, borderRadius: 12, padding: 22, textAlign: 'center', marginBottom: 14 }}>
                <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} style={{ fontSize: 13, color: T.ink2 }} />
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 8 }}>CSV from Excel (File → Save As → CSV). First row = column headers.</div>
              </div>
              <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, margin: '6px 0' }}>OR PASTE ROWS</div>
              <textarea value={raw} onChange={e => { setRaw(e.target.value); doParse(e.target.value); }} placeholder={'Name, Class, Term Fee, Amount Paid\nMirembe Nakato, P4V, 850000, 600000'} rows={6} style={{ width: '100%', background: T.bg, border: '1px solid ' + T.border, borderRadius: 9, padding: 12, fontSize: 12.5, color: T.ink, fontFamily: T.mono, outline: 'none' }} />
            </div>
          )}
          {parsed && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Field label="Student name column"><Select value={String(map.name)} onChange={v => setCol('name', v)} options={colOpts} /></Field>
                <Field label="Class / stream column"><Select value={String(map.stream)} onChange={v => setCol('stream', v)} options={colOpts} /></Field>
                <Field label="Term fee column"><Select value={String(map.charge)} onChange={v => setCol('charge', v)} options={colOpts} /></Field>
                <Field label="Amount paid column"><Select value={String(map.paid)} onChange={v => setCol('paid', v)} options={colOpts} /></Field>
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 12, color: T.ink3 }}>
                <span>Charged: <strong style={{ color: T.ink }}>{fmt(totCharge)}</strong></span>
                <span>Paid: <strong style={{ color: T.good }}>{fmt(totPaid)}</strong></span>
                <span>Outstanding: <strong style={{ color: (totCharge - totPaid) > 0 ? T.warn : T.good }}>{fmt(totCharge - totPaid)}</strong></span>
              </div>
              <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginBottom: 6 }}>PREVIEW · {recs.length} students</div>
              <div style={{ border: '1px solid ' + T.border, borderRadius: 10, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ background: T.surface }}>{['Name', 'Class', 'Term fee', 'Paid', 'Balance'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: T.ink3, fontFamily: T.mono, fontSize: 10.5, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {recs.slice(0, 10).map((s, i) => { const bal = (s.charge || 0) - (s.paid || 0); return (
                      <tr key={i} style={{ borderTop: '1px solid ' + T.border }}>
                        <td style={{ padding: '7px 10px', color: T.ink }}>{s.name || <span style={{ color: T.redInk }}>—</span>}</td>
                        <td style={{ padding: '7px 10px', color: T.ink2 }}>{s.stream || '—'}</td>
                        <td style={{ padding: '7px 10px', color: T.ink2 }}>{(s.charge || 0).toLocaleString()}</td>
                        <td style={{ padding: '7px 10px', color: T.good }}>{(s.paid || 0).toLocaleString()}</td>
                        <td style={{ padding: '7px 10px', color: bal > 0 ? T.warn : T.good }}>{bal.toLocaleString()}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
              {recs.length > 10 && <div style={{ fontSize: 11, color: T.ink3, marginTop: 6 }}>…and {recs.length - 10} more.</div>}
              <div style={{ marginTop: 8 }}><span onClick={() => { setParsed(null); setRaw(''); }} style={{ fontSize: 12, color: T.ink3, cursor: 'pointer', textDecoration: 'underline' }}>Start over / use a different file</span></div>
            </div>
          )}
          {result && result.err && <div style={{ marginTop: 12, fontSize: 12.5, color: T.redInk }}>Import failed: {result.err}</div>}
        </div>
        <div style={{ padding: '0 24px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: T.ink3 }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: T.redSft, color: T.redInk, display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, fontWeight: 700 }}>AI</span>
          <span>Each student is matched by name (and class, if given). Import your students first so the fees attach to them.</span>
        </div>
        <ModalFooter>
          <SecondaryButton onClick={() => window.peakModal.close()}>Cancel</SecondaryButton>
          <PrimaryButton onClick={doImport} disabled={busy || !recs.length}>{busy ? 'Importing…' : (recs.length ? ('Import ' + recs.length + ' fee records →') : 'Import fees →')}</PrimaryButton>
        </ModalFooter>
      </div>
    );
  }

export { AddStudent, AddTeacher, RecordPayment, Confirm, ReceiptResult, Receipts, ImportStudents, FeesImport, NewAssignment };
