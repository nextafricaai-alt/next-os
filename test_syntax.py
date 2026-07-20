import re
text = open("web/os-childcare.jsx").read()

# Remove string literals
text = re.sub(r'".*?(?<!\\)"', '""', text)
text = re.sub(r"'.*?(?<!\\)'", "''", text)
text = re.sub(r"`.*?`", "``", text, flags=re.DOTALL)

# Remove comments
text = re.sub(r"//.*", "", text)
text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)

print("Braces mismatch:", text.count("{") - text.count("}"))
print("Parens mismatch:", text.count("(") - text.count(")"))
print("Brackets mismatch:", text.count("[") - text.count("]"))
