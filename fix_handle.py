import re

with open("web/index.html", "r") as f:
    data = f.read()

old_block = """  const handleOpen = (tenant) => {
    // Global director views the childcare OS dashboard internally in the Mothership
    if (tenant.vertical === 'childcare') {
      if (typeof onNavigate === 'function') onNavigate('childcare');
      return;
    }"""

new_block = """  const handleOpen = (tenant) => {
    // Individual childcare centers open in standalone app
    if (tenant.vertical === 'childcare') {
      var _c = 'prototypes/childcare/index.html?t=' + encodeURIComponent(tenant.id) + '&n=' + encodeURIComponent(tenant.name || '');
      window.open(_c, '_blank', 'noopener,noreferrer');
      return;
    }"""

if old_block in data:
    data = data.replace(old_block, new_block)
    with open("web/index.html", "w") as f:
        f.write(data)
    print("SUCCESS")
else:
    print("OLD BLOCK NOT FOUND")
