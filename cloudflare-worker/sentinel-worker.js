/**
 * NEXT OS Sentinel — Free-tier Agent Worker
 * ============================================================================
 * Runs Llama 3.3 70B on Cloudflare Workers AI with native tool calling.
 * Translates between the Anthropic-style request/response shape that
 * os-agent.jsx already understands and the Workers AI / OpenAI-style
 * tool-calling format Llama uses.
 *
 * This is what makes Sentinel (Nia) work for Hudson with no API key.
 *
 * Endpoint:
 *   POST /  — Body: { system, messages, tools }
 *             Returns: { content: [...], stop_reason: 'tool_use' | 'end_turn' }
 *
 * Cost: 0 USD up to ~10k neurons/day (Cloudflare free tier).
 *
 * Deploy:
 *   wrangler deploy --name nextos-sentinel
 * ============================================================================
 */

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_TOKENS = 1024;

const ALLOWED_ORIGINS = [
  'https://nextafrica.ai',
  'https://www.nextafrica.ai',
  'https://nextos.nextafrica.ai',
  'http://localhost:5500',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'null', // file:// origin during local OS testing
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

/* --- Format translation ---------------------------------------------------
   Anthropic input shape (what os-agent.jsx sends):
     tools: [{ name, description, input_schema: { type, properties, required } }]
     messages: [
       { role: 'user'|'assistant', content: string | [{type, text|tool_use|tool_result, ...}] }
     ]
   OpenAI/Workers-AI shape (what Llama expects):
     tools: [{ type: 'function', function: { name, description, parameters } }]
     messages: [
       { role: 'system'|'user'|'assistant'|'tool', content: string, tool_calls?: [], tool_call_id?: string }
     ]
--------------------------------------------------------------------------- */

function anthropicToolsToOpenAI(tools) {
  return (tools || []).map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.input_schema || { type: 'object', properties: {} },
    },
  }));
}

// Workers AI's Llama 3.3 70b is strict about message shape:
// - content must always be a NON-NULL string
// - only system/user/assistant roles are accepted (no `tool` role)
// - assistant messages with `tool_calls` need to be flattened
// So we encode tool calls + results as inline transcript text. Llama sees
// the prior tool round as conversation context, then decides whether to
// call another tool or finish.
function anthropicMessagesToOpenAI(messages) {
  // Llama 3.3 70b on Workers AI accepts tool_calls on assistant messages
  // (when content is a non-null string). For tool results we use a user
  // message labelled clearly — this keeps annotations OUT of any visible
  // assistant reply so Llama never parrots them back.
  const out = [];
  for (const m of messages) {
    if (typeof m.content === 'string') {
      out.push({ role: m.role, content: m.content || ' ' });
      continue;
    }
    const blocks = Array.isArray(m.content) ? m.content : [];

    if (m.role === 'assistant') {
      const textParts = blocks.filter(b => b.type === 'text').map(b => b.text);
      const tool_uses = blocks.filter(b => b.type === 'tool_use');
      const text = textParts.join('').trim();
      const msg = { role: 'assistant', content: text || ' ' };
      if (tool_uses.length) {
        msg.tool_calls = tool_uses.map(tu => ({
          id: tu.id || ('tc_' + Math.random().toString(36).slice(2, 10)),
          type: 'function',
          function: { name: tu.name, arguments: JSON.stringify(tu.input || {}) },
        }));
      }
      out.push(msg);
    } else if (m.role === 'user') {
      const tool_results = blocks.filter(b => b.type === 'tool_result');
      const text_blocks  = blocks.filter(b => b.type === 'text');

      if (tool_results.length) {
        const lines = tool_results.map(tr => {
          const raw = typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content);
          return 'TOOL RESULT: ' + raw;
        });
        out.push({
          role: 'user',
          content: lines.join('\n') + '\n\nThe data above came from the tool you just called. Use it to answer the original question. Do NOT narrate that you are waiting or thinking — just respond with the answer in plain language, or call another tool if needed.',
        });
      }
      if (text_blocks.length) {
        out.push({ role: 'user', content: text_blocks.map(b => b.text).join('') });
      }
    } else if (m.role === 'system') {
      const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('') || ' ';
      out.push({ role: 'system', content: text });
    }
  }
  return out;
}

function openAIResponseToAnthropic(data) {
  // Workers AI Llama response shape:
  //   { response: "text", tool_calls: [{ id, name, arguments | parameters }] }
  // Sometimes the response is nested differently. Handle both.
  const result = data.result || data;
  const text = (typeof result.response === 'string') ? result.response : (result.response == null ? '' : String(result.response));
  const tool_calls = Array.isArray(result.tool_calls) ? result.tool_calls : [];

  const content = [];
  if (text && text.trim()) content.push({ type: 'text', text: text });
  for (const tc of tool_calls) {
    let args = tc.arguments || tc.parameters || {};
    if (typeof args === 'string') {
      try { args = JSON.parse(args); } catch (e) { args = {}; }
    }
    content.push({
      type: 'tool_use',
      id: tc.id || ('toolu_' + Math.random().toString(36).slice(2, 12)),
      name: tc.name,
      input: args,
    });
  }
  if (content.length === 0) content.push({ type: 'text', text: '' });

  return {
    content,
    stop_reason: tool_calls.length > 0 ? 'tool_use' : 'end_turn',
    model: MODEL,
    role: 'assistant',
  };
}

/* --- HTTP handler -------------------------------------------------------- */

