// Settings (owner only): company details that print on quotes, invoices and receipts, plus the team and their roles.
import { listRows } from '../data.js';
import { withTimeout } from '../utils.js';
import { ROLES } from '../roles.js';
import { e, field, setBusy } from './records.js';
import { loadCompany } from '../refs.js';

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
     <section class="panel"><div class="panel-heading"><h2>Team and access</h2><span class="subtle-label">${team.filter(t => t.active).length} active</span></div>
      ${team.length ? `<div class="table-wrap flat"><table class="data-table"><thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Status</th></tr></thead><tbody>${team.map(t => `<tr><td><strong>${e(t.p.display_name || 'No profile name')}</strong></td><td>${e(t.p.phone || '-')}</td><td>${e(ROLES[t.role] || t.role)}</td><td><em class="${t.active ? 'status' : 'overdue'}">${t.active ? 'Active' : 'Switched off'}</em></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small-note calm">No team members found.</p>'}
      <p class="muted small-note">What each role sees: <b>Owner</b> everything, including prices and settings. <b>Director</b> money and operations, no settings. <b>Production lead</b> jobs, crew, equipment and delivery, never money.<br>To add or remove a person, ask NEXT support. Access is changed on the server so nobody can give themselves more rights from the app.</p></section>`;
    const form = host.querySelector('[data-company]');
    form.addEventListener('submit', async ev => {
      ev.preventDefault(); setBusy(form, true);
      const f = Object.fromEntries(new FormData(form));
      for (const k of Object.keys(f)) f[k] = String(f[k]).trim() || null;
      try {
        const { error: err } = await withTimeout(client.from('settings').upsert({ id: true, ...f, updated_at: new Date().toISOString() }, { onConflict: 'id' }));
        if (err) throw new Error(err.message);
        await loadCompany(client);
        notify('Company details saved. New documents will use them.');
      } catch (err) { notify(err.message); } finally { setBusy(form, false); }
    });
  } catch (err) { host.innerHTML = `<div class="error-panel"><strong>Settings could not be loaded.</strong><p>${e(err.message)}</p></div>`; }
}
