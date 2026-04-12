$ErrorActionPreference = "Stop"

$goBin = Join-Path (go env GOPATH) "bin"
$vegeta = Join-Path $goBin "vegeta.exe"

if (-not (Test-Path $vegeta)) {
  go install github.com/tsenart/vegeta@latest
}

if (-not (Test-Path $vegeta)) {
  throw "vegeta could not be installed."
}

Write-Host $vegeta
