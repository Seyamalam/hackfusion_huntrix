# Huntrix Delta

Offline-first disaster logistics prototype for the HackFusion 2026 `Digital Delta` challenge.

## Current Status
- Expo app shell is in place for command, deliveries, and network views.
- Go scenario loader and routing preview are working.
- Protobuf contracts exist for sync, routing, and delivery flows.
- Chaos simulator is integrated under `services/chaos/`.
- The restored problem statement makes `M1` and `M2` stricter than our earlier shorthand summary, especially real device-to-device sync for `M2.4`.

## Todo/Task
- [x] Bootstrap Expo, Go, and protobuf project structure
- [x] Add first-pass architecture notes and diagrams
- [x] Add shared Sylhet scenario data
- [x] Add Go scenario loader and constrained routing preview
- [x] Integrate Python chaos simulator into repo structure
- [x] Bridge chaos API output into the Go routing preview
- [x] Expose routing through a lightweight Go HTTP API
- [x] Replace the command and network views with live backend fetches
- [x] Generate Go and TypeScript code from `.proto` files
- [x] Generate Go gRPC service stubs and add a first gRPC server
- [x] Add a real gRPC `ComputeRoute` smoke path and client
- [ ] Implement offline TOTP/HOTP auth flow with expiry/regeneration demo
- [ ] Implement per-device key provisioning plus tamper-evident auth logs
- [ ] Enforce the exact RBAC roles from the restored statement
- [ ] Implement CRDT inventory entries with vector clocks and conflict UI
- [ ] Replace simulated sync with actual Bluetooth or Wi-Fi Direct delta sync
- [ ] Replace the remaining mobile mock data with scenario-backed live data
- [ ] Add `DEMO.md`, model card, and submission assets

## Scope Correction
The restored Module 1 and Module 2 page changes the plan in one important way:
- simulated sync is no longer enough for full credit on `M2.4`
- auth is no longer generic offline login; it needs offline `TOTP/HOTP`, per-device keys, exact RBAC roles, and tamper-evident auth logs

The repo architecture still stands, but the implementation priority changes:
1. real on-device sync transport moves up
2. auth and audit logging move up
3. “simulated later” assumptions for `M2` are no longer valid if we want full marks

## Repo Layout
```text
apps/mobile        Expo client
services/core      Go routing and system logic
services/chaos     Python chaos simulator
proto              Shared protobuf contracts
data               Scenario fixtures
docs               Architecture and supporting docs
ml                 Training and model artifacts
```

## Commands

### Mobile
```bash
cd apps/mobile
bun install
bun run start
bun run web
bunx tsc --noEmit
```

If the app is running on a physical phone, set the backend host explicitly:
```bash
cd apps/mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_COMPUTER_LAN_IP:8080"
bun run start
```

### Go Core
```bash
go test ./services/core/...
go run ./services/core/cmd/scenario
go run ./services/core/cmd/scenario -chaos-url http://127.0.0.1:5000
go run ./services/core/cmd/api
go run ./services/core/cmd/api -chaos-url http://127.0.0.1:5000
go run ./services/core/cmd/grpcapi
go run ./services/core/cmd/grpcapi -chaos-url http://127.0.0.1:5000
go run ./services/core/cmd/grpcclient
go run ./services/core/cmd/grpcclient -vehicle speedboat
```

### Chaos Simulator
```bash
python -m pip install -r services/chaos/requirements.txt
python services/chaos/chaos_server.py
```

### Protobuf Codegen
```bash
powershell -ExecutionPolicy Bypass -File scripts/install-protoc.ps1
powershell -ExecutionPolicy Bypass -File scripts/generate-proto.ps1
```

If Go dependency fetch is blocked on your network, the generator still emits the `.pb.go` and `.ts` files, but `go mod tidy` may need to be retried later.

