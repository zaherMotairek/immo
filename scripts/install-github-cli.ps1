# Installe GitHub CLI (gh) pour Windows — utilisateur courant, sans admin.
# Usage : powershell -ExecutionPolicy Bypass -File scripts/install-github-cli.ps1
$ErrorActionPreference = 'Stop'
$version = '2.63.2'
$dest = Join-Path $env:LOCALAPPDATA 'Programs\gh'
$zip = Join-Path $env:TEMP "gh_$version.zip"
$url = "https://github.com/cli/cli/releases/download/v$version/gh_${version}_windows_amd64.zip"

Write-Host "Téléchargement de gh $version…"
if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
  curl.exe -fL --retry 3 --retry-delay 5 -o $zip $url
} else {
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
}

$extract = Join-Path $env:TEMP 'gh-extract'
Remove-Item $extract -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $zip -DestinationPath $extract -Force
$ghExe = Get-ChildItem $extract -Recurse -Filter 'gh.exe' | Select-Object -First 1
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item $ghExe.FullName (Join-Path $dest 'gh.exe') -Force

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$dest*") {
  [Environment]::SetEnvironmentVariable('Path', "$userPath;$dest", 'User')
  $env:Path = "$env:Path;$dest"
}

& (Join-Path $dest 'gh.exe') --version
Write-Host ""
Write-Host "OK — gh installé dans $dest"
Write-Host "Puis : gh auth login"
Write-Host "      gh pr create --base main --head fix/design-polish --fill"