const fs = require('fs');
const parser = require('@babel/parser');
const html = fs.readFileSync('NEXT OS.html', 'utf8');
const re = /<script type="text\/babel">([\s\S]*?)<\/script>/g;
let m, idx = 0;
while ((m = re.exec(html))) {
  idx++;
  try {
    parser.parse(m[1], { sourceType: 'script', plugins: ['jsx'] });
    console.log(`Block #${idx}: OK (${m[1].length} chars)`);
  } catch (e) {
    console.log(`Block #${idx}: ERROR — ${e.message}`);
    if (e.loc) {
      const lines = m[1].split('\n');
      const ln = e.loc.line - 1;
      for (let i = Math.max(0, ln-3); i < Math.min(lines.length, ln+4); i++) {
        console.log(`${i === ln ? '>>' : '  '} ${i+1}: ${lines[i].slice(0, 200)}`);
      }
    }
  }
}
