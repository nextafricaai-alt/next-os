import os

def main():
    # Read index.html
    with open('index.html', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    # Extract the body of peak-app.jsx
    app_body_lines = lines[13155:14847]
    app_body = "".join(app_body_lines)
    
    # Read existing App.jsx to get imports and globals
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        app_jsx_content = f.read()
        
    imports = []
    globals_setup = []
    
    for line in app_jsx_content.split('\n'):
        if line.startswith('import ') and 'from \'' in line and not line.startswith("import React"):
            imports.append(line)
        elif line.startswith('window.PEAK_'):
            globals_setup.append(line)
            
    # Add missing globals and imports for peak-setup, peak-forms, peak-finance
    imports.append("import { Setup, detectLevel, vocabFor, PRESETS } from './modules/peak-setup';")
    globals_setup.append("window.PEAK_SETUP = { Setup, detectLevel, vocabFor, PRESETS };")
    
    imports.append("import { ImportStudents, RecordPayment, FeesImport, Receipts, NewAssignment, AddStudent, AddTeacher } from './modules/peak-forms';")
    globals_setup.append("window.PEAK_FORMS = { ImportStudents, RecordPayment, FeesImport, Receipts, NewAssignment, AddStudent, AddTeacher };")
    
    imports.append("import { Finance } from './modules/peak-finance';")
    globals_setup.append("window.PEAK_FINANCE = { Finance };")
    
    # Wait, peak-app also expects V4, PD_Today, PD_Students, etc.
    # We should add those globals if they exist in window, but since they are scripts in index-vite.html, they will be on window.
    # Just need to make sure React imports are there
    
    new_app_jsx = "import React, { useState, useEffect, useRef, useReducer, useMemo, useCallback, useContext } from 'react';\n"
    new_app_jsx += "\n".join(imports) + "\n\n"
    new_app_jsx += "// Bind them to window so legacy code that expects window.PEAK_* still works\n"
    new_app_jsx += "\n".join(globals_setup) + "\n\n"
    new_app_jsx += "const T = window.V4 ? window.V4.T : {};\n"
    new_app_jsx += "const D = window.PEAK || window.PEAK_FALLBACK || { students: [], kpis: {} };\n\n"
    new_app_jsx += app_body + "\n\n"
    new_app_jsx += "export default App;\n"
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(new_app_jsx)
        
    print("Fixed src/App.jsx successfully.")

if __name__ == '__main__':
    main()
