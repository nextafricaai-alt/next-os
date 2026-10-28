// Shared profit-split maths: tithe on net profit, then the buckets. Used by a project's Money tab and the Buckets page.
import { withTimeout } from '../utils.js';

export const DEFAULT_BUCKETS = [
  { key: 'tithe', label: 'Tithe', pct: 10, sort: 0 },
  { key: 'owner_pay', label: "Tony's Pay", pct: 30, sort: 1 },
  { key: 'savings', label: 'Business Savings', pct: 30, sort: 2 },
  { key: 'equipment', label: 'Equipment Fund', pct: 25, sort: 3 },
  { key: 'operations', label: 'Operations', pct: 15, sort: 4 }
];
export const ICON = { tithe: '🙏', owner_pay: '👤', savings: '🏦', equipment: '🎛️', operations: '⚙️' };

// Loads quietly: if the buckets tables are not there yet (or the user is not the owner) it falls back, never breaks the page.
export async function loadBuckets(client) {
  try { const { data, error } = await withTimeout(client.from('money_buckets').select('*').order('sort')); if (error || !data?.length) return { buckets: DEFAULT_BUCKETS, ready: false }; return { buckets: data, ready: true }; }
  catch { return { buckets: DEFAULT_BUCKETS, ready: false }; }
}
export async function loadDistributions(client, jobId) {
  try { let q = client.from('distributions').select('*'); if (jobId) q = q.eq('job_id', jobId); const { data, error } = await withTimeout(q); return error ? [] : data || []; } catch { return []; }
}

// Whole-shilling split that always adds up exactly to the profit.
export function splitProfit(profit, buckets) {
  const p = Math.max(0, Math.round(Number(profit) || 0));
  const tithe = buckets.find(b => b.key === 'tithe');
  const titheAmt = tithe ? Math.round(p * Number(tithe.pct) / 100) : 0;
  const rest = p - titheAmt, others = buckets.filter(b => b.key !== 'tithe');
  const out = tithe ? [{ ...tithe, amount: titheAmt }] : [];
  let used = 0;
  others.forEach((b, i) => { const a = i === others.length - 1 ? rest - used : Math.round(rest * Number(b.pct) / 100); used += a; out.push({ ...b, amount: a }); });
  return out;
}
