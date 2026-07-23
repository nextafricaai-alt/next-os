const fs = require('fs');
const file = 'web/os-childcare.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/Armani/g, 'Amani').replace(/armani/g, 'amani');
fs.writeFileSync(file, content);
console.log('Replaced in os-childcare.jsx');
