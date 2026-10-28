// Public, link-only pages: client portal (quote / invoice / how to pay) and crew call page.
// Reads exactly one record by its private token via a secure database function. No sign-in, no other data reachable.
import { getClient } from './db.js';

const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n, cur = 'UGX') => `${cur} ${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: cur === 'USD' ? 2 : 0, maximumFractionDigits: cur === 'USD' ? 2 : 0 })}`;
const date = d => d ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Kampala' }).format(new Date(d)) : '';
const dt = d => d ? new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' }).format(new Date(d)) : '';
const root = document.getElementById('page');
const token = new URLSearchParams(location.search).get('t') || '';
const METHOD = { mtn_momo: 'MTN MoMo', airtel_money: 'Airtel Money', bank: 'Bank', cash: 'Cash' };

const head = (co, label) => `<header class="pp-head"><img src="./assets/brand/logo-white.png" alt="${e(co?.name || 'Sembule Media')}"><span>${e(label)}</span></header>`;
const foot = co => `<footer class="pp-foot">${[co?.name, co?.phone, co?.email, co?.website].filter(Boolean).map(e).join(' · ')}${co?.tin ? `<br>TIN ${e(co.tin)}` : ''}<br><b>THE GIANTS OF MULTIMEDIA</b></footer>`;
const invalid = msg => root.innerHTML = `<div class="pp-card"><h1>This link is not available</h1><p>${e(msg)}</p></div>`;

function invoicePage(d) {
  const b = d.balance || {}, cur = d.currency, paid = Number(b.received || 0) + Number(b.wht_withheld || 0), total = Number(b.invoice_total || 0), due = Math.max(0, total - paid);
  const steps = [[Number(b.booking_amount), d.dues[0]], [Number(b.preproduction_amount), d.dues[1]], [Number(b.completion_amount), d.dues[2]]];
  let cum = 0; const sched = steps.map(([amt, s]) => { cum += amt; const done = paid + .5 >= cum; return `<div class="pp-step ${done ? 'done' : ''}"><span>${e(s.label)} (${Number(s.percent)}%)</span><b>${money(amt, cur)}</b><small>${done ? 'Paid' : s.due ? 'Due ' + date(s.due) : 'Due'}</small></div>`; }).join('');
  const pay = d.pay || {};
  const payBlocks = [['Bank', pay.bank], ['MTN MoMo', pay.momo], ['Airtel Money', pay.airtel]].filter(x => x[1]).map(([t, v]) => `<div class="pp-pay"><h3>${t}</h3><p>${e(v).replace(/\n/g, '<br>')}</p></div>`).join('');
  root.innerHTML = `${head(d.company, 'INVOICE')}<div class="pp-card">
    <p class="pp-eyebrow">${e(d.reference)} · ${e(d.client)}</p><h1>${e(d.job)}</h1>
    <p class="pp-sub">${date(d.starts_at)}${d.ends_at && date(d.ends_at) !== date(d.starts_at) ? ' to ' + date(d.ends_at) : ''}${d.venue ? ' · ' + e(d.venue) : ''}</p>
    <div class="pp-total ${due <= 0.5 ? 'paid' : ''}"><small>${due <= 0.5 ? 'FULLY PAID. THANK YOU' : 'BALANCE DUE'}</small><strong>${due <= 0.5 ? money(total, cur) : money(due, cur)}</strong>${due > 0.5 ? `<span>of ${money(total, cur)} · paid ${money(paid, cur)}</span>` : ''}</div>
    <div class="pp-sched">${sched}</div>
    ${due > 0.5 ? `<h2>How to pay</h2>${payBlocks || '<p>Please contact us for payment details.</p>'}<p class="pp-note">Use <b>${e(d.reference)}</b> as the payment reference, then send us the confirmation so we can issue your receipt.</p>` : ''}
    <h2>Items</h2><table class="pp-table"><tbody>${d.lines.map(l => `<tr><td>${e(l.description)}</td><td class="r">${money(l.line_total, cur)}</td></tr>`).join('')}<tr class="t"><td>Total</td><td class="r">${money(total, cur)}</td></tr></tbody></table>
    ${d.payments.length ? `<h2>Payments received</h2><table class="pp-table"><tbody>${d.payments.map(p => `<tr><td>${e(p.receipt)}<small>${date(p.paid_at)} · ${e(METHOD[p.method] || p.method)}</small></td><td class="r">${money(p.amount, cur)}</td></tr>`).join('')}</tbody></table>` : ''}
    ${d.files_link ? `<a class="pp-btn" href="${e(d.files_link)}" target="_blank" rel="noopener">Download your files</a>` : ''}
    <button class="pp-btn ghost" onclick="window.print()">Save / print this page</button>
  </div>${foot(d.company)}`;
}

