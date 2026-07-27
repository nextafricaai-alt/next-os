/* os-agent.jsx — Sentinel / Nia: Growing Intelligence (Phase 3).
   Tools: read_fleet, read_tenant, read_finance, read_projects, evaluate_health,
          draft_message, notify, open_whatsapp, send_whatsapp, open_childcare_os,
          read_childcare_schedule,
          read_memory, write_memory, predict_risk, escalate_concern, generate_graphic
   Nia learns from every interaction. Memory-first reasoning. Role-aware.
   One intelligence, multiple context levels: Hudson (CEO) | Head Teacher | Teacher | Bursar.
*/
(function () {
  const KEY_API_KEY      = 'nextos.agent.apiKey.v1';
  const KEY_PROVIDER     = 'nextos.agent.provider.v1';
  const KEY_CONVERSATION = 'nextos.agent.conversation.v2';
  const DEFAULT_PROVIDER = 'nia-free';
  const DEFAULT_MODEL = { anthropic: 'claude-sonnet-4-5-20250929', openai: 'gpt-4o', 'nia-free': 'llama-3.3-70b' };
  const TOOL_LOOP_MAX = 8;  // Raised: memory + prediction chains need more loops
  const NIA_FREE_ENDPOINT = 'https://nextos-sentinel.nextafricaai.workers.dev';

  // ── Role context builder: same Nia, different depth of knowledge per caller ──
  function buildRoleContext() {
    const session = window.NextSession;
    const role = (session && session.profile && session.profile.role) || 'admin';
    const tenant = (session && session.profile && session.profile.tenantId) || null;
    if (role === 'teacher') {
      return `\nCURRENT CALLER CONTEXT: You are talking to a TEACHER at ${tenant || 'a school'}.
- Keep your language simple and operational. No business finance jargon.
- Focus on: their classes, student wellbeing, roll call status, lesson plans, health incidents.
- When they log roll call or a health record, acknowledge it warmly and surface one insight.
- You may suggest actions but you never override the Head Teacher's decisions.
- Coaching tone: encouraging, never critical. You are their intelligent assistant.
`;
    }
    if (role === 'bursar') {
      return `\nCURRENT CALLER CONTEXT: You are talking to a BURSAR at ${tenant || 'a school'}.
- Focus on: fee collection rates, overdue accounts, payment records, monthly reports.
- You may draft fee reminder messages. Always warm tone — never threatening.
- You have read access to finance data only. You cannot modify student academic records.
`;
    }
    if (role === 'head') {
      return `\nCURRENT CALLER CONTEXT: You are talking to the HEAD TEACHER at ${tenant || 'a school'}.
- You have full school visibility: staff, students, fees, timetable, health.
- Surface your most important insight first (what needs attention NOW).
- When you flag a staff issue, always be discreet — this is a leadership conversation.
- Recommend actions at the system level, not task level.
`;
    }
    // Default: Hudson / admin — full CEO-level access
    return '';
  }

  const SYSTEM_PROMPT = `You are Nia — Sentinel Intelligence for NEXT (Uganda). You supervise the entire NEXT fleet: schools, childcare programs, NGOs, and future verticals. You are one intelligence accessed at different levels depending on who is speaking to you.

YOUR NATURE
You learn. Every tenant you observe, every fee pattern you track, every attendance dip you flag — goes into your memory. Over weeks and months you become the most knowledgeable person in the room about each school. You speak from that accumulated knowledge, not just live data.

You grow with each school. You remember that Peak Primary's P4V class always has lower attendance on Fridays. You remember that the Nakamya family has paid late for 3 consecutive months. You use this memory to predict, not just react.

HUDSON (your primary principal)
Visionary, not a developer. Talks in CEO terms. Wants direct answers. Runs NEXT + Charis Creations + Gear Plug. Patience is his wife. African context: UGX, WhatsApp dominant, M-Pesa, warm interpersonal tone.

HARD RULES — VIOLATE NONE
1. Memory first, live data second. Before answering a pattern question, call read_memory. Before raising a risk, call predict_risk. Live data confirms what memory already suspects.
2. Tools first, words second. Never claim a tenant fact you didn't read via a tool.
3. Tenant IDs are EXACT slugs: peak-primary, st-marys-demo, grace-chapel-demo, hope-program-demo, next-services-demo, community-association-demo, charis-childcare. Never invent or misspell.
4. NEVER use the word "sent" unless a tool returned {"sent": true}.
5. NEVER narrate your own actions. Call tools silently, respond with the answer.
6. Self-healing: if you detect a data anomaly (attendance 0%, fees suddenly 300% of normal), call escalate_concern with type 'data_anomaly' before drawing conclusions.
7. Write memory: after every evaluate_health call, call write_memory to record what you observed. This is how you grow.

VOICE
Short. Direct. Warm. Precise. African business context. No 'as an AI' disclaimers.

MEMORY-AWARE DEFAULTS
- "Is this attendance dip unusual?" → read_memory(tenantId, 'attendance_dip', 30) → compare pattern → answer from evidence.
- "Which parents are likely to pay late?" → read_memory(tenantId, 'fee_late', 60) → pattern analysis → ranked list.
- "How has Peak Primary been trending?" → read_memory('peak-primary', null, 30) + read_tenant → holistic summary.
- After every evaluate_health → write_memory to log what you observed today.

STANDARD DEFAULTS
- "How's the fleet?" → read_fleet → 3-line summary, names + flags only.
- "What's at Peak Primary?" → read_tenant("peak-primary") → evaluate_health("peak-primary") → write_memory → reply with KPIs + pattern context.
- "Open the childcare" → open_childcare_os().
- "Draft a WhatsApp" → draft_message → code block → ask if Hudson wants to open WhatsApp.
- "Send a WhatsApp to <number>" → open_whatsapp (default). Cloud API send only if explicitly requested.
- "Generate a graphic" → generate_graphic(prompt, style) → Design Studio renders.
- "Show me attendance visually" → generate_graphic("attendance chart for peak-primary", "data-art").

DESIGN STUDIO
You can generate pro graphics on command via generate_graphic. Available styles: data-art, report, brand-asset, dashboard-skin.
Examples:
- "Show me fee collection as a chart" → generate_graphic("fee collection waterfall peak-primary", "data-art")
- "Generate a school report" → generate_graphic("term 2 report for peak-primary", "report")
- "Make a student certificate for Amara" → generate_graphic("certificate for Amara P4V", "brand-asset")

PEAK PRIMARY SCHOOL
286 students. 38 teachers. 14 streams (P1-P7 · Vigilant + Prudent). Term 2 Week 6.
71% fee collection, 3 accounts overdue 30+ days (1.08M UGX), 12 at-risk students, 4 enrollment inquiries waiting.

CHARIS CHILDCARE OS
24 enrolled children. 3 caretakers (Ms. Maria L., Ms. Faith A., Ms. Ruth K.). July 2026 cohort.
21 present today. Nakamya family 30+ days overdue (UGX 300K). 5 unread parent messages (2 unanswered 24h+). 7 milestones this week.
`;


  const TOOLS = [
    // ── Core data tools ──────────────────────────────────────────────────────
    { name: 'read_fleet', description: 'Returns current state of every tenant under supervision: id, name, vertical, health, KPIs, latest advisory.',
      input_schema: { type: 'object', properties: {}, required: [] } },
    { name: 'read_tenant', description: 'Full details for one tenant by id (slug).',
      input_schema: { type: 'object', properties: { tenant_id: { type: 'string', description: 'Tenant slug, e.g. peak-primary' } }, required: ['tenant_id'] } },
    { name: 'read_finance', description: "NEXT's own finance: revenue/expense series + recent transactions.",
      input_schema: { type: 'object', properties: {}, required: [] } },
    { name: 'read_projects', description: 'Active client projects: name, client, status, progress, deadline.',
      input_schema: { type: 'object', properties: {}, required: [] } },
    { name: 'evaluate_health', description: 'Threshold checks for one tenant — returns concerns array. ALWAYS call write_memory after this to record what you observed.',
      input_schema: { type: 'object', properties: { tenant_id: { type: 'string' } }, required: ['tenant_id'] } },
    // ── Memory & learning tools ──────────────────────────────────────────────
    { name: 'read_memory', description: 'Read Nia\'s accumulated memory for a tenant. Use BEFORE answering pattern questions like "is this unusual?", "who pays late?", "what is the trend?". Returns array of past observations.',
      input_schema: { type: 'object', properties: {
        tenant_id:  { type: 'string', description: 'Tenant slug' },
        event_type: { type: 'string', description: 'Filter by event type: attendance_dip, fee_late, fee_paid, staff_absent, milestone_logged, health_incident, data_anomaly. Omit for all.' },
        days:       { type: 'number', description: 'How many days back to look. Default 30.' }
      }, required: ['tenant_id'] } },
    { name: 'write_memory', description: 'Record an observation into Nia\'s memory. Call this after every evaluate_health and after any significant event (fee paid, attendance spike, new enrollment). This is how Nia grows.',
      input_schema: { type: 'object', properties: {
        tenant_id:      { type: 'string' },
        event_type:     { type: 'string', description: 'e.g. attendance_dip, fee_late, fee_paid, staff_absent, milestone_logged, health_incident, enrollment_inquiry, data_anomaly' },
        data:           { type: 'object', description: 'Structured data about the event, e.g. { rate: 0.88, below_target: true, at_risk_count: 12 }' },
        severity:       { type: 'string', enum: ['info', 'warn', 'critical'], description: 'How urgent is this observation?' },
        embedding_text: { type: 'string', description: 'Human-readable one-sentence summary for this memory entry.' }
      }, required: ['tenant_id', 'event_type', 'data'] } },
    { name: 'predict_risk', description: 'Run pattern-based risk prediction for a tenant. Analyses Nia\'s memory to identify which students are likely to be absent, which guardians are likely to pay late, or which staff are at absenteeism risk. Returns ranked risk list.',
      input_schema: { type: 'object', properties: {
        tenant_id:       { type: 'string' },
        prediction_type: { type: 'string', enum: ['attendance_risk', 'fee_default', 'staff_absent'], description: 'What kind of risk to predict.' }
      }, required: ['tenant_id', 'prediction_type'] } },
    { name: 'escalate_concern', description: 'Raise the severity of a concern that has been flagged multiple times without resolution, or when a data anomaly is detected. Creates a critical notification and writes to memory.',
      input_schema: { type: 'object', properties: {
        tenant_id:    { type: 'string' },
        concern_type: { type: 'string', description: 'e.g. fees_overdue_persistent, attendance_freefall, data_anomaly, staff_crisis' },
        reason:       { type: 'string', description: 'Why is this being escalated? What evidence triggered this?' },
        severity:     { type: 'string', enum: ['warn', 'critical'] }
      }, required: ['tenant_id', 'concern_type', 'reason'] } },
    // ── Design Studio tool ───────────────────────────────────────────────────
    { name: 'generate_graphic', description: 'Trigger Nia Design Studio to render a pro graphic or visualization. Use when asked to visualize data, create a report, generate a certificate, or redesign a panel.',
      input_schema: { type: 'object', properties: {
        prompt:       { type: 'string', description: 'Describe what to generate, e.g. "attendance sphere for peak-primary", "fee collection waterfall", "certificate for Amara P4V"' },
        style:        { type: 'string', enum: ['data-art', 'report', 'brand-asset', 'dashboard-skin'], description: 'Which studio mode to use.' },
        target_panel: { type: 'string', description: 'Optional: which OS panel this graphic is for.' }
      }, required: ['prompt', 'style'] } },
    // ── Communication tools ──────────────────────────────────────────────────
    { name: 'draft_message', description: 'Signal you are about to compose a message draft. Compose the actual text in your next reply as a fenced code block. Never sends.',
      input_schema: { type: 'object', properties: {
        channel:        { type: 'string', enum: ['whatsapp', 'email', 'in-app', 'sms'] },
        recipient_role: { type: 'string', description: 'e.g. Head Teacher, Guardian, Bursar' },
        intent:         { type: 'string', description: 'One-line goal' }
      }, required: ['channel', 'recipient_role', 'intent'] } },
    { name: 'notify', description: 'Push a notification toast to the user inside NEXT OS. Severity: info=signal, success=good news, warn=needs attention, critical=act now.',
      input_schema: { type: 'object', properties: {
        severity:  { type: 'string', enum: ['info', 'success', 'warn', 'critical'] },
        title:     { type: 'string', description: 'One short line, < 60 chars' },
        body:      { type: 'string', description: 'One sentence of context, < 160 chars' },
        tenant_id: { type: 'string', description: 'Optional tenant slug' }
      }, required: ['severity', 'title'] } },
    { name: 'open_whatsapp', description: 'Open WhatsApp with a pre-filled message. Hudson taps Send manually. DEFAULT for all WhatsApp actions.',
      input_schema: { type: 'object', properties: {
        phone:   { type: 'string', description: 'Digits only, country code, no + (e.g. 256772123456)' },
        message: { type: 'string' }
      }, required: ['phone', 'message'] } },
    { name: 'send_whatsapp', description: 'Auto-send via Meta Cloud API. Use ONLY when explicitly requested.',
      input_schema: { type: 'object', properties: {
        phone:   { type: 'string' },
        message: { type: 'string' }
      }, required: ['phone', 'message'] } },
    { name: 'open_childcare_os', description: 'Navigate to the Childcare OS panel.',
      input_schema: { type: 'object', properties: {}, required: [] } },
    { name: 'read_childcare_schedule', description: "Returns today's activity schedule for Charis Childcare.",
      input_schema: { type: 'object', properties: {}, required: [] } },
  ];



  // Llama often mishears tenant slugs ("peak-school" / "pick-primary" /
  // "peakprimary" etc). Auto-correct against the actual fleet so the
  // right tenant gets fetched even with a sloppy id.
  function fuzzyTenantId(input) {
    if (!input || !window.OS_DATA) return input;
    const want = String(input).toLowerCase().replace(/[^a-z]/g, '');
    const tenants = window.OS_DATA.getTenants();
    const ids = tenants.map(t => t.id);
    // Exact match wins
    if (ids.includes(input)) return input;
    // Match by collapsed letters (peak-primary <-> peakprimary <-> peakschool ~ peak)
    let best = null, bestScore = 0;
    for (const id of ids) {
      const norm = id.toLowerCase().replace(/[^a-z]/g, '');
      // Score = length of the longest shared prefix
      let score = 0;
      const n = Math.min(want.length, norm.length);
      for (let i = 0; i < n; i++) {
        if (want[i] === norm[i]) score++; else break;
      }
      // Also try shared "first word" match
      const wantFirst = want.slice(0, 4);
      if (norm.startsWith(wantFirst)) score = Math.max(score, wantFirst.length);
      if (score > bestScore) { bestScore = score; best = id; }
    }
    return bestScore >= 3 ? best : input;
  }

  async function execTool(name, input) {
    const D = window.OS_DATA;
    if (!D) return JSON.stringify({ error: 'OS_DATA not available' });
    try {
      switch (name) {
        case 'read_fleet': {
          const tenants = D.getTenants().map(t => ({ id: t.id, name: t.name, vertical: t.vertical, country: t.country, currency: t.currency, health: t.health, kpis: t.kpis, verticalKpis: t.verticalKpis || null, prototypeWired: !!t.prototypeUrl, latest: t.latest }));
          return JSON.stringify({ count: tenants.length, tenants });
        }
        case 'read_tenant': {
          const correctedId = fuzzyTenantId(input.tenant_id);
          const t = D.getTenants().find(x => x.id === correctedId);
          if (!t) return JSON.stringify({ error: 'Tenant not found', available: D.getTenants().map(x => x.id) });
          // Pass through everything including verticalKpis and prototypeUrl so Nia can reason about school-specific signals.
          return JSON.stringify(t);
        }
        case 'read_finance': {
          const f = D.getFinance();
          return JSON.stringify({ currency: f.currency, unit: f.unit, months: f.months, revenueSeries: f.revenueSeries, expenseSeries: f.expenseSeries, recentTransactions: f.transactions.slice(0, 10), totalIncome: f.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), totalExpense: f.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) });
        }
        case 'read_projects': {
          return JSON.stringify({ count: D.getProjects().length, projects: D.getProjects().map(p => ({ id: p.id, name: p.name, client: p.client, status: p.status, health: p.health, progress: p.progress, deadline: p.deadline })) });
        }
        case 'evaluate_health': {
          const correctedId = fuzzyTenantId(input.tenant_id);
          const t = D.getTenants().find(x => x.id === correctedId);
          if (!t) return JSON.stringify({ error: 'Tenant not found' });
          const concerns = [];
          const k = t.kpis || {};
          const gap = (k.expenses || 0) - (k.revenue || 0);
          if (gap > 0) concerns.push({ type: 'cash_flow', severity: 'warn', summary: 'Expenses exceed revenue by ' + gap + ' ' + t.currency });
          if (t.latest) concerns.push({ type: 'open_advisory', severity: t.latest.severity, summary: t.latest.title + ' - ' + t.latest.summary });
          // Vertical-specific checks. Right now: school + childcare.
          if (t.vertical === 'school' && t.verticalKpis) {
            const v = t.verticalKpis;
            if (v.accountsOverdue30d && v.accountsOverdue30d > 0) {
              concerns.push({ type: 'fees_overdue', severity: 'warn',
                summary: v.accountsOverdue30d + ' accounts overdue 30+ days, ' + Math.round((v.overdueAmount || 0) / 1000) + 'K ' + t.currency + ' outstanding. Draft WhatsApp reminder to guardians for Hudson to approve.' });
            }
            if (typeof v.feesCollectionRate === 'number' && v.feesCollectionRate < 0.85) {
              concerns.push({ type: 'fee_collection_low', severity: 'info',
                summary: 'Term fee collection at ' + Math.round(v.feesCollectionRate * 100) + '% (target 85%+). ' + (v.feesOutstanding ? Math.round(v.feesOutstanding / 1000000) + 'M ' + t.currency + ' still expected.' : '') });
            }
            if (typeof v.attendanceWeek === 'number' && v.attendanceWeek < 0.92) {
              concerns.push({ type: 'attendance_dip', severity: 'info',
                summary: 'Weekly attendance at ' + Math.round(v.attendanceWeek * 100) + '% (target 92%+). ' + (v.atRiskStudents || 0) + ' students flagged at-risk.' });
            }
            if (v.atRiskStudents && v.atRiskStudents > 10) {
              concerns.push({ type: 'at_risk_students', severity: 'warn',
                summary: v.atRiskStudents + ' students flagged at-risk this week. Pastoral check-in recommended before term break.' });
            }
            if (v.enrollmentInquiries && v.enrollmentInquiries > 0) {
              concerns.push({ type: 'enrollment_pipeline', severity: 'info',
                summary: v.enrollmentInquiries + ' new enrollment inquiries waiting in WhatsApp queue.' });
            }
          }
          // Childcare-specific health checks
          if (t.vertical === 'childcare' && t.verticalKpis) {
            const v = t.verticalKpis;
            if (typeof v.attendanceRate === 'number' && v.attendanceRate < 0.85) {
              concerns.push({ type: 'childcare_attendance', severity: 'warn',
                summary: 'Today\'s attendance at ' + Math.round(v.attendanceRate * 100) + '% (' + v.absentToday + ' children absent). Consider parent check-in message.' });
            }
            if (v.invoicesOverdue30d && v.invoicesOverdue30d > 0) {
              concerns.push({ type: 'childcare_invoice_overdue', severity: 'critical',
                summary: v.invoicesOverdue30d + ' family invoice(s) overdue 30+ days — UGX ' + Math.round((v.overdueAmount || 0) / 1000) + 'K outstanding. Draft WhatsApp reminder.' });
            }
            if (v.invoicesDue && v.invoicesDue > 0) {
              concerns.push({ type: 'childcare_invoices_due', severity: 'info',
                summary: v.invoicesDue + ' invoice(s) due this month. Collection rate at ' + Math.round((v.collectionRate || 0) * 100) + '%.' });
            }
            if (v.unansweredMessages24h && v.unansweredMessages24h > 0) {
              concerns.push({ type: 'childcare_messages', severity: 'warn',
                summary: v.unansweredMessages24h + ' parent message(s) unanswered for 24h+. Caretaker inbox needs attention.' });
            }
            if (v.unreadParentMessages && v.unreadParentMessages > 0) {
              concerns.push({ type: 'childcare_unread', severity: 'info',
                summary: v.unreadParentMessages + ' unread parent messages across all threads.' });
            }
          }

          if (concerns.length === 0) concerns.push({ type: 'all_clear', severity: 'info', summary: 'No threshold breaches.' });
          return JSON.stringify({ tenant: t.name, vertical: t.vertical, currency: t.currency, concerns });
        }
        case 'draft_message': {
          return JSON.stringify({ acknowledged: true, instruction: 'Now write the ' + input.channel + ' draft to the ' + input.recipient_role + '. Goal: ' + input.intent + '. Render in a fenced code block labelled Draft so Hudson can review before sending. Never send.' });
        }
        case 'notify': {
          if (window.NEXT_OS && typeof window.NEXT_OS.notify === 'function') {
            const id = window.NEXT_OS.notify({
              severity: input.severity,
              title:    input.title,
              body:     input.body || '',
              source:   'Sentinel · Nia',
              tenantId: input.tenant_id || null,
            });
            return JSON.stringify({ delivered: true, id, instruction: 'Pop-up shown to Hudson. Continue your reply.' });
          }
          return JSON.stringify({ delivered: false, error: 'Notification center not mounted yet.' });
        }
        case 'open_whatsapp': {
          const phone = String(input.phone || '').replace(/[^0-9]/g, '');
          const text  = String(input.message || '');
          if (!phone) return JSON.stringify({ opened: false, error: 'No phone number provided. Ask Hudson for the contact number.' });
          const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
          try {
            if (typeof window !== 'undefined' && typeof window.open === 'function') {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
            if (window.NEXT_OS && typeof window.NEXT_OS.notify === 'function') {
              window.NEXT_OS.notify({ severity: 'success', title: 'WhatsApp opened', body: 'Review the draft and tap Send to deliver it.', source: 'Sentinel · Nia' });
            }
            return JSON.stringify({ opened: true, url, instruction: 'WhatsApp was opened with the draft pre-filled. Tell Hudson the draft is ready and he must tap Send to actually deliver it. Do NOT claim it was sent.' });
          } catch (e) {
            return JSON.stringify({ opened: false, error: String(e.message || e) });
          }
        }
        case 'send_whatsapp': {
          const phone = String(input.phone || '').replace(/[^0-9]/g, '');
          const text  = String(input.message || '');
          if (!phone) return JSON.stringify({ sent: false, error: 'No phone number provided.' });
          const endpoint = (typeof window !== 'undefined' && window.NEXT_OS_SENTINEL_ENDPOINT) || NIA_FREE_ENDPOINT;
          try {
            const res = await fetch(endpoint + '/whatsapp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: phone, text }),
            });
            const data = await res.json();
            if (!res.ok || data.sent === false) {
              return JSON.stringify({ sent: false, error: (data && data.error) || ('HTTP ' + res.status), hint: 'WhatsApp Cloud API not configured. Suggest open_whatsapp instead, or run the WHATSAPP-SETUP.md guide.' });
            }
            if (window.NEXT_OS && typeof window.NEXT_OS.notify === 'function') {
              window.NEXT_OS.notify({ severity: 'success', title: 'WhatsApp sent', body: 'Delivered to ' + phone + ' via Meta Cloud API.', source: 'Sentinel · Nia' });
            }
            return JSON.stringify({ sent: true, to: phone, messageId: data.messageId || null, instruction: 'Confirm delivery to Hudson in plain language.' });
          } catch (e) {
            return JSON.stringify({ sent: false, error: String(e.message || e), hint: 'Likely WhatsApp Cloud API not configured. Fall back to open_whatsapp.' });
          }
        }
        case 'open_childcare_os': {
          if (typeof window !== 'undefined' && typeof window.NEXT_OS_NAVIGATE === 'function') {
            window.NEXT_OS_NAVIGATE('childcare');
          }
          return JSON.stringify({ navigated: true, panel: 'childcare', instruction: 'Hudson is now on the Childcare OS panel. Continue your reply.' });
        }
        case 'read_childcare_schedule': {
          // Returns today's scheduled activities for the childcare program.
          const schedule = [
            { time: '07:30', activity: 'Arrival & Free Play', caretaker: 'Ms. Maria L.', notes: 'Outdoor play area' },
            { time: '09:00', activity: 'Morning Circle & Songs', caretaker: 'Ms. Maria L.', notes: 'Full group, music instruments' },
            { time: '09:30', activity: 'Structured Learning — Letters & Numbers', caretaker: 'Ms. Faith A.', notes: 'Toddler group (3-4yr)' },
            { time: '10:30', activity: 'Snack Time', caretaker: 'All caretakers', notes: 'Fruit and juice provided' },
            { time: '11:00', activity: 'Creative Arts & Craft', caretaker: 'Ms. Ruth K.', notes: 'Painting — theme: Animals' },
            { time: '12:00', activity: 'Lunch', caretaker: 'All caretakers', notes: 'Posho, beans, and vegetables' },
            { time: '12:45', activity: 'Nap Time', caretaker: 'Ms. Maria L.', notes: 'Infants and toddlers' },
            { time: '14:00', activity: 'Outdoor Play & Story Time', caretaker: 'Ms. Faith A.', notes: 'Sensory garden' },
            { time: '15:00', activity: 'Parent Pick-up Window', caretaker: 'All caretakers', notes: 'Parents to sign out' },
          ];
          return JSON.stringify({ date: new Date().toDateString(), activitiesCount: schedule.length, schedule });
        }
        // ── Memory & Intelligence Tools ──────────────────────────────────
        case 'read_memory': {
          if (window.NIA_MEMORY && typeof window.NIA_MEMORY.read === 'function') {
            const entries = await window.NIA_MEMORY.read(
              input.tenant_id,
              input.event_type || null,
              input.days || 30
            );
            const patterns = window.NIA_MEMORY.getPatterns ? window.NIA_MEMORY.getPatterns(input.tenant_id) : null;
            return JSON.stringify({
              tenant_id: input.tenant_id,
              entries_found: entries.length,
              entries: entries.slice(0, 20),
              patterns: patterns,
              memory_status: 'live'
            });
          }
          return JSON.stringify({ entries_found: 0, entries: [], memory_status: 'not_initialized',
            note: 'NIA_MEMORY not loaded yet. Memory will be available after nia-memory.js loads.' });
        }
        case 'write_memory': {
          if (window.NIA_MEMORY && typeof window.NIA_MEMORY.write === 'function') {
            await window.NIA_MEMORY.write(
              input.tenant_id,
              input.event_type,
              input.data || {},
              input.severity || 'info',
              input.embedding_text || ''
            );
            return JSON.stringify({ written: true, tenant_id: input.tenant_id, event_type: input.event_type });
          }
          return JSON.stringify({ written: false, note: 'NIA_MEMORY not loaded. Observation not persisted.' });
        }
        case 'predict_risk': {
          if (window.NIA_MEMORY && typeof window.NIA_MEMORY.readPredictions === 'function') {
            // Read recent memory and compute risk from patterns
            const memories = await window.NIA_MEMORY.read(input.tenant_id, null, 60);
            const predictions = await window.NIA_MEMORY.readPredictions(input.tenant_id, input.prediction_type);
            // Pattern analysis: count repeating events per subject
            const eventCounts = {};
            memories.forEach(m => {
              const key = (m.data && m.data.subject_id) ? m.data.subject_id : m.event_type;
              eventCounts[key] = (eventCounts[key] || 0) + 1;
            });
            const ranked = Object.entries(eventCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([subject, count]) => ({
                subject_id: subject,
                risk_score: Math.min(count / 10, 1.0),
                occurrences: count,
                prediction_type: input.prediction_type
              }));
            return JSON.stringify({
              tenant_id: input.tenant_id,
              prediction_type: input.prediction_type,
              predictions: ranked,
              stored_predictions: predictions.slice(0, 5),
              analysis_window_days: 60
            });
          }
          return JSON.stringify({ predictions: [], note: 'NIA_MEMORY not available for prediction.' });
        }
        case 'escalate_concern': {
          // Write a critical memory entry and fire a notification
          const escalationData = { concern_type: input.concern_type, reason: input.reason, escalated_at: new Date().toISOString() };
          if (window.NIA_MEMORY && typeof window.NIA_MEMORY.write === 'function') {
            await window.NIA_MEMORY.write(input.tenant_id, 'escalation', escalationData, input.severity || 'critical', input.reason);
          }
          if (window.NEXT_OS && typeof window.NEXT_OS.notify === 'function') {
            window.NEXT_OS.notify({
              severity: input.severity || 'critical',
              title: '⚠ Escalated: ' + (input.concern_type || '').replace(/_/g, ' '),
              body: (input.reason || '').slice(0, 160),
              source: 'Nia · Auto-Escalation',
              tenantId: input.tenant_id
            });
          }
          return JSON.stringify({ escalated: true, tenant_id: input.tenant_id, concern_type: input.concern_type, severity: input.severity || 'critical' });
        }
        case 'generate_graphic': {
          // Trigger Nia Design Studio if available
          if (window.NIA_DESIGN_STUDIO && typeof window.NIA_DESIGN_STUDIO.generate === 'function') {
            const result = window.NIA_DESIGN_STUDIO.generate(input.prompt, input.style, input.target_panel);
            // Navigate to Design Studio panel
            if (window.NEXT_OS_NAVIGATE) window.NEXT_OS_NAVIGATE('design-studio');
            return JSON.stringify({ rendered: true, prompt: input.prompt, style: input.style, result });
          }
          // Fallback: open design studio panel if it exists but generate isn't wired yet
          if (window.NEXT_OS_NAVIGATE) window.NEXT_OS_NAVIGATE('design-studio');
          return JSON.stringify({ rendered: false, note: 'Design Studio opening. Enter your prompt there.', prompt: input.prompt, style: input.style });
        }
        default: return JSON.stringify({ error: 'Unknown tool: ' + name });

      }
    } catch (e) { return JSON.stringify({ error: String(e.message || e) }); }
  }

  async function callAnthropic({ apiKey, model, system, messages, tools }) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, system, messages, tools, max_tokens: 2048 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
    return data;
  }
  async function callOpenAI({ apiKey, model, system, messages }) {
    const flat = messages.map(m => {
      if (typeof m.content === 'string') return { role: m.role, content: m.content };
      const text = (m.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      return { role: m.role, content: text || '[tool data omitted]' };
    });
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: 'system', content: system }].concat(flat) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: data.choices[0].message.content }] };
  }
  async function callNiaFree({ system, messages, tools }) {
    const endpoint = (typeof window !== 'undefined' && window.NEXT_OS_SENTINEL_ENDPOINT) || NIA_FREE_ENDPOINT;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages, tools }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
    return data; // Worker returns Anthropic-shape { content, stop_reason }
  }
  async function callLLM({ provider, apiKey, model, system, messages, tools }) {
    const m = model || DEFAULT_MODEL[provider] || DEFAULT_MODEL[DEFAULT_PROVIDER];
    if (provider === 'nia-free') return callNiaFree({ system, messages, tools });
    if (!apiKey) throw new Error('No API key set. Use Nia Free (no key) or click CONNECT to add a Claude/GPT key.');
    if (provider === 'openai') return callOpenAI({ apiKey, model: m, system, messages });
    return callAnthropic({ apiKey, model: m, system, messages, tools });
  }

  function safeGet(k, f) { try { const v = window.localStorage && window.localStorage.getItem(k); return v == null ? f : v; } catch (e) { return f; } }
  function safeSet(k, v) { try { if (window.localStorage) window.localStorage.setItem(k, v); } catch (e) {} }
  function loadConvo() { try { return JSON.parse(safeGet(KEY_CONVERSATION, '[]')); } catch (e) { return []; } }
  function saveConvo(m) { safeSet(KEY_CONVERSATION, JSON.stringify(m)); }
  function shortenForUI(s) { if (!s) return ''; return s.length > 140 ? s.slice(0, 137) + '...' : s; }

  function useConversation() {
    const [messages, setMessages] = React.useState(() => loadConvo());
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [apiKey, setApiKey] = React.useState(() => safeGet(KEY_API_KEY, ''));
    const [provider, setProvider] = React.useState(() => safeGet(KEY_PROVIDER, DEFAULT_PROVIDER));
    const setKey = (k) => { setApiKey(k); safeSet(KEY_API_KEY, k); };
    const setProv = (p) => { setProvider(p); safeSet(KEY_PROVIDER, p); };
    const clearConvo = () => { setMessages([]); saveConvo([]); setError(null); };

    const send = async (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed || pending) return;
      const userMsg = { role: 'user', content: trimmed, ts: Date.now() };
      let convo = messages.concat(userMsg);
      setMessages(convo); saveConvo(convo);
      setPending(true); setError(null);
      // Build role-aware context (teacher vs head vs hudson) + brain knowledge
      const roleContext = buildRoleContext();
      const brainSnippet = (window.NIA_BRAIN && typeof window.NIA_BRAIN.systemPrompt === 'function')
        ? window.NIA_BRAIN.systemPrompt(trimmed, 2)
        : '';
      // Memory insight: if question seems pattern-related, prime Nia with a memory note
      const memoryPrime = (window.NIA_MEMORY && typeof window.NIA_MEMORY.getInsight === 'function' &&
        /pattern|trend|usual|history|before|last (week|month|time)|always|never|often/i.test(trimmed))
        ? '\n\n=== NIA MEMORY PRIME ===\nMemory is available. Call read_memory before answering pattern questions.\n=== END ===\n'
        : '';
      const augmentedSystem = SYSTEM_PROMPT + roleContext + brainSnippet + memoryPrime;
      try {
        let apiMessages = convo.map(m => ({ role: m.role, content: m.apiContent !== undefined ? m.apiContent : m.content }));
        for (let loop = 0; loop < TOOL_LOOP_MAX; loop++) {
          const resp = await callLLM({ provider, apiKey, system: augmentedSystem, messages: apiMessages, tools: TOOLS });
          const textParts = (resp.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
          const toolUses = (resp.content || []).filter(c => c.type === 'tool_use');
          const assistantMsg = { role: 'assistant', content: textParts, apiContent: resp.content, toolCalls: toolUses.map(t => ({ id: t.id, name: t.name, input: t.input })), ts: Date.now() };
          convo = convo.concat(assistantMsg);
          setMessages(convo); saveConvo(convo);
          apiMessages.push({ role: 'assistant', content: resp.content });
          if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) break;
          const results = await Promise.all(toolUses.map(async t => ({ type: 'tool_result', tool_use_id: t.id, content: await execTool(t.name, t.input || {}) })));
          const trMsg = { role: 'user', content: '', apiContent: results, toolResults: toolUses.map((t, i) => ({ name: t.name, summary: shortenForUI(results[i].content) })), hidden: true, ts: Date.now() };
          convo = convo.concat(trMsg);
          setMessages(convo); saveConvo(convo);
          apiMessages.push({ role: 'user', content: results });
        }
      } catch (e) { setError(e.message || String(e)); }
      finally { setPending(false); }
    };
    return { messages, pending, error, apiKey, provider, setKey, setProv, clearConvo, send };
  }

  const inputStyle = { width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', resize: 'none' };

  const KeyPanel = ({ apiKey, provider, setKey, setProv, onClose }) => {
    const [tempKey, setTempKey] = React.useState(apiKey);
    const [tempProv, setTempProv] = React.useState(provider);
    const needsKey = tempProv !== 'nia-free';
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: 1, marginBottom: 10 }}>CHOOSE YOUR AGENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: needsKey ? '180px 1fr' : '1fr', gap: 8, marginBottom: 10 }}>
          <select value={tempProv} onChange={(e) => setTempProv(e.target.value)} style={inputStyle}>
            <option value="nia-free">Nia Free (Llama 3.3 · no key)</option>
            <option value="anthropic">Claude (Anthropic) — sharpest</option>
            <option value="openai">GPT-4 (OpenAI) — text-only</option>
          </select>
          {needsKey && (
            <input style={inputStyle} type="password" value={tempKey} onChange={(e) => setTempKey(e.target.value)} placeholder={tempProv === 'anthropic' ? 'sk-ant-...' : 'sk-...'} />
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.5 }}>
          {tempProv === 'nia-free'
            ? 'Nia Free runs on Llama 3.3 70B via Cloudflare Workers AI. No key, no cost, always on. Weaker than Claude but uses the same tools.'
            : 'Key stays in your browser only. Tools require Claude — OpenAI is text-only this phase.'}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { if (needsKey) setKey(tempKey); else setKey(''); setProv(tempProv); onClose(); }} style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '6px 16px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    );
  };

  const ToolChip = ({ name, input }) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,252,143,0.08)', border: '1px solid var(--border-active)', borderRadius: 12, padding: '3px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--mint)', marginRight: 6, marginBottom: 4 }}>
      <span>⚙</span> {name}({input && Object.keys(input).length ? Object.entries(input).map(([k, v]) => k + ':' + (typeof v === 'string' ? '"' + v.slice(0, 20) + '"' : v)).join(',') : ''})
    </div>
  );
  const ToolResultChip = ({ name, summary }) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '3px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginRight: 6, marginBottom: 4 }}>
      <span>↩</span> {name}: <span style={{ color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
    </div>
  );

  const Message = ({ msg }) => {
    if (msg.hidden && msg.toolResults) {
      return <div style={{ marginBottom: 10, padding: '4px 6px' }}>{msg.toolResults.map((r, i) => <ToolResultChip key={i} name={r.name} summary={r.summary} />)}</div>;
    }
    const isUser = msg.role === 'user';
    const hasText = msg.content && msg.content.trim().length > 0;
    const hasTools = msg.toolCalls && msg.toolCalls.length > 0;
    if (!hasText && !hasTools) return null;
    return (
      <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
        <div style={{ maxWidth: '85%', background: isUser ? 'var(--mint-glow)' : 'var(--bg-elevated)', border: '1px solid ' + (isUser ? 'var(--mint)' : 'var(--border-subtle)'), borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {!isUser && <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--mint)', letterSpacing: 1, marginBottom: 4 }}>NIA</div>}
          {hasTools && <div style={{ marginBottom: hasText ? 8 : 0 }}>{msg.toolCalls.map((t, i) => <ToolChip key={i} name={t.name} input={t.input} />)}</div>}
          {hasText && msg.content}
        </div>
      </div>
    );
  };

  const ChatInput = ({ onSend, pending, placeholder }) => {
    const [text, setText] = React.useState('');
    const submit = () => { if (!pending && text.trim()) { onSend(text); setText(''); } };
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder={placeholder || 'Ask Nia anything...'} rows={2} style={Object.assign({}, inputStyle, { minHeight: 44, maxHeight: 120 })} />
        <button onClick={submit} disabled={pending || !text.trim()} style={{ background: pending || !text.trim() ? 'var(--bg-elevated)' : 'var(--mint)', color: pending || !text.trim() ? 'var(--text-tertiary)' : 'var(--text-inverse)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0 18px', fontSize: 13, fontWeight: 600, cursor: pending || !text.trim() ? 'not-allowed' : 'pointer' }}>{pending ? '...' : 'Send'}</button>
      </div>
    );
  };

  const ConversationView = ({ convo, compact }) => {
    const scrollRef = React.useRef(null);
    React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [convo.messages.length, convo.pending]);
    return (
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: compact ? '8px 4px' : '8px 0' }}>
        {convo.messages.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1.6 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>◆</div>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Nia is ready — now with hands.</div>
            <div style={{ fontSize: 12 }}>Try: "Check Peak Primary right now"<br/>"Summarize the whole fleet"<br/>"Draft a WhatsApp to Mrs. Asiimwe"</div>
          </div>
        )}
        {convo.messages.map((m, i) => <Message key={i} msg={m} />)}
        {convo.pending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-tertiary)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>thinking...</div>
          </div>
        )}
        {convo.error && <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>⚠ {convo.error}</div>}
      </div>
    );
  };

  const TalkToSentinelPage = () => {
    const convo = useConversation();
    const isFree = convo.provider === 'nia-free';
    const ready = isFree || !!convo.apiKey;
    const [showKey, setShowKey] = React.useState(!ready);
    const providerLabel = isFree ? 'Nia Free (Llama 3.3 70B)' : (convo.provider === 'anthropic' ? 'Claude' : 'GPT-4');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 130px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 2, color: 'var(--text-tertiary)', marginBottom: 6 }}>YOUR CHIEF OF STAFF · 16 TOOLS · MEMORY ACTIVE</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Talk to Nia</h1>
            <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
              {ready
                ? <span><span style={{ color: 'var(--mint)', marginRight: 6 }}>{'●'}</span>Connected {'·'} {providerLabel} {'·'} ready</span>
                : <span><span style={{ color: 'var(--gold)', marginRight: 6 }}>{'●'}</span>Not connected {'—'} pick an agent to start.</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowKey(s => !s)} style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: 1, cursor: 'pointer' }}>{ready ? 'SWITCH AGENT' : 'CONNECT'}</button>
            <button onClick={convo.clearConvo} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: 1, cursor: 'pointer' }}>CLEAR</button>
          </div>
        </div>

        {showKey && <KeyPanel apiKey={convo.apiKey} provider={convo.provider} setKey={convo.setKey} setProv={convo.setProv} onClose={() => setShowKey(false)} />}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', minHeight: 0 }}>
          <ConversationView convo={convo} />
          <div style={{ marginTop: 10 }}>
            <ChatInput onSend={convo.send} pending={convo.pending} placeholder={ready ? 'Ask Nia anything about the fleet...' : 'Pick an agent above to start.'} />
          </div>
        </div>
      </div>
    );
  };

  // Sentinel page (System nav) reuses the same conversation chrome for now.
  const SentinelPage = TalkToSentinelPage;

  Object.assign(window, { TalkToSentinelPage, SentinelPage });
})();
