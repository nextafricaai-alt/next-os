// Delivery: every job still owed to a client, soonest deadline first. Late deliveries were Tony's biggest money loss.
import { listRows } from '../data.js';
import { e, empty } from './records.js';
import { readable } from '../refs.js';
import { openJob } from './jobs.js';

export async function mountDelivery(context) {
  const { client, host } = context;
  host.innerHTML = '<div class="module-loading">Loading deliveries…</div>';
  try {
    const [jobs, clients, revisions] = await Promise.all([listRows(client, 'jobs', 'starts_at', true), listRows(client, 'clients'), listRows(client, 'job_revisions')]);
    const now = Date.now();
    const pending = jobs.filter(j => !j.delivered_at && !j.archived_at && ['Production', 'Editing', 'Review', 'Planning', 'Confirmed'].includes(j.stage) && new Date(j.starts_at) < now + 7 * 864e5)
      .sort((a, b) => new Date(a.delivery_due_at || '2999-01-01') - new Date(b.delivery_due_at || '2999-01-01'));
    const name = id => { const c = clients.find(x => x.id === id); return c?.organisation || c?.name || ''; };
    const status = j => { if (!j.delivery_due_at) return ['overdue', 'No due date set']; const d = Math.ceil((new Date(j.delivery_due_at) - now) / 864e5); return d < 0 ? ['overdue', `${-d} day${d === -1 ? '' : 's'} late`] : d <= 2 ? ['overdue', d === 0 ? 'Due today' : `Due in ${d} day${d === 1 ? '' : 's'}`] : ['status', `Due in ${d} days`]; };
    const late = pending.filter(j => j.delivery_due_at && new Date(j.delivery_due_at) < now).length;
    host.innerHTML = `<div class="module-toolbar"><div><strong>${pending.length} deliver${pending.length === 1 ? 'y' : 'ies'} in progress</strong><span>${late ? `${late} late. Clear these first.` : 'Nothing late'}</span></div></div>
     ${pending.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Job</th><th>Client</th><th>Stage</th><th>Revisions</th><th>Deadline</th></tr></thead><tbody>${pending.map(j => { const [tone, label] = status(j); const revs = revisions.filter(r => r.job_id === j.id); const open = revs.filter(r => !r.completed_at).length; return `<tr><td><button class="text-button" data-job="${j.id}">${e(j.reference)}</button><small>${e(j.title)}</small></td><td>${e(name(j.client_id))}</td><td><em class="status">${e(j.stage)}</em></td><td>${revs.length} of ${j.included_revisions}${open ? `<small>${open} open</small>` : ''}${revs.length > j.included_revisions ? '<small class="override">Chargeable rounds</small>' : ''}</td><td>${j.delivery_due_at ? readable(j.delivery_due_at) : '-'}<small><em class="${tone}">${label}</em></small></td></tr>`; }).join('')}</tbody></table></div>` : empty('Nothing waiting to be delivered.')}`;
    host.querySelectorAll('[data-job]').forEach(b => b.addEventListener('click', () => { openJob(b.dataset.job); location.hash = '#jobs'; }));
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>Deliveries could not be loaded.</strong><p>${e(err.message)}</p></div>`; }
}
