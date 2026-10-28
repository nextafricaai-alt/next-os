// Projects > Money tab. Money in, money out, and (owner only) net profit for one project.
import { saveRow, deleteRow } from '../data.js';
import { withTimeout } from '../utils.js';
import { e, field, selectField } from './records.js';
import { openInvoice } from './invoices.js';
import { loadBuckets, loadDistributions, splitProfit, ICON } from './bucketsplit.js';
import { askForm } from '../refs.js';
import { money, num, txt, today, readable, insertWithRef } from '../refs.js';

const METHOD = [['mtn_momo', 'MTN MoMo'], ['airtel_money', 'Airtel Money'], ['bank', 'Bank'], ['cash', 'Cash']];
const METHOD_LABEL = Object.fromEntries(METHOD);
const q = async (client, table, col, val, order) => { let r = client.from(table).select('*').eq(col, val); if (order) r = r.order(order); const { data, error } = await withTimeout(r); if (error) throw new Error(error.message); return data || []; };

export async function loadMoney(client, jobId) {
  const [invoices, bals, expenses] = await Promise.all([q(client, 'invoices', 'job_id', jobId, 'issued_on'), q(client, 'invoice_balances', 'job_id', jobId), q(client, 'expenses', 'job_id', jobId, 'incurred_on')]);
  let payments = [];
  if (invoices.length) { const { data, error } = await withTimeout(client.from('payments').select('*').in('invoice_id', invoices.map(i => i.id)).order('paid_at', { ascending: false })); if (error) throw new Error(error.message); payments = data || []; }
  const [bk, dists] = await Promise.all([loadBuckets(client), loadDistributions(client, jobId)]);
  return { invoices, bals, expenses, payments, buckets: bk.buckets, bucketsReady: bk.ready, dists };
}

