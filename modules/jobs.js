// Jobs: every production from booking to delivery. Crew, call sheets, readiness checklists,
// client changes and revisions. Money (crew pay, billing a change) shows only to owner and director.
import { listRows, saveRow, deleteRow } from '../data.js';
import { withTimeout } from '../utils.js';
import { CONFIG } from '../config.js';
import { canViewMoney } from '../roles.js';
import { e, value, dateValue, empty, field, selectField, textArea, setBusy } from './records.js';
import { money, num, txt, readable, insertWithRef, whatsappTo } from '../refs.js';

const STAGES = CONFIG.stages;
const EVIDENCE = [['', 'Choose what confirmed it'], ['deposit', 'Booking payment received'], ['purchase_order', 'Purchase order received'], ['signed_approval', 'Signed approval'], ['written_approval', 'Written approval (email / WhatsApp)']];
const ROLES = ['Camera operator', 'Switcher / director', 'Sound engineer', 'Sound assistant', 'Electrician', 'Photographer', 'Screen / playback', 'Graphics operator', 'Editor', 'Assistant / runner', 'Driver'];
const TEMPLATES = {
  livestream: [['net_both', 'Speed-test MTN and Airtel 5G at the venue'], ['backup_sim', 'Backup router and data loaded'], ['ups', 'UPS charged and tested with the switcher'], ['stream_keys', 'Stream links and keys received from the client'], ['test_stream', 'Private test stream done at least 1 hour before'], ['recording', 'Local recording running'], ['graphics', 'Logos and name titles loaded']],
  sound: [['voltage', 'Venue power and voltage checked'], ['generator', 'Generator and fuel confirmed (if needed)'], ['mic_batteries', 'Fresh batteries in all wireless mics'], ['soundcheck', 'Sound check done before guests arrive'], ['feed', 'Audio feed to livestream / recording tested']],
  display: [['area', 'Screen area covered from rain and direct sun'], ['power', 'Stable power confirmed (UPS or generator backup)'], ['mounting', 'Stands / mounting secure and weighted'], ['cables', 'Cables taped down and away from walkways'], ['content', 'Content received from the client'], ['playback', 'Playback laptop and files tested on the screens'], ['backup', 'Backup copy of content on a second drive']],
  backup: [['cards_copied', 'All cards copied to two drives'], ['backup_checked', 'Backup opened and checked before any card is formatted']],
  delivery: [['edit_review', 'Internal review of the edit done'], ['preview_sent', 'Client preview sent'], ['final_sent', 'Final files delivered to the client']]
};
const CAT_LABEL = { livestream: 'Livestream readiness', sound: 'Sound readiness', backup: 'Footage backup', delivery: 'Delivery', display: 'Screen / display setup' };
let selected = null, tab = 'overview', stageFilter = 'active';

const localDT = iso => iso ? new Date(new Date(iso).getTime() + 3 * 3600e3).toISOString().slice(0, 16) : '';
const fromLocal = v => v ? new Date(v + ':00+03:00').toISOString() : null;
const time = iso => iso ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' }).format(new Date(iso)) : '';
const isLate = j => j.delivery_due_at && !j.delivered_at && new Date(j.delivery_due_at) < new Date();

async function rows(client, table, jobId, order = 'id') {
  const { data, error } = await withTimeout(client.from(table).select('*').eq('job_id', jobId).order(order));
  if (error) throw new Error(error.message);
  return data || [];
}

