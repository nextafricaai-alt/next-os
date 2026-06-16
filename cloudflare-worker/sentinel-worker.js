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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    // ─── Route: POST /brand/save — head updates their school's theme colour / name / logo ──
    if (request.method === 'POST' && url.pathname === '/brand/save') {
      let bb; try { bb = await request.json(); } catch (e) { return new Response(JSON.stringify({ error: 'bad body' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
      const slug = String(bb.tenant || bb.slug || bb.s || '').trim();
      if (!slug) return new Response(JSON.stringify({ error: 'tenant required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      const patch = {};
      if (bb.primary_color && /^#?[0-9a-fA-F]{6}$/.test(String(bb.primary_color))) { let c = String(bb.primary_color); if (c[0] !== '#') c = '#' + c; patch.primary_color = c; }
      if (bb.name) patch.name = String(bb.name).slice(0, 80);
      if (bb.logo_url) patch.logo_url = String(bb.logo_url).slice(0, 400);
      if (!Object.keys(patch).length) return new Response(JSON.stringify({ error: 'nothing valid to update' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      try { const r = await fetch(env.SUPABASE_URL + '/rest/v1/tenants?id=eq.' + encodeURIComponent(slug), { method: 'PATCH', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify(patch) }); const d = await r.json(); return new Response(JSON.stringify({ ok: true, brand: (d && d[0]) || patch }), { headers: { ...cors, 'Content-Type': 'application/json' } }); }
      catch (e) { return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { headers: { ...cors, 'Content-Type': 'application/json' } }); }
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

    // Per-school PNG icon (real raster — works on desktop taskbars + iOS home screen).
    if (request.method === 'GET' && url.pathname === '/icon.png') {
      const slug = url.searchParams.get('s') || '';
      let nm = 'NEXT', col = '#00FC8F';
      try { const rows = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(slug) + '&select=name,primary_color'); if (rows && rows[0]) { nm = rows[0].name || nm; col = rows[0].primary_color || col; } } catch (e) {}
      let init = String(nm).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!init) init = 'N';
      const png = makeIconPng(init, col, 512);
      return new Response(png, { headers: { ...cors, 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
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
    const GET_OK = ['/check-project', '/seo-audit', '/px.js', '/analytics', '/gsc', '/ga4', '/fetch-page', '/site-pages', '/cms/collections', '/cms/items', '/students', '/exams', '/exam-results', '/fees-balances', '/attendance-summary', '/staff-status', '/attendance-watch', '/student-health', '/billing/verify', '/billing/subscriptions', '/health', '/events', '/finance', '/assets', '/school-config', '/os-data', '/teachers', '/hosting-report', '/watch/status', '/push/vapid-public', '/push/debug'];
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
    if (url.pathname === '/provision-teacher/bulk') {
      return handleProvisionTeachersBulk(request, env, cors);
    }
    if (url.pathname === '/reset-teacher-password') {
      return handleResetTeacherPassword(request, env, cors);
    }
    if (url.pathname === '/admin/reset-login') {
      return handleAdminResetLogin(request, env, cors);
    }
    if (url.pathname === '/teachers') {
      return handleTeachersList(url.searchParams.get('tenant') || '', env, cors);
    }
    if (url.pathname === '/hosting-report') {
      return handleHostingReport(request, env, cors);
    }
    if (url.pathname === '/watch/sync') {
      return handleWatchSync(request, env, cors);
    }
    if (url.pathname === '/watch/status') {
      return handleWatchStatus(env, cors);
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
    if (url.pathname === '/attendance-summary') return handleAttendanceSummary(url.searchParams.get('tenant') || '', url.searchParams.get('days') || '7', env, cors);
    if (url.pathname === '/staff-status')       return handleStaffStatus(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/attendance-watch')   return handleAttendanceWatch(url.searchParams.get('tenant') || '', env, cors);
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
    if (url.pathname === '/os-data/delete')     return handleOsDataDelete(request, env, cors);
    if (url.pathname === '/translate')          return handleTranslate(request, env, cors);
    if (url.pathname === '/syllabus/generate')  return handleSyllabusGenerate(request, env, cors);
    if (url.pathname === '/seo-tips')           return handleSeoTips(request, env, cors);
    if (url.pathname === '/exam/scan-mark')     return handleExamScanMark(request, env, cors);
    if (url.pathname === '/exam/care-plan')     return handleExamCarePlan(request, env, cors);
    if (url.pathname === '/billing/checkout')   return handleBillingCheckout(request, env, cors);
    if (url.pathname === '/billing/webhook')    return handleBillingWebhook(request, env, cors);
    if (url.pathname === '/billing/verify')     return handleBillingVerify(url.searchParams.get('tx') || url.searchParams.get('transaction_id') || '', url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/billing/subscriptions') return handleBillingList(url.searchParams.get('tenant') || '', env, cors);
    if (url.pathname === '/health')             return handleHealth(env, cors);
    if (url.pathname === '/push/vapid-public')  return new Response(JSON.stringify({ key: env.VAPID_PUBLIC || '' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (url.pathname === '/push/subscribe')     return handlePushSubscribe(request, env, cors);
    if (url.pathname === '/push/notify')        return handlePushNotify(request, env, cors);
    if (url.pathname === '/push/test')          return handlePushTest(request, env, cors);
    if (url.pathname === '/push/debug')         return handlePushDebug(url.searchParams.get('tenant') || 'next', url.searchParams.get('send') === '1', env, cors);
    if (url.pathname === '/stt')                return handleSTT(request, env, cors);

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

  // ─── Latest Claude brain (when an Anthropic key is configured) ───
  // The client already speaks the Anthropic shape, so we forward directly and
  // return Claude's native response (content[] + stop_reason) untouched.
  if (env.ANTHROPIC_API_KEY) {
    try {
      const payload = {
        model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: messages,
      };
      if (system) payload.system = system;
      if (Array.isArray(tools) && tools.length) payload.tools = tools;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const d = await r.json();
        return new Response(JSON.stringify(d), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      // On Anthropic error (rate limit, bad key, etc.) fall through to the free Llama brain.
    } catch (e) { /* fall through to Llama */ }
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
// Nia's brain: prefer Claude (ANTHROPIC_API_KEY) when set, else Workers AI (free Llama), else empty.
async function niaGenerate(env, system, user, maxTokens, temperature) {
  maxTokens = maxTokens || 300; temperature = (temperature == null) ? 0.3 : temperature;
  if (env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: maxTokens, temperature: temperature, system: system, messages: [{ role: 'user', content: user }] }),
      });
      if (r.ok) { const d = await r.json(); const t = (d.content && d.content[0] && d.content[0].text) || ''; if (t && t.trim()) return t.trim(); }
    } catch (e) {}
  }
  if (env.AI) {
    try {
      const result = await env.AI.run(MODEL, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens, temperature: temperature });
      const t = ((result.result || result).response || ''); if (t && t.trim()) return t.trim();
    } catch (e) {}
  }
  return '';
}

async function probeSite(siteUrl, domain) {
  const out = { url: siteUrl, domain: domain, up: null, status: null, ms: null, daysLeft: null, expiry: null };
  if (siteUrl) {
    const t0 = Date.now();
    try {
      const r = await fetch(siteUrl, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'NextOS-Sentinel/1.0' } });
      out.status = r.status; out.up = (r.status >= 200 && r.status < 500); out.ms = Date.now() - t0;
    } catch (e) { out.up = false; out.ms = Date.now() - t0; out.error = String((e && e.message) || e); }
  }
  if (domain) {
    try {
      const dom = String(domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
      const r = await fetch('https://rdap.org/domain/' + encodeURIComponent(dom), { headers: { 'Accept': 'application/rdap+json' } });
      if (r.ok) { const d = await r.json(); const ev = (d.events || []).find(e => /expiration/i.test(e.eventAction || '')); if (ev && ev.eventDate) { out.expiry = String(ev.eventDate).slice(0, 10); out.daysLeft = Math.round((new Date(ev.eventDate).getTime() - Date.now()) / 86400000); } }
    } catch (e) {}
  }
  return out;
}

async function watchSites(env) {
  let list = [];
  try { const rows = await sbFetch(env, '/os_records?tenant=eq.next&kind=eq.site_watch&select=payload&order=created_at.desc&limit=1'); list = (rows && rows[0] && rows[0].payload && rows[0].payload.sites) || []; } catch (e) {}
  const concerns = []; const results = [];
  for (const sct of list.slice(0, 60)) {
    if (!sct || (!sct.url && !sct.domain)) continue;
    const probe = await probeSite(sct.url || ('https://' + (sct.domain || '')), sct.domain || '');
    const nm = sct.name || sct.domain || sct.url;
    results.push(Object.assign({ name: nm }, probe));
    if (probe.up === false) concerns.push({ tenantId: '_site', name: nm, type: 'site_down', severity: 'warn', summary: nm + ' looks DOWN (' + (probe.status ? ('HTTP ' + probe.status) : 'no response') + ').' });
    if (probe.daysLeft != null && probe.daysLeft <= 30) concerns.push({ tenantId: '_site', name: nm, type: 'domain_expiring', severity: probe.daysLeft <= 7 ? 'warn' : 'info', summary: (sct.domain || nm) + ' domain renews in ' + probe.daysLeft + ' day' + (probe.daysLeft === 1 ? '' : 's') + (probe.expiry ? (' (' + probe.expiry + ')') : '') + '.' });
  }
  try {
    const rec = { results, at: new Date().toISOString() };
    const ex = await sbFetch(env, '/os_records?tenant=eq.next&kind=eq.site_watch_results&select=id&limit=1');
    if (ex && ex[0]) await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + ex[0].id, { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ payload: rec }) });
    else await sbWrite(env, '/os_records', { tenant: 'next', kind: 'site_watch_results', payload: rec }, 'POST', 'return=minimal');
  } catch (e) {}
  return concerns;
}

async function handleWatchSync(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const sites = Array.isArray(b.sites) ? b.sites.filter(x => x && (x.url || x.domain)).map(x => ({ name: x.name || '', url: x.url || '', domain: x.domain || '' })).slice(0, 200) : [];
  try {
    const rec = { sites, at: new Date().toISOString() };
    const ex = await sbFetch(env, '/os_records?tenant=eq.next&kind=eq.site_watch&select=id&limit=1');
    if (ex && ex[0]) await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + ex[0].id, { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ payload: rec }) });
    else await sbWrite(env, '/os_records', { tenant: 'next', kind: 'site_watch', payload: rec }, 'POST', 'return=minimal');
    return J({ ok: true, count: sites.length });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleWatchStatus(env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/os_records?tenant=eq.next&kind=eq.site_watch_results&select=payload&order=created_at.desc&limit=1'); return J((rows && rows[0] && rows[0].payload) || { results: [], at: null }); }
  catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function composeBrief(env, kind, tenants, actions, siteConcerns) {
  siteConcerns = siteConcerns || [];
  const findings = tenants.map(t => ({
    name: t.name,
    concerns: serverEvaluate(t),
  })).filter(f => f.concerns.length > 0);

  if (findings.length === 0 && siteConcerns.length === 0 && kind !== 'weekly') {
    return null; // nothing to report; stay silent
  }

  const factsBlock = findings.map(f =>
    f.name + ':\n' + f.concerns.map(c => '  - ' + c.summary).join('\n')
  ).join('\n\n');
  const siteBlock = siteConcerns.length ? ('\n\nWebsites:\n' + siteConcerns.map(c => '  - ' + c.summary).join('\n')) : '';

  const greeting = kind === 'morning' ? 'Morning Hudson.' :
                   kind === 'weekly'  ? 'Friday wrap.' :
                                        'Quick check Hudson.';

  const sysPrompt = "You are Nia, Hudson's Chief of Staff. Write ONE short WhatsApp brief (under 320 chars). Open with the greeting. Structure: (1) what you noticed, (2) what YOU already did about it (the actions), (3) what needs Hudson's input. Warm but direct. CEO tone. Use 'I' for things you did.";

  const actionsBlock = (actions && actions.length)
    ? '\n\nActions I already took:\n' + actions.map(a => '  - ' + a.humanReadable).join('\n')
    : '';

  const userPrompt = greeting + '\n\nFacts:\n' + factsBlock + siteBlock + actionsBlock + '\n\nWrite the brief now.';

  const text = await niaGenerate(env, sysPrompt, userPrompt, 220, 0.3);
  if (text && text.trim()) return text.trim();
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

  const siteConcerns = await watchSites(env);
  if (siteConcerns.length) findings.push({ name: 'Websites', tenantId: '_sites', concerns: siteConcerns });
  const text = await composeBrief(env, kind, tenants, allActions, siteConcerns);

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

  // Push to Hudson's phone (lock-screen) when there are real concerns or it's a scheduled brief.
  try {
    const urgent = (siteConcerns || []).filter(c => c.type === 'site_down' || (c.type === 'domain_expiring' && c.severity === 'warn'));
    let title = 'Nia · ' + (kind === 'morning' ? 'Morning brief' : kind === 'weekly' ? 'Weekly brief' : 'Update');
    let body = '';
    if (urgent.length) { title = 'Nia · needs your eye'; body = urgent[0].summary + (urgent.length > 1 ? (' (+' + (urgent.length - 1) + ' more)') : ''); }
    else { const firstLine = String(brief.text || '').split('\n').find(l => l.trim()); body = (firstLine || 'Fleet is calm.').slice(0, 140); }
    if (urgent.length || kind === 'morning' || kind === 'weekly') {
      await deliverPush(env, 'next', null, 'owner', { title, body, url: '/', tag: 'nia-' + kind });
    }
  } catch (e) { console.log('[Nia push] ' + (e.message || e)); }

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

// ──────────────────────────────────────────────────────────────────────
// TEACHER NO-SHOW WATCH — when an assigned teacher hasn't checked in for
// their LIVE period, push the head a real alert. Dedup one alert per
// school per period (school day, 10-min grace). Reuses the push pipeline.
// ──────────────────────────────────────────────────────────────────────
const _NS_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function _nsToMin(hhmm) { const m = String(hhmm || '').split(':'); return (parseInt(m[0], 10) || 0) * 60 + (parseInt(m[1], 10) || 0); }

async function checkTenantAttendance(env, tenantId) {
  const out = { tenant: tenantId, day: null, period: null, noShows: [], alerted: false, reason: '' };
  // EAT now
  const eat = new Date(Date.now() + 3 * 3600000);
  const day = _NS_DAYS[eat.getUTCDay()];
  out.day = day;
  if (day === 'Sat' || day === 'Sun') { out.reason = 'weekend'; return out; }
  const nowMin = eat.getUTCHours() * 60 + eat.getUTCMinutes();

  // Timetable (has periods + grid)
  const ttRows = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenantId) + '&kind=eq.timetable&select=payload&order=created_at.desc&limit=1');
  const tt = (ttRows && ttRows[0] && ttRows[0].payload) || null;
  if (!tt || !tt.periods || !tt.grid) { out.reason = 'no timetable'; return out; }

  // Current period index (10-min grace so we don't ping a teacher who is just arriving)
  let pi = -1;
  for (let i = 0; i < tt.periods.length; i++) { const p = tt.periods[i]; if (p.brk) continue; const sM = _nsToMin(p.s), eM = _nsToMin(p.e); if (nowMin >= sM + 10 && nowMin < eM) { pi = i; break; } }
  if (pi < 0) { out.reason = 'no live period'; return out; }
  const period = tt.periods[pi];
  out.period = period.l;

  // Who is present right now (checked in today, not checked out)
  const teachers = await sbFetch(env, '/teachers?tenant_id=eq.' + encodeURIComponent(tenantId) + '&select=id,full_name&limit=400');
  const today = eat.toISOString().slice(0, 10);
  const checkins = await sbFetch(env, '/teacher_checkins?tenant_id=eq.' + encodeURIComponent(tenantId) + '&checked_in_at=gte.' + today + 'T00:00:00&select=teacher_id,checked_in_at,checked_out_at&order=checked_in_at.desc&limit=800');
  const latest = {}; (checkins || []).forEach(c => { if (!latest[c.teacher_id]) latest[c.teacher_id] = c; });
  const present = new Set();
  (teachers || []).forEach(t => { const c = latest[t.id]; if (c && !c.checked_out_at) present.add(String(t.full_name || '').toLowerCase().trim()); });

  // Cross-ref the grid for this day+period across all classes
  const grid = tt.grid;
  Object.keys(grid).forEach(cls => {
    const cell = grid[cls] && grid[cls][day] && grid[cls][day][pi];
    if (!cell || !cell.subject || !cell.teacher) return;
    if (!present.has(String(cell.teacher).toLowerCase().trim())) {
      out.noShows.push({ cls: cls, subject: cell.subject, teacher: cell.teacher, cover: !!cell.cover });
    }
  });
  if (!out.noShows.length) { out.reason = 'all covered'; return out; }

  // Dedup: one alert per school per (date|period)
  const key = today + '|' + pi;
  const seen = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenantId) + "&kind=eq.attendance_alert&select=id,payload&order=created_at.desc&limit=50");
  const already = (seen || []).some(r => r.payload && r.payload.key === key);
  if (already) { out.reason = 'already alerted this period'; return out; }

  // Build a friendly summary and push the head
  const names = out.noShows.slice(0, 3).map(n => 'Tr ' + n.teacher.split(' ')[0] + ' — ' + n.subject + ' (' + n.cls + ')');
  const more = out.noShows.length > 3 ? ' +' + (out.noShows.length - 3) + ' more' : '';
  const title = out.noShows.length === 1 ? (out.noShows[0].cls + ' is uncovered now') : (out.noShows.length + ' classes uncovered now');
  const body = period.l + ' (' + period.s + '): ' + names.join('; ') + more + '. Not checked in — tap to reassign.';
  let push = { matched: 0, ok: 0 };
  try { push = await deliverPush(env, tenantId, [], 'head', { title: title, body: body, url: '/', tag: 'noshow-' + key }); } catch (e) {}

  // Record the alert (dedup + audit), even if no head device is subscribed yet
  try { await sbWrite(env, '/os_records', { tenant: tenantId, kind: 'attendance_alert', payload: { key: key, day: day, period: period.l, at: new Date().toISOString(), noShows: out.noShows, pushed: push.ok || 0 } }, 'POST', 'return=minimal'); } catch (e) {}
  out.alerted = true; out.pushed = push.ok || 0; out.matched = push.matched || 0;
  return out;
}

async function runAttendanceWatch(env) {
  let tenants = [];
  try { tenants = await sbFetch(env, '/tenants?select=id'); } catch (e) { return { error: String(e && e.message || e) }; }
  const results = [];
  for (const t of (tenants || [])) { try { results.push(await checkTenantAttendance(env, t.id)); } catch (e) { results.push({ tenant: t.id, error: String(e && e.message || e) }); } }
  return { ran: results.length, results: results };
}

// Cloudflare cron entry point.
export const scheduledHandler = async (event, env, ctx) => {
  // event.cron tells us which schedule fired; default to "pulse" if unknown.
  const cron = event.cron || '';
  // School-hours teacher no-show watch (every 15 min, 08:00-15:00 EAT, Mon-Fri)
  if (cron === '*/15 5-12 * * 1-5') { await runAttendanceWatch(env); return; }
  // System health heartbeat (every 30 min, 24/7)
  if (cron === '*/30 * * * *') { await runHealthHeartbeat(env); return; }
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
    const t = await niaGenerate(env, sysPrompt, userPrompt, 220, 0.4);
    if (t && t.trim()) return t.trim();
    throw new Error('empty');
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
      // Every row must carry the SAME keys (PostgREST bulk-insert requires it).
      if (charge > 0) inserts.push({ tenant_id: tenant, student_id: sid, term, kind: 'charge', amount: charge, channel: null, notes: 'Imported' });
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

// ─── Billing / subscriptions (Flutterwave) ───────────────────────────────
const PLAN_PRICES = { foundation: 400000, momentum: 1200000, mastery: 3000000 }; // UGX / term
const PLAN_NAME = { foundation: 'Foundation', momentum: 'Momentum', mastery: 'Mastery' };

async function computeHealth(env) {
  const checks = [];
  checks.push({ name: 'Worker', status: 'ok', detail: 'responding' });
  if (env.SUPABASE_URL && env.SUPABASE_KEY) {
    try { const r = await fetch(env.SUPABASE_URL + '/rest/v1/tenants?select=id&limit=1', { headers: sbHeaders(env, 'count=none') }); checks.push({ name: 'Database', status: r.ok ? 'ok' : 'warn', detail: r.ok ? 'reachable' : ('HTTP ' + r.status) }); }
    catch (e) { checks.push({ name: 'Database', status: 'down', detail: String((e && e.message) || e).slice(0, 80) }); }
  } else checks.push({ name: 'Database', status: 'down', detail: 'not configured' });
  if (env.ANTHROPIC_API_KEY) checks.push({ name: 'AI brain', status: 'ok', detail: 'Claude · ' + (env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') });
  else if (env.AI) checks.push({ name: 'AI brain', status: 'ok', detail: 'Llama (free fallback) — add ANTHROPIC_API_KEY for Claude' });
  else checks.push({ name: 'AI brain', status: 'down', detail: 'no AI bound' });
  let jwkOk = false; try { const j = JSON.parse(env.VAPID_JWK || '{}'); jwkOk = !!(j && j.d); } catch (e) {}
  checks.push({ name: 'Push notifications', status: (env.VAPID_PUBLIC && jwkOk) ? 'ok' : 'warn', detail: (env.VAPID_PUBLIC && jwkOk) ? 'configured' : 'VAPID keys missing' });
  checks.push({ name: 'Billing', status: env.FLW_SECRET_KEY ? 'ok' : 'warn', detail: env.FLW_SECRET_KEY ? 'Flutterwave connected' : 'not connected' });
  const worst = checks.some(c => c.status === 'down') ? 'down' : checks.some(c => c.status === 'warn') ? 'warn' : 'ok';
  return { ok: worst !== 'down', status: worst, checks: checks };
}
async function handleHealth(env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  const t0 = Date.now(); const h = await computeHealth(env);
  return J(Object.assign({ ms: Date.now() - t0 }, h));
}
// Cron heartbeat: alert the operator only when health CHANGES (down / recovered) — never spam.
async function runHealthHeartbeat(env) {
  const h = await computeHealth(env);
  let prev = null, prevId = null;
  try { const rows = await sbFetch(env, '/os_records?tenant=eq.next&kind=eq.health_state&select=id,payload&order=created_at.desc&limit=1'); if (rows && rows[0]) { prev = (rows[0].payload || {}).status; prevId = rows[0].id; } } catch (e) {}
  if (h.status === 'down' && prev !== 'down') {
    const bad = h.checks.filter(c => c.status === 'down').map(c => c.name).join(', ');
    try { await deliverPush(env, 'next', [], 'operator', { title: '⚠ NEXT OS — system DOWN', body: (bad || 'A core system') + ' is down. Nia flagged it; the OS may be affected.', url: '/', tag: 'health-down' }); } catch (e) {}
  } else if (h.status !== 'down' && prev === 'down') {
    try { await deliverPush(env, 'next', [], 'operator', { title: '✓ NEXT OS — systems recovered', body: 'All core systems are healthy again.', url: '/', tag: 'health-ok' }); } catch (e) {}
  }
  try { const rec = { status: h.status, checks: h.checks, at: new Date().toISOString() }; if (prevId) { await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + prevId, { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ payload: rec }) }); } else { await sbWrite(env, '/os_records', { tenant: 'next', kind: 'health_state', payload: rec }, 'POST', 'return=minimal'); } } catch (e) {}
  return h;
}

async function handleBillingCheckout(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  const plan = String(b.plan || '').trim().toLowerCase();
  const email = String(b.email || '').trim();
  if (!tenant || !PLAN_PRICES[plan]) return J({ error: 'tenant and a valid plan required' }, 400);
  if (!env.FLW_SECRET_KEY) return J({ error: 'Billing not configured yet — add FLW_SECRET_KEY to the worker to take real payments.' }, 200);
  const amount = PLAN_PRICES[plan];
  const tx_ref = 'NX-' + tenant + '-' + plan + '-' + Date.now();
  const redirect = String(b.redirect || ('https://nextos.nextafrica.ai/school/' + encodeURIComponent(tenant) + '?billing=return'));
  try {
    const r = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + env.FLW_SECRET_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_ref: tx_ref, amount: amount, currency: 'UGX', redirect_url: redirect, payment_options: 'card,mobilemoneyuganda,ussd', customer: { email: email || (tenant + '@school.ug'), name: tenant }, customizations: { title: 'NEXT Schools OS — ' + (PLAN_NAME[plan] || plan), description: (PLAN_NAME[plan] || plan) + ' subscription (per term)' } }),
    });
    const d = await r.json();
    if (d && d.status === 'success' && d.data && d.data.link) {
      // store a pending subscription
      try { await sbWrite(env, '/os_records', { tenant: tenant, kind: 'subscription', payload: { tenant: tenant, plan: plan, amount: amount, currency: 'UGX', email: email, tx_ref: tx_ref, status: 'pending', createdAt: new Date().toISOString() } }, 'POST', 'return=minimal'); } catch (e) {}
      return J({ ok: true, link: d.data.link, tx_ref: tx_ref });
    }
    return J({ error: 'Flutterwave: ' + ((d && d.message) || 'could not start payment') }, 200);
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function billingFulfil(env, txId) {
  // Verify the transaction with Flutterwave and, if successful + not already done, fulfil it.
  if (!env.FLW_SECRET_KEY || !txId) return { ok: false, why: 'no key/tx' };
  let v; try { const r = await fetch('https://api.flutterwave.com/v3/transactions/' + encodeURIComponent(txId) + '/verify', { headers: { 'Authorization': 'Bearer ' + env.FLW_SECRET_KEY } }); v = await r.json(); } catch (e) { return { ok: false, why: String(e) }; }
  const d = v && v.data;
  if (!d || v.status !== 'success' || String(d.status).toLowerCase() !== 'successful') return { ok: false, why: 'not successful' };
  const tx_ref = d.tx_ref || '';
  const m = String(tx_ref).match(/^NX-(.+)-(foundation|momentum|mastery)-\d+$/);
  const tenant = m ? m[1] : (d.meta && d.meta.tenant) || '';
  const plan = m ? m[2] : (d.meta && d.meta.plan) || '';
  if (!tenant || !plan) return { ok: false, why: 'cannot map tenant/plan' };
  // Idempotency: already fulfilled for this tx_ref?
  try { const ex = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant) + "&kind=eq.subscription&select=id,payload&limit=200"); if ((ex || []).some(x => x.payload && x.payload.tx_ref === tx_ref && x.payload.status === 'active')) return { ok: true, already: true, tenant, plan }; } catch (e) {}
  const amount = d.amount || PLAN_PRICES[plan] || 0;
  const now = new Date().toISOString();
  // 1) active subscription
  try { await sbWrite(env, '/os_records', { tenant: tenant, kind: 'subscription', payload: { tenant: tenant, plan: plan, amount: amount, currency: d.currency || 'UGX', email: (d.customer && d.customer.email) || '', tx_ref: tx_ref, txId: String(txId), status: 'active', paidAt: now } }, 'POST', 'return=minimal'); } catch (e) {}
  // 2) auto-record income into NEXT finance
  try { await sbWrite(env, '/os_records', { tenant: 'next', kind: 'finance', payload: { type: 'income', category: 'OS revenue', label: (PLAN_NAME[plan] || plan) + ' subscription · ' + tenant, party: tenant, amount: amount, frequency: 'Monthly', source: 'flutterwave', tx_ref: tx_ref, at: now } }, 'POST', 'return=minimal'); } catch (e) {}
  // 3) activate the school's package
  try { const pk = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant) + '&kind=eq.school_package&select=id&limit=1'); const body = { tier: plan, addons: [], paidVia: 'flutterwave', at: now }; if (pk && pk[0]) { await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + pk[0].id, { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ payload: body }) }); } else { await sbWrite(env, '/os_records', { tenant: tenant, kind: 'school_package', payload: body }, 'POST', 'return=minimal'); } } catch (e) {}
  // 4) notification in our system + push to operator
  try { await sbWrite(env, '/os_records', { tenant: 'next', kind: 'billing_notice', payload: { tenant: tenant, plan: plan, amount: amount, currency: d.currency || 'UGX', at: now, read: false } }, 'POST', 'return=minimal'); } catch (e) {}
  try { await deliverPush(env, 'next', [], 'operator', { title: 'New subscription · ' + tenant, body: (PLAN_NAME[plan] || plan) + ' — UGX ' + Number(amount).toLocaleString() + ' received.', url: '/', tag: 'sub-' + tx_ref }); } catch (e) {}
  return { ok: true, tenant: tenant, plan: plan, amount: amount };
}

