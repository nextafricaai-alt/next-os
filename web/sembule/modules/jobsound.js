// Sound-business extras for a project: gear reservation with clash warnings, and the event spec sheet.
import { saveRow, deleteRow } from '../data.js';
import { canDeleteOperations } from '../roles.js';
import { e, field, selectField, textArea } from './records.js';
import { readable, printDocument, txt } from '../refs.js';

const hm = iso => iso ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' }).format(new Date(iso)) : '';
const localDT = iso => iso ? new Date(new Date(iso).getTime() + 3 * 3600e3).toISOString().slice(0, 16) : '';
const fromLocal = v => v ? new Date(v + ':00+03:00').toISOString() : null;
const overlap = (a1, a2, b1, b2) => new Date(a1) < new Date(b2) && new Date(a2) > new Date(b1);

// Who else holds this item during this project? Returns a short reason or ''.
function busyWith(ctx, equipmentId) {
  const j = ctx.job, jobName = id => ctx.jobs.find(x => x.id === id)?.reference || 'another project';
  const r = (ctx.gear.all || []).find(o => o.equipment_id === equipmentId && o.job_id !== j.id && overlap(o.starts_at, o.ends_at, j.starts_at, j.ends_at));
  if (r) return `booked on ${jobName(r.job_id)}`;
  const c = (ctx.gear.out || []).find(o => o.equipment_id === equipmentId && !o.returned_at && o.job_id !== j.id && new Date(o.due_back_at) > new Date(j.starts_at));
  if (c) return `out on ${jobName(c.job_id)} until ${readable(c.due_back_at)}`;
  return '';
}

