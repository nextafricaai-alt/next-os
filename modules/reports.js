// Reports (owner and director): money received per month, revenue by service, and who still owes. UGX only; USD shown separately if any.
import { listRows } from '../data.js';
import { withTimeout } from '../utils.js';
import { e } from './records.js';
import { money, readable } from '../refs.js';
import { openInvoice } from './invoices.js';

const SERVICE = { livestream: 'Livestream', sound_pa: 'Sound / PA', sound: 'Sound / PA', screens: 'Screens', tv_display: 'Screens', photography: 'Photography', videography: 'Videography', documentary: 'Documentary', podcast: 'Podcast' };
const label = s => SERVICE[s] || (s ? s.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Other');
const bar = (v, max) => `<span class="rbar"><i style="width:${max ? Math.max(2, Math.round(v / max * 100)) : 0}%"></i></span>`;

export async function mountReports(context) {
  const { client, host } = context;
  host.innerHTML = '<div class="module-loading">Building reports…</div>';
  try {
    const [payments, invoices, jobs, clients, bal] = await Promise.all([listRows(client, 'payments', 'paid_at', false), listRows(client, 'invoices'), listRows(client, 'jobs'), listRows(client, 'clients'),
      withTimeout(client.from('invoice_balances').select('*')).then(r => { if (r.error) throw new Error(r.error.message); return r.data || []; })]);
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => ({ key: `${year}-${String(i + 1).padStart(2, '0')}`, name: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(year, i, 1)), total: 0, count: 0 }));
    const live = payments.filter(p => !p.voided_at && p.currency === 'UGX');
    live.forEach(p => { const m = months.find(x => String(p.paid_at).startsWith(x.key)); if (m) { m.total += Number(p.amount) + Number(p.wht_withheld || 0); m.count++; } });
    const yearTotal = months.reduce((s, m) => s + m.total, 0), maxM = Math.max(...months.map(m => m.total));
    const nowKey = new Date().toISOString().slice(0, 7), shown = months.filter(m => m.key <= nowKey);

    const b = id => bal.find(x => x.invoice_id === id) || {};
    const issued = invoices.filter(i => i.status === 'issued' || i.status === 'paid');
    const svc = {};
    issued.filter(i => i.currency === 'UGX' && String(i.issued_at || i.created_at).startsWith(String(year))).forEach(i => { const j = jobs.find(x => x.id === i.job_id); const k = label(j?.service_type); svc[k] = svc[k] || { total: 0, jobs: new Set() }; svc[k].total += Number(b(i.id).invoice_total || 0); svc[k].jobs.add(i.job_id); });
    const svcRows = Object.entries(svc).sort((a, z) => z[1].total - a[1].total), svcTotal = svcRows.reduce((s, [, v]) => s + v.total, 0), maxS = Math.max(0, ...svcRows.map(([, v]) => v.total));

    const cname = id => { const c = clients.find(x => x.id === id); return c?.organisation || c?.name || ''; };
    const owing = invoices.filter(i => i.status === 'issued' && Number(b(i.id).balance_due) > 0.5).map(i => ({ i, due: Number(b(i.id).balance_due), job: jobs.find(j => j.id === i.job_id) })).sort((a, z) => z.due - a.due);
    const owedUGX = owing.filter(o => o.i.currency === 'UGX').reduce((s, o) => s + o.due, 0), owedUSD = owing.filter(o => o.i.currency === 'USD').reduce((s, o) => s + o.due, 0);

    host.innerHTML = `<div class="kpi-grid">
       <div class="kpi good"><small>Received in ${year}</small><strong>${money(yearTotal)}</strong><span>${live.filter(p => String(p.paid_at).startsWith(String(year))).length} payments, WHT included</span></div>
       <div class="kpi"><small>Invoiced in ${year}</small><strong>${money(svcTotal)}</strong><span>Issued invoices</span></div>
       <div class="kpi ${owing.length ? 'warn' : 'good'}"><small>Still owed</small><strong>${money(owedUGX)}</strong><span>${owing.length} invoice${owing.length === 1 ? '' : 's'}${owedUSD ? ' · plus ' + money(owedUSD, 'USD') : ''}</span></div></div>
     <section class="panel"><div class="panel-heading"><h2>Money received per month</h2><span class="subtle-label">${year}</span></div>
      <div class="rlist">${shown.map(m => `<div class="rrow"><b>${m.name}</b>${bar(m.total, maxM)}<span class="num">${money(m.total)}</span></div>`).join('')}</div></section>
     <section class="panel"><div class="panel-heading"><h2>Revenue by service</h2><span class="subtle-label">What actually brings the money in</span></div>
      ${svcRows.length ? `<div class="rlist">${svcRows.map(([k, v]) => `<div class="rrow"><b>${e(k)}<small>${v.jobs.size} job${v.jobs.size === 1 ? '' : 's'} · ${svcTotal ? Math.round(v.total / svcTotal * 100) : 0}%</small></b>${bar(v.total, maxS)}<span class="num">${money(v.total)}</span></div>`).join('')}</div>` : '<p class="muted small-note calm">Appears once invoices are issued this year.</p>'}</section>
     <section class="panel"><div class="panel-heading"><h2>Outstanding balances</h2><span class="subtle-label">Largest first</span></div>
      ${owing.length ? `<div class="table-wrap flat"><table class="data-table"><thead><tr><th>Invoice</th><th>Client</th><th>Issued</th><th>Balance</th></tr></thead><tbody>${owing.map(o => `<tr><td><button class="text-button" data-inv="${o.i.id}">${e(o.i.reference)}</button><small>${e(o.job?.title || '')}</small></td><td>${e(cname(o.job?.client_id))}</td><td>${readable(o.i.issued_at || o.i.created_at)}</td><td class="num"><strong>${money(o.due, o.i.currency)}</strong></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small-note calm">Nobody owes you anything. Well done.</p>'}</section>`;
    host.querySelectorAll('[data-inv]').forEach(x => x.addEventListener('click', () => { openInvoice(x.dataset.inv); location.hash = '#invoices'; }));
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>Reports could not be loaded.</strong><p>${e(err.message)}</p></div>`; }
}
