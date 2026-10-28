// Notification bell: every client action (page opened, quote accepted, terms signed, brief sent, review, crew answer, website enquiry).
import { withTimeout } from '../utils.js';
import { e } from './records.js';
import { openJob } from './jobs.js';

const ICON = { opened: '👀', quote_accepted: '✅', terms: '✍️', brief: '📝', review: '⭐', crew: '👥', enquiry: '📩' };
let timer = null, items = [], docBound = false;
const ago = d => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Kampala' }).format(new Date(d)); };

async function load(db) {
  try { const { data, error } = await withTimeout(db.from('notifications').select('*').order('created_at', { ascending: false }).limit(40)); if (!error) items = data || []; } catch { /* keep the last list */ }
}
function paint() {
  const btn = document.getElementById('bell'); if (!btn) return;
  const unread = items.filter(n => !n.read_at).length, badge = btn.querySelector('.bell-n');
  badge.textContent = unread > 9 ? '9+' : String(unread); badge.hidden = !unread;
  const panel = document.getElementById('bell-panel'); if (!panel || panel.hidden) return;
  panel.innerHTML = `<div class="bell-head"><strong>Notifications</strong>${unread ? '<button type="button" class="text-button" data-allread>Mark all read</button>' : ''}</div>
   ${items.length ? items.map(n => `<button type="button" class="bell-item${n.read_at ? '' : ' unread'}" data-n="${n.id}"><span>${ICON[n.kind] || '•'}</span><span><b>${e(n.title)}</b>${n.body ? `<small>${e(n.body)}</small>` : ''}<em>${ago(n.created_at)}</em></span></button>`).join('') : '<p class="muted small-note" style="padding:14px">Nothing yet. When a client opens their page, accepts a quote, signs the terms or sends their brief, it shows here.</p>'}`;
}
async function markRead(db, ids) {
  if (!ids.length) return;
  const now = new Date().toISOString(); items = items.map(n => ids.includes(n.id) ? { ...n, read_at: now } : n); paint();
  try { await withTimeout(db.from('notifications').update({ read_at: now }).in('id', ids)); } catch { /* shown as read locally */ }
}

export async function initBell(db) {
  const btn = document.getElementById('bell'); if (!btn || !db) return;
  const panel = document.getElementById('bell-panel');
  btn.addEventListener('click', ev => { ev.stopPropagation(); panel.hidden = !panel.hidden; paint(); });
  if (!docBound) { docBound = true; document.addEventListener('click', ev => { const p = document.getElementById('bell-panel'), b = document.getElementById('bell'); if (p && !p.hidden && !p.contains(ev.target) && !b?.contains(ev.target)) p.hidden = true; }); }
  panel.addEventListener('click', ev => {
    if (ev.target.closest('[data-allread]')) { markRead(db, items.filter(n => !n.read_at).map(n => n.id)); return; }
    const row = ev.target.closest('[data-n]'); if (!row) return;
    const n = items.find(x => x.id === row.dataset.n); if (!n) return;
    markRead(db, [n.id]); panel.hidden = true;
    if (n.job_id) { openJob(n.job_id); if (location.hash === '#jobs') window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = '#jobs'; }
    else if (n.quote_id) location.hash = '#quotes';
    else if (n.lead_id) location.hash = '#leads';
  });
  await load(db); paint();
  clearInterval(timer);
  timer = setInterval(async () => { if (document.visibilityState === 'visible' && document.getElementById('bell')) { await load(db); paint(); } }, 60000);
}
