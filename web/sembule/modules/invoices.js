// Invoices & payments: 40/40/20 schedule, WHT, receipts, reminders.
// Owner and director only (route + RLS). Payments are never deleted, only voided by the owner.
import { listRows, saveRow, deleteRow } from '../data.js';
import { pickerHTML, bindPicker } from './servicepicker.js';
import { withTimeout } from '../utils.js';
import { CONFIG } from '../config.js';
import { e, value, dateValue, empty, field, selectField, textArea, setBusy } from './records.js';
import { money, num, txt, today, readable, insertWithRef, financeSettings, payDetails, whatsappTo, printDocument, askForm , shareLink, COMPANY } from '../refs.js';

const STATUS = [['draft','Draft'],['issued','Issued'],['void','Void']];
const METHODS = [['mtn_momo','MTN Mobile Money'],['airtel_money','Airtel Money'],['bank','Bank transfer'],['cash','Cash']];
let selected = null, filter = 'open';

async function load(client) {
  const [invoices, clients, jobs, fs, services] = await Promise.all([listRows(client, 'invoices'), listRows(client, 'clients', 'name', true), listRows(client, 'jobs'), financeSettings(client), listRows(client, 'services', 'name', true).catch(() => [])]);
  const { data: balances, error } = await withTimeout(client.from('invoice_balances').select('*'));
  if (error) throw new Error(error.message);
  return { invoices, clients, jobs, fs, services, balances: balances || [] };
}
async function detail(client, id) {
  const [{ data: lines, error: a }, { data: payments, error: b }] = await Promise.all([
    withTimeout(client.from('invoice_lines').select('*').eq('invoice_id', id).order('id')),
    withTimeout(client.from('payments').select('*').eq('invoice_id', id).order('paid_at'))]);
  if (a || b) throw new Error((a || b).message);
  return { lines: lines || [], payments: payments || [] };
}
const bal = (ctx, id) => ctx.balances.find(b => b.invoice_id === id) || { invoice_total: 0, received: 0, wht_withheld: 0, balance_due: 0, booking_amount: 0, preproduction_amount: 0, completion_amount: 0 };

// Which instalment is next, based on what has been paid so far.
function nextStep(inv, b) {
  const paid = Number(b.received) + Number(b.wht_withheld);
  const steps = [['Booking payment', b.booking_amount, inv.booking_due_on], ['Before production', Number(b.booking_amount) + Number(b.preproduction_amount), inv.preproduction_due_on], ['Final payment', b.invoice_total, inv.completion_due_on]];
  for (const [label, cumulative, due] of steps) if (paid + 0.5 < Number(cumulative)) return { label, amount: Number(cumulative) - paid, due };
  return null;
}

function listView(ctx) {
  const name = id => ctx.clients.find(c => c.id === id)?.name || 'Client';
  const rows = ctx.invoices.filter(i => filter === 'all' || (filter === 'open' ? i.status !== 'void' && Number(bal(ctx, i.id).balance_due) > 0.5 : i.status === filter));
  const owed = ctx.invoices.filter(i => i.status === 'issued').reduce((s, i) => s + (i.currency === 'UGX' ? Number(bal(ctx, i.id).balance_due) : 0), 0);
  const overdue = ctx.invoices.filter(i => { const n = i.status === 'issued' && nextStep(i, bal(ctx, i.id)); return n && n.due && n.due < today(); }).length;
  return `<div class="module-toolbar"><div><strong>${money(owed)} owed to you</strong><span>${overdue ? `${overdue} payment${overdue === 1 ? '' : 's'} overdue` : 'No overdue payments'}</span></div>
   <div>${[['open','Unpaid'],['draft','Drafts'],['all','All']].map(([k, l]) => `<button class="button ${filter === k ? 'primary' : 'secondary'}" data-filter="${k}">${l}</button>`).join('')}</div></div>
   <div class="records-layout"><section class="record-list">${rows.length ? rows.map(i => { const b = bal(ctx, i.id); const n = nextStep(i, b); const late = n?.due && n.due < today() && i.status === 'issued';
     return `<button class="record-card${i.id === selected ? ' active' : ''}" data-row="${i.id}"><span><strong>${e(i.reference)}</strong><small>${e(name(i.client_id))} · ${money(b.invoice_total, i.currency)}</small></span><span><em class="status">${e(i.status === 'issued' && Number(b.balance_due) <= 0.5 ? 'Paid' : STATUS.find(s => s[0] === i.status)[1])}</em>${late ? '<em class="overdue">Overdue</em>' : ''}</span></button>`; }).join('') : empty('No invoices here. Accept a quote to create one.')}</section>
   <section class="record-editor">${ctx.inv ? editor(ctx) : '<div class="select-prompt"><h2>Select an invoice</h2><p>Accept a quote in Quotes to create an invoice automatically, then record payments here.</p></div>'}</section></div>`;
}

