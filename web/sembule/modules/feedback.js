// Reviews & referrals: ask happy clients for a review, record it with permission to publish, and thank people who send new work.
import { listRows, saveRow } from '../data.js';
import { CONFIG } from '../config.js';
import { e, empty } from './records.js';
import { num, readable, whatsappTo, askForm } from '../refs.js';

let tab = 'reviews';
const STATUS = [['new', 'New'], ['contacted', 'Contacted'], ['booked', 'Booked'], ['not_interested', 'Not interested']];

export async function mountFeedback(context) {
  const { client, host, notify } = context;
  host.innerHTML = '<div class="module-loading">Loading…</div>';
  const draw = async () => {
    const [reviews, refs, jobs, clients] = await Promise.all([listRows(client, 'reviews'), listRows(client, 'referrals'), listRows(client, 'jobs', 'starts_at', false), listRows(client, 'clients', 'name', true)]);
    const cli = id => clients.find(c => c.id === id) || {}, nm = c => c.organisation || c.name || 'Client';
    const rev = jobId => reviews.find(r => r.job_id === jobId);
    const done = jobs.filter(j => j.delivered_at && !j.archived_at);
    const pending = done.filter(j => !rev(j.id) || (!rev(j.id).received_at));
    const received = reviews.filter(r => r.received_at);
    const avg = received.length ? (received.reduce((s, r) => s + (r.rating || 0), 0) / received.length).toFixed(1) : '-';
    host.innerHTML = `<div class="tab-row"><button class="tab ${tab === 'reviews' ? 'active' : ''}" data-tab="reviews">Reviews</button><button class="tab ${tab === 'referrals' ? 'active' : ''}" data-tab="referrals">Referrals</button></div>
    ${tab === 'reviews' ? `<div class="kpi-grid"><div class="kpi good"><small>Reviews received</small><strong>${received.length}</strong><span>Average ${avg} of 5</span></div><div class="kpi"><small>Waiting to ask</small><strong>${pending.length}</strong><span>Delivered jobs</span></div></div>
      <section class="panel"><div class="panel-heading"><h2>Ask for a review</h2><span class="subtle-label">Best a day or two after delivery</span></div><div class="remind-list">${pending.length ? pending.slice(0, 20).map(j => { const c = cli(j.client_id), r = rev(j.id); return `<div class="remind ok"><div><strong>${e(nm(c))} · ${e(j.title)}</strong><small>Delivered ${readable(j.delivered_at)}${r?.requested_at ? ' · asked ' + readable(r.requested_at) : ''}</small></div><span><button class="button secondary" data-ask="${j.id}">${r?.requested_at ? 'Ask again' : 'Ask on WhatsApp'}</button> <button class="button secondary" data-got="${j.id}">Record reply</button></span></div>`; }).join('') : '<p class="muted small-note calm">Nothing waiting. Delivered jobs appear here.</p>'}</div></section>
      <section class="panel"><div class="panel-heading"><h2>What clients said</h2></div><div class="remind-list">${received.length ? received.map(r => `<div class="remind"><div><strong>${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))} · ${e(nm(cli(r.client_id)))}</strong><small>${e(r.quote || '')}${r.may_publish ? ' · OK to publish' : ' · private'}</small></div></div>`).join('') : empty('No reviews recorded yet.')}</div></section>`
    : `<div class="module-toolbar"><div><strong>${refs.length} referral${refs.length === 1 ? '' : 's'}</strong><span>Someone sent you new business. Thank them.</span></div><button class="button primary" data-newref>+ New referral</button></div>
      ${refs.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Referred</th><th>By</th><th>Status</th><th></th></tr></thead><tbody>${refs.map(r => `<tr><td><strong>${e(r.referred_name)}</strong><small>${e(r.referred_phone || '')}</small></td><td>${e(r.referrer_client_id ? nm(cli(r.referrer_client_id)) : r.referrer_name || '')}</td><td><select data-st="${r.id}">${STATUS.map(([v, t]) => `<option value="${v}"${v === r.status ? ' selected' : ''}>${t}</option>`).join('')}</select></td><td class="row-actions">${r.thanked ? '<em class="status">Thanked</em>' : `<button class="text-button" data-thank="${r.id}">Thank them</button>`}</td></tr>`).join('')}</tbody></table></div>` : empty('No referrals yet.')}`}`;

    host.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    host.querySelectorAll('[data-ask]').forEach(b => b.onclick = async () => {
      const j = jobs.find(x => x.id === b.dataset.ask), c = cli(j.client_id);
      whatsappTo(c.phone, `Hello ${c.name || ''}, thank you for choosing ${CONFIG.name} for ${j.title}. It was a pleasure working with you. If you were happy with our work, would you reply with a few words and a rating out of 5? It helps other clients trust us. Thank you!`);
      try { const r = rev(j.id); await saveRow(client, 'reviews', { client_id: j.client_id, job_id: j.id, requested_at: new Date().toISOString() }, r?.id || null); } catch (err) { notify(err.message); }
    });
    host.querySelectorAll('[data-got]').forEach(b => b.onclick = async () => {
      const j = jobs.find(x => x.id === b.dataset.got);
      const a = await askForm({ title: 'Record review', intro: e(j.title), submit: 'Save review', fields: [
        { name: 'rating', label: 'Rating', type: 'select', value: '5', options: [5, 4, 3, 2, 1].map(n => [String(n), `${n} of 5`]) },
        { name: 'quote', label: 'What they said', type: 'textarea' },
        { name: 'pub', label: 'They agreed we can publish it', type: 'checkbox', value: false }] });
      if (!a) return;
      try { const r = rev(j.id); await saveRow(client, 'reviews', { client_id: j.client_id, job_id: j.id, rating: num(a.rating), quote: a.quote || null, may_publish: a.pub, received_at: new Date().toISOString() }, r?.id || null); notify('Review saved.'); await draw(); } catch (err) { notify(err.message); }
    });
    host.querySelector('[data-newref]')?.addEventListener('click', async () => {
      const a = await askForm({ title: 'New referral', submit: 'Save referral', fields: [
        { name: 'by', label: 'Referred by (existing client)', type: 'select', value: '', options: [['', 'Someone else'], ...clients.map(c => [c.id, nm(c)])] },
        { name: 'byname', label: 'Or their name', hint: 'If not in the client list' },
        { name: 'name', label: 'New person or organisation', required: true }, { name: 'phone', label: 'Their phone', type: 'tel' }] });
      if (!a || !a.name) return;
      try { await saveRow(client, 'referrals', { referrer_client_id: a.by || null, referrer_name: a.byname || null, referred_name: a.name, referred_phone: a.phone || null }, null); notify('Referral saved.'); await draw(); } catch (err) { notify(err.message); }
    });
    host.querySelectorAll('[data-st]').forEach(s => s.onchange = async () => { try { await saveRow(client, 'referrals', { status: s.value }, s.dataset.st); notify('Updated.'); } catch (err) { notify(err.message); } });
    host.querySelectorAll('[data-thank]').forEach(b => b.onclick = async () => {
      const r = refs.find(x => x.id === b.dataset.thank), c = cli(r.referrer_client_id);
      if (c.phone) whatsappTo(c.phone, `Hello ${c.name || ''}, thank you for recommending ${r.referred_name} to ${CONFIG.name}. We truly appreciate your trust and will take good care of them.`);
      try { await saveRow(client, 'referrals', { thanked: true }, r.id); await draw(); } catch (err) { notify(err.message); }
    });
  };
  try { await draw(); } catch (err) { host.innerHTML = `<div class="error-panel"><strong>This page could not be loaded.</strong><p>${e(err.message)}</p></div>`; }
}
