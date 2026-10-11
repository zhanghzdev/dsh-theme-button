# pack.ps1 --- build a clean, shippable zip.
# Only the files package.json declares are copied, so dev material under _dev/ can never
# end up in a release.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pkg = Get-Content (Join-Path $root 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$out = Join-Path $root 'dist'
$stage = Join-Path $out 'dsh-theme-button'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'lib') | Out-Null

# package.json is never listed in its own "files" (npm adds it implicitly), but a bundle
# without it cannot be identified or loaded at all, so it is copied explicitly here.
Copy-Item (Join-Path $root 'package.json') $stage -Force

foreach ($f in $pkg.files) {
  $src = Join-Path $root $f
  if (-not (Test-Path $src)) { Write-Host ("  ! missing, skipped: " + $f) -ForegroundColor Yellow; continue }
  Copy-Item $src $stage -Recurse -Force
}
# lib/ is copied whole, so strip anything that is not shipped source.
Get-ChildItem (Join-Path $stage 'lib') -File | Where-Object { $_.Name -notin @('index.js','client.js') } | Remove-Item -Force

$zip = Join-Path $out ('dsh-theme-button-' + $pkg.version + '.zip')
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host ''
Write-Host ('  packed ' + $pkg.name + ' ' + $pkg.version) -ForegroundColor Green
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($zip)
foreach ($e in $z.Entries) { Write-Host ('    {0,9}  {1}' -f $e.Length, $e.FullName) }
$z.Dispose()
Write-Host ('  -> ' + $zip + '  (' + [math]::Round((Get-Item $zip).Length/1KB,1) + ' KB)') -ForegroundColor Green