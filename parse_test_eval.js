var console = { log: print, error: print, warn: print, debug: print, info: print };
var code = readFile('web/os-childcare.jsx');
try {
  var result = Babel.transform(code, { presets: ['react'] });
  // Provide mock React
  var React = {
    createElement: function() { return {}; },
    useState: function() { return [{}, function(){}]; },
    useMemo: function(cb) { return cb(); },
    useEffect: function() {},
    useRef: function() { return {current: null}; },
    useCallback: function(cb) { return cb; }
  };
  var window = {};
  eval(result.code);
  print("EVAL SUCCESSFUL");
  print("window.ChildcareOSPage: " + typeof window.ChildcareOSPage);
} catch(e) {
  print("EVAL ERROR: " + e.message);
  print(e.stack);
}
