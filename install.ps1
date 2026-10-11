# install.ps1 --- register this plugin with the desktop DSH profile.
# Run this from the folder that contains it. DSH resolves the link, so the folder must stay
# where it is: moving it afterwards breaks the install.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command dsh -ErrorAction SilentlyContinue)) {
  Write-Host '  dsh was not found on PATH. Run this from a DSH shell, or run manually:' -ForegroundColor Yellow
  Write-Host ('    dsh plugin --profile desktop add link:' + $here)
  exit 1
}

Write-Host ('  installing from ' + $here) -ForegroundColor Cyan
dsh plugin --profile desktop add ('link:' + $here)

Write-Host ''
Write-Host '  Done. Fully quit and restart DSH, then look for the palette button' -ForegroundColor Green
Write-Host '  in the bottom right corner of the window.' -ForegroundColor Green