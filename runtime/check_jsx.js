const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VENDOR_DIR = path.join(__dirname, '..', 'vendor');
const FILES_TO_CHECK = [
  path.join(__dirname, '..', 'NEXT OS.html'),
  path.join(__dirname, '..', 'NEXT OS Standalone.html')
];

console.log('Loading Babel standalone...');
const babelCode = fs.readFileSync(path.join(VENDOR_DIR, 'babel.min.js'), 'utf8');

const sandbox = {
  window: {},
  exports: {},
  console: console,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(babelCode, sandbox);

const Babel = sandbox.Babel || sandbox.window.Babel;
if (!Babel) {
  console.error('Failed to load Babel from vendor/babel.min.js');
  process.exit(1);
}
console.log('Babel standalone loaded successfully.');

let overallErrors = 0;

for (const HTML_FILE of FILES_TO_CHECK) {
  console.log(`\n========================================`);
  console.log(`Checking ${path.basename(HTML_FILE)}...`);
  console.log(`========================================`);
  
  if (!fs.existsSync(HTML_FILE)) {
    console.log(`File not found: ${HTML_FILE}`);
    continue;
  }
  
  const htmlContent = fs.readFileSync(HTML_FILE, 'utf8');
  
  // Extract all <script type="text/babel"> blocks
  const regex = /<script\s+type="text\/babel">([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  let errors = 0;

  while ((match = regex.exec(htmlContent)) !== null) {
    count++;
    const code = match[1];
    
    // Find line number in original file
    const index = match.index;
    const lineNum = htmlContent.substring(0, index).split('\n').length;
    
    try {
      Babel.transform(code, {
        presets: ['react'],
        filename: `${path.basename(HTML_FILE)}_block_${count}.jsx`
      });
    } catch (err) {
      errors++;
      overallErrors++;
      console.error(`Error in block #${count} (around line ${lineNum}):`);
      console.error(err.message);
      // Print snippet around error if line/loc is available
      if (err.loc) {
        const lines = code.split('\n');
        const errLine = err.loc.line - 1;
        console.error('\nSnippet:');
        for (let i = Math.max(0, errLine - 3); i <= Math.min(lines.length - 1, errLine + 3); i++) {
          const marker = i === errLine ? ' > ' : '   ';
          console.error(`${marker}${lineNum + i}: ${lines[i]}`);
        }
      }
    }
  }
  
  console.log(`Finished ${path.basename(HTML_FILE)}. Blocks checked: ${count}, Errors found: ${errors}`);
}

console.log(`\nOverall check finished. Total errors: ${overallErrors}`);
process.exit(overallErrors > 0 ? 1 : 0);