// ---------- list ----------
function listView(ctx) {
  const name = id => ctx.clients.find(c => c.id === id)?.organisation || ctx.clients.find(c => c.id === id)?.name || '';
  const active = j => !['Delivered and paid'].includes(j.stage) && !j.archived_at;
  const shown = ctx.jobs.filter(j => stageFilter === 'active' ? active(j) : stageFilter === 'all' ? true : j.stage === stageFilter)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const counts = s => ctx.jobs.filter(j => j.stage === s).length;
  const late = ctx.jobs.filter(isLate).length;
  return `<div class="module-toolbar"><div><strong>${ctx.jobs.filter(active).length} active job${ctx.jobs.filter(active).length === 1 ? '' : 's'}</strong><span>${late ? `${late} delivery${late === 1 ? '' : 'ies'} late` : 'No late deliveries'}</span></div><button class="button primary" data-new>New job</button></div>
   <div class="chip-row">${[['active', 'Active'], ...STAGES.map(s => [s, `${s} (${counts(s)})`]), ['all', 'All']].map(([k, l]) => `<button class="chip${stageFilter === k ? ' on' : ''}" data-stage="${e(k)}">${e(l)}</button>`).join('')}</div>
   <div class="records-layout"><section class="record-list">${shown.length ? shown.map(j => `<button class="record-card${j.id === selected ? ' active' : ''}" data-row="${j.id}"><span><strong>${e(j.title)}</strong><small>${e(j.reference)} · ${readable(j.starts_at)}${j.venue ? ' · ' + e(j.venue) : ''}</small></span><span><em class="status">${e(j.stage)}</em>${isLate(j) ? '<em class="overdue">Delivery late</em>' : ''}</span></button>`).join('') : empty('No jobs here. Accept a quote to book one, or use New job.')}</section>
   <section class="record-editor">${selected === 'new' ? newJob(ctx) : ctx.job ? detail(ctx) : '<div class="select-prompt"><h2>Select a job</h2><p>Plan the crew, check readiness, log client changes and track delivery.</p></div>'}</section></div>`;
}
function newJob(ctx) {
  const clientOpts = [['', 'Choose a client']].concat(ctx.clients.map(c => [c.id, c.organisation ? `${c.name} (${c.organisation})` : c.name]));
  return `<form id="newjob-form" class="record-form"><div class="form-title span-2"><div><p class="eyebrow">NEW JOB</p><h2>Book a production</h2></div></div>
   ${selectField('client_id', 'Client', '', clientOpts)}${field('title', 'Job title', '', { required: true })}
   ${field('service_type', 'Main service', '', { required: true })}${field('venue', 'Venue', '')}
   ${field('starts_at', 'Starts', '', { type: 'datetime-local', required: true })}${field('ends_at', 'Ends', '', { type: 'datetime-local', required: true })}
   <div class="form-actions span-2"><button class="button primary" type="submit">Create job</button><button class="button secondary" type="button" data-cancel>Cancel</button></div></form>`;
}

