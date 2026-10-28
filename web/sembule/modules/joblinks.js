// Projects > Client links: every link for this job in one place, ready to send on WhatsApp or copy.
import { withTimeout } from '../utils.js';
import { CONFIG } from '../config.js';
import { e } from './records.js';
import { readable, whatsappTo, shareLink } from '../refs.js';

export async function loadLinks(client, job, money) {
  if (!money) return { quotes: [], invoices: [] };
  const { data: invoices, error } = await withTimeout(client.from('invoices').select('id,reference,status,portal_token,quote_id').eq('job_id', job.id).neq('status', 'void'));
  if (error) throw new Error(error.message);
  const ids = [...new Set((invoices || []).map(i => i.quote_id).filter(Boolean))];
  let quotes = [];
  if (ids.length || job.lead_id) {
    let q = client.from('quotes').select('id,reference,status,portal_token');
    q = ids.length && job.lead_id ? q.or(`id.in.(${ids.join(',')}),lead_id.eq.${job.lead_id}`) : ids.length ? q.in('id', ids) : q.eq('lead_id', job.lead_id);
    const r = await withTimeout(q); if (r.error) throw new Error(r.error.message); quotes = r.data || [];
  }
  return { quotes, invoices: invoices || [] };
}

function rows(ctx) {
  const j = ctx.job, c = ctx.clients.find(x => x.id === j.client_id) || {}, L = ctx.links || { quotes: [], invoices: [] };
  const first = (c.name || '').split(' ')[0];
  const out = [];
  out.push({ group: 'Client', title: 'Client brief', note: j.brief_status === 'submitted' ? `Filled in${j.brief_updated_at ? ' on ' + readable(j.brief_updated_at) : ''}. They can still update it.` : 'The client tells us the day, the venue, their songs and what they need.', url: j.brief_token ? shareLink('brief', j.brief_token) : null, phone: c.phone,
    msg: u => `Hello ${first}, thank you for booking ${CONFIG.name} for ${j.title}. Please fill in this short brief so we prepare exactly what you need, including your songs: ${u}` });
  L.quotes.forEach(q => out.push({ group: 'Client', title: `Quotation ${q.reference}`, note: `Status: ${q.status}. The client can read it and accept it online.`, url: q.portal_token ? shareLink('portal', q.portal_token) : null, phone: c.phone,
    msg: u => `Hello ${first}, here is your quotation ${q.reference} from ${CONFIG.name}: ${u}` }));
  L.invoices.forEach(i => out.push({ group: 'Client', title: `Invoice ${i.reference} and receipts`, note: i.status === 'draft' ? 'Still a draft. Issue it before you send it.' : 'Shows what is paid, the balance, how to pay and every receipt.', url: i.status === 'draft' ? null : (i.portal_token ? shareLink('portal', i.portal_token) : null), phone: c.phone,
    msg: u => `Hello ${first}, here is your invoice ${i.reference} from ${CONFIG.name}, with how to pay and your receipts: ${u}` }));
  ctx.crewRows.forEach(r => { const p = ctx.crew.find(x => x.id === r.crew_id) || {};
    out.push({ group: 'Team', title: `${p.name || 'Crew'} · ${r.role}`, note: r.availability === 'confirmed' ? 'Confirmed.' : r.availability === 'declined' ? 'Declined.' : 'Waiting for them to confirm.', url: r.share_token ? shareLink('call', r.share_token) : null, phone: p.phone,
      msg: u => `Hello ${p.name || ''}, your call details for ${j.title} are here. Please open and tap Yes to confirm: ${u}` }); });
  out.push({ group: 'Anyone', title: 'Enquiry form (new clients)', note: 'One link for everyone. Put it on Instagram, WhatsApp status and the website. Answers land in Pipeline.', url: new URL('./enquiry.html', location.href).href, phone: '',
    msg: u => `Hello, thank you for contacting ${CONFIG.name}. Please tell us about your event here and we will come back to you with a quotation: ${u}` });
  return out;
}

export function linksTab(ctx) {
  const list = rows(ctx), money = !!ctx.links?.money;
  const groups = ['Client', 'Team', 'Anyone'];
  return `<p class="muted small-note">Every link for this job. Tap WhatsApp to send it, or Copy to paste it anywhere.${money ? '' : ' Quote and invoice links show for the owner and director only.'}</p>
   ${groups.map(g => { const items = list.filter(x => x.group === g); if (!items.length) return g === 'Team' ? '<div class="link-group"><h3>Team</h3><p class="muted small-note">Add people on the Team tab and their call links appear here.</p></div>' : '';
     return `<div class="link-group"><h3>${g === 'Client' ? 'For the client' : g === 'Team' ? 'For the team' : 'For anyone'}</h3>${items.map((x, i) => `<div class="link-row" data-li="${e(g)}-${i}"><div><strong>${e(x.title)}</strong><small>${e(x.note)}</small></div>
      <div class="row-actions">${x.url ? `${x.phone !== undefined ? '<button type="button" class="button primary small" data-wa>WhatsApp</button>' : ''}<button type="button" class="button secondary small" data-copy>Copy</button><a class="text-button" href="${e(x.url)}" target="_blank" rel="noopener">Open</a>` : '<em class="muted">Not ready yet</em>'}</div></div>`).join('')}</div>`; }).join('')}`;
}

export function bindLinks(ctx, host, notify) {
  if (!ctx.job) return;
  const list = rows(ctx), byKey = {};
  ['Client', 'Team', 'Anyone'].forEach(g => list.filter(x => x.group === g).forEach((x, i) => { byKey[`${g}-${i}`] = x; }));
  host.querySelectorAll('[data-li]').forEach(row => {
    const x = byKey[row.dataset.li]; if (!x) return;
    row.querySelector('[data-wa]')?.addEventListener('click', () => whatsappTo(x.phone || '', x.msg(x.url)));
    row.querySelector('[data-copy]')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(x.url); notify('Link copied.'); } catch { prompt('Copy this link:', x.url); } });
  });
}