export function moneyTab(ctx) {
  const m = ctx.money, owner = ctx.identity.role === 'owner', cur = 'UGX';
  const live = m.invoices.filter(i => i.status !== 'void' && i.currency === cur);
  const bal = id => m.bals.find(b => b.invoice_id === id) || {};
  const invoiced = live.reduce((s, i) => s + Number(bal(i.id).invoice_total || 0), 0);
  const received = live.reduce((s, i) => s + Number(bal(i.id).received || 0) + Number(bal(i.id).wht_withheld || 0), 0);
  const due = Math.max(0, invoiced - received), pct = invoiced > 0 ? Math.min(100, Math.round(received / invoiced * 100)) : 0;
  const crewCost = ctx.pay.filter(p => p.currency === cur).reduce((s, p) => s + Number(p.agreed_amount || 0), 0);
  const crewPaid = ctx.pay.filter(p => p.currency === cur).reduce((s, p) => s + Number(p.paid_amount || 0), 0);
  const otherCost = m.expenses.filter(x => x.currency === cur).reduce((s, x) => s + Number(x.amount || 0), 0);
  const cost = crewCost + otherCost, profit = invoiced - cost, margin = invoiced > 0 ? Math.round(profit / invoiced * 100) : 0;
  const issued = live.filter(i => i.status === 'issued');
  const who = id => ctx.crew.find(c => c.id === (ctx.crewRows.find(r => r.id === id) || {}).crew_id)?.name || 'Crew';
  const payable = live.filter(i => i.status !== 'void');
  const sec = (n, icon, title, sub, body) => `<section class="panel money-sec"><div class="panel-heading"><div><p class="eyebrow">STEP ${n}</p><h2>${icon} ${e(title)}</h2>${sub ? `<small class="muted">${e(sub)}</small>` : ''}</div></div><div class="money-body">${body}</div></section>`;

  const s1 = sec(1, '📥', 'Money in', 'Every shilling that has come in for this project',
   `<div class="money-big"><div><small>RECEIVED</small><strong>${money(received)}</strong><span>of ${money(invoiced)} invoiced</span></div><div class="r"><small>STILL DUE FROM CLIENT</small><strong class="${due > 0 ? 'warn' : 'good'}">${money(due)}</strong></div></div>
    <div class="rbar"><i style="width:${pct}%"></i></div><p class="muted small-note">${pct}% collected</p>
    ${live.length ? `<div class="table-wrap flat"><table class="data-table"><thead><tr><th>Invoice</th><th>Status</th><th class="num">Paid</th><th class="num">Total</th></tr></thead><tbody>${live.map(i => `<tr><td><a href="#invoices" data-openinv="${i.id}">${e(i.reference)}</a></td><td>${e(i.status)}</td><td class="num">${money(Number(bal(i.id).received || 0) + Number(bal(i.id).wht_withheld || 0))}</td><td class="num">${money(bal(i.id).invoice_total)}</td></tr>`).join('')}</tbody></table></div>`
      : `<p class="muted small-note">No invoice yet. If this job came from a quote, accept the quote and the invoice is made for you. Otherwise make one here.</p><div><button type="button" class="button primary" data-newinv>+ Create invoice</button></div>`}
    ${payable.length ? `<form id="pay-form" class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">RECORD A PAYMENT RECEIVED</p></div>
      ${payable.length > 1 ? selectField('invoice_id', 'Invoice', payable[0].id, payable.map(i => [i.id, `${i.reference} · due ${money(bal(i.id).balance_due)}`])) : `<input type="hidden" name="invoice_id" value="${payable[0].id}">`}
      ${field('amount', 'Amount received (UGX)', '', { type: 'number', required: true, extra: 'min="0" step="1"' })}${selectField('method', 'How was it paid?', 'mtn_momo', METHOD)}
      ${field('paid_on', 'Date received', today(), { type: 'date', required: true })}${field('transaction_reference', 'Transaction reference or note', '')}
      <div class="form-actions span-2"><button class="button primary" type="submit">Record payment</button></div></form>` : ''}
    ${m.payments.length ? `<h3 class="money-h">🧾 Payment history</h3><div class="table-wrap flat"><table class="data-table"><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th class="num">Amount</th></tr></thead><tbody>${m.payments.map(p => `<tr${p.voided_at ? ' class="voided"' : ''}><td>${e(p.receipt_number)}${p.voided_at ? '<small>Voided</small>' : ''}</td><td>${readable(p.paid_at)}</td><td>${e(METHOD_LABEL[p.method] || p.method)}</td><td class="num">${money(p.amount, p.currency)}</td></tr>`).join('')}</tbody></table></div><p class="muted small-note">Void a payment or print a receipt from Invoices.</p>` : ''}`);

  const s2 = sec(2, '📤', 'Money out', 'Team pay and costs charged to this project',
   `<div class="money-big"><div><small>TOTAL COST SO FAR</small><strong>${money(cost)}</strong><span>${money(crewPaid)} of team pay already paid</span></div></div>
    <h3 class="money-h">Team pay</h3>${ctx.pay.length ? `<div class="table-wrap flat"><table class="data-table"><thead><tr><th>Person</th><th class="num">Agreed</th><th class="num">Paid</th></tr></thead><tbody>${ctx.pay.map(p => `<tr><td>${e(who(p.job_crew_id))}</td><td class="num">${money(p.agreed_amount, p.currency)}</td><td class="num">${Number(p.paid_amount) >= Number(p.agreed_amount) ? '✓ ' : ''}${money(p.paid_amount, p.currency)}</td></tr>`).join('')}</tbody></table></div><p class="muted small-note">Agree pay on the Team tab. Pay people from Pay the team.</p>` : '<p class="muted small-note">No team pay agreed yet. Add people and their pay on the Team tab.</p>'}
    <h3 class="money-h">Other costs (fuel, generator hire, transport, meals)</h3>${m.expenses.length ? `<div class="table-wrap flat"><table class="data-table"><thead><tr><th>Cost</th><th>Date</th><th class="num">Amount</th><th></th></tr></thead><tbody>${m.expenses.map(x => `<tr data-exp="${x.id}"><td><strong>${e(x.description)}</strong><small>${e(x.category)}${x.supplier ? ' · ' + e(x.supplier) : ''}</small></td><td>${readable(x.incurred_on)}</td><td class="num">${money(x.amount, x.currency)}</td><td class="row-actions"><button type="button" class="text-button danger-text" data-expdel>Remove</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small-note">Nothing added yet.</p>'}
    <form id="exp-form" class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">ADD A COST</p></div>
      ${selectField('category', 'Type', 'transport', [['transport', 'Transport and fuel'], ['equipment_hire', 'Equipment hire'], ['generator', 'Generator and power'], ['internet', 'Internet and data'], ['meals', 'Meals and refreshments'], ['accommodation', 'Accommodation'], ['consumables', 'Consumables (cards, batteries, tape)'], ['other', 'Other']])}${field('supplier', 'Paid to', '')}${field('description', 'What was it for?', '', { required: true })}
      ${field('amount', 'Amount (UGX)', '', { type: 'number', required: true, extra: 'min="0" step="1"' })}${field('incurred_on', 'Date', today(), { type: 'date', required: true })}
      <div class="form-actions span-2"><button class="button primary" type="submit">Add cost</button></div></form>`);

  const loss = profit < 0;
  const s3 = owner ? sec(3, '🏁', 'Net profit', 'What is left after team pay and costs',
   `<div class="money-big profit ${loss ? 'loss' : ''}"><div><small>NET PROFIT ON THE INVOICED AMOUNT</small><strong>${money(profit)}</strong><span>${invoiced > 0 ? margin + '% of what you invoiced' : 'Invoice the project to see profit'}</span></div></div>
    ${loss ? `<p class="alert red"><b>This project has cost ${money(-profit)} more than it brings in.</b>Check the invoice and the costs above.</p>` : ''}
    <div class="table-wrap flat"><table class="data-table"><tbody><tr><td>Invoiced</td><td class="num">${money(invoiced)}</td></tr><tr><td>Team pay</td><td class="num">− ${money(crewCost)}</td></tr><tr><td>Other costs</td><td class="num">− ${money(otherCost)}</td></tr></tbody><tfoot><tr><td><strong>Net profit</strong></td><td class="num"><strong>${money(profit)}</strong></td></tr></tfoot></table></div>
    <p class="muted small-note">Cash actually in hand so far: ${money(received - cost)} (received minus costs). Only the owner sees this section.</p>`) : `<section class="panel money-sec"><div class="money-body"><p class="muted">🔒 Net profit is private to the owner.</p></div></section>`;
  const s4 = owner ? shareSection(ctx, profit, due) : '';
  return `<div class="money-tab">${s1}${s2}${s3}${s4}</div>`;
}

// Step 4: share the profit. Tithe 10% of net profit first, then the buckets. Owner only.
function shareSection(ctx, profit, due) {
  const m = ctx.money, j = ctx.job;
  const teamOwed = ctx.pay.some(p => Number(p.paid_amount) + 0.5 < Number(p.agreed_amount));
  const blockers = [];
  if (!m.bucketsReady) blockers.push('The buckets are being set up. Ask Hudson to finish the setup.');
  if (j.stage !== 'Delivered and paid') blockers.push('Mark the job "Delivered and paid" in Overview.');
  if (due > 0.5) blockers.push(`The client still owes ${money(due)}.`);
  if (teamOwed) blockers.push('Someone on the team is not fully paid yet.');
  if (profit <= 0) blockers.push('There is no profit to share on this job.');
  const rows = splitProfit(profit, m.buckets), done = k => m.dists.find(d => d.bucket === k);
  const allDone = rows.length && rows.every(r => done(r.key) || r.amount <= 0);
  const body = `${blockers.length ? `<div class="alert amber"><b>Not ready to share yet</b>${blockers.map(b => e(b)).join('<br>')}</div>` : allDone ? '<p class="alert plain"><b>Done</b>Every shilling of this profit has a home.</p>' : '<p class="muted small-note">The job is closed. Send each amount, then tap Mark transferred.</p>'}
    <div class="table-wrap flat"><table class="data-table"><thead><tr><th>Where it goes</th><th class="num">Share</th><th class="num">Amount</th><th></th></tr></thead><tbody>
    ${rows.map(r => { const d = done(r.key); return `<tr data-bk="${e(r.key)}"><td><strong>${ICON[r.key] || '•'} ${e(r.label)}</strong>${r.key === 'tithe' ? '<small>10% of net profit, given first</small>' : ''}</td><td class="num">${Number(r.pct)}%${r.key === 'tithe' ? '' : ' of the rest'}</td><td class="num"><strong>${money(d ? d.amount : r.amount)}</strong></td>
      <td class="row-actions">${d ? `<em class="status">✓ ${readable(d.transferred_at)}${d.reference ? ' · ' + e(d.reference) : ''}</em>` : blockers.length || r.amount <= 0 ? '' : '<button type="button" class="button primary small" data-bkdone>Mark transferred</button>'}</td></tr>`; }).join('')}
    </tbody></table></div><p class="muted small-note">Bucket balances and spending are on the Buckets page.</p>`;
  return `<section class="panel money-sec"><div class="panel-heading"><div><p class="eyebrow">STEP 4</p><h2>🪣 Share the profit</h2><small class="muted">Tithe first, then every shilling gets a job</small></div></div><div class="money-body">${body}</div></section>`;
}

export function bindMoney(ctx, host, client, notify, run) {
  const j = ctx.job; if (!j || !ctx.money) return;
  const pf = host.querySelector('#pay-form');
  pf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(pf);
    const inv = ctx.money.invoices.find(i => i.id === fd.get('invoice_id')); if (!inv) { notify('Choose an invoice.'); return; }
    const amount = num(fd.get('amount')) || 0; if (amount <= 0) { notify('Enter the amount received.'); return; }
    const bal = ctx.money.bals.find(b => b.invoice_id === inv.id) || {};
    if (amount > Number(bal.balance_due || 0) + 0.5 && !confirm('This is more than the balance due. Record it anyway?')) return;
    const p = { invoice_id: inv.id, currency: inv.currency, amount, wht_withheld: 0, method: fd.get('method'), paid_at: new Date(fd.get('paid_on') + 'T12:00:00+03:00').toISOString(), transaction_reference: txt(fd.get('transaction_reference')) };
    run(async () => {
      const saved = await insertWithRef(client, 'payments', 'receipt_number', 'SMR', p);
      if (inv.status === 'draft') await saveRow(client, 'invoices', { status: 'issued' }, inv.id);
      if (['Enquiry', 'Quoted'].includes(j.stage)) await saveRow(client, 'jobs', { stage: 'Confirmed', booking_evidence_type: 'deposit', booking_confirmed_at: new Date().toISOString() }, j.id);
      notify(`Payment recorded. Receipt ${saved.receipt_number}.`);
    });
  });
  host.querySelector('[data-newinv]')?.addEventListener('click', () => run(async () => {
    const inv = await insertWithRef(client, 'invoices', 'reference', 'SMI', { job_id: j.id, client_id: j.client_id, currency: 'UGX', status: 'draft' });
    openInvoice(inv.id); location.hash = '#invoices';
  }, 'Draft invoice created. Add the items, then issue it.'));
  host.querySelectorAll('[data-openinv]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); openInvoice(a.dataset.openinv); location.hash = '#invoices'; }));
  host.querySelectorAll('[data-bk] [data-bkdone]').forEach(b => b.addEventListener('click', async () => {
    const key = b.closest('[data-bk]').dataset.bk;
    const row = splitProfit(ctx.money ? (() => { const inv = ctx.money.invoices.filter(i => i.status !== 'void' && i.currency === 'UGX').reduce((s, i) => s + Number((ctx.money.bals.find(x => x.invoice_id === i.id) || {}).invoice_total || 0), 0); const cost = ctx.pay.filter(p => p.currency === 'UGX').reduce((s, p) => s + Number(p.agreed_amount || 0), 0) + ctx.money.expenses.filter(x => x.currency === 'UGX').reduce((s, x) => s + Number(x.amount || 0), 0); return inv - cost; })() : 0, ctx.money.buckets).find(r => r.key === key);
    if (!row) return;
    const a = await askForm({ title: `${row.label}: ${money(row.amount)}`, intro: 'Confirm you have moved this money to where it belongs.', submit: 'Mark transferred', fields: [{ name: 'ref', label: 'Reference (MoMo ID, bank, account name)', value: '' }] });
    if (!a) return;
    run(() => saveRow(client, 'distributions', { job_id: j.id, bucket: key, amount: row.amount, reference: txt(a.ref) }), `${row.label} marked as transferred.`);
  }));
  const ef = host.querySelector('#exp-form');
  ef?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(ef); const amount = num(fd.get('amount')) || 0; if (amount <= 0) { notify('Enter the amount.'); return; }
    run(() => saveRow(client, 'expenses', { job_id: j.id, category: fd.get('category'), description: String(fd.get('description')).trim(), supplier: txt(fd.get('supplier')), amount, currency: 'UGX', incurred_on: fd.get('incurred_on') }), 'Cost added.'); });
  host.querySelectorAll('[data-exp] [data-expdel]').forEach(b => b.addEventListener('click', () => { if (confirm('Remove this cost?')) run(() => deleteRow(client, 'expenses', b.closest('[data-exp]').dataset.exp), 'Cost removed.'); }));
}
