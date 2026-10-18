// Quotes: price list, quote builder, quote settings, branded print view.
// Money module: the Quotes route is visible to owner and director only (roles.js),
// and the database enforces the same rule (RLS + guard_quote_line trigger).
import { listRows, saveRow, deleteRow } from '../data.js';
import { withTimeout } from '../utils.js';
import { CONFIG } from '../config.js';
import { e, value, dateValue, readableDate, empty, field, selectField, textArea, setBusy } from './records.js';
import { insertWithRef, printDocument, payDetails } from '../refs.js';
import { openInvoice } from './invoices.js';

// Accept a quote: create the job and a draft invoice in one step, copying every line.
async function acceptAndBook(client, q, ctx) {
  if (!ctx.lines.length) throw new Error('Add at least one item before accepting the quote.');
  const lead = ctx.leads.find(l => l.id === q.lead_id);
  const c = ctx.clients.find(x => x.id === q.client_id) || {};
  const suggested = lead?.event_date || addDays(today(), 7);
  const date = prompt('Event date (YYYY-MM-DD). This books the job and creates the invoice.', suggested);
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Use the date format YYYY-MM-DD, for example 2026-10-24.');
  const days = Math.max(1, Math.ceil(Math.max(...ctx.lines.map(l => Number(l.days) || 1))));
  const starts = new Date(`${date}T08:00:00+03:00`), ends = new Date(`${addDays(date, days - 1)}T18:00:00+03:00`);
  const first = ctx.lines[0];
  const job = await insertWithRef(client, 'jobs', 'reference', 'SM', { client_id: q.client_id, lead_id: q.lead_id, title: `${c.organisation || c.name || 'Client'} · ${first.description}`, service_type: first.description, stage: 'Quoted', starts_at: starts.toISOString(), ends_at: ends.toISOString(), venue: lead?.venue || null, audience_size: lead?.audience_size ?? null, operational_brief: lead?.operational_brief || null });
  await saveRow(client, 'quotes', { status: 'accepted', job_id: job.id }, q.id);
  const pre = addDays(date, -7) > today() ? addDays(date, -7) : today();
  const inv = await insertWithRef(client, 'invoices', 'reference', 'SMI', { job_id: job.id, client_id: q.client_id, quote_id: q.id, currency: q.currency, usd_to_ugx: q.usd_to_ugx, fx_as_of: q.fx_as_of, status: 'draft', booking_percent: q.booking_percent, preproduction_percent: q.preproduction_percent, completion_percent: q.completion_percent, booking_due_on: today(), preproduction_due_on: pre, completion_due_on: addDays(addDays(date, days - 1), 14) });
  for (const l of ctx.lines) {
    const d = Number(l.days) || 1;
    await saveRow(client, 'invoice_lines', { invoice_id: inv.id, job_id: job.id, source_quote_line_id: l.id, description: d > 1 ? `${l.description} (${d} days)` : l.description, quantity: Number(l.quantity) * d, unit_price: Number(l.unit_price) }, null);
  }
  if (lead && ['new', 'contacted', 'qualified', 'needs_clarification'].includes(lead.status)) await saveRow(client, 'leads', { status: 'quoted' }, lead.id);
  return { job, inv };
}

const STATUS = [['draft','Draft'],['sent','Sent'],['accepted','Accepted'],['declined','Declined'],['expired','Expired'],['void','Void']];
let tab = 'quotes', selected = null;

