import { listRows, saveRow, deleteRow, commercialByLead, upsertCommercial } from '../data.js';
import { canViewMoney, canDeleteOperations } from '../roles.js';
import { e, value, dateValue, readableDate, empty, field, selectField, textArea, formActions, setBusy } from './records.js';

const STATUSES = [['new','New'],['contacted','Contacted'],['qualified','Qualified'],['needs_clarification','Needs clarification'],['quoted','Quoted'],['booked','Booked'],['lost','Lost'],['unavailable','Unavailable']];
const SOURCES = [['phone','Phone'],['whatsapp','WhatsApp'],['email','Email'],['manual','Manual'],['website','Website']];
let selected = null;

function isOpen(status) { return !['booked','lost','unavailable'].includes(status); }
const DAY = 24 * 60 * 60 * 1000;
function isDue(lead) {
  if (!isOpen(lead.status)) return false;
  if (lead.next_action_at) return new Date(lead.next_action_at) < new Date();
  return lead.status === 'new' && !lead.last_contacted_at && (Date.now() - new Date(lead.created_at).getTime()) > DAY;
}
function card(lead) {
  const overdue = isDue(lead);
  return `<button class="record-card${selected === lead.id ? ' active' : ''}" data-lead="${lead.id}"><span><strong>${e(lead.contact_name)}</strong><small>${e(lead.service_requested || 'Service not recorded')}</small></span><span><em class="status">${e(STATUSES.find(x => x[0] === lead.status)?.[1] || lead.status)}</em>${overdue ? '<em class="overdue">Follow-up due</em>' : ''}</span></button>`;
}
function editor(lead, commercial, identity) {
  const money = canViewMoney(identity.role);
  return `<form id="lead-form" class="record-form" data-id="${lead?.id || ''}"><div class="form-title span-2"><div><p class="eyebrow">${lead ? 'ENQUIRY RECORD' : 'NEW ENQUIRY'}</p><h2>${lead ? e(lead.contact_name) : 'Add an enquiry'}</h2></div><div>${lead?.source === 'website' ? '<span class="source-badge">Website enquiry</span>' : ''}${lead?.client_id ? '<span class="source-badge">Linked to client</span>' : lead ? '<button type="button" class="button secondary" data-convert>Convert to client</button>' : ''}</div></div>
    ${field('contact_name','Contact name',lead?.contact_name,{required:true})}${field('phone','Phone',lead?.phone)}
    ${field('email','Email',lead?.email,{type:'email'})}${field('service_requested','Service requested',lead?.service_requested,{required:true})}
    ${field('event_date','Event date',dateValue(lead?.event_date),{type:'date'})}${field('venue','Venue',lead?.venue)}
    ${field('audience_size','Audience size',lead?.audience_size,{type:'number',extra:'min="0" step="1"'})}${selectField('source','Source',lead?.source || 'phone',SOURCES)}
    ${selectField('status','Status',lead?.status || 'new',STATUSES)}${field('next_action_at','Next action',lead?.next_action_at ? new Date(lead.next_action_at).toISOString().slice(0,16) : '',{type:'datetime-local'})}
    ${textArea('operational_brief','Production brief',lead?.operational_brief,'Visible to the production lead. Keep prices and budget out of this field.')}
    ${money ? `<div class="private-section span-2"><p class="eyebrow">PRIVATE COMMERCIAL DETAILS</p><p>Only the owner and director can open this section.</p><div class="form-grid">${field('budget_text','Budget',commercial?.budget_text)}${field('commercial_notes','Commercial notes',commercial?.commercial_notes)}${textArea('raw_message','Original commercial message',commercial?.raw_message)}</div></div>` : ''}
    ${formActions(lead?.id,canDeleteOperations(identity.role))}</form>`;
}
async function draw(context) {
  const { client, identity, host } = context;
  host.innerHTML = '<div class="module-loading">Loading enquiries…</div>';
  try {
    const leads = await listRows(client,'leads');
    context.leadsCache = leads;
    let lead = leads.find(item => item.id === selected) || null;
    let commercial = null;
    if (lead && canViewMoney(identity.role)) commercial = await commercialByLead(client,lead.id);
    const overdue = leads.filter(isDue).length;
    host.innerHTML = `<div class="module-toolbar"><div><strong>${leads.length} enquiries</strong><span>${overdue ? `${overdue} follow-up${overdue === 1 ? '' : 's'} due` : 'No follow-ups are overdue'}</span></div><div><a class="button secondary" href="./enquiry.html" target="_blank" rel="noopener">Open website form</a><button class="button primary" data-new-lead>New enquiry</button></div></div><div class="records-layout"><section class="record-list" aria-label="Enquiries">${leads.length ? leads.map(card).join('') : empty('No enquiries yet. Use New enquiry or submit the website form.')}</section><section class="record-editor">${selected === 'new' ? editor(null,null,identity) : lead ? editor(lead,commercial,identity) : `<div class="select-prompt"><h2>Select an enquiry</h2><p>Open a record to update the brief, follow-up date or status.</p></div>`}</section></div>`;
    bind(context);
  } catch (error) { host.innerHTML = `<div class="error-panel"><strong>Enquiries could not be loaded.</strong><p>${e(error.message)}</p><button class="button secondary" data-retry>Try again</button></div>`; bind(context); }
}
function bind(context) {
  const { host, client, identity, notify } = context;
  host.querySelector('[data-retry]')?.addEventListener('click',()=>draw(context));
  host.querySelector('[data-new-lead]')?.addEventListener('click',()=>{selected='new';draw(context);});
  host.querySelectorAll('[data-lead]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.lead;draw(context);}));
  host.querySelector('[data-cancel]')?.addEventListener('click',()=>{selected=null;draw(context);});
  const form=host.querySelector('#lead-form'); if(!form)return;
  form.addEventListener('submit',async event=>{event.preventDefault();setBusy(form,true);const fd=new FormData(form);const values={contact_name:fd.get('contact_name').trim(),phone:fd.get('phone').trim()||null,email:fd.get('email').trim()||null,service_requested:fd.get('service_requested').trim()||null,event_date:fd.get('event_date')||null,venue:fd.get('venue').trim()||null,audience_size:fd.get('audience_size')?Number(fd.get('audience_size')):null,source:fd.get('source'),status:fd.get('status'),next_action_at:fd.get('next_action_at')?new Date(fd.get('next_action_at')).toISOString():null,operational_brief:fd.get('operational_brief').trim()||null};const current=context.leadsCache?.find(x=>x.id===form.dataset.id);if(values.status!=='new'&&!current?.last_contacted_at)values.last_contacted_at=new Date().toISOString();try{const saved=await saveRow(client,'leads',values,form.dataset.id||null);if(canViewMoney(identity.role)){const privateValues={budget_text:fd.get('budget_text').trim()||null,commercial_notes:fd.get('commercial_notes').trim()||null,raw_message:fd.get('raw_message').trim()||null};if(Object.values(privateValues).some(Boolean)||form.dataset.id)await upsertCommercial(client,saved.id,privateValues);}selected=saved.id;notify('Enquiry saved.');await draw(context);}catch(error){notify(error.message);setBusy(form,false);}});
  form.querySelector('[data-convert]')?.addEventListener('click',async()=>{const lead=context.leadsCache?.find(x=>x.id===form.dataset.id);if(!lead)return;try{const created=await saveRow(client,'clients',{name:lead.contact_name,phone:lead.phone,email:lead.email},null);await saveRow(client,'leads',{client_id:created.id},lead.id);notify('Client created and linked to this enquiry.');await draw(context);}catch(error){notify(error.message);}});
  form.querySelector('[data-delete]')?.addEventListener('click',async()=>{if(!confirm('Delete this enquiry permanently?'))return;try{await deleteRow(client,'leads',form.dataset.id);selected=null;notify('Enquiry deleted.');await draw(context);}catch(error){notify(error.message);}});
}
export async function mountLeads(context){selected=null;await draw(context);}
