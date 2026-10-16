# deploy_cloudrun.ps1 — Automated Google Cloud Run Deployment Script for IDOL AVALON LIVE
$ErrorActionPreference = "Stop"

$GcloudBin = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $GcloudBin)) {
  $GcloudBin = "gcloud"
}

$ProjectId = "h2gdm-hack26icn-2666"
$Region = "asia-northeast3"
$ServiceName = "idol-avalon-live"
$AdcPath = "$env:APPDATA\gcloud\application_default_credentials.json"
$TokenFile = "$env:TEMP\idol_avalon_gcp_token.txt"

if (Test-Path $AdcPath) {
  $adc = Get-Content $AdcPath -Raw | ConvertFrom-Json
  $tokenResp = Invoke-RestMethod -Uri "https://oauth2.googleapis.com/token" -Method Post -Body @{
    client_id     = $adc.client_id
    client_secret = $adc.client_secret
    refresh_token = $adc.refresh_token
    grant_type    = "refresh_token"
  }
  [System.IO.File]::WriteAllText($TokenFile, $tokenResp.access_token)
} else {
  Write-Error "ADC file not found at $AdcPath"
}

$ApiKey = ""
if (Test-Path ".env") {
  foreach ($line in (Get-Content ".env")) {
    if ($line -match "^GEMINI_API_KEY=(.+)$") {
      $ApiKey = $Matches[1].Trim()
    }
  }
}

Write-Host "Deploying $ServiceName to Cloud Run ($ProjectId / $Region)..." -ForegroundColor Cyan
try {
  & $GcloudBin run deploy $ServiceName `
    --source . `
    --project $ProjectId `
    --region $Region `
    --allow-unauthenticated `
    --port 8080 `
    --memory 1Gi `
    --set-env-vars "GEMINI_API_KEY=$ApiKey" `
    --access-token-file $TokenFile `
    --quiet
} finally {
  if (Test-Path $TokenFile) {
    Remove-Item $TokenFile -Force -ErrorAction SilentlyContinue
  }
}
