param(
  [string]$ProtoVersion = "34.1"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$protocPath = Join-Path $PSScriptRoot ".tools\protoc\bin\protoc.exe"

if (-not (Test-Path $protocPath)) {
  & (Join-Path $PSScriptRoot "install-protoc.ps1") -Version $ProtoVersion
}

$goBin = Join-Path (go env GOPATH) "bin"
$protocGenGo = Join-Path $goBin "protoc-gen-go.exe"
if (-not (Test-Path $protocGenGo)) {
  go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
  if ($LASTEXITCODE -ne 0) {
    $protobufGoRepo = Join-Path $PSScriptRoot ".tools\protobuf-go"
    if (Test-Path $protobufGoRepo) {
      Remove-Item -Recurse -Force $protobufGoRepo
    }

    git clone --depth 1 https://github.com/protocolbuffers/protobuf-go.git $protobufGoRepo
    Push-Location $protobufGoRepo
    try {
      go build -o $protocGenGo ./cmd/protoc-gen-go
    }
    finally {
      Pop-Location
    }
  }

  if (-not (Test-Path $protocGenGo)) {
    throw "protoc-gen-go could not be installed."
  }
}

$mobileDir = Join-Path $repoRoot "apps\mobile"
$esPlugin = Join-Path $mobileDir "node_modules\.bin\protoc-gen-es.exe"
if (-not (Test-Path $esPlugin)) {
  Push-Location $mobileDir
  try {
    bun add -d @bufbuild/protoc-gen-es @bufbuild/protobuf
  }
  finally {
    Pop-Location
  }
}

$goOutDir = Join-Path $repoRoot "proto\gen\go"
$tsOutDir = Join-Path $mobileDir "src\gen"

New-Item -ItemType Directory -Force -Path $goOutDir | Out-Null
New-Item -ItemType Directory -Force -Path $tsOutDir | Out-Null

Push-Location $repoRoot
try {
  & $protocPath `
    -I proto `
    --plugin=protoc-gen-go=$protocGenGo `
    --go_out=. `
    --go_opt=module=github.com/Seyamalam/hackfusion_huntrix `
    proto/common.proto proto/sync.proto proto/routing.proto proto/delivery.proto
  if ($LASTEXITCODE -ne 0) {
    throw "Go protobuf generation failed."
  }

  & $protocPath `
    -I proto `
    --plugin=protoc-gen-es=$esPlugin `
    --es_out=$tsOutDir `
    --es_opt=target=ts `
    proto/common.proto proto/sync.proto proto/routing.proto proto/delivery.proto
  if ($LASTEXITCODE -ne 0) {
    throw "TypeScript protobuf generation failed."
  }
}
finally {
  Pop-Location
}

Push-Location $repoRoot
try {
  go mod tidy
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "go mod tidy could not fetch google.golang.org/protobuf on this network. Generated files were still emitted."
  }
}
finally {
  Pop-Location
}

Write-Host "Generated Go protobuf code in $goOutDir"
Write-Host "Generated TypeScript protobuf code in $tsOutDir"
