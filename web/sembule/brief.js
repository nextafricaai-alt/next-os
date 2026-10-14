// Public client brief. One project, by its private link. The client fills it in step by step (saved as they go),
// and only sees the sections for the services we are providing. No sign-in; nothing else is reachable.
import { getClient } from './db.js';
import { briefSteps, serviceLabel, SERVICES } from './briefdef.js';

const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = document.getElementById('page');
const token = new URLSearchParams(location.search).get('t') || '';
const LS = 'sembule-brief-' + token;
const date = d => d ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'Africa/Kampala' }).format(new Date(d)) : '';
let info = null, steps = [], data = {}, step = 0, client = null, saving = false;

const invalid = msg => root.innerHTML = `<header class="pp-head"><img src="./assets/brand/logo-white.png" alt="Sembule Media"><span>PROJECT BRIEF</span></header><div class="bf-wrap"><div class="bf-card"><h2>This link is not available</h2><p>${e(msg)}</p></div></div>`;
const head = () => `<header class="pp-head"><img src="./assets/brand/logo-white.png" alt="Sembule Media"><span>PROJECT BRIEF</span></header>`;

function fieldHtml(f) {
  const v = data[f.k], id = 'f_' + f.k, req = f.required ? ' <span style="color:#F0C75A">*</span>' : '', hint = f.hint ? `<small>${e(f.hint)}</small>` : '';
  if (f.type === 'textarea') return `<div class="bf-f"><label for="${id}">${e(f.label)}${req}</label>${hint}<textarea id="${id}" data-k="${f.k}">${e(v || '')}</textarea></div>`;
  if (f.type === 'select') return `<div class="bf-f"><label for="${id}">${e(f.label)}${req}</label><select id="${id}" data-k="${f.k}"><option value="">Choose…</option>${f.opts.map(o => `<option${v === o ? ' selected' : ''}>${e(o)}</option>`).join('')}</select></div>`;
  if (f.type === 'chips') { const set = Array.isArray(v) ? v : []; return `<div class="bf-f"><b>${e(f.label)}${req}</b>${hint}<div class="bf-opts">${f.opts.map(o => `<label class="bf-opt"><input type="checkbox" data-chip="${f.k}" value="${e(o)}"${set.includes(o) ? ' checked' : ''}><span>${e(o)}</span></label>`).join('')}</div></div>`; }
  if (f.type === 'check') return `<div class="bf-f"><label class="bf-check"><input type="checkbox" data-k="${f.k}"${v ? ' checked' : ''}><span>${e(f.label)}${req}</span></label></div>`;
  if (f.type === 'songs') { const rows = Array.isArray(v) && v.length ? v : [{}]; return `<div class="bf-f"><b>${e(f.label)}</b>${hint}<div class="bf-songs" id="songs">${rows.map(songRow).join('')}</div><button type="button" class="bf-add" id="add-song">+ Add another song</button></div>`; }
  return `<div class="bf-f"><label for="${id}">${e(f.label)}${req}</label>${hint}<input id="${id}" data-k="${f.k}" type="${f.type || 'text'}" ${f.type === 'number' ? 'inputmode="numeric" min="0"' : ''}value="${e(v || '')}"></div>`;
}
const songRow = s => `<div class="bf-song"><input data-song="t" placeholder="Song title" value="${e(s.t || '')}"><input data-song="a" placeholder="Artist" value="${e(s.a || '')}"><input class="m" data-song="m" placeholder="When should we play it? (e.g. when the couple enters)" value="${e(s.m || '')}"><button type="button" data-rm aria-label="Remove song">×</button></div>`;

