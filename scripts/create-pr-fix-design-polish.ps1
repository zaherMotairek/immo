# Crée la PR fix/design-polish → main (nécessite gh installé et authentifié).
$gh = Join-Path $env:LOCALAPPDATA 'Programs\gh\gh.exe'
if (-not (Test-Path $gh)) {
  $gh = (Get-Command gh -ErrorAction SilentlyContinue).Source
}
if (-not $gh) {
  Write-Error "gh introuvable. Lancez : powershell -File scripts/install-github-cli.ps1 puis gh auth login"
}
$body = @"
## Summary
- Polish UI Prompt 1 : sidebar, recherche mobile, montants F CFA, pluriels, dashboard mobile, barre bas, pages Baux/Paiements
- Rapport : docs/PHASE_DESIGN_POLISH_REPORT.md
- Captures : frontend/e2e/baselines (smoke-screenshots)

## Test plan
- [ ] Accueil mobile : KPI visibles sans scroll excessif
- [ ] Baux / Paiements : filtres repliés, liste accessible
- [ ] Barre bas : onglet Baux actif sur /baux
- [ ] Desktop sidebar : logo ImmoPilot lisible
"@
& $gh pr create --repo zaherMotairek/immo --base main --head fix/design-polish --title "fix(ui): polish design (Prompt 1)" --body $body