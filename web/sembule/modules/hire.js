// Hire & deposits: equipment dry-hire terms, refundable deposits, and a branded hire agreement. Owner and director only.
import { listRows, saveRow } from '../data.js';
import { e, empty } from './records.js';
import { money, num, readable, printDocument, askForm, today } from '../refs.js';

const METHODS = [['cash', 'Cash'], ['mtn_momo', 'MTN MoMo'], ['airtel_money', 'Airtel Money'], ['bank', 'Bank']];
const TERMS = [
  'The hirer is responsible for the equipment from collection until it is returned to Sembule Media, and must use it only for the agreed purpose.',
  'The hirer pays for repair or replacement of any equipment that is lost, stolen or damaged while in their care, other than normal wear.',
  'Equipment must be returned on the agreed date and time, in the same condition, with all cables and accessories. Late return is charged at the daily hire rate.',
  'The deposit is refunded when everything is returned and checked. Any deduction for damage, missing items or late return is explained in writing.',
  'Sembule Media is not responsible for loss or damage caused by weather, power supply or misuse at the hirer\'s venue.',
  'Sembule Media may cancel a hire if the equipment is unsafe to deliver, and will refund any payment already made for it.'
];

function agreement(d, job, c, notify) {
  printDocument({ title: 'Hire agreement', heading: 'HIRE AGREEMENT', reference: job.reference, partyLabel: 'HIRER', metaLines: [`Agreed ${readable(d.received_at)}`], party: c, notify, filename: `Hire_${job.reference}_${c.organisation || c.name || ''}`, body: `
   <div class="box gold"><h3>EQUIPMENT HIRED</h3><p>${e(d.items)}</p><p><strong>Hire period:</strong> ${readable(job.starts_at)}${readable(job.ends_at) !== readable(job.starts_at) ? ' to ' + readable(job.ends_at) : ''}${job.venue ? ' · ' + e(job.venue) : ''}</p><p><strong>Refundable deposit:</strong> ${money(d.amount)}</p></div>
   <div class="box" style="margin-top:18px"><h3>TERMS</h3>${TERMS.map((t, i) => `<p>${i + 1}. ${e(t)}</p>`).join('')}</div>
   <div class="grid"><div class="box"><h3>HIRER</h3><p>Name: ${e(c.name || '')}</p><p>Signature: ______________________</p><p>Date: ______________</p></div><div class="box"><h3>FOR SEMBULE MEDIA</h3><p>Name: ______________________</p><p>Signature: ______________________</p><p>Date: ______________</p></div></div>` });
}

export async function mountHire(context) {
  const { client, host, notify } = context;
  host.innerHTML = '<div class="module-loading">Loading hire deposits…</div>';
  const draw = async () => {
    const [deps, jobs, clients] = await Promise.all([listRows(client, 'hire_deposits', 'received_at', false), listRows(client, 'jobs', 'starts_at', false), listRows(client, 'clients', 'name', true)]);
    const job = id => jobs.find(j => j.id === id) || {}, cli = id => clients.find(c => c.id === id) || {};
    const held = deps.filter(d => !d.returned_at), heldTotal = held.reduce((s, d) => s + Number(d.amount), 0);
    host.innerHTML = `<div class="module-toolbar"><div><strong>${held.length} deposit${held.length === 1 ? '' : 's'} held · ${money(heldTotal)}</strong><span>Money you are holding for clients. It is theirs until the gear comes back.</span></div><button class="button primary" data-new>+ New hire deposit</button></div>
     ${deps.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Job / client</th><th>Equipment</th><th>Deposit</th><th>Status</th><th></th></tr></thead><tbody>${deps.map(d => `<tr><td><strong>${e(job(d.job_id).reference || '')}</strong><small>${e(cli(d.client_id).organisation || cli(d.client_id).name || '')}</small></td><td>${e(d.items)}</td><td class="num">${money(d.amount)}<small>${readable(d.received_at)}</small></td>
       <td>${d.returned_at ? `<em class="status">Returned ${readable(d.returned_at)}</em>${Number(d.deducted) ? `<small>Kept ${money(d.deducted)}: ${e(d.deduction_reason)}</small>` : ''}` : '<em class="overdue">Held</em>'}</td>
       <td class="row-actions"><button class="text-button" data-doc="${d.id}">Hire agreement</button>${d.returned_at ? '' : `<button class="text-button" data-ret="${d.id}">Return deposit</button>`}</td></tr>`).join('')}</tbody></table></div>` : empty('No hire deposits yet. Use this when a client hires equipment without a crew.')}`;
    host.querySelector('[data-new]').onclick = async () => {
      const a = await askForm({ title: 'New hire deposit', submit: 'Save deposit', fields: [
        { name: 'job_id', label: 'Job', type: 'select', value: '', options: [['', 'Choose a job'], ...jobs.filter(j => !j.archived_at).slice(0, 80).map(j => [j.id, `${j.reference} · ${j.title}`])] },
        { name: 'items', label: 'Equipment hired', type: 'textarea', required: true, hint: 'For example: 2 × 65" screens with stands, 1 PA system' },
        { name: 'amount', label: 'Deposit received (UGX)', type: 'number', min: 0, required: true },
        { name: 'method', label: 'Paid by', type: 'select', value: 'cash', options: METHODS },
        { name: 'reference', label: 'Reference', hint: 'MoMo ID, bank slip, etc. (optional)' }] });
      if (!a) return;
      if (!a.job_id || !a.items) { notify('Choose the job and list the equipment.'); return; }
      try { await saveRow(client, 'hire_deposits', { job_id: a.job_id, client_id: job(a.job_id).client_id, items: a.items, amount: num(a.amount), method: a.method, reference: a.reference || null }, null); notify('Deposit saved.'); await draw(); } catch (err) { notify(err.message); }
    };
    host.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => { const d = deps.find(x => x.id === b.dataset.doc); agreement(d, job(d.job_id), cli(d.client_id), notify); });
    host.querySelectorAll('[data-ret]').forEach(b => b.onclick = async () => {
      const d = deps.find(x => x.id === b.dataset.ret);
      const a = await askForm({ title: 'Return deposit', intro: `Held: <b>${money(d.amount)}</b>`, submit: 'Mark returned', fields: [
        { name: 'ded', label: 'Amount you are keeping (UGX)', type: 'number', min: 0, value: '0', hint: 'For damage, missing items or late return. Leave 0 to refund everything.' },
        { name: 'why', label: 'Reason for keeping any amount', type: 'textarea' }] });
      if (!a) return; const ded = num(a.ded) || 0;
      if (ded > Number(d.amount)) { notify('You cannot keep more than the deposit.'); return; }
      if (ded > 0 && !a.why) { notify('Please write the reason for keeping part of the deposit.'); return; }
      try { await saveRow(client, 'hire_deposits', { returned_at: new Date().toISOString(), deducted: ded, deduction_reason: ded ? a.why : null }, d.id); notify(`Return ${money(Number(d.amount) - ded)} to the client.`); await draw(); } catch (err) { notify(err.message); }
    });
  };
  try { await draw(); } catch (err) { host.innerHTML = `<div class="error-panel"><strong>Hire deposits could not be loaded.</strong><p>${e(err.message)}</p></div>`; }
}
