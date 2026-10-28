// Public packages page: the client picks packages, sees what each includes, and books. Lands in Pipeline.
// ?g=photo (photo and video), ?g=livestream, ?g=sound, ?g=screens limit the page to one kind of work.
import { getClient } from './db.js';

const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => `UGX ${Number(n || 0).toLocaleString('en-GB')}`;
const root = document.getElementById('page');
const GROUPS = [
  ['livestream', 'Livestream', c => c.startsWith('ls_') || c === 'remote_speaker' || c === 'backup_internet'],
  ['sound', 'Sound and DJ', c => /^(pa_|dj_)/.test(c) || ['concert_pa', 'conference_pa', 'led_light', 'extra_mic', 'sound_hire'].includes(c)],
  ['photo', 'Photo and video', c => ['photography', 'videography', 'highlight_edit', 'event_film', 'social_clips', 'documentary', 'podcast', 'extra_camera'].includes(c)],
  ['screens', 'Screens', c => c === 'tv_display' || c.startsWith('led_screen') || c.startsWith('screen')],
  ['extras', 'Extras', () => true]
];
const groupOf = code => GROUPS.find(g => g[2](code))[0];
const SERVICE_FOR = { livestream: 'livestream', sound: 'sound_pa', photo: 'photography', screens: 'tv_65', extras: 'other' };
const only = new URLSearchParams(location.search).get('g');
const picked = new Set();
let data = null, client = null, tab = only && GROUPS.some(g => g[0] === only) ? only : 'all';

function card(s) {
  const on = picked.has(s.code);
  return `<button type="button" class="pk ${on ? 'on' : ''}" data-code="${e(s.code)}"><span class="pk-tick">${on ? '✓' : '+'}</span>
    <span class="pk-main"><b>${e(s.name)}</b>${s.notes ? `<small>${e(s.notes)}</small>` : ''}</span>
    <span class="pk-price">${s.price ? `${money(s.price)}<em>per ${e(s.unit)}</em>` : '<em>Price on request</em>'}</span></button>`;
}

