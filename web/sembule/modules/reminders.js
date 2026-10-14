// Reminders: everything that needs a nudge today, each with a one-tap WhatsApp message. Payment items only for owner and director.
import { listRows } from '../data.js';
import { withTimeout } from '../utils.js';
import { canViewMoney } from '../roles.js';
import { CONFIG } from '../config.js';
import { e, empty } from './records.js';
import { money, readable, whatsappTo, shareLink } from '../refs.js';

const DAY = 864e5;
const hm = iso => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' }).format(new Date(iso));
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date());

export async function mountReminders(context) {
  const { client, identity, host } = context;
  host.innerHTML = '<div class="module-loading">Checking what needs a nudge…</div>';
  try {
    const m = canViewMoney(identity.role);
    const view = async n => { const { data, error } = await withTimeout(client.from(n).select('*')); if (error) throw new Error(error.message); return data || []; };
    const [jobs, clients, crew, jobCrew, checkouts, equipment, invoices, balances] = await Promise.all([listRows(client, 'jobs', 'starts_at', true), listRows(client, 'clients'), listRows(client, 'crew'), listRows(client, 'job_crew', 'starts_at', true), listRows(client, 'checkouts', 'due_back_at', true), listRows(client, 'equipment'),
      m ? listRows(client, 'invoices') : [], m ? view('invoice_balances') : []]);
    const now = Date.now(), tk = todayKey(), cl = id => clients.find(c => c.id === id) || {}, nm = c => c.organisation || c.name || 'Client';
    const items = { pay: [], crew: [], gear: [], client: [] };

    // Payments due within 3 days or overdue
    invoices.filter(i => i.status === 'issued').forEach(i => {
      const b = balances.find(x => x.invoice_id === i.id) || {}, paid = Number(b.received || 0) + Number(b.wht_withheld || 0);
      const steps = [[b.booking_amount, i.booking_due_on, 'booking payment'], [Number(b.booking_amount) + Number(b.preproduction_amount), i.preproduction_due_on, 'pre-production payment'], [b.invoice_total, i.completion_due_on, 'final payment']];
      const s = steps.find(([cum]) => paid + .5 < Number(cum)); if (!s || !s[1]) return;
      const days = Math.round((new Date(s[1]) - new Date(tk)) / DAY); if (days > 3) return;
      const c = cl(i.client_id), owe = Number(s[0]) - paid, link = shareLink('portal', i.portal_token);
      items.pay.push({ tone: days < 0 ? 'red' : 'amber', title: `${nm(c)} · ${i.reference}`, sub: `${money(owe, i.currency)} ${s[2]} ${days < 0 ? `was due ${readable(s[1])} (${-days} day${days === -1 ? '' : 's'} late)` : days === 0 ? 'is due today' : `is due ${readable(s[1])}`}`,
        phone: c.phone, msg: `Hello ${c.name || ''}, a gentle reminder from ${CONFIG.name}: the ${s[2]} of ${money(owe, i.currency)} on invoice ${i.reference} ${days < 0 ? 'is now due' : 'is due ' + readable(s[1])}. You can see how to pay here: ${link}\nThank you.` });
    });

    // Crew: jobs in the next 2 days, remind each person with their call page
    jobs.filter(j => !j.archived_at && new Date(j.starts_at) > now && new Date(j.starts_at) < now + 2 * DAY).forEach(j => {
      jobCrew.filter(r => r.job_id === j.id).forEach(r => {
        const c = crew.find(x => x.id === r.crew_id) || {};
        items.crew.push({ tone: r.availability === 'confirmed' ? 'ok' : 'amber', title: `${c.name || 'Crew'} · ${j.title}`, sub: `${r.role} · call ${hm(r.call_time || j.starts_at)} on ${readable(r.call_time || j.starts_at)} · ${r.availability}`, phone: c.phone,
          msg: `Hello ${c.name || ''}, reminder: ${j.title} on ${readable(j.starts_at)}. Your call time is ${hm(r.call_time || j.starts_at)}${j.venue ? ' at ' + j.venue : ''}. Full details and confirmation: ${shareLink('call', r.share_token)}` });
      });
    });

    // Gear due back today or late
    checkouts.filter(c => !c.returned_at && new Date(c.due_back_at) < now + DAY).forEach(c => {
      const eq = equipment.find(x => x.id === c.equipment_id) || {}, p = crew.find(x => x.id === c.custodian_crew_id) || {}, late = new Date(c.due_back_at) < now;
      items.gear.push({ tone: late ? 'red' : 'amber', title: `${eq.name || 'Item'} · ${c.custodian_name}`, sub: `${late ? 'Was due back' : 'Due back'} ${readable(c.due_back_at)} ${hm(c.due_back_at)}`, phone: p.phone,
        msg: `Hello ${c.custodian_name}, please return ${eq.name || 'the equipment'} to ${CONFIG.name} ${late ? 'as soon as you can' : 'by ' + hm(c.due_back_at) + ' today'}. Thank you.` });
    });

    // Clients: events in the next 2 days
    jobs.filter(j => !j.archived_at && new Date(j.starts_at) > now && new Date(j.starts_at) < now + 2 * DAY).forEach(j => {
      const c = cl(j.client_id);
      items.client.push({ tone: 'ok', title: `${nm(c)} · ${j.title}`, sub: `${readable(j.starts_at)} ${hm(j.starts_at)}${j.venue ? ' · ' + j.venue : ''}`, phone: c.phone,
        msg: `Hello ${c.name || ''}, a reminder from ${CONFIG.name}: we will be at ${j.venue || 'your event'} on ${readable(j.starts_at)}, setup from ${hm(j.starts_at)}. Please make sure power and access are ready. See you there!` });
    });

    const card = (x, i, g) => `<div class="remind ${x.tone}"><div><strong>${e(x.title)}</strong><small>${e(x.sub)}</small></div><button class="button secondary" data-g="${g}" data-i="${i}" ${x.phone ? '' : 'disabled title="No phone number saved"'}>WhatsApp</button></div>`;
    const sec = (title, g, list, none) => `<section class="panel"><div class="panel-heading"><h2>${title}</h2><span class="subtle-label">${list.length}</span></div><div class="remind-list">${list.length ? list.map((x, i) => card(x, i, g)).join('') : `<p class="muted small-note calm">${none}</p>`}</div></section>`;
    host.innerHTML = `<div class="module-toolbar"><div><strong>${Object.values(items).reduce((s, a) => s + a.length, 0)} reminders ready</strong><span>Tap WhatsApp to open the message, then press send. Nothing is sent automatically.</span></div></div>
      ${m ? sec('Payments due or late', 'pay', items.pay, 'No payments due in the next 3 days.') : ''}${sec('Crew for the next 2 days', 'crew', items.crew, 'No crew bookings in the next 2 days.')}${sec('Gear to bring back', 'gear', items.gear, 'No gear due back.')}${sec('Clients with an event soon', 'client', items.client, 'No events in the next 2 days.')}`;
    host.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { const x = items[b.dataset.g][Number(b.dataset.i)]; whatsappTo(x.phone, x.msg); }));
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>Reminders could not be loaded.</strong><p>${e(err.message)}</p></div>`; }
}
