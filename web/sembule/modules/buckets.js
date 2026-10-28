// Buckets: Tony's envelopes. What each bucket holds, what was spent from it, the tithe, and jobs waiting to be shared.
// Owner only (Dave Ramsey style: every shilling has a job, spend only what the envelope holds).
import { listRows, saveRow } from '../data.js';
import { withTimeout } from '../utils.js';
import { e, empty, field, selectField } from './records.js';
import { money, num, txt, today, readable, askForm } from '../refs.js';
import { openJob } from './jobs.js';
import { loadBuckets, loadDistributions, splitProfit, ICON } from './bucketsplit.js';

async function draw(context) {
  const { client, host } = context;
  host.innerHTML = '<div class="module-loading">Loading buckets…</div>';
  try {
    const bk = await loadBuckets(client);
    if (!bk.ready) { host.innerHTML = `<div class="error-panel"><strong>The buckets are not set up yet.</strong><p>Hudson needs to finish the database setup (step 010). Nothing is lost; this page will fill in once it is done.</p></div>`; return; }
    const [dists, jobs] = await Promise.all([loadDistributions(client), listRows(client, 'jobs', 'starts_at', false)]);
    let spend = []; try { const r = await withTimeout(client.from('bucket_spend').select('*').order('spent_on', { ascending: false })); spend = r.data || []; } catch { spend = []; }
    let profits = []; try { const r = await withTimeout(client.from('job_profit').select('*')); profits = r.data || []; } catch { profits = []; }
    const buckets = bk.buckets, envelopes = buckets.filter(b => b.key !== 'tithe');
    const inB = k => dists.filter(d => d.bucket === k).reduce((s, d) => s + Number(d.amount), 0);
    const outB = k => spend.filter(x => x.bucket === k).reduce((s, x) => s + Number(x.amount), 0);
    const bal = k => inB(k) - outB(k);
    const jobOf = id => jobs.find(j => j.id === id) || {};
    // Closed jobs whose profit is not fully shared yet.
    const waiting = jobs.filter(j => j.stage === 'Delivered and paid').map(j => {
      const p = profits.find(x => x.job_id === j.id && x.currency === 'UGX'); const profit = p ? Number(p.profit) : 0;
      const rows = splitProfit(profit, buckets).filter(r => r.amount > 0 && !dists.some(d => d.job_id === j.id && d.bucket === r.key));
      return { j, profit, left: rows.reduce((s, r) => s + r.amount, 0), rows };
    }).filter(x => x.profit > 0 && x.rows.length);
    const titheSent = inB('tithe'), titheOwed = waiting.reduce((s, w) => s + (w.rows.find(r => r.key === 'tithe')?.amount || 0), 0);
    const sav = buckets.find(b => b.key === 'savings'), savBal = bal('savings'), target = Number(sav?.target || 0), savPct = target > 0 ? Math.min(100, Math.round(savBal / target * 100)) : 0;
    host.innerHTML = `
     <div class="module-toolbar"><div><strong>Every shilling has a job</strong><span>Tithe ${Number(buckets.find(b => b.key === 'tithe')?.pct || 10)}% of net profit first. Then ${envelopes.map(b => `${e(b.label)} ${Number(b.pct)}%`).join(' · ')}.</span></div></div>
     <div class="kpi-grid">
      <div class="kpi"><small>🙏 Tithe given</small><strong>${money(titheSent)}</strong><span>${titheOwed ? `${money(titheOwed)} still to give` : 'Nothing outstanding'}</span></div>
      ${envelopes.map(b => `<div class="kpi ${bal(b.key) < 0 ? 'bad' : ''}"><small>${ICON[b.key] || '•'} ${e(b.label)}</small><strong>${money(bal(b.key))}</strong><span>${money(inB(b.key))} in · ${money(outB(b.key))} spent</span></div>`).join('')}
     </div>
     <section class="panel"><div class="panel-heading"><h2>🏦 Savings safety net</h2><button class="text-button" data-target>${target ? 'Change target' : 'Set the target'}</button></div><div class="money-body" style="padding:4px 16px 16px">
      ${target ? `<div class="money-big"><div><small>SAVED</small><strong>${money(savBal)}</strong><span>of ${money(target)} target · ${savPct}%</span></div></div><div class="rbar"><i style="width:${savPct}%"></i></div><p class="muted small-note">${savPct >= 100 ? 'The safety net is full. Keep saving: this is the business’s future.' : 'Build this first. It carries the business through a quiet month or a broken screen.'}</p>` : '<p class="muted small-note">Set a target, for example 3 months of running costs. [Tony to confirm the amount.]</p>'}
     </div></section>
     <section class="panel"><div class="panel-heading"><h2>Jobs waiting to be shared</h2><span class="subtle-label">Closed and fully paid</span></div>
      ${waiting.length ? `<div class="alert-list">${waiting.map(w => `<button class="alert amber" data-job="${w.j.id}"><b>${e(w.j.reference)} · ${money(w.left)} to share</b>${e(w.j.title)} · profit ${money(w.profit)}</button>`).join('')}</div>` : '<p class="muted small-note calm" style="padding:0 16px 14px">Nothing waiting. Every closed job has been shared out.</p>'}</section>
     <section class="panel"><div class="panel-heading"><h2>Spend from a bucket</h2><span class="subtle-label">Only what the bucket holds</span></div>
      <form id="spend-form" class="record-form line-form">${selectField('bucket', 'From which bucket', 'equipment', envelopes.map(b => [b.key, `${b.label} (${money(bal(b.key))} available)`]))}${field('amount', 'Amount (UGX)', '', { type: 'number', required: true, extra: 'min="1" step="1"' })}
       ${field('description', 'What was it for?', '', { required: true })}${field('spent_on', 'Date', today(), { type: 'date', required: true })}${field('reference', 'Reference (optional)', '')}
       <div class="form-actions span-2"><button class="button primary" type="submit">Record spending</button></div></form></section>
     <section class="panel"><div class="panel-heading"><h2>History</h2></div>
      ${dists.length || spend.length ? `<div class="table-wrap flat"><table class="data-table"><thead><tr><th>Date</th><th>Bucket</th><th>What</th><th class="num">In</th><th class="num">Out</th></tr></thead><tbody>
       ${[...dists.map(d => ({ date: d.transferred_at, b: d.bucket, what: `${jobOf(d.job_id).reference || ''} ${jobOf(d.job_id).title || ''}`, ref: d.reference, inn: d.amount })), ...spend.map(x => ({ date: x.spent_on, b: x.bucket, what: x.description, ref: x.reference, out: x.amount }))]
          .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 80)
          .map(r => `<tr><td>${readable(r.date)}</td><td>${ICON[r.b] || ''} ${e(buckets.find(b => b.key === r.b)?.label || r.b)}</td><td>${e(r.what)}${r.ref ? `<small>${e(r.ref)}</small>` : ''}</td><td class="num">${r.inn ? money(r.inn) : ''}</td><td class="num">${r.out ? money(r.out) : ''}</td></tr>`).join('')}
      </tbody></table></div>` : empty('Nothing yet. Close a job, share its profit, and the buckets start filling.')}</section>`;
    bind(context, { bal, sav });
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>Buckets could not be loaded.</strong><p>${e(err.message)}</p><button class="button secondary" data-retry>Try again</button></div>`; host.querySelector('[data-retry]')?.addEventListener('click', () => draw(context)); }
}

function bind(context, { bal, sav }) {
  const { host, client, notify } = context;
  const run = async (fn, ok) => { try { await fn(); if (ok) notify(ok); await draw(context); } catch (err) { notify(err.message); } };
  host.querySelectorAll('[data-job]').forEach(b => b.addEventListener('click', () => { openJob(b.dataset.job); location.hash = '#jobs'; }));
  host.querySelector('[data-target]')?.addEventListener('click', async () => {
    const a = await askForm({ title: 'Savings target', intro: 'How much should the business keep as its safety net?', submit: 'Save target', fields: [{ name: 't', label: 'Target (UGX)', type: 'number', min: 0, value: sav?.target ? String(sav.target) : '', required: true }] });
    if (!a) return; const t = num(a.t); if (t == null || t < 0) return;
    run(async () => { const { error } = await withTimeout(client.from('money_buckets').update({ target: t }).eq('key', 'savings')); if (error) throw new Error(error.message); }, 'Savings target saved.');
  });
  const f = host.querySelector('#spend-form');
  f?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(f), k = fd.get('bucket'), amt = num(fd.get('amount')) || 0;
    if (amt <= 0) { notify('Enter the amount.'); return; }
    if (amt > bal(k) + 0.5) { notify(`That bucket only holds ${money(bal(k))}. Spend only what is in the bucket.`); return; }
    run(() => saveRow(client, 'bucket_spend', { bucket: k, amount: amt, description: String(fd.get('description')).trim(), spent_on: fd.get('spent_on'), reference: txt(fd.get('reference')) }), 'Spending recorded.'); });
}
export async function mountBuckets(context) { await draw(context); }
