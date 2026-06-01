param(
  [string]$InstallDir = "C:\Program Files\NEXT OS\sentinel",
  [string]$DbPath = "C:\ProgramData\NEXT OS\sentinel\sentinel.db"
)

$exe = Join-Path $InstallDir "sentinel-daemon.exe"
New-Item -ItemType Directory -Force -Path (Split-Path $DbPath) | Out-Null
[Environment]::SetEnvironmentVariable("NEXT_SENTINEL_DB", $DbPath, "Machine")

if (-not (Get-Service -Name "NEXTSentinel" -ErrorAction SilentlyContinue)) {
  New-Service -Name "NEXTSentinel" -BinaryPathName "`"$exe`"" -DisplayName "NEXT Sentinel" -StartupType Automatic
}
Start-Service -Name "NEXTSentinel"