export function gearTab(ctx) {
  const mine = ctx.gear.all.filter(r => r.job_id === ctx.job.id);
  const item = id => ctx.gear.items.find(i => i.id === id) || {};
  const taken = new Set(mine.map(r => r.equipment_id));
  const free = ctx.gear.items.filter(i => i.active && !taken.has(i.id));
  const clashCount = mine.filter(r => busyWith(ctx, r.equipment_id)).length;
  return `<div class="module-toolbar"><div><strong>${mine.length} item${mine.length === 1 ? '' : 's'} reserved</strong><span>${clashCount ? `${clashCount} clash${clashCount === 1 ? '' : 'es'} with other projects. Sort these out before the day.` : 'No clashes with other projects'}</span></div></div>
   ${mine.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Status</th><th></th></tr></thead><tbody>${mine.map(r => { const b = busyWith(ctx, r.equipment_id); return `<tr data-ge="${r.id}"><td><strong>${e(item(r.equipment_id).name || 'Item')}</strong><small>${e(item(r.equipment_id).category || '')}</small></td><td>${b ? `<em class="overdue">Clash: ${e(b)}</em>` : '<em class="status">Free for this project</em>'}</td><td class="row-actions">${canDeleteOperations(ctx.identity.role) ? '<button type="button" class="text-button" data-gedel>Remove</button>' : ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted small-note calm">No gear reserved yet. Reserve it here so nobody double-books it.</p>'}
   <form id="gear-form" class="record-form line-form"><div class="form-title span-2"><div><p class="eyebrow">RESERVE GEAR</p><h2>For ${readable(ctx.job.starts_at)} ${hm(ctx.job.starts_at)} to ${hm(ctx.job.ends_at)}</h2></div></div>
    ${selectField('kit_id', 'Whole kit (optional)', '', [['', 'No kit, pick items below']].concat(ctx.gear.kits.filter(k => k.active).map(k => [k.id, k.name])))}
    <div class="span-2"><div class="skill-grid">${free.map(i => { const b = busyWith(ctx, i.id); return `<label class="skill"><input type="checkbox" name="gitem" value="${i.id}"><span>${e(i.name)}${b ? ` <small class="override">${e(b)}</small>` : ''}</span></label>`; }).join('') || '<p class="muted small-note">Add items in Equipment first.</p>'}</div></div>
    <label class="check-label span-2"><input type="checkbox" name="force"> Reserve even if it clashes with another project</label>
    <div class="form-actions span-2"><button class="button primary" type="submit">Reserve</button></div></form>`;
}

export function bindGear(ctx, host, client, notify, run) {
  host.querySelector('#gear-form')?.addEventListener('submit', ev => {
    ev.preventDefault(); const fd = new FormData(ev.target), force = !!fd.get('force');
    let ids = fd.getAll('gitem');
    if (fd.get('kit_id')) ids = [...new Set(ids.concat(ctx.gear.kitItems.filter(k => k.kit_id === fd.get('kit_id')).map(k => k.equipment_id)))];
    const have = new Set(ctx.gear.all.filter(r => r.job_id === ctx.job.id).map(r => r.equipment_id));
    ids = ids.filter(id => !have.has(id));
    if (!ids.length) { notify('Choose items or a kit.'); return; }
    const blocked = force ? [] : ids.filter(id => busyWith(ctx, id)); ids = ids.filter(id => !blocked.includes(id));
    if (!ids.length) { notify('All of those are busy on another project. Tick "Reserve even if it clashes" to override.'); return; }
    run(async () => { for (const id of ids) await saveRow(client, 'job_equipment', { job_id: ctx.job.id, equipment_id: id, starts_at: ctx.job.starts_at, ends_at: ctx.job.ends_at }, null); },
      `${ids.length} reserved.${blocked.length ? ` ${blocked.length} skipped (busy).` : ''}`);
  });
  host.querySelectorAll('[data-ge] [data-gedel]').forEach(b => b.addEventListener('click', () => run(() => deleteRow(client, 'job_equipment', b.closest('[data-ge]').dataset.ge), 'Removed.')));
}

const SETTING = [['', 'Choose'], ['indoor', 'Indoors'], ['covered', 'Outdoors, covered'], ['outdoor', 'Outdoors, open']];
const POWER = [['', 'Choose'], ['grid', 'Venue power (UMEME)'], ['generator', 'We bring a generator'], ['both', 'Venue power with generator backup'], ['unknown', 'Not confirmed yet']];

export function specTab(ctx) {
  const s = ctx.job.spec || {};
  return `<form id="spec-form" class="record-form"><p class="muted small-note span-2">Fill this in with the client. Print it as the one-page crew sheet for the event.</p>
   ${selectField('setting', 'Indoors or outdoors', s.setting || '', SETTING)}${selectField('power', 'Power', s.power || '', POWER)}
   ${field('crowd', 'Expected crowd', s.crowd, { type: 'number', extra: 'min="0"' })}${field('stage', 'Stage / floor size and surface', s.stage)}
   ${field('loadin_at', 'Load-in / setup from', localDT(s.loadin_at), { type: 'datetime-local' })}${field('soundcheck_at', 'Sound check at', localDT(s.soundcheck_at), { type: 'datetime-local' })}
   ${field('doors_at', 'Guests arrive / doors', localDT(s.doors_at), { type: 'datetime-local' })}${field('access', 'Access and parking for the truck', s.access)}
   ${field('dj', 'DJ / MC / host', s.dj)}${field('noise_limit', 'Noise limit or curfew', s.noise_limit)}
   ${textArea('program', 'Running order', s.program, 'Arrival music, speeches, cake cutting, first dance, main party, end time.')}
   ${textArea('music', 'Music style and must-play songs', s.music)}${textArea('dont_play', 'Do not play', s.dont_play)}
   ${textArea('backup', 'Backup plan', s.backup, 'Power failure, rain, late start.')}
   <div class="form-actions span-2"><button class="button primary" type="submit">Save spec</button><button class="button secondary" type="button" data-specprint>Print crew sheet</button></div></form>`;
}

function readSpec(form) {
  const fd = new FormData(form), g = k => txt(fd.get(k));
  return { setting: g('setting'), power: g('power'), crowd: g('crowd'), stage: g('stage'), loadin_at: fromLocal(fd.get('loadin_at')), soundcheck_at: fromLocal(fd.get('soundcheck_at')), doors_at: fromLocal(fd.get('doors_at')), access: g('access'), dj: g('dj'), noise_limit: g('noise_limit'), program: g('program'), music: g('music'), dont_play: g('dont_play'), backup: g('backup') };
}

export function bindSpec(ctx, host, client, notify, run) {
  const form = host.querySelector('#spec-form'); if (!form) return;
  form.addEventListener('submit', ev => { ev.preventDefault(); run(() => saveRow(client, 'jobs', { spec: readSpec(form) }, ctx.job.id), 'Spec saved.'); });
  host.querySelector('[data-specprint]')?.addEventListener('click', () => {
    const s = readSpec(form), j = ctx.job, c = ctx.clients.find(x => x.id === j.client_id) || {}, lbl = (arr, v) => (arr.find(a => a[0] === v) || [])[1] || '';
    const row = (k, v) => v ? `<p><strong>${e(k)}:</strong> ${e(v)}</p>` : '';
    const gear = ctx.gear.all.filter(r => r.job_id === j.id).map(r => ctx.gear.items.find(i => i.id === r.equipment_id)?.name).filter(Boolean);
    const team = ctx.crewRows.map(r => `${ctx.crew.find(x => x.id === r.crew_id)?.name || ''} (${r.role}, call ${hm(r.call_time || j.starts_at)})`);
    printDocument({ title: 'Event sheet', heading: 'EVENT SHEET', reference: j.reference, partyLabel: 'CLIENT', metaLines: [`${readable(j.starts_at)}`], party: c, notify, filename: `Event_sheet_${j.reference}`, body: `
     <div class="box gold"><h3>${e(j.title)}</h3>${row('Venue', j.venue)}${row('On-site contact', [j.venue_contact_name, j.venue_contact_phone].filter(Boolean).join(' '))}${row('Setting', lbl(SETTING, s.setting))}${row('Power', lbl(POWER, s.power))}${row('Crowd', s.crowd)}${row('Stage / floor', s.stage)}${row('Access', s.access)}${row('Noise limit', s.noise_limit)}</div>
     <div class="box" style="margin-top:18px"><h3>TIMES</h3>${row('Setup from', s.loadin_at ? hm(s.loadin_at) : '')}${row('Sound check', s.soundcheck_at ? hm(s.soundcheck_at) : '')}${row('Guests arrive', s.doors_at ? hm(s.doors_at) : '')}${row('Event', `${hm(j.starts_at)} to ${hm(j.ends_at)}`)}${row('DJ / MC', s.dj)}</div>
     ${s.program ? `<div class="box" style="margin-top:18px"><h3>RUNNING ORDER</h3><p>${e(s.program).replace(/\n/g, '<br>')}</p></div>` : ''}
     ${s.music || s.dont_play ? `<div class="box" style="margin-top:18px"><h3>MUSIC</h3>${s.music ? `<p>${e(s.music).replace(/\n/g, '<br>')}</p>` : ''}${s.dont_play ? `<p><strong>Do not play:</strong> ${e(s.dont_play).replace(/\n/g, '<br>')}</p>` : ''}</div>` : ''}
     ${team.length ? `<div class="box" style="margin-top:18px"><h3>TEAM</h3><p>${team.map(e).join('<br>')}</p></div>` : ''}${gear.length ? `<div class="box" style="margin-top:18px"><h3>GEAR</h3><p>${gear.map(e).join(', ')}</p></div>` : ''}
     ${s.backup ? `<div class="box" style="margin-top:18px"><h3>BACKUP PLAN</h3><p>${e(s.backup).replace(/\n/g, '<br>')}</p></div>` : ''}` });
  });
}