function render() {
  const list = data.services.filter(s => tab === 'all' || groupOf(s.code) === tab);
  const chosen = data.services.filter(s => picked.has(s.code));
  const allPriced = chosen.length && chosen.every(s => s.price);
  const total = chosen.reduce((t, s) => t + Number(s.price || 0), 0);
  const tabs = only ? '' : `<div class="pk-tabs">${[['all', 'All'], ...GROUPS.map(g => [g[0], g[1]])].filter(([k]) => k === 'all' || data.services.some(s => groupOf(s.code) === k)).map(([k, l]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-tab="${k}">${e(l)}</button>`).join('')}</div>`;
  root.innerHTML = `<header class="pp-head"><img src="./assets/brand/logo-white.png" alt="${e(data.company?.name || 'Sembule Media')}"><span>PACKAGES</span></header>
   <div class="pp-card"><p class="pp-eyebrow">THE GIANTS OF MULTIMEDIA</p><h1>${only === 'photo' ? 'Photo and video for your event' : only === 'livestream' ? 'Livestream your event' : only === 'sound' ? 'Sound and DJ for your event' : 'Choose what your event needs'}</h1>
    <p class="pp-sub">Tap the packages you want. We confirm availability and send you a full quotation, usually the same day.</p>
    ${tabs}<div class="pk-list">${list.map(card).join('') || '<p class="pp-note">Nothing listed here yet. Message us on WhatsApp.</p>'}</div>
    <form id="req" class="hub-form pk-form" ${chosen.length ? '' : 'hidden'}>
      <h2>Your selection</h2>
      <p>${chosen.map(s => e(s.name)).join(' · ')}</p>
      ${allPriced ? `<p class="pp-note">Starting from <b>${money(total)}</b> for one day. Your quotation confirms the final price.</p>` : '<p class="pp-note">Your quotation will show the full price.</p>'}
      <label>Your full name<input name="name" required minlength="2" maxlength="200" autocomplete="name"></label>
      <label>Phone / WhatsApp<input name="phone" required type="tel" autocomplete="tel" placeholder="07..."></label>
      <label>Email (optional)<input name="email" type="email" autocomplete="email"></label>
      <label>Event date<input name="date" type="date" required></label>
      <label>Venue and area<input name="venue" maxlength="200"></label>
      <label>Anything else we should know?<textarea name="message" rows="3" maxlength="2000"></textarea></label>
      <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <button class="pp-btn" type="submit">Send my request</button>
    </form>
    ${chosen.length ? '' : '<p class="pp-note">Select at least one package to continue.</p>'}
   </div><footer class="pp-foot">${[data.company?.name, data.company?.phone, data.company?.email, data.company?.website].filter(Boolean).map(e).join(' · ')}</footer>`;
  root.querySelectorAll('[data-code]').forEach(b => b.addEventListener('click', () => { picked.has(b.dataset.code) ? picked.delete(b.dataset.code) : picked.add(b.dataset.code); const y = window.scrollY; render(); window.scrollTo(0, y); }));
  root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  root.querySelector('#req')?.addEventListener('submit', submit);
}

async function submit(ev) {
  ev.preventDefault(); const f = ev.target, fd = new FormData(f), b = f.querySelector('button[type=submit]');
  const chosen = data.services.filter(s => picked.has(s.code));
  const counts = {}; chosen.forEach(s => { const g = groupOf(s.code); counts[g] = (counts[g] || 0) + 1; });
  const main = Object.keys(counts).sort((a, c) => counts[c] - counts[a])[0] || 'extras';
  const msg = [`Packages chosen on the packages page: ${chosen.map(s => s.name).join('; ')}`,
    chosen.every(s => s.price) ? `Listed prices total: ${money(chosen.reduce((t, s) => t + Number(s.price), 0))} (one day)` : '',
    fd.get('venue') ? `Venue: ${fd.get('venue')}` : '', fd.get('message') ? `Client note: ${fd.get('message')}` : ''].filter(Boolean).join('\n');
  b.disabled = true; b.textContent = 'Sending…';
  try {
    const { data: r, error } = await client.rpc('submit_enquiry', { p_name: String(fd.get('name')).trim(), p_phone: String(fd.get('phone')).trim(), p_email: String(fd.get('email') || '').trim(), p_service: SERVICE_FOR[main], p_event_date: fd.get('date') || null, p_message: msg, p_honeypot: String(fd.get('website') || '') });
    if (error || !r?.ok) throw new Error(r?.error || 'Could not send');
    const phone = String(data.company?.phone || '').replace(/\D/g, '').replace(/^0/, '256');
    root.querySelector('.pp-card').innerHTML = `<p class="pp-eyebrow">REQUEST SENT</p><h1>Thank you, ${e(String(fd.get('name')).split(' ')[0])}</h1><p>We have your request and will confirm availability for ${e(fd.get('date'))} with a full quotation, usually the same day.</p>${phone ? `<a class="pp-btn" href="https://wa.me/${phone}?text=${encodeURIComponent('Hello, I just sent a package request for ' + fd.get('date') + '.')}">Chat with us on WhatsApp</a>` : ''}`;
    window.scrollTo(0, 0);
  } catch (err) { b.disabled = false; b.textContent = 'Send my request'; alert(err.message === 'Could not send' ? 'Could not send. Please check your phone number and try again, or message us on WhatsApp.' : err.message); }
}

(async () => {
  try {
    client = await getClient();
    const { data: d, error } = await client.rpc('packages_page');
    if (error || !d) throw new Error();
    data = d; render();
  } catch { root.innerHTML = '<div class="pp-card"><h1>Packages are not available right now</h1><p>Please message us on WhatsApp or try again shortly.</p></div>'; }
})();
