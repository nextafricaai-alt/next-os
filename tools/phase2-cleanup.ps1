# Phase 2 clean-up: removes old copies and the abandoned Vite prototype from
# the school app folder. Nothing here is used by any current page (checked
# 17 Oct 2026). Files stay in git history if ever needed.
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File tools\phase2-cleanup.ps1
$base = "web/prototypes/schools/peak-primary"
$items = @(
  "teacher-view.jsx", "head-staff-panel.jsx", "head-timetable-panel.jsx", "role-router.jsx",
  "driver-view.jsx", "transport-telemetry.js", "head-transport-panel.jsx",
  "kabs-lily-timetable-data.js", "kabs_lily_timetable.csv",
  "bursar-dashboard.html.bak", "bursar-view.jsx.bak",
  "headteacher-dashboard.html", "headteacher-view.jsx", "school-data-store.js",
  "index-vite.html", "vite.config.js", "package.json", "package-lock.json",
  "extract_babel.py", "extract.py", "extract2.py", "fix_app.py", "parse-map.js",
  "src"
)
foreach ($i in $items) {
  $p = "$base/$i"
  if (Test-Path $p) {
    git rm -r --quiet -- "$p" 2>$null
    if (Test-Path $p) { Remove-Item -Recurse -Force $p }
    Write-Host "removed $p"
  }
}
Write-Host "Done. Review with: git status"
