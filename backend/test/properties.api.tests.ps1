# PowerShell End-to-End API Tests — Properties Module
# Usage (PowerShell):
#   $env:BASE_URL="http://localhost:3000"; $env:TENANT_ID="1"; pwsh ./backend/test/properties.api.tests.ps1
#   Or set at top of this file and run: pwsh ./backend/test/properties.api.tests.ps1

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
    "Idempotency-Key"= (New-IdempKey "props-test")
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
    "Idempotency-Key"= (New-IdempKey "props-test")
  }
  if ($Headers) { $Headers.GetEnumerator() | ForEach-Object { $allHeaders[$_.Key] = $_.Value } }
  return Invoke-WebRequest -Method $Method -Uri $Url -Headers $allHeaders
}

Write-Host "=== Properties Module API Tests ===" -ForegroundColor Cyan
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
  # --- 0) Pre-req: Create an Owner for property linkage ---
  Write-Host "Prep: Create Owner" -ForegroundColor Cyan
  $ownerCreate = @{ type = "company"; name = "PropOwner $dateSuffix" }
  try { $owner = Invoke-Json -Method POST -Url "$BASE_URL/v1/owners" -Body $ownerCreate } catch { Show-ErrorDetail "POST /v1/owners (prep)" $_; throw }
  $OWNER_ID = $owner.id; if (-not $OWNER_ID) { throw "Owner creation did not return id" }

  # --- 1) Create Property ---
  Write-Host "Step 1: Create Property" -ForegroundColor Cyan
  $propertyCreate = @{ type = "BUILDING"; ownerId = $OWNER_ID; name = "Prop $dateSuffix"; location = @{ address = "1 Rue Test"; city = "Paris"; district = "1er" } }
  try { $prop = Invoke-Json -Method POST -Url "$BASE_URL/v1/properties" -Body $propertyCreate } catch { Show-ErrorDetail "POST /v1/properties" $_; throw }
  $PROP_ID = $prop.id; if (-not $PROP_ID) { throw "Property creation did not return id" }
  Write-Host "Created Property ID: $PROP_ID" -ForegroundColor Green

  # --- 2) Get Property ---
  Write-Host "Step 2: Get Property" -ForegroundColor Cyan
  try { $propFetched = Invoke-Json -Method GET -Url "$BASE_URL/v1/properties/$PROP_ID" } catch { Show-ErrorDetail "GET /v1/properties/$PROP_ID" $_; throw }
  Write-Host "Fetched property type: $($propFetched.type) city: $($propFetched.city)" -ForegroundColor Green

  # --- 3) List Properties (filters) ---
  Write-Host "Step 3: List Properties" -ForegroundColor Cyan
  try { $propsList = Invoke-Json -Method GET -Url "$BASE_URL/v1/properties?q=Prop&type=BUILDING&city=Paris&page=1&pageSize=10&sort=created_at:desc" } catch { Show-ErrorDetail "GET /v1/properties (filters)" $_; throw }
  Write-Host "Properties list total: $($propsList.total) page: $($propsList.page)" -ForegroundColor Green

  # --- 4) Update Property ---
  Write-Host "Step 4: Update Property" -ForegroundColor Cyan
  $propertyUpdate = @{ name = "Prop Updated $dateSuffix"; geo = @{ lat = 48.85; lng = 2.35 } }
  try { $propUpdated = Invoke-Json -Method PATCH -Url "$BASE_URL/v1/properties/$PROP_ID" -Body $propertyUpdate } catch { Show-ErrorDetail "PATCH /v1/properties/$PROP_ID" $_; throw }
  Write-Host "Updated property name: $($propUpdated.name)" -ForegroundColor Green

  # --- 5) Export Properties CSV ---
  Write-Host "Step 5: Export Properties CSV" -ForegroundColor Cyan
  try { $csvResp = Invoke-Text -Method GET -Url "$BASE_URL/v1/properties/export.csv" } catch { Show-ErrorDetail "GET /v1/properties/export.csv" $_; throw }
  $csvPath = Join-Path $env:TEMP "properties-$dateSuffix.csv"
  $csvResp.Content | Out-File -FilePath $csvPath -Encoding UTF8
  Write-Host "Exported CSV to: $csvPath" -ForegroundColor Green

  # --- 6) Units (POST/GET/PATCH/POST reserve) ---
  Write-Host "Step 6: Units CRUD" -ForegroundColor Cyan
  $unitCreate = @{ unitNumber = "A$dateSuffix"; type = "APARTMENT"; area = 45; baseRentCents = 85000; currency = "EUR"; status = "LIBRE" }
  try { $unit = Invoke-Json -Method POST -Url "$BASE_URL/v1/properties/$PROP_ID/units" -Body $unitCreate } catch { Show-ErrorDetail "POST /v1/properties/$PROP_ID/units" $_; throw }
  $UNIT_ID = $unit.id; if (-not $UNIT_ID) { throw "Unit creation did not return id" }
  try { $unitsList = Invoke-Json -Method GET -Url "$BASE_URL/v1/properties/$PROP_ID/units?page=1&pageSize=5" } catch { Show-ErrorDetail "GET /v1/properties/$PROP_ID/units" $_; throw }
  Write-Host "Units list count: $($unitsList.items.Count)" -ForegroundColor Green
  try { $unitFetched = Invoke-Json -Method GET -Url "$BASE_URL/v1/units/$UNIT_ID" } catch { Show-ErrorDetail "GET /v1/units/$UNIT_ID" $_; throw }
  $unitUpdate = @{ floor = "1" }
  try { $unitUpdated = Invoke-Json -Method PATCH -Url "$BASE_URL/v1/units/$UNIT_ID" -Body $unitUpdate } catch { Show-ErrorDetail "PATCH /v1/units/$UNIT_ID" $_; throw }
  $reserveDto = @{ start = (Get-Date).ToString("yyyy-MM-dd"); end = (Get-Date).AddDays(7).ToString("yyyy-MM-dd"); notes = "visit" }
  try { $unitRes = Invoke-Json -Method POST -Url "$BASE_URL/v1/units/$UNIT_ID/reservations" -Body $reserveDto } catch { Show-ErrorDetail "POST /v1/units/$UNIT_ID/reservations" $_; throw }
  Write-Host "Unit reserved result ok" -ForegroundColor Green

  # --- 7) Documents (POST/GET/DELETE) ---
  Write-Host "Step 7: Property Documents" -ForegroundColor Cyan
  $docCreate = @{ category = "brochure"; type = "pdf"; storageUrl = "https://files.example.com/prop-$dateSuffix.pdf"; isPublic = $true }
  try { $doc = Invoke-Json -Method POST -Url "$BASE_URL/v1/properties/$PROP_ID/documents" -Body $docCreate } catch { Show-ErrorDetail "POST /v1/properties/$PROP_ID/documents" $_; throw }
  $DOC_ID = $doc.id; if (-not $DOC_ID) { throw "Document creation did not return id" }
  try { $docsList = Invoke-Json -Method GET -Url "$BASE_URL/v1/properties/$PROP_ID/documents?page=1&pageSize=5" } catch { Show-ErrorDetail "GET /v1/properties/$PROP_ID/documents" $_; throw }
  Write-Host "Documents listed: $($docsList.Count)" -ForegroundColor Green
  try { $docDel = Invoke-Json -Method DELETE -Url "$BASE_URL/v1/properties/$PROP_ID/documents/$DOC_ID" } catch { Show-ErrorDetail "DELETE /v1/properties/$PROP_ID/documents/$DOC_ID" $_; throw }
  Write-Host "Deleted document success: $($docDel.success)" -ForegroundColor Green

  # --- 8) Analytics (GET) ---
  Write-Host "Step 8: Property Analytics" -ForegroundColor Cyan
  try { $occ = Invoke-Json -Method GET -Url "$BASE_URL/v1/properties/$PROP_ID/analytics/unit-occupancy" } catch { Show-ErrorDetail "GET /v1/properties/$PROP_ID/analytics/unit-occupancy" $_; throw }
  try { $rentPerf = Invoke-Json -Method GET -Url "$BASE_URL/v1/properties/$PROP_ID/analytics/rent-performance" } catch { Show-ErrorDetail "GET /v1/properties/$PROP_ID/analytics/rent-performance" $_; throw }
  Write-Host "Analytics ok" -ForegroundColor Green

  # --- 9) Availability (GET calendar / POST reserve-any) ---
  Write-Host "Step 9: Property Availability" -ForegroundColor Cyan
  try { $cal = Invoke-Json -Method GET -Url "$BASE_URL/v1/properties/$PROP_ID/availability/calendar" } catch { Show-ErrorDetail "GET /v1/properties/$PROP_ID/availability/calendar" $_; throw }
  $reserveAny = @{ start = (Get-Date).ToString("yyyy-MM-dd"); end = (Get-Date).AddDays(3).ToString("yyyy-MM-dd"); notes = "open viewing" }
  try { $resAny = Invoke-Json -Method POST -Url "$BASE_URL/v1/properties/$PROP_ID/availability/reserve" -Body $reserveAny } catch { Show-ErrorDetail "POST /v1/properties/$PROP_ID/availability/reserve" $_; throw }
  Write-Host "Availability reserve ok" -ForegroundColor Green

  # --- 10) Settings (GET/PUT) ---
  Write-Host "Step 10: Property Settings" -ForegroundColor Cyan
  try { $settings = Invoke-Json -Method GET -Url "$BASE_URL/v1/properties/settings" } catch { Show-ErrorDetail "GET /v1/properties/settings" $_; throw }
  $settingsUpdate = @{ period_days_default = 30; kpis_enabled = @("occupancy","revenue"); portfolio_scope_enabled = $true; meta_json = @{ source = "test" } }
  try { $settingsUpdated = Invoke-Json -Method PUT -Url "$BASE_URL/v1/properties/settings" -Body $settingsUpdate } catch { Show-ErrorDetail "PUT /v1/properties/settings" $_; throw }
  Write-Host "Settings updated ok" -ForegroundColor Green

  # --- 11) Import/Export (CSV) ---
  Write-Host "Step 11: Properties Import/Export" -ForegroundColor Cyan
  $csvData = "name,type,owner,city`nProp Import $dateSuffix,BUILDING,$OWNER_ID,Paris"
  try { $importResult = Invoke-Json -Method POST -Url "$BASE_URL/v1/properties/import.csv" -Body @{ csv = $csvData } } catch { Show-ErrorDetail "POST /v1/properties/import.csv" $_; throw }
  Write-Host "Import CSV: total=$($importResult.total) success=$($importResult.success) errors=$($importResult.errors.Count)" -ForegroundColor Green
  try { $propsCsv = Invoke-Text -Method GET -Url "$BASE_URL/v1/properties/export.csv" } catch { Show-ErrorDetail "GET /v1/properties/export.csv (again)" $_; throw }
  Write-Host "Export CSV ok" -ForegroundColor Green

  Write-Host "=== Properties API tests completed successfully ===" -ForegroundColor Cyan
}
catch {
  Write-Host "Test failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
