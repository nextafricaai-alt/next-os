import os

with open("web/os-childcare.jsx", "r") as f:
    content = f.read()

# Replace full names
content = content.replace("Charis Childcare", "Armani")
# Replace remaining 'Charis ' text
content = content.replace("Charis OS", "Armani OS")
content = content.replace("Charis Parent", "Armani Parent")
content = content.replace("https://charis.app", "https://armani.app")

with open("web/os-childcare.jsx", "w") as f:
    f.write(content)

print("Renamed.")