// ---------- detail ----------
function detail(ctx) {
  const j = ctx.job;
  const c = ctx.clients.find(x => x.id === j.client_id) || {};
  const tabs = [['overview', 'Overview'], ['crew', `Crew (${ctx.crewRows.length})`], ['checklist', 'Checklist'], ['changes', `Changes (${ctx.changes.length})`], ['revisions', `Revisions (${ctx.revisions.length})`]];
  const done = ctx.checks.filter(x => x.completed_at).length;
  return `<div class="job-head"><div><p class="eyebrow">${e(j.reference)} · ${e(c.organisation || c.name || '')}</p><h2>${e(j.title)}</h2><p class="muted">${readable(j.starts_at)} ${time(j.starts_at)} to ${readable(j.ends_at)} ${time(j.ends_at)}${j.venue ? ' · ' + e(j.venue) : ''}</p></div>
    <div class="stage-track">${STAGES.map((s, i) => `<span class="${STAGES.indexOf(j.stage) >= i ? 'on' : ''}" title="${e(s)}"></span>`).join('')}<small>${e(j.stage)}</small></div></div>
   <div class="tab-row">${tabs.map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" data-jtab="${k}">${e(l)}</button>`).join('')}</div>
   ${tab === 'crew' ? crewTab(ctx) : tab === 'checklist' ? checklistTab(ctx, done) : tab === 'changes' ? changesTab(ctx) : tab === 'revisions' ? revisionsTab(ctx) : overviewTab(ctx)}`;
}
function overviewTab(ctx) {
  const j = ctx.job, owner = ctx.identity.role === 'owner';
  return `<form id="job-form" class="record-form">
   ${selectField('stage', 'Stage', j.stage, STAGES.map(s => [s, s]))}${selectField('booking_evidence_type', 'Booking confirmed by', j.booking_evidence_type || '', EVIDENCE)}
   ${field('title', 'Job title', j.title, { required: true })}${field('service_type', 'Main service', j.service_type, { required: true })}
   ${field('starts_at', 'Starts', localDT(j.starts_at), { type: 'datetime-local', required: true })}${field('ends_at', 'Ends', localDT(j.ends_at), { type: 'datetime-local', required: true })}
   ${field('venue', 'Venue', j.venue)}${field('audience_size', 'Audience size', j.audience_size, { type: 'number', extra: 'min="0"' })}
   ${field('venue_contact_name', 'Venue / client contact on the day', j.venue_contact_name)}${field('venue_contact_phone', 'Contact phone', j.venue_contact_phone)}
   ${textArea('operational_brief', 'Production brief', j.operational_brief, 'What the client wants, running order, special moments. No prices here.')}
   ${textArea('call_sheet_brief', 'Notes for the crew call sheet', j.call_sheet_brief, 'Dress code, parking, meals, where to meet.')}
   <div class="span-2 subhead"><p class="eyebrow">DELIVERY</p></div>
   ${field('delivery_due_at', 'Delivery due', localDT(j.delivery_due_at), { type: 'datetime-local' })}${field('delivery_link', 'Delivery link (Google Drive, etc.)', j.delivery_link)}
   ${field('included_revisions', 'Revision rounds included', j.included_revisions, { type: 'number', extra: 'min="0"' })}
   <label class="check-label"><input type="checkbox" name="delivered" ${j.delivered_at ? 'checked' : ''}> Delivered to client${j.delivered_at ? ` <small>${readable(j.delivered_at)}</small>` : ''}</label>
   <div class="span-2 subhead"><p class="eyebrow">PERMISSION TO PUBLISH</p></div>
   <label class="check-label span-2"><input type="checkbox" name="publication_consent" ${j.publication_consent ? 'checked' : ''}> The client agrees we may use photos and videos from this job in our portfolio and social media</label>
   ${field('consent_restrictions', 'Any limits (e.g. no faces of children, no logo)', j.consent_restrictions)}
   <div class="form-actions span-2"><button class="button primary" type="submit">Save job</button><button class="button secondary" type="button" data-cancel>Close</button>${owner ? '<button class="button danger" type="button" data-delete>Delete</button>' : ''}</div></form>`;
}
function crewTab(ctx) {
  const money_ = canViewMoney(ctx.identity.role), j = ctx.job;
  const pay = id => ctx.pay.find(p => p.job_crew_id === id);
  const who = id => ctx.crew.find(c => c.id === id) || {};
  const clash = r => ctx.allCrewRows.some(o => o.crew_id === r.crew_id && o.id !== r.id && o.job_id !== r.job_id && new Date(o.starts_at) < new Date(r.ends_at) && new Date(o.ends_at) > new Date(r.starts_at));
  const crewOpts = [['', 'Choose a person']].concat(ctx.crew.filter(c => c.active).map(c => [c.id, c.name]));
  return `${ctx.crewRows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Person</th><th>Role</th><th>Call time</th><th>Status</th>${money_ ? '<th>Agreed pay</th>' : ''}<th></th></tr></thead><tbody>
   ${ctx.crewRows.map(r => { const p = pay(r.id), c = who(r.crew_id); return `<tr data-jc="${r.id}"><td><strong>${e(c.name || '')}</strong><small>${e(c.phone || '')}</small>${clash(r) ? '<small class="override">Also booked on another job at this time</small>' : ''}</td><td>${e(r.role)}${r.instructions ? `<small>${e(r.instructions)}</small>` : ''}</td><td>${r.call_time ? readable(r.call_time) + ' ' + time(r.call_time) : '-'}</td>
    <td><select class="mini-select" data-avail>${[['pending', 'Waiting'], ['confirmed', 'Confirmed'], ['declined', 'Declined']].map(([k, l]) => `<option value="${k}"${r.availability === k ? ' selected' : ''}>${l}</option>`).join('')}</select></td>
    ${money_ ? `<td><input class="mini wide" type="number" min="0" data-pay value="${value(p?.agreed_amount)}" placeholder="UGX">${p && Number(p.paid_amount) ? `<small>Paid ${money(p.paid_amount)}</small>` : ''}</td>` : ''}
    <td class="row-actions"><button type="button" class="text-button" data-sheet>Call sheet</button>${money_ ? '<button type="button" class="text-button" data-save-pay>Save pay</button><button type="button" class="text-button" data-paid>Mark paid</button>' : ''}<button type="button" class="text-button danger-text" data-remove>Remove</button></td></tr>`; }).join('')}</tbody></table></div>` : empty('No crew on this job yet.')}
   <form id="crew-form" class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">ADD CREW</p>${ctx.crew.length ? '' : '<a class="text-button" href="#crew">Add people to the crew directory first</a>'}</div>
    ${selectField('crew_id', 'Person', '', crewOpts)}${selectField('role', 'Role', ROLES[0], ROLES.map(r => [r, r]))}
    ${field('call_time', 'Call time', localDT(new Date(new Date(j.starts_at).getTime() - 2 * 3600e3).toISOString()), { type: 'datetime-local' })}${money_ ? field('agreed', 'Agreed pay (UGX)', '', { type: 'number', extra: 'min="0"' }) : ''}
    ${field('instructions', 'Instructions for this person', '')}
    <div class="form-actions span-2"><button class="button primary" type="submit">Add to job</button></div></form>`;
}
function checklistTab(ctx, done) {
  const cats = [...new Set(ctx.checks.map(c => c.category))];
  const missing = Object.keys(TEMPLATES).filter(k => !cats.includes(k));
  return `<div class="module-toolbar"><div><strong>${done} of ${ctx.checks.length} done</strong><span>${ctx.checks.length ? 'Tick each item as it is checked on site' : 'Add the checklists this job needs'}</span></div><div>${missing.map(k => `<button class="button secondary" data-template="${k}">+ ${e(CAT_LABEL[k])}</button>`).join('')}</div></div>
   ${cats.map(cat => `<div class="check-group"><h3>${e(CAT_LABEL[cat] || cat)}</h3>${ctx.checks.filter(c => c.category === cat).map(c => `<label class="check-item${c.completed_at ? ' done' : ''}"><input type="checkbox" data-check="${c.id}" ${c.completed_at ? 'checked' : ''}><span>${e(c.label)}${c.completed_at ? `<small>Done ${readable(c.completed_at)} ${time(c.completed_at)}</small>` : ''}</span></label>`).join('')}</div>`).join('')}`;
}
function changesTab(ctx) {
  const money_ = canViewMoney(ctx.identity.role);
  const billed = id => ctx.charges.find(c => c.change_id === id);
  return `<p class="muted small-note">Anything the client adds on the day (extra hour, extra camera, extra venue) goes here, so it is never forgotten on the bill.</p>
   ${ctx.changes.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Change</th><th>Asked by</th><th>When</th>${money_ ? '<th>Billing</th>' : ''}</tr></thead><tbody>${ctx.changes.map(ch => { const b = billed(ch.id); return `<tr data-change="${ch.id}"><td>${e(ch.description)}</td><td>${e(ch.requested_by || '-')}</td><td>${readable(ch.occurred_at)}</td>${money_ ? `<td>${b ? `<em class="status">Billed ${money(b.amount, b.currency)}</em>` : '<button type="button" class="text-button" data-bill>Add to bill</button>'}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>` : empty('No changes logged.')}
   <form id="change-form" class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">LOG A CHANGE</p></div>${field('description', 'What changed?', '', { required: true })}${field('requested_by', 'Who asked for it?', '')}<div class="form-actions span-2"><button class="button primary" type="submit">Log change</button></div></form>`;
}
function revisionsTab(ctx) {
  const inc = Number(ctx.job.included_revisions ?? 2);
  return `<p class="muted small-note">${inc} revision round${inc === 1 ? ' is' : 's are'} included. Extra rounds are flagged so they can be charged.</p>
   ${ctx.revisions.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Round</th><th>Feedback</th><th>Requested</th><th>Status</th></tr></thead><tbody>${ctx.revisions.map(r => `<tr data-rev="${r.id}"><td><strong>Round ${r.round_number}</strong>${r.round_number > inc ? '<small class="override">Chargeable round</small>' : ''}</td><td>${e(r.feedback)}${r.preview_link ? `<small><a href="${e(r.preview_link)}" target="_blank" rel="noopener">Preview link</a></small>` : ''}</td><td>${readable(r.requested_at)}</td><td>${r.completed_at ? '<em class="status">Done</em>' : '<button type="button" class="text-button" data-rev-done>Mark done</button>'}</td></tr>`).join('')}</tbody></table></div>` : empty('No revision requests yet.')}
   <form id="rev-form" class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">NEW REVISION REQUEST · ROUND ${ctx.revisions.length + 1}${ctx.revisions.length + 1 > inc ? ' (CHARGEABLE)' : ''}</p></div>${textArea('feedback', 'Client feedback (all points in one place)', '')}${field('preview_link', 'Preview link', '')}<div class="form-actions span-2"><button class="button primary" type="submit">Save request</button></div></form>`;
}

