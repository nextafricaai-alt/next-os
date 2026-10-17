# Audit C7 — move personal-data files OUT of the repo (into a private folder
# next to it) and stop git tracking them. Nothing is deleted.
#
# Preview first (changes nothing):
#   powershell -ExecutionPolicy Bypass -File tools\c7-move-private-data.ps1
# Then do it:
#   powershell -ExecutionPolicy Bypass -File tools\c7-move-private-data.ps1 -Apply
param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$repo    = Split-Path -Parent $PSScriptRoot
$private = Join-Path (Split-Path -Parent $repo) 'next-os-PRIVATE-DATA'
$list    = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'c7-purge-paths.txt') | Where-Object { $_.Trim() -ne '' }
Set-Location -LiteralPath $repo
if ($Apply) { New-Item -ItemType Directory -Force -Path $private | Out-Null }
$moved = 0; $missing = 0
foreach ($rel in $list) {
  $src = Join-Path $repo ($rel -replace '/', '\')
  if (-not (Test-Path -LiteralPath $src)) { Write-Host "  not found   $rel"; $missing++; continue }
  $dest = Join-Path $private ($rel -replace '[\\/]', '__')
  if ($Apply) {
    git rm --cached --quiet --ignore-unmatch -- "$rel"
    Move-Item -LiteralPath $src -Destination $dest -Force
    Write-Host "  moved       $rel"
  } else {
    Write-Host "  would move  $rel  ->  $dest"
  }
  $moved++
}
Write-Host ""
if ($Apply) {
  Write-Host "Moved $moved file(s) to $private ($missing not found)."
  Write-Host "Next: git status   then   git commit -m `"privacy: remove personal data files from repo (audit C7)`""
} else {
  Write-Host "Preview only: $moved file(s) would move to $private ($missing not found). Re-run with -Apply."
}