async function handleBillingWebhook(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  // Verify Flutterwave signature
  const sig = request.headers.get('verif-hash') || '';
  if (!env.FLW_WEBHOOK_HASH || sig !== env.FLW_WEBHOOK_HASH) return J({ error: 'bad signature' }, 401);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const data = b && (b.data || b);
  const txId = data && (data.id || data.transaction_id);
  const status = data && String(data.status || '').toLowerCase();
  if (status === 'successful' && txId) { const r = await billingFulfil(env, txId); return J({ ok: true, fulfilled: r.ok }); }
  return J({ ok: true, ignored: true });
}

async function handleBillingVerify(txId, tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!txId) return J({ error: 'tx required' }, 400);
  const r = await billingFulfil(env, txId);
  return J(r);
}

async function handleBillingList(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const q = tenant ? ('/os_records?tenant=eq.' + encodeURIComponent(tenant) + '&kind=eq.subscription&select=id,payload,created_at&order=created_at.desc&limit=200')
                     : ('/os_records?kind=eq.subscription&select=id,payload,created_at&order=created_at.desc&limit=300');
    const rows = await sbFetch(env, q);
    const subs = (rows || []).map(x => Object.assign({ id: x.id, created_at: x.created_at }, x.payload));
    let notices = [];
    try { notices = (await sbFetch(env, '/os_records?tenant=eq.next&kind=eq.billing_notice&select=id,payload&order=created_at.desc&limit=100') || []).map(x => Object.assign({ id: x.id }, x.payload)); } catch (e) {}
    return J({ subscriptions: subs, notices: notices });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleExamScanMark(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  let img = String(b.image || '');
  const subject = String(b.subject || '').trim();
  const klass = String(b.class || b.klass || '').trim();
  const level = String(b.level || 'primary').trim();
  const examName = String(b.examName || '').trim();
  const guide = String(b.markGuide || '').trim();
  if (!img) return J({ error: 'image required' }, 400);
  if (!env.ANTHROPIC_API_KEY) return J({ error: 'Reading handwriting needs Claude vision. Add your ANTHROPIC_API_KEY secret to the worker, then this works.' }, 200);
  // accept data URL or raw base64
  let media = 'image/jpeg'; let data = img;
  const m = img.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (m) { media = m[1]; data = m[2]; } else { data = img.replace(/^base64,/, ''); }
  const levelWord = level === 'secondary' ? 'Ugandan secondary (UNEB UCE/UACE)' : (level === 'tertiary' ? 'Ugandan tertiary' : 'Ugandan primary (UNEB PLE)');
  const sys = 'You are a meticulous, fair ' + levelWord + ' examiner who knows the NCDC syllabus and UNEB marking schemes for both theory and practical papers. You read a photographed exam script, identify the learner, and mark each answer the way a UNEB examiner would — awarding method marks, accuracy marks and follow-through, and never inventing marks for blank or illegible answers. You also notice HOW the learner reasons.';
  const user = 'This is a photo of a learner\'s ' + (subject ? subject + ' ' : '') + 'exam script' + (klass ? ' for class ' + klass : '') + (examName ? ' (' + examName + ')' : '') + '.' + (guide ? ' Mark against this marking guide: ' + guide : ' Mark each answer against the correct UNEB answer for this subject and level.') + '\n\nReturn ONLY valid JSON (no prose, no markdown): {"studentName":"<as written on the script, or empty if unreadable>","subject":"' + (subject || '<detected>') + '","perQuestion":[{"q":"<number/label>","given":"<short summary of the learner\'s answer>","marks":<number>,"max":<number>,"note":"<one short marking note>"}],"total":<number>,"max":<number>,"percent":<number 0-100>,"grade":"<UNEB grade e.g. D1..F9 or A..F>","feedback":"<2-3 warm sentences to the learner>","reasoningNotes":"<1-2 sentences on how this learner thinks — what they grasp and where the reasoning breaks down>","confidence":"<high|medium|low — your confidence in reading this script>"}. If the script is too blurry to mark, return total 0 and confidence "low" with a note asking for a clearer photo.';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 2000, system: sys, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: media, data: data } }, { type: 'text', text: user }] }] }),
    });
    if (!r.ok) { const t = await r.text(); return J({ error: 'Claude vision error: ' + t.slice(0, 200) }, 200); }
    const d = await r.json();
    let txt = ((d.content || []).filter(c => c.type === 'text').map(c => c.text).join('')) || '';
    let parsed = null; try { parsed = JSON.parse(txt); } catch (e) { const mm = txt.match(/\{[\s\S]*\}/); if (mm) { try { parsed = JSON.parse(mm[0]); } catch (e2) {} } }
    if (!parsed) return J({ error: 'Could not parse the marking. Try a clearer photo.', raw: txt.slice(0, 300) }, 200);
    return J({ ok: true, marking: parsed });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleExamCarePlan(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const learner = b.learner || {};
  if (!learner.name && !(learner.exams && learner.exams.length)) return J({ error: 'learner data required' }, 400);
  const sys = 'You are Nia, a wise, caring Ugandan head-of-studies who knows the NCDC syllabus and UNEB answering tactics for every subject (theory and practical). You read a learner\'s full picture — marks across several exams, how they reason, attendance, behaviour, family background and fee status — and form a holistic, compassionate, practical judgement. You write for a head teacher: specific, kind, never labelling a child as a failure, always actionable.';
  const ex = (learner.exams || []).map(e => '- ' + (e.subject || 'Subject') + ' (' + (e.examName || 'exam') + '): ' + (e.percent != null ? e.percent + '%' : (e.total + '/' + e.max)) + (e.grade ? ' grade ' + e.grade : '') + (e.reasoningNotes ? ' — reasoning: ' + e.reasoningNotes : '')).join('\n');
  const user = 'Learner: ' + (learner.name || '?') + (learner.stream ? ' (' + learner.stream + ')' : '') + '.\n'
    + 'Exams marked so far:\n' + (ex || '(none yet)') + '\n'
    + 'Attendance: ' + (learner.attendancePct != null ? learner.attendancePct + '%' : 'unknown') + '.\n'
    + 'Behaviour notes: ' + ((learner.behaviour && learner.behaviour.length) ? learner.behaviour.join('; ') : 'none recorded') + '.\n'
    + 'Family background: ' + (learner.family || 'not recorded') + '.\n'
    + 'Fees: ' + (learner.feesBalance != null ? ('balance UGX ' + Number(learner.feesBalance).toLocaleString()) : 'unknown') + '.\n\n'
    + 'Give ONLY valid JSON (no markdown): {"reasoningCapacity":"<2-3 sentences: how this child thinks across subjects — recall vs understanding vs application, where it breaks>","strengths":["..."],"gaps":["..."],"unebTactics":["<specific UNEB answering tactic this learner must practise, per their weak pattern>"],"howToHelp":["<concrete teaching/parenting action>"],"carePlan":["<step the school will take, e.g. pairing, remedial, counselling, fees conversation>"],"summary":"<one warm paragraph a head could read to a parent>"}. Tie observations to the real data above (e.g. if attendance is low or fees stress is present, address it in the care plan).';
  try {
    const out = await niaGenerate(env, sys, user, 1500, 0.4);
    if (!out || !out.trim()) return J({ error: 'Nia could not produce a plan right now. Try again.' }, 200);
    let parsed = null; try { parsed = JSON.parse(out); } catch (e) { const mm = out.match(/\{[\s\S]*\}/); if (mm) { try { parsed = JSON.parse(mm[0]); } catch (e2) {} } }
    if (!parsed) return J({ ok: true, plan: { summary: out.trim() } });
    return J({ ok: true, plan: parsed });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleSeoTips(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  // b can be a single audit {site, audit} or a fleet {fleet:[{site, audit}]}
  const sys = 'You are an SEO consultant advising a Ugandan digital agency. You turn raw SEO audit findings into a short, prioritised, plain-English action plan. Be concrete and specific to the findings — name the exact change and why it helps ranking or traffic. No fluff, no generic advice, no markdown headers.';
  function describe(site, a) {
    if (!a) return site + ': no audit data.';
    return site + ' — score ' + (a.score != null ? a.score + '/100' : '?') + '. Title ' + (a.titleLen || 0) + ' chars, meta description ' + (a.metaDescLen || 0) + ' chars, ' + (a.h1s || 0) + ' H1, ' + (a.words || 0) + ' words, ' + (a.https ? 'HTTPS ok' : 'NO HTTPS') + ', ' + (a.viewport ? 'mobile-ready' : 'NOT mobile-ready') + ', loads in ' + (a.ms || '?') + 'ms. Issues: ' + (((a.issues || []).map(function (it) { return (typeof it === 'string') ? it : ((it && (it.msg || it.message)) || ''); }).filter(Boolean).join('; ')) || 'none flagged') + '.';
  }
  let userMsg = '';
  if (Array.isArray(b.fleet)) {
    userMsg = 'Here are SEO audits for ' + b.fleet.length + ' websites:\n' + b.fleet.map(x => '- ' + describe(x.site, x.audit)).join('\n') + '\n\nGive a prioritised fleet action plan: the 5 most impactful fixes across these sites, each as one line "SITE — do X because Y". Put the lowest-scoring / highest-impact first.';
  } else {
    userMsg = 'SEO audit for ' + describe(b.site || 'this site', b.audit) + '\n\nGive 3 to 5 concrete fixes for THIS page, most impactful first, each one line "Do X because Y". Reference the actual findings above.';
  }
  try {
    const out = await niaGenerate(env, sys, userMsg, 700, 0.3);
    if (!out || !out.trim()) return J({ error: 'Nia could not produce tips right now. Try again.' }, 200);
    return J({ ok: true, tips: out.trim() });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleSyllabusGenerate(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const klass = String(b.class || b.klass || '').trim();
  const subject = String(b.subject || '').trim();
  const level = String(b.level || 'primary').trim();
  let periods = parseInt(b.lessons, 10) || 0;
  if (periods < 6) periods = 6; if (periods > 400) periods = 400;
  // A real scheme of work is 20-45 distinct lessons (each may span several periods) — keep within model output limits.
  let target = Math.round(periods / 3);
  if (target < 14) target = 14; if (target > 40) target = 40;
  if (!klass || !subject) return J({ error: 'class and subject required' }, 400);
  const levelWord = level === 'tertiary' ? 'university/college' : (level === 'secondary' ? 'secondary school' : 'primary school');
  const isSecondary = (level === 'secondary' || level === 'tertiary');
  const subjLc = subject.toLowerCase();
  const isMath = /math/.test(subjLc);
  const isScience = /(physics|chemistry|biology|agric|science|ict|computer|technical|home\s*econ|nutrition|food)/.test(subjLc);
  let extra = '';
  if (isSecondary && isMath) {
    extra = ' This is secondary Mathematics. Ugandan secondary Mathematics is examined in two papers: Paper 1 (pure mathematics — algebra, trigonometry, calculus, etc.) and Paper 2 (applied — statistics, probability, mechanics, vectors, etc.). Cover BOTH papers across the lessons and set a "paper" field on each lesson to either "Paper 1" or "Paper 2". If the subject name already specifies a paper (e.g. "Mathematics 1" means Paper 1, "Mathematics 2" means Paper 2), cover ONLY that paper and set "paper" accordingly.';
  } else if (isSecondary && isScience) {
    extra = ' This is a secondary science/technical subject. Include hands-on PRACTICAL lessons interleaved with theory (Ugandan UNEB practical examinations are compulsory). Mark practical lessons with "kind":"practical" and theory lessons with "kind":"theory". Aim for roughly one practical for every three or four theory lessons, placed after the relevant theory.';
  }
  const sys = 'You are a Ugandan curriculum planner who knows the National Curriculum Development Centre (NCDC) syllabi for ' + levelWord + '. You break a class subject syllabus into a sequenced term scheme of work, one teachable lesson per period, in the correct teaching order (foundational topics first).';
  const user = 'Class: ' + klass + '. Subject: ' + subject + '. The class gets about ' + periods + ' lesson periods this term. Produce a COMPLETE sequenced scheme of work of ' + target + ' lessons that together cover the term\'s NCDC syllabus for this class and subject (a single lesson may span several periods; do not pad). Pace it so the whole syllabus is covered within the term.' + extra + ' Return ONLY a JSON array (no prose, no markdown, no code fences). Each element: {"topic":"<broad topic/theme>","title":"<specific lesson title>","objective":"<one-sentence objective starting with a verb>","kind":"theory or practical","paper":"Paper 1 or Paper 2 or empty"}. Order them in proper teaching sequence.';
  let raw = '';
  try { raw = await niaGenerate(env, sys, user, 2600, 0.3); } catch (e) { return J({ error: 'generation failed: ' + String(e && e.message || e) }, 200); }
  if (!raw || !raw.trim()) return J({ error: 'Nia could not generate a plan right now. Try again.' }, 200);
  // Extract JSON array defensively
  let arr = null;
  try { arr = JSON.parse(raw); } catch (e) {
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) { try { arr = JSON.parse(m[0]); } catch (e2) {} }
  }
  if (!Array.isArray(arr) || !arr.length) return J({ error: 'Could not parse the generated plan. Try again.', raw: raw.slice(0, 400) }, 200);
  const clean = arr.filter(x => x && (x.title || x.topic)).map((x, i) => { const o = { seq: i + 1, topic: String(x.topic || x.title || '').slice(0, 120), title: String(x.title || x.topic || '').slice(0, 160), objective: String(x.objective || '').slice(0, 240), done: false, doneAt: null }; if (x.kind && /practical/i.test(x.kind)) o.kind = 'practical'; if (x.paper && /paper/i.test(String(x.paper))) o.paper = String(x.paper).slice(0, 12); return o; });
  return J({ ok: true, class: klass, subject: subject, count: clean.length, lessons: clean });
}

async function handleTranslate(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const text = String(b.text || '').trim();
  const lang = String(b.lang || 'Luganda').trim() || 'Luganda';
  if (!text) return J({ error: 'text required' }, 400);
  const sys = 'You are a precise, warm translator for a Ugandan school messaging parents. Translate the user\'s message into ' + lang + '. CRITICAL: keep every {{placeholder}} token (double curly braces) EXACTLY as written, do not translate or alter them. Keep it natural and respectful for a parent. Return ONLY the translation with no preamble, notes, or quotes.';
  try {
    const out = await niaGenerate(env, sys, text, 400, 0.2);
    if (!out || !out.trim()) return J({ error: 'translation unavailable' }, 200);
    return J({ text: out.trim(), lang });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handleOsDataList(tenant, kind, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!kind) return J({ error: 'kind required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try { const rows = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant || 'next') + '&kind=eq.' + encodeURIComponent(kind) + '&select=id,payload,created_at&order=created_at.desc&limit=1000'); return J({ tenant: tenant || 'next', kind, records: rows || [] }); }
  catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}
async function handleOsDataDelete(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const ids = Array.isArray(b.ids) ? b.ids : (b.id != null ? [b.id] : []);
  if (!ids.length) return J({ error: 'id or ids required' }, 400);
  let deleted = 0;
  for (const id of ids) {
    try { const r = await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') }); if (r.ok) deleted++; } catch (e) {}
  }
  return J({ ok: true, deleted: deleted });
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
async function handleAttendanceWatch(tenant, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try {
    if (tenant) return J(await checkTenantAttendance(env, tenant));
    return J(await runAttendanceWatch(env));
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
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

async function handleAttendanceSummary(tenant, days, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!tenant) return J({ error: 'tenant required' }, 400);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  try {
    const win = Math.max(1, Math.min(120, parseInt(days, 10) || 7));
    const since = new Date(Date.now() - win * 86400000).toISOString().slice(0, 10);
    const rows = await sbFetch(env, '/student_roll_call?tenant_id=eq.' + encodeURIComponent(tenant) + '&roll_date=gte.' + since + '&select=student_id,status&limit=50000');
    const agg = {};
    (rows || []).forEach(r => {
      const a = agg[r.student_id] || (agg[r.student_id] = { tot: 0, present: 0 });
      a.tot++;
      if (r.status === 'present' || r.status === 'late') a.present++;
    });
    const summary = {};
    Object.keys(agg).forEach(k => { const a = agg[k]; summary[k] = { pct: Math.round(100 * a.present / a.tot), days: a.tot }; });
    return J({ tenant, since, summary });
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
const PX_JS = "(function(){try{var el=document.currentScript||document.querySelector('script[src*=\"/px.js\"]');var site=null;if(el){try{site=new URL(el.src,location.href).searchParams.get('s');}catch(e){}}site=site||location.hostname.replace(/^www\\./,'');var EP='https://nextos-sentinel.nextafricaai.workers.dev/collect';function sid(){try{var k='nx_sid',v=sessionStorage.getItem(k);if(!v){v=Date.now().toString(36)+Math.random().toString(36).slice(2,8);sessionStorage.setItem(k,v);}return v;}catch(e){return 'na';}}function send(type,label,value){try{var body=JSON.stringify({site:site,type:type,path:location.pathname,ref:document.referrer||'',session:sid(),label:label||null,value:(value!=null?value:null)});if(navigator.sendBeacon){var ok=navigator.sendBeacon(EP,body);if(ok)return;}fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}).catch(function(){});}catch(e){}}window.nxTrack=function(type,label,value){send(type||'event',label,value);};function _w(){try{var n=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];var b=n&&(n.transferSize||n.encodedBodySize||0);return b?Math.round(b/1024):null;}catch(e){return null;}}function _f(){send('pageview','kb',_w());}if(document.readyState==='complete'){_f();}else{window.addEventListener('load',_f);}}catch(e){}})();";

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
  const _w = pv.map(r => Number(r.value)).filter(v => v > 0); const avgPageKB = _w.length ? Math.round(_w.reduce((a, b) => a + b, 0) / _w.length) : null;
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
    avgPageKB: avgPageKB,
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

async function handleHostingReport(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ error: 'Supabase not configured.' }, 500);
  const url = new URL(request.url);
  if (request.method === 'POST') {
    let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
    const site = String(b.site || '').toLowerCase().replace(/^www\./, '').trim();
    if (!site) return J({ error: 'site required' }, 400);
    const payload = { site: site, diskMB: Math.round((Number(b.diskMB) || 0) * 10) / 10, inodes: Math.round(Number(b.inodes != null ? b.inodes : b.files) || 0), files: Math.round(Number(b.files != null ? b.files : b.inodes) || 0), at: new Date().toISOString() };
    try {
      const existing = await sbFetch(env, '/os_records?tenant=eq.next&kind=eq.hosting_stat&payload->>site=eq.' + encodeURIComponent(site) + '&select=id&limit=1');
      if (existing && existing[0]) { await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + existing[0].id, { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ payload: payload }) }); }
      else { await sbWrite(env, '/os_records', { tenant: 'next', kind: 'hosting_stat', payload: payload }, 'POST', 'return=minimal'); }
      return J(Object.assign({ ok: true }, payload));
    } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
  }
  const site = String(url.searchParams.get('site') || '').toLowerCase().replace(/^www\./, '').trim();
  if (!site) return J({ error: 'site required' }, 400);
  try { const rows = await sbFetch(env, '/os_records?tenant=eq.next&kind=eq.hosting_stat&payload->>site=eq.' + encodeURIComponent(site) + '&select=payload&limit=1'); return J({ site, stat: (rows && rows[0] && rows[0].payload) || null }); }
  catch (e) { return J({ error: String((e && e.message) || e), site }, 200); }
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

async function verifyMember(request, env, tenant) {
  // Any signed-in user belonging to this tenant (head, admin, bursar, teacher) may trigger a push.
  try {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return { ok: false, why: 'no token' };
    const ur = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + token } });
    if (!ur.ok) return { ok: false, why: 'bad token' };
    const u = await ur.json();
    const email = (u && u.email) || '';
    const rows = await sbFetch(env, '/users?auth_id=eq.' + encodeURIComponent(u.id) + '&tenant_id=eq.' + encodeURIComponent(tenant) + '&select=role');
    if (rows && rows.length) return { ok: true, email, role: rows[0].role || '' };
    const t = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenant) + '&select=head_email');
    if (t && t.length && t[0].head_email && email && t[0].head_email.toLowerCase() === email.toLowerCase()) return { ok: true, email, role: 'head' };
    return { ok: false, why: 'not a member of this tenant' };
  } catch (e) { return { ok: false, why: String((e && e.message) || e) }; }
}

async function handleAdminResetLogin(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ ok: false, error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, error: 'bad body' }, 400); }
  const pin = String(b.pin || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const tenant = String(b.tenant_id || b.tenant || '').trim();
  if (pin !== (env.GATE_PIN || '1379')) return J({ ok: false, error: 'Invalid admin PIN' }, 401);
  if (!email) return J({ ok: false, error: 'email required' }, 400);
  try {
    let authId = null;
    const q = '/users?email=eq.' + encodeURIComponent(email) + (tenant ? ('&tenant_id=eq.' + encodeURIComponent(tenant)) : '') + '&select=auth_id&limit=1';
    const rows = await sbFetch(env, q); if (rows && rows[0] && rows[0].auth_id) authId = rows[0].auth_id;
    if (!authId) { const ur = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users?email=' + encodeURIComponent(email), { headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY } }); const uj = await ur.json().catch(() => ({})); const u = (uj && uj.users && uj.users[0]) || (Array.isArray(uj) && uj[0]); if (u && u.id) authId = u.id; }
    if (!authId) return J({ ok: false, error: 'No login found for ' + email + '. (They may never have had one.)' }, 200);
    const newPw = 'Next-' + Math.random().toString(36).slice(2, 8) + '-' + Math.floor(Math.random() * 90 + 10);
    const r = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users/' + authId, { method: 'PUT', headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: newPw }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); return J({ ok: false, error: (d && (d.msg || d.error_description || d.error)) || ('reset failed ' + r.status) }, 200); }
    return J({ ok: true, email, tempPassword: newPw });
  } catch (e) { return J({ ok: false, error: String((e && e.message) || e) }, 200); }
}

async function handleResetTeacherPassword(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ ok: false, error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, error: 'bad body' }, 400); }
  const tenant = String(b.tenant_id || b.tenant || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  if (!tenant || !email) return J({ ok: false, error: 'tenant_id and email required' }, 400);
  const gate = await verifyHead(request, env, tenant);
  if (!gate.ok) return J({ ok: false, error: 'Not authorised: ' + (gate.why || 'only the head teacher can reset logins') }, 403);
  try {
    let authId = null;
    const rows = await sbFetch(env, '/users?tenant_id=eq.' + encodeURIComponent(tenant) + '&email=eq.' + encodeURIComponent(email) + '&select=auth_id&limit=1');
    if (rows && rows[0] && rows[0].auth_id) authId = rows[0].auth_id;
    if (!authId) {
      const ur = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users?email=' + encodeURIComponent(email), { headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY } });
      const uj = await ur.json().catch(() => ({})); const u = (uj && uj.users && uj.users[0]) || (Array.isArray(uj) && uj[0]); if (u && u.id) authId = u.id;
    }
    if (!authId) return J({ ok: false, error: 'No login found for ' + email + '.' }, 200);
    const newPw = 'Teach-' + Math.random().toString(36).slice(2, 8) + '-' + Math.floor(Math.random() * 90 + 10);
    const r = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users/' + authId, { method: 'PUT', headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: newPw }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); return J({ ok: false, error: (d && (d.msg || d.error_description || d.error)) || ('reset failed ' + r.status) }, 200); }
    return J({ ok: true, email, tempPassword: newPw });
  } catch (e) { return J({ ok: false, error: String((e && e.message) || e) }, 200); }
}

