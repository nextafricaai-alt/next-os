var global = this;
var window = this;
var console = { log: print, error: print, warn: print, debug: print, info: print };
load('web/vendor/babel.min.js');

var code = readFile('index_block.jsx');
try {
  Babel.transform(code, { presets: ['react'] });
  print("SUCCESSFUL COMPILE INDEX!");
} catch (e) {
  print("ERROR:");
  print(e.message);
  if (e.loc) print("Line: " + e.loc.line + " Col: " + e.loc.column);
}
var code2 = readFile('web/os-childcare.jsx');
try {
  Babel.transform(code2, { presets: ['react'] });
  print("SUCCESSFUL COMPILE CHILDCARE!");
} catch (e) {
  print("ERROR CHILDCARE:");
  print(e.message);
  if (e.loc) print("Line: " + e.loc.line + " Col: " + e.loc.column);
}
