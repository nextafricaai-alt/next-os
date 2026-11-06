// Projects > Money: set the agreed price, make or link a quote, edit and issue the invoice, all from the project.
import { saveRow, deleteRow } from '../data.js';
import { withTimeout } from '../utils.js';
import { e, field } from './records.js';
import { money, num, txt, today, addDays, insertWithRef, whatsappTo, shareLink } from '../refs.js';
import { openInvoice } from './invoices.js';
import { openQuote } from './quotes.js';
import { pickerHTML, bindPicker } from './servicepicker.js';

// Draft invoice for an agreed price, with one line. Payment schedule: 40% booking, 40% before the event, 20% after.
export async function createPriceInvoice(client, job, amount, description) {
  const day = String(job.starts_at || '').slice(0, 10) || today();
  const pre = addDays(day, -7) > today() ? addDays(day, -7) : today();
  const inv = await insertWithRef(client, 'invoices', 'reference', 'SMI', { job_id: job.id, client_id: job.client_id, currency: 'UGX', status: 'draft', booking_due_on: today(), preproduction_due_on: pre, completion_due_on: addDays(String(job.ends_at || job.starts_at || '').slice(0, 10) || today(), 14) });
  await saveRow(client, 'invoice_lines', { invoice_id: inv.id, job_id: job.id, description: description || job.title, quantity: 1, unit_price: amount }, null);
  return inv;
}

// A payment against an invoice: issues a draft invoice and confirms the booking.
export async function recordPayment(client, job, inv, amount, method, paidOn, ref) {
  const saved = await insertWithRef(client, 'payments', 'receipt_number', 'SMR', { invoice_id: inv.id, currency: inv.currency || 'UGX', amount, wht_withheld: 0, method, paid_at: new Date(`${paidOn || today()}T12:00:00+03:00`).toISOString(), transaction_reference: ref || null });
  if (inv.status === 'draft') await saveRow(client, 'invoices', { status: 'issued' }, inv.id);
  if (['Enquiry', 'Quoted'].includes(job.stage)) await saveRow(client, 'jobs', { stage: 'Confirmed', booking_evidence_type: 'deposit', booking_confirmed_at: new Date().toISOString() }, job.id);
  return saved;
}

export async function loadBilling(client, job) {
  const safe = async q => { try { const { data, error } = await withTimeout(q); return error ? [] : data || []; } catch { return []; } };
  const [lines, quotes, services] = await Promise.all([
    safe(client.from('invoice_lines').select('*').eq('job_id', job.id).order('id')),
    safe(client.from('quotes').select('id,reference,status,job_id,issued_on').eq('client_id', job.client_id).in('status', ['draft', 'sent', 'accepted']).order('issued_on', { ascending: false })),
    safe(client.from('services').select('*').eq('active', true))
  ]);
  return { lines, quotes, services };
}