async function handleProvisionTeachersBulk(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return J({ ok: false, error: 'Supabase not configured.' }, 500);
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, error: 'bad body' }, 400); }
  const tenant = String(b.tenant_id || b.tenant || '').trim();
  const rows = Array.isArray(b.teachers) ? b.teachers.slice(0, 300) : [];
  if (!tenant) return J({ ok: false, error: 'tenant_id required' }, 400);
  if (!rows.length) return J({ ok: false, error: 'No teachers provided.' }, 400);
  const gate = await verifyHead(request, env, tenant);
  if (!gate.ok) return J({ ok: false, error: 'Not authorised: ' + (gate.why || 'only the head teacher can add staff') }, 403);
  const toList = (v) => Array.isArray(v) ? v : String(v || '').split(/[;,]/).map(x => x.trim()).filter(Boolean);
  const results = [];
  for (const t of rows) {
    const email = String(t.email || '').trim().toLowerCase();
    const fullName = String(t.fullName || t.name || '').trim();
    if (!email || email.indexOf('@') < 0 || !fullName) { results.push({ email: t.email || '', name: fullName, ok: false, error: 'name + valid email required' }); continue; }
    const subjects = toList(t.subjects); const classes = toList(t.classes);
    const tempPassword = 'Teach-' + Math.random().toString(36).slice(2, 8) + '-' + Math.floor(Math.random() * 90 + 10);
    let authId = null, note = '';
    try {
      const au = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users', { method: 'POST', headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: tempPassword, email_confirm: true, user_metadata: { full_name: fullName, tenant_id: tenant, role: 'teacher' } }) });
      const auj = await au.json().catch(() => ({}));
      if (au.ok && auj && auj.id) authId = auj.id; else note = (auj && (auj.msg || auj.error_description || auj.error)) || ('auth ' + au.status);
    } catch (e) { note = String((e && e.message) || e); }
    let userRowId = null;
    if (authId) { try { const ur = await sbWrite(env, '/users', { auth_id: authId, tenant_id: tenant, email, full_name: fullName, role: 'teacher', phone: t.phone || null }, 'POST', 'return=representation'); if (Array.isArray(ur) && ur[0]) userRowId = ur[0].id; } catch (e) { note = 'login created, link failed'; } }
    try { await sbWrite(env, '/teachers', { tenant_id: tenant, user_id: userRowId, full_name: fullName, subjects: subjects, phone: t.phone || null, email, status: 'active' }, 'POST', 'return=minimal'); } catch (e) { note = (note ? note + '; ' : '') + 'staff: ' + ((e && e.message) || e); }
    if (classes.length) { try { await sbWrite(env, '/os_records', { tenant: tenant, kind: 'staff_meta', payload: { email, classes } }, 'POST', 'return=minimal'); } catch (e) {} }
    results.push({ email, name: fullName, ok: !!authId, tempPassword: authId ? tempPassword : null, note });
  }
  return J({ ok: true, created: results.filter(r => r.ok).length, total: rows.length, results });
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



