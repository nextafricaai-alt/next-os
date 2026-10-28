// Settings (owner only): company details that print on quotes, invoices and receipts, plus the team and their roles.
import { listRows } from '../data.js';
import { withTimeout } from '../utils.js';
import { ROLES } from '../roles.js';
import { e, field, setBusy } from './records.js';
import { loadCompany } from '../refs.js';

const SUGGESTED_TERMS = `1. Booking. Your date is reserved once we receive the booking payment shown on your invoice (40% of the total). Until then the date stays open to other clients.
2. Payments. The second payment (40%) is due before the event and the final 20% on completion, as shown on your invoice. Equipment and crew are released only once the event-day payments are complete.
3. Changes. Extra hours, equipment or services requested on the day are added to your invoice at our standard rates. Overtime is charged at [amount] per hour after the agreed finish time.
4. Cancellation. If you cancel more than [number] days before the event, the booking payment is [refunded / kept]. Within [number] days of the event, [percentage] of the total is due.
5. Venue and power. You arrange access to the venue for setup, a safe space for our equipment and, unless agreed otherwise, stable power. Delays caused by the venue are not our responsibility.
6. Care of equipment. Our equipment is operated by our team only. Damage caused by guests or the venue is charged at repair or replacement cost.
7. Photos and videos. You choose on your brief whether we may share highlights publicly. We keep raw files for [number] months after delivery.
8. Weather and events outside our control. If an event cannot go ahead for reasons outside both parties' control, we will agree a new date or a fair refund of work not yet done.`;

export async function mountSettings(context) {
  const { client, host, notify } = context;
  host.innerHTML = '<div class="module-loading">Loading settings…</div>';
  try {
    const [{ data: s, error }, profiles, roles] = await Promise.all([withTimeout(client.from('settings').select('*').maybeSingle()), listRows(client, 'profiles', 'display_name', true), listRows(client, 'user_roles', 'created_at', true)]);
    if (error) throw new Error(error.message);
    const row = s || {};
    const team = roles.map(r => ({ ...r, p: profiles.find(p => p.id === r.user_id) || {} }));
    host.innerHTML = `<section class="panel"><div class="panel-heading"><h2>Company details</h2><span class="subtle-label">These print on every quote, invoice and receipt</span></div>
      <form class="form-grid" data-company>
        ${field('company_name', 'Registered company name', row.company_name || 'Sembule Media Ltd', { required: true })}
        ${field('trading_name', 'Trading name', row.trading_name || 'Sembule Media', { required: true })}
        ${field('phone', 'Phone', row.phone || '', { type: 'tel' })}
        ${field('email', 'Email', row.email || '', { type: 'email' })}
        ${field('address', 'Office address', row.address || '')}
        ${field('website', 'Website', row.website || 'sembulemedia.com', { required: true })}
        ${field('tin', 'TIN (URA)', row.tin || '')}
        ${field('registration_no', 'Company registration number', row.registration_no || '')}
        <div class="form-actions span-2"><button class="button primary" type="submit">Save company details</button></div>
      </form></section>
     <section class="panel"><div class="panel-heading"><h2>Booking terms</h2><span class="subtle-label">Clients read and sign these on their project page</span></div>
      <form class="form-grid" data-terms><label class="span-2">Terms the client agrees to<textarea name="booking_terms" rows="14" placeholder="Leave empty to hide the terms step from clients.">${e(row.booking_terms || '')}</textarea></label>
       <p class="muted small-note span-2">Anything in [square brackets] must be filled in before you can save. Changing the terms later does not change what earlier clients signed; their copy is kept on the project.</p>
       <div class="form-actions span-2"><button class="button primary" type="submit">Save booking terms</button>${row.booking_terms ? '' : '<button class="button secondary" type="button" data-suggest>Start from suggested terms</button>'}</div></form></section>
     <section class="panel"><div class="panel-heading"><h2>Team and access</h2><span class="subtle-label">${team.filter(t => t.active).length} active</span></div>
      ${team.length ? `<div class="table-wrap flat"><table class="data-table"><thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Status</th></tr></thead><tbody>${team.map(t => `<tr><td><strong>${e(t.p.display_name || 'No profile name')}</strong></td><td>${e(t.p.phone || '-')}</td><td>${e(ROLES[t.role] || t.role)}</td><td><em class="${t.active ? 'status' : 'overdue'}">${t.active ? 'Active' : 'Switched off'}</em></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small-note calm">No team members found.</p>'}
      <p class="muted small-note">What each role sees: <b>Owner</b> everything, including prices and settings. <b>Director</b> money and operations, no settings. <b>Production lead</b> jobs, crew, equipment and delivery, never money.<br>To add or remove a person, ask NEXT support. Access is changed on the server so nobody can give themselves more rights from the app.</p></section>`;
    const form = host.querySelector('[data-company]');
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(form)); setBusy(form, true);
      for (const k of Object.keys(f)) f[k] = String(f[k]).trim() || null;
      try {
        const { error: err } = await withTimeout(client.from('settings').upsert({ id: true, ...f, updated_at: new Date().toISOString() }, { onConflict: 'id' }));
        if (err) throw new Error(err.message);
        await loadCompany(client);
        notify('Company details saved. New documents will use them.');
      } catch (err) { notify(err.message); } finally { setBusy(form, false); }
    });
    const tf = host.querySelector('[data-terms]');
    tf.querySelector('[data-suggest]')?.addEventListener('click', () => { tf.booking_terms.value = SUGGESTED_TERMS; tf.booking_terms.focus(); });
    tf.addEventListener('submit', async ev => {
      ev.preventDefault(); const t = tf.booking_terms.value.trim();
      if (/\[[^\]]*\]/.test(t)) { notify('Fill in everything in [square brackets] before saving. Clients will see these terms.'); return; }
      setBusy(tf, true);
      try { const { error: err } = await withTimeout(client.from('settings').upsert({ id: true, booking_terms: t || null, updated_at: new Date().toISOString() }, { onConflict: 'id' })); if (err) throw new Error(err.message); notify(t ? 'Booking terms saved. Clients will see them on their project page.' : 'Booking terms removed.'); }
      catch (err) { notify(err.message); } finally { setBusy(tf, false); }
    });
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>Settings could not be loaded.</strong><p>${e(err.message)}</p></div>`; }
}