function collect() {
  root.querySelectorAll('[data-k]').forEach(el => { data[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
  const chipKeys = new Set([...root.querySelectorAll('[data-chip]')].map(x => x.dataset.chip));
  chipKeys.forEach(k => { data[k] = [...root.querySelectorAll(`[data-chip="${k}"]:checked`)].map(x => x.value); });
  const songs = root.querySelector('#songs');
  if (songs) data.songs = [...songs.querySelectorAll('.bf-song')].map(r => ({ t: r.querySelector('[data-song=t]').value.trim(), a: r.querySelector('[data-song=a]').value.trim(), m: r.querySelector('[data-song=m]').value.trim() })).filter(s => s.t || s.a);
  try { localStorage.setItem(LS, JSON.stringify(data)); } catch {}
}
async function persist(done) {
  const { data: ok, error } = await client.rpc('brief_save', { p_token: token, p_data: data, p_done: done });
  return !error && ok;
}
function missing() {
  const s = steps[step], out = [];
  for (const f of s.fields) if (f.required) { const v = data[f.k]; if (f.type === 'check' ? !v : !(Array.isArray(v) ? v.length : String(v || '').trim())) out.push(f.label.replace(/\.$/, '')); }
  return out;
}

function render() {
  const s = steps[step], last = step === steps.length - 1;
  const svc = (info.services || []).map(serviceLabel);
  root.innerHTML = `${head()}<div class="bf-wrap">
   <div class="bf-title"><p class="pp-eyebrow">${e(info.reference)} · ${e(info.client_name || '')}</p><h1>${e(info.title)}</h1><p>${date(info.starts_at)}${info.venue ? ' · ' + e(info.venue) : ''}</p>${svc.length ? `<div class="bf-chips">${svc.map(x => `<i>${e(x)}</i>`).join('')}</div>` : ''}</div>
   <div class="bf-progress">${steps.map((_, i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('')}</div>
   <div class="bf-card"><h2>${e(s.title)}</h2><p>${e(s.desc)}</p>${s.fields.map(fieldHtml).join('')}<p class="bf-err" id="err" role="alert"></p>
   <p class="bf-saved">Step ${step + 1} of ${steps.length} · Your answers are saved as you go</p></div></div>
   <div class="bf-nav"><div>${step ? '<button type="button" id="back">Back</button>' : ''}<button type="button" class="go" id="next">${last ? 'Send my brief' : 'Continue'}</button></div></div>`;
  window.scrollTo(0, 0);
  root.querySelector('#add-song')?.addEventListener('click', () => { collect(); const w = root.querySelector('#songs'); w.insertAdjacentHTML('beforeend', songRow({})); w.lastElementChild.querySelector('input').focus(); });
  root.querySelector('#songs')?.addEventListener('click', ev => { const b = ev.target.closest('[data-rm]'); if (!b) return; b.closest('.bf-song').remove(); if (!root.querySelector('.bf-song')) root.querySelector('#songs').insertAdjacentHTML('beforeend', songRow({})); });
  root.querySelector('#back')?.addEventListener('click', () => { collect(); step--; render(); });
  root.querySelector('#next').addEventListener('click', async ev => {
    collect(); const miss = missing(), err = root.querySelector('#err');
    if (miss.length) { err.textContent = 'Please fill in: ' + miss.join(', '); return; }
    const btn = ev.currentTarget; btn.disabled = true; btn.textContent = 'Saving…';
    const ok = await persist(last);
    if (!ok) { btn.disabled = false; btn.textContent = last ? 'Send my brief' : 'Continue'; err.textContent = 'We could not save. Please check your connection and try again.'; return; }
    if (last) { try { localStorage.removeItem(LS); } catch {} return thanks(); }
    step++; render();
  });
}
function thanks() {
  root.innerHTML = `${head()}<div class="bf-wrap"><div class="bf-card bf-done"><div class="ring">✓</div><h2>Thank you${data.c_name ? ', ' + e(data.c_name.split(' ')[0]) : ''}.</h2><p>Your brief is with the Sembule Media team. We will use it to plan every detail of your day, and we will be in touch if we need anything else.</p><button type="button" id="edit">Change my answers</button></div></div>`;
  root.querySelector('#edit').addEventListener('click', () => { step = 0; render(); });
}

(async () => {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return invalid('Please use the link we sent you.');
  try {
    client = await getClient();
    const { data: d, error } = await client.rpc('brief_page', { p_token: token });
    if (error || !d) return invalid('Please ask the office to send you a new link.');
    info = d; steps = briefSteps(d.services || []);
    data = { ...(d.brief || {}) };
    try { Object.assign(data, JSON.parse(localStorage.getItem(LS) || '{}')); } catch {}
    if (!data.c_name && d.client_name) data.c_name = d.client_name;
    if (!data.c_phone && d.client_phone) data.c_phone = d.client_phone;
    if (!data.c_email && d.client_email) data.c_email = d.client_email;
    if (!data.c_org && d.client_org) data.c_org = d.client_org;
    if (!data.venue && d.venue) data.venue = d.venue;
    if (d.brief_status === 'submitted') return thanks();
    const done = steps.findIndex(s => s.fields.some(f => f.required && !data[f.k])); step = 0; if (done > 0 && d.brief_status === 'started') step = done;
    render();
  } catch { invalid('We could not load this page. Please check your connection and try again.'); }
})();
