var console = {
    log: print,
    debug: print,
    info: print,
    warn: print,
    error: print,
    trace: print
};
load("babel.min.js");
var code = readFile("web/os-childcare.jsx");
try {
    Babel.transform(code, { presets: ["react"] });
    print("JSX PARSED SUCCESSFULLY");
} catch(e) {
    print("JSX SYNTAX ERROR: " + e.message);
}
