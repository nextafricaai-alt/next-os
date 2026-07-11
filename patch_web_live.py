import re

with open('web/index.html', 'r') as f:
    content = f.read()

target = "window.OS_DATA.getTenants = function(){ return (_live && _live.length) ? _live : _orig(); };"
replacement = """window.OS_DATA.getTenants = function(){ 
      if (_live && _live.length) {
        var defaultTenants = _orig();
        var cc = defaultTenants.find(t => t.id === 'charis-childcare');
        return cc ? _live.concat(cc) : _live;
      }
      return _orig(); 
    };"""

if target in content:
    content = content.replace(target, replacement)
    with open('web/index.html', 'w') as f:
        f.write(content)
    print("web/index.html os-fleet-live patched.")
else:
    print("Error: Target string not found in web/index.html.")
