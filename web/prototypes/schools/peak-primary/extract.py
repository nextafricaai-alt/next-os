import re
import os

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# We want to find all script blocks with type="text/babel"
script_pattern = re.compile(r'<script\s+type="text/babel"(.*?)>(.*?)</script>', re.DOTALL)

modules = []
new_content = content

# Keep track of what we extract
exports_map = {}

def process_script(match):
    attrs = match.group(1)
    body = match.group(2).strip()
    
    # Check for actual src attribute
    src_match = re.search(r'(?<!data-)src="([^"]+)"', attrs)
    if src_match:
        # It's an external script. Change type to module
        return f'<script type="module"{attrs}></script>'
    
    # If it's the main entry point (has no IIFE but has ReactDOM.createRoot)
    if "ReactDOM.createRoot" in body:
        return "" # We will write a custom App.jsx for this

    # Find the IIFE pattern: window.MODULE_NAME = (function() { ... return { EXPORTS }; })();
    # Make sure we use a robust regex that can handle whitespace/newlines
    iife_pattern = re.compile(r'window\.([A-Z0-9_]+)\s*=\s*\(\s*function\s*\(\)\s*\{(.*?)(?:return\s*\{([^}]+)\}\s*;?\s*)?\}\)\(\);', re.DOTALL)
    
    # Search for IIFE in the body
    m_iife = iife_pattern.search(body)
    
    if m_iife:
        module_name = m_iife.group(1)
        inner_body = m_iife.group(2)
        returns = m_iife.group(3)
        
        # Determine filename
        filename = f"{module_name.lower().replace('_', '-')}.jsx"
        filepath = os.path.join("src", "modules", filename)
        
        # Remove the `const { useState... } = React;` since we will import them
        inner_body = re.sub(r'const\s*\{\s*[^}]+\s*\}\s*=\s*React;', '', inner_body)
        
        # Write to file
        with open(filepath, "w", encoding="utf-8") as out:
            out.write("import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } from 'react';\n\n")
            out.write(inner_body.strip() + "\n\n")
            if returns:
                out.write(f"export {{ {returns.strip()} }};\n")
        
        print(f"Extracted module {module_name} to {filepath}")
        
        if returns:
            exports_map[module_name] = [r.strip() for r in returns.split(',')]
            
        return "" # Remove from index.html
        
    return match.group(0) # Keep if no IIFE found

os.makedirs("src/modules", exist_ok=True)

# Process all scripts
new_html = script_pattern.sub(process_script, content)

# Remove the CDN links for React and Babel
new_html = re.sub(r'<script[^>]*src="https://unpkg.com/react@[^>]*></script>\s*', '', new_html)
new_html = re.sub(r'<script[^>]*src="https://unpkg.com/react-dom@[^>]*></script>\s*', '', new_html)
new_html = re.sub(r'<script[^>]*src="https://unpkg.com/@babel/standalone[^>]*></script>\s*', '', new_html)

# Add <script type="module" src="/src/main.jsx"></script> before </body>
new_html = new_html.replace("</body>", '  <script type="module" src="/src/main.jsx"></script>\n</body>')

with open("index-vite.html", "w", encoding="utf-8") as f:
    f.write(new_html)
    
print("Extraction complete. Wrote index-vite.html.")

# Now let's generate src/App.jsx based on what we exported
app_jsx = "import React, { useState, useEffect } from 'react';\n"
for mod, exps in exports_map.items():
    filename = f"{mod.lower().replace('_', '-')}"
    app_jsx += f"import {{ {', '.join(exps)} }} from './modules/{filename}';\n"
    
app_jsx += """
// Bind them to window so legacy code that expects window.PEAK_EXAMS still works
"""
for mod, exps in exports_map.items():
    app_jsx += f"window.{mod} = {{ {', '.join(exps)} }};\n"

app_jsx += """
export default function App() {
  // We recreate the root shell here
  return (
    <DesktopShell />
  );
}
"""
with open("src/App.jsx", "w", encoding="utf-8") as f:
    f.write(app_jsx)
    
# Generate src/main.jsx
main_jsx = """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.React = React;
window.ReactDOM = ReactDOM;

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
"""
with open("src/main.jsx", "w", encoding="utf-8") as f:
    f.write(main_jsx)

print("Generated src/App.jsx and src/main.jsx")
