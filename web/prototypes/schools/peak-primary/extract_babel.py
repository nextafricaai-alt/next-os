import re
import os

def main():
    with open("index-vite.html", "r", encoding="utf-8") as f:
        html = f.read()

    # Find all <script type="text/babel" data-src="filename.jsx">...</script>
    pattern = re.compile(r'<script\s+type="text/babel"\s+data-src="([^"]+)">\s*?(.*?)</script>', re.DOTALL | re.IGNORECASE)
    
    extracted_files = []
    
    def replacer(match):
        filename = match.group(1)
        content = match.group(2)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(filename) or '.', exist_ok=True)
        
        # Write the content to the file
        with open(filename, "w", encoding="utf-8") as out:
            out.write(content)
            
        print(f"Extracted {filename}")
        extracted_files.append(filename)
        
        return f"<!-- extracted {filename} -->"

    new_html = pattern.sub(replacer, html)
    
    with open("index-vite.html", "w", encoding="utf-8") as f:
        f.write(new_html)
        
    # Now modify src/main.jsx to import all these files before App.jsx
    with open("src/main.jsx", "r", encoding="utf-8") as f:
        main_jsx = f.read()
        
    # We want to inject the imports right after window.ReactDOM = ReactDOM;
    injection_point = "window.ReactDOM = ReactDOM;\n"
    
    imports = "\n// --- Auto-extracted legacy Babel scripts ---\n"
    for filename in extracted_files:
        # If filename is "src/v4-today.jsx", we are in "src/main.jsx", so import is "./v4-today.jsx"
        # If filename is "role-router.jsx", import is "../role-router.jsx"
        if filename.startswith("src/"):
            import_path = "./" + filename[4:]
        else:
            import_path = "../" + filename
        imports += f"import '{import_path}';\n"
        
    imports += "// ------------------------------------------\n"
    
    if injection_point in main_jsx and "// --- Auto-extracted legacy Babel scripts ---" not in main_jsx:
        main_jsx = main_jsx.replace(injection_point, injection_point + imports)
        with open("src/main.jsx", "w", encoding="utf-8") as f:
            f.write(main_jsx)
        print("Updated src/main.jsx")

if __name__ == "__main__":
    main()
