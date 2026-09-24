/* NEXT OS Communications: authenticated form management and client responses. */

/* ─── tiny helpers ─── */
const cfUid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* Supabase helpers */
const getSb = () => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  const check = () => {
    const sb = window.OS_DATA?.getSupabaseClient ? window.OS_DATA.getSupabaseClient() : null;
    if (sb) return resolve(sb);
    if (Date.now() - startedAt >= 15000) {
      return reject(new Error('Supabase did not initialize. Check the network connection and reload NEXT OS.'));
    }
    setTimeout(check, 100);
  };
  check();
});

async function cfLoadForms() {
  const sb = await getSb();
  const [formsResult, responsesResult] = await Promise.all([
    sb.from('os_forms').select('*').order('created_at', { ascending: false }),
    sb.from('os_form_responses').select('*').order('submitted_at', { ascending: false })
  ]);

  if (formsResult.error) throw new Error(`Could not load client forms: ${formsResult.error.message}`);
  if (responsesResult.error) throw new Error(`Could not load client responses. Sign in with an authorized NEXT OS account: ${responsesResult.error.message}`);

  const forms = formsResult.data || [];
  const responses = responsesResult.data || [];
  return forms.map(f => ({
    ...f,
    created: f.created_at,
    responses: (responses || []).filter(r => r.form_id === f.id).map(r => ({
      id: r.id,
      answers: r.answers,
      submittedAt: r.submitted_at,
      seen: r.seen
    }))
  }));
}

async function cfSaveForm(form) {
  const sb = await getSb();
  const { id, title, description, fields, status } = form;
  let result;
  if (id.startsWith('draft-')) {
    result = await sb.from('os_forms').insert({ title, description, fields, status });
  } else {
    result = await sb.from('os_forms').update({ title, description, fields, status }).eq('id', id);
  }
  if (result.error) throw new Error(`Could not save the form: ${result.error.message}`);
}

async function cfDeleteForm(id) {
  const sb = await getSb();
  const { error } = await sb.from('os_forms').delete().eq('id', id);
  if (error) throw new Error(`Could not delete the form: ${error.message}`);
}

async function cfMarkSeen(responseId) {
  const sb = await getSb();
  const { error } = await sb.from('os_form_responses').update({ seen: true }).eq('id', responseId);
  if (error) throw new Error(`Could not mark the response as read: ${error.message}`);
}

const CF_RUNTIME = window.__NEXT_OS_FORMS_RUNTIME || (window.__NEXT_OS_FORMS_RUNTIME = {
  channel: null,
  pollTimer: null,
  starting: false,
  baselineReady: false,
  baselineIds: new Set(),
  notifiedIds: new Set(),
  status: 'CLOSED',
  authSubscription: null,
});

function cfClientName(form, response) {
  const fields = form?.fields || [];
  const nameField = fields.find(field => /\bname\b/i.test(field.label || ''));
  const value = nameField && response?.answers?.[nameField.id];
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}

function cfDispatchChange(detail) {
  window.dispatchEvent(new CustomEvent('nextos:forms-changed', { detail: detail || {} }));
}

function cfAnnounceResponse(response, form) {
  if (!response?.id || CF_RUNTIME.notifiedIds.has(response.id)) return;
  CF_RUNTIME.notifiedIds.add(response.id);
  const name = cfClientName(form, response);
  const formTitle = form?.title || 'Client form';
  const message = `${name || 'A client'} submitted “${formTitle}”.`;
  cfDispatchChange({ type: 'response', responseId: response.id, formTitle, clientName: name });
  if (window.NEXT_OS?.notify) {
    window.NEXT_OS.notify({
      severity: 'success',
      title: 'New client form response',
      body: message,
      source: 'Communications',
      actionUrl: 'os://comms',
      actionLabel: 'View response',
      dedupeKey: `client-form-response:${response.id}`,
    });
  }
}

async function cfRefreshRuntime() {
  const forms = await cfLoadForms();
  if (CF_RUNTIME.baselineReady) {
    forms.forEach(form => (form.responses || []).forEach(response => {
      if (!CF_RUNTIME.baselineIds.has(response.id)) cfAnnounceResponse(response, form);
    }));
  }
  forms.forEach(form => (form.responses || []).forEach(response => CF_RUNTIME.baselineIds.add(response.id)));
  CF_RUNTIME.baselineReady = true;
  cfDispatchChange({ type: 'refresh' });
  return forms;
}

