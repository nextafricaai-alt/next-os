// Projects: pick what kind of project it is, send the client brief, read the answers.
import { SERVICES, serviceLabel, briefSteps, answered } from './briefdef.js';
import { e } from './records.js';
import { saveRow } from '../data.js';
import { CONFIG } from '../config.js';
import { printDocument, readable, whatsappTo, shareLink } from '../refs.js';

const KEYWORDS = { sound: /sound|pa\b|speaker|mic/i, dj: /\bdj\b|\bmc\b/i, screens: /screen|projector|tv|display/i, led: /\bled\b/i, livestream: /live ?stream|broadcast|stream/i, wedding: /wedding/i, introduction: /introduction|kwanjula|kuhingira/i, photo: /photo/i, video: /video|film/i, music_video: /music video/i, documentary: /documentary/i };
export function inferServices(text) { return Object.entries(KEYWORDS).filter(([, re]) => re.test(text || '')).map(([id]) => id); }
export const serviceType = ids => ids.map(serviceLabel).join(' + ');

export function servicePicker(selected = []) {
  return `<div class="span-2 svc-pick"><b>What kind of project is this?</b><small>Tick everything we are providing. The client brief will ask about each one.</small>
   <div class="svc-grid">${SERVICES.map(s => `<label class="svc"><input type="checkbox" name="services" value="${s.id}"${selected.includes(s.id) ? ' checked' : ''}><span><strong>${e(s.label)}</strong><small>${e(s.note)}</small></span></label>`).join('')}</div></div>`;
}
export const readServices = form => [...form.querySelectorAll('[name=services]:checked')].map(x => x.value);

const STATUS = { sent: ['Sent, waiting for the client', ''], not_sent: ['Not sent yet', ''], started: ['Client started', 'overdue'], submitted: ['Completed by the client', 'status'] };
function link(j) { return shareLink('brief', j.brief_token); }

function answerHtml(f, v) {
  if (f.type === 'songs') return `<table class="data-table"><thead><tr><th>Song</th><th>Artist</th><th>When to play it</th></tr></thead><tbody>${v.map(s => `<tr><td>${e(s.t || '')}</td><td>${e(s.a || '')}</td><td>${e(s.m || '')}</td></tr>`).join('')}</tbody></table>`;
  if (Array.isArray(v)) return e(v.join(', '));
  if (v === true) return 'Yes';
  return e(String(v)).replace(/\n/g, '<br>');
}
export function briefTab(ctx) {
  const j = ctx.job, c = ctx.clients.find(x => x.id === j.client_id) || {}, svc = j.services || [], data = j.brief || {}, [label, cls] = STATUS[j.brief_status] || STATUS.not_sent;
  if (!svc.length) return `<div class="select-prompt"><h2>Choose the kind of project first</h2><p>Open the Overview tab and tick what we are providing (sound, screens, wedding and so on). Then the client brief will ask the right questions.</p></div>`;
  const steps = briefSteps(svc).filter(s => s.id !== 'core');
  const sections = steps.map(s => { const rows = s.fields.filter(f => answered(data, f) && f.k !== 'confirm'); return rows.length ? `<div class="check-group"><h3>${e(s.title)}</h3>${rows.map(f => `<div class="bf-a"><small>${e(f.label)}</small><div>${answerHtml(f, data[f.k])}</div></div>`).join('')}</div>` : ''; }).join('');
  const contact = ['c_name', 'c_org', 'c_phone', 'c_email'].filter(k => data[k]).map(k => e(data[k])).join(' · ');
  return `<div class="module-toolbar"><div><strong>Client brief</strong><span>${svc.map(serviceLabel).map(e).join(' · ')}</span></div><em class="${cls || 'chip'}">${e(label)}</em></div>
   <div class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">SEND IT TO THE CLIENT</p></div>
    <p class="span-2 muted small-note">The client opens one private link, answers a few questions about each service, and everything lands here. ${j.brief_updated_at ? 'Last updated ' + readable(j.brief_updated_at) + '.' : ''}</p>
    <div class="form-actions span-2"><button class="button primary" type="button" data-bsend>Send on WhatsApp</button><button class="button secondary" type="button" data-bcopy>Copy link</button><button class="button secondary" type="button" data-bopen>Preview what the client sees</button>${sections ? '<button class="button secondary" type="button" data-bprint>Print the answers</button>' : ''}</div></div>
   ${sections ? `${contact ? `<p class="muted small-note">Contact on the brief: ${contact}</p>` : ''}${sections}` : '<p class="muted small-note">No answers yet. When the client fills in the brief, their answers appear here.</p>'}`;
}

export function bindBrief(ctx, host, client, notify, run) {
  const j = ctx.job; if (!j) return;
  const c = ctx.clients.find(x => x.id === j.client_id) || {};
  const mark = () => j.brief_status === 'not_sent' ? saveRow(client, 'jobs', { brief_status: 'sent' }, j.id).catch(() => {}) : null;
  host.querySelector('[data-bsend]')?.addEventListener('click', () => {
    whatsappTo(c.phone, `Hello ${c.name || ''}, thank you for booking ${CONFIG.name}. To get every detail right for ${j.title}, please fill in your short project brief here: ${link(j)}\n\nIt takes about 5 minutes and saves as you go. The more we know now, the smoother your day.`);
    mark();
  });
  host.querySelector('[data-bcopy]')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(link(j)); notify('Brief link copied.'); mark(); } catch { notify(link(j)); } });
  host.querySelector('[data-bopen]')?.addEventListener('click', () => window.open(link(j), '_blank'));
  host.querySelector('[data-bprint]')?.addEventListener('click', () => {
    const data = j.brief || {}, steps = briefSteps(j.services || []).filter(s => s.id !== 'core');
    const body = steps.map(s => { const rows = s.fields.filter(f => answered(data, f) && f.k !== 'confirm'); return rows.length ? `<div class="box" style="margin-top:18px"><h3>${e(s.title.toUpperCase())}</h3>${rows.map(f => f.type === 'songs' ? `<p><strong>${e(f.label)}:</strong></p>${data[f.k].map((x, i) => `<p>${i + 1}. ${e(x.t || '')}${x.a ? ' · ' + e(x.a) : ''}${x.m ? ' (' + e(x.m) + ')' : ''}</p>`).join('')}` : `<p><strong>${e(f.label)}:</strong> ${answerHtml(f, data[f.k])}</p>`).join('')}</div>` : ''; }).join('');
    printDocument({ title: 'Project brief', heading: 'PROJECT BRIEF', reference: j.reference, partyLabel: 'CLIENT', metaLines: [readable(j.starts_at), (j.services || []).map(serviceLabel).join(' · ')], party: c, notify, filename: `Brief_${j.reference}`, body: body || '<p>No answers yet.</p>' });
  });
}
