// Audit C7 — give every teacher in a login CSV a NEW temporary password.
//
// Why: an old CSV of teacher logins + temporary passwords was committed to
// git. Anyone who saw the repo could sign in as those teachers. This script
// sets a fresh random password for each email in that CSV and writes the new
// list to a file OUTSIDE the repo for the head teacher to hand out.
//
// Run from the repo root, in PowerShell:
//   $env:SUPABASE_URL = "https://llxhvqkkgftqwefmrofn.supabase.co"
//   $env:SUPABASE_SERVICE_KEY = "<service_role key: Supabase → Project Settings → API>"
//   node tools\rotate-teacher-passwords.mjs "C:\Users\PC\Desktop\patrick\next-os-PRIVATE-DATA\teacher-logins.csv"
//   Remove-Item Env:SUPABASE_SERVICE_KEY      # don't leave the key in the shell
//
// Add --dry-run to see who would be changed without changing anything.
// The new passwords go to "<input>.NEW-PASSWORDS.csv" next to the input file.
// NEVER put that file in the repo, WhatsApp it, or email it in bulk.
import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const csvPath = args.find(a => !a.startsWith('--'));
const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || '';
if (!csvPath || !URL_ || !KEY) {
  console.error('Usage: set SUPABASE_URL and SUPABASE_SERVICE_KEY, then: node tools/rotate-teacher-passwords.mjs <logins.csv> [--dry-run]');
  process.exit(1);
}

// Minimal CSV parser (handles quoted fields).
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const header = rows.shift().map(h => h.trim().toLowerCase());
const iEmail = header.findIndex(h => h === 'email' || h.includes('email'));
const iName = header.findIndex(h => h === 'name' || h.includes('name'));
if (iEmail < 0) { console.error('No "Email" column found in ' + csvPath); process.exit(1); }

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
async function authIdFor(email) {
  // 1) our users table (fast, exact)
  const r = await fetch(URL_ + '/rest/v1/users?select=auth_id&email=ilike.' + encodeURIComponent(email), { headers: H });
  const d = r.ok ? await r.json() : [];
  if (d && d[0] && d[0].auth_id) return d[0].auth_id;
  // 2) page through auth users and match exactly
  for (let page = 1; page <= 50; page++) {
    const a = await fetch(URL_ + '/auth/v1/admin/users?page=' + page + '&per_page=200', { headers: H });
    if (!a.ok) break;
    const j = await a.json(); const list = (j && j.users) || [];
    const hit = list.find(u => String(u.email || '').toLowerCase() === email);
    if (hit) return hit.id;
    if (list.length < 200) break;
  }
  return null;
}
function newPassword() {
  // 12 chars from an unambiguous alphabet (no 0/O, 1/l/I) — easy to read out loud.
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const b = crypto.randomBytes(12);
  let s = ''; for (const x of b) s += A[x % A.length];
  return 'Kl-' + s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
}

const out = [['Name', 'Email', 'New temporary password', 'Result']];
let ok = 0, missing = 0, failed = 0;
for (const r of rows) {
  const email = String(r[iEmail] || '').trim().toLowerCase();
  const name = iName >= 0 ? String(r[iName] || '').trim() : '';
  if (!email) continue;
  const id = await authIdFor(email);
  if (!id) { missing++; out.push([name, email, '', 'NO LOGIN FOUND']); console.log('  no login   ' + email); continue; }
  if (dry) { out.push([name, email, '', 'would reset (dry run)']); console.log('  would reset ' + email); continue; }
  const pw = newPassword();
  const res = await fetch(URL_ + '/auth/v1/admin/users/' + id, { method: 'PUT', headers: H, body: JSON.stringify({ password: pw }) });
  if (res.ok) { ok++; out.push([name, email, pw, 'reset']); console.log('  reset      ' + email); }
  else { failed++; const t = await res.text(); out.push([name, email, '', 'FAILED: ' + t.slice(0, 120)]); console.log('  FAILED     ' + email + ' ' + res.status); }
}
const outPath = csvPath.replace(/\.csv$/i, '') + '.NEW-PASSWORDS.csv';
if (!dry) fs.writeFileSync(outPath, out.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\r\n') + '\r\n');
console.log('\nDone. reset=' + ok + ' no-login=' + missing + ' failed=' + failed + (dry ? ' (dry run, nothing changed)' : '\nNew passwords written to: ' + outPath));
