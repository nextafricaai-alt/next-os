// Pay the team: everyone owed for their work, across all projects, in one list.
// Owner and director only (crew_pay is a money table).
import { listRows, saveRow } from '../data.js';
import { e, empty } from './records.js';
import { money, num, readable, askForm, whatsappTo } from '../refs.js';
import { openJob } from './jobs.js';

let view = 'owed';

async function draw(context) {
  const { client, host } = context;
  host.innerHTML = '<div class="module-loading">Loading team pay…</div>';
  try {
    const [pay, jc, crew, jobs] = await Promise.all([listRows(client, 'crew_pay', 'id', true), listRows(client, 'job_crew', 'starts_at', false), listRows(client, 'crew', 'name', true), listRows(client, 'jobs', 'starts_at', false)]);
    const rows = pay.map(p => { const r = jc.find(x => x.id === p.job_crew_id) || {}; return { p, r, c: crew.find(x => x.id === r.crew_id) || {}, j: jobs.find(x => x.id === p.job_id) || {}, bal: Number(p.agreed_amount) - Number(p.paid_amount) }; })
      .sort((a, b) => new Date(a.j.starts_at || 0) - new Date(b.j.starts_at || 0));
    const owed = rows.filter(x => x.bal > 0.5), paid = rows.filter(x => Number(x.p.paid_amount) > 0).sort((a, b) => new Date(b.p.paid_at || 0) - new Date(a.p.paid_at || 0)).slice(0, 40);
    const total = owed.filter(x => x.p.currency === 'UGX').reduce((s, x) => s + x.bal, 0);
    const done = new Date(Date.now() - 864e5 * 0);
    const workDone = owed.filter(x => x.j.ends_at && new Date(x.j.ends_at) < done);
    const monthKey = new Date().toISOString().slice(0, 7);
    const paidMonth = rows.filter(x => String(x.p.paid_at || '').startsWith(monthKey) && x.p.currency === 'UGX').reduce((s, x) => s + Number(x.p.paid_amount), 0);
    const list = view === 'owed' ? owed : paid;
    host.innerHTML = `<div class="kpi-grid">
      <div class="kpi ${total ? 'warn' : 'good'}"><small>Still to pay the team</small><strong>${money(total)}</strong><span>${owed.length} ${owed.length === 1 ? 'person' : 'people'} on ${new Set(owed.map(x => x.p.job_id)).size} project(s)</span></div>
      <div class="kpi ${workDone.length ? 'bad' : ''}"><small>Work done, not yet paid</small><strong>${workDone.length}</strong><span>Pay these first</span></div>
      <div class="kpi good"><small>Paid to the team this month</small><strong>${money(paidMonth)}</strong><span>Recorded payments</span></div></div>
     <div class="chip-row"><button class="chip${view === 'owed' ? ' on' : ''}" data-view="owed">To pay (${owed.length})</button><button class="chip${view === 'paid' ? ' on' : ''}" data-view="paid">Paid</button></div>
     ${list.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Person</th><th>Project</th><th class="num">Agreed</th><th class="num">Paid</th>${view === 'owed' ? '<th class="num">Balance</th><th></th>' : '<th>When</th>'}</tr></thead><tbody>
      ${list.map(x => `<tr data-cp="${x.p.id}"><td><strong>${e(x.c.name || 'Crew')}</strong><small>${e(x.r.role || '')}${x.c.phone ? ' · ' + e(x.c.phone) : ''}</small></td>
        <td><button class="text-button" data-job="${x.p.job_id}">${e(x.j.reference || '')}</button><small>${e(x.j.title || '')}${x.j.starts_at ? ' · ' + readable(x.j.starts_at) : ''}</small>${x.j.ends_at && new Date(x.j.ends_at) < done && x.bal > 0.5 ? '<small class="override">Work done</small>' : ''}</td>
        <td class="num">${money(x.p.agreed_amount, x.p.currency)}</td><td class="num">${money(x.p.paid_amount, x.p.currency)}</td>
        ${view === 'owed' ? `<td class="num"><strong>${money(x.bal, x.p.currency)}</strong></td><td class="row-actions"><button class="button primary small" data-paynow>Pay</button></td>` : `<td>${readable(x.p.paid_at)}${x.p.payment_reference ? `<small>${e(x.p.payment_reference)}</small>` : ''}</td>`}</tr>`).join('')}</tbody></table></div>`
      : empty(view === 'owed' ? 'Nobody is waiting to be paid. Agree pay for each person on a project’s Team tab and it shows here.' : 'No team payments recorded yet.')}`;
    bind(context, rows);
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>Team pay could not be loaded.</strong><p>${e(err.message)}</p><button class="button secondary" data-retry>Try again</button></div>`; host.querySelector('[data-retry]')?.addEventListener('click', () => draw(context)); }
}

function bind(context, rows) {
  const { host, client, notify } = context;
  host.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; draw(context); }));
  host.querySelectorAll('[data-job]').forEach(b => b.addEventListener('click', () => { openJob(b.dataset.job); location.hash = '#jobs'; }));
  host.querySelectorAll('[data-cp] [data-paynow]').forEach(b => b.addEventListener('click', async () => {
    const x = rows.find(r => r.p.id === b.closest('[data-cp]').dataset.cp); if (!x) return;
    const a = await askForm({ title: `Pay ${x.c.name || 'crew'}`, intro: e(`${x.j.reference || ''} ${x.j.title || ''} · balance ${money(x.bal, x.p.currency)}`), submit: 'Record payment', fields: [
      { name: 'amt', label: `Amount paid now (${x.p.currency})`, type: 'number', min: 0, value: String(x.bal), required: true },
      { name: 'ref', label: 'How was it paid? (MoMo ID, cash, bank)', value: 'MoMo', required: true },
      { name: 'tell', label: 'Send them a WhatsApp confirmation (yes / no)', value: x.c.phone ? 'yes' : 'no' }] });
    if (!a) return;
    const amt = num(a.amt) || 0; if (amt <= 0) { notify('Enter the amount paid.'); return; }
    if (amt > x.bal + 0.5) { notify(`That is more than the balance of ${money(x.bal, x.p.currency)}. Raise the agreed pay on the project's Team tab first.`); return; }
    try {
      const newPaid = Number(x.p.paid_amount) + amt;
      await saveRow(client, 'crew_pay', { paid_amount: newPaid, paid_at: new Date().toISOString(), payment_reference: [x.p.payment_reference, `${money(amt, x.p.currency)} ${a.ref}`].filter(Boolean).join(' · ') }, x.p.id);
      notify(`Payment to ${x.c.name || 'crew'} recorded.`);
      if (String(a.tell).toLowerCase().startsWith('y') && x.c.phone) whatsappTo(x.c.phone, `Hello ${x.c.name || ''}, we have sent you ${money(amt, x.p.currency)} (${a.ref}) for ${x.j.title || 'the project'}.${newPaid + 0.5 < Number(x.p.agreed_amount) ? ` Balance remaining: ${money(Number(x.p.agreed_amount) - newPaid, x.p.currency)}.` : ' You are fully paid for this project.'} Thank you for your work.`);
      await draw(context);
    } catch (err) { notify(err.message); }
  }));
}
export async function mountTeamPay(context) { view = 'owed'; await draw(context); }
