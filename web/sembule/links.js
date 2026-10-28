// Link-in-bio page for Instagram, TikTok and WhatsApp status: one link to everything a new client needs.
import { getClient } from './db.js';

const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = document.getElementById('page');
const page = p => new URL(`./${p}`, location.href).href;

function render(co = {}) {
  const phone = String(co.phone || '').replace(/\D/g, '').replace(/^0/, '256');
  const site = co.website ? (/^https?:/.test(co.website) ? co.website : `https://${co.website}`) : '';
  const links = [
    [page('packages.html'), 'See our packages and book', true],
    [page('packages.html?g=livestream'), 'Livestream your event'],
    [page('packages.html?g=sound'), 'Sound and DJ'],
    [page('packages.html?g=photo'), 'Photo and video'],
    [page('enquiry.html'), 'Ask us a question'],
    phone ? [`https://wa.me/${phone}?text=${encodeURIComponent('Hello Sembule Media, I would like to book you for an event.')}`, 'Chat on WhatsApp'] : null,
    site ? [site, 'Visit our website'] : null
  ].filter(Boolean);
  root.innerHTML = `<div class="lk"><img class="lk-logo" src="./assets/brand/logo-white.png" alt="${e(co.name || 'Sembule Media')}"><p class="lk-tag">THE GIANTS OF MULTIMEDIA</p>
    <p class="lk-sub">Screens, LED walls, sound, livestream, photo and video for events across Uganda.</p>
    <div class="lk-list">${links.map(([href, label, main]) => `<a class="lk-a${main ? ' main' : ''}" href="${e(href)}"${href.startsWith('http') && !href.startsWith(location.origin) ? ' target="_blank" rel="noopener"' : ''}>${e(label)}</a>`).join('')}</div>
    <p class="lk-foot">${[co.phone, co.email].filter(Boolean).map(e).join(' · ')}</p></div>`;
}

(async () => {
  render();
  try { const c = await getClient(); const { data } = await c.rpc('packages_page'); if (data?.company) render(data.company); } catch { /* links still work without the company details */ }
})();
