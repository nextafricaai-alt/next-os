// Calendar: jobs and date holds by month, so Tony sees clashes before he says yes.
import { listRows } from '../data.js';
import { e } from './records.js';
import { openJob } from './jobs.js';

let cursor = new Date(); cursor.setDate(1);
const key = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date(d));
const days = (a, b) => { const out = []; for (let d = new Date(key(a)); d <= new Date(key(b)); d.setDate(d.getDate() + 1)) out.push(d.toISOString().slice(0, 10)); return out; };

async function draw(context) {
  const { client, host } = context;
  host.innerHTML = '<div class="module-loading">Loading calendar…</div>';
  try {
    const [jobs, holds] = await Promise.all([listRows(client, 'jobs', 'starts_at', true), listRows(client, 'date_holds', 'starts_at', true)]);
    const map = {};
    const add = (d, item) => { (map[d] = map[d] || []).push(item); };
    jobs.filter(j => !j.archived_at).forEach(j => days(j.starts_at, j.ends_at).forEach(d => add(d, { kind: 'job', id: j.id, label: j.title, stage: j.stage })));
    holds.filter(h => h.status === 'held').forEach(h => days(h.starts_at, h.ends_at || h.starts_at).forEach(d => add(d, { kind: 'hold', label: `Hold: ${h.contact_name}` })));
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1), start = (first.getDay() + 6) % 7, count = new Date(y, m + 1, 0).getDate();
    const today = key(new Date());
    const cells = [];
    for (let i = 0; i < start; i++) cells.push('<div class="cal-cell empty"></div>');
    for (let d = 1; d <= count; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, items = map[iso] || [];
      const busy = items.filter(i => i.kind === 'job').length > 1;
      cells.push(`<div class="cal-cell${iso === today ? ' today' : ''}${busy ? ' busy' : ''}"><span class="cal-day">${d}</span>${items.map(i => i.kind === 'job' ? `<button class="cal-item job" data-job="${i.id}" title="${e(i.label)}">${e(i.label)}</button>` : `<span class="cal-item hold">${e(i.label)}</span>`).join('')}${busy ? '<em class="cal-warn">2+ jobs</em>' : ''}</div>`);
    }
    const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(first);
    const upcoming = jobs.filter(j => new Date(j.ends_at) >= new Date() && !j.archived_at).slice(0, 6);
    host.innerHTML = `<div class="module-toolbar"><div><strong>${monthName}</strong><span>Jobs in green, date holds in gold. Days with two or more jobs are marked.</span></div><div><button class="button secondary" data-prev>‹ Previous</button><button class="button secondary" data-today>Today</button><button class="button secondary" data-next>Next ›</button></div></div>
     <div class="cal-wrap"><div class="cal-grid">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-head">${d}</div>`).join('')}${cells.join('')}</div></div>
     <div class="cal-list"><h3>Coming up</h3>${upcoming.length ? upcoming.map(j => `<button class="record-card" data-job="${j.id}"><span><strong>${e(j.title)}</strong><small>${new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' }).format(new Date(j.starts_at))}${j.venue ? ' · ' + e(j.venue) : ''}</small></span><span><em class="status">${e(j.stage)}</em></span></button>`).join('') : '<p class="muted small-note">Nothing booked yet.</p>'}</div>`;
    host.querySelector('[data-prev]').onclick = () => { cursor.setMonth(cursor.getMonth() - 1); draw(context); };
    host.querySelector('[data-next]').onclick = () => { cursor.setMonth(cursor.getMonth() + 1); draw(context); };
    host.querySelector('[data-today]').onclick = () => { cursor = new Date(); cursor.setDate(1); draw(context); };
    host.querySelectorAll('[data-job]').forEach(b => b.addEventListener('click', () => { openJob(b.dataset.job); location.hash = '#jobs'; }));
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>The calendar could not be loaded.</strong><p>${e(err.message)}</p></div>`; }
}
export async function mountCalendar(context) { await draw(context); }
