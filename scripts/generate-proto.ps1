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
$protocGenGoGrpc = Join-Path $goBin "protoc-gen-go-grpc.exe"
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

if (-not (Test-Path $protocGenGoGrpc)) {
  go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
  if ($LASTEXITCODE -ne 0) {
    $grpcGoRepo = Join-Path $PSScriptRoot ".tools\grpc-go"
    if (Test-Path $grpcGoRepo) {
      Remove-Item -Recurse -Force $grpcGoRepo
    }

    git clone --depth 1 https://github.com/grpc/grpc-go.git $grpcGoRepo
    Push-Location $grpcGoRepo
    try {
      go build -o $protocGenGoGrpc ./cmd/protoc-gen-go-grpc
    }
    finally {
      Pop-Location
    }
  }

  if (-not (Test-Path $protocGenGoGrpc)) {
    throw "protoc-gen-go-grpc could not be installed."
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
    --plugin=protoc-gen-go-grpc=$protocGenGoGrpc `
    --go_out=. `
    --go_opt=module=github.com/Seyamalam/hackfusion_huntrix `
    --go-grpc_out=. `
    --go-grpc_opt=module=github.com/Seyamalam/hackfusion_huntrix `
    proto/common.proto proto/sync.proto proto/routing.proto proto/delivery.proto proto/security.proto proto/analytics.proto
  if ($LASTEXITCODE -ne 0) {
    throw "Go protobuf/gRPC generation failed."
  }

  & $protocPath `
    -I proto `
    --plugin=protoc-gen-es=$esPlugin `
    --es_out=$tsOutDir `
    --es_opt=target=ts `
    proto/common.proto proto/sync.proto proto/routing.proto proto/delivery.proto proto/security.proto proto/analytics.proto
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
