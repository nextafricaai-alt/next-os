var global = this;
var window = this;
var React = {
  useState: function() { return [{}, function(){}]; },
  useEffect: function() {},
  useMemo: function() {},
};
var ReactDOM = {};
var TWEAK_DEFAULTS = {};
var useTweaks = function() { return [{}, function(){}]; };
var CENTERS = [];
var contextData = { children: [], schedule: [] };
var alert = print;
var console = { log: print, error: print };
var calculateVaccineStatus = function() { return {}; };

var code = readFile('web/os-childcare.jsx');

// We need to compile it to JS first using Babel
load('web/vendor/babel.min.js');
try {
  var compiled = Babel.transform(code, { presets: ['react'] }).code;
  eval(compiled);
  print("RUNTIME SUCCESSFUL!");
} catch (e) {
  print("RUNTIME ERROR:", e.message);
  print(e.stack);
}
