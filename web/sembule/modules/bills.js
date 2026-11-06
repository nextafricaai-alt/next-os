// Ongoing bills: rent, data, power and other monthly costs. Set up in Settings; paid from Expenses or the dashboard.
// Paying a bill records it as an expense (not linked to a project) and marks it paid for the month.
import { listRows, saveRow, deleteRow } from '../data.js';
import { e, field, selectField } from './records.js';
import { money, num, txt, today, askForm } from '../refs.js';

export const BILL_CATEGORIES = [['rent', 'Rent'], ['internet', 'Internet and data'], ['utilities', 'Power and water'], ['salaries', 'Staff salaries'], ['subscriptions', 'Subscriptions and software'], ['transport', 'Transport and fuel'], ['repairs', 'Repairs and maintenance'], ['other', 'Other']];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const thisMonth = () => today().slice(0, 7);
const dueDate = b => `${thisMonth()}-${String(b.due_day).padStart(2, '0')}`;
const label = m => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

export async function loadBills(client) { try { return (await listRows(client, 'recurring_bills', 'due_day', true)).filter(b => b.active); } catch { return null; } }

// State for this month: paid, overdue, due soon (within 5 days) or later.
export function billState(b) {
  if (b.last_paid_month === thisMonth()) return 'paid';
  const days = Math.round((new Date(dueDate(b)) - new Date(today())) / 864e5);
  return days < 0 ? 'overdue' : days <= 5 ? 'soon' : 'later';
}
export function billLine(b) {
  const s = billState(b), d = Number(b.due_day);
  return s === 'paid' ? `Paid for ${label(thisMonth())}` : s === 'overdue' ? `Overdue since the ${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}` : `Due on the ${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}`;
}

// Mark paid: one expense row + this month ticked off.
export async function payBill(client, b, notify) {
  const a = await askForm({ title: `Pay ${b.name}`, intro: `For ${label(thisMonth())}.`, submit: 'Record payment', fields: [
    { name: 'amt', label: 'Amount paid (UGX)', type: 'number', min: 0, value: String(Number(b.amount)), required: true },
    { name: 'ref', label: 'Reference (MoMo ID, bank, cash)', value: '' }] });
  if (!a) return false;
  const amt = num(a.amt); if (!amt || amt <= 0) { notify('Enter the amount paid.'); return false; }
  await saveRow(client, 'expenses', { job_id: null, category: b.category, description: `${b.name} (${label(thisMonth())})${a.ref ? ' · ' + a.ref : ''}`, amount: amt, currency: 'UGX', incurred_on: today(), supplier: b.paid_to || null }, null);
  await saveRow(client, 'recurring_bills', { last_paid_month: thisMonth() }, b.id);
  notify(`${b.name} paid and recorded in Expenses.`);
  return true;
}

// The "Monthly bills" panel used on the Expenses page.
export function billsPanel(bills) {
  if (bills === null) return '';
  const unpaid = bills.filter(b => billState(b) !== 'paid'), total = unpaid.reduce((s, b) => s + Number(b.amount), 0);
  return `<section class="panel"><div class="panel-heading"><h2>Monthly bills · ${label(thisMonth())}</h2><span class="subtle-label">${bills.length ? (unpaid.length ? `${money(total)} still to pay` : 'All paid this month') : 'Set them up in Settings'}</span></div>
   ${bills.length ? `<div class="table-wrap flat"><table class="data-table"><tbody>${bills.map(b => { const s = billState(b); return `<tr data-bill="${b.id}"><td><strong>${e(b.name)}</strong><small>${e(BILL_CATEGORIES.find(c => c[0] === b.category)?.[1] || b.category)}${b.paid_to ? ' · ' + e(b.paid_to) : ''}</small></td><td class="num">${money(b.amount)}</td><td><em class="${s === 'overdue' ? 'overdue' : 'status'}">${billLine(b)}</em></td><td class="row-actions">${s === 'paid' ? '✓' : '<button type="button" class="button primary small" data-paybill>Mark paid</button>'}</td></tr>`; }).join('')}</tbody></table></div>`
     : '<p class="muted small-note" style="padding:0 16px 14px">No monthly bills yet. Add rent, data, power and other regular costs in Settings → Monthly bills.</p>'}</section>`;
}
export function bindBillsPanel(host, client, bills, notify, after) {
  host.querySelectorAll('[data-bill] [data-paybill]').forEach(btn => btn.addEventListener('click', async () => {
    const b = bills.find(x => x.id === btn.closest('[data-bill]').dataset.bill); if (!b) return;
    try { if (await payBill(client, b, notify)) await after(); } catch (err) { notify(err.message); }
  }));
}

