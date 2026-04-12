param(
  [string]$Targets = "scripts/loadtest/vegeta-targets.txt",
  [string]$Results = "docs/compliance/c2_vegeta_results.bin",
  [string]$Report = "docs/compliance/C2-loadtest.md",
  [string]$Duration = "10s",
  [string]$Rate = "10000/s"
)

$ErrorActionPreference = "Stop"

$null = & (Join-Path $PSScriptRoot "install-vegeta.ps1")
$vegeta = Join-Path (Join-Path (go env GOPATH) "bin") "vegeta.exe"

& $vegeta attack -insecure -targets $Targets -rate $Rate -duration $Duration -workers 512 -max-workers 1024 -connections 2048 -output $Results > $null
$null = & $vegeta report $Results
$summary = & $vegeta report -type text $Results

$content = @(
  "# C2 Load Test",
  "",
  "Tool: vegeta",
  "",
  "Targets: $Targets",
  "",
  "Rate: $Rate",
  "",
  "Duration: $Duration",
  "",
  "Report:",
  "",
  "-----",
  "$summary",
  "-----"
) -join [Environment]::NewLine

Set-Content -Path $Report -Value $content
Write-Host "Wrote $Report"
