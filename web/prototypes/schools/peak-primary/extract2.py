import re
import os

def main():
    with open("index.html", "r", encoding="utf-8") as f:
        content = f.read()

    # Find all script blocks
    script_pattern = re.compile(r'<script\s+type="text/babel"(.*?)>(.*?)</script>', re.DOTALL)
    
    exports_map = {}
    new_html = content

    os.makedirs("src/modules", exist_ok=True)

    def process_script(match):
        attrs = match.group(1)
        body = match.group(2).strip()
        
        # External script
        src_match = re.search(r'(?<!data-)src="([^"]+)"', attrs)
        if src_match:
            return f'<script type="module"{attrs}></script>'
            
        # Is this peak-app?
        if "data-src=\"src/peak-app.jsx\"" in attrs or "ReactDOM.createRoot" in body:
            # We don't extract peak-app.jsx to modules. We will construct App.jsx instead.
            # Just extract the body for App.jsx later.
            global peak_app_body
            peak_app_body = body
            return "" # Remove from HTML
            
        # Match window.MODULE = (function() { ... })();
        # Using a greedy match for the body so it grabs everything up to the LAST ^})();
        iife_pattern = re.compile(r'window\.([A-Z0-9_]+)\s*=\s*\(\s*function\s*\(\)\s*\{(.*)^\}\)\(\);', re.DOTALL | re.MULTILINE)
        m_iife = iife_pattern.search(body)
        
        if m_iife:
            module_name = m_iife.group(1)
            inner_body = m_iife.group(2)
            
            # Find return { ... }; at the end of inner_body
            # Using rsplit to separate the return statement
            returns = ""
            return_match = re.search(r'return\s*\{([^}]+)\}\s*;?\s*$', inner_body.strip())
            if return_match:
                returns = return_match.group(1)
                inner_body = inner_body[:return_match.start()]
                
            # Determine filename
            filename = f"{module_name.lower().replace('_', '-')}.jsx"
            filepath = os.path.join("src", "modules", filename)
            
            # Remove the React destructurings
            inner_body = re.sub(r'const\s*\{\s*[^}]+\s*\}\s*=\s*React;', '', inner_body)
            
            with open(filepath, "w", encoding="utf-8") as out:
                out.write("import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } from 'react';\n\n")
                out.write(inner_body.strip() + "\n\n")
                if returns:
                    out.write(f"export {{ {returns.strip()} }};\n")
                    
            print(f"Extracted module {module_name} to {filepath}")
            
            if returns:
                exports_map[module_name] = [r.strip() for r in returns.split(',')]
            else:
                exports_map[module_name] = []
                
            return ""
            
        return match.group(0)

    # Process all scripts
    new_html = script_pattern.sub(process_script, content)
    
    # Clean up CDN links
    new_html = re.sub(r'<script[^>]*src="https://unpkg.com/react@[^>]*></script>\s*', '', new_html)
    new_html = re.sub(r'<script[^>]*src="https://unpkg.com/react-dom@[^>]*></script>\s*', '', new_html)
    new_html = re.sub(r'<script[^>]*src="https://unpkg.com/@babel/standalone[^>]*></script>\s*', '', new_html)

    new_html = new_html.replace("</body>", '  <script type="module" src="/src/main.jsx"></script>\n</body>')

    with open("index-vite.html", "w", encoding="utf-8") as f:
        f.write(new_html)

    # Now generate App.jsx
    app_jsx = "import React, { useState, useEffect, useRef, useReducer, useMemo, useCallback, useContext } from 'react';\n"
    for mod, exps in exports_map.items():
        if exps:
            filename = f"{mod.lower().replace('_', '-')}"
            app_jsx += f"import {{ {', '.join(exps)} }} from './modules/{filename}';\n"
            
    app_jsx += "\n// Bind them to window so legacy code that expects window.PEAK_* still works\n"
    for mod, exps in exports_map.items():
        if exps:
            app_jsx += f"window.{mod} = {{ {', '.join(exps)} }};\n"
            
    # Remove the wrapper from peak_app_body
    peak_app_inner = peak_app_body
    if peak_app_inner.startswith("(function () {"):
        peak_app_inner = peak_app_inner[len("(function () {"):]
    peak_app_inner = re.sub(r'^\}\)\(\);\s*$', '', peak_app_inner, flags=re.MULTILINE)
    
    # Remove React destructuring in peak_app_inner
    peak_app_inner = re.sub(r'const\s*\{\s*[^}]+\s*\}\s*=\s*React;', '', peak_app_inner)
    
    # Remove ReactDOM.createRoot
    peak_app_inner = re.sub(r'ReactDOM\.createRoot\(document\.getElementById\(\'root\'\)\)\.render\(.*?\);', '', peak_app_inner, flags=re.DOTALL)
    
    app_jsx += "\n" + peak_app_inner.strip() + "\n\n"
    app_jsx += "export default App;\n"
    
    with open("src/App.jsx", "w", encoding="utf-8") as f:
        f.write(app_jsx)
        
    print("Extraction complete. Wrote index-vite.html and src/App.jsx")

if __name__ == '__main__':
    peak_app_body = ""
    main()
