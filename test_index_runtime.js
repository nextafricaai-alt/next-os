var global = this;
var window = { __resources: {}, localStorage: { getItem: function(){ return "0"; }, setItem: function(){} }, addEventListener: function(){}, location: { search: "" } };
var React = {
  createElement: function() {},
  useState: function(init) { var v = typeof init === 'function' ? init() : init; return [v, function(){}]; },
  useEffect: function() {},
  useMemo: function(cb) { return cb(); },
  useCallback: function(cb) { return cb; },
  Component: class {},
};
var ReactDOM = { createRoot: function() { return { render: function() { print("APP RENDERED!"); } }; } };
var document = {
  getElementById: function() { return {}; },
  createElement: function() { return { style: {} }; },
  body: { appendChild: function(){} },
  documentElement: { style: { setProperty: function(){} } }
};
var CENTERS = [];
var contextData = { children: [], schedule: [] };
var print = global.print;
var console = { log: print, error: print, warn: print, debug: print, info: print };

var code = readFile('index_block.jsx');
load('web/vendor/babel.min.js');
try {
  var compiled = Babel.transform(code, { presets: ['react'] }).code;
  eval(compiled);
  print("INDEX RUNTIME SUCCESSFUL!");
} catch (e) {
  print("INDEX RUNTIME ERROR:", e.message);
  print(e.stack);
}
