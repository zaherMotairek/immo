# Repousse fix/design-polish, docs/marketing-brochure et tente gh pr create (max 12 essais).
$ErrorActionPreference = 'Continue'
$repo = 'c:\Users\zaher\Desktop\immo'
$gh = "$env:LOCALAPPDATA\Programs\gh\gh.exe"
Set-Location $repo

for ($i = 1; $i -le 12; $i++) {
  Write-Host "=== Essai $i / 12 ==="
  $ok = $true
  git push origin fix/design-polish 2>&1 | ForEach-Object { Write-Host $_; if ($_ -match 'fatal:') { $ok = $false } }
  if ($ok) {
    git push -u origin docs/marketing-brochure 2>&1 | ForEach-Object { Write-Host $_; if ($_ -match 'fatal:') { $ok = $false } }
  }
  if ($ok -and (Test-Path $gh)) {
    & $gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      & powershell -File "$repo\scripts\create-pr-fix-design-polish.ps1"
      exit 0
    }
  }
  if ($ok) {
    Write-Host 'Push OK — ouvrez la PR : https://github.com/zaherMotairek/immo/compare/main...fix/design-polish'
    Start-Process 'https://github.com/zaherMotairek/immo/compare/main...fix/design-polish?expand=1'
    exit 0
  }
  Start-Sleep -Seconds 30
}
Write-Error 'GitHub toujours injoignable après 12 essais.'
exit 1