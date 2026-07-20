const fs = require('fs');
const html = fs.readFileSync('web/index.html', 'utf8');
const blocks = [];
const regex = /<script type="text\/babel">([\s\S]*?)<\/script>/g;
let match;
while ((match = regex.exec(html)) !== null) {
  blocks.push(match[1]);
}
fs.writeFileSync('index_block.js', blocks.join('\n\n'));