function quotePage(d) {
  const cur = d.currency, total = d.lines.reduce((s, l) => s + Number(l.line_total), 0);
  root.innerHTML = `${head(d.company, 'QUOTATION')}<div class="pp-card">
    <p class="pp-eyebrow">${e(d.reference)} · ${e(d.client)}</p><h1>Your quotation</h1>
    <p class="pp-sub">Issued ${date(d.issued_on)}${d.valid_until ? ' · valid until ' + date(d.valid_until) : ''}${d.status === 'accepted' ? ' · accepted' : ''}</p>
    <table class="pp-table"><thead><tr><th>Item</th><th class="r">Qty × days</th><th class="r">Amount</th></tr></thead><tbody>${d.lines.map(l => `<tr><td>${e(l.description)}${l.details ? `<small class="pp-details">${e(l.details)}</small>` : ''}</td><td class="r">${Number(l.quantity)} × ${Number(l.days)}</td><td class="r">${money(l.line_total, cur)}</td></tr>`).join('')}<tr class="t"><td colspan="2">Total</td><td class="r">${money(total, cur)}</td></tr></tbody></table>
    ${d.inclusions ? `<h2>Included</h2><p>${e(d.inclusions).replace(/\n/g, '<br>')}</p>` : ''}${d.exclusions ? `<h2>Not included</h2><p>${e(d.exclusions).replace(/\n/g, '<br>')}</p>` : ''}
    <div id="accept"><p class="pp-note">Loading…</p></div>
    <button class="pp-btn ghost" onclick="window.print()">Save / print this page</button>
  </div>${foot(d.company)}`;
}

