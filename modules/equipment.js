// Equipment: register items and kits progressively, check gear out to a named person, check it back in.
import { listRows, saveRow, deleteRow } from '../data.js';
import { e, value, empty, field, selectField, textArea, setBusy } from './records.js';
import { txt, readable } from '../refs.js';
import { openJob } from './jobs.js';

const CATS = ['Cameras', 'Lenses', 'Livestream (switchers, encoders, PCs)', 'Internet (5G routers, SIMs)', 'Sound and microphones', 'Lighting and stands', 'Power (UPS, extensions, generator)', '65-inch TVs and display', 'Storage (drives, cards)', 'Cases and transport', 'Other'];
const COND = ['Good', 'Fair', 'Needs repair', 'Damaged', 'Missing parts'];
let tab = 'out', selected = null;
const localDT = iso => iso ? new Date(new Date(iso).getTime() + 3 * 3600e3).toISOString().slice(0, 16) : '';
const fromLocal = v => v ? new Date(v + ':00+03:00').toISOString() : null;
const hm = iso => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' }).format(new Date(iso));

function outTab(ctx) {
  const open = ctx.checkouts.filter(c => !c.returned_at).sort((a, b) => new Date(a.due_back_at) - new Date(b.due_back_at));
  const item = id => ctx.items.find(i => i.id === id) || {}, job = id => ctx.jobs.find(j => j.id === id) || {};
  const late = open.filter(c => new Date(c.due_back_at) < new Date()).length;
  const jobs = ctx.jobs.filter(j => !['Delivered and paid'].includes(j.stage) && new Date(j.ends_at) > new Date(Date.now() - 7 * 864e5));
  const outIds = new Set(open.map(c => c.equipment_id));
  return `<div class="module-toolbar"><div><strong>${open.length} item${open.length === 1 ? '' : 's'} out</strong><span>${late ? `${late} overdue for return` : 'Nothing overdue'}</span></div></div>
   ${open.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>With</th><th>Job</th><th>Due back</th><th></th></tr></thead><tbody>${open.map(c => { const lateRow = new Date(c.due_back_at) < new Date(); return `<tr data-co="${c.id}"><td><strong>${e(item(c.equipment_id).name || '')}</strong><small>Out: ${e(c.condition_out)}${c.accessories_out ? ' · ' + e(c.accessories_out) : ''}</small></td><td>${e(c.custodian_name)}</td><td><button class="text-button" data-job="${c.job_id}">${e(job(c.job_id).reference || '')}</button></td><td>${readable(c.due_back_at)} ${hm(c.due_back_at)}${lateRow ? '<small class="override">Overdue</small>' : ''}</td><td class="row-actions"><button class="text-button" data-return>Check in</button></td></tr>`; }).join('')}</tbody></table></div>` : empty('All equipment is in the store.')}
   <form id="out-form" class="record-form line-form"><div class="form-title span-2"><div><p class="eyebrow">CHECK OUT</p><h2>Send gear to a job</h2></div></div>
    ${selectField('job_id', 'Job', '', [['', 'Choose a job']].concat(jobs.map(j => [j.id, `${j.reference} · ${j.title}`])))}${selectField('kit_id', 'Whole kit (optional)', '', [['', 'No kit, pick items below']].concat(ctx.kits.filter(k => k.active).map(k => [k.id, k.name])))}
    ${selectField('custodian', 'Responsible person', '', [['', 'Choose who carries it']].concat(ctx.crew.filter(c => c.active).map(c => [c.id, c.name])).concat([['__other', 'Someone else (type name)']]))}${field('custodian_name', 'Name (if someone else)', '')}
    ${field('due_back_at', 'Due back', localDT(new Date(Date.now() + 2 * 864e5).toISOString()), { type: 'datetime-local', required: true })}${selectField('condition_out', 'Condition going out', 'Good', COND.map(c => [c, c]))}
    <div class="span-2"><p class="eyebrow skills-head">ITEMS</p><div class="skill-grid">${ctx.items.filter(i => i.active).map(i => `<label class="skill"><input type="checkbox" name="item" value="${i.id}" ${outIds.has(i.id) ? 'disabled' : ''}><span>${e(i.name)}${outIds.has(i.id) ? ' (out)' : ''}</span></label>`).join('') || '<p class="muted small-note">Register items in the Items tab first.</p>'}</div></div>
    ${field('accessories_out', 'Accessories going with it (batteries, cables, bags)', '')}
    <div class="form-actions span-2"><button class="button primary" type="submit">Check out</button></div></form>`;
}
function itemsTab(ctx) {
  const cur = ctx.items.find(i => i.id === selected);
  const byCat = CATS.map(c => [c, ctx.items.filter(i => i.category === c && i.active).length]).filter(x => x[1]);
  return `<div class="module-toolbar"><div><strong>${ctx.items.filter(i => i.active).length} items registered</strong><span>${byCat.map(([c, n]) => `${e(c.split(' (')[0])}: ${n}`).join(' · ') || 'Add each item the first time it goes to a job'}</span></div><button class="button primary" data-new>Add item</button></div>
   <div class="records-layout"><section class="record-list">${ctx.items.length ? ctx.items.map(i => `<button class="record-card${i.id === selected ? ' active' : ''}" data-row="${i.id}"><span><strong>${e(i.name)}</strong><small>${e(i.category)}${i.serial_number ? ' · SN ' + e(i.serial_number) : ''}</small></span><span><em class="${['Damaged', 'Needs repair', 'Missing parts'].includes(i.condition) ? 'overdue' : 'status'}">${e(i.condition)}</em></span></button>`).join('') : empty('No items yet.')}</section>
   <section class="record-editor">${selected === 'new' || cur ? `<form id="item-form" class="record-form" data-id="${cur?.id || ''}"><div class="form-title span-2"><div><p class="eyebrow">${cur ? 'EQUIPMENT' : 'NEW ITEM'}</p><h2>${cur ? e(cur.name) : 'Register an item'}</h2></div></div>
     ${field('name', 'Name (e.g. Sony FX6 #1)', cur?.name, { required: true })}${selectField('category', 'Category', cur?.category || CATS[0], CATS.map(c => [c, c]))}
     ${field('serial_number', 'Serial number', cur?.serial_number)}${field('asset_label', 'Asset label / sticker number', cur?.asset_label)}
     ${selectField('condition', 'Condition', cur?.condition || 'Good', COND.map(c => [c, c]).concat([['unassessed', 'Not checked yet']]))}${selectField('ownership', 'Ownership', cur?.ownership || 'owned', [['owned', 'Owned by Sembule'], ['external_hire', 'Hired from a supplier']])}
     ${field('supplier_name', 'Supplier (if hired)', cur?.supplier_name)}${field('photo_url', 'Photo link (optional)', cur?.photo_url)}
     ${textArea('accessories', 'Accessories that belong with it', cur?.accessories)}
     <label class="check-label"><input type="checkbox" name="active" ${cur?.active === false ? '' : 'checked'}> In use (untick if sold or lost)</label>
     <div class="form-actions span-2"><button class="button primary" type="submit">Save</button><button class="button secondary" type="button" data-cancel>Cancel</button></div></form>` : '<div class="select-prompt"><h2>Build the register as you go</h2><p>No need to count everything today. Add each item the first time it is prepared for a job.</p></div>'}</section></div>`;
}
function kitsTab(ctx) {
  const inKit = k => ctx.kitItems.filter(x => x.kit_id === k).map(x => x.equipment_id);
  return `<div class="module-toolbar"><div><strong>${ctx.kits.length} kits</strong><span>Group items that always travel together, then check out the whole kit in one tap</span></div></div>
   ${ctx.kits.map(k => `<div class="check-group" data-kit="${k.id}"><h3>${e(k.name)}</h3>${k.description ? `<p class="muted small-note">${e(k.description)}</p>` : ''}<div class="skill-grid">${ctx.items.filter(i => i.active).map(i => `<label class="skill"><input type="checkbox" data-kit-item="${i.id}" ${inKit(k.id).includes(i.id) ? 'checked' : ''}><span>${e(i.name)}</span></label>`).join('')}</div></div>`).join('')}
   <form id="kit-form" class="record-form line-form"><div class="form-title span-2"><p class="eyebrow">NEW KIT</p></div>${field('name', 'Kit name (e.g. Livestream kit 1)', '', { required: true })}${field('description', 'Description', '')}<div class="form-actions span-2"><button class="button primary" type="submit">Create kit</button></div></form>`;
}

async function draw(context) {
  const { client, host } = context;
  host.innerHTML = '<div class="module-loading">Loading equipment…</div>';
  try {
    const [items, kits, kitItems, checkouts, jobs, crew] = await Promise.all([listRows(client, 'equipment', 'name', true), listRows(client, 'kits', 'name', true), listRows(client, 'kit_items', 'kit_id', true), listRows(client, 'checkouts', 'checked_out_at', false), listRows(client, 'jobs', 'starts_at', true), listRows(client, 'crew', 'name', true)]);
    context.ctx = { ...context, items, kits, kitItems, checkouts, jobs, crew };
    host.innerHTML = `<div class="tab-row">${[['out', 'Out now'], ['items', 'Items'], ['kits', 'Kits']].map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>` + (tab === 'items' ? itemsTab(context.ctx) : tab === 'kits' ? kitsTab(context.ctx) : outTab(context.ctx));
    bind(context);
  } catch (err) { context.ctx = null; host.innerHTML = `<div class="error-panel"><strong>Equipment could not be loaded.</strong><p>${e(err.message)}</p><button class="button secondary" data-retry>Try again</button></div>`; bind(context); }
}
function bind(context) {
  const { host, client, notify, identity } = context, ctx = context.ctx;
  const run = async (fn, ok) => { try { await fn(); if (ok) notify(ok); await draw(context); } catch (err) { notify(err.message); } };
  host.querySelector('[data-retry]')?.addEventListener('click', () => draw(context));
  if (!ctx) return;
  host.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; selected = null; draw(context); }));
  host.querySelector('[data-new]')?.addEventListener('click', () => { selected = 'new'; draw(context); });
  host.querySelectorAll('[data-row]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.row; draw(context); }));
  host.querySelector('[data-cancel]')?.addEventListener('click', () => { selected = null; draw(context); });
  host.querySelectorAll('[data-job]').forEach(b => b.addEventListener('click', () => { openJob(b.dataset.job); location.hash = '#jobs'; }));

  const itf = host.querySelector('#item-form');
  itf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(itf); setBusy(itf, true);
    run(async () => { const s = await saveRow(client, 'equipment', { name: fd.get('name').trim(), category: fd.get('category'), serial_number: txt(fd.get('serial_number')), asset_label: txt(fd.get('asset_label')), condition: fd.get('condition'), ownership: fd.get('ownership'), supplier_name: txt(fd.get('supplier_name')), photo_url: txt(fd.get('photo_url')), accessories: txt(fd.get('accessories')), active: fd.get('active') === 'on' }, itf.dataset.id || null); selected = s.id; }, 'Item saved.'); });

  const kf = host.querySelector('#kit-form');
  kf?.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(kf); run(() => saveRow(client, 'kits', { name: fd.get('name').trim(), description: txt(fd.get('description')) }, null), 'Kit created. Tick the items that belong in it.'); });
  host.querySelectorAll('[data-kit]').forEach(g => g.querySelectorAll('[data-kit-item]').forEach(i => i.addEventListener('change', () => run(async () => {
    const q = client.from('kit_items');
    const { error } = i.checked ? await q.insert({ kit_id: g.dataset.kit, equipment_id: i.dataset.kitItem }) : await q.delete().eq('kit_id', g.dataset.kit).eq('equipment_id', i.dataset.kitItem);
    if (error) throw new Error(error.message);
  }))));

  const of = host.querySelector('#out-form');
  of?.addEventListener('submit', ev => {
    ev.preventDefault(); const fd = new FormData(of);
    const job = ctx.jobs.find(j => j.id === fd.get('job_id')); if (!job) { notify('Choose the job.'); return; }
    const who = fd.get('custodian'), crew = ctx.crew.find(c => c.id === who);
    const name = crew ? crew.name : txt(fd.get('custodian_name')); if (!name) { notify('Every item needs a responsible person.'); return; }
    const out = new Set(ctx.checkouts.filter(c => !c.returned_at).map(c => c.equipment_id));
    let ids = fd.getAll('item');
    if (fd.get('kit_id')) ids = [...new Set(ids.concat(ctx.kitItems.filter(k => k.kit_id === fd.get('kit_id')).map(k => k.equipment_id)))];
    const busy = ids.filter(id => out.has(id)); ids = ids.filter(id => !out.has(id));
    if (!ids.length) { notify(busy.length ? 'Those items are already out.' : 'Choose items or a kit.'); return; }
    run(async () => { for (const id of ids) await saveRow(client, 'checkouts', { job_id: job.id, equipment_id: id, custodian_crew_id: crew?.id || null, custodian_name: name, due_back_at: fromLocal(fd.get('due_back_at')), condition_out: fd.get('condition_out'), accessories_out: txt(fd.get('accessories_out')) }, null); },
      `${ids.length} item${ids.length === 1 ? '' : 's'} checked out to ${name}.${busy.length ? ` ${busy.length} skipped (already out).` : ''}`);
  });
  host.querySelectorAll('[data-co] [data-return]').forEach(b => b.addEventListener('click', () => {
    const co = ctx.checkouts.find(c => c.id === b.closest('[data-co]').dataset.co);
    const cond = prompt(`Condition coming back? (${COND.join(', ')})`, 'Good'); if (!cond) return;
    const notes = prompt('Any notes? (missing cable, damage, etc.)', '') ?? '';
    run(async () => { await saveRow(client, 'checkouts', { returned_at: new Date().toISOString(), condition_in: cond, return_notes: notes || null, returned_to: identity.id }, co.id);
      if (cond !== 'Good') await saveRow(client, 'equipment', { condition: COND.includes(cond) ? cond : 'Needs repair' }, co.equipment_id); }, cond === 'Good' ? 'Checked in.' : 'Checked in. The item is flagged for attention.');
  }));
}
export async function mountEquipment(context) { selected = null; await draw(context); }
