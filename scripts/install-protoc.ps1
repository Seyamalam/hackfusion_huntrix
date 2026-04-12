param(
  [string]$Version = "34.1"
)

$ErrorActionPreference = "Stop"

$toolsRoot = Join-Path $PSScriptRoot ".tools"
$installRoot = Join-Path $toolsRoot "protoc"
$zipPath = Join-Path $toolsRoot "protoc-$Version-win64.zip"
$downloadUrl = "https://github.com/protocolbuffers/protobuf/releases/download/v$Version/protoc-$Version-win64.zip"

New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null

if (-not (Test-Path $zipPath)) {
  Write-Host "Downloading protoc v$Version from $downloadUrl"
  curl.exe -L $downloadUrl -o $zipPath
}

if (Test-Path $installRoot) {
  Remove-Item -Recurse -Force $installRoot
}

New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
Expand-Archive -LiteralPath $zipPath -DestinationPath $installRoot -Force

$protocPath = Join-Path $installRoot "bin\protoc.exe"
if (-not (Test-Path $protocPath)) {
  throw "protoc.exe was not found after extraction."
}

Write-Host "Installed protoc to $protocPath"
