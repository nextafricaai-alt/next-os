import { withTimeout } from './utils.js';

function fail(error, fallback) {
  if (!error) return;
  throw new Error(error.message || fallback);
}

export async function listRows(client, table, order = 'created_at', ascending = false) {
  const { data, error } = await withTimeout(client.from(table).select('*').order(order, { ascending }));
  fail(error, `Unable to load ${table}.`);
  return data || [];
}

export async function saveRow(client, table, values, id) {
  const query = id
    ? client.from(table).update(values).eq('id', id).select().single()
    : client.from(table).insert(values).select().single();
  const { data, error } = await withTimeout(query);
  fail(error, `Unable to save ${table}.`);
  return data;
}

export async function deleteRow(client, table, id) {
  const { error } = await withTimeout(client.from(table).delete().eq('id', id));
  fail(error, `Unable to delete ${table}.`);
}

export async function upsertCommercial(client, leadId, values) {
  const { error } = await withTimeout(client.from('lead_commercial_details')
    .upsert({ lead_id: leadId, ...values }, { onConflict: 'lead_id' }));
  fail(error, 'The enquiry was saved, but its private commercial details were not.');
}

export async function commercialByLead(client, leadId) {
  const { data, error } = await withTimeout(client.from('lead_commercial_details')
    .select('lead_id,budget_text,commercial_notes,raw_message').eq('lead_id', leadId).maybeSingle());
  fail(error, 'Unable to load private commercial details.');
  return data;
}
