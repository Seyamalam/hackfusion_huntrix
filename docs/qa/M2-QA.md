# M2 QA

## Goal
Validate `Module 2 - Distributed DB & CRDT Sync` against the official problem statement.

Targets:
- `M2.1` CRDT-based inventory model
- `M2.2` vector clock / causal ordering
- `M2.3` conflict visualization and resolution
- `M2.4` actual device-to-device delta sync

## Test Environments

### Best Case
- `2` physical Android devices
- both running development builds
- both on the same local environment

### Acceptable for Partial Validation
- `1` physical Android device
- local HTTP/Go stack for API-assisted state checks

### Not Valid for Final M2.4 Proof
- Android emulator for Wi-Fi Direct peer transport
- Expo Go for BLE/Wi-Fi Direct transport

Reason:
- emulator does not give you real radio-based peer-to-peer transport in a way that is credible for judging
- Expo Go does not support the custom native modules used for transport

## Required Setup

### Backend
```bash
python services/chaos/chaos_server.py
go run ./services/core/cmd/api -chaos-url http://127.0.0.1:5000
```

### Mobile Dev Build
```bash
cd apps/mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_COMPUTER_LAN_IP:8080"
npx expo start --dev-client
```

For native build distribution:
```bash
cd apps/mobile
eas build -p android --profile development
```

## M2.1 CRDT Inventory Model

### Expected Behavior
- inventory entry exists locally
- concurrent edits on different replicas can be merged
- merged state is deterministic

### Manual Steps
1. Open `Deliveries`.
2. Press `Run Conflict`.
3. Observe a conflict state with conflicting fields.
4. Press `Keep Local`.
5. Repeat and press `Keep Remote`.

### Pass Criteria
- conflict appears on concurrent edits
- both competing values are visible
- one resolution choice clears the conflict cleanly
- resolution is logged

## M2.2 Vector Clock / Causal Ordering

### Expected Behavior
- causal writes preserve ordering
- if `B` writes after reading `A`, merged order reflects that

### Manual Steps
1. Open `Deliveries`.
2. Press `Run Causal`.
3. Inspect the vector clock shown in the merged state.
4. Confirm no conflict is shown.

### Pass Criteria
- causal scenario merges without conflict
- merged state reflects the later causally-descended write
- vector clock is visible and non-empty

## M2.3 Conflict Visualization & Resolution

### Expected Behavior
- UI surfaces genuine concurrent conflict
- local and remote values are both shown
- resolution decision is logged

### Manual Steps
1. Open `Deliveries`.
2. Press `Run Conflict`.
3. Read the conflict cards.
4. Resolve with `Keep Local` or `Keep Remote`.
5. Inspect `Resolution Log`.

### Pass Criteria
- conflict cards list field name and both values
- after choosing a resolution, conflict clears
- resolution log gains a new entry

## M2.4 Actual Device-to-Device Delta Sync

### Current Implementation Scope
- Android-first `Wi‑Fi Direct` transport candidate
- BLE remains discovery/readiness only
- actual sync payloads now include protobuf RPC frames aligned with `SyncService`
  - mesh handshake frame for peer clock exchange
  - `ExchangeBundleRequest`
  - `ExchangeBundleResponse`
  - `PullPendingRequest`
  - `PullPendingResponse`
  - local inventory mutation and merge/apply summary

### Two-Device Test Steps
1. Install the dev build on both Android phones.
2. Open `Network` on both devices.
3. Press `Init Wi‑Fi Direct` on both.
4. Press `Discover Peers` on both.
5. On one device, connect to the discovered peer.
6. On each device, mutate local inventory differently:
   - `+10 Qty` or `-10 Qty`
   - `Set P0` or `Set P3`
7. Press `Send Handshake`.
8. Press `Send Delta Bundle`.
9. Press `Pull Pending`.
9. Observe:
   - `Session Log`
   - `Last handshake`
   - `Known peer clock`
   - `Accepted ops`
   - `Rejected ops`
   - `Records in bundle`
   - `Merged records`
   - `Conflicts`

### Pass Criteria
- two real devices discover each other
- connection succeeds
- handshake is exchanged
- `ExchangeBundleRequest` is sent
- `ExchangeBundleResponse` is returned
- `PullPendingRequest` / `PullPendingResponse` are exchanged
- receiving side applies bundle and updates local state
- session summary updates with payload size and merge/conflict counts

## One-Device Testing

With only one physical Android device, you can still validate:
- native transport initialization
- peer discovery UI flow
- local mutation behavior
- payload construction logic
- session log rendering

You cannot honestly claim full `M2.4` completion from one device alone.

## Emulator Answer

Using `1` physical Android device plus `1` Android Studio emulator is fine for:
- UI checks
- non-radio app flows
- some native module smoke checks

It is **not** a credible final test for:
- Wi‑Fi Direct peer-to-peer transport
- BLE peer transport

For the final hackathon demo, plan around `2` physical Android devices.

## Evidence to Capture
- screenshot of causal merge with vector clock visible
- screenshot of conflict state showing both values
- screenshot of resolution log
- screenshot/video of two-device Wi‑Fi Direct peer discovery
- screenshot/video of handshake + `ExchangeBundle` send/apply
- screenshot/video of `PullPending` response
- payload byte count shown in session summary

## Current Honest Status
- `M2.1`: implemented
- `M2.2`: implemented
- `M2.3`: implemented
- `M2.4`: close, but final proof still requires two physical Android devices

## Honest Transport Note

The Wi‑Fi Direct peer channel now carries protobuf RPC frames aligned with the `SyncService` request and response messages.

It is still not a full on-device HTTP/2 gRPC server/client stack.

For judging, be precise:
- protobuf service messages: yes
- actual peer-to-peer radio path: yes
- full native gRPC transport semantics on both phones: not yet
