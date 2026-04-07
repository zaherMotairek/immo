# PowerShell End-to-End API Tests — Owners Module
# Usage (PowerShell):
#   $env:BASE_URL="http://localhost:3000"; $env:TENANT_ID="1"; pwsh ./backend/test/owners.api.tests.ps1
#   Or set at top of this file and run: pwsh ./backend/test/owners.api.tests.ps1

param()

$ErrorActionPreference = "Stop"

# ---- Config ----
$BASE_URL  = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }
$TENANT_ID = if ($env:TENANT_ID) { $env:TENANT_ID } else { "1f575978-2ac6-486a-bd66-e6a1630466e0" }

$dateSuffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

function New-IdempKey([string]$prefix) {
  return "$prefix-$dateSuffix-$(Get-Random -Maximum 999999)"
}

function Invoke-Json {
  param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$false)][hashtable]$Headers,
    [Parameter(Mandatory=$false)]$Body
  )
  $allHeaders = @{
    "x-tenant-id"    = $TENANT_ID
    "Content-Type"   = "application/json"
    "Idempotency-Key"= (New-IdempKey "owners-test")
  }
  if ($Headers) { $Headers.GetEnumerator() | ForEach-Object { $allHeaders[$_.Key] = $_.Value } }

  if ($Body) {
    $json = ($Body | ConvertTo-Json -Depth 10 -Compress)
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $allHeaders -Body $json
  } else {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $allHeaders
  }
}

function Invoke-Text {
  param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$false)][hashtable]$Headers
  )
  $allHeaders = @{
    "x-tenant-id"    = $TENANT_ID
    "Idempotency-Key"= (New-IdempKey "owners-test")
  }
  if ($Headers) { $Headers.GetEnumerator() | ForEach-Object { $allHeaders[$_.Key] = $_.Value } }
  return Invoke-WebRequest -Method $Method -Uri $Url -Headers $allHeaders
}

Write-Host "=== Owners Module API Tests ===" -ForegroundColor Cyan
Write-Host "BASE_URL=$BASE_URL TENANT_ID=$TENANT_ID" -ForegroundColor DarkGray

function Show-ErrorDetail([string]$context, $err) {
  Write-Host ("FAILED: " + $context) -ForegroundColor Red
  if ($err.Exception) {
    Write-Host ("Exception: " + $err.Exception.Message) -ForegroundColor DarkRed
  }
  if ($err.ErrorDetails -and $err.ErrorDetails.Message) {
    Write-Host "ErrorDetails:" -ForegroundColor DarkRed
    Write-Host $err.ErrorDetails.Message
  }
  try {
    $resp = $err.Exception.Response
    if ($resp -and $resp.GetResponseStream) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $respBody = $reader.ReadToEnd()
      if ($respBody) {
        Write-Host "Response body:" -ForegroundColor DarkRed
        Write-Host $respBody
      }
    }
  } catch {}
}

