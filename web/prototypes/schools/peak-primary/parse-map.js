
const fs = require('fs');
const sourceMap = require('source-map');

async function run() {
  const mapContent = fs.readFileSync('dist/assets/main-VnQFFjdN.js.map', 'utf8');
  const consumer = await new sourceMap.SourceMapConsumer(mapContent);
  const pos = consumer.originalPositionFor({
    line: 15,
    column: 28
  });
  console.log(pos);
}
run();
