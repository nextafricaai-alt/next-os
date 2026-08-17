/*
 * nia-llm.js — one shared "which brain answers" client for every surface
 * that talks to Nia: Nia Studio (Site/Graphics/Intel) and, going forward,
 * anywhere else outside the main React app that needs an LLM call.
 *
 * Before this file existed, each Studio page had its own near-duplicate
 * copy of this dispatch logic — and only studio.html's copy actually
 * supported a connected Claude/OpenAI key. graphics.html and nia-intel.html
 * always hit the free Workers AI tier directly, so someone who'd connected
 * a strong key (expecting it to improve "Nia" everywhere) silently got a
 * materially weaker result in two of the three modes, with no indication
 * why. This file is the fix: one client, used the same way everywhere,
 * reading the exact same settings the main NEXT OS app's "Talk to Nia"
 * panel already writes (see os-agent.jsx) — connect a key once, it applies
 * everywhere, consistently.
 *
 * Usage:
 *   <script src="/nia-llm.js"></script>
 *   NiaLLM.ask(systemPrompt, [{role:'user', content:'...'}]).then(text => ...)
 *   NiaLLM.brainLabel()  ->  "Free · gpt-oss-120b" | "Claude" | "GPT-4o"
 */
(function (global) {
  'use strict';

  var KEY_API_KEY  = 'nextos.agent.apiKey.v1';
  var KEY_PROVIDER = 'nextos.agent.provider.v1';
  var DEFAULT_PROVIDER = 'nia-free';
  var DEFAULT_MODEL = { anthropic: 'claude-sonnet-4-5-20250929', openai: 'gpt-4o', 'nia-free': 'gpt-oss-120b' };
  var NIA_FREE_ENDPOINT = 'https://nextos-sentinel.nextafricaai.workers.dev';

  function safeGet(k, f) { try { var v = global.localStorage && global.localStorage.getItem(k); return v == null ? f : v; } catch (e) { return f; } }

  function settings() {
    return { apiKey: safeGet(KEY_API_KEY, ''), provider: safeGet(KEY_PROVIDER, DEFAULT_PROVIDER) };
  }

  /** Short, honest label for whichever brain is currently active — put this
   *  next to Nia's name in any chat header so the active tier is never a
   *  silent surprise. */
  function brainLabel() {
    var s = settings();
    if (s.provider === 'anthropic' && s.apiKey) return 'Claude';
    if (s.provider === 'openai' && s.apiKey) return 'GPT-4o';
    return 'Free · gpt-oss-120b';
  }

  function endpoint() { return (typeof global !== 'undefined' && global.NEXT_OS_SENTINEL_ENDPOINT) || NIA_FREE_ENDPOINT; }

  function textFromAnthropicShape(data) {
    if (data && data.content && data.content.length) {
      return data.content.filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
    }
    if (data && data.error) throw new Error(typeof data.error === 'string' ? data.error : (data.error.message || 'LLM error'));
    return typeof data === 'string' ? data : '';
  }

  function callAnthropic(apiKey, model, system, messages) {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: model, system: system, messages: messages, max_tokens: 4096 }),
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.error) throw new Error(data.error.message || 'Claude error');
      return textFromAnthropicShape(data);
    });
  }

  function callOpenAI(apiKey, model, system, messages) {
    var flat = [{ role: 'system', content: system }].concat(messages.map(function (m) {
      return { role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
    }));
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model: model, max_tokens: 4096, messages: flat }),
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.error) throw new Error((data.error && data.error.message) || 'OpenAI error');
      return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    });
  }

  function callNiaFree(system, messages) {
    return fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: system, messages: messages }),
    }).then(function (r) { return r.json(); }).then(textFromAnthropicShape);
  }

  /** Sends one turn to whichever brain is currently connected, always
   *  resolving to a plain text string (or rejecting with a real Error). */
  function ask(system, messages) {
    var s = settings();
    if (s.provider === 'anthropic' && s.apiKey) return callAnthropic(s.apiKey, DEFAULT_MODEL.anthropic, system, messages);
    if (s.provider === 'openai' && s.apiKey) return callOpenAI(s.apiKey, DEFAULT_MODEL.openai, system, messages);
    return callNiaFree(system, messages);
  }

  global.NiaLLM = { ask: ask, brainLabel: brainLabel, settings: settings };
})(typeof window !== 'undefined' ? window : this);
