// Worker tests (audit Phase 2). Each *.test.mjs runs the real Worker code
// against an in-memory fake of Supabase / SMS / Flutterwave and prints one
// line per check. The printed results must match tests/expected/<name>.txt.
//   node cloudflare-worker/tests/run.mjs            run all, fail on any difference
//   node cloudflare-worker/tests/run.mjs --update   accept the current output as expected
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const update = process.argv.includes('--update');
// Remove parts that legitimately change between runs (random SMS codes, clock times).
const norm = s => s.replace(/\r/g, '').replace(/\b\d{6} is your/g, 'CODE is your').replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, 'HH:MM').trimEnd() + '\n';
let failed = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.test.mjs')).sort()) {
  let out;
  try { out = execFileSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 60000 }); }
  catch (e) { console.log('FAIL  ' + f + '  (crashed)\n' + (e.stdout || '') + (e.stderr || '')); failed++; continue; }
  const exp = path.join(dir, 'expected', f.replace('.test.mjs', '.txt'));
  if (update || !fs.existsSync(exp)) { fs.mkdirSync(path.dirname(exp), { recursive: true }); fs.writeFileSync(exp, norm(out)); console.log('SAVED ' + f); continue; }
  const want = fs.readFileSync(exp, 'utf8').replace(/\r/g, ''), got = norm(out);
  if (want === got) { console.log('ok    ' + f); continue; }
  failed++;
  console.log('FAIL  ' + f);
  const a = want.split('\n'), b = got.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) console.log('   expected: ' + (a[i] || '') + '\n   got:      ' + (b[i] || ''));
}
if (failed) { console.log('\n' + failed + ' test file(s) failed.'); process.exit(1); }
console.log('\nAll Worker tests passed.');
