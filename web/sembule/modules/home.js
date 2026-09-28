// Overview dashboard: what needs Tony's attention today. Money cards only for owner and director.
import { listRows } from '../data.js';
import { withTimeout } from '../utils.js';
import { canViewMoney } from '../roles.js';
import { e } from './records.js';
import { money, readable } from '../refs.js';
import { openJob } from './jobs.js';
import { openInvoice } from './invoices.js';

const DAY = 864e5;
async function view(client, name) { const { data, error } = await withTimeout(client.from(name).select('*')); if (error) throw new Error(error.message); return data || []; }

export async function mountDashboard(context) {
  const { client, identity, host } = context;
  host.innerHTML = '<div class="module-loading">Loading your day…</div>';
  try {
    const m = canViewMoney(identity.role);
    const [leads, jobs, checkouts, equipment, invoices, balances, profit, payments] = await Promise.all([listRows(client, 'leads'), listRows(client, 'jobs', 'starts_at', true), listRows(client, 'checkouts', 'due_back_at', true), listRows(client, 'equipment', 'name', true),
      m ? listRows(client, 'invoices') : [], m ? view(client, 'invoice_balances') : [], m ? view(client, 'job_profit') : [], m ? listRows(client, 'payments', 'paid_at', false) : []]);
    const now = Date.now();
    const openLead = l => !['booked', 'lost', 'unavailable'].includes(l.status);
    const followUps = leads.filter(l => openLead(l) && (l.next_action_at ? new Date(l.next_action_at) < now : l.status === 'new' && now - new Date(l.created_at) > DAY));
    const upcoming = jobs.filter(j => new Date(j.starts_at) >= now - DAY && new Date(j.starts_at) < now + 14 * DAY && !j.archived_at);
    const late = jobs.filter(j => j.delivery_due_at && !j.delivered_at && new Date(j.delivery_due_at) < now);
    const out = checkouts.filter(c => !c.returned_at), overdueGear = out.filter(c => new Date(c.due_back_at) < now);
    const attention = equipment.filter(i => i.active && ['Damaged', 'Needs repair', 'Missing parts'].includes(i.condition));
    const bal = id => balances.find(b => b.invoice_id === id) || {};
    const owed = invoices.filter(i => i.status === 'issued' && i.currency === 'UGX').reduce((s, i) => s + Number(bal(i.id).balance_due || 0), 0);
    const nextDue = i => { const b = bal(i.id), paid = Number(b.received || 0) + Number(b.wht_withheld || 0); const s = [[b.booking_amount, i.booking_due_on], [Number(b.booking_amount) + Number(b.preproduction_amount), i.preproduction_due_on], [b.invoice_total, i.completion_due_on]]; for (const [cum, due] of s) if (paid + .5 < Number(cum)) return { amount: Number(cum) - paid, due }; return null; };
    const overduePay = invoices.filter(i => i.status === 'issued').map(i => ({ i, n: nextDue(i) })).filter(x => x.n?.due && new Date(x.n.due) < new Date(new Date().toISOString().slice(0, 10)));
    const monthKey = new Date().toISOString().slice(0, 7);
    const inMonth = payments.filter(p => !p.voided_at && String(p.paid_at).startsWith(monthKey) && p.currency === 'UGX').reduce((s, p) => s + Number(p.amount), 0);
    const jobName = id => jobs.find(j => j.id === id);
    const profits = profit.filter(p => p.currency === 'UGX' && Number(p.invoiced_revenue) > 0).map(p => ({ ...p, job: jobName(p.job_id) })).filter(p => p.job).sort((a, b) => new Date(b.job.starts_at) - new Date(a.job.starts_at)).slice(0, 6);
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Kampala' }).format(new Date()));
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const card = (label, valueText, sub, tone, href) => `<a class="kpi ${tone || ''}" href="${href}"><small>${label}</small><strong>${valueText}</strong><span>${sub}</span></a>`;
    const alerts = [
      ...late.map(j => `<button class="alert red" data-job="${j.id}"><b>Delivery late</b>${e(j.title)} · due ${readable(j.delivery_due_at)}</button>`),
      ...overduePay.map(({ i, n }) => `<button class="alert red" data-inv="${i.id}"><b>Payment overdue</b>${e(i.reference)} · ${money(n.amount, i.currency)} since ${readable(n.due)}</button>`),
      ...overdueGear.map(c => `<a class="alert amber" href="#equipment"><b>Gear not returned</b>${e(equipment.find(x => x.id === c.equipment_id)?.name || 'Item')} with ${e(c.custodian_name)}</a>`),
      ...followUps.slice(0, 5).map(l => `<a class="alert amber" href="#leads"><b>Follow up</b>${e(l.contact_name)} · ${e(l.service_requested || '')}</a>`),
      ...attention.slice(0, 3).map(i => `<a class="alert amber" href="#equipment"><b>Equipment needs attention</b>${e(i.name)} · ${e(i.condition)}</a>`)
    ];
    host.innerHTML = `<div class="welcome-band"><div><p class="eyebrow">${greet.toUpperCase()}</p><h2>${e(identity.name?.split(' ')[0] || '')}, ${alerts.length ? `${alerts.length} thing${alerts.length === 1 ? '' : 's'} need${alerts.length === 1 ? 's' : ''} you today.` : 'everything is on track.'}</h2><p>${upcoming.length} production${upcoming.length === 1 ? '' : 's'} in the next two weeks.</p></div><img class="welcome-logo" src="./assets/brand/mark-gold.png" alt=""></div>
     <div class="kpi-grid">${m ? card('Owed to you', money(owed), `${overduePay.length} overdue`, overduePay.length ? 'warn' : '', '#invoices') + card('Received this month', money(inMonth), 'Payments recorded', 'good', '#invoices') : ''}
      ${card('Enquiries to follow up', followUps.length, `${leads.filter(openLead).length} open`, followUps.length ? 'warn' : '', '#leads')}${card('Upcoming jobs', upcoming.length, 'Next 14 days', '', '#calendar')}
      ${card('Late deliveries', late.length, 'Past due date', late.length ? 'bad' : 'good', '#jobs')}${card('Gear out', out.length, `${overdueGear.length} overdue`, overdueGear.length ? 'warn' : '', '#equipment')}</div>
     <div class="dash-cols"><section class="panel"><div class="panel-heading"><h2>Needs attention</h2></div><div class="alert-list">${alerts.length ? alerts.join('') : '<p class="muted small-note calm">Nothing urgent. Well done.</p>'}</div></section>
      <section class="panel"><div class="panel-heading"><h2>Coming up</h2><a href="#calendar">Calendar</a></div><div class="alert-list">${upcoming.length ? upcoming.slice(0, 6).map(j => `<button class="alert plain" data-job="${j.id}"><b>${new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Kampala' }).format(new Date(j.starts_at))}</b>${e(j.title)}<em class="status">${e(j.stage)}</em></button>`).join('') : '<p class="muted small-note calm">No productions in the next two weeks.</p>'}</div></section></div>
     ${m ? `<section class="panel profit"><div class="panel-heading"><h2>Profit per job</h2><span class="subtle-label">Invoiced minus expenses and crew pay</span></div>${profits.length ? `<div class="table-wrap flat"><table class="data-table"><thead><tr><th>Job</th><th>Invoiced</th><th>Costs</th><th>Profit</th><th>Margin</th></tr></thead><tbody>${profits.map(p => { const mg = Number(p.invoiced_revenue) ? Math.round(Number(p.profit) / Number(p.invoiced_revenue) * 100) : 0; return `<tr><td><button class="text-button" data-job="${p.job_id}">${e(p.job.reference)}</button><small>${e(p.job.title)}</small></td><td class="num">${money(p.invoiced_revenue)}</td><td class="num">${money(p.cost)}</td><td class="num"><strong>${money(p.profit)}</strong></td><td class="num"><em class="${mg < 30 ? 'overdue' : 'status'}">${mg}%</em></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted small-note calm">Profit appears once a job has an issued invoice. Record crew pay and expenses on each job to see the true margin.</p>'}</section>` : ''}`;
    host.querySelectorAll('[data-job]').forEach(b => b.addEventListener('click', () => { openJob(b.dataset.job); location.hash = '#jobs'; }));
    host.querySelectorAll('[data-inv]').forEach(b => b.addEventListener('click', () => { openInvoice(b.dataset.inv); location.hash = '#invoices'; }));
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>The overview could not be loaded.</strong><p>${e(err.message)}</p></div>`; }
}