const money = (n, cur = 'UGX') => `${cur} ${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: cur === 'USD' ? 2 : 0, maximumFractionDigits: cur === 'USD' ? 2 : 0 })}`;
const num = v => (v === '' || v == null) ? null : Number(v);
const txt = v => (v == null ? '' : String(v).trim()) || null;
const addDays = (iso, d) => { const x = new Date(iso); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

async function financeSettings(client) {
  const { data, error } = await withTimeout(client.from('finance_settings').select('*').eq('id', true).maybeSingle());
  if (error) throw new Error(error.message);
  return data || { booking_percent: 40, preproduction_percent: 40, completion_percent: 20, quote_valid_days: 14 };
}
async function linesFor(client, quoteId) {
  const { data, error } = await withTimeout(client.from('quote_lines').select('*').eq('quote_id', quoteId).order('position'));
  if (error) throw new Error(error.message);
  return data || [];
}
async function nextReference(client) {
  const year = new Date().getFullYear();
  const { data, error } = await withTimeout(client.from('quotes').select('reference').like('reference', `SMQ-${year}-%`));
  if (error) throw new Error(error.message);
  const max = (data || []).reduce((m, r) => Math.max(m, Number(r.reference.split('-')[2]) || 0), 0);
  return n => `SMQ-${year}-${String(max + 1 + n).padStart(3, '0')}`;
}

// ---------- views ----------
function tabs(identity) {
  const list = [['quotes','Quotes'],['prices','Price list']].concat(identity.role === 'owner' ? [['settings','Quote settings']] : []);
  return `<div class="tab-row">${list.map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>`;
}
function quoteEditor(q, ctx) {
  const { clients, leads, fs } = ctx;
  const clientOpts = [['', 'Choose a client'], ['__new', '+ Add a new client']].concat(clients.map(c => [c.id, c.organisation ? `${c.name} (${c.organisation})` : c.name]));
  const leadOpts = [['', 'No linked enquiry']].concat(leads.map(l => [l.id, `${l.contact_name} · ${l.service_requested || ''}`]));
  const issued = q?.issued_on || today();
  return `<form id="quote-form" class="record-form" data-id="${q?.id || ''}">
   <div class="form-title span-2"><div><p class="eyebrow">${q ? e(q.reference) : 'NEW QUOTE'}</p><h2>${q ? 'Quote details' : 'Start a quote'}</h2></div>${q ? `<div class="quote-actions"><button type="button" class="button secondary" data-print>Print / PDF</button><button type="button" class="button secondary" data-whatsapp>WhatsApp</button>${q.job_id ? '<button type="button" class="button secondary" data-open-invoice>Open invoice</button>' : ['void', 'declined'].includes(q.status) ? '' : '<button type="button" class="button primary" data-accept>Accept &amp; book</button>'}</div>` : ''}</div>
   ${q ? '<details class="span-2 more"><summary>Client, dates and terms</summary><div class="form-grid">' : ''}
   ${selectField('client_id', 'Client', q?.client_id || '', clientOpts)}<div class="new-client span-2" hidden><p class="eyebrow">NEW CLIENT</p><div class="form-grid">${field('nc_name', 'Contact name', '')}${field('nc_org', 'Organisation (optional)', '')}${field('nc_phone', 'Phone / WhatsApp', '')}${field('nc_email', 'Email', '', { type: 'email' })}</div></div>${selectField('lead_id', 'Linked enquiry', q?.lead_id || '', leadOpts)}
   ${selectField('currency', 'Currency', q?.currency || 'UGX', [['UGX','UGX'],['USD','USD']])}<div class="usd-only">${field('usd_to_ugx', 'USD rate (UGX per 1 USD)', q?.usd_to_ugx ?? fs.usd_to_ugx ?? '', { type: 'number', extra: 'min="1" step="0.01"' })}</div>
   ${field('issued_on', 'Issued on', dateValue(issued), { type: 'date', required: true })}${field('valid_until', 'Valid until', dateValue(q?.valid_until || addDays(issued, fs.quote_valid_days || 14)), { type: 'date' })}
   ${selectField('status', 'Status', q?.status || 'draft', STATUS)}
   <label>Payment schedule %<span class="pct-row"><input name="booking_percent" type="number" min="0" max="100" value="${value(q?.booking_percent ?? fs.booking_percent)}" title="Booking"><input name="preproduction_percent" type="number" min="0" max="100" value="${value(q?.preproduction_percent ?? fs.preproduction_percent)}" title="Before production"><input name="completion_percent" type="number" min="0" max="100" value="${value(q?.completion_percent ?? fs.completion_percent)}" title="Completion"></span><small>Booking / before production / completion. Must add to 100.</small></label>
   ${textArea('inclusions', 'What is included', q?.inclusions)}${textArea('exclusions', 'Not included', q?.exclusions ?? 'Travel outside Kampala, accommodation, external equipment hire and extra days unless listed above.')}
   ${q ? '</div></details>' : ''}
   <div class="form-actions span-2"><button class="button primary" type="submit">${q ? 'Save details' : 'Create quote'}</button><button class="button secondary" type="button" data-cancel>Close</button>${q && ctx.identity.role === 'owner' ? '<button class="button danger" type="button" data-delete>Delete</button>' : ''}</div>
  </form>${q ? linesPanel(q, ctx) : ''}`;
}
function linesPanel(q, ctx) {
  const { lines, services, identity } = ctx;
  const owner = identity.role === 'owner';
  const total = lines.reduce((s, l) => s + Number(l.line_total || 0), 0);
  const pct = k => Number(q[k] || 0) / 100;
  const svcOpts = services.filter(s => s.active).map(s => [s.id, `${s.name} (${s.pricing_method === 'fixed' ? money(s.starting_price_ugx) + '/' + s.unit : 'cost + ' + s.suggested_markup_percent + '%'})`]);
  if (owner) svcOpts.push(['custom', 'Custom line (owner prices it)']);
  const lock = l => !owner && l.manual_unit_price != null ? 'disabled' : '';
  return `<section class="quote-lines"><div class="section-heading"><h2>Line items</h2><span class="subtle-label">${lines.length} line${lines.length === 1 ? '' : 's'}</span></div>
   ${lines.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Qty</th><th>Days</th><th>Unit price</th><th>Total</th><th></th></tr></thead><tbody>${lines.map(l => `<tr data-line="${l.id}">
     <td><strong>${e(l.description)}</strong><small>${e([l.location, l.crew_count != null ? l.crew_count + ' crew' : '', l.equipment_description].filter(Boolean).join(' · '))}</small>${l.manual_unit_price != null ? `<small class="override">Negotiated from ${money(l.catalogue_unit_price, q.currency)}: ${e(l.override_reason)}</small>` : ''}</td>
     <td><input class="mini" data-f="quantity" type="number" min="0.001" step="any" value="${value(l.quantity)}" ${lock(l)}></td>
     <td><input class="mini" data-f="days" type="number" min="0.5" step="any" value="${value(l.days)}" ${lock(l)}></td>
     <td>${owner ? `<input class="mini wide" data-f="manual_unit_price" type="number" min="0" step="any" placeholder="${value(l.catalogue_unit_price)}" value="${value(l.manual_unit_price)}">` : money(l.unit_price, q.currency)}</td>
     <td class="num">${money(l.line_total, q.currency)}</td>
     <td class="row-actions"><button type="button" class="text-button" data-save-line>Save</button>${owner ? '<button type="button" class="text-button danger-text" data-del-line>Remove</button>' : ''}</td></tr>`).join('')}</tbody>
     <tfoot><tr><td colspan="4">Total</td><td class="num"><strong>${money(total, q.currency)}</strong></td><td></td></tr></tfoot></table></div>
     <div class="schedule">${[['booking_percent','To book'],['preproduction_percent','Before production'],['completion_percent','On completion']].map(([k, l]) => `<div><small>${l} (${Number(q[k])}%)</small><strong>${money(total * pct(k), q.currency)}</strong></div>`).join('')}</div>`
     : empty('No items yet. Add the first service below.')}
   <form id="line-form" class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">ADD AN ITEM</p></div>
     ${selectField('service', 'Service', '', [['', 'Choose a service']].concat(svcOpts))}${field('description', 'Description (optional)', '', {})}
     ${field('quantity', 'Quantity', 1, { type: 'number', extra: 'min="0.001" step="any"' })}${field('days', 'Days', 1, { type: 'number', extra: 'min="0.5" step="any"' })}
     ${field('crew_count', 'Crew', '', { type: 'number', extra: 'min="0" step="1"' })}${field('location', 'Location', '', {})}
     ${field('equipment_description', 'Equipment notes', '', {})}${owner ? field('price', 'Price per unit (custom or cost-plus lines, or a negotiated price)', '', { type: 'number', extra: 'min="0" step="any"' }) : ''}
     ${owner ? field('override_reason', 'Reason if you change a price', '', {}) : ''}
     <div class="form-actions span-2"><button class="button primary" type="submit">Add item</button></div></form>
   ${!owner ? '<p class="muted small-note">Only the owner can change prices. Ask Tony to approve a negotiated price.</p>' : ''}</section>`;
}
function quotesView(ctx) {
  const { quotes, clients } = ctx;
  const name = id => clients.find(c => c.id === id)?.name || 'Unknown client';
  const current = quotes.find(q => q.id === selected);
  return `<div class="module-toolbar"><div><strong>${quotes.length} quote${quotes.length === 1 ? '' : 's'}</strong><span>${quotes.filter(q => q.status === 'sent').length} awaiting a reply</span></div><button class="button primary" data-new>New quote</button></div>
   <div class="records-layout"><section class="record-list">${quotes.length ? quotes.map(q => `<button class="record-card${q.id === selected ? ' active' : ''}" data-row="${q.id}"><span><strong>${e(q.reference)}</strong><small>${e(name(q.client_id))} · ${readableDate(q.issued_on)}</small></span><span><em class="status">${e(STATUS.find(s => s[0] === q.status)?.[1] || q.status)}</em></span></button>`).join('') : empty('No quotes yet. Start one with New quote.')}</section>
   <section class="record-editor">${selected === 'new' ? quoteEditor(null, ctx) : current ? quoteEditor(current, ctx) : '<div class="select-prompt"><h2>Select a quote</h2><p>Open a quote to add items, adjust the schedule or print it.</p></div>'}</section></div>`;
}
function pricesView(ctx) {
  const owner = ctx.identity.role === 'owner';
  const rows = ctx.services;
  const pending = rows.filter(s => s.price_status === 'suggested').length;
  return `<div class="module-toolbar"><div><strong>Price list</strong><span>${pending} suggested price${pending === 1 ? '' : 's'} still to confirm</span></div></div>
   <div class="table-wrap"><table class="data-table price-table"><thead><tr><th>Service</th><th>Unit</th><th>Price (UGX) / markup</th><th>What it covers</th><th>Status</th>${owner ? '<th></th>' : ''}</tr></thead><tbody>
   ${rows.map(s => `<tr data-service="${s.id}"><td><strong>${e(s.name)}</strong>${s.active ? '' : '<small>Hidden from quotes</small>'}</td><td>${e(s.unit)}</td>
     <td>${owner ? (s.pricing_method === 'fixed' ? `<input class="mini wide" data-f="starting_price_ugx" type="number" min="0" value="${value(s.starting_price_ugx)}">` : `<input class="mini" data-f="suggested_markup_percent" type="number" min="0" max="100" value="${value(s.suggested_markup_percent)}">%`) : (s.pricing_method === 'fixed' ? money(s.starting_price_ugx) : `cost + ${s.suggested_markup_percent}%`)}</td>
     <td>${owner ? `<textarea class="mini-area" data-f="scope_notes" rows="3">${value(s.scope_notes)}</textarea>` : `<small>${e(s.scope_notes)}</small>`}</td>
     <td>${s.price_status === 'suggested' ? '<em class="overdue">Suggested</em>' : '<em class="status">Confirmed</em>'}</td>
     ${owner ? `<td class="row-actions"><button class="text-button" data-save-service>Save</button>${s.price_status === 'suggested' ? '<button class="text-button" data-confirm-service>Confirm price</button>' : ''}<button class="text-button" data-toggle-service>${s.active ? 'Hide' : 'Show'}</button></td>` : ''}</tr>`).join('')}
   </tbody></table></div>
   ${owner ? `<form id="service-form" class="record-form"><div class="form-title span-2"><p class="eyebrow">ADD A SERVICE</p></div>${field('name', 'Service name', '', { required: true })}${field('unit', 'Charged per (day, event, episode…)', 'day', { required: true })}${field('starting_price_ugx', 'Price (UGX)', '', { type: 'number', required: true, extra: 'min="0"' })}${field('price_basis', 'How this price was set', 'Set by owner', {})}${textArea('scope_notes', 'What it covers', '')}<div class="form-actions span-2"><button class="button primary" type="submit">Add service</button></div></form>` : '<p class="muted small-note">Only the owner can change the price list.</p>'}`;
}
function settingsView(ctx) {
  const fs = ctx.fs;
  return `<form id="fs-form" class="record-form"><div class="form-title span-2"><div><p class="eyebrow">QUOTE SETTINGS</p><h2>Defaults for every new quote</h2></div></div>
   ${field('quote_valid_days', 'Quote valid for (days)', fs.quote_valid_days ?? 14, { type: 'number', extra: 'min="1"' })}
   <label>Default payment schedule %<span class="pct-row"><input name="booking_percent" type="number" value="${value(fs.booking_percent)}"><input name="preproduction_percent" type="number" value="${value(fs.preproduction_percent)}"><input name="completion_percent" type="number" value="${value(fs.completion_percent)}"></span><small>Must add to 100.</small></label>
   <div class="usd-only">${field('usd_to_ugx', 'USD rate (UGX per 1 USD)', fs.usd_to_ugx ?? '', { type: 'number', extra: 'step="0.01" min="1"' })}${field('fx_as_of', 'Rate date', dateValue(fs.fx_as_of), { type: 'date' })}
   ${textArea('bank_details', 'Bank details printed on quotes', fs.bank_details)}${textArea('momo_details', 'MTN Mobile Money details', fs.momo_details)}${textArea('airtel_details', 'Airtel Money details', fs.airtel_details)}
   <div class="form-actions span-2"><button class="button primary" type="submit">Save settings</button></div></form>`;
}

// ---------- print ----------
function printQuote(q, ctx) {
  const c = ctx.clients.find(x => x.id === q.client_id) || {};
  const total = ctx.lines.reduce((s, l) => s + Number(l.line_total || 0), 0);
  printDocument({ title: q.reference, heading: 'QUOTATION', reference: q.reference, partyLabel: 'PREPARED FOR', party: c, notify: ctx.notify,
   metaLines: [`Issued ${readableDate(q.issued_on)}`].concat(q.valid_until ? [`Valid until ${readableDate(q.valid_until)}`] : []), body: `
   <table><thead><tr><th>SERVICE</th><th class="num">QTY</th><th class="num">DAYS</th><th class="num">UNIT PRICE</th><th class="num">AMOUNT</th></tr></thead><tbody>
   ${ctx.lines.map(l => `<tr><td><strong>${e(l.description)}</strong><small>${e([l.location, l.crew_count != null ? l.crew_count + ' crew' : '', l.equipment_description].filter(Boolean).join(' · '))}</small></td><td class="num">${Number(l.quantity)}</td><td class="num">${Number(l.days)}</td><td class="num">${money(l.unit_price, q.currency)}</td><td class="num">${money(l.line_total, q.currency)}</td></tr>`).join('')}</tbody></table>
   <div class="totals"><table><tr class="grand"><td>TOTAL</td><td class="num">${money(total, q.currency)}</td></tr></table></div>
   <div class="grid"><div class="box"><h3>PAYMENT SCHEDULE</h3>${[['booking_percent','To confirm the booking'],['preproduction_percent','Before production'],['completion_percent','On completion, before final files']].map(([k, l]) => `<p>${l} (${Number(q[k])}%)<br><strong>${money(total * Number(q[k]) / 100, q.currency)}</strong></p>`).join('')}<p>Your date is secured once the booking payment or a purchase order is received.</p></div>
   <div class="box gold"><h3>HOW TO PAY</h3>${payDetails(ctx.fs)}</div>
   <div class="box"><h3>INCLUDED</h3><p>${e(q.inclusions || 'Everything listed above.')}</p></div><div class="box"><h3>NOT INCLUDED</h3><p>${e(q.exclusions || '')}</p><p>Two rounds of revisions are included. Further rounds are charged.</p></div></div>` });
}
function whatsapp(q, ctx) {
  const c = ctx.clients.find(x => x.id === q.client_id) || {};
  const total = ctx.lines.reduce((s, l) => s + Number(l.line_total || 0), 0);
  const phone = String(c.phone || '').replace(/\D/g, '').replace(/^0/, '256');
  const msg = `Hello ${c.name || ''}, thank you for considering ${CONFIG.name}. Your quotation ${q.reference} comes to ${money(total, q.currency)}${q.valid_until ? `, valid until ${readableDate(q.valid_until)}` : ''}. To confirm the date, the booking payment is ${money(total * Number(q.booking_percent) / 100, q.currency)}. I have attached the full quote. Please let me know if you have any questions.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ---------- draw & bind ----------
async function draw(context) {
  const { client, identity, host } = context;
  host.innerHTML = '<div class="module-loading">Loading quotes…</div>';
  try {
    const [quotes, clients, services, leads, fs] = await Promise.all([listRows(client, 'quotes'), listRows(client, 'clients', 'name', true), listRows(client, 'services', 'name', true), listRows(client, 'leads'), financeSettings(client)]);
    const lines = selected && selected !== 'new' ? await linesFor(client, selected) : [];
    const ctx = { ...context, quotes, clients, services, leads, fs, lines };
    context.ctx = ctx;
    host.innerHTML = tabs(identity) + (tab === 'prices' ? pricesView(ctx) : tab === 'settings' && identity.role === 'owner' ? settingsView(ctx) : quotesView(ctx));
    bind(context);
  } catch (error) { context.ctx = null; host.innerHTML = `<div class="error-panel"><strong>Quotes could not be loaded.</strong><p>${e(error.message)}</p><button class="button secondary" data-retry>Try again</button></div>`; bind(context); }
}
const pctValues = fd => ({ booking_percent: Number(fd.get('booking_percent')), preproduction_percent: Number(fd.get('preproduction_percent')), completion_percent: Number(fd.get('completion_percent')) });
const pctOK = v => v.booking_percent + v.preproduction_percent + v.completion_percent === 100;

function bind(context) {
  const { host, client, notify } = context, ctx = context.ctx;
  const run = async (fn, ok) => { try { await fn(); if (ok) notify(ok); await draw(context); } catch (err) { notify(err.message); } };
  host.querySelector('[data-retry]')?.addEventListener('click', () => draw(context));
  host.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; draw(context); }));
  host.querySelector('[data-new]')?.addEventListener('click', () => { selected = 'new'; draw(context); });
  host.querySelectorAll('[data-row]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.row; draw(context); }));
  host.querySelector('[data-cancel]')?.addEventListener('click', () => { selected = null; draw(context); });
  if (!ctx) return;
  const q = ctx.quotes.find(x => x.id === selected);

  const form = host.querySelector('#quote-form');
  const pick = form?.querySelector('[name=client_id]'), box = form?.querySelector('.new-client');
  const lead = form?.querySelector('[name=lead_id]');
  const syncNew = () => { if (box) box.hidden = pick.value !== '__new'; };
  const curSel = form?.querySelector('[name=currency]'), usd = form?.querySelector('.usd-only');
  const syncUsd = () => { if (usd) usd.hidden = curSel.value !== 'USD'; }; curSel?.addEventListener('change', syncUsd); syncUsd();
  pick?.addEventListener('change', syncNew);
  lead?.addEventListener('change', () => { const l = ctx.leads.find(x => x.id === lead.value); if (!l) return; if (l.client_id) { pick.value = l.client_id; } else { pick.value = '__new'; form.querySelector('[name=nc_name]').value = l.contact_name || ''; form.querySelector('[name=nc_phone]').value = l.phone || ''; form.querySelector('[name=nc_email]').value = l.email || ''; } syncNew(); });
  form?.addEventListener('submit', async ev => {
    ev.preventDefault(); const fd = new FormData(form);
    const v = { client_id: fd.get('client_id') || null, lead_id: fd.get('lead_id') || null, currency: fd.get('currency'), issued_on: fd.get('issued_on'), valid_until: fd.get('valid_until') || null, status: fd.get('status'), inclusions: txt(fd.get('inclusions')), exclusions: txt(fd.get('exclusions')), ...pctValues(fd) };
    if (v.client_id === '__new') {
      const nc = { name: txt(fd.get('nc_name')), organisation: txt(fd.get('nc_org')), phone: txt(fd.get('nc_phone')), email: txt(fd.get('nc_email')) };
      if (!nc.name) { notify('Enter the new client\'s name.'); return; }
      try { v.client_id = (await saveRow(client, 'clients', nc, null)).id; } catch (err) { notify(err.message); return; }
    }
    if (!v.client_id) { notify('Choose a client, or pick "+ Add a new client".'); return; }
    if (!pctOK(v)) { notify('The payment schedule must add up to 100%.'); return; }
    if (v.currency === 'USD') { v.usd_to_ugx = num(fd.get('usd_to_ugx')); v.fx_as_of = ctx.fs.fx_as_of || today(); if (!v.usd_to_ugx) { notify('Enter the USD rate for a USD quote.'); return; } } else { v.usd_to_ugx = null; v.fx_as_of = null; }
    setBusy(form, true);
    try {
      if (form.dataset.id) { await saveRow(client, 'quotes', v, form.dataset.id); }
      else {
        const ref = await nextReference(client); let saved = null;
        for (let i = 0; i < 4 && !saved; i++) { try { saved = await saveRow(client, 'quotes', { ...v, reference: ref(i) }, null); } catch (err) { if (!/duplicate|unique/i.test(err.message) || i === 3) throw err; } }
        selected = saved.id;
      }
      notify('Quote saved.'); await draw(context);
    } catch (err) { notify(err.message); setBusy(form, false); }
  });
  form?.querySelector('[data-delete]')?.addEventListener('click', () => { if (!confirm('Delete this quote and its items permanently?')) return; run(async () => { for (const l of ctx.lines) await deleteRow(client, 'quote_lines', l.id); await deleteRow(client, 'quotes', q.id); selected = null; }, 'Quote deleted.'); });
  form?.querySelector('[data-print]')?.addEventListener('click', () => printQuote(q, ctx));
  form?.querySelector('[data-whatsapp]')?.addEventListener('click', () => whatsapp(q, ctx));
  form?.querySelector('[data-accept]')?.addEventListener('click', async () => {
    try { const r = await acceptAndBook(client, q, ctx); if (!r) return; notify(`Booked as job ${r.job.reference}. Draft invoice ${r.inv.reference} is ready.`); openInvoice(r.inv.id); location.hash = '#invoices'; }
    catch (err) { notify(err.message); await draw(context); }
  });
  form?.querySelector('[data-open-invoice]')?.addEventListener('click', async () => {
    const { data } = await withTimeout(client.from('invoices').select('id').eq('quote_id', q.id).limit(1));
    if (data?.[0]) { openInvoice(data[0].id); location.hash = '#invoices'; } else notify('No invoice found for this quote.');
  });

  const lf = host.querySelector('#line-form');
  lf?.addEventListener('submit', ev => {
    ev.preventDefault(); const fd = new FormData(lf); const svcId = fd.get('service');
    if (!svcId) { notify('Choose a service.'); return; }
    const svc = ctx.services.find(s => s.id === svcId);
    const price = num(fd.get('price'));
    const line = { quote_id: q.id, position: ctx.lines.reduce((m, l) => Math.max(m, l.position), 0) + 1, service_id: svc ? svc.id : null, description: txt(fd.get('description')) || svc?.name || 'Custom item', unit: svc?.unit || 'item', quantity: num(fd.get('quantity')) || 1, days: num(fd.get('days')) || 1, crew_count: num(fd.get('crew_count')), location: txt(fd.get('location')), equipment_description: txt(fd.get('equipment_description')), catalogue_unit_price: 0 };
    if (!svc || svc.pricing_method === 'cost_plus') {
      if (price == null) { notify(svc ? 'Enter the supplier cost per unit. The markup is added for you.' : 'Enter the price per unit for this item.'); return; }
      line.catalogue_unit_price = svc ? Math.round(price * (1 + Number(svc.suggested_markup_percent || 0) / 100)) : price;
      if (svc) { line.external_hire_cost = price; line.markup_percent = svc.suggested_markup_percent; }
    } else if (price != null) {
      line.manual_unit_price = price; line.override_reason = txt(fd.get('override_reason'));
      if (!line.override_reason) { notify('Add a reason for the changed price.'); return; }
    }
    run(() => saveRow(client, 'quote_lines', line, null), 'Item added.');
  });
  host.querySelectorAll('[data-line]').forEach(row => {
    row.querySelector('[data-save-line]')?.addEventListener('click', () => {
      const get = f => row.querySelector(`[data-f="${f}"]`); const l = ctx.lines.find(x => x.id === row.dataset.line);
      const v = { quantity: num(get('quantity').value), days: num(get('days').value) };
      if (get('manual_unit_price')) {
        const m = num(get('manual_unit_price').value);
        if (m !== (l.manual_unit_price == null ? null : Number(l.manual_unit_price))) {
          v.manual_unit_price = m;
          v.override_reason = m == null ? null : (prompt('Reason for the negotiated price:', l.override_reason || 'Agreed with client by phone') || '');
          if (m != null && !v.override_reason.trim()) { notify('A reason is needed for a changed price.'); return; }
        }
      }
      run(() => saveRow(client, 'quote_lines', v, l.id), 'Item updated.');
    });
    row.querySelector('[data-del-line]')?.addEventListener('click', () => { if (confirm('Remove this item?')) run(() => deleteRow(client, 'quote_lines', row.dataset.line), 'Item removed.'); });
  });

  host.querySelectorAll('[data-service]').forEach(row => {
    const s = ctx.services.find(x => x.id === row.dataset.service); const get = f => row.querySelector(`[data-f="${f}"]`);
    row.querySelector('[data-save-service]')?.addEventListener('click', () => { const v = { scope_notes: get('scope_notes').value.trim() || s.scope_notes, updated_at: new Date().toISOString() }; if (get('starting_price_ugx')) v.starting_price_ugx = num(get('starting_price_ugx').value); if (get('suggested_markup_percent')) v.suggested_markup_percent = num(get('suggested_markup_percent').value); run(() => saveRow(client, 'services', v, s.id), 'Price list updated.'); });
    row.querySelector('[data-confirm-service]')?.addEventListener('click', () => run(() => saveRow(client, 'services', { price_status: 'owner_confirmed', updated_at: new Date().toISOString() }, s.id), `${s.name} price confirmed.`));
    row.querySelector('[data-toggle-service]')?.addEventListener('click', () => run(() => saveRow(client, 'services', { active: !s.active }, s.id), s.active ? 'Hidden from new quotes.' : 'Shown in quotes again.'));
  });
  const sf = host.querySelector('#service-form');
  sf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(sf); const name = fd.get('name').trim(); const code = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36).slice(-4); run(() => saveRow(client, 'services', { code, name, unit: fd.get('unit').trim(), pricing_method: 'fixed', starting_price_ugx: num(fd.get('starting_price_ugx')), price_status: 'owner_confirmed', scope_notes: txt(fd.get('scope_notes')) || name, price_basis: txt(fd.get('price_basis')) || 'Set by owner' }, null), 'Service added.'); });

  const ff = host.querySelector('#fs-form');
  ff?.addEventListener('submit', ev => {
    ev.preventDefault(); const fd = new FormData(ff); const v = { id: true, quote_valid_days: num(fd.get('quote_valid_days')), usd_to_ugx: num(fd.get('usd_to_ugx')), fx_as_of: fd.get('fx_as_of') || null, bank_details: txt(fd.get('bank_details')), momo_details: txt(fd.get('momo_details')), airtel_details: txt(fd.get('airtel_details')), ...pctValues(fd) };
    if (!pctOK(v)) { notify('The payment schedule must add up to 100%.'); return; }
    run(async () => { const { error } = await withTimeout(client.from('finance_settings').upsert(v, { onConflict: 'id' })); if (error) throw new Error(error.message); }, 'Quote settings saved.');
  });
}
export async function mountQuotes(context) { selected = null; tab = 'quotes'; await draw(context); }