// ---------- WhatsApp call sheet ----------
function callSheet(ctx, r) {
  const j = ctx.job, c = ctx.crew.find(x => x.id === r.crew_id) || {}, p = ctx.pay.find(x => x.job_crew_id === r.id);
  const lines = [`Hello ${c.name || ''}, you are booked with ${CONFIG.name}.`, '', `Job: ${j.reference} ${j.title}`, `Date: ${readable(j.starts_at)}`, `Call time: ${r.call_time ? time(r.call_time) + ' on ' + readable(r.call_time) : time(j.starts_at)}`, `Venue: ${j.venue || 'to be confirmed'}`];
  if (j.venue_contact_name || j.venue_contact_phone) lines.push(`On-site contact: ${[j.venue_contact_name, j.venue_contact_phone].filter(Boolean).join(', ')}`);
  lines.push(`Your role: ${r.role}`);
  if (r.instructions) lines.push(`Instructions: ${r.instructions}`);
  if (j.call_sheet_brief) lines.push('', j.call_sheet_brief);
  if (p && canViewMoney(ctx.identity.role)) lines.push('', `Agreed pay: ${money(p.agreed_amount, p.currency)}`);
  lines.push('', 'Please reply YES to confirm. Thank you.');
  whatsappTo(c.phone, lines.join('\n'));
}

