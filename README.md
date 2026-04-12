# Huntrix Delta

Offline-first disaster logistics prototype for the HackFusion 2026 `Digital Delta` challenge.

## Current Status
- Expo app shell is in place for command, deliveries, and network views.
- Go scenario loader and routing preview are working.
- Protobuf contracts exist for sync, routing, and delivery flows.
- Chaos simulator is integrated under `services/chaos/`.

## Todo/Task
- [x] Bootstrap Expo, Go, and protobuf project structure
- [x] Add first-pass architecture notes and diagrams
- [x] Add shared Sylhet scenario data
- [x] Add Go scenario loader and constrained routing preview
- [x] Integrate Python chaos simulator into repo structure
- [x] Bridge chaos API output into the Go routing preview
- [x] Expose routing through a lightweight Go HTTP API
- [x] Replace the command and network views with live backend fetches
- [ ] Generate Go and TypeScript code from `.proto` files
- [ ] Replace the remaining mobile mock data with scenario-backed live data
- [ ] Add `DEMO.md`, model card, and submission assets

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
```

### Chaos Simulator
```bash
python -m pip install -r services/chaos/requirements.txt
python services/chaos/chaos_server.py
```

