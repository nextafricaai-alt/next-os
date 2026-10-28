// Client hub: one link per project. Brief, quote, booking terms, invoice and receipts, files, review.
// Reads one project by its private token through a secure database function. Every action reaches Tony as a notification.
import { getClient } from './db.js';

const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n, cur = 'UGX') => `${cur} ${Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: cur === 'USD' ? 2 : 0 })}`;
const date = d => d ? new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kampala' }).format(new Date(d)) : '';
const root = document.getElementById('page');
const token = new URLSearchParams(location.search).get('t') || '';
const link = (page, t) => new URL(`./${page}.html?t=${t}`, location.href).href;
const invalid = msg => { root.innerHTML = `<div class="pp-card"><h1>This link is not available</h1><p>${e(msg)}</p></div>`; };

function step(n, title, state, body) {
  const mark = state === 'done' ? '✓' : state === 'todo' ? '!' : n;
  return `<section class="hub-step ${state}"><div class="hub-n">${mark}</div><div class="hub-body"><h2>${e(title)}</h2>${body}</div></section>`;
}

function render(d, client) {
  const phone = String(d.company?.phone || '').replace(/\D/g, '').replace(/^0/, '256');
  const wa = msg => `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  const first = String(d.contact || d.client || '').split(' ')[0];
  const due = d.invoices.reduce((s, i) => s + Number(i.due || 0), 0);
  const steps = [];
  let n = 0;
  // 1. Brief
  steps.push(step(++n, 'Tell us about your event', d.brief_status === 'submitted' ? 'done' : 'todo',
    d.brief_status === 'submitted'
      ? `<p>Thank you, we have your brief. You can still update it until the week of the event.</p><a class="pp-btn ghost" href="${link('brief', d.brief_token)}">Update my brief</a>`
      : `<p>A short form about the day, the venue, your programme and the songs you want. It takes about 5 minutes and saves your progress.</p><a class="pp-btn" href="${link('brief', d.brief_token)}">Fill in my brief</a>`));
  // 2. Quotes
  if (d.quotes.length) steps.push(step(++n, d.quotes.length > 1 ? 'Your quotations' : 'Your quotation', d.quotes.some(q => q.accepted_at || q.status === 'accepted') ? 'done' : 'todo',
    d.quotes.map(q => `<div class="hub-row"><div><b>${e(q.reference)}</b><small>${money(q.total, q.currency)}${q.accepted_at || q.status === 'accepted' ? ' · accepted' : ''}</small></div><a class="pp-btn ${q.accepted_at || q.status === 'accepted' ? 'ghost' : ''} sm" href="${link('portal', q.token)}">${q.accepted_at || q.status === 'accepted' ? 'View' : 'View and accept'}</a></div>`).join('')));
  // 3. Booking terms
  if (d.terms) steps.push(step(++n, 'Booking terms', d.signed_at ? 'done' : 'todo',
    `<details class="hub-terms"${d.signed_at ? '' : ' open'}><summary>Read the terms</summary><div>${e(d.terms).replace(/\n/g, '<br>')}</div></details>
     ${d.signed_at ? `<p class="pp-note">Signed by <b>${e(d.signed_name)}</b> on ${date(d.signed_at)}. Thank you.</p>`
       : `<form id="sign" class="hub-form"><label>Your full name<input name="name" required minlength="2" maxlength="120" autocomplete="name"></label><label class="hub-check"><input type="checkbox" name="ok" required> I have read and agree to these booking terms</label><button class="pp-btn" type="submit">Sign and agree</button></form>`}`));
  // 4. Invoice and receipts
  if (d.invoices.length) steps.push(step(++n, 'Payments and receipts', due <= 0.5 ? 'done' : 'todo',
    `${due > 0.5 ? `<p>Balance due: <b>${money(due, d.invoices[0].currency)}</b>. Open the invoice to see how to pay.</p>` : '<p>Fully paid. Thank you.</p>'}
     ${d.invoices.map(i => `<div class="hub-row"><div><b>${e(i.reference)}</b><small>Paid ${money(i.paid, i.currency)} of ${money(i.total, i.currency)}</small></div><a class="pp-btn ghost sm" href="${link('portal', i.token)}">Invoice and receipts</a></div>`).join('')}`));
  // 5. Files
  if (d.files_link) steps.push(step(++n, 'Your files', 'done', `<p>Your photos and videos are ready.</p><a class="pp-btn" href="${e(d.files_link)}" target="_blank" rel="noopener">Download your files</a>`));
  // 6. Review
  if (d.delivered) steps.push(step(++n, 'How did we do?', d.review ? 'done' : 'todo',
    d.review ? `<p>Thank you for your ${Number(d.review.rating)}-star review. It means a lot to the team.</p>`
      : `<form id="review" class="hub-form"><div class="hub-stars">${[1, 2, 3, 4, 5].map(s => `<label><input type="radio" name="rating" value="${s}" required><span>★</span></label>`).join('')}</div>
         <label>A few words about your experience<textarea name="comment" rows="3" maxlength="3000"></textarea></label>
         <label class="hub-check"><input type="checkbox" name="publish"> Sembule Media may share my review publicly</label><button class="pp-btn" type="submit">Send review</button></form>`));

  root.innerHTML = `<header class="pp-head"><img src="./assets/brand/logo-white.png" alt="${e(d.company?.name || 'Sembule Media')}"><span>YOUR PROJECT</span></header>
   <div class="pp-card"><p class="pp-eyebrow">${e(d.reference)} · ${e(d.client)}</p><h1>${e(d.title)}</h1>
    <p class="pp-sub">${date(d.starts_at)}${d.venue ? ' · ' + e(d.venue) : ''}</p>
    <p>Hello ${e(first)}, everything for your event is on this page. Keep this link; it always shows the latest.</p>
    ${steps.join('')}
    <a class="pp-btn ghost" href="${wa(`Hello, this is ${first} about ${d.title} (${d.reference}).`)}">Message us on WhatsApp</a>
   </div><footer class="pp-foot">${[d.company?.name, d.company?.phone, d.company?.email, d.company?.website].filter(Boolean).map(e).join(' · ')}<br><b>THE GIANTS OF MULTIMEDIA</b></footer>`;

  root.querySelector('#sign')?.addEventListener('submit', async ev => {
    ev.preventDefault(); const f = ev.target, b = f.querySelector('button'); b.disabled = true; b.textContent = 'Saving…';
    const { data, error } = await client.rpc('hub_sign_terms', { p_token: token, p_name: f.name.value.trim() });
    if (error || !data) { b.disabled = false; b.textContent = 'Sign and agree'; alert('Could not save. Please check your connection and try again.'); return; }
    load(client);
  });
  root.querySelector('#review')?.addEventListener('submit', async ev => {
    ev.preventDefault(); const f = ev.target, b = f.querySelector('button'); b.disabled = true; b.textContent = 'Sending…';
    const { data, error } = await client.rpc('hub_review', { p_token: token, p_rating: Number(new FormData(f).get('rating')), p_comment: f.comment.value, p_publish: f.publish.checked });
    if (error || !data) { b.disabled = false; b.textContent = 'Send review'; alert('Could not send. Please try again.'); return; }
    load(client);
  });
}

async function load(client) {
  const { data, error } = await client.rpc('client_hub', { p_token: token });
  if (error || !data) return invalid('This page is not available or the link has changed. Please contact us for a new link.');
  render(data, client);
}

(async () => {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return invalid('Please use the link we sent you.');
  try { await load(await getClient()); } catch { invalid('We could not load this page. Please check your connection and try again.'); }
})();