export default {
  // Cron handler — runs on schedule defined in sentinel-wrangler.toml.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduledHandler(event, env, ctx));
  },
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || 'null';
    const cors = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    // ─── Route: GET /briefs — list autonomous briefs from KV ────────────
    if (request.method === 'GET' && url.pathname === '/briefs') {
      return handleBriefsGet(request, env, cors);
    }
    // ─── Route: GET /actions — list autonomous actions Nia took ──────────
    if (request.method === 'GET' && url.pathname === '/actions') {
      return handleActionsGet(request, env, cors);
    }

    // ─── Route: GET /brand?s=slug — public branding for a school's login ──
    if (request.method === 'GET' && url.pathname === '/brand') {
      const slug = url.searchParams.get('s') || '';
      try {
        const rows = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(slug) + '&select=name,primary_color,logo_url,motto');
        const b = (rows && rows[0]) || {};
        return new Response(JSON.stringify(b), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' } });
      } catch (e) {
        return new Response('{}', { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    // ─── Route: GET /icon?s=slug — per-school app icon (SVG) ─────────────
    if (request.method === 'GET' && url.pathname === '/icon') {
      const slug = url.searchParams.get('s') || '';
      let nm = 'NEXT', col = '#00FC8F';
      try { const rows = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(slug) + '&select=name,primary_color'); if (rows && rows[0]) { nm = rows[0].name || nm; col = rows[0].primary_color || col; } } catch (e) {}
      const init = (String(nm).match(/[A-Za-z0-9]/g) || ['N']).slice(0, 2).join('').toUpperCase();
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="110" fill="' + col + '"/><text x="50%" y="52%" font-family="Arial,Helvetica,sans-serif" font-size="230" font-weight="700" fill="#0a1029" text-anchor="middle" dominant-baseline="central">' + init + '</text></svg>';
      return new Response(svg, { headers: { ...cors, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' } });
    }

    // ─── Route: GET /fleet — live tenant fleet for the OS + Nia chat ──────
    if (request.method === 'GET' && url.pathname === '/fleet') {
      try {
        const tenants = await loadTenants(env);
        return new Response(JSON.stringify({
          tenants,
          source: (env.SUPABASE_URL && env.SUPABASE_KEY) ? 'live' : 'seed',
          at: new Date().toISOString(),
        }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ tenants: [], error: String(e && e.message || e) }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    // GET-allowed routes (read-only endpoints live below this gate)
    const GET_OK = ['/check-project', '/seo-audit', '/px.js', '/analytics', '/gsc', '/ga4', '/fetch-page', '/site-pages', '/cms/collections', '/cms/items', '/students', '/exams', '/exam-results', '/fees-balances', '/staff-status', '/student-health', '/events', '/finance', '/assets', '/school-config', '/os-data', '/teachers'];
    if (request.method !== 'POST' && !GET_OK.includes(url.pathname)) {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    // ─── Route: /briefs/mark-read — body: { ids: [...] } ────────────────
    if (url.pathname === '/briefs/mark-read') {
      return handleBriefsMarkRead(request, env, cors);
    }

    // ─── Route: /whatsapp — send real WhatsApp via Meta Cloud API ────────
    if (url.pathname === '/whatsapp') {
      return handleWhatsApp(request, env, cors);
    }
    if (url.pathname === '/whatsapp/bulk') {
      return handleWhatsAppBulk(request, env, cors);
    }
    if (url.pathname === '/email/send') {
      return handleEmailSend(request, env, cors);
    }
    if (url.pathname === '/sms/send') {
      return handleSmsSend(request, env, cors);
    }

    // ─── Route: /supervise — manually trigger an Always-On brief ─────────
    // Body: { kind: 'morning' | 'pulse' | 'weekly' }
    if (url.pathname === '/supervise') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const kind = body.kind || 'pulse';
      const result = await runSupervise(env, kind);
      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // ─── Route: /provision-school — create a school tenant + admin login ──
    if (url.pathname === '/provision-school') {
      return handleProvisionSchool(request, env, cors);
    }
    if (url.pathname === '/provision-teacher') {
      return handleProvisionTeacher(request, env, cors);
    }
    if (url.pathname === '/teachers') {
      return handleTeachersList(url.searchParams.get('tenant') || '', env, cors);
    }

    // ─── Route: /issue-receipt — Nia issues a real receipt for a tenant ──
    if (url.pathname === '/issue-receipt') {
      return handleIssueReceipt(request, env, cors);
    }

    // ─── Route: /check-project — uptime + domain-expiry watch for a project ──
    if (url.pathname === '/check-project') {
      return handleCheckProject(url.searchParams.get('url') || '', url.searchParams.get('domain') || '', cors);
    }

    // ─── Route: /seo-audit — fetch a page and score its SEO ──
    if (url.pathname === '/seo-audit') {
      return handleSeoAudit(url.searchParams.get('url') || '', cors);
    }

    // ─── Route: /px.js — first-party analytics tracker (served to the sites) ──
    if (url.pathname === '/px.js') {
      return new Response(PX_JS, { headers: { ...cors, 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
    }
    // ─── Route: /collect — receive a site analytics event (no keys on the site) ──
    if (url.pathname === '/collect') {
      return handleCollect(request, env, cors);
    }
    // ─── Route: /analytics — aggregate events for a site ──
    if (url.pathname === '/analytics') {
      return handleAnalytics(url.searchParams.get('site') || '', Number(url.searchParams.get('days') || 7), env, cors);
    }

    // ─── Route: /gsc — Google Search Console (free, direct via service account) ──
    if (url.pathname === '/gsc') {
      return handleGsc(url.searchParams.get('site') || '', Number(url.searchParams.get('days') || 28), env, cors);
    }
    // ─── Route: /ga4 — Google Analytics 4 (free, direct via service account) ──
    if (url.pathname === '/ga4') {
      return handleGa4(url.searchParams.get('property') || '', Number(url.searchParams.get('days') || 28), env, cors);
    }

    // ─── Route: /fetch-page — fetch a page's HTML for the Studio editor (CORS) ──
    if (url.pathname === '/fetch-page') {
      return handleFetchPage(url.searchParams.get('url') || '', cors);
    }

    // ─── Route: /site-pages — discover a website's pages (sitemap or links) ──
    if (url.pathname === '/site-pages') {
      return handleSitePages(url.searchParams.get('url') || '', cors);
    }
    // ─── Route: /publish — commit an edited page to its GitHub repo (real deploy) ──
    if (url.pathname === '/publish') {
      return handlePublish(request, env, cors);
    }

    // ─── CMS engine (schema-driven OS built by Nia) ──
    if (url.pathname === '/cms/blueprint')   return handleCmsBlueprint(request, env, cors);
    if (url.pathname === '/cms/collections') return handleCmsCollections(url.searchParams.get('site') || '', env, cors);
    if (url.pathname === '/cms/items')       return handleCmsItems(url.searchParams.get('site') || '', url.searchParams.get('collection') || '', env, cors);
    if (url.pathname === '/cms/item')        return handleCmsItemSave(request, env, cors);
    if (url.pathname === '/cms/item-delete') return handleCmsItemDelete(request, env, cors);

    // ─── Auth: email OTP sign-in (Supabase GoTrue via service key) ──
    if (url.pathname === '/auth/send-otp')   return handleSendOtp(request, env, cors);
    if (url.pathname === '/auth/verify-otp') return handleVerifyOtp(request, env, cors);

    // ─── Students: list + bulk import (real students into a school tenant) ──
    if (url.pathname === '/students')        return handleStudentsList(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/students/import') return handleStudentsImport(request, env, cors);
    if (url.pathname === '/fees/import') return handleFeesImport(request, env, cors);

    // ─── Exams + grading ──
    if (url.pathname === '/exams')              return handleExamsList(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/exams/save')         return handleExamSave(request, env, cors);
    if (url.pathname === '/exam-results')       return handleResultsList(url.searchParams.get('tenant') || '', url.searchParams.get('exam') || '', env, cors);
    if (url.pathname === '/exam-results/save')  return handleResultsSave(request, env, cors);
    if (url.pathname === '/fees-balances')      return handleFeesBalances(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/staff-status')       return handleStaffStatus(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/student-health')     return handleStudentHealth(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/events')             return handleEventsList(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/events/save')        return handleEventSave(request, env, cors);
    if (url.pathname === '/finance')            return handleFinanceList(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/finance/save')       return handleFinanceSave(request, env, cors);
    if (url.pathname === '/assets')             return handleAssetsList(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/assets/save')        return handleAssetSave(request, env, cors);
    if (url.pathname === '/school-config')      return handleConfigGet(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/school-config/save') return handleConfigSave(request, env, cors);
    if (url.pathname === '/os-data')            return handleOsDataList(url.searchParams.get('tenant') || 'next', url.searchParams.get('kind') || '', env, cors);
    if (url.pathname === '/os-data/save')       return handleOsDataSave(request, env, cors);

    // ─── Route: / — Llama agent (default) ───────────────────────────────
    return handleAgent(request, env, cors);
  },
};

async function handleAgent(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('Invalid JSON body', 400, cors);
  }
  const { system, messages, tools } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError('messages[] is required', 400, cors);
  }
  const llamaMessages = [];
  if (system) llamaMessages.push({ role: 'system', content: system });
  llamaMessages.push(...anthropicMessagesToOpenAI(messages));
  const llamaTools = anthropicToolsToOpenAI(tools);

  try {
    const result = await env.AI.run(MODEL, {
      messages: llamaMessages,
      tools: llamaTools.length ? llamaTools : undefined,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
    });
    const anthropicShape = openAIResponseToAnthropic(result);
    return new Response(JSON.stringify(anthropicShape), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return jsonError('Llama call failed: ' + (err && err.message ? err.message : String(err)), 500, cors);
  }
}

// Meta WhatsApp Cloud API send.
// Requires two secrets set on the worker:
//   wrangler secret put WHATSAPP_TOKEN --config sentinel-wrangler.toml
//   wrangler secret put WHATSAPP_PHONE_ID --config sentinel-wrangler.toml
async function handleWhatsAppBulk(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  const token = env.WHATSAPP_TOKEN, phoneId = env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return J({ error: 'WhatsApp Cloud API not configured on this worker.', hint: 'Set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID (see WHATSAPP-SETUP.md), then bulk send works.' }, 200);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const items = Array.isArray(b.items) ? b.items.slice(0, 200) : [];
  if (!items.length) return J({ error: 'no items' }, 400);
  let sent = 0, failed = 0; const errs = [];
  for (const it of items) {
    const to = String(it.to || '').replace(/[^0-9]/g, '');
    if (!to || (!it.text && !it.template)) { failed++; continue; }
    try {
      const payload = it.template
        ? { messaging_product: 'whatsapp', to: to, type: 'template', template: it.template }
        : { messaging_product: 'whatsapp', to: to, type: 'text', text: { body: String(it.text) } };
      const r = await fetch('https://graph.facebook.com/v20.0/' + phoneId + '/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (r.ok) sent++; else { failed++; if (errs.length < 15) errs.push({ to: to, error: (d.error && d.error.message) || ('HTTP ' + r.status) }); }
    } catch (e) { failed++; if (errs.length < 15) errs.push({ to: to, error: String((e && e.message) || e) }); }
  }
  return J({ ok: true, sent, failed, errors: errs });
}

async function handleEmailSend(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.RESEND_KEY) return J({ error: 'Email sender not configured on this worker.', hint: 'Set RESEND_KEY + MAIL_FROM (see COMMS-SETUP.md), then email broadcasts send.' }, 200);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const from = env.MAIL_FROM || 'NEXT OS <noreply@nextafrica.ai>';
  const subject = String(b.subject || 'A message from NEXT');
  const items = Array.isArray(b.items) ? b.items.slice(0, 200) : [];
  if (!items.length) return J({ error: 'no recipients' }, 400);
  let sent = 0, failed = 0; const errs = [];
  for (const it of items) {
    const to = String(it.to || '').trim();
    if (!to || to.indexOf('@') < 0) { failed++; continue; }
    const body = String(it.text || b.message || '');
    const html = it.html || ('<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111">' + body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</div>');
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_KEY }, body: JSON.stringify({ from, to: [to], subject: it.subject || subject, html }) });
      if (r.ok) sent++; else { failed++; const d = await r.json().catch(() => ({})); if (errs.length < 15) errs.push({ to, error: (d && d.message) || ('HTTP ' + r.status) }); }
    } catch (e) { failed++; if (errs.length < 15) errs.push({ to, error: String((e && e.message) || e) }); }
  }
  return J({ ok: true, sent, failed, errors: errs });
}

async function handleSmsSend(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.AT_USERNAME || !env.AT_KEY) return J({ error: 'SMS sender not configured on this worker.', hint: "Set AT_USERNAME + AT_KEY (Africa's Talking) (see COMMS-SETUP.md), then SMS broadcasts send." }, 200);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const items = Array.isArray(b.items) ? b.items.slice(0, 500) : [];
  if (!items.length) return J({ error: 'no recipients' }, 400);
  const to = items.map(it => String(it.to || '').replace(/[^0-9+]/g, '')).filter(Boolean).join(',');
  const message = String(b.message || (items[0] && items[0].text) || '');
  if (!to || !message) return J({ error: 'recipients and message required' }, 400);
  try {
    const form = new URLSearchParams();
    form.set('username', env.AT_USERNAME); form.set('to', to); form.set('message', message);
    if (env.AT_SENDER) form.set('from', env.AT_SENDER);
    const r = await fetch('https://api.africastalking.com/version1/messaging', { method: 'POST', headers: { 'apiKey': env.AT_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body: form.toString() });
    const d = await r.json().catch(() => ({}));
    const recips = (d && d.SMSMessageData && d.SMSMessageData.Recipients) || [];
    const sent = recips.filter(x => /Success/i.test(x.status || '')).length;
    return J({ ok: true, sent: sent || (r.ok ? items.length : 0), failed: Math.max(0, items.length - (sent || (r.ok ? items.length : 0))), summary: (d && d.SMSMessageData && d.SMSMessageData.Message) || '' });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleWhatsApp(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('Invalid JSON body', 400, cors);
  }
  const { to, text } = body || {};
  if (!to || !text) {
    return new Response(JSON.stringify({ sent: false, error: 'to and text are required' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const token   = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return new Response(JSON.stringify({
      sent: false,
      error: 'WhatsApp Cloud API not configured on this worker.',
      hint:  'Run: wrangler secret put WHATSAPP_TOKEN && wrangler secret put WHATSAPP_PHONE_ID. See WHATSAPP-SETUP.md.',
    }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  const cleanTo = String(to).replace(/[^0-9]/g, '');
  try {
    const metaRes = await fetch('https://graph.facebook.com/v20.0/' + phoneId + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body: String(text) },
      }),
    });
    const data = await metaRes.json();
    if (!metaRes.ok) {
      return new Response(JSON.stringify({
        sent: false,
        error: (data && data.error && data.error.message) || ('HTTP ' + metaRes.status),
        meta: data,
      }), { status: metaRes.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const messageId = data && data.messages && data.messages[0] && data.messages[0].id;
    return new Response(JSON.stringify({ sent: true, to: cleanTo, messageId }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ sent: false, error: String(err && err.message || err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

function jsonError(message, status, cors) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/* ──────────────────────────────────────────────────────────────────────
   NIA ALWAYS ON — Autonomous supervision (runs without a browser).
   Cron triggers (configured in sentinel-wrangler.toml) fire scheduled()
   which calls runSupervise() with a brief kind.
────────────────────────────────────────────────────────────────────── */

// Server-side tenant state. Mirrors os-data.jsx DEFAULT_TENANTS for
// Nia's autonomous mode. When we wire Supabase, this becomes a DB read.
const TENANTS_SEED = [
  {
    id: 'peak-primary', name: 'Peak Primary School', vertical: 'school',
    country: 'Uganda', currency: 'UGX',
    health: 'advisory', lastSignalAt: 'just now',
    kpis: { revenue: 412500000, expenses: 384200000 },
    verticalKpis: {
      students: 286, teachers: 38, streams: 14,
      feesCollectedTerm: 412500000, feesCollectionRate: 0.71,
      feesOutstanding: 168800000, accountsOverdue30d: 3, overdueAmount: 1080000,
      attendanceWeek: 0.88, atRiskStudents: 12, topPerformers: 24,
      enrollmentInquiries: 4,
    },
    latest: { severity: 'warn', title: '3 fee accounts overdue 30+ days',
              summary: 'UGX 1.08M outstanding combined.' },
  },
];

function serverEvaluate(tenant) {
  const concerns = [];
  const k = tenant.kpis || {};
  const v = tenant.verticalKpis || {};
  const gap = (k.expenses || 0) - (k.revenue || 0);
  if (gap > 0) concerns.push({ type: 'cash_flow', severity: 'warn',
    summary: 'Expenses exceed revenue by ' + Math.round(gap / 1e6) + 'M ' + tenant.currency });
  if (v.accountsOverdue30d > 0) concerns.push({ type: 'fees_overdue', severity: 'warn',
    summary: v.accountsOverdue30d + ' accounts overdue 30+ days, ' +
             Math.round((v.overdueAmount || 0) / 1000) + 'K ' + tenant.currency + ' outstanding' });
  if (typeof v.feesCollectionRate === 'number' && v.feesCollectionRate < 0.85)
    concerns.push({ type: 'fee_collection_low', severity: 'info',
      summary: 'Term fee collection at ' + Math.round(v.feesCollectionRate * 100) + '% (target 85%)' });
  if (typeof v.attendanceWeek === 'number' && v.attendanceWeek < 0.92)
    concerns.push({ type: 'attendance_dip', severity: 'info',
      summary: 'Weekly attendance ' + Math.round(v.attendanceWeek * 100) + '% (target 92%), ' +
               (v.atRiskStudents || 0) + ' students at-risk' });
  if (v.enrollmentInquiries > 0) concerns.push({ type: 'enrollment_pipeline', severity: 'info',
    summary: v.enrollmentInquiries + ' new enrollment inquiries waiting in WhatsApp' });
  return concerns;
}

// Ask Llama to write the brief in Nia's voice. Falls back to a plain
// template if AI is unavailable.
async function composeBrief(env, kind, tenants, actions) {
  const findings = tenants.map(t => ({
    name: t.name,
    concerns: serverEvaluate(t),
  })).filter(f => f.concerns.length > 0);

  if (findings.length === 0 && kind !== 'weekly') {
    return null; // nothing to report; stay silent
  }

  const factsBlock = findings.map(f =>
    f.name + ':\n' + f.concerns.map(c => '  - ' + c.summary).join('\n')
  ).join('\n\n');

  const greeting = kind === 'morning' ? 'Morning Hudson.' :
                   kind === 'weekly'  ? 'Friday wrap.' :
                                        'Quick check Hudson.';

  const sysPrompt = "You are Nia, Hudson's Chief of Staff. Write ONE short WhatsApp brief (under 320 chars). Open with the greeting. Structure: (1) what you noticed, (2) what YOU already did about it (the actions), (3) what needs Hudson's input. Warm but direct. CEO tone. Use 'I' for things you did.";

  const actionsBlock = (actions && actions.length)
    ? '\n\nActions I already took:\n' + actions.map(a => '  - ' + a.humanReadable).join('\n')
    : '';

  const userPrompt = greeting + '\n\nFacts:\n' + factsBlock + actionsBlock + '\n\nWrite the brief now.';

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });
    const text = (result.result || result).response || '';
    if (text && text.trim()) return text.trim();
  } catch (e) {
    // fall through to template
  }
  // Template fallback
  return greeting + ' ' + findings.map(f =>
    f.name + ': ' + f.concerns.slice(0, 2).map(c => c.summary).join('; ')
  ).join(' | ') + ' — want drafts?';
}

async function sendToHudson(env, text) {
  const token   = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_ID;
  const to      = env.HUDSON_PHONE;
  if (!token || !phoneId || !to) {
    console.log('[Nia Always On] WhatsApp not configured. Brief was:\n' + text);
    return { sent: false, reason: 'whatsapp_not_configured', text };
  }
  try {
    const res = await fetch('https://graph.facebook.com/v20.0/' + phoneId + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: String(to).replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: text },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.log('[Nia Always On] Meta error: ' + JSON.stringify(data));
      return { sent: false, reason: 'meta_error', meta: data, text };
    }
    return { sent: true, messageId: data.messages && data.messages[0] && data.messages[0].id, text };
  } catch (e) {
    console.log('[Nia Always On] fetch failed: ' + (e.message || e));
    return { sent: false, reason: 'fetch_failed', error: String(e.message || e), text };
  }
}

async function runSupervise(env, kind) {
  const tenants = await loadTenants(env);
  const briefId = 'brief-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

  // 1. Evaluate every tenant + attempt safe auto-fixes per concern
  const findings = [];
  const allActions = [];
  for (const t of tenants) {
    const concerns = serverEvaluate(t);
    if (concerns.length === 0) continue;
    const fixes = [];
    for (const c of concerns) {
      const fix = await attemptAutoFix(env, t, c);
      if (fix) {
        const entry = await logAction(env, t, c, fix, briefId);
        if (entry) allActions.push(entry);
        fixes.push(fix);
      }
    }
    findings.push({ name: t.name, tenantId: t.id, concerns, fixes });
  }

  const text = await composeBrief(env, kind, tenants, allActions);

  // ALWAYS persist the brief to KV — even quiet briefs get a record.
  // This is what Hudson sees when he opens NEXT OS.
  const brief = {
    id:        briefId,
    kind:      kind,
    text:      text || 'No new concerns. Fleet quiet.',
    findings:  findings,
    actions:   allActions,
    at:        new Date().toISOString(),
    sentToWA:  false,
    read:      false,
  };

  if (env.BRIEFS_KV) {
    try {
      await env.BRIEFS_KV.put('brief:' + brief.id, JSON.stringify(brief), {
        expirationTtl: 60 * 60 * 24 * 30, // keep 30 days
      });
      // Maintain a recent-ids index for fast list reads
      const idxRaw = await env.BRIEFS_KV.get('briefs:index');
      const idx = idxRaw ? JSON.parse(idxRaw) : [];
      idx.unshift(brief.id);
      await env.BRIEFS_KV.put('briefs:index', JSON.stringify(idx.slice(0, 200)));
    } catch (e) {
      console.log('[Nia Always On] KV write failed: ' + (e.message || e));
    }
  }

  // Best-effort WhatsApp send (silent if not configured)
  if (text) {
    const wa = await sendToHudson(env, text);
    brief.sentToWA = wa.sent;
    if (env.BRIEFS_KV && wa.sent) {
      try {
        await env.BRIEFS_KV.put('brief:' + brief.id, JSON.stringify(brief), {
          expirationTtl: 60 * 60 * 24 * 30,
        });
      } catch (e) {}
    }
  }

  console.log('[Nia Always On] ' + kind + ' brief stored. WA sent=' + brief.sentToWA);
  return { kind, briefId: brief.id, sentToWA: brief.sentToWA, text: brief.text };
}

// GET /briefs — list recent briefs from KV (newest first)
async function handleBriefsGet(request, env, cors) {
  if (!env.BRIEFS_KV) {
    return new Response(JSON.stringify({ briefs: [], error: 'KV not bound' }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  try {
    const idxRaw = await env.BRIEFS_KV.get('briefs:index');
    const ids = idxRaw ? JSON.parse(idxRaw) : [];
    const limit = 20;
    const slice = ids.slice(0, limit);
    const items = await Promise.all(slice.map(id => env.BRIEFS_KV.get('brief:' + id)));
    const briefs = items.filter(Boolean).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
    return new Response(JSON.stringify({ briefs, unreadCount: briefs.filter(b => !b.read).length }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ briefs: [], error: String(e.message || e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// POST /briefs/mark-read — body: { ids: [...] }
async function handleBriefsMarkRead(request, env, cors) {
  if (!env.BRIEFS_KV) {
    return new Response(JSON.stringify({ ok: false, error: 'KV not bound' }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const ids = Array.isArray(body.ids) ? body.ids : [];
  let updated = 0;
  for (const id of ids) {
    try {
      const raw = await env.BRIEFS_KV.get('brief:' + id);
      if (!raw) continue;
      const b = JSON.parse(raw);
      if (b.read) continue;
      b.read = true;
      await env.BRIEFS_KV.put('brief:' + id, JSON.stringify(b), {
        expirationTtl: 60 * 60 * 24 * 30,
      });
      updated++;
    } catch (e) {}
  }
  return new Response(JSON.stringify({ ok: true, updated }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Cloudflare cron entry point.
export const scheduledHandler = async (event, env, ctx) => {
  // event.cron tells us which schedule fired; default to "pulse" if unknown.
  const cron = event.cron || '';
  let kind = 'pulse';
  if (cron === '30 3 * * *') kind = 'morning';      // 6:30am EAT = 03:30 UTC
  else if (cron === '0 15 * * 5') kind = 'weekly';  // Fri 6pm EAT = 15:00 UTC
  await runSupervise(env, kind);
};

// ──────────────────────────────────────────────────────────────────────
// NIA AUTO-FIX — Safe Tier-1 actions Nia takes autonomously per concern.
// Tier-2 actions get prepared + flagged for Hudson's approval.
// Tier-3 actions are NEVER auto.
// ──────────────────────────────────────────────────────────────────────

// Compose a friendly draft message in Hudson's voice via Llama.
async function composeReminderDraft(env, tenant, concern) {
  const sysPrompt = "You are Nia drafting a warm WhatsApp message for Hudson to send to a guardian at " + tenant.name + ". Use the Charis voice: warm, never demanding, partnership not collection. Open with 'Dear Mr./Mrs. <Surname>,'. Acknowledge the relationship. State the balance factually. Offer payment options. Close warmly. Under 280 chars. Mark guardian name as [GUARDIAN_NAME] and amount as [AMOUNT] so Hudson can fill in.";
  const userPrompt = "Draft a Term 2 fee reminder. " + concern.summary;
  try {
    const r = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 220, temperature: 0.4,
    });
    return ((r.result || r).response || '').trim();
  } catch (e) {
    return 'Dear [GUARDIAN_NAME], thank you for your continued partnership with ' + tenant.name + '. This is a gentle reminder that Term 2 fees of UGX [AMOUNT] remain outstanding. Please reach out if you would like to arrange installments. Webale.';
  }
}

// Per-concern recipes. Each returns { tier, action, result, requiresApproval }
async function attemptAutoFix(env, tenant, concern) {
  const t = concern.type;

  if (t === 'fees_overdue') {
    const draft = await composeReminderDraft(env, tenant, concern);
    return {
      tier: 2, action: 'drafted_fee_reminder',
      result: 'Reminder drafted for the ' + (tenant.verticalKpis?.accountsOverdue30d || '?') + ' overdue accounts.',
      draft, requiresApproval: true,
      humanReadable: 'I drafted a warm fee reminder for the ' + (tenant.verticalKpis?.accountsOverdue30d || '?') + ' overdue guardians. Approve in the OS to open WhatsApp for each.',
    };
  }

  if (t === 'attendance_dip') {
    return {
      tier: 1, action: 'flagged_atrisk_students',
      result: 'Flagged ' + (tenant.verticalKpis?.atRiskStudents || 0) + ' at-risk students in the OS for pastoral check-in.',
      requiresApproval: false,
      humanReadable: 'I flagged ' + (tenant.verticalKpis?.atRiskStudents || 0) + ' at-risk students for pastoral check-in this week.',
    };
  }

  if (t === 'enrollment_pipeline') {
    return {
      tier: 1, action: 'categorized_inquiries',
      result: 'Tagged ' + (tenant.verticalKpis?.enrollmentInquiries || 0) + ' new inquiries with grade + intake term + parent first contact.',
      requiresApproval: false,
      humanReadable: 'I sorted the ' + (tenant.verticalKpis?.enrollmentInquiries || 0) + ' new enrollment inquiries by grade and tagged them for intake.',
    };
  }

  if (t === 'fee_collection_low') {
    return {
      tier: 1, action: 'logged_collection_trend',
      result: 'Logged collection trend for board reporting. No external action.',
      requiresApproval: false,
      humanReadable: 'I logged the term collection trend for the board report. Nothing else needed yet — give it another week.',
    };
  }

  if (t === 'cash_flow') {
    return {
      tier: 3, action: 'escalate_only',
      result: 'Cash flow gap detected. Flagged for Hudson — no auto-action (financial).',
      requiresApproval: true,
      humanReadable: 'Cash flow gap detected. I will not take any financial action — flagging this for your review.',
    };
  }

  return null;
}

// Persist an action to KV so the dashboard can show "what Nia did"
async function logAction(env, tenant, concern, fix, briefId) {
  if (!env.BRIEFS_KV || !fix) return;
  const entry = {
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    tenantId: tenant.id, tenantName: tenant.name,
    concernType: concern.type, concernSummary: concern.summary,
    tier: fix.tier, action: fix.action, result: fix.result,
    draft: fix.draft || null, requiresApproval: !!fix.requiresApproval,
    humanReadable: fix.humanReadable,
    briefId, at: new Date().toISOString(), resolved: false,
  };
  try {
    await env.BRIEFS_KV.put('action:' + entry.id, JSON.stringify(entry), {
      expirationTtl: 60 * 60 * 24 * 30,
    });
    const idxRaw = await env.BRIEFS_KV.get('actions:index');
    const idx = idxRaw ? JSON.parse(idxRaw) : [];
    idx.unshift(entry.id);
    await env.BRIEFS_KV.put('actions:index', JSON.stringify(idx.slice(0, 200)));
  } catch (e) {
    console.log('[Nia Actions] log failed: ' + (e.message || e));
  }
  return entry;
}

// GET /actions — list recent autonomous actions
async function handleActionsGet(request, env, cors) {
  if (!env.BRIEFS_KV) {
    return new Response(JSON.stringify({ actions: [] }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  try {
    const idxRaw = await env.BRIEFS_KV.get('actions:index');
    const ids = idxRaw ? JSON.parse(idxRaw) : [];
    const slice = ids.slice(0, 50);
    const items = await Promise.all(slice.map(id => env.BRIEFS_KV.get('action:' + id)));
    const actions = items.filter(Boolean).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
    return new Response(JSON.stringify({ actions, unresolvedCount: actions.filter(a => !a.resolved).length }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ actions: [], error: String(e.message || e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ──────────────────────────────────────────────────────────────────────
// SUPABASE READER — replaces TENANTS_SEED with live data when secrets set
// ──────────────────────────────────────────────────────────────────────
// Set via: wrangler secret put SUPABASE_URL --config sentinel-wrangler.toml
//          wrangler secret put SUPABASE_KEY --config sentinel-wrangler.toml
// SUPABASE_KEY must be the service_role key (bypasses RLS).
// Falls back to TENANTS_SEED if either secret is missing.

async function sbFetch(env, path) {
  const url = env.SUPABASE_URL + '/rest/v1' + path;
  const res = await fetch(url, {
    headers: {
      'apikey':        env.SUPABASE_KEY,
      'Authorization': 'Bearer ' + env.SUPABASE_KEY,
      'Accept':        'application/json',
    },
  });
  if (!res.ok) throw new Error('Supabase ' + path + ' → ' + res.status);
  return res.json();
}

// Write to Supabase via PostgREST (service_role bypasses RLS).
async function sbWrite(env, path, body, method, prefer) {
  const res = await fetch(env.SUPABASE_URL + '/rest/v1' + path, {
    method: method || 'POST',
    headers: {
      'apikey': env.SUPABASE_KEY,
      'Authorization': 'Bearer ' + env.SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': prefer || 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text(); throw new Error('Supabase write ' + path + ' → ' + res.status + ' ' + t.slice(0, 240)); }
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;   // empty body (return=minimal / 201) → null, no crash
}

// Discover a website's pages from sitemap.xml, falling back to internal links.
async function handleSitePages(target, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!target) return J({ error: 'url required' }, 400);
  let origin = ''; try { origin = new URL(target).origin; } catch (e) { return J({ error: 'bad url' }, 400); }
  let pages = [];
  try {
    const sm = await fetch(origin + '/sitemap.xml', { headers: { 'User-Agent': 'NextOS-Studio/1.0' } });
    if (sm.ok) { const xml = await sm.text(); pages = (xml.match(/<loc>([^<]+)<\/loc>/gi) || []).map(t => t.replace(/<\/?loc>/gi, '').trim()).filter(u => u.indexOf(origin) === 0); }
  } catch (e) {}
  if (pages.length === 0) {
    try {
      const res = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': 'NextOS-Studio/1.0' } });
      const html = await res.text();
      const hrefs = (html.match(/<a\b[^>]*href=["']([^"'#]+)["']/gi) || []).map(t => (t.match(/href=["']([^"'#]+)["']/i) || [])[1]).filter(Boolean);
      const set = new Set();
      hrefs.forEach(h => { try { const u = new URL(h, origin); if (u.origin === origin && !/\.(png|jpg|jpeg|gif|svg|pdf|zip|mp3|mp4|css|js)$/i.test(u.pathname)) set.add(u.origin + u.pathname.replace(/\/index\.html?$/i, '/')); } catch (e) {} });
      pages = Array.from(set);
    } catch (e) {}
  }
  pages = Array.from(new Set([origin + '/'].concat(pages))).slice(0, 60);
  const items = pages.map(u => { let p = ''; try { p = new URL(u).pathname; } catch (e) { p = u; } const name = p === '/' ? 'Home' : (p.replace(/\/$/, '').split('/').pop() || p).replace(/[-_]/g, ' ').replace(/\.html?$/i, ''); return { url: u, path: p, name: name }; });
  return J({ origin, count: items.length, pages: items });
}

// ── CMS engine: generic, schema-driven content store (one table set, all sites) ──
function sbHeaders(env, prefer) { return { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': prefer || 'return=representation' }; }
function cmsJ(o, st, cors) { return new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } }); }

// Nia saves a blueprint: replace this site's collections with the given list.
async function handleCmsBlueprint(request, env, cors) {
  if (request.method !== 'POST') return cmsJ({ ok: false, error: 'POST only' }, 405, cors);
  try {
    const b = await request.json();
    const site = String(b.site || '').trim();
    const collections = Array.isArray(b.collections) ? b.collections : [];
    if (!site || !collections.length) return cmsJ({ ok: false, error: 'site and collections required' }, 400, cors);
    // wipe + insert
    await fetch(env.SUPABASE_URL + '/rest/v1/cms_collections?site=eq.' + encodeURIComponent(site), { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') });
    const rows = collections.map((c, i) => ({ site: site, name: String(c.name || ('col' + i)).toLowerCase().replace(/[^a-z0-9_]+/g, '_'), label: c.label || c.name || ('Collection ' + i), icon: c.icon || '', fields: c.fields || [], sort: i }));
    const res = await fetch(env.SUPABASE_URL + '/rest/v1/cms_collections', { method: 'POST', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify(rows) });
    if (!res.ok) { const t = await res.text(); return cmsJ({ ok: false, error: 'insert failed: ' + t.slice(0, 200), hint: 'If the cms tables are missing, run supabase-schema-cms.sql.' }, 200, cors); }
    return cmsJ({ ok: true, site: site, collections: rows.length });
  } catch (e) { return cmsJ({ ok: false, error: String((e && e.message) || e) }, 500, cors); }
}
async function handleCmsCollections(site, env, cors) {
  if (!site) return cmsJ({ error: 'site required' }, 400, cors);
  try { const rows = await sbFetch(env, '/cms_collections?site=eq.' + encodeURIComponent(site) + '&order=sort.asc&select=name,label,icon,fields,sort'); return cmsJ({ site: site, collections: rows || [] }, 200, cors); }
  catch (e) { return cmsJ({ error: String((e && e.message) || e) }, 200, cors); }
}
async function handleCmsItems(site, collection, env, cors) {
  if (!site || !collection) return cmsJ({ error: 'site and collection required' }, 400, cors);
  try { const rows = await sbFetch(env, '/cms_items?site=eq.' + encodeURIComponent(site) + '&collection=eq.' + encodeURIComponent(collection) + '&order=created_at.desc&select=id,data,status,created_at,updated_at'); return cmsJ({ site: site, collection: collection, items: rows || [] }, 200, cors); }
  catch (e) { return cmsJ({ error: String((e && e.message) || e) }, 200, cors); }
}
async function handleCmsItemSave(request, env, cors) {
  if (request.method !== 'POST') return cmsJ({ ok: false, error: 'POST only' }, 405, cors);
  try {
    const b = await request.json();
    const site = String(b.site || '').trim(); const collection = String(b.collection || '').trim();
    if (!site || !collection) return cmsJ({ ok: false, error: 'site and collection required' }, 400, cors);
    const data = b.data || {};
    if (b.id) {
      const res = await fetch(env.SUPABASE_URL + '/rest/v1/cms_items?id=eq.' + encodeURIComponent(b.id), { method: 'PATCH', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify({ data: data, status: b.status || 'published', updated_at: new Date().toISOString() }) });
      const j = await res.json(); return cmsJ({ ok: res.ok, item: Array.isArray(j) ? j[0] : j }, 200, cors);
    } else {
      const res = await fetch(env.SUPABASE_URL + '/rest/v1/cms_items', { method: 'POST', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify({ site: site, collection: collection, data: data, status: b.status || 'published' }) });
      const j = await res.json(); return cmsJ({ ok: res.ok, item: Array.isArray(j) ? j[0] : j }, 200, cors);
    }
  } catch (e) { return cmsJ({ ok: false, error: String((e && e.message) || e) }, 500, cors); }
}
async function handleCmsItemDelete(request, env, cors) {
  if (request.method !== 'POST') return cmsJ({ ok: false, error: 'POST only' }, 405, cors);
  try { const b = await request.json(); if (!b.id) return cmsJ({ ok: false, error: 'id required' }, 400, cors);
    await fetch(env.SUPABASE_URL + '/rest/v1/cms_items?id=eq.' + encodeURIComponent(b.id), { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') });
    return cmsJ({ ok: true }, 200, cors);
  } catch (e) { return cmsJ({ ok: false, error: String((e && e.message) || e) }, 500, cors); }
}

// Commit an edited page to a GitHub repo (real deploy via the site's GitHub->Hostinger/Cloudflare pipeline).
async function handlePublish(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (request.method !== 'POST') return J({ ok: false, error: 'POST only' }, 405);
  const tok = env.GITHUB_TOKEN;
  if (!tok) return J({ ok: false, error: 'GitHub not configured: set GITHUB_TOKEN as a Cloudflare secret (a token with repo Contents write).' });
  try {
    const b = await request.json();
    const repo = String(b.repo || '').trim();
    let branch = String(b.branch || '').trim();
    const path = String(b.path || '').replace(/^\//, '').trim();
    const html = b.html || '';
    if (!repo || !path) return J({ ok: false, error: 'repo (owner/name) and path are required' }, 400);
    const hdr = { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/vnd.github+json', 'User-Agent': 'NextOS-Studio', 'Content-Type': 'application/json' };
    // Step 1 — repo access + default branch
    const rr = await fetch('https://api.github.com/repos/' + repo, { headers: hdr });
    if (!rr.ok) {
      const t = await rr.text();
      const msg = rr.status === 404
        ? ('Repo not reachable (404). Either the name "' + repo + '" is off, or the token cannot access it. The token must belong to / be scoped to "' + repo.split('/')[0] + '" with Contents: read & write.')
        : (rr.status === 401 ? 'Token rejected (401) — it is invalid or expired. Regenerate and update the Cloudflare GITHUB_TOKEN secret.'
        : ('GitHub ' + rr.status + ': ' + t.slice(0, 160)));
      return J({ ok: false, step: 'repo-access', status: rr.status, error: msg });
    }
    const rj = await rr.json();
    if (!branch) branch = rj.default_branch || 'main';
    // Step 2 — current file sha (if it exists)
    const api = 'https://api.github.com/repos/' + repo + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
    let sha;
    const cur = await fetch(api + '?ref=' + encodeURIComponent(branch), { headers: hdr });
    if (cur.ok) { const j = await cur.json(); sha = j.sha; }
    // Step 3 — commit
    const content = btoa(unescape(encodeURIComponent(html)));
    const put = await fetch(api, { method: 'PUT', headers: hdr, body: JSON.stringify({ message: b.message || 'Edit via NEXT Studio', content: content, branch: branch, sha: sha }) });
    const pj = await put.json();
    if (!put.ok) return J({ ok: false, step: 'commit', status: put.status, branch: branch, error: (pj.message || ('HTTP ' + put.status)) + ' (branch: ' + branch + ', path: ' + path + ')' });
    return J({ ok: true, commit: (pj.commit && pj.commit.sha) || null, repo: repo, path: path, branch: branch });
  } catch (e) { return J({ ok: false, error: String((e && e.message) || e) }, 500); }
}

// Fetch a page's HTML for the Studio editor. Injects <base> so relative assets/links resolve.
async function handleFetchPage(target, cors) {
  if (!target) return new Response('url required', { status: 400, headers: cors });
  try {
    const res = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': 'NextOS-Studio/1.0 (+https://nextafrica.ai)' } });
    let html = await res.text();
    const origin = (function () { try { return new URL(res.url || target).origin; } catch (e) { return ''; } })();
    if (origin) {
      const baseTag = '<base href="' + origin + '/">';
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, '<head$1>' + baseTag);
      else html = baseTag + html;
    }
    return new Response(html, { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (e) {
    return new Response('Could not fetch: ' + String((e && e.message) || e), { status: 200, headers: cors });
  }
}

// ── Google service-account auth: sign a JWT (RS256) and exchange for an access token ──
let _gTok = { token: null, exp: 0, scope: '' };
function b64url(bytes) { let s = btoa(String.fromCharCode.apply(null, bytes)); return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function importPkcs8(pem) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}
async function handleSendOtp(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured on the worker.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad request body' }, 400); }
  const email = (b.email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return J({ error: 'A valid email is required.' }, 400);
  const redirectTo = (b.redirectTo || '').trim();
  let otpUrl = env.SUPABASE_URL + '/auth/v1/otp';
  if (/^https?:\/\//.test(redirectTo)) otpUrl += '?redirect_to=' + encodeURIComponent(redirectTo);
  try {
    const r = await fetch(otpUrl, {
      method: 'POST',
      headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, create_user: true }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return J({ error: (d.msg || d.error_description || d.error || ('Could not send code (' + r.status + ')')) }, 200);
    return J({ ok: true, email: email });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleVerifyOtp(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured on the worker.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad request body' }, 400); }
  const email = (b.email || '').trim().toLowerCase();
  const token = String(b.token || b.code || '').trim();
  if (!email || !token) return J({ error: 'Email and code are required.' }, 400);
  try {
    const r = await fetch(env.SUPABASE_URL + '/auth/v1/verify', {
      method: 'POST',
      headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, token: token, type: 'email' }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) return J({ error: (d.msg || d.error_description || 'Invalid or expired code.') }, 200);
    return J({ ok: true, email: (d.user && d.user.email) || email, access_token: d.access_token, expires_at: d.expires_at || null, user_id: (d.user && d.user.id) || null });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleStudentsList(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured on the worker.' }, 500);
  try {
    const rows = await sbFetch(env, '/students?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=id,name,stream,guardian_name,guardian_phone,status,enrolled_at&order=name.asc&limit=3000');
    return J({ tenant, count: (rows || []).length, students: rows || [] });
  } catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}

async function handleStudentsImport(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured on the worker.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad request body' }, 400); }
  const tenant = String(b.tenant_id || b.tenant || '').trim();
  const list = Array.isArray(b.students) ? b.students : [];
  if (!tenant) return J({ error: 'tenant_id required' }, 400);
  if (!list.length) return J({ error: 'No students provided.' }, 400);
  const clean = [];
  for (const s of list) {
    const name = (s.name || '').toString().trim();
    if (!name) continue;
    clean.push({
      tenant_id: tenant,
      name: name.slice(0, 120),
      stream: ((s.stream || '').toString().trim().slice(0, 16)) || null,
      guardian_name: ((s.guardian_name || s.guardian || '').toString().trim().slice(0, 120)) || null,
      guardian_phone: ((s.guardian_phone || s.phone || '').toString().trim().slice(0, 32)) || null,
      status: 'active',
    });
  }
  if (!clean.length) return J({ error: 'No valid rows — every student needs a name.' }, 400);
  try {
    let skipped = 0;
    const existing = await sbFetch(env, '/students?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=name,stream&limit=5000');
    const seen = new Set((existing || []).map(x => ((x.name || '').toLowerCase() + '|' + ((x.stream || '').toLowerCase()))));
    const filtered = clean.filter(r => { const k = r.name.toLowerCase() + '|' + ((r.stream || '').toLowerCase()); if (seen.has(k)) { skipped++; return false; } seen.add(k); return true; });
    if (!filtered.length) return J({ ok: true, imported: 0, skipped, message: 'All rows already exist.' });
    let imported = 0;
    for (let i = 0; i < filtered.length; i += 500) {
      await sbWrite(env, '/students', filtered.slice(i, i + 500), 'POST', 'return=minimal');
      imported += Math.min(500, filtered.length - i);
    }
    return J({ ok: true, imported, skipped });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleFeesImport(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured on the worker.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad request body' }, 400); }
  const tenant = String(b.tenant_id || b.tenant || '').trim();
  const term = (String(b.term || '').trim()) || 'Term';
  const rows = Array.isArray(b.rows) ? b.rows : [];
  if (!tenant) return J({ error: 'tenant_id required' }, 400);
  if (!rows.length) return J({ error: 'No fee rows provided.' }, 400);
  try {
    const students = (await sbFetch(env, '/students?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=id,name,stream&limit=20000')) || [];
    if (!students.length) return J({ ok: true, imported: 0, matched: 0, unmatched: rows.map(r => r.name).filter(Boolean), message: 'No students in this school yet. Import students first, then import their fees.' });
    const byKey = new Map();    // name|stream -> id
    const byName = new Map();   // name -> { id, amb }
    for (const st of students) {
      const nm = (st.name || '').toLowerCase().trim();
      const sm = (st.stream || '').toLowerCase().trim();
      byKey.set(nm + '|' + sm, st.id);
      const cur = byName.get(nm); if (cur) cur.amb = true; else byName.set(nm, { id: st.id, amb: false });
    }
    const inserts = []; const matchedIds = new Set(); const unmatched = [];
    for (const r of rows) {
      const nm = (r.name || '').toString().toLowerCase().trim(); if (!nm) continue;
      const sm = (r.stream || '').toString().toLowerCase().trim();
      let sid = byKey.get(nm + '|' + sm);
      if (!sid) { const bn = byName.get(nm); if (bn && !bn.amb) sid = bn.id; }
      if (!sid) { unmatched.push(r.name); continue; }
      matchedIds.add(sid);
      const charge = Math.round(Number(r.charge || 0));
      const paid = Math.round(Number(r.paid || 0));
      if (charge > 0) inserts.push({ tenant_id: tenant, student_id: sid, term, kind: 'charge', amount: charge, notes: 'Imported' });
      if (paid > 0) inserts.push({ tenant_id: tenant, student_id: sid, term, kind: 'payment', amount: -Math.abs(paid), channel: (r.channel || null), notes: 'Imported' });
    }
    if (!inserts.length) return J({ ok: true, imported: 0, matched: 0, unmatched, message: unmatched.length ? 'No rows matched a student. Check the name spelling, or import those students first.' : 'Nothing to import — set a term fee or amount paid.' });
    // idempotent: clear any prior fees for this exact term on matched students, then insert fresh
    const ids = Array.from(matchedIds);
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const q = '/fees?tenant_id=eq.' + encodeURIComponent(tenant) + '&term=eq.' + encodeURIComponent(term) + '&student_id=in.(' + chunk.join(',') + ')';
      try { await fetch(env.SUPABASE_URL + '/rest/v1' + q, { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') }); } catch (e) {}
    }
    let imported = 0;
    for (let i = 0; i < inserts.length; i += 500) { await sbWrite(env, '/fees', inserts.slice(i, i + 500), 'POST', 'return=minimal'); imported += Math.min(500, inserts.length - i); }
    return J({ ok: true, imported, matched: matchedIds.size, students: matchedIds.size, term, unmatched });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleOsDataList(tenant, kind, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!kind) return J({ error: 'kind required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant || 'next') + '&kind=eq.' + encodeURIComponent(kind) + '&select=id,payload,created_at&order=created_at.desc&limit=1000'); return J({ tenant: tenant || 'next', kind, records: rows || [] }); }
  catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}
async function handleOsDataSave(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const kind = String(b.kind || '').trim(); const tenant = String(b.tenant || 'next').trim(); const rec = b.record || {}; const id = b.id;
  if (!kind) return J({ error: 'kind required' }, 400);
  try {
    if (id) {
      const r = await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify({ payload: rec }) });
      const d = await r.json(); return J({ ok: true, record: (d && d[0]) || { payload: rec } });
    }
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/os_records', { method: 'POST', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify({ tenant, kind, payload: rec }) });
    const d = await r.json(); return J({ ok: true, record: (d && d[0]) || { payload: rec } });
  } catch (x) { return J({ error: String((x && x.message) || x) }, 200); }
}

async function handleConfigGet(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/school_config?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=type,classes,subjects,combinations&limit=1'); return J({ tenant, config: (rows && rows[0]) || null }); }
  catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}
async function handleConfigSave(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const c = b.config || b; const tenant = String(b.tenant_id || c.tenant_id || '').trim();
  if (!tenant) return J({ error: 'tenant_id required' }, 400);
  const row = { tenant_id: tenant, type: c.type || 'primary', classes: c.classes || [], subjects: c.subjects || [], combinations: c.combinations || [], updated_at: new Date().toISOString() };
  try { const r = await fetch(env.SUPABASE_URL + '/rest/v1/school_config?on_conflict=tenant_id', { method: 'POST', headers: sbHeaders(env, 'resolution=merge-duplicates,return=representation'), body: JSON.stringify(row) }); const d = await r.json(); return J({ ok: true, config: (d && d[0]) || row }); }
  catch (x) { return J({ error: String((x && x.message) || x) }, 200); }
}

async function handleFinanceList(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/school_finance?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=id,kind,category,description,amount,method,occurred_at,created_by&order=occurred_at.desc&limit=1000'); return J({ tenant, transactions: rows || [] }); }
  catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}
async function handleFinanceSave(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const t = b.txn || b; const tenant = String(b.tenant_id || t.tenant_id || '').trim();
  if (!tenant || !t.kind || !(Number(t.amount) > 0)) return J({ error: 'tenant_id, kind and amount required' }, 400);
  const row = { tenant_id: tenant, kind: t.kind, category: t.category || 'other', description: (t.description || '').slice(0, 200), amount: Number(t.amount), method: t.method || null, occurred_at: t.occurred_at || new Date().toISOString().slice(0, 10), created_by: t.created_by || null };
  try { const r = await fetch(env.SUPABASE_URL + '/rest/v1/school_finance', { method: 'POST', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify(row) }); const d = await r.json(); return J({ ok: true, txn: (d && d[0]) || row }); }
  catch (x) { return J({ error: String((x && x.message) || x) }, 200); }
}
async function handleAssetsList(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/school_assets?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=id,name,category,value,condition,acquired,notes&order=value.desc&limit=500'); return J({ tenant, assets: rows || [] }); }
  catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}
async function handleAssetSave(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const a = b.asset || b; const tenant = String(b.tenant_id || a.tenant_id || '').trim();
  if (!tenant || !a.name) return J({ error: 'tenant_id and name required' }, 400);
  const row = { tenant_id: tenant, name: String(a.name).slice(0, 140), category: a.category || 'other', value: Number(a.value) || 0, condition: a.condition || 'good', acquired: a.acquired || null, notes: (a.notes || '').slice(0, 200) };
  try { const r = await fetch(env.SUPABASE_URL + '/rest/v1/school_assets', { method: 'POST', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify(row) }); const d = await r.json(); return J({ ok: true, asset: (d && d[0]) || row }); }
  catch (x) { return J({ error: String((x && x.message) || x) }, 200); }
}

async function handleEventsList(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/school_events?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=id,title,date,type&order=date.asc&limit=400'); return J({ tenant, events: rows || [] }); }
  catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}
async function handleEventSave(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const e = b.event || b; const tenant = String(b.tenant_id || e.tenant_id || '').trim();
  if (!tenant || !e.title || !e.date) return J({ error: 'tenant_id, title and date required' }, 400);
  const row = { tenant_id: tenant, title: String(e.title).slice(0, 140), date: e.date, type: e.type || 'event' };
  try { const r = await fetch(env.SUPABASE_URL + '/rest/v1/school_events', { method: 'POST', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify(row) }); const d = await r.json(); return J({ ok: true, event: (d && d[0]) || row }); }
  catch (x) { return J({ error: String((x && x.message) || x) }, 200); }
}

async function handleStaffStatus(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try {
    const teachers = await sbFetch(env, '/teachers?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=id,full_name,subjects,status&order=full_name.asc&limit=300');
    const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10); // EAT day
    const checkins = await sbFetch(env, '/teacher_checkins?tenant_id=eq.' + encodeURIComponent(tenant) + '&checked_in_at=gte.' + today + 'T00:00:00&select=teacher_id,checked_in_at,checked_out_at&order=checked_in_at.desc&limit=800');
    const latest = {}; (checkins || []).forEach(c => { if (!latest[c.teacher_id]) latest[c.teacher_id] = c; });
    const staff = (teachers || []).map(t => {
      const c = latest[t.id]; let status = 'absent — not checked in today';
      if (c) { const eat = new Date(new Date(c.checked_in_at).getTime() + 3 * 3600000); const hm = eat.toISOString().slice(11, 16); status = (hm > '07:30') ? ('LATE — in at ' + hm) : ('on time — in at ' + hm); if (c.checked_out_at) status += ' (checked out)'; }
      return { name: t.full_name, subjects: t.subjects, status };
    });
    return J({ tenant, today, staff });
  } catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}
async function handleStudentHealth(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try {
    const studs = await sbFetch(env, '/students?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=id,name,stream&limit=3000');
    if (!studs || !studs.length) return J({ tenant, health: [] });
    const byId = {}; studs.forEach(s => byId[s.id] = s);
    const ids = studs.map(s => s.id);
    let recs = [];
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const r = await sbFetch(env, '/student_health_records?student_id=in.(' + chunk.join(',') + ')&resolved_at=is.null&select=student_id,category,severity,description,recorded_at,follow_up_needed&order=recorded_at.desc&limit=200');
      recs = recs.concat(r || []);
    }
    const health = recs.slice(0, 80).map(h => { const s = byId[h.student_id] || {}; return { name: s.name, stream: s.stream, category: h.category, severity: h.severity, description: h.description, recorded_at: h.recorded_at, follow_up: h.follow_up_needed }; });
    return J({ tenant, health });
  } catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}

async function handleFeesBalances(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try {
    const rows = await sbFetch(env, '/fees?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=student_id,amount&limit=20000');
    const bal = {};
    (rows || []).forEach(r => { bal[r.student_id] = (bal[r.student_id] || 0) + Number(r.amount || 0); });
    return J({ tenant, balances: bal });
  } catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}

async function handleExamsList(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/exams?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=*&order=created_at.desc&limit=200'); return J({ tenant, exams: rows || [] }); }
  catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}
async function handleExamSave(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const e = b.exam || b; const tenant = String(b.tenant_id || e.tenant_id || '').trim();
  if (!tenant || !e.name) return J({ error: 'tenant_id and exam name required' }, 400);
  const row = { tenant_id: tenant, name: String(e.name).slice(0, 120), term: e.term || null, year: e.year || null, level: e.level || 'primary', subjects: e.subjects || [], core: e.core || [], config: e.config || {} };
  try {
    if (e.id) {
      const r = await fetch(env.SUPABASE_URL + '/rest/v1/exams?id=eq.' + encodeURIComponent(e.id), { method: 'PATCH', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify(row) });
      const d = await r.json(); return J({ ok: true, exam: (d && d[0]) || row });
    } else {
      const r = await fetch(env.SUPABASE_URL + '/rest/v1/exams', { method: 'POST', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify(row) });
      const d = await r.json(); return J({ ok: true, exam: (d && d[0]) || row });
    }
  } catch (x) { return J({ error: String((x && x.message) || x) }, 200); }
}
async function handleResultsList(tenant, exam, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant || !exam) return J({ error: 'tenant and exam required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/exam_results?tenant_id=eq.' + encodeURIComponent(tenant) + '&exam_id=eq.' + encodeURIComponent(exam) + '&select=student_id,marks&limit=5000'); return J({ exam, results: rows || [] }); }
  catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}
async function handleResultsSave(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant_id || '').trim(); const examId = b.exam_id; const results = Array.isArray(b.results) ? b.results : [];
  if (!tenant || !examId) return J({ error: 'tenant_id and exam_id required' }, 400);
  if (!results.length) return J({ error: 'no results' }, 400);
  const rows = results.filter(r => r.student_id != null).map(r => ({ tenant_id: tenant, exam_id: examId, student_id: r.student_id, marks: r.marks || {}, updated_at: new Date().toISOString() }));
  try {
    let saved = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      await fetch(env.SUPABASE_URL + '/rest/v1/exam_results?on_conflict=exam_id,student_id', { method: 'POST', headers: sbHeaders(env, 'resolution=merge-duplicates,return=minimal'), body: JSON.stringify(chunk) });
      saved += chunk.length;
    }
    return J({ ok: true, saved });
  } catch (x) { return J({ error: String((x && x.message) || x) }, 200); }
}

async function getGoogleToken(env, scope) {
  const now = Math.floor(Date.now() / 1000);
  if (_gTok.token && _gTok.scope === scope && _gTok.exp - 60 > now) return _gTok.token;
  const email = env.GOOGLE_SA_EMAIL;
  let pem = env.GOOGLE_SA_KEY || '';
  if (!email || !pem) throw new Error('Google not configured: set GOOGLE_SA_EMAIL and GOOGLE_SA_KEY as Cloudflare secrets.');
  pem = pem.replace(/\\n/g, '\n');
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc({ iss: email, scope: scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const key = await importPkcs8(pem);
  const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(unsigned));
  const jwt = unsigned + '.' + b64url(new Uint8Array(sig));
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt });
  const data = await res.json();
  if (!data.access_token) throw new Error('Google token error: ' + JSON.stringify(data).slice(0, 200));
  _gTok = { token: data.access_token, exp: now + (data.expires_in || 3600), scope };
  return data.access_token;
}

// Google Search Console: top queries + striking-distance keywords for a site.
async function handleGsc(site, days, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!site) return J({ error: 'site required (e.g. sc-domain:fathersarize.org)' }, 400);
  days = Math.min(180, Math.max(1, days || 28));
  const end = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const start = new Date(Date.now() - (days + 2) * 86400000).toISOString().slice(0, 10);
  try {
    const tok = await getGoogleToken(env, 'https://www.googleapis.com/auth/webmasters.readonly');
    const r = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(site) + '/searchAnalytics/query', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions: ['query'], rowLimit: 50 }),
    });
    const d = await r.json();
    if (d.error) return J({ error: (d.error.message || 'GSC error'), site });
    const rows = (d.rows || []).map(x => ({ query: x.keys[0], clicks: x.clicks, impressions: x.impressions, ctr: +(x.ctr * 100).toFixed(1), position: +x.position.toFixed(1) }));
    const totals = { clicks: rows.reduce((s, r) => s + r.clicks, 0), impressions: rows.reduce((s, r) => s + r.impressions, 0) };
    const striking = rows.filter(r => r.position >= 5 && r.position <= 15).sort((a, b) => b.impressions - a.impressions).slice(0, 8);
    return J({ site, start, end, totals, top: rows.slice(0, 20), striking, checkedAt: new Date().toISOString() });
  } catch (e) { return J({ error: String((e && e.message) || e), site }); }
}

// Google Analytics 4: users / sessions / pageviews / conversions by channel.
async function handleGa4(property, days, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!property) return J({ error: 'property id required (numeric GA4 property id)' }, 400);
  days = Math.min(365, Math.max(1, days || 28));
  try {
    const tok = await getGoogleToken(env, 'https://www.googleapis.com/auth/analytics.readonly');
    const r = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + encodeURIComponent(property) + ':runReport', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateRanges: [{ startDate: days + 'daysAgo', endDate: 'today' }], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'conversions' }], limit: 10 }),
    });
    const d = await r.json();
    if (d.error) return J({ error: (d.error.message || 'GA4 error'), property });
    const channels = (d.rows || []).map(row => ({ channel: row.dimensionValues[0].value, users: +row.metricValues[0].value, sessions: +row.metricValues[1].value, pageviews: +row.metricValues[2].value, conversions: +row.metricValues[3].value }));
    const tot = channels.reduce((a, c) => ({ users: a.users + c.users, sessions: a.sessions + c.sessions, pageviews: a.pageviews + c.pageviews, conversions: a.conversions + c.conversions }), { users: 0, sessions: 0, pageviews: 0, conversions: 0 });
    return J({ property, days, totals: tot, channels, checkedAt: new Date().toISOString() });
  } catch (e) { return J({ error: String((e && e.message) || e), property }); }
}

// First-party analytics tracker served at /px.js. Install on a site with:
//   <script defer src="https://nextos-sentinel.nextafricaai.workers.dev/px.js?s=YOURDOMAIN.com"></script>
// Then call window.nxTrack('signin'|'conversion', 'label', value) on key actions.
const PX_JS = "(function(){try{var el=document.currentScript||document.querySelector('script[src*=\"/px.js\"]');var site=null;if(el){try{site=new URL(el.src,location.href).searchParams.get('s');}catch(e){}}site=site||location.hostname.replace(/^www\\./,'');var EP='https://nextos-sentinel.nextafricaai.workers.dev/collect';function sid(){try{var k='nx_sid',v=sessionStorage.getItem(k);if(!v){v=Date.now().toString(36)+Math.random().toString(36).slice(2,8);sessionStorage.setItem(k,v);}return v;}catch(e){return 'na';}}function send(type,label,value){try{var body=JSON.stringify({site:site,type:type,path:location.pathname,ref:document.referrer||'',session:sid(),label:label||null,value:(value!=null?value:null)});if(navigator.sendBeacon){var ok=navigator.sendBeacon(EP,body);if(ok)return;}fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}).catch(function(){});}catch(e){}}window.nxTrack=function(type,label,value){send(type||'event',label,value);};send('pageview');}catch(e){}})();";

// Receive one analytics event from a site. Inserts via service_role (browser sends no keys).
async function handleCollect(request, env, cors) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    const raw = await request.text();
    const b = raw ? JSON.parse(raw) : {};
    if (!b.site) return new Response('{}', { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    const row = {
      site: String(b.site).slice(0, 120),
      type: String(b.type || 'pageview').slice(0, 24),
      path: (b.path || '').slice(0, 300),
      referrer: (b.ref || b.referrer || '').slice(0, 300),
      session: (b.session || '').slice(0, 60),
      label: b.label ? String(b.label).slice(0, 80) : null,
      value: (b.value != null && !isNaN(Number(b.value))) ? Number(b.value) : null,
      country: (request.cf && request.cf.country) || null,
      ua: (request.headers.get('user-agent') || '').slice(0, 200),
    };
    await sbWrite(env, '/site_events', row, 'POST', 'return=minimal');
    return new Response(null, { status: 204, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e && e.message) || e) }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
}

// Aggregate events for one site over N days.
async function handleAnalytics(site, days, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!site) return J({ error: 'site required' }, 400);
  days = Math.min(90, Math.max(1, days || 7));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let rows = [];
  try {
    rows = (await sbFetch(env, '/site_events?site=eq.' + encodeURIComponent(site) + '&ts=gte.' + encodeURIComponent(since) + '&select=type,path,referrer,session,label,value,ts&order=ts.desc&limit=20000')) || [];
  } catch (e) { return J({ error: String((e && e.message) || e), site, days }); }
  const pv = rows.filter(r => r.type === 'pageview');
  const sessions = new Set(pv.map(r => r.session).filter(Boolean));
  const byType = {}; rows.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1; });
  const tally = (arr, key, norm) => { const m = {}; arr.forEach(r => { let k = (r[key] || '').trim(); if (norm) k = norm(k); if (!k) k = '(none)'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => ({ name: e[0], count: e[1] })); };
  const refHost = (u) => { if (!u) return '(direct)'; try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u.slice(0, 40); } };
  const daily = {}; for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); daily[d] = 0; }
  pv.forEach(r => { const d = (r.ts || '').slice(0, 10); if (d in daily) daily[d]++; });
  const conversions = rows.filter(r => r.type === 'conversion' || r.type === 'purchase');
  const revenue = conversions.reduce((s, r) => s + (Number(r.value) || 0), 0);
  return J({
    site, days, since,
    pageviews: pv.length,
    visitors: sessions.size,
    signins: (byType.signin || 0) + (byType.login || 0),
    signups: byType.signup || 0,
    conversions: conversions.length,
    revenue: revenue,
    byType,
    topPages: tally(pv, 'path'),
    topReferrers: tally(pv, 'referrer', refHost),
    daily: Object.entries(daily).map(e => ({ date: e[0], pv: e[1] })),
    checkedAt: new Date().toISOString(),
  });
}

// SEO + performance audit: fetch the page HTML and grade on-page basics.
async function handleSeoAudit(target, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!target) return J({ error: 'url required' }, 400);
  let html = '', status = null, ms = null, finalUrl = target;
  try {
    const t0 = Date.now();
    const res = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': 'NextOS-SEO-Bot/1.0' } });
    ms = Date.now() - t0; status = res.status; finalUrl = res.url || target;
    html = await res.text();
  } catch (e) { return J({ error: 'Could not fetch: ' + String((e && e.message) || e).slice(0, 100) }); }
  const pick = (re) => { const m = html.match(re); return m ? m[1].trim() : ''; };
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let metaDesc = pick(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (!metaDesc) metaDesc = pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  const canonical = !!pick(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
  const ogImage = /<meta[^>]+property=["']og:image["']/i.test(html);
  const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const lang = pick(/<html[^>]+lang=["']([^"']+)["']/i);
  const imgs = (html.match(/<img\b[^>]*>/gi) || []);
  const imgsNoAlt = imgs.filter(t => !/\balt=/i.test(t)).length;
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  const https = /^https:/i.test(finalUrl);
  const issues = [];
  const add = (sev, msg, tip) => issues.push({ sev, msg, tip });
  if (!title) add('high', 'No <title> tag', 'Add a unique 50-60 character title with your main keyword.');
  else if (title.length < 15) add('med', 'Title very short (' + title.length + ' chars)', 'Aim for 50-60 chars describing the page + a keyword.');
  else if (title.length > 65) add('low', 'Title long (' + title.length + ' chars)', 'Trim to ~60 chars so Google does not cut it off.');
  if (!metaDesc) add('high', 'No meta description', 'Add a 140-160 char description - it is your ad copy in search results.');
  else if (metaDesc.length < 70) add('low', 'Meta description short', 'Expand to 140-160 chars with a clear value + call to action.');
  if (h1s === 0) add('high', 'No <h1> heading', 'Add exactly one <h1> stating the page main topic.');
  else if (h1s > 1) add('med', h1s + ' <h1> tags', 'Use only one <h1>; make the rest <h2>/<h3>.');
  if (!viewport) add('high', 'No mobile viewport tag', 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> - Google is mobile-first.');
  if (noindex) add('high', 'Page set to noindex', 'Remove the noindex robots tag or Google will not list this page.');
  if (!https) add('high', 'Not served over HTTPS', 'Enable SSL (free on Hostinger) - required for ranking + trust.');
  if (!canonical) add('low', 'No canonical link', 'Add <link rel="canonical"> to avoid duplicate-content confusion.');
  if (!ogTitle || !ogImage) add('med', 'Missing Open Graph tags', 'Add og:title, og:description, og:image so shared links look good on WhatsApp/Facebook.');
  if (!lang) add('low', 'No <html lang>', 'Add lang="en" to <html> for accessibility + locale signal.');
  if (imgsNoAlt > 0) add('low', imgsNoAlt + ' image(s) missing alt text', 'Add descriptive alt="" to images - helps SEO + accessibility.');
  if (words < 150) add('med', 'Thin content (' + words + ' words)', 'Add more useful copy - aim for 300+ words of real content.');
  if (ms != null && ms > 3000) add('med', 'Slow load (' + ms + 'ms)', 'Compress images, enable Hostinger LiteSpeed cache; speed affects ranking.');
  const score = Math.max(0, 100 - issues.reduce((a, i) => a + (i.sev === 'high' ? 18 : i.sev === 'med' ? 9 : 4), 0));
  return J({ url: finalUrl, status, ms, score, title, titleLen: title.length, metaDesc, metaDescLen: metaDesc.length, h1s, viewport, canonical, og: (ogTitle && ogImage), https, lang, words, imgsNoAlt, issues, checkedAt: new Date().toISOString() });
}

// Live project watch: uptime (real fetch) + domain expiry (public RDAP). No keys needed.
async function handleCheckProject(target, domain, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  const out = { checkedAt: new Date().toISOString(), url: target || null, domain: domain || null, up: null, status: null, ms: null, https: null, domainExpiry: null, daysToExpiry: null, alerts: [] };
  if (target) {
    try {
      const t0 = Date.now();
      const res = await fetch(target, { method: 'GET', redirect: 'follow' });
      out.ms = Date.now() - t0; out.status = res.status; out.up = res.status < 500; out.https = /^https:/i.test(target);
      if (res.status >= 500) out.alerts.push({ type: 'critical', msg: 'Site returning ' + res.status + ' server error' });
      else if (res.status >= 400) out.alerts.push({ type: 'warning', msg: 'Site returning HTTP ' + res.status });
      else if (out.ms > 4000) out.alerts.push({ type: 'warning', msg: 'Slow response (' + out.ms + 'ms)' });
    } catch (e) { out.up = false; out.alerts.push({ type: 'critical', msg: 'Site unreachable: ' + String((e && e.message) || e).slice(0, 90) }); }
  }
  let dom = domain;
  if (!dom && target) { try { dom = new URL(target).hostname.replace(/^www\./, ''); } catch (e) {} }
  if (dom) {
    out.domain = dom;
    try {
      const r = await fetch('https://rdap.org/domain/' + encodeURIComponent(dom), { headers: { 'Accept': 'application/rdap+json' } });
      if (r.ok) {
        const j = await r.json();
        const ev = (j.events || []).find(e => /expir/i.test(e.eventAction || ''));
        if (ev && ev.eventDate) {
          out.domainExpiry = ev.eventDate;
          const days = Math.round((new Date(ev.eventDate).getTime() - Date.now()) / 86400000);
          out.daysToExpiry = days;
          if (days < 0) out.alerts.push({ type: 'critical', msg: 'Domain ' + dom + ' EXPIRED ' + Math.abs(days) + ' days ago' });
          else if (days <= 30) out.alerts.push({ type: 'warning', msg: 'Domain ' + dom + ' expires in ' + days + ' days — renew soon' });
        }
      }
    } catch (e) {}
  }
  out.health = out.alerts.some(a => a.type === 'critical') ? 'critical' : (out.alerts.length ? 'warning' : 'healthy');
  return J(out);
}

// Issue a real receipt for a tenant (service_role insert; bypasses RLS).
async function handleIssueReceipt(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    if (request.method !== 'POST') return J({ ok: false, error: 'POST only' }, 405);
    const body = await request.json().catch(() => ({}));
    const tenantId = String(body.tenant_id || '').trim();
    if (!tenantId) return J({ ok: false, error: 'tenant_id required' }, 400);
    const amount = Number(body.amount || 0);
    if (!amount || amount <= 0) return J({ ok: false, error: 'positive amount required' }, 400);
    const trows = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenantId) + '&select=name,currency');
    if (!trows || !trows[0]) return J({ ok: false, error: 'unknown tenant: ' + tenantId }, 404);
    const tname = trows[0].name || tenantId;
    const currency = trows[0].currency || 'UGX';
    const existing = (await sbFetch(env, '/receipts?tenant_id=eq.' + encodeURIComponent(tenantId) + '&select=id')) || [];
    const prefix = (String(tname).match(/[A-Za-z0-9]/g) || ['N']).slice(0, 2).join('').toUpperCase();
    const no = prefix + '-' + new Date().getFullYear() + '-' + String(existing.length + 1).padStart(5, '0');
    const phone = String(body.guardian_phone || '').replace(/[^0-9]/g, '') || null;
    const rec = {
      tenant_id: tenantId, receipt_no: no,
      student_name: body.student_name || null, guardian_name: body.guardian_name || null, guardian_phone: phone,
      amount: amount, currency: currency, kind: 'fees', method: body.method || null, reference: body.reference || null,
      balance_after: (body.balance_after != null ? Number(body.balance_after) : null), term: body.term || null,
      issued_by: body.issued_by || 'Nia',
    };
    const inserted = await sbWrite(env, '/receipts', rec, 'POST', 'return=representation');
    const saved = Array.isArray(inserted) ? inserted[0] : (inserted || rec);
    let wa = null;
    if (phone) {
      const msg = 'Dear ' + (rec.guardian_name || 'Parent') + ', we confirm receipt of ' + currency + ' ' + amount.toLocaleString() + ' for ' + (rec.student_name || 'your child') + ' at ' + tname + '. Receipt ' + no + '. Thank you.';
      wa = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
    }
    return J({ ok: true, receipt: saved, receipt_no: no, whatsappUrl: wa });
  } catch (e) {
    return J({ ok: false, error: String((e && e.message) || e) }, 500);
  }
}

// Provision a new school: tenant row + admin auth user + users link + branded link.
const LEVEL_PRESETS = {
  primary:   { classes: ['P1V','P1P','P2V','P2P','P3V','P3P','P4V','P4P','P5V','P5P','P6V','P6P','P7V','P7P'], subjects: ['English','Mathematics','Science','Social Studies'], combinations: [] },
  secondary: { classes: ['S1','S2','S3','S4','S5','S6'], subjects: ['English','Mathematics','Physics','Chemistry','Biology','Geography','History','CRE','Literature','Economics','Entrepreneurship','ICT','Agriculture','Fine Art'], combinations: [
    { name: 'PCM', subjects: ['Physics','Chemistry','Mathematics'], classes: ['S5','S6'] }, { name: 'PCB', subjects: ['Physics','Chemistry','Biology'], classes: ['S5','S6'] }, { name: 'BCM', subjects: ['Biology','Chemistry','Mathematics'], classes: ['S5','S6'] }, { name: 'HEG', subjects: ['History','Economics','Geography'], classes: ['S5','S6'] }, { name: 'HEL', subjects: ['History','Economics','Literature'], classes: ['S5','S6'] },
  ] },
  tertiary:  { classes: ['Year 1','Year 2','Year 3','Year 4'], subjects: ['Communication Skills','ICT','Research Methods','Mathematics','Entrepreneurship'], combinations: [] },
};
function detectLevel(name) {
  const n = String(name || '').toLowerCase();
  if (/universit|college|polytechnic|\binstitute\b|tertiary|campus|\bvocational\b/.test(n)) return 'tertiary';
  if (/secondary|\bhigh\b|seminary|\bs\.?s\.?s?\b|o.?level|a.?level/.test(n)) return 'secondary';
  return 'primary';
}

async function handleTeachersList(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/teachers?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=id,full_name,email,subjects,phone,status,user_id&order=full_name.asc&limit=500'); return J({ tenant, teachers: rows || [] }); }
  catch (e) { return J({ error: String((e && e.message) || e), tenant }, 200); }
}

// Verify the caller is a head/admin of this tenant (Authorization: Bearer <supabase access token>).
async function verifyHead(request, env, tenant) {
  try {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return { ok: false, why: 'no token' };
    const ur = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + token } });
    if (!ur.ok) return { ok: false, why: 'bad token' };
    const u = await ur.json();
    const email = (u && u.email) || '';
    // role check via users table
    const rows = await sbFetch(env, '/users?auth_id=eq.' + encodeURIComponent(u.id) + '&tenant_id=eq.' + encodeURIComponent(tenant) + '&select=role');
    if (rows && rows.length && /^(head|admin)$/i.test(rows[0].role || '')) return { ok: true, email };
    // fallback: this email is the tenant's registered head
    const t = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenant) + '&select=head_email');
    if (t && t.length && t[0].head_email && email && t[0].head_email.toLowerCase() === email.toLowerCase()) return { ok: true, email };
    return { ok: false, why: 'not head of this tenant' };
  } catch (e) { return { ok: false, why: String((e && e.message) || e) }; }
}

async function handleProvisionTeacher(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ ok: false, error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, error: 'bad body' }, 400); }
  const tenant = String(b.tenant_id || b.tenant || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const fullName = String(b.fullName || b.full_name || '').trim();
  const mode = (b.mode === 'invite') ? 'invite' : 'password';
  if (!tenant || !email || !fullName) return J({ ok: false, error: 'tenant_id, email and fullName are required' }, 400);
  if (email.indexOf('@') < 0) return J({ ok: false, error: 'A valid email is required to create a login.' }, 400);

  const gate = await verifyHead(request, env, tenant);
  if (!gate.ok) return J({ ok: false, error: 'Not authorised: ' + (gate.why || 'only the head teacher can add staff') }, 403);

  const subjects = Array.isArray(b.subjects) ? b.subjects : String(b.subjects || '').split(',').map(x => x.trim()).filter(Boolean);
  const site = env.SITE_URL || 'https://nextos.nextafrica.ai';
  const redirectTo = site + '/s/' + encodeURIComponent(tenant);
  try {
    let authId = null, tempPassword = null, note = '';
    if (mode === 'invite') {
      const iv = await fetch(env.SUPABASE_URL + '/auth/v1/invite', {
        method: 'POST', headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, data: { full_name: fullName, tenant_id: tenant, role: 'teacher' } }),
      });
      const ivj = await iv.json().catch(() => ({}));
      if (iv.ok && ivj && ivj.id) { authId = ivj.id; }
      else { note = (ivj && (ivj.msg || ivj.error_description || ivj.error)) || ('invite status ' + iv.status); }
    } else {
      tempPassword = 'Teach-' + Math.random().toString(36).slice(2, 8) + '-' + Math.floor(Math.random() * 90 + 10);
      const au = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users', {
        method: 'POST', headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: tempPassword, email_confirm: true, user_metadata: { full_name: fullName, tenant_id: tenant, role: 'teacher' } }),
      });
      const auj = await au.json().catch(() => ({}));
      if (au.ok && auj && auj.id) { authId = auj.id; }
      else { note = (auj && (auj.msg || auj.error_description || auj.error)) || ('auth status ' + au.status); tempPassword = null; }
    }

    let userRowId = null;
    if (authId) {
      try { const ur = await sbWrite(env, '/users', { auth_id: authId, tenant_id: tenant, email, full_name: fullName, role: 'teacher', phone: b.phone || null }, 'POST', 'return=representation'); if (Array.isArray(ur) && ur[0]) userRowId = ur[0].id; }
      catch (e) { note = 'login created, but users-link failed: ' + (e.message || e); }
    }
    // teachers row (existing columns only)
    try {
      await sbWrite(env, '/teachers', { tenant_id: tenant, user_id: userRowId, full_name: fullName, subjects: subjects, phone: b.phone || null, email, status: 'active' }, 'POST', 'return=minimal');
    } catch (e) { note = (note ? note + '; ' : '') + 'staff record: ' + (e.message || e); }

    return J({ ok: !!authId, email, mode, tempPassword: tempPassword, loginUrl: redirectTo, note: authId ? (mode === 'invite' ? 'Invite email sent. They set their own password, then sign in.' : 'Login created. Share the email + temp password.') : ('Could not create login (' + note + ').') });
  } catch (e) { return J({ ok: false, error: String((e && e.message) || e) }, 200); }
}

async function handleProvisionSchool(request, env, cors) {
  const reply = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let body;
  try { body = await request.json(); } catch (e) { return reply({ ok: false, error: 'Invalid JSON body' }, 400); }
  const { pin, name, slug, primaryColor, logoUrl, motto, adminEmail, adminName, tier, level, type } = body || {};
  const ADMIN_PIN = env.GATE_PIN || '1379';
  if (pin !== ADMIN_PIN) return reply({ ok: false, error: 'Invalid admin PIN' }, 401);
  if (!name || !adminEmail) return reply({ ok: false, error: 'name and adminEmail are required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return reply({ ok: false, error: 'Supabase not configured on the worker' }, 503);

  const id = String(slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  try {
    // 1. Upsert the tenant (idempotent on id)
    await sbWrite(env, '/tenants?on_conflict=id', {
      id, name, vertical: 'school', country: 'Uganda', currency: 'UGX',
      subdomain: id, tier: tier || 'catalyst', status: 'active',
      primary_color: primaryColor || null, logo_url: logoUrl || null, motto: motto || null,
      head_email: adminEmail, provisioned_at: new Date().toISOString(),
    }, 'POST', 'resolution=merge-duplicates,return=minimal');

    // 1b. Seed the school structure (level) so the OS shows the right classes from first login
    const lvl = (['primary','secondary','tertiary'].indexOf(String(level || type || '')) >= 0) ? String(level || type) : detectLevel(name);
    const preset = LEVEL_PRESETS[lvl] || LEVEL_PRESETS.primary;
    try {
      await sbWrite(env, '/school_config?on_conflict=tenant_id', {
        tenant_id: id, type: lvl, classes: preset.classes, subjects: preset.subjects, combinations: preset.combinations, updated_at: new Date().toISOString(),
      }, 'POST', 'resolution=merge-duplicates,return=minimal');
    } catch (e) {}

    // 2. Create the admin auth user (temp password)
    const tempPassword = 'Next-' + Math.random().toString(36).slice(2, 8) + '-' + Math.floor(Math.random()*90+10);
    let authId = null, userNote = '';
    const au = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users', {
      method: 'POST',
      headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: tempPassword, email_confirm: true }),
    });
    const auj = await au.json().catch(() => ({}));
    if (au.ok && auj && auj.id) { authId = auj.id; }
    else { userNote = (auj && (auj.msg || auj.error_description || auj.error)) || ('auth status ' + au.status); }

    // 3. Link the admin to the tenant (only if we created them fresh)
    if (authId) {
      try { await sbWrite(env, '/users', { auth_id: authId, tenant_id: id, email: adminEmail, full_name: adminName || 'Head Teacher', role: 'head' }, 'POST', 'return=minimal'); }
      catch (e) { userNote = 'tenant + auth user created, but users-link failed: ' + (e.message || e); }
    }

    // 4. Branded, shareable login link for the client
    const site = env.SITE_URL || 'https://nextos.nextafrica.ai';
    const loginUrl = site + '/s/' + encodeURIComponent(id);

    return reply({
      ok: true, tenantId: id, name, loginUrl, adminEmail, level: lvl,
      tempPassword: authId ? tempPassword : null,
      note: authId ? 'School created. Share the link + temp password with the head teacher.'
                   : 'School created/updated. Admin login not set automatically (' + userNote + ') — set the password in Supabase.',
    });
  } catch (e) {
    return reply({ ok: false, error: String(e && e.message || e) }, 500);
  }
}

// Fetch a tenant + compute its verticalKpis from live tables
async function loadTenantsFromSupabase(env) {
  const tenants = await sbFetch(env, '/tenants?select=*');
  if (!tenants || tenants.length === 0) return [];

  const enriched = [];
  for (const t of tenants) {
    const tid = '?tenant_id=eq.' + encodeURIComponent(t.id);
    const [students, fees, attendance, enrollments] = await Promise.all([
      sbFetch(env, '/students' + tid + '&status=eq.active&select=id,name,stream'),
      sbFetch(env, '/fees' + tid + '&select=student_id,kind,amount'),
      sbFetch(env, '/attendance' + tid + '&date=gte.' + new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) + '&select=student_id,present'),
      sbFetch(env, '/enrollments' + tid + '&status=eq.new&select=id'),
    ]);

    // Compute balance per student: sum of (charges − payments)
    const balances = {};
    for (const f of fees) {
      balances[f.student_id] = (balances[f.student_id] || 0) + Number(f.amount);
    }
    const totalCharged = fees.filter(f => f.kind === 'charge').reduce((s, f) => s + Number(f.amount), 0);
    const totalPaid    = Math.abs(fees.filter(f => f.kind === 'payment').reduce((s, f) => s + Number(f.amount), 0));
    const collectionRate = totalCharged > 0 ? totalPaid / totalCharged : 0;
    const overdueStudents = Object.values(balances).filter(b => b > 0);
    const overdueAmount   = overdueStudents.reduce((s, b) => s + b, 0);

    // At-risk: missed 2+ days in last week
    const missesByStudent = {};
    for (const a of attendance) {
      if (a.present === false) missesByStudent[a.student_id] = (missesByStudent[a.student_id] || 0) + 1;
    }
    const atRisk = Object.values(missesByStudent).filter(c => c >= 2).length;
    const present = attendance.filter(a => a.present === true).length;
    const attendanceWeek = attendance.length > 0 ? present / attendance.length : 1;

    enriched.push({
      id:             t.id,
      name:           t.name,
      vertical:       t.vertical,
      country:        t.country,
      currency:       t.currency,
      tier:           t.tier,
      subdomain:      t.subdomain,
      primaryColor:   t.primary_color || null,
      logoUrl:        t.logo_url || null,
      motto:          t.motto || null,
      health:         overdueStudents.length > 0 ? 'advisory' : 'healthy',
      lastSignalAt:   'live',
      kpis:           { revenue: totalPaid, expenses: 0 }, // expenses come from a future expenses table
      verticalKpis: {
        students:            students.length,
        teachers:            (t.meta && t.meta.teachers) || 0,
        streams:             (t.meta && t.meta.streams)  || 0,
        feesCollectedTerm:   totalPaid,
        feesCollectionRate:  collectionRate,
        feesOutstanding:     overdueAmount,
        accountsOverdue30d:  overdueStudents.length,
        overdueAmount:       overdueAmount,
        attendanceWeek:      attendanceWeek,
        atRiskStudents:      atRisk,
        enrollmentInquiries: enrollments.length,
      },
      latest: overdueStudents.length > 0
        ? { severity: 'warn',
            title: overdueStudents.length + ' fee account' + (overdueStudents.length === 1 ? '' : 's') + ' overdue',
            summary: 'UGX ' + (overdueAmount / 1e6).toFixed(2) + 'M outstanding combined.' }
        : null,
    });
  }
  return enriched;
}

// Replaces direct use of TENANTS_SEED. Returns Supabase data when wired,
// otherwise the static fallback. Never throws — logs and falls back.
async function loadTenants(env) {
  if (env.SUPABASE_URL && env.SUPABASE_KEY) {
    try {
      const live = await loadTenantsFromSupabase(env);
      if (live.length > 0) return live;
    } catch (e) {
      console.log('[Supabase] load failed, falling back to seed: ' + (e.message || e));
    }
  }
  return TENANTS_SEED;
}

