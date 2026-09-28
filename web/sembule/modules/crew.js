// Crew directory: the freelancers and part-time team Tony calls on. No logins, no pay here.
import { listRows, saveRow, deleteRow } from '../data.js';
import { withTimeout } from '../utils.js';
import { e, empty, field, setBusy } from './records.js';
import { readable } from '../refs.js';

const SKILLS = ['Camera', 'Switcher / director', 'Sound', 'Electrician', 'Photography', 'Editing', 'Graphics', 'Screens / playback', 'Driver'];
let selected = null;

function editor(x, ctx) {
  const has = s => (x?.skills || []).includes(s);
  return `<form id="crew-form" class="record-form" data-id="${x?.id || ''}"><div class="form-title span-2"><div><p class="eyebrow">${x ? 'CREW MEMBER' : 'NEW CREW MEMBER'}</p><h2>${x ? e(x.name) : 'Add a person'}</h2></div></div>
   ${field('name', 'Full name', x?.name, { required: true })}${field('phone', 'Phone / WhatsApp', x?.phone)}${field('email', 'Email', x?.email, { type: 'email' })}
   <label class="check-label"><input type="checkbox" name="active" ${x?.active === false ? '' : 'checked'}> Available for new jobs</label>
   <div class="span-2"><p class="eyebrow skills-head">SKILLS</p><div class="skill-grid">${SKILLS.map(s => `<label class="skill"><input type="checkbox" name="skill" value="${e(s)}" ${has(s) ? 'checked' : ''}><span>${e(s)}</span></label>`).join('')}</div></div>
   ${x ? `<div class="span-2"><p class="eyebrow skills-head">RECENT JOBS</p>${ctx.history.length ? ctx.history.map(h => `<p class="history">${e(h.role)} · ${readable(h.starts_at)}</p>`).join('') : '<p class="muted small-note">No jobs yet.</p>'}</div>` : ''}
   <div class="form-actions span-2"><button class="button primary" type="submit">Save</button><button class="button secondary" type="button" data-cancel>Cancel</button>${x && ctx.identity.role === 'owner' ? '<button class="button danger" type="button" data-delete>Delete</button>' : ''}</div></form>`;
}
async function draw(context) {
  const { client, host } = context;
  host.innerHTML = '<div class="module-loading">Loading crew…</div>';
  try {
    const crew = await listRows(client, 'crew', 'name', true);
    const cur = crew.find(c => c.id === selected);
    let history = [];
    if (cur) { const { data } = await withTimeout(client.from('job_crew').select('role,starts_at').eq('crew_id', cur.id).order('starts_at', { ascending: false }).limit(8)); history = data || []; }
    context.ctx = { ...context, crew, history };
    host.innerHTML = `<div class="module-toolbar"><div><strong>${crew.filter(c => c.active).length} people available</strong><span>Your freelancers and part-time team</span></div><button class="button primary" data-new>Add person</button></div>
     <div class="records-layout"><section class="record-list">${crew.length ? crew.map(c => `<button class="record-card${c.id === selected ? ' active' : ''}" data-row="${c.id}"><span><strong>${e(c.name)}</strong><small>${e((c.skills || []).join(', ') || c.phone || 'No skills recorded')}</small></span>${c.active ? '' : '<span><em class="overdue">Unavailable</em></span>'}</button>`).join('') : empty('No crew yet. Add the people you usually hire.')}</section>
     <section class="record-editor">${selected === 'new' ? editor(null, context.ctx) : cur ? editor(cur, context.ctx) : '<div class="select-prompt"><h2>Your crew</h2><p>Add each person once. Then assign them to jobs and send their call sheet on WhatsApp in one tap.</p></div>'}</section></div>`;
    bind(context);
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>Crew could not be loaded.</strong><p>${e(err.message)}</p><button class="button secondary" data-retry>Try again</button></div>`; bind(context); }
}
function bind(context) {
  const { host, client, notify } = context;
  const run = async (fn, ok) => { try { await fn(); if (ok) notify(ok); await draw(context); } catch (err) { notify(err.message); } };
  host.querySelector('[data-retry]')?.addEventListener('click', () => draw(context));
  host.querySelector('[data-new]')?.addEventListener('click', () => { selected = 'new'; draw(context); });
  host.querySelectorAll('[data-row]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.row; draw(context); }));
  host.querySelector('[data-cancel]')?.addEventListener('click', () => { selected = null; draw(context); });
  const f = host.querySelector('#crew-form'); if (!f) return;
  f.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(f); setBusy(f, true);
    run(async () => { const s = await saveRow(client, 'crew', { name: fd.get('name').trim(), phone: fd.get('phone').trim() || null, email: fd.get('email').trim() || null, active: fd.get('active') === 'on', skills: fd.getAll('skill') }, f.dataset.id || null); selected = s.id; }, 'Saved.'); });
  f.querySelector('[data-delete]')?.addEventListener('click', () => { if (confirm('Delete this person? If they worked on past jobs, mark them unavailable instead.')) run(async () => { await deleteRow(client, 'crew', f.dataset.id); selected = null; }, 'Deleted.'); });
}
export async function mountCrew(context) { selected = null; await draw(context); }