// ─── Web Push (RFC 8291 aes128gcm + VAPID ES256) ───────────────────────────
function _pbu(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
function _b64u(buf) { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function _cat() { let len = 0; for (const a of arguments) len += a.length; const out = new Uint8Array(len); let o = 0; for (const a of arguments) { out.set(a, o); o += a.length; } return out; }
async function _hmac(keyBuf, dataBuf) { const k = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, dataBuf)); }

async function _vapidJWT(env, aud) {
  const te = new TextEncoder();
  const head = _b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = _b64u(te.encode(JSON.stringify({ aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@nextafrica.ai' })));
  const unsigned = head + '.' + body;
  const jwk = JSON.parse(env.VAPID_JWK);
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned));
  return unsigned + '.' + _b64u(sig);
}

async function _encryptPush(payloadStr, p256dhB64, authB64) {
  const te = new TextEncoder();
  const uaPub = _pbu(p256dhB64);
  const authSecret = _pbu(authB64);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const prkKey = await _hmac(authSecret, ecdh);
  const keyInfo = _cat(te.encode('WebPush: info\0'), uaPub, asPubRaw);
  const ikm = await _hmac(prkKey, _cat(keyInfo, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await _hmac(salt, ikm);
  const cek = (await _hmac(prk, _cat(te.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await _hmac(prk, _cat(te.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const plaintext = _cat(te.encode(payloadStr), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext));
  const rs = new Uint8Array([0, 0, 0x10, 0]);
  const idlen = new Uint8Array([asPubRaw.length]);
  return _cat(salt, rs, idlen, asPubRaw, ct);
}

async function sendWebPush(env, sub, payloadObj) {
  try {
    if (!env.VAPID_JWK || !env.VAPID_PUBLIC) return { ok: false, status: 0, error: 'VAPID not configured' };
    const aud = new URL(sub.endpoint).origin;
    const jwt = await _vapidJWT(env, aud);
    const body = await _encryptPush(JSON.stringify(payloadObj), sub.keys.p256dh, sub.keys.auth);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'TTL': '2419200',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'Authorization': 'vapid t=' + jwt + ', k=' + env.VAPID_PUBLIC,
      },
      body: body,
    });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, gone: res.status === 404 || res.status === 410 };
  } catch (e) { return { ok: false, status: 0, error: String((e && e.message) || e) }; }
}

async function deliverPush(env, tenant, emails, role, payload) {
  let rows = [];
  try { rows = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant) + '&kind=eq.push_sub&select=id,payload&limit=1000'); } catch (e) {}
  const emailSet = (emails || []).map(e => String(e).toLowerCase());
  const targets = (rows || []).filter(r => {
    const p = r.payload || {};
    if (emailSet.length) return emailSet.indexOf((p.email || '').toLowerCase()) >= 0;
    if (role) { const OPS = ['operator', 'owner', 'admin', 'director']; if (OPS.indexOf(role) >= 0) return OPS.indexOf(p.role || '') >= 0; return (p.role || '') === role; }
    return false;
  });
  let ok = 0, gone = 0;
  for (const r of targets) {
    const res = await sendWebPush(env, r.payload, payload);
    if (res.ok) ok++;
    if (res.gone) { gone++; try { await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + r.id, { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') }); } catch (e) {} }
  }
  return { matched: targets.length, ok: ok, gone: gone };
}

async function handlePushSubscribe(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || 'next').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const role = String(b.role || '').trim();
  const sub = b.subscription;
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return J({ error: 'valid subscription required' }, 400);
  try {
    const existing = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant) + '&kind=eq.push_sub&select=id,payload&limit=1000');
    for (const row of (existing || [])) { if (row.payload && row.payload.endpoint === sub.endpoint) { try { await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + row.id, { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') }); } catch (e) {} } }
    await sbWrite(env, '/os_records', { tenant: tenant, kind: 'push_sub', payload: { email: email, role: role, endpoint: sub.endpoint, keys: sub.keys, ts: Date.now() } }, 'POST', 'return=minimal');
    return J({ ok: true });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

async function handlePushNotify(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || 'next').trim();
  const v = await verifyMember(request, env, tenant);
  if (!v.ok) return J({ error: 'not authorized: ' + (v.why || '') }, 401);
  const emails = Array.isArray(b.emails) ? b.emails : [];
  const role = b.role ? String(b.role) : null;
  const payload = { title: String(b.title || 'NEXT OS'), body: String(b.body || ''), url: String(b.url || '/'), tag: String(b.tag || ('t' + Date.now())) };
  if (!emails.length && !role) return J({ error: 'emails or role required' }, 400);
  const r = await deliverPush(env, tenant, emails, role, payload);
  return J({ ok: true, matched: r.matched, sent: r.ok, gone: r.gone });
}

async function handlePushTest(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || 'next').trim();
  const email = String(b.email || '').trim().toLowerCase();
  if (!email) return J({ error: 'email required' }, 400);
  const r = await deliverPush(env, tenant, [email], null, { title: 'NEXT OS ✓', body: 'Phone alerts are on. Head’s tasks will land right here.', url: '/', tag: 'nx-test' });
  return J({ ok: true, matched: r.matched, sent: r.ok });
}

async function handlePushDebug(tenant, doSend, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  const conf = { VAPID_PUBLIC: !!env.VAPID_PUBLIC, VAPID_JWK: !!env.VAPID_JWK, VAPID_SUBJECT: env.VAPID_SUBJECT || null };
  let jwkOk = false; try { const j = JSON.parse(env.VAPID_JWK); jwkOk = !!(j && j.d && j.x && j.y); } catch (e) {}
  let rows = [];
  try { rows = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant) + '&kind=eq.push_sub&select=id,payload&limit=1000'); } catch (e) { return J({ tenant, conf, jwkOk, error: 'db: ' + String(e && e.message || e) }, 200); }
  const subs = (rows || []).map(r => { const p = r.payload || {}; let host = ''; try { host = new URL(p.endpoint).host; } catch (e) {} return { email: p.email || '', role: p.role || '', host: host, ts: p.ts || 0 }; });
  const out = { tenant, conf, jwkOk, subCount: subs.length, subs: subs };
  if (doSend) {
    const results = [];
    for (const r of (rows || [])) {
      const res = await sendWebPush(env, r.payload, { title: 'NEXT OS · diagnostic', body: 'If you see this, push works.', url: '/', tag: 'nx-debug' });
      let host = ''; try { host = new URL(r.payload.endpoint).host; } catch (e) {}
      results.push({ email: (r.payload && r.payload.email) || '', host: host, ok: res.ok, status: res.status, gone: !!res.gone, error: res.error || null });
    }
    out.sendResults = results;
  }
  return J(out, 200);
}


// ── Speech-to-text (tap-to-talk transcription, esp. for iOS where the browser
//    has no SpeechRecognition). Uses Workers AI Whisper. POST raw audio bytes. ──
async function handleSTT(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (request.method !== 'POST') return J({ error: 'POST audio bytes' }, 405);
  if (!env.AI) return J({ error: 'Workers AI (env.AI) not bound' }, 500);
  try {
    const buf = await request.arrayBuffer();
    if (!buf || buf.byteLength < 200) return J({ error: 'no audio' }, 400);
    const bytes = [...new Uint8Array(buf)];
    let text = '';
    try { const r = await env.AI.run('@cf/openai/whisper', { audio: bytes }); text = (r && (r.text || r.transcription || '')) || ''; }
    catch (e) { return J({ error: 'stt failed: ' + String((e && e.message) || e) }, 200); }
    return J({ ok: true, text: String(text).trim() });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

// ─── Tiny PNG icon generator (brand colour square + initials) ───────────────
const _PNG_FONT = {
  A:[0x7E,0x11,0x11,0x11,0x7E],B:[0x7F,0x49,0x49,0x49,0x36],C:[0x3E,0x41,0x41,0x41,0x22],
  D:[0x7F,0x41,0x41,0x41,0x3E],E:[0x7F,0x49,0x49,0x49,0x41],F:[0x7F,0x09,0x09,0x09,0x01],
  G:[0x3E,0x41,0x49,0x49,0x7A],H:[0x7F,0x08,0x08,0x08,0x7F],I:[0x00,0x41,0x7F,0x41,0x00],
  J:[0x20,0x40,0x41,0x3F,0x01],K:[0x7F,0x08,0x14,0x22,0x41],L:[0x7F,0x40,0x40,0x40,0x40],
  M:[0x7F,0x02,0x0C,0x02,0x7F],N:[0x7F,0x04,0x08,0x10,0x7F],O:[0x3E,0x41,0x41,0x41,0x3E],
  P:[0x7F,0x09,0x09,0x09,0x06],Q:[0x3E,0x41,0x51,0x21,0x5E],R:[0x7F,0x09,0x19,0x29,0x46],
  S:[0x46,0x49,0x49,0x49,0x31],T:[0x01,0x01,0x7F,0x01,0x01],U:[0x3F,0x40,0x40,0x40,0x3F],
  V:[0x1F,0x20,0x40,0x20,0x1F],W:[0x7F,0x20,0x18,0x20,0x7F],X:[0x63,0x14,0x08,0x14,0x63],
  Y:[0x07,0x08,0x70,0x08,0x07],Z:[0x61,0x51,0x49,0x45,0x43],
  '0':[0x3E,0x51,0x49,0x45,0x3E],'1':[0x00,0x42,0x7F,0x40,0x00],'2':[0x42,0x61,0x51,0x49,0x46],
  '3':[0x21,0x41,0x45,0x4B,0x31],'4':[0x18,0x14,0x12,0x7F,0x10],'5':[0x27,0x45,0x45,0x45,0x39],
  '6':[0x3C,0x4A,0x49,0x49,0x30],'7':[0x01,0x71,0x09,0x05,0x03],'8':[0x36,0x49,0x49,0x49,0x36],
  '9':[0x06,0x49,0x49,0x29,0x1E],' ':[0,0,0,0,0]
};
function _pHexRgb(h){ h=(h||'#00FC8F').replace('#',''); if(h.length===3)h=h.split('').map(c=>c+c).join(''); return [parseInt(h.slice(0,2),16)||0,parseInt(h.slice(2,4),16)||200,parseInt(h.slice(4,6),16)||140]; }
function _pU32(n){ return new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]); }
function _pCat(arrs){ let len=0; for(const a of arrs)len+=a.length; const o=new Uint8Array(len); let p=0; for(const a of arrs){ o.set(a,p); p+=a.length; } return o; }
function _pCrc(buf){ let c=~0; for(let i=0;i<buf.length;i++){ c^=buf[i]; for(let k=0;k<8;k++) c=(c>>>1)^(0xEDB88320&-(c&1)); } return (~c)>>>0; }
function _pAdler(buf){ let a=1,b=0; for(let i=0;i<buf.length;i++){ a=(a+buf[i])%65521; b=(b+a)%65521; } return ((b<<16)|a)>>>0; }
function _pChunk(type,data){ const t=new Uint8Array([type.charCodeAt(0),type.charCodeAt(1),type.charCodeAt(2),type.charCodeAt(3)]); const body=_pCat([t,data]); return _pCat([_pU32(data.length),body,_pU32(_pCrc(body))]); }
function _pZlib(raw){ const parts=[new Uint8Array([0x78,0x01])]; let off=0; while(off<raw.length){ const len=Math.min(65535,raw.length-off); const last=(off+len>=raw.length)?1:0; parts.push(new Uint8Array([last,len&255,(len>>8)&255,(~len)&255,((~len)>>8)&255])); parts.push(raw.subarray(off,off+len)); off+=len; } parts.push(_pU32(_pAdler(raw))); return _pCat(parts); }
function makeIconPng(letters, color, size) {
  size = size || 512;
  const rgb = _pHexRgb(color); const br=rgb[0],bg=rgb[1],bb=rgb[2];
  const lum = 0.299*br+0.587*bg+0.114*bb;
  const fg = lum>150 ? [15,18,30] : [255,255,255];
  const px = new Uint8Array(size*size*3);
  for (let i=0;i<size*size;i++){ px[i*3]=br; px[i*3+1]=bg; px[i*3+2]=bb; }
  letters = String(letters||'N').toUpperCase().slice(0,2);
  const n=letters.length, gw=5, gh=7;
  const scale=Math.floor((size*0.5)/gh);
  const charW=gw*scale, gap=Math.floor(scale*1.4);
  const totalW=n*charW+(n-1)*gap;
  const startX=Math.floor((size-totalW)/2);
  const startY=Math.floor((size-gh*scale)/2);
  for (let ci=0; ci<n; ci++){
    const glyph=_PNG_FONT[letters[ci]]||_PNG_FONT['N'];
    const ox=startX+ci*(charW+gap);
    for (let col=0; col<gw; col++){
      const bits=glyph[col];
      for (let row=0; row<gh; row++){
        if (!(bits & (1<<row))) continue;
        for (let sx=0; sx<scale; sx++){
          for (let sy=0; sy<scale; sy++){
            const x=ox+col*scale+sx, y=startY+row*scale+sy;
            if (x<0||x>=size||y<0||y>=size) continue;
            const idx=(y*size+x)*3;
            px[idx]=fg[0]; px[idx+1]=fg[1]; px[idx+2]=fg[2];
          }
        }
      }
    }
  }
  const stride=size*3+1;
  const raw=new Uint8Array(size*stride);
  for (let y=0;y<size;y++){ raw[y*stride]=0; raw.set(px.subarray(y*size*3,(y+1)*size*3), y*stride+1); }
  const ihdr=_pCat([_pU32(size),_pU32(size),new Uint8Array([8,2,0,0,0])]);
  return _pCat([new Uint8Array([137,80,78,71,13,10,26,10]), _pChunk('IHDR',ihdr), _pChunk('IDAT',_pZlib(raw)), _pChunk('IEND',new Uint8Array(0))]);
}