export function billingBlock(ctx) {
  const m = ctx.money, b = m.billing || { lines: [], quotes: [] }, j = ctx.job;
  const live = m.invoices.filter(i => i.status !== 'void');
  const linked = b.quotes.filter(q => q.job_id === j.id), free = b.quotes.filter(q => !q.job_id);
  const quoteRow = linked.length ? `<p class="muted small-note">Quote${linked.length > 1 ? 's' : ''} for this project: ${linked.map(q => `<a href="#quotes" data-openquote="${q.id}">${e(q.reference)}</a> (${e(q.status)})`).join(', ')}. When the client agrees, press Accept & book on the quote: its invoice lands here.</p>` : '';
  if (!live.length) {
    return `<div class="bill-box"><h3 class="money-h">💰 Set the price for this job</h3>
      <form id="price-form" class="record-form line-form">${b.services?.length ? pickerHTML(b.services, 'svc') : ''}${field('amount', 'Agreed price (UGX)', '', { type: 'number', required: true, extra: 'min="1" step="1"' })}${field('description', 'What it is for (shows on the invoice)', j.title)}
        <label class="check-label span-2"><input type="checkbox" name="dep"> A deposit has already been paid</label>
        <div class="span-2 dep-fields" hidden style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">${field('dep_amount', 'Deposit received (UGX)', '', { type: 'number', extra: 'min="1" step="1"' })}<label>How was it paid?<select name="dep_method"><option value="mtn_momo">MTN MoMo</option><option value="airtel_money">Airtel Money</option><option value="bank">Bank</option><option value="cash">Cash</option></select></label>${field('dep_ref', 'Reference (optional)', '')}</div>
        <div class="form-actions span-2"><button class="button primary" type="submit">Save price and make invoice</button></div></form>
      <div class="bill-alt"><span class="muted">Or:</span><button type="button" class="button secondary small" data-newquote>Make a detailed quote</button>
        ${free.length ? `<label class="bill-link">Link an existing quote<select data-linkquote><option value="">Choose…</option>${free.map(q => `<option value="${q.id}">${e(q.reference)} · ${e(q.status)}</option>`).join('')}</select></label>` : ''}</div>${quoteRow}</div>`;
  }
  const lines = inv => b.lines.filter(l => l.invoice_id === inv.id);
  return `<div class="bill-box">${quoteRow}${live.map(inv => `<div class="bill-inv" data-binv="${inv.id}"><div class="bill-head"><b>${e(inv.reference)}</b><em class="status">${inv.status === 'draft' ? 'Draft: only you can see it' : 'Issued'}</em>
      <span class="row-actions">${inv.status === 'draft' ? '<button type="button" class="button primary small" data-issue>Issue invoice</button>' : '<button type="button" class="button secondary small" data-sendinv>Send to client</button>'}<a class="text-button" href="#invoices" data-openinv="${inv.id}">Open in Invoices</a></span></div>
     <div class="table-wrap flat"><table class="data-table"><tbody>${lines(inv).map(l => `<tr data-bline="${l.id}"><td>${e(l.description)}${Number(l.quantity) !== 1 ? ` <small>× ${Number(l.quantity)}</small>` : ''}</td><td class="num">${money(l.line_total)}</td><td class="row-actions">${inv.status === 'draft' && !l.job_charge_id ? '<button type="button" class="text-button" data-editline>Change</button><button type="button" class="text-button danger-text" data-dropline>Remove</button>' : ''}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">No items yet. Add the agreed price below.</td></tr>'}</tbody></table></div>
     ${inv.status === 'draft' ? `<form class="record-form line-form" data-addline>${b.services?.length ? pickerHTML(b.services, 'svc') : ''}${field('description', 'Item', '', { required: true })}${field('unit_price', 'Amount (UGX)', '', { type: 'number', required: true, extra: 'min="1" step="1"' })}<div class="form-actions span-2"><button class="button secondary small" type="submit">Add item</button></div></form>` : '<p class="muted small-note">Issued invoices are locked so the client\'s copy never changes. To add extras, log them in Changes and press Add to bill.</p>'}</div>`).join('')}</div>`;
}

export function bindBilling(ctx, host, client, notify, run) {
  const j = ctx.job, b = ctx.money?.billing; if (!j || !b) return;
  const pf = host.querySelector('#price-form');
  if (pf) {
    bindPicker(pf, b.services || [], sv => { if (sv) { pf.description.value = sv.name; if (sv.starting_price_ugx) pf.amount.value = Number(sv.starting_price_ugx); } else pf.description.value = ''; pf.amount.focus(); });
    const box = pf.querySelector('.dep-fields'); pf.dep.addEventListener('change', () => { box.hidden = !pf.dep.checked; box.style.display = pf.dep.checked ? 'grid' : 'none'; }); box.style.display = 'none';
    pf.addEventListener('submit', ev => {
      ev.preventDefault(); const fd = new FormData(pf), amount = num(fd.get('amount'));
      if (!amount || amount <= 0) { notify('Enter the agreed price.'); return; }
      const dep = pf.dep.checked ? num(fd.get('dep_amount')) : null;
      if (pf.dep.checked && (!dep || dep <= 0)) { notify('Enter the deposit amount.'); return; }
      if (dep && dep > amount) { notify('The deposit cannot be more than the price.'); return; }
      run(async () => {
        const inv = await createPriceInvoice(client, j, amount, txt(fd.get('description')));
        if (dep) { const r = await recordPayment(client, j, inv, dep, fd.get('dep_method'), today(), txt(fd.get('dep_ref'))); notify(`Price saved. Deposit recorded, receipt ${r.receipt_number}.`); }
      }, dep ? null : 'Price saved as a draft invoice. Issue it when you are ready to send it.');
    });
  }
  host.querySelector('[data-newquote]')?.addEventListener('click', () => run(async () => {
    const q = await insertWithRef(client, 'quotes', 'reference', 'SMQ', { client_id: j.client_id, lead_id: j.lead_id || null, job_id: j.id, currency: 'UGX', status: 'draft', valid_until: addDays(today(), 14) });
    openQuote(q.id); location.hash = '#quotes';
  }, 'Draft quote made for this project. Add the items, then send it.'));
  host.querySelector('[data-linkquote]')?.addEventListener('change', ev => { const id = ev.target.value; if (!id) return; run(() => saveRow(client, 'quotes', { job_id: j.id }, id), 'Quote linked to this project.'); });
  host.querySelectorAll('[data-openquote]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); openQuote(a.dataset.openquote); location.hash = '#quotes'; }));
  host.querySelectorAll('[data-binv]').forEach(box => {
    const inv = ctx.money.invoices.find(i => i.id === box.dataset.binv); if (!inv) return;
    box.querySelector('[data-issue]')?.addEventListener('click', () => {
      if (!b.lines.some(l => l.invoice_id === inv.id)) { notify('Add at least one item before issuing.'); return; }
      if (confirm('Issue this invoice? The client will be able to see it and it can no longer be edited.')) run(() => saveRow(client, 'invoices', { status: 'issued' }, inv.id), 'Invoice issued. Press Send to client to share it.');
    });
    box.querySelector('[data-sendinv]')?.addEventListener('click', () => { const c = ctx.clients.find(x => x.id === j.client_id) || {}; whatsappTo(c.phone, `Hello ${(c.name || '').split(' ')[0]}, here is your invoice ${inv.reference} from Sembule Media for ${j.title}, with how to pay and your receipts: ${shareLink('portal', inv.portal_token)}`); });
    const al = box.querySelector('[data-addline]'); if (al) bindPicker(al, b.services || [], sv => { al.description.value = sv ? sv.name : ''; if (sv?.starting_price_ugx) al.unit_price.value = Number(sv.starting_price_ugx); al.unit_price.focus(); });
    box.querySelector('[data-addline]')?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(ev.target), amt = num(fd.get('unit_price')); if (!amt || amt <= 0) { notify('Enter the amount.'); return; }
      run(() => saveRow(client, 'invoice_lines', { invoice_id: inv.id, job_id: j.id, description: String(fd.get('description')).trim(), quantity: 1, unit_price: amt }, null), 'Item added.'); });
    box.querySelectorAll('[data-bline]').forEach(row => {
      const l = b.lines.find(x => x.id === row.dataset.bline); if (!l) return;
      row.querySelector('[data-dropline]')?.addEventListener('click', () => { if (confirm('Remove this item?')) run(() => deleteRow(client, 'invoice_lines', l.id), 'Item removed.'); });
      row.querySelector('[data-editline]')?.addEventListener('click', async () => {
        const { askForm } = await import('../refs.js');
        const a = await askForm({ title: 'Change item', submit: 'Save', fields: [{ name: 'd', label: 'Description', value: l.description, required: true }, { name: 'p', label: 'Amount (UGX)', type: 'number', min: 1, value: String(Number(l.unit_price) * Number(l.quantity)), required: true }] });
        if (!a) return; const p = num(a.p); if (!p || p <= 0) { notify('Enter the amount.'); return; }
        run(() => saveRow(client, 'invoice_lines', { description: a.d.trim(), quantity: 1, unit_price: p }, l.id), 'Item updated.');
      });
    });
  });
}
