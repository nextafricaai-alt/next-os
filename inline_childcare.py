with open('web/index.html', 'r') as f:
    index = f.read()

with open('web/os-childcare.jsx', 'r') as f:
    childcare = f.read()

index = index.replace('<script type="text/babel" src="os-childcare.jsx"></script>', '<script type="text/babel">\n' + childcare + '\n</script>')

with open('web/index.html', 'w') as f:
    f.write(index)