// ---------- draw & bind ----------
async function draw(context) {
  const { client, host, identity } = context;
  host.innerHTML = '<div class="module-loading">Loading jobs…</div>';
  try {
    const [jobs, clients, crew] = await Promise.all([listRows(client, 'jobs', 'starts_at', true), listRows(client, 'clients', 'name', true), listRows(client, 'crew', 'name', true)]);
    const job = jobs.find(j => j.id === selected) || null;
    let extra = { crewRows: [], checks: [], changes: [], revisions: [], pay: [], charges: [], allCrewRows: [] };
    if (job) {
      const m = canViewMoney(identity.role);
      const [crewRows, checks, changes, revisions, pay, charges, all] = await Promise.all([rows(client, 'job_crew', job.id), rows(client, 'job_checklists', job.id), rows(client, 'job_changes', job.id, 'occurred_at'), rows(client, 'job_revisions', job.id, 'round_number'), m ? rows(client, 'crew_pay', job.id) : [], m ? rows(client, 'job_charges', job.id) : [], listRows(client, 'job_crew', 'starts_at', true)]);
      extra = { crewRows, checks, changes, revisions, pay, charges, allCrewRows: all };
    }
    context.ctx = { ...context, jobs, clients, crew, job, ...extra };
    host.innerHTML = listView(context.ctx);
    bind(context);
  } catch (err) { context.ctx = null; host.innerHTML = `<div class="error-panel"><strong>Jobs could not be loaded.</strong><p>${e(err.message)}</p><button class="button secondary" data-retry>Try again</button></div>`; bind(context); }
}