function editor(ctx) {
  const { inv, lines, payments, identity } = ctx;
  const owner = identity.role === 'owner';
  const b = bal(ctx, inv.id), n = nextStep(inv, b), cur = inv.currency;
  const job = ctx.jobs.find(j => j.id === inv.job_id);
  return `<form id="inv-form" class="record-form" data-id="${inv.id}">
   <div class="form-title span-2"><div><p class="eyebrow">${e(inv.reference)}${job ? ' · JOB ' + e(job.reference) : ''}</p><h2>${money(b.invoice_total, cur)}</h2></div>
    <div class="quote-actions"><button type="button" class="button secondary" data-print>Print / PDF</button><button type="button" class="button secondary" data-remind>WhatsApp reminder</button><button type="button" class="button secondary" data-link>Send client link</button></div></div>
   <div class="schedule span-2">
    <div><small>Received</small><strong>${money(b.received, cur)}</strong></div>
    <div><small>Tax withheld (WHT)</small><strong>${money(b.wht_withheld, cur)}</strong></div>
    <div><small>Balance due</small><strong>${money(b.balance_due, cur)}</strong></div></div>
   ${n ? `<p class="span-2 next-step">Next: <strong>${e(n.label)} ${money(n.amount, cur)}</strong>${n.due ? ` due ${readable(n.due)}` : ''}</p>` : '<p class="span-2 next-step">Fully settled.</p>'}
   <details class="span-2 more"><summary>Invoice details and due dates</summary><div class="form-grid">
   ${selectField('status', 'Status', inv.status, STATUS)}${field('issued_on', 'Issued on', dateValue(inv.issued_on), { type: 'date' })}
   ${field('booking_due_on', `Booking ${Number(inv.booking_percent)}% due`, dateValue(inv.booking_due_on), { type: 'date' })}${field('preproduction_due_on', `Before production ${Number(inv.preproduction_percent)}% due`, dateValue(inv.preproduction_due_on), { type: 'date' })}
   ${field('completion_due_on', `Final ${Number(inv.completion_percent)}% due`, dateValue(inv.completion_due_on), { type: 'date' })}${field('expected_wht', 'Expected withholding tax', inv.expected_wht, { type: 'number', extra: 'min="0" step="any"' })}
   ${textArea('commercial_notes', 'Notes (internal)', inv.commercial_notes)}
   </div>
   <div class="form-actions"><button class="button primary" type="submit">Save</button><button class="button secondary" type="button" data-cancel>Close</button>${owner && !payments.length ? '<button class="button danger" type="button" data-delete>Delete</button>' : ''}</div></details></form>

  <section class="quote-lines"><div class="section-heading"><h2>Payments</h2><span class="subtle-label">${payments.filter(p => !p.voided_at).length} recorded</span></div>
   ${payments.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th>Received</th><th>WHT</th><th></th></tr></thead><tbody>${payments.map(p => `<tr data-pay="${p.id}"${p.voided_at ? ' class="voided"' : ''}><td><strong>${e(p.receipt_number)}</strong>${p.voided_at ? `<small>Voided: ${e(p.void_reason)}</small>` : p.transaction_reference ? `<small>Ref ${e(p.transaction_reference)}</small>` : ''}</td><td>${readable(p.paid_at)}</td><td>${e(METHODS.find(m => m[0] === p.method)?.[1] || p.method)}</td><td class="num">${money(p.amount, cur)}</td><td class="num">${Number(p.wht_withheld) ? money(p.wht_withheld, cur) + (p.wht_certificate_number ? `<small>Cert ${e(p.wht_certificate_number)}</small>` : '<small class="override">Certificate pending</small>') : '-'}</td><td class="row-actions">${p.voided_at ? '' : `<button type="button" class="text-button" data-receipt>Receipt</button>${owner ? '<button type="button" class="text-button danger-text" data-void>Void</button>' : ''}`}</td></tr>`).join('')}</tbody></table></div>` : empty('No payments yet.')}
   ${inv.status !== 'void' && Number(b.balance_due) > 0.5 ? `<form id="pay-form" class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">RECORD A PAYMENT</p></div>
    ${field('amount', `Amount received (${cur})`, n ? Math.round(n.amount) : '', { type: 'number', required: true, extra: 'min="0" step="any"' })}${selectField('method', 'Paid by', 'mtn_momo', METHODS)}
    ${field('paid_on', 'Date paid', today(), { type: 'date', required: true })}${field('transaction_reference', 'Transaction ID / reference', '', {})}
    ${field('wht_withheld', 'Tax withheld by client (WHT)', '', { type: 'number', extra: 'min="0" step="any"' })}${field('wht_certificate_number', 'WHT certificate number', '', {})}
    <div class="form-actions span-2"><button class="button primary" type="submit">Record payment</button></div></form>` : ''}
  </section>

  <section class="quote-lines"><div class="section-heading"><h2>What is being billed</h2></div>
   ${lines.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th><th></th></tr></thead><tbody>${lines.map(l => `<tr data-line="${l.id}"><td>${e(l.description)}</td><td>${Number(l.quantity)}</td><td>${money(l.unit_price, cur)}</td><td class="num">${money(l.line_total, cur)}</td><td class="row-actions">${inv.status === 'draft' && !l.job_charge_id ? '<button type="button" class="text-button danger-text" data-del-line>Remove</button>' : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('No items on this invoice.')}
   ${inv.status === 'draft' ? `<form id="line-form" class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">ADD AN ITEM</p></div>${ctx.services?.length ? pickerHTML(ctx.services, 'svc') : ''}${field('description', 'Description', '', { required: true })}${field('quantity', 'Quantity', 1, { type: 'number', extra: 'min="0.001" step="any"' })}${field('unit_price', 'Unit price', '', { type: 'number', required: true, extra: 'min="0" step="any"' })}<div class="form-actions span-2"><button class="button primary" type="submit">Add item</button></div></form>` : '<p class="muted small-note">Issued invoices are locked. Extra work goes on the project as a change and is billed from there.</p>'}
  </section>

`;
}

function printInvoice(ctx) {
  const { inv, lines } = ctx, b = bal(ctx, inv.id), cur = inv.currency, c = ctx.clients.find(x => x.id === inv.client_id) || {};
  const paid = Number(b.received) + Number(b.wht_withheld);
  const sched = [['booking', 'To confirm the booking', b.booking_amount, inv.booking_due_on], ['preproduction', 'Before production', b.preproduction_amount, inv.preproduction_due_on], ['completion', 'On completion, before final files', b.completion_amount, inv.completion_due_on]];
  printDocument({ title: inv.reference, heading: 'INVOICE', reference: inv.reference, metaLines: [`Issued ${readable(inv.issued_on)}`], party: c, notify: ctx.notify, body: `
   <table><thead><tr><th>DESCRIPTION</th><th class="num">QTY</th><th class="num">UNIT PRICE</th><th class="num">AMOUNT</th></tr></thead><tbody>
   ${lines.map(l => `<tr><td>${e(l.description)}</td><td class="num">${Number(l.quantity)}</td><td class="num">${money(l.unit_price, cur)}</td><td class="num">${money(l.line_total, cur)}</td></tr>`).join('')}</tbody></table>
   <div class="totals"><table>${paid ? `<tr><td>Invoice total</td><td class="num">${money(b.invoice_total, cur)}</td></tr><tr><td>Paid to date</td><td class="num">${money(paid, cur)}</td></tr>` : ''}
    <tr class="grand"><td>${paid ? 'BALANCE DUE' : 'TOTAL'}</td><td class="num">${money(paid ? b.balance_due : b.invoice_total, cur)}</td></tr></table></div>
   <div class="grid"><div class="box"><h3>PAYMENT SCHEDULE</h3>${sched.map(([k, l, a, d]) => `<p>${l} (${Number(inv[k + '_percent'])}%)<br><strong>${money(a, cur)}</strong>${d ? ` by ${readable(d)}` : ''}</p>`).join('')}</div>
   <div class="box gold"><h3>HOW TO PAY</h3>${payDetails(ctx.fs)}<p>Please quote <strong>${e(inv.reference)}</strong> as your payment reference.</p></div></div>` });
}
function amountInWords(n) {
  n = Math.round(Number(n) || 0);
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const under1000 = x => { const h = Math.floor(x / 100), r = x % 100; const t = r < 20 ? ones.at(r) : `${tens.at(Math.floor(r / 10))}${r % 10 ? '-' + ones.at(r % 10) : ''}`; return [h ? `${ones.at(h)} hundred` : '', t].filter(Boolean).join(h && r ? ' and ' : ''); };
  if (n === 0) return 'zero';
  const parts = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand'], [1, '']].map(([v, w]) => { const k = Math.floor(n / v) % 1000; return k ? `${under1000(k)}${w ? ' ' + w : ''}` : ''; }).filter(Boolean);
  const w = parts.join(', ');
  return w.charAt(0).toUpperCase() + w.slice(1);
}
// Round rubber-stamp seal in Sembule green and gold, slightly tilted like a real stamp.
function premiumStamp(line1, line2, date, ref) {
  const g = '#04592A', gold = '#BF9000';
  return `<svg width="190" height="190" viewBox="0 0 200 200" style="transform:rotate(-12deg);opacity:.95" xmlns="http://www.w3.org/2000/svg" aria-label="${e(line1 + ' ' + line2)}">
    <defs><path id="st-top" d="M 30 100 A 70 70 0 0 1 170 100"/><path id="st-bot" d="M 36 100 A 64 64 0 0 0 164 100"/>
      <filter id="st-ink"><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.55 1.15" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs>
    <g filter="url(#st-ink)">
      <circle cx="100" cy="100" r="94" fill="none" stroke="${g}" stroke-width="4"/>
      <circle cx="100" cy="100" r="86" fill="none" stroke="${g}" stroke-width="1.2"/>
      <circle cx="100" cy="100" r="56" fill="none" stroke="${gold}" stroke-width="1.4"/>
      <text font-family="Axiforma,Arial,sans-serif" font-size="12.5" font-weight="700" letter-spacing="3.2" fill="${g}"><textPath href="#st-top" startOffset="50%" text-anchor="middle">SEMBULE MEDIA LTD</textPath></text>
      <text font-family="Axiforma,Arial,sans-serif" font-size="9" font-weight="700" letter-spacing="3" fill="${g}" dominant-baseline="hanging"><textPath href="#st-bot" startOffset="50%" text-anchor="middle">KAMPALA · UGANDA</textPath></text>
      <text x="22" y="104" font-size="11" fill="${gold}" text-anchor="middle">★</text><text x="178" y="104" font-size="11" fill="${gold}" text-anchor="middle">★</text>
      <rect x="18" y="${line2 ? 82 : 88}" width="164" height="${line2 ? 38 : 26}" rx="3" fill="#fff" stroke="${g}" stroke-width="2.2"/>
      <text x="100" y="${line2 ? 99 : 106}" font-family="Axiforma,Arial,sans-serif" font-size="${line2 ? 15 : 16}" font-weight="800" letter-spacing="2.4" fill="${g}" text-anchor="middle">${e(line1)}</text>
      ${line2 ? `<text x="100" y="115" font-family="Axiforma,Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="4.5" fill="${gold}" text-anchor="middle">${e(line2)}</text>` : ''}
      <text x="100" y="${line2 ? 66 : 74}" font-family="Axiforma,Arial,sans-serif" font-size="8.5" font-weight="600" letter-spacing="1.4" fill="${g}" text-anchor="middle">${e(String(date).toUpperCase())}</text>
      <text x="100" y="${line2 ? 140 : 130}" font-family="Axiforma,Arial,sans-serif" font-size="8.5" font-weight="600" letter-spacing="1.4" fill="${g}" text-anchor="middle">${e(ref)}</text>
    </g></svg>`;
}
function printReceipt(ctx, p) {
  const { inv } = ctx, cur = inv.currency, c = ctx.clients.find(x => x.id === inv.client_id) || {}, b = bal(ctx, inv.id);
  const job = ctx.jobs.find(j => j.id === inv.job_id) || {};
  const method = METHODS.find(m => m[0] === p.method)?.[1] || p.method;
  const upTo = (ctx.payments || []).filter(x => !x.voided_at && new Date(x.paid_at) <= new Date(p.paid_at)).reduce((s, x) => s + Number(x.amount) + Number(x.wht_withheld || 0), 0);
  const total = Number(b.invoice_total || 0), left = Math.max(0, total - upTo), credited = Number(p.amount) + Number(p.wht_withheld || 0);
  const when = job.starts_at ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kampala' }).format(new Date(job.starts_at)) : '';
  printDocument({ title: p.receipt_number, heading: 'RECEIPT', reference: p.receipt_number, partyLabel: 'RECEIVED FROM', metaLines: [`Date ${readable(p.paid_at)}`, `Invoice ${e(inv.reference)}`], party: c, notify: ctx.notify, body: `
   <div class="box" style="margin-bottom:18px"><h3>FOR</h3><p><strong>${e(job.title || 'Services')}</strong>${job.reference ? ` · ${e(job.reference)}` : ''}${when ? `<br>${e(when)}` : ''}${job.venue ? ` · ${e(job.venue)}` : ''}</p></div>
   <table><thead><tr><th>PAYMENT</th><th>METHOD</th><th class="num">AMOUNT</th></tr></thead><tbody>
   <tr><td>Payment received with thanks</td><td>${e(method)}${p.transaction_reference ? `<small>Ref ${e(p.transaction_reference)}</small>` : ''}</td><td class="num">${money(p.amount, cur)}</td></tr>
   ${Number(p.wht_withheld) ? `<tr><td>Withholding tax deducted by client</td><td>${p.wht_certificate_number ? `Certificate ${e(p.wht_certificate_number)}` : 'Certificate to follow'}</td><td class="num">${money(p.wht_withheld, cur)}</td></tr>` : ''}</tbody></table>
   <p style="font-size:11px;margin:14px 0 0;color:#333"><strong style="color:#04592A">Amount in words:</strong> ${e(amountInWords(credited))} ${cur === 'UGX' ? 'Uganda shillings' : 'US dollars'} only.</p>
   <div class="totals"><table>
     <tr><td>Invoice total</td><td class="num">${money(total, cur)}</td></tr>
     <tr><td>Paid to date (including this receipt)</td><td class="num">${money(upTo, cur)}</td></tr>
     <tr class="grand"><td>${left <= 0.5 ? 'FULLY PAID' : 'BALANCE REMAINING'}</td><td class="num">${money(left, cur)}</td></tr></table></div>
   <div class="grid"><div class="box gold"><h3>RECEIVED BY</h3><p>Name: ______________________________</p><p style="margin-top:14px">Signature: __________________________</p></div>
    <div class="box"><h3>THANK YOU</h3><p>Thank you for choosing Sembule Media. Please keep this receipt for your records. Questions about this payment: ${e(COMPANY.phone)}.</p></div></div>
   <div style="display:flex;justify-content:flex-end;margin-top:-6px">${premiumStamp(left <= 0.5 ? 'PAID IN FULL' : 'PAYMENT', left <= 0.5 ? '' : 'RECEIVED', readable(p.paid_at), p.receipt_number)}</div>` });
}

async function draw(context) {
  const { client, host } = context;
  host.innerHTML = '<div class="module-loading">Loading invoices…</div>';
  try {
    const base = await load(client);
    const inv = base.invoices.find(i => i.id === selected) || null;
    const d = inv ? await detail(client, inv.id) : { lines: [], payments: [] };
    context.ctx = { ...context, ...base, ...d, inv };
    host.innerHTML = listView(context.ctx);
    bind(context);
  } catch (err) { context.ctx = null; host.innerHTML = `<div class="error-panel"><strong>Invoices could not be loaded.</strong><p>${e(err.message)}</p><button class="button secondary" data-retry>Try again</button></div>`; bind(context); }
}

function bind(context) {
  const { host, client, notify } = context, ctx = context.ctx;
  const run = async (fn, ok) => { try { await fn(); if (ok) notify(ok); await draw(context); } catch (err) { notify(err.message); } };
  host.querySelector('[data-retry]')?.addEventListener('click', () => draw(context));
  if (!ctx) return;
  host.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter; draw(context); }));
  host.querySelectorAll('[data-row]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.row; draw(context); }));
  host.querySelector('[data-cancel]')?.addEventListener('click', () => { selected = null; draw(context); });
  const inv = ctx.inv; if (!inv) return;
  const c = ctx.clients.find(x => x.id === inv.client_id) || {};

  const f = host.querySelector('#inv-form');
  f?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(f); setBusy(f, true);
    run(() => saveRow(client, 'invoices', { status: fd.get('status'), issued_on: fd.get('issued_on') || today(), booking_due_on: fd.get('booking_due_on') || null, preproduction_due_on: fd.get('preproduction_due_on') || null, completion_due_on: fd.get('completion_due_on') || null, expected_wht: num(fd.get('expected_wht')) || 0, commercial_notes: txt(fd.get('commercial_notes')) }, inv.id), 'Invoice saved.'); });
  f?.querySelector('[data-delete]')?.addEventListener('click', () => { if (confirm('Delete this invoice permanently?')) run(async () => { for (const l of ctx.lines) await deleteRow(client, 'invoice_lines', l.id); await deleteRow(client, 'invoices', inv.id); selected = null; }, 'Invoice deleted.'); });
  f?.querySelector('[data-print]')?.addEventListener('click', () => printInvoice(ctx));
  f?.querySelector('[data-link]')?.addEventListener('click', () => { if (inv.status !== 'issued') { notify('Issue the invoice first (record the first payment, or set its status to Issued). Clients cannot see drafts.'); return; }
    whatsappTo(c.phone, `Hello ${c.name || ''}, here is your invoice ${inv.reference} from ${CONFIG.name}, with how to pay and your payment history: ${shareLink('portal', inv.portal_token)}`); });
  f?.querySelector('[data-remind]')?.addEventListener('click', () => { const n = nextStep(inv, bal(ctx, inv.id)); if (!n) { notify('Nothing is due on this invoice.'); return; }
    whatsappTo(c.phone, `Hello ${c.name || ''}, a gentle reminder from ${CONFIG.name}: the ${n.label.toLowerCase()} of ${money(n.amount, inv.currency)} on invoice ${inv.reference}${n.due ? ` is due ${readable(n.due)}` : ' is now due'}. Please use ${inv.reference} as the payment reference. Thank you.`); });

  const lf = host.querySelector('#line-form');
  if (lf) bindPicker(lf, ctx.services || [], sv => { lf.description.value = sv ? sv.name : ''; if (sv?.starting_price_ugx) lf.unit_price.value = Number(sv.starting_price_ugx); (lf.unit_price || lf.description).focus(); });
  lf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(lf);
    run(() => saveRow(client, 'invoice_lines', { invoice_id: inv.id, job_id: inv.job_id, description: fd.get('description').trim(), quantity: num(fd.get('quantity')) || 1, unit_price: num(fd.get('unit_price')) }, null), 'Item added.'); });
  host.querySelectorAll('[data-line] [data-del-line]').forEach(b => b.addEventListener('click', () => { if (confirm('Remove this item?')) run(() => deleteRow(client, 'invoice_lines', b.closest('[data-line]').dataset.line), 'Item removed.'); }));

  const pf = host.querySelector('#pay-form');
  pf?.addEventListener('submit', async ev => {
    ev.preventDefault(); const fd = new FormData(pf);
    const p = { invoice_id: inv.id, currency: inv.currency, amount: num(fd.get('amount')) || 0, wht_withheld: num(fd.get('wht_withheld')) || 0, wht_certificate_number: txt(fd.get('wht_certificate_number')), method: fd.get('method'), paid_at: new Date(fd.get('paid_on') + 'T12:00:00+03:00').toISOString(), transaction_reference: txt(fd.get('transaction_reference')) };
    if (p.amount + p.wht_withheld <= 0) { notify('Enter the amount received.'); return; }
    if (p.amount + p.wht_withheld > Number(bal(ctx, inv.id).balance_due) + 0.5 && !confirm('This is more than the balance due. Record it anyway?')) return;
    setBusy(pf, true);
    run(async () => {
      const saved = await insertWithRef(client, 'payments', 'receipt_number', 'SMR', p);
      if (inv.status === 'draft') await saveRow(client, 'invoices', { status: 'issued' }, inv.id);
      const job = ctx.jobs.find(j => j.id === inv.job_id);
      if (job && ['Enquiry', 'Quoted'].includes(job.stage)) await saveRow(client, 'jobs', { stage: 'Confirmed', booking_evidence_type: 'deposit', booking_confirmed_at: new Date().toISOString() }, job.id);
      notify(`Payment recorded. Receipt ${saved.receipt_number}${job && ['Enquiry', 'Quoted'].includes(job.stage) ? '. The project is now confirmed.' : '.'}`);
    });
  });
  host.querySelectorAll('[data-pay]').forEach(row => {
    const p = ctx.payments.find(x => x.id === row.dataset.pay);
    row.querySelector('[data-receipt]')?.addEventListener('click', () => printReceipt(ctx, p));
    row.querySelector('[data-void]')?.addEventListener('click', async () => { const a = await askForm({ title: 'Void this payment', submit: 'Void payment', fields: [{ name: 'reason', label: 'Reason', required: true, hint: 'For example: bounced, or entered twice.' }] }); const reason = a?.reason; if (reason) run(() => saveRow(client, 'payments', { voided_at: new Date().toISOString(), void_reason: reason.trim() }, p.id), 'Payment voided.'); });
  });
}
let pending = null;
export async function mountInvoices(context) { if (pending) { selected = pending; filter = 'all'; pending = null; } else { filter = 'open'; selected = null; } await draw(context); }
export function openInvoice(id) { pending = id; }