// Settings section: add, change and stop bills. Owner only (Settings is owner only).
export function billsSettings(all) {
  if (all === null) return `<section class="panel"><div class="panel-heading"><h2>Monthly bills</h2></div><p class="muted small-note" style="padding:0 16px 14px">Monthly bills are being set up. Ask Hudson to finish the setup (step 013).</p></section>`;
  return `<section class="panel"><div class="panel-heading"><h2>Monthly bills</h2><span class="subtle-label">Rent, data, power and other regular costs</span></div>
   ${all.length ? `<div class="table-wrap flat"><table class="data-table"><thead><tr><th>Bill</th><th class="num">Amount</th><th>Due</th><th></th></tr></thead><tbody>${all.map(b => `<tr data-sbill="${b.id}"><td><strong>${e(b.name)}</strong><small>${e(BILL_CATEGORIES.find(c => c[0] === b.category)?.[1] || b.category)}${b.paid_to ? ' · ' + e(b.paid_to) : ''}${b.active ? '' : ' · stopped'}</small></td><td class="num">${money(b.amount)}</td><td>Day ${Number(b.due_day)} each month</td><td class="row-actions"><button type="button" class="text-button" data-editbill>Change</button><button type="button" class="text-button" data-togglebill>${b.active ? 'Stop' : 'Restart'}</button><button type="button" class="text-button danger-text" data-delbill>Delete</button></td></tr>`).join('')}</tbody></table></div>` : ''}
   <form class="form-grid" data-newbill>${field('name', 'Bill name (e.g. Office rent)', '', { required: true })}${selectField('category', 'Type', 'rent', BILL_CATEGORIES)}
    ${field('amount', 'Amount each month (UGX)', '', { type: 'number', required: true, extra: 'min="1" step="1"' })}${field('due_day', 'Due on day (1 to 28)', '1', { type: 'number', required: true, extra: 'min="1" max="28"' })}
    ${field('paid_to', 'Paid to (landlord, MTN, UMEME…)', '')}<div class="form-actions span-2"><button class="button primary" type="submit">Add bill</button></div></form></section>`;
}
export function bindBillsSettings(host, client, all, notify, redraw) {
  const f = host.querySelector('[data-newbill]');
  f?.addEventListener('submit', async ev => {
    ev.preventDefault(); const fd = new FormData(f), amt = num(fd.get('amount')), day = num(fd.get('due_day'));
    if (!amt || amt <= 0) { notify('Enter the monthly amount.'); return; }
    if (!day || day < 1 || day > 28) { notify('Due day must be between 1 and 28.'); return; }
    try { await saveRow(client, 'recurring_bills', { name: String(fd.get('name')).trim(), category: fd.get('category'), amount: amt, due_day: day, paid_to: txt(fd.get('paid_to')) }, null); notify('Bill added.'); redraw(); } catch (err) { notify(err.message); }
  });
  host.querySelectorAll('[data-sbill]').forEach(row => {
    const b = all.find(x => x.id === row.dataset.sbill); if (!b) return;
    row.querySelector('[data-editbill]')?.addEventListener('click', async () => {
      const a = await askForm({ title: `Change ${b.name}`, submit: 'Save', fields: [{ name: 'amt', label: 'Amount each month (UGX)', type: 'number', min: 1, value: String(Number(b.amount)), required: true }, { name: 'day', label: 'Due on day (1 to 28)', type: 'number', min: 1, value: String(b.due_day), required: true }, { name: 'to', label: 'Paid to', value: b.paid_to || '' }] });
      if (!a) return; const amt = num(a.amt), day = num(a.day);
      if (!amt || amt <= 0 || !day || day < 1 || day > 28) { notify('Check the amount and the due day (1 to 28).'); return; }
      try { await saveRow(client, 'recurring_bills', { amount: amt, due_day: day, paid_to: txt(a.to) }, b.id); notify('Bill updated.'); redraw(); } catch (err) { notify(err.message); }
    });
    row.querySelector('[data-togglebill]')?.addEventListener('click', async () => { try { await saveRow(client, 'recurring_bills', { active: !b.active }, b.id); redraw(); } catch (err) { notify(err.message); } });
    row.querySelector('[data-delbill]')?.addEventListener('click', async () => { if (!confirm(`Delete ${b.name}? Past payments stay in Expenses.`)) return; try { await deleteRow(client, 'recurring_bills', b.id); redraw(); } catch (err) { notify(err.message); } });
  });
}