function bind(context) {
  const { host, client, notify, identity } = context, ctx = context.ctx;
  const run = async (fn, ok) => { try { await fn(); if (ok) notify(ok); await draw(context); } catch (err) { notify(err.message); } };
  host.querySelector('[data-retry]')?.addEventListener('click', () => draw(context));
  if (!ctx) return;
  host.querySelector('[data-new]')?.addEventListener('click', () => { selected = 'new'; draw(context); });
  host.querySelectorAll('[data-stage]').forEach(b => b.addEventListener('click', () => { stageFilter = b.dataset.stage; draw(context); }));
  host.querySelectorAll('[data-row]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.row; tab = 'overview'; draw(context); }));
  host.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => { selected = null; draw(context); }));
  host.querySelectorAll('[data-jtab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.jtab; draw(context); }));

  const nf = host.querySelector('#newjob-form');
  nf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(nf);
    if (!fd.get('client_id')) { notify('Choose a client.'); return; }
    run(async () => { const j = await insertWithRef(client, 'jobs', 'reference', 'SM', { client_id: fd.get('client_id'), title: fd.get('title').trim(), service_type: fd.get('service_type').trim(), venue: txt(fd.get('venue')), starts_at: fromLocal(fd.get('starts_at')), ends_at: fromLocal(fd.get('ends_at')), stage: 'Quoted' }); selected = j.id; }, 'Job created.'); });

  const job = ctx.job; if (!job) return;
  const jf = host.querySelector('#job-form');
  jf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(jf);
    const v = { stage: fd.get('stage'), booking_evidence_type: fd.get('booking_evidence_type') || null, title: fd.get('title').trim(), service_type: fd.get('service_type').trim(), starts_at: fromLocal(fd.get('starts_at')), ends_at: fromLocal(fd.get('ends_at')), venue: txt(fd.get('venue')), audience_size: num(fd.get('audience_size')), venue_contact_name: txt(fd.get('venue_contact_name')), venue_contact_phone: txt(fd.get('venue_contact_phone')), operational_brief: txt(fd.get('operational_brief')), call_sheet_brief: txt(fd.get('call_sheet_brief')), delivery_due_at: fromLocal(fd.get('delivery_due_at')), delivery_link: txt(fd.get('delivery_link')), included_revisions: num(fd.get('included_revisions')) ?? 2, consent_restrictions: txt(fd.get('consent_restrictions')) };
    if (STAGES.indexOf(v.stage) >= STAGES.indexOf('Confirmed') && !v.booking_evidence_type) { notify('Choose what confirmed the booking (payment, purchase order or approval) before moving past Quoted.'); return; }
    if (v.stage === 'Confirmed' && !job.booking_confirmed_at) v.booking_confirmed_at = new Date().toISOString();
    const delivered = fd.get('delivered') === 'on'; if (delivered && !job.delivered_at) v.delivered_at = new Date().toISOString(); if (!delivered) v.delivered_at = null;
    const consent = fd.get('publication_consent') === 'on'; v.publication_consent = consent;
    if (consent && !job.publication_consent) { v.consent_recorded_at = new Date().toISOString(); v.consent_recorded_by = identity.id; v.consent_withdrawn_at = null; }
    if (!consent && job.publication_consent) v.consent_withdrawn_at = new Date().toISOString();
    setBusy(jf, true); run(() => saveRow(client, 'jobs', v, job.id), 'Job saved.'); });
  jf?.querySelector('[data-delete]')?.addEventListener('click', () => { if (confirm('Delete this job? Only do this for a job created by mistake.')) run(async () => { await deleteRow(client, 'jobs', job.id); selected = null; }, 'Job deleted.'); });

  // crew
  const cf = host.querySelector('#crew-form');
  cf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(cf); if (!fd.get('crew_id')) { notify('Choose a person.'); return; }
    run(async () => { const r = await saveRow(client, 'job_crew', { job_id: job.id, crew_id: fd.get('crew_id'), role: fd.get('role'), call_time: fromLocal(fd.get('call_time')), instructions: txt(fd.get('instructions')), starts_at: job.starts_at, ends_at: job.ends_at }, null);
      const amt = num(fd.get('agreed')); if (amt != null) await saveRow(client, 'crew_pay', { job_crew_id: r.id, job_id: job.id, agreed_amount: amt }, null); }, 'Added to the job.'); });
  host.querySelectorAll('[data-jc]').forEach(row => {
    const r = ctx.crewRows.find(x => x.id === row.dataset.jc), p = ctx.pay.find(x => x.job_crew_id === r.id);
    row.querySelector('[data-avail]')?.addEventListener('change', ev => run(() => saveRow(client, 'job_crew', { availability: ev.target.value }, r.id), 'Status updated.'));
    row.querySelector('[data-sheet]')?.addEventListener('click', () => callSheet(ctx, r));
    row.querySelector('[data-save-pay]')?.addEventListener('click', () => { const amt = num(row.querySelector('[data-pay]').value); if (amt == null) { notify('Enter the agreed pay.'); return; } run(() => saveRow(client, 'crew_pay', p ? { agreed_amount: amt } : { job_crew_id: r.id, job_id: job.id, agreed_amount: amt }, p?.id || null), 'Pay saved.'); });
    row.querySelector('[data-paid]')?.addEventListener('click', () => { if (!p) { notify('Save the agreed pay first.'); return; } const ref = prompt('Payment reference (MoMo ID, cash, etc.)', 'MoMo'); if (ref === null) return; run(() => saveRow(client, 'crew_pay', { paid_amount: p.agreed_amount, paid_at: new Date().toISOString(), payment_reference: ref }, p.id), 'Marked as paid.'); });
    row.querySelector('[data-remove]')?.addEventListener('click', () => { if (confirm('Remove this person from the job?')) run(async () => { if (p) await deleteRow(client, 'crew_pay', p.id); await deleteRow(client, 'job_crew', r.id); }, 'Removed.'); });
  });

  // checklist
  host.querySelectorAll('[data-template]').forEach(b => b.addEventListener('click', () => run(async () => { const k = b.dataset.template; for (const [key, label] of TEMPLATES[k]) await saveRow(client, 'job_checklists', { job_id: job.id, category: k, item_key: key, label }, null); }, 'Checklist added.')));
  host.querySelectorAll('[data-check]').forEach(i => i.addEventListener('change', () => run(() => saveRow(client, 'job_checklists', i.checked ? { completed_at: new Date().toISOString(), completed_by: identity.id } : { completed_at: null, completed_by: null }, i.dataset.check))));

  // changes
  const chf = host.querySelector('#change-form');
  chf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(chf); run(() => saveRow(client, 'job_changes', { job_id: job.id, description: fd.get('description').trim(), requested_by: txt(fd.get('requested_by')) }, null), 'Change logged.'); });
  host.querySelectorAll('[data-change] [data-bill]').forEach(b => b.addEventListener('click', () => {
    const ch = ctx.changes.find(x => x.id === b.closest('[data-change]').dataset.change);
    const amt = num(prompt(`Price for "${ch.description}" (UGX)`)); if (amt == null) return;
    const note = prompt('Approval note (who agreed and how)', 'Agreed with client on the day'); if (!note) return;
    run(async () => {
      const { data: drafts, error } = await withTimeout(client.from('invoices').select('id').eq('job_id', job.id).eq('status', 'draft').limit(1)); if (error) throw new Error(error.message);
      let invId = drafts?.[0]?.id;
      if (!invId) invId = (await insertWithRef(client, 'invoices', 'reference', 'SMI', { job_id: job.id, client_id: job.client_id, currency: 'UGX', status: 'draft', booking_percent: 0, preproduction_percent: 0, completion_percent: 100, commercial_notes: 'Extra work invoice' })).id;
      const { error: e2 } = await withTimeout(client.rpc('bill_job_change', { p_change_id: ch.id, p_invoice_id: invId, p_amount: amt, p_approval_note: note })); if (e2) throw new Error(e2.message);
    }, 'Added to a draft invoice for this job. Issue it from Invoices.');
  }));

  // revisions
  const rf = host.querySelector('#rev-form');
  rf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(rf); if (!txt(fd.get('feedback'))) { notify('Write the client feedback.'); return; } run(() => saveRow(client, 'job_revisions', { job_id: job.id, round_number: ctx.revisions.length + 1, feedback: fd.get('feedback').trim(), preview_link: txt(fd.get('preview_link')) }, null), 'Revision request saved.'); });
  host.querySelectorAll('[data-rev] [data-rev-done]').forEach(b => b.addEventListener('click', () => run(() => saveRow(client, 'job_revisions', { completed_at: new Date().toISOString() }, b.closest('[data-rev]').dataset.rev), 'Marked done.')));
}
export async function mountJobs(context) { if (pendingJob) { selected = pendingJob; pendingJob = null; tab = 'overview'; } else { selected = null; } await draw(context); }
let pendingJob = null;
export function openJob(id) { pendingJob = id; }