function crewPage(d, client) {
  const cats = { livestream: 'Livestream', sound: 'Sound', backup: 'Backup', delivery: 'Delivery', display: 'Screens' };
  root.innerHTML = `${head({ name: d.company }, 'CALL SHEET')}<div class="pp-card">
    <p class="pp-eyebrow">${e(d.reference)}</p><h1>${e(d.title)}</h1><p class="pp-sub">Hello ${e(d.name)}. You are booked as <b>${e(d.role)}</b>.</p>
    <div class="pp-total"><small>YOUR CALL TIME</small><strong>${dt(d.call_time || d.starts_at)}</strong><span>Event: ${dt(d.starts_at)} to ${dt(d.ends_at)}</span></div>
    <table class="pp-table"><tbody>
      <tr><td>Venue</td><td class="r">${e(d.venue || 'To be confirmed')}</td></tr>
      ${d.venue_contact_name || d.venue_contact_phone ? `<tr><td>On-site contact</td><td class="r">${e(d.venue_contact_name || '')} ${d.venue_contact_phone ? `<a href="tel:${e(d.venue_contact_phone)}">${e(d.venue_contact_phone)}</a>` : ''}</td></tr>` : ''}
    </tbody></table>
    ${d.instructions ? `<h2>Your instructions</h2><p>${e(d.instructions).replace(/\n/g, '<br>')}</p>` : ''}${d.brief ? `<h2>Brief</h2><p>${e(d.brief).replace(/\n/g, '<br>')}</p>` : ''}
    <h2>Team</h2><p>${d.team.map(t => `<b>${e(t.name)}</b> (${e(t.role)})`).join(' · ')}</p>
    ${d.checklist.length ? `<h2>Checklist</h2>${d.checklist.map(k => `<p class="pp-check ${k.done ? 'done' : ''}">${k.done ? '✓' : '○'} ${e(cats[k.category] || k.category)}: ${e(k.label)}</p>`).join('')}` : ''}
    <div id="resp">${d.availability === 'pending' ? `<h2>Can you make it?</h2><div class="pp-two"><button class="pp-btn" data-a="confirmed">Yes, I will be there</button><button class="pp-btn ghost" data-a="declined">I can't make it</button></div>` : `<p class="pp-note">Your answer: <b>${d.availability === 'confirmed' ? 'Confirmed' : 'Declined'}</b>. Thank you.</p>`}</div>
  </div>${foot({ name: d.company })}`;
  root.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    const { error } = await client.rpc('crew_respond', { p_token: token, p_answer: b.dataset.a });
    document.getElementById('resp').innerHTML = error ? '<p class="pp-note">Could not send. Please call the office.</p>' : '<p class="pp-note">Thank you. Your answer was sent.</p>';
  }));
}

// Accept a quote online: the client types their name, Tony gets a notification and books it.
async function acceptBox(d, client) {
  const box = document.getElementById('accept'); if (!box) return;
  const wa = `https://wa.me/${String(d.company?.phone || '').replace(/\D/g, '').replace(/^0/, '256')}?text=${encodeURIComponent('Hello, I have a question about quotation ' + d.reference)}`;
  const done = (name, at) => { box.innerHTML = `<p class="pp-note">Accepted by <b>${e(name || d.client)}</b>${at ? ' on ' + date(at) : ''}. Thank you. We will confirm your booking and send your invoice.</p><a class="pp-btn ghost" href="${wa}">Message us on WhatsApp</a>`; };
  if (d.status === 'accepted') return done(null, null);
  const { data: st } = await client.rpc('quote_accept', { p_token: token, p_name: null });
  if (st?.accepted_at) return done(st.name, st.accepted_at);
  box.innerHTML = `<h2>Ready to book?</h2><form id="acc" style="display:flex;flex-direction:column;gap:10px"><label style="display:flex;flex-direction:column;gap:6px">Your full name<input name="name" required minlength="2" maxlength="120" style="padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit;font:inherit"></label><button class="pp-btn" type="submit">Accept this quotation</button></form><a class="pp-btn ghost" href="${wa}">Ask a question on WhatsApp</a>`;
  box.querySelector('#acc').addEventListener('submit', async ev => {
    ev.preventDefault(); const b = ev.target.querySelector('button'); b.disabled = true; b.textContent = 'Sending…';
    const { data: r, error } = await client.rpc('quote_accept', { p_token: token, p_name: ev.target.name.value.trim() });
    if (error || !r?.ok) { b.disabled = false; b.textContent = 'Accept this quotation'; alert('Could not send. Please try again or message us on WhatsApp.'); return; }
    done(r.name, r.accepted_at);
  });
}

(async () => {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return invalid('Please use the link we sent you.');
  try {
    const client = await getClient();
    if (document.body.dataset.kind === 'crew') {
      const { data, error } = await client.rpc('crew_call_page', { p_token: token });
      if (error || !data) return invalid('Please ask the office to send you a new link.');
      crewPage(data, client);
    } else {
      const { data, error } = await client.rpc('client_portal', { p_token: token });
      if (error || !data) return invalid('This document is not available or the link has changed. Please contact us.');
      if (data.kind === 'quote') { quotePage(data); acceptBox(data, client); } else invoicePage(data);
    }
  } catch { invalid('We could not load this page. Please check your connection and try again.'); }
})();