try {
  # --- 1) Create Owner ---
  Write-Host "Step 1: Create Owner" -ForegroundColor Cyan
  $ownerCreate = @{ 
    type = "particulier"      # maps to INDIVIDUAL
    name = "John Doe $dateSuffix"
    contacts = @{ email = "owner$dateSuffix@example.com"; phone = "+3312345678$dateSuffix" }
    address  = @{ line1 = "12 Rue Exemple"; city = "Paris"; country = "FR" }
  }
  try { $owner = Invoke-Json -Method POST -Url "$BASE_URL/v1/owners" -Body $ownerCreate } catch {
    Show-ErrorDetail "POST /v1/owners (variant A)" $_
    Write-Host "Retry with minimal payload (variant B)" -ForegroundColor Yellow
    $ownerCreate = @{ type = "company"; name = "ACME $dateSuffix" }
    try { $owner = Invoke-Json -Method POST -Url "$BASE_URL/v1/owners" -Body $ownerCreate } catch { Show-ErrorDetail "POST /v1/owners (variant B)" $_; throw }
  }
  $OWNER_ID = $owner.id
  if (-not $OWNER_ID) { throw "Owner creation did not return id" }
  Write-Host "Created Owner ID: $OWNER_ID" -ForegroundColor Green

  # --- 2) Get Owner ---
  Write-Host "Step 2: Get Owner" -ForegroundColor Cyan
  try { $ownerFetched = Invoke-Json -Method GET -Url "$BASE_URL/v1/owners/$OWNER_ID" } catch { Show-ErrorDetail "GET /v1/owners/$OWNER_ID" $_; throw }
  Write-Host "Fetched Owner legal_name: $($ownerFetched.legal_name)" -ForegroundColor Green

  # --- 3) List Owners (filters) ---
  Write-Host "Step 3: List Owners" -ForegroundColor Cyan
  try { $ownersList = Invoke-Json -Method GET -Url "$BASE_URL/v1/owners?q=John&type=particulier&page=1&pageSize=10&sort=created_at:desc" } catch { Show-ErrorDetail "GET /v1/owners (filters)" $_; throw }
  Write-Host "Owners list total: $($ownersList.total) page: $($ownersList.page)" -ForegroundColor Green

  # --- 4) Update Owner ---
  Write-Host "Step 4: Update Owner" -ForegroundColor Cyan
  $ownerUpdate = @{ name = "Johnathan Doe $dateSuffix"; contacts = @{ email = "johnathan$dateSuffix@example.com" } }
  try { $ownerUpdated = Invoke-Json -Method PATCH -Url "$BASE_URL/v1/owners/$OWNER_ID" -Body $ownerUpdate } catch { Show-ErrorDetail "PATCH /v1/owners/$OWNER_ID" $_; throw }
  Write-Host "Updated Owner legal_name: $($ownerUpdated.legal_name)" -ForegroundColor Green

  # --- 5) Export Owners CSV ---
  Write-Host "Step 5: Export Owners CSV" -ForegroundColor Cyan
  try { $csvResp = Invoke-Text -Method GET -Url "$BASE_URL/v1/owners/export.csv" } catch { Show-ErrorDetail "GET /v1/owners/export.csv" $_; throw }
  $csvPath = Join-Path $env:TEMP "owners-$dateSuffix.csv"
  $csvResp.Content | Out-File -FilePath $csvPath -Encoding UTF8
  Write-Host "Exported CSV to: $csvPath" -ForegroundColor Green

  # --- 6) Settings (GET/PUT) ---
  Write-Host "Step 6: Get Settings" -ForegroundColor Cyan
  try { $settings = Invoke-Json -Method GET -Url "$BASE_URL/v1/owners/settings" } catch { Show-ErrorDetail "GET /v1/owners/settings" $_; throw }
  Write-Host "Current settings default commission: $($settings.defaults.commissionValue)" -ForegroundColor Green
  $settingsUpdate = @{ defaults = @{ commissionMode = "PERCENT"; commissionValue = 7.5; paymentCycle = "MONTHLY" }; numberingOwner = "OWN-{YYYY}-{SEQ}" }
  Write-Host "Step 6b: Update Settings" -ForegroundColor Cyan
  try { $settingsUpdated = Invoke-Json -Method PUT -Url "$BASE_URL/v1/owners/settings" -Body $settingsUpdate } catch { Show-ErrorDetail "PUT /v1/owners/settings" $_; throw }
  Write-Host "Updated settings default commission: $($settingsUpdated.defaults.commissionValue)" -ForegroundColor Green

  # --- 7) Import CSV (minimal) ---
  Write-Host "Step 7: Import Owners CSV" -ForegroundColor Cyan
  $csvData = "name,type,email,phone`nOwner Import $dateSuffix,particulier,import$dateSuffix@example.com,+33000000001"
  try { $importResult = Invoke-Json -Method POST -Url "$BASE_URL/v1/owners/import-export/import.csv" -Body @{ csvData = $csvData } } catch { Show-ErrorDetail "POST /v1/owners/import-export/import.csv" $_; throw }
  Write-Host "Import CSV: total=$($importResult.total) success=$($importResult.success) errors=$($importResult.errors.Count)" -ForegroundColor Green

  # --- 8) Documents (POST/GET/DELETE) ---
  Write-Host "Step 8: Owner Documents" -ForegroundColor Cyan
  $docCreate = @{ category = "identity"; type = "id_card"; storageUrl = "https://files.example.com/doc-$dateSuffix.pdf"; isPublic = $false }
  try { $doc = Invoke-Json -Method POST -Url "$BASE_URL/v1/owners/documents/$OWNER_ID" -Body $docCreate } catch { Show-ErrorDetail "POST /v1/owners/documents/$OWNER_ID" $_; throw }
  $DOC_ID = $doc.id
  if (-not $DOC_ID) { throw "Document creation did not return id" }
  Write-Host "Uploaded Owner Document ID: $DOC_ID" -ForegroundColor Green
  try { $docsList = Invoke-Json -Method GET -Url "$BASE_URL/v1/owners/documents/$OWNER_ID" } catch { Show-ErrorDetail "GET /v1/owners/documents/$OWNER_ID" $_; throw }
  Write-Host "Documents listed: $($docsList.Count)" -ForegroundColor Green
  try { $docDel = Invoke-Json -Method DELETE -Url "$BASE_URL/v1/owners/documents/$OWNER_ID/$DOC_ID" } catch { Show-ErrorDetail "DELETE /v1/owners/documents/$OWNER_ID/$DOC_ID" $_; throw }
  Write-Host "Deleted document success: $($docDel.success)" -ForegroundColor Green

  # --- 9) Communications (GET/POST) ---
  Write-Host "Step 9: Owner Communications" -ForegroundColor Cyan
  try { $commsList = Invoke-Json -Method GET -Url "$BASE_URL/v1/owners/communications/$OWNER_ID" } catch { Show-ErrorDetail "GET /v1/owners/communications/$OWNER_ID" $_; throw }
  Write-Host "Comm logs total: $($commsList.total)" -ForegroundColor Green
  $commCreate = @{ channel = "email"; toAddress = "owner$dateSuffix@example.com"; templateCode = "WELCOME"; providerId = "mock"; meta = @{ source = "test" } }
  try { $comm = Invoke-Json -Method POST -Url "$BASE_URL/v1/owners/communications/$OWNER_ID" -Body $commCreate } catch { Show-ErrorDetail "POST /v1/owners/communications/$OWNER_ID" $_; throw }
  Write-Host "Logged communication id: $($comm.id)" -ForegroundColor Green

  # --- 10) Analytics (GET performance) ---
  Write-Host "Step 10: Owner Analytics" -ForegroundColor Cyan
  try { $perf = Invoke-Json -Method GET -Url "$BASE_URL/v1/owners/analytics/$OWNER_ID/performance?period=month" } catch { Show-ErrorDetail "GET /v1/owners/analytics/$OWNER_ID/performance" $_; throw }
  Write-Host "Analytics period: $($perf.period.startDate) -> $($perf.period.endDate) revenue.total=$($perf.metrics.revenue.total)" -ForegroundColor Green

  # --- 11) Mandates Bridge (GET/POST/POST renew) ---
  Write-Host "Step 11: Owner Mandates" -ForegroundColor Cyan
  try { $mandates = Invoke-Json -Method GET -Url "$BASE_URL/v1/owners/mandates/$OWNER_ID" } catch { Show-ErrorDetail "GET /v1/owners/mandates/$OWNER_ID" $_; throw }
  Write-Host "Existing mandates: $($mandates.Count)" -ForegroundColor Green
  $mandateCreate = @{ startDate = (Get-Date -Format "yyyy-MM-dd"); endDate = (Get-Date).AddYears(1).ToString("yyyy-MM-dd"); commissionType = "pourcentage"; commissionValue = 8.0 }
  try { $mandate = Invoke-Json -Method POST -Url "$BASE_URL/v1/owners/mandates/$OWNER_ID" -Body $mandateCreate } catch { Show-ErrorDetail "POST /v1/owners/mandates/$OWNER_ID" $_; throw }
  $MANDATE_ID = $mandate.id
  if (-not $MANDATE_ID) { throw "Mandate creation did not return id" }
  Write-Host "Created mandate id: $MANDATE_ID" -ForegroundColor Green
  $mandateRenew = @{ newEndDate = (Get-Date).AddYears(2).ToString("yyyy-MM-dd") }
  try { $mandateR = Invoke-Json -Method POST -Url "$BASE_URL/v1/owners/mandates/$OWNER_ID/$MANDATE_ID/renew" -Body $mandateRenew } catch { Show-ErrorDetail "POST /v1/owners/mandates/$OWNER_ID/$MANDATE_ID/renew" $_; throw }
  Write-Host "Renewed mandate ends_on: $($mandateR.ends_on)" -ForegroundColor Green

  Write-Host "=== Owners API tests completed successfully ===" -ForegroundColor Cyan
}
catch {
  Write-Host "Test failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}