function cfStopRealtime(sb) {
  if (CF_RUNTIME.pollTimer) clearInterval(CF_RUNTIME.pollTimer);
  CF_RUNTIME.pollTimer = null;
  if (CF_RUNTIME.channel && sb) sb.removeChannel(CF_RUNTIME.channel);
  CF_RUNTIME.channel = null;
  CF_RUNTIME.starting = false;
  CF_RUNTIME.baselineReady = false;
  CF_RUNTIME.baselineIds.clear();
  CF_RUNTIME.notifiedIds.clear();
  CF_RUNTIME.status = 'CLOSED';
}

async function cfStartRealtime(sb) {
  if (CF_RUNTIME.channel || CF_RUNTIME.starting) return;
  CF_RUNTIME.starting = true;
  try {
    await cfRefreshRuntime();
    CF_RUNTIME.pollTimer = setInterval(() => {
      cfRefreshRuntime().catch(error => console.warn('[NEXT OS] Communications refresh failed:', error));
    }, 15000);
    CF_RUNTIME.channel = sb.channel('os_forms_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'os_forms' }, () => {
        cfRefreshRuntime().catch(error => console.warn('[NEXT OS] Form refresh failed:', error));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'os_form_responses' }, async payload => {
        try {
          const forms = await cfRefreshRuntime();
          const form = forms.find(item => item.id === payload.new?.form_id);
          const response = (form?.responses || []).find(item => item.id === payload.new?.id) || payload.new;
          cfAnnounceResponse(response, form);
        } catch (error) {
          console.warn('[NEXT OS] Could not refresh after a client response:', error);
        }
      })
      .subscribe(status => {
        CF_RUNTIME.status = status;
        cfDispatchChange({ type: 'connection', status });
      });
  } catch (error) {
    CF_RUNTIME.starting = false;
    throw error;
  }
  CF_RUNTIME.starting = false;
}

// Keep response notifications active while the app is open, even off the
// Communications route. Client submissions remain public; admin reads do not.
getSb().then(async sb => {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  if (data.session) cfStartRealtime(sb);
  if (!CF_RUNTIME.authSubscription) {
    const { data: authState } = sb.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (session) cfStartRealtime(sb).catch(error => console.warn('[NEXT OS] Communications realtime unavailable:', error));
        else cfStopRealtime(sb);
      }, 0);
    });
    CF_RUNTIME.authSubscription = authState.subscription;
  }
}).catch(error => console.warn('[NEXT OS] Communications background listener unavailable:', error));

/* ─── field type configs ─── */
const FIELD_TYPES = [
  { type: 'text',     label: 'Short Text',   icon: '✏️' },
  { type: 'textarea', label: 'Long Text',    icon: '📝' },
  { type: 'email',    label: 'Email',        icon: '📧' },
  { type: 'phone',    label: 'Phone',        icon: '📱' },
  { type: 'number',   label: 'Number',       icon: '🔢' },
  { type: 'select',   label: 'Dropdown',     icon: '▾' },
  { type: 'radio',    label: 'Choice',       icon: '⊙' },
  { type: 'date',     label: 'Date',         icon: '📅' },
];

/* ─── colours ─── */
const C = {
  mint:        'var(--mint)',
  mintGlow:    'var(--mint-glow)',
  elevated:    'var(--bg-elevated)',
  surface:     'var(--bg-surface)',
  border:      'var(--border-subtle)',
  borderDef:   'var(--border-default)',
  textPrim:    'var(--text-primary)',
  textSec:     'var(--text-secondary)',
  textTer:     'var(--text-tertiary)',
  danger:      'var(--danger)',
  gold:        'var(--gold)',
  info:        'var(--info)',
};

/* ─── status badge ─── */
const StatusBadge = ({ status }) => {
  const map = {
    draft:    { color: C.textTer,  bg: 'rgba(255,255,255,0.06)', label: 'Draft' },
    active:   { color: C.mint,     bg: 'rgba(0,252,143,0.12)',   label: 'Active' },
    closed:   { color: C.gold,     bg: 'rgba(255,180,0,0.1)',    label: 'Closed' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{
      fontSize: 11, fontFamily: 'var(--font-mono)',
      color: s.color, background: s.bg,
      padding: '2px 8px', borderRadius: 999, fontWeight: 500,
    }}>
      {s.label}
    </span>
  );
};

/* ─── field editor row ─── */
const FieldEditor = ({ field, index, total, onChange, onRemove, onMove }) => {
  const [open, setOpen] = React.useState(false);

  const s = {
    wrap: {
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 10, marginBottom: 8,
      overflow: 'hidden',
    },
    header: {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', cursor: 'pointer',
    },
    drag: {
      color: C.textTer, fontSize: 16, cursor: 'grab', userSelect: 'none',
    },
    label: {
      flex: 1, fontSize: 13, fontWeight: 500, color: C.textPrim,
    },
    typeTag: {
      fontSize: 10, fontFamily: 'var(--font-mono)',
      color: C.textTer,
      padding: '2px 6px', borderRadius: 4,
      background: 'rgba(255,255,255,0.06)',
    },
    body: {
      padding: '0 14px 14px',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
    },
    inp: {
      width: '100%', background: C.elevated,
      border: `1px solid ${C.border}`, borderRadius: 7,
      color: C.textPrim, fontFamily: 'var(--font-body)',
      fontSize: 13, padding: '7px 10px', outline: 'none',
    },
    fullRow: { gridColumn: '1 / -1' },
    lbl: { fontSize: 11, color: C.textTer, marginBottom: 4, display: 'block' },
    iconBtn: {
      background: 'none', border: 'none', cursor: 'pointer',
      color: C.textTer, fontSize: 14, padding: '4px 6px', borderRadius: 5,
    },
  };

  return (
    <div style={s.wrap}>
      <div style={s.header} onClick={() => setOpen(o => !o)}>
        <span style={s.drag}>⠿</span>
        <span style={s.label}>{field.label || <em style={{ color: C.textTer }}>Untitled field</em>}</span>
        <span style={s.typeTag}>{field.type}</span>
        {field.required && <span style={{ ...s.typeTag, color: C.danger }}>required</span>}
        <button style={s.iconBtn} onClick={e => { e.stopPropagation(); onMove(index, -1); }} disabled={index === 0} title="Move up">▲</button>
        <button style={s.iconBtn} onClick={e => { e.stopPropagation(); onMove(index, 1); }} disabled={index === total - 1} title="Move down">▼</button>
        <button style={{ ...s.iconBtn, color: C.danger }} onClick={e => { e.stopPropagation(); onRemove(index); }} title="Remove">✕</button>
        <span style={{ color: C.textTer, fontSize: 12 }}>{open ? '▾' : '▸'}</span>
      </div>

      {open && (
        <div style={s.body}>
          <div>
            <span style={s.lbl}>Field label *</span>
            <input style={s.inp} value={field.label} onChange={e => onChange(index, 'label', e.target.value)} placeholder="e.g. Company Name" />
          </div>
          <div>
            <span style={s.lbl}>Field type</span>
            <select style={s.inp} value={field.type} onChange={e => onChange(index, 'type', e.target.value)}>
              {FIELD_TYPES.map(ft => <option key={ft.type} value={ft.type}>{ft.icon} {ft.label}</option>)}
            </select>
          </div>
          <div>
            <span style={s.lbl}>Placeholder text</span>
            <input style={s.inp} value={field.placeholder || ''} onChange={e => onChange(index, 'placeholder', e.target.value)} placeholder="Hint shown to client" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
            <input type="checkbox" id={`req-${field.id}`} checked={!!field.required} onChange={e => onChange(index, 'required', e.target.checked)} style={{ accentColor: C.mint }} />
            <label htmlFor={`req-${field.id}`} style={{ fontSize: 13, color: C.textSec, cursor: 'pointer' }}>Required</label>
          </div>
          {(field.type === 'select' || field.type === 'radio') && (
            <div style={s.fullRow}>
              <span style={s.lbl}>Options (one per line)</span>
              <textarea
                style={{ ...s.inp, minHeight: 80, resize: 'vertical' }}
                value={(field.options || []).join('\n')}
                onChange={e => onChange(index, 'options', e.target.value.split('\n'))}
                placeholder={"Option A\nOption B\nOption C"}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Form Builder modal ─── */
const FormBuilder = ({ form, onSave, onCancel }) => {
  const [draft, setDraft] = React.useState(() => form || {
    id: 'draft-' + cfUid(), title: '', description: '', fields: [], status: 'draft',
    created: new Date().toISOString(), responses: [],
  });

  const updateDraft = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const addField = (type) => {
    const f = { id: cfUid(), type, label: '', placeholder: '', required: false };
    setDraft(d => ({ ...d, fields: [...d.fields, f] }));
  };
  const updateField = (idx, k, v) => {
    setDraft(d => {
      const fields = [...d.fields];
      fields[idx] = { ...fields[idx], [k]: v };
      return { ...d, fields };
    });
  };
  const removeField = (idx) => setDraft(d => ({ ...d, fields: d.fields.filter((_, i) => i !== idx) }));
  const moveField = (idx, dir) => {
    setDraft(d => {
      const fields = [...d.fields];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= fields.length) return d;
      [fields[idx], fields[newIdx]] = [fields[newIdx], fields[idx]];
      return { ...d, fields };
    });
  };

  const s = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(6,0,18,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', overflowY: 'auto',
    },
    modal: {
      background: C.elevated, border: `1px solid ${C.borderDef}`,
      borderRadius: 16, width: '100%', maxWidth: 680,
      boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
    },
    header: {
      padding: '24px 28px 16px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    title: { fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' },
    body: { padding: 28 },
    inp: {
      width: '100%', background: C.surface,
      border: `1px solid ${C.border}`, borderRadius: 8,
      color: C.textPrim, fontFamily: 'var(--font-body)',
      fontSize: 14, padding: '9px 12px', outline: 'none',
      marginBottom: 14,
    },
    lbl: { fontSize: 12, color: C.textTer, display: 'block', marginBottom: 5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' },
    section: { fontSize: 13, fontWeight: 600, color: C.mint, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12, marginTop: 24 },
    fieldTypes: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    typeBtn: {
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
      fontSize: 12, color: C.textSec,
      display: 'flex', alignItems: 'center', gap: 5,
      transition: 'all 0.15s',
    },
    footer: {
      padding: '16px 28px', borderTop: `1px solid ${C.border}`,
      display: 'flex', gap: 10, justifyContent: 'flex-end',
    },
    btnPrimary: {
      background: C.mint, color: '#060012', fontWeight: 700,
      border: 'none', borderRadius: 8, padding: '10px 24px',
      cursor: 'pointer', fontSize: 14,
    },
    btnSecondary: {
      background: 'transparent', color: C.textSec,
      border: `1px solid ${C.border}`, borderRadius: 8,
      padding: '10px 24px', cursor: 'pointer', fontSize: 14,
    },
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>{form ? 'Edit Form' : 'New Client Form'}</span>
          <button style={{ background: 'none', border: 'none', color: C.textTer, fontSize: 20, cursor: 'pointer' }} onClick={onCancel}>✕</button>
        </div>
        <div style={s.body}>
          <label style={s.lbl}>Form title *</label>
          <input style={s.inp} value={draft.title} onChange={e => updateDraft('title', e.target.value)} placeholder="e.g. Client Onboarding — NEXT Schools OS" />

          <label style={s.lbl}>Description (shown to client)</label>
          <textarea style={{ ...s.inp, minHeight: 70, resize: 'vertical' }} value={draft.description} onChange={e => updateDraft('description', e.target.value)} placeholder="Tell the client what this form is for and how long it takes." />

          <div style={s.section}>Fields</div>

          {draft.fields.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: C.textTer, fontSize: 13 }}>
              No fields yet. Add a field type below.
            </div>
          )}

          {draft.fields.map((f, i) => (
            <FieldEditor
              key={f.id} field={f} index={i} total={draft.fields.length}
              onChange={updateField} onRemove={removeField} onMove={moveField}
            />
          ))}

          <div style={s.fieldTypes}>
            {FIELD_TYPES.map(ft => (
              <button key={ft.type} style={s.typeBtn} onClick={() => addField(ft.type)}>
                {ft.icon} {ft.label}
              </button>
            ))}
          </div>
        </div>
        <div style={s.footer}>
          <button style={s.btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={s.btnPrimary} onClick={() => {
            if (!draft.title.trim()) { alert('Please give the form a title.'); return; }
            if (draft.fields.length === 0) { alert('Add at least one field.'); return; }
            onSave(draft);
          }}>
            {form ? 'Save Changes' : 'Create Form'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Share link panel ─── */
const ShareModal = ({ form, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  // Build a shareable URL — client-form.html with form ID in query string
  const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'client-form.html';
  const shareUrl = `${baseUrl}?id=${form.id}`;

  const copy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const s = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1001,
      background: 'rgba(6,0,18,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    },
    modal: {
      background: C.elevated, border: `1px solid ${C.borderDef}`,
      borderRadius: 16, maxWidth: 560, width: '100%',
      boxShadow: '0 24px 80px rgba(0,0,0,0.6)', padding: 32,
    },
    urlBox: {
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '12px 16px',
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: C.textSec, wordBreak: 'break-all',
      userSelect: 'all', marginTop: 12, marginBottom: 20,
    },
    copyBtn: {
      width: '100%', background: copied ? 'rgba(0,252,143,0.15)' : C.mint,
      color: copied ? C.mint : '#060012',
      border: copied ? `1px solid ${C.mint}` : 'none',
      borderRadius: 10, padding: '12px', cursor: 'pointer',
      fontWeight: 700, fontSize: 14,
    },
    note: { fontSize: 12, color: C.textTer, textAlign: 'center', marginTop: 12 },
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Share Form</div>
            <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>{form.title}</div>
          </div>
          <button style={{ background: 'none', border: 'none', color: C.textTer, fontSize: 20, cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6 }}>
          Share this link with your client. When they fill in the form, their response appears directly in this panel.
        </div>
        <div style={s.urlBox}>{shareUrl}</div>
        <button style={s.copyBtn} onClick={copy}>
          {copied ? '✓ Copied to clipboard!' : '⎘ Copy shareable link'}
        </button>
        <div style={s.note}>
          The client can open this link without signing in. Their response is saved to the shared database and appears in Communications.
        </div>
      </div>
    </div>
  );
};

/* ─── Response viewer modal ─── */
const ResponsesModal = ({ form, onClose }) => {
  const s = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1001,
      background: 'rgba(6,0,18,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', overflowY: 'auto',
    },
    modal: {
      background: C.elevated, border: `1px solid ${C.borderDef}`,
      borderRadius: 16, maxWidth: 680, width: '100%',
      boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
    },
    header: {
      padding: '24px 28px', borderBottom: `1px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    body: { padding: 28 },
    responseCard: {
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '18px 20px', marginBottom: 14,
    },
    answerRow: {
      marginBottom: 14,
    },
    qLabel: { fontSize: 11, fontWeight: 600, color: C.textTer, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
    aValue: { fontSize: 14, color: C.textPrim, lineHeight: 1.5 },
    timestamp: { fontSize: 11, fontFamily: 'var(--font-mono)', color: C.textTer, marginBottom: 14 },
  };

  const responses = form.responses || [];

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
              Responses — {form.title}
            </div>
            <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>
              {responses.length} response{responses.length !== 1 ? 's' : ''} received
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', color: C.textTer, fontSize: 20, cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        <div style={s.body}>
          {responses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.textTer, fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              No responses yet. Share the form link with your client.
            </div>
          ) : [...responses].reverse().map((resp, i) => (
            <div key={resp.id || i} style={s.responseCard}>
              <div style={s.timestamp}>Submitted {new Date(resp.submittedAt).toLocaleString()}</div>
              {form.fields.map(field => (
                <div key={field.id} style={s.answerRow}>
                  <div style={s.qLabel}>{field.label}</div>
                  <div style={s.aValue}>{resp.answers?.[field.id] || <em style={{ color: C.textTer }}>—</em>}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Form card ─── */
const FormCard = ({ form, onEdit, onShare, onViewResponses, onDelete, onToggleStatus }) => {
  const respCount = (form.responses || []).length;
  const hasNew = (form.responses || []).some(r => !r.seen);

  const s = {
    card: {
      background: C.elevated,
      border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '20px 22px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
      transition: 'border-color 0.2s',
      cursor: 'default',
    },
    icon: {
      width: 44, height: 44, borderRadius: 10,
      background: 'rgba(0,252,143,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, flexShrink: 0,
    },
    title: { fontWeight: 600, fontSize: 15, color: C.textPrim, marginBottom: 4 },
    desc: { fontSize: 12, color: C.textTer, lineHeight: 1.5, marginBottom: 10 },
    meta: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
    metaItem: { fontSize: 11, fontFamily: 'var(--font-mono)', color: C.textTer },
    actionRow: {
      display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap',
    },
    btn: (accent) => ({
      background: accent ? 'rgba(0,252,143,0.1)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${accent ? 'rgba(0,252,143,0.3)' : C.border}`,
      color: accent ? C.mint : C.textSec,
      borderRadius: 7, padding: '6px 12px', cursor: 'pointer',
      fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5,
    }),
    responsesPill: {
      display: 'flex', alignItems: 'center', gap: 6,
      background: hasNew ? 'rgba(0,252,143,0.12)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${hasNew ? 'rgba(0,252,143,0.3)' : C.border}`,
      borderRadius: 7, padding: '6px 12px', cursor: 'pointer',
      fontSize: 12, fontWeight: 500,
      color: hasNew ? C.mint : C.textSec,
    },
  };

  return (
    <div style={s.card} className="project-card">
      <div style={s.icon}>📋</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={s.title}>{form.title}</div>
          <StatusBadge status={form.status} />
        </div>
        {form.description && <div style={s.desc}>{form.description}</div>}
        <div style={s.meta}>
          <span style={s.metaItem}>{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</span>
          <span style={s.metaItem}>Created {new Date(form.created).toLocaleDateString()}</span>
        </div>
        <div style={s.actionRow}>
          <button style={s.responsesPill} onClick={() => onViewResponses(form)}>
            {hasNew && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.mint, display: 'inline-block' }} />}
            📥 {respCount} response{respCount !== 1 ? 's' : ''}
          </button>
          {form.status !== 'closed' && (
            <button style={s.btn(true)} onClick={() => onShare(form)}>🔗 Share Link</button>
          )}
          <button style={s.btn(false)} onClick={() => onEdit(form)}>✏️ Edit</button>
          <button style={s.btn(false)} onClick={() => onToggleStatus(form)}>
            {form.status === 'active' ? '🔒 Close' : '▶ Activate'}
          </button>
          <button style={{ ...s.btn(false), color: C.danger, borderColor: 'rgba(255,71,87,0.2)' }} onClick={() => onDelete(form.id)}>🗑</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Activity feed entry ─── */
const ActivityEntry = ({ item }) => (
  <div style={{
    display: 'flex', gap: 12, padding: '10px 0',
    borderBottom: `1px solid ${C.border}`,
  }}>
    <span style={{ fontSize: 18 }}>{item.icon}</span>
    <div>
      <div style={{ fontSize: 13, color: C.textSec }}>{item.text}</div>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: C.textTer, marginTop: 2 }}>
        {new Date(item.ts).toLocaleString()}
      </div>
    </div>
  </div>
);

/* ─── Main Forms Page ─── */
const CommsPage = ({ onNavigate }) => {
  const [forms, setForms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [session, setSession] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [authBusy, setAuthBusy] = React.useState(false);
  const [liveStatus, setLiveStatus] = React.useState(CF_RUNTIME.status);
  const [building, setBuilding] = React.useState(null);    // null | 'new' | form object (edit)
  const [sharing, setSharing] = React.useState(null);      // form to share
  const [viewing, setViewing] = React.useState(null);      // form whose responses to view
  const [activity, setActivity] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');

  const loadData = async () => {
    try {
      const data = await cfLoadForms();
      setForms(data);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Could not load client forms and responses.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    let active = true;
    let authSubscription;
    (async () => {
      const sb = await getSb();
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
      if (data.session) cfStartRealtime(sb).catch(error => setLoadError(error.message));

      const { data: authState } = sb.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setAuthError('');
        setTimeout(() => {
          if (nextSession) cfStartRealtime(sb).catch(error => setLoadError(error.message));
          else cfStopRealtime(sb);
        }, 0);
      });
      authSubscription = authState.subscription;
    })().catch(error => {
      if (!active) return;
      setAuthError(error.message || 'Could not connect to Supabase authentication.');
      setAuthLoading(false);
      setLoading(false);
    });

    const onFormsChanged = event => {
      const detail = event.detail || {};
      if (detail.type === 'connection') setLiveStatus(detail.status);
      if (detail.type === 'response') {
        const who = detail.clientName ? `${detail.clientName} submitted` : 'A client submitted';
        setActivity(items => [{
          id: detail.responseId,
          icon: '📥', ts: new Date().toISOString(),
          text: `${who} “${detail.formTitle || 'a form'}”.`,
        }, ...items.filter(item => item.id !== detail.responseId)].slice(0, 20));
      }
      if (detail.type === 'response' || detail.type === 'refresh') loadData();
    };
    window.addEventListener('nextos:forms-changed', onFormsChanged);
    return () => {
      active = false;
      window.removeEventListener('nextos:forms-changed', onFormsChanged);
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (session) loadData();
    else setLoading(false);
  }, [session]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const sb = await getSb();
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setSession(data.session);
      setPassword('');
      cfStartRealtime(sb).catch(error => setLoadError(error.message));
    } catch (error) {
      setAuthError(error.message || 'Sign-in failed. Check your email and password.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const sb = await getSb();
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      setSession(null);
    } catch (error) {
      setLoadError(error.message || 'Could not sign out.');
    }
  };

  const handleSave = async (draft) => {
    try {
      await cfSaveForm(draft);
      if (draft.id.startsWith('draft-')) {
        setActivity(a => [{ icon: '🆕', ts: new Date().toISOString(), text: `Form created: "${draft.title}"` }, ...a].slice(0, 20));
      }
      await loadData();
      setBuilding(null);
    } catch (error) {
      setLoadError(error.message || 'Could not save the form.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this form and all its responses?')) return;
    try { await cfDeleteForm(id); await loadData(); }
    catch (error) { setLoadError(error.message || 'Could not delete the form.'); }
  };

  const handleToggleStatus = async (form) => {
    const next = form.status === 'active' ? 'closed' : 'active';
    try {
      await cfSaveForm({ ...form, status: next });
      setActivity(a => [{ icon: next === 'active' ? '▶' : '🔒', ts: new Date().toISOString(), text: `"${form.title}" ${next === 'active' ? 'activated' : 'closed'}` }, ...a].slice(0, 20));
      await loadData();
    } catch (error) { setLoadError(error.message || 'Could not update the form status.'); }
  };

  const handleViewResponses = async (form) => {
    // Mark all responses as seen in the DB
    const unread = (form.responses || []).filter(r => !r.seen);
    if (unread.length > 0) {
      try {
        await Promise.all(unread.map(r => cfMarkSeen(r.id)));
        await loadData();
      } catch (error) { setLoadError(error.message || 'Could not update response status.'); }
    }
    setViewing(form);
  };

  /* When sharing, first set form to active if it's a draft */
  const handleShare = async (form) => {
    if (form.status === 'draft') {
      try {
        await cfSaveForm({ ...form, status: 'active' });
        const updated = { ...form, status: 'active' };
        await loadData();
        setSharing(updated);
      } catch (error) { setLoadError(error.message || 'Could not activate the form.'); }
    } else {
      setSharing(form);
    }
  };

  const filtered = forms
    .filter(f => filter === 'all' || f.status === filter)
    .filter(f => !search || f.title.toLowerCase().includes(search.toLowerCase()));

  const totalResponses = forms.reduce((s, f) => s + (f.responses || []).length, 0);
  const activeForms = forms.filter(f => f.status === 'active').length;
  const newResponses = forms.reduce((s, f) => s + (f.responses || []).filter(r => !r.seen).length, 0);

  const s = {
    page: { fontFamily: 'var(--font-body)' },
    pageHeader: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      marginBottom: 28, flexWrap: 'wrap', gap: 12,
    },
    heading: { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: C.textPrim },
    subheading: { fontSize: 14, color: C.textSec, marginTop: 4 },
    newBtn: {
      background: C.mint, color: '#060012', fontWeight: 700,
      border: 'none', borderRadius: 10, padding: '11px 22px',
      cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 7,
    },
    kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 },
    kpiCard: {
      background: C.elevated, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '16px 20px',
    },
    kpiVal: { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 },
    kpiLbl: { fontSize: 11, color: C.textTer, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 },
    toolbar: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    searchBox: {
      flex: 1, minWidth: 200,
      background: C.elevated, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '9px 14px', color: C.textPrim,
      fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none',
    },
    filterBtn: (active) => ({
      background: active ? 'rgba(0,252,143,0.1)' : 'transparent',
      border: `1px solid ${active ? 'rgba(0,252,143,0.3)' : C.border}`,
      color: active ? C.mint : C.textSec,
      borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12,
    }),
    grid: { display: 'flex', flexDirection: 'column', gap: 14 },
    empty: {
      textAlign: 'center', padding: '60px 20px',
      color: C.textTer, fontSize: 14,
    },
    layout: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 },
    sidebar: {},
    error: { padding: '12px 14px', marginBottom: 16, color: '#ff9b9b', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 9, fontSize: 13 },
    loginCard: { width: '100%', maxWidth: 440, margin: '8vh auto', padding: 28, background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 14 },
    loginInput: { width: '100%', padding: '12px 14px', marginTop: 7, marginBottom: 16, color: C.textPrim, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 },
    sidebarCard: {
      background: C.elevated, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '20px',
      marginBottom: 16,
    },
    sidebarTitle: { fontSize: 12, fontWeight: 600, color: C.mint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 },
  };

  if (authLoading) return <div style={s.page}><div style={s.empty}>Connecting to secure Communications…</div></div>;

  if (!session) return (
    <div style={s.page}>
      <form style={s.loginCard} onSubmit={handleSignIn}>
        <div style={s.heading}>Communications sign in</div>
        <div style={{ ...s.subheading, marginBottom: 22 }}>Sign in with your authorized NEXT OS account to manage forms and view client responses. Shared client forms remain public.</div>
        {authError && <div role="alert" style={s.error}>{authError}</div>}
        <label style={{ fontSize: 12, color: C.textSec }}>Email</label>
        <input style={s.loginInput} type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
        <label style={{ fontSize: 12, color: C.textSec }}>Password</label>
        <input style={s.loginInput} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
        <button style={{ ...s.newBtn, width: '100%', justifyContent: 'center' }} type="submit" disabled={authBusy}>
          {authBusy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <div style={s.heading}>Communications</div>
          <div style={s.subheading}>Client Forms: submissions appear here with an in-app notification.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.newBtn} onClick={() => setBuilding('new')}>+ New Form</button>
          <button style={s.filterBtn(false)} onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {loadError && <div role="alert" style={s.error}>{loadError} <button style={s.filterBtn(false)} onClick={loadData}>Retry</button></div>}

      {/* KPI row */}
      <div style={s.kpiRow}>
        <div style={s.kpiCard}>
          <div style={s.kpiVal}>{forms.length}</div>
          <div style={s.kpiLbl}>Total Forms</div>
        </div>
        <div style={{ ...s.kpiCard, borderColor: activeForms > 0 ? 'rgba(0,252,143,0.2)' : C.border }}>
          <div style={{ ...s.kpiVal, color: C.mint }}>{activeForms}</div>
          <div style={s.kpiLbl}>Active</div>
        </div>
        <div style={{ ...s.kpiCard, borderColor: newResponses > 0 ? 'rgba(0,252,143,0.25)' : C.border }}>
          <div style={{ ...s.kpiVal, color: newResponses > 0 ? C.mint : C.textPrim }}>
            {totalResponses}
            {newResponses > 0 && <span style={{ fontSize: 14, marginLeft: 6, verticalAlign: 'middle' }}>+{newResponses} new</span>}
          </div>
          <div style={s.kpiLbl}>Responses</div>
        </div>
      </div>

      <div style={s.layout}>
        {/* Main forms list */}
        <div>
          {/* Toolbar */}
          <div style={s.toolbar}>
            <input
              style={s.searchBox}
              placeholder="🔍 Search forms…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {['all', 'active', 'draft', 'closed'].map(f => (
              <button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Forms */}
          <div style={s.grid}>
            {loading ? (
              <div style={s.empty}>Loading forms and responses…</div>
            ) : filtered.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                {forms.length === 0
                  ? <>No forms yet. Click <strong>+ New Form</strong> to create your first client form.</>
                  : 'No forms match your filter.'}
              </div>
            ) : filtered.map(form => (
              <FormCard
                key={form.id}
                form={form}
                onEdit={f => setBuilding(f)}
                onShare={handleShare}
                onViewResponses={handleViewResponses}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        </div>

        {/* Right sidebar: activity */}
        <div style={s.sidebar}>
          <div style={s.sidebarCard}>
            <div style={s.sidebarTitle}>📡 Live Activity</div>
            <div style={{ fontSize: 11, color: C.textTer, marginBottom: 12 }}>
              {liveStatus === 'SUBSCRIBED' ? 'Live updates connected' : 'Live connection unavailable; checking every 15 seconds'}
            </div>
            {activity.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textTer, textAlign: 'center', padding: '20px 0' }}>
                No activity yet. Responses appear here in real-time.
              </div>
            ) : activity.map((item, i) => <ActivityEntry key={i} item={item} />)}
          </div>

          <div style={s.sidebarCard}>
            <div style={s.sidebarTitle}>💡 How it works</div>
            <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.8 }}>
              <div>1. <strong>Create</strong> a form with custom fields</div>
              <div>2. <strong>Share</strong> the link with your client</div>
              <div>3. Client fills it out in their browser</div>
              <div>4. Response lands <strong>right here</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {building && (
        <FormBuilder
          form={building === 'new' ? null : building}
          onSave={handleSave}
          onCancel={() => setBuilding(null)}
        />
      )}
      {sharing && <ShareModal form={sharing} onClose={() => setSharing(null)} />}
      {viewing && <ResponsesModal form={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

window.CommsPage = CommsPage;
