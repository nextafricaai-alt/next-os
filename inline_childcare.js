const fs = require('fs');
let index = fs.readFileSync('web/index.html', 'utf8');
let childcare = fs.readFileSync('web/os-childcare.jsx', 'utf8');
// remove the script tag src
index = index.replace('<script type="text/babel" src="os-childcare.jsx"></script>', '<script type="text/babel">\n' + childcare + '\n</script>');
fs.writeFileSync('web/index.html', index);
