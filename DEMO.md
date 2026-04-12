# Demo Walkthrough

This walkthrough is designed for the HackFusion 2026 `Digital Delta` judging slot.

Goal:
- stay within `10 minutes`
- keep at least `80%` of the critical flow offline
- show the modules that are strongest and easiest to verify live

## Devices And Services

Use:
- `1` laptop for the Go API, chaos simulator, and dashboard
- `2` Android phones with the Expo development build for the mobile app
- optional: one projector or secondary display for the dashboard

Start before judges arrive:

```bash
python services/chaos/chaos_server.py
go run ./services/core/cmd/api -chaos-url http://127.0.0.1:5000
go run ./services/core/cmd/grpcapi -chaos-url http://127.0.0.1:5000
cd apps/dashboard
bun run dev
cd ../mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_COMPUTER_LAN_IP:8080"
npx expo start --dev-client
```

## Demo Story

### 1. Opening Context
Show the dashboard first.

Say:
- this is an offline-first flood logistics system for Sylhet
- the app, routing engine, sync model, and ML artifacts all run locally
- protobuf is the shared contract across app and services

Point at:
- active routes
- blocked edges
- risk overlays
- drone-required zones

### 2. Go Offline
Open both phones.

Do:
1. load the app once on both phones
2. disable Wi-Fi and mobile data for the critical phase
3. keep only local radios needed for peer testing enabled

Say:
- the next steps are performed without internet

### 3. Module 1: Offline Auth
On phone A, open `Auth`.

Show:
1. offline TOTP countdown
2. HOTP generation
3. per-device key fingerprint
4. role switching
5. valid login, invalid login, tamper, verify chain

Call out:
- exact named roles
- per-device Ed25519 key provisioning
- tamper-evident hash-chained auth log

### 4. Module 2: CRDT + Conflict Resolution
On phone A, open `Deliveries`.

Show:
1. `Run Causal`
2. merged vector clock with no conflict
3. `Run Conflict`
4. both values visible
5. `Keep Local` or `Keep Remote`
6. resolution log entry

Say:
- inventory updates carry vector clocks
- concurrent edits surface conflict state explicitly
- resolution decisions are logged

### 5. Module 5: Proof Of Delivery
Stay on `Deliveries`.

Show:
1. `Generate Driver QR`
2. switch role to `camp_commander`
3. `Simulate Recipient Scan`
4. switch back to sender role
5. `Simulate Driver Finalize`
6. receipt chain with previous hash and receipt hash
7. `Replay Challenge` to prove replay rejection

Call out:
- signed challenge
- countersigned response
- replay protection
- receipt chain ready for sync

### 6. Module 2.4 And Module 3: Peer Sync + Mesh
Open `Network` on both phones.

Best case with two devices:
1. `Init Wi-Fi Direct` on both
2. `Discover Peers`
3. connect one phone to the other
4. mutate local inventory differently on each phone
5. `Send Handshake`
6. `Send Delta Bundle`
7. show session summary and merged state

Then show the mesh relay demo:
1. `Create A -> B -> C`
2. set relay offline
3. `Relay Next Hop`
4. set relay online
5. `Relay Next Hop`
6. show ciphertext-only relay view and readable recipient view

Say:
- peer sync uses protobuf packets
- store-and-forward survives relay interruption
- packet inspection shows relay nodes cannot read encrypted payloads

### 7. Module 4, 6, 7, And 8: Decision Engine
Go back to the dashboard and `Command`.

Show:
1. predictive edge risk overlay
2. recommendation cards from the predictive model
3. triage slowdown and autonomous preemption decision
4. hybrid fleet rendezvous result
5. drone-required zone and handoff simulation
6. mesh throttle battery savings panel

Call out:
- route costs are penalized by high-risk predictions
- critical cargo gets preemptive reroute priority
- drone handoff logic activates when road and water access fail

## Timing Guide

- `1 min` intro and dashboard context
- `2 min` offline auth and audit
- `2 min` CRDT conflict flow
- `2 min` PoD handshake and replay rejection
- `2 min` peer sync and mesh relay
- `1 min` predictive routing, triage, and fleet orchestration

## Backup Plan

If live peer transport is unstable:
- still show CRDT merge locally
- show Wi-Fi Direct initialization and peer discovery
- switch to the mesh relay demo
- be explicit that the judged full-credit transport target is two physical Android devices

## Honest Framing

Use these exact phrases if judges ask:
- `The protobuf contracts are committed and shared across the stack.`
- `The strongest fully offline paths today are auth, CRDT conflict handling, PoD, mesh relay logic, and the decision dashboard.`
- `The remaining highest-risk area is the real device-to-device sync transport hardening for final full-credit M2.4 compliance.`
