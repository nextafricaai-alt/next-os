// Expenses: record the cost of each production so profit per job is real.
import { listRows, saveRow, deleteRow } from '../data.js';
import { e, value, dateValue, empty, field, selectField, textArea, setBusy } from './records.js';
import { money, num, txt, today, readable } from '../refs.js';

const CATEGORIES = [['crew','Crew and freelancers'],['equipment_hire','Equipment hire'],['transport','Transport and fuel'],['generator','Generator and power'],['internet','Internet and data'],['meals','Meals and refreshments'],['accommodation','Accommodation'],['repairs','Repairs and maintenance'],['consumables','Consumables (cards, batteries, tape)'],['other','Other']];
let selected = null, month = today().slice(0, 7);

function editor(x, ctx) {
  const jobOpts = [['', 'Not linked to a job (overhead)']].concat(ctx.jobs.map(j => [j.id, `${j.reference} · ${j.title}`]));
  return `<form id="exp-form" class="record-form" data-id="${x?.id || ''}"><div class="form-title span-2"><div><p class="eyebrow">${x ? 'EXPENSE' : 'NEW EXPENSE'}</p><h2>${x ? money(x.amount, x.currency) : 'Record a cost'}</h2></div></div>
   ${field('description', 'What was it for?', x?.description, { required: true })}${selectField('category', 'Category', x?.category || 'crew', CATEGORIES)}
   ${field('amount', 'Amount', x?.amount, { type: 'number', required: true, extra: 'min="0" step="any"' })}${selectField('currency', 'Currency', x?.currency || 'UGX', [['UGX','UGX'],['USD','USD']])}
   ${selectField('job_id', 'Job', x?.job_id || '', jobOpts)}${field('incurred_on', 'Date', dateValue(x?.incurred_on || today()), { type: 'date', required: true })}
   ${field('supplier', 'Paid to (supplier or person)', x?.supplier)}${field('receipt_link', 'Receipt photo link (optional)', x?.receipt_link)}
   <div class="form-actions span-2"><button class="button primary" type="submit">Save</button><button class="button secondary" type="button" data-cancel>Cancel</button>${x && ctx.identity.role === 'owner' ? '<button class="button danger" type="button" data-delete>Delete</button>' : ''}</div></form>`;
}
async function draw(context) {
  const { client, host } = context;
  host.innerHTML = '<div class="module-loading">Loading expenses…</div>';
  try {
    const [rows, jobs] = await Promise.all([listRows(client, 'expenses', 'incurred_on', false), listRows(client, 'jobs')]);
    const ctx = { ...context, rows, jobs }; context.ctx = ctx;
    const inMonth = rows.filter(r => String(r.incurred_on).startsWith(month));
    const total = inMonth.filter(r => r.currency === 'UGX').reduce((s, r) => s + Number(r.amount), 0);
    const byCat = CATEGORIES.map(([k, l]) => [l, inMonth.filter(r => r.category === k && r.currency === 'UGX').reduce((s, r) => s + Number(r.amount), 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const cur = rows.find(r => r.id === selected);
    const jobName = id => jobs.find(j => j.id === id)?.reference || 'Overhead';
    host.innerHTML = `<div class="module-toolbar"><div><strong>${money(total)} spent</strong><span>${byCat.slice(0, 3).map(([l, v]) => `${e(l)}: ${money(v)}`).join(' · ') || 'Nothing recorded this month'}</span></div><div><input type="month" class="mini wide" data-month value="${value(month)}"><button class="button primary" data-new>New expense</button></div></div>
     <div class="records-layout"><section class="record-list">${inMonth.length ? inMonth.map(r => `<button class="record-card${r.id === selected ? ' active' : ''}" data-row="${r.id}"><span><strong>${e(r.description)}</strong><small>${readable(r.incurred_on)} · ${e(jobName(r.job_id))} · ${e(CATEGORIES.find(c => c[0] === r.category)?.[1] || r.category)}</small></span><span><em class="status">${money(r.amount, r.currency)}</em></span></button>`).join('') : empty('No expenses for this month.')}</section>
     <section class="record-editor">${selected === 'new' ? editor(null, ctx) : cur ? editor(cur, ctx) : '<div class="select-prompt"><h2>Record every cost</h2><p>Link costs to a job so Tony can see the real profit on each production.</p></div>'}</section></div>`;
    bind(context);
  } catch (err) { context.ctx = null; host.innerHTML = `<div class="error-panel"><strong>Expenses could not be loaded.</strong><p>${e(err.message)}</p><button class="button secondary" data-retry>Try again</button></div>`; bind(context); }
}
function bind(context) {
  const { host, client, notify } = context;
  const run = async (fn, ok) => { try { await fn(); if (ok) notify(ok); await draw(context); } catch (err) { notify(err.message); } };
  host.querySelector('[data-retry]')?.addEventListener('click', () => draw(context));
  host.querySelector('[data-month]')?.addEventListener('change', ev => { month = ev.target.value || today().slice(0, 7); selected = null; draw(context); });
  host.querySelector('[data-new]')?.addEventListener('click', () => { selected = 'new'; draw(context); });
  host.querySelectorAll('[data-row]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.row; draw(context); }));
  host.querySelector('[data-cancel]')?.addEventListener('click', () => { selected = null; draw(context); });
  const f = host.querySelector('#exp-form'); if (!f) return;
  f.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(f); setBusy(f, true);
    run(async () => { const s = await saveRow(client, 'expenses', { description: fd.get('description').trim(), category: fd.get('category'), amount: num(fd.get('amount')), currency: fd.get('currency'), job_id: fd.get('job_id') || null, incurred_on: fd.get('incurred_on'), supplier: txt(fd.get('supplier')), receipt_link: txt(fd.get('receipt_link')) }, f.dataset.id || null); selected = s.id; }, 'Expense saved.'); });
  f.querySelector('[data-delete]')?.addEventListener('click', () => { if (confirm('Delete this expense?')) run(async () => { await deleteRow(client, 'expenses', f.dataset.id); selected = null; }, 'Expense deleted.'); });
}
export async function mountExpenses(context) { selected = null; await draw(context); }
