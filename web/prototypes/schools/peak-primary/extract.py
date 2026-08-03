import re
import os

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'<script\s+type="text/babel"(.*?)>(.*?)</script>', re.DOTALL)

inline_count = 1

def replace_script(match):
    global inline_count
    attrs = match.group(1)
    body = match.group(2)
    
    # Check for actual src attribute
    src_match = re.search(r'(?<!data-)src="([^"]+)"', attrs)
    if src_match:
        # It's an external script. Change type to module
        return f'<script type="module"{attrs}></script>'
    
    # Check for data-src attribute
    data_src_match = re.search(r'data-src="([^"]+)"', attrs)
    if data_src_match:
        filename = data_src_match.group(1)
    else:
        filename = f"src/inline_{inline_count}.jsx"
        inline_count += 1
        
    # Write body to filename if there is a body
    if body.strip():
        os.makedirs(os.path.dirname(filename) or '.', exist_ok=True)
        with open(filename, "w", encoding="utf-8") as out:
            out.write(body.strip() + "\n")
            
    # Replace in HTML
    src_path = filename if filename.startswith('/') else f"/{filename}"
    return f'<script type="module" src="{src_path}"></script>'

new_content = pattern.sub(replace_script, content)

with open("index-vite.html", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Extraction complete.")
