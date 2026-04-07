# PowerShell End-to-End API Tests — Tenants Module
# Usage (PowerShell):
#   $env:BASE_URL="http://localhost:3000"; $env:TENANT_ID="1"; pwsh ./backend/test/tenants.api.tests.ps1

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
    "Idempotency-Key"= (New-IdempKey "tenants-test")
  }
  if ($Headers) { $Headers.GetEnumerator() | ForEach-Object { $allHeaders[$_.Key] = $_.Value } }

  if ($Body) {
    $json = ($Body | ConvertTo-Json -Depth 10 -Compress)
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $allHeaders -Body $json
  } else {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $allHeaders
  }
}

Write-Host "=== Tenants Module API Tests ===" -ForegroundColor Cyan
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
  # --- 0) Bootstrap: create a Prospect ---
  Write-Host "Prep: Create Prospect" -ForegroundColor Cyan
  $prospectCreate = @{ type = "PARTICULIER"; name = "Prospect $dateSuffix"; email = "pros$dateSuffix@example.com"; phone = "+33123456789" }
  try { $prospect = Invoke-Json -Method POST -Url "$BASE_URL/v1/tenants/prospects" -Body $prospectCreate } catch { Show-ErrorDetail "POST /v1/tenants/prospects" $_; throw }
  $PROSPECT_ID = $prospect.id; if (-not $PROSPECT_ID) { throw "Prospect creation did not return id" }

  # --- 1) Applications CRUD ---
  Write-Host "Step 1: Applications" -ForegroundColor Cyan
  $appCreate = @{ prospectId = $PROSPECT_ID; notes = "test" }
  try { $app = Invoke-Json -Method POST -Url "$BASE_URL/v1/tenants/applications" -Body $appCreate } catch { Show-ErrorDetail "POST /v1/tenants/applications" $_; throw }
  $APP_ID = $app.id; if (-not $APP_ID) { throw "Application creation did not return id" }
  try { $appFetched = Invoke-Json -Method GET -Url "$BASE_URL/v1/tenants/applications/$APP_ID" } catch { Show-ErrorDetail "GET /v1/tenants/applications/$APP_ID" $_; throw }
  $appUpdate = @{ status = "EN_REVUE" }
  try { $appUpd = Invoke-Json -Method PATCH -Url "$BASE_URL/v1/tenants/applications/$APP_ID" -Body $appUpdate } catch { Show-ErrorDetail "PATCH /v1/tenants/applications/$APP_ID" $_; throw }
  try { $appApprove = Invoke-Json -Method POST -Url "$BASE_URL/v1/tenants/applications/$APP_ID/approve" -Body @{ note = "ok" } } catch { Show-ErrorDetail "POST /v1/tenants/applications/$APP_ID/approve" $_; throw }

  # --- 2) Selection flows ---
  Write-Host "Step 2: Selection" -ForegroundColor Cyan
  try { $reviewList = Invoke-Json -Method GET -Url "$BASE_URL/v1/tenants/selection/review" } catch { Show-ErrorDetail "GET /v1/tenants/selection/review" $_; throw }
  try { $reqDocs = Invoke-Json -Method POST -Url "$BASE_URL/v1/tenants/selection/$APP_ID/request-docs" -Body @{ checklist = @("ID","PROOF") } } catch { Show-ErrorDetail "POST /v1/tenants/selection/$APP_ID/request-docs" $_; throw }

  # --- 3) Screening ---
  Write-Host "Step 3: Screening" -ForegroundColor Cyan
  try { $scr = Invoke-Json -Method POST -Url "$BASE_URL/v1/tenants/screening/$APP_ID/launch" -Body @{ provider = "mock" } } catch { Show-ErrorDetail "POST /v1/tenants/screening/$APP_ID/launch" $_; throw }

  # --- 4) Matching ---
  Write-Host "Step 4: Matching" -ForegroundColor Cyan
  try { $rec = Invoke-Json -Method GET -Url "$BASE_URL/v1/tenants/matching/recommendations?applicationId=$APP_ID" } catch { Show-ErrorDetail "GET /v1/tenants/matching/recommendations" $_; throw }

  # --- 5) Communications ---
  Write-Host "Step 5: Communications" -ForegroundColor Cyan
  try { $comm = Invoke-Json -Method POST -Url "$BASE_URL/v1/tenants/communications" -Body @{ channel = "EMAIL"; to = "pros$dateSuffix@example.com"; template = "WELCOME" } } catch { Show-ErrorDetail "POST /v1/tenants/communications" $_; throw }
  try { $comml = Invoke-Json -Method GET -Url "$BASE_URL/v1/tenants/communications?page=1&pageSize=5" } catch { Show-ErrorDetail "GET /v1/tenants/communications" $_; throw }

  # --- 6) Documents on application ---
  Write-Host "Step 6: Documents" -ForegroundColor Cyan
  $docPayload = @{ category = "identity"; type = "id_card"; storageUrl = "https://files.example.com/app-$dateSuffix.pdf" }
  try { $docUp = Invoke-Json -Method POST -Url "$BASE_URL/v1/tenants/applications/$APP_ID/documents" -Body $docPayload } catch { Show-ErrorDetail "POST /v1/tenants/applications/$APP_ID/documents" $_; throw }
  try { $docList = Invoke-Json -Method GET -Url "$BASE_URL/v1/tenants/applications/$APP_ID/documents?page=1&pageSize=5" } catch { Show-ErrorDetail "GET /v1/tenants/applications/$APP_ID/documents" $_; throw }

  # --- 7) Prospects update/move ---
  Write-Host "Step 7: Prospects Update/Move" -ForegroundColor Cyan
  try { $prosUpd = Invoke-Json -Method PATCH -Url "$BASE_URL/v1/tenants/prospects/$PROSPECT_ID" -Body @{ stage = "QUALIFIE" } } catch { Show-ErrorDetail "PATCH /v1/tenants/prospects/$PROSPECT_ID" $_; throw }
  try { $prosMove = Invoke-Json -Method POST -Url "$BASE_URL/v1/tenants/prospects/$PROSPECT_ID/move" -Body @{ stage = "EN_SUIVI" } } catch { Show-ErrorDetail "POST /v1/tenants/prospects/$PROSPECT_ID/move" $_; throw }

  # --- 8) Tenants settings ---
  Write-Host "Step 8: Tenants Settings" -ForegroundColor Cyan
  try { $tset = Invoke-Json -Method GET -Url "$BASE_URL/v1/tenants/settings" } catch { Show-ErrorDetail "GET /v1/tenants/settings" $_; throw }
  try { $tsetUpd = Invoke-Json -Method PUT -Url "$BASE_URL/v1/tenants/settings" -Body @{ meta_json = @{ source = "test" } } } catch { Show-ErrorDetail "PUT /v1/tenants/settings" $_; throw }

  Write-Host "=== Tenants API tests completed successfully ===" -ForegroundColor Cyan
}
catch {
  Write-Host "Test failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
