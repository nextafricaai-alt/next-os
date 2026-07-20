import re

with open('web/index.html', 'r') as f:
    html = f.read()

blocks = re.findall(r'<script type="text/babel">([\s\S]*?)</script>', html)
with open('index_block.jsx', 'w') as f:
    f.write('\n\n'.join(blocks))
