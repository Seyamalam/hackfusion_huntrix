# D2 Checklist

Judge-facing runbook for:

`D2 - Working Prototype Demo`

Must show within `10 minutes`:
- offline sync with `2` devices
- route recalculation on failure injection
- PoD handshake
- triage preemption

## Devices

Use:
- `1` laptop
- `2` Android phones

## Servers To Start

Terminal 1:
```bash
python services/chaos/chaos_server.py
```

Terminal 2:
```bash
go run ./services/core/cmd/api -chaos-url http://127.0.0.1:5000
```

Terminal 3:
```bash
cd apps/dashboard
bun run dev
```

Optional for dev-build mobile workflow:
```bash
cd apps/mobile
npx expo start --dev-client
```

## Before Judges Arrive

1. Open the app on both phones.
2. Open the settings gear on both phones.
3. Set API host to:
   - `http://YOUR_LAPTOP_IP:8080`
4. Tap `Health Check` on both phones.
5. On both phones, open `Auth`.
6. Set role to `sync_admin` for the sync demo.
7. Open the dashboard on the laptop.

Optional reset before a clean run:
```bash
curl.exe -X POST "http://127.0.0.1:5000/api/network/reset"
```

## Demo Order

### 1. Offline Sync With 2 Phones

On both phones:
1. Open `Network`
2. Tap `Init Wi-Fi Direct`
3. Tap `Discover Peers`
4. Connect one phone to the other

Mutate state:
- Phone A:
  - `+10 Qty`
  - `Set P0`
- Phone B:
  - `-10 Qty`
  - `Set P3`

Then:
1. Tap `Send Handshake` on both
2. Tap `Send Delta Bundle` on both
3. Tap `Pull Pending` on both

Show:
- `Judge Proof` card
- `Session Summary`
- `Known peer clock`
- merge/conflict counts
- payload bytes

### 2. Route Recalculation On Failure

On the laptop:
1. Show the dashboard map first
2. In another terminal run:

```bash
curl.exe "http://127.0.0.1:8080/api/routes/active?failed_edge=E2&failure_status=washed_out"
```

Show:
- `recompute_ms`
- changed routes
- blocked overlays on the map

### 3. Proof-of-Delivery

Phone A:
1. Open `Auth`
2. Set role to `field_volunteer` or `supply_manager`
3. Open `Deliveries`
4. Enter `Delivery ID`
5. Enter `Payload Summary`
6. Tap `Generate Driver QR`

Phone B:
1. Open `Auth`
2. Set role to `camp_commander`
3. Open `Deliveries`
4. Tap `Open Scanner`
5. Scan phone A QR

Phone A:
1. Tap `Open Scanner`
2. Scan phone B response QR

Show:
- sender QR
- countersigned response
- receipt chain
- `prev_receipt_hash`
- `receipt_hash`

Replay proof:
1. Reuse the same challenge
2. Show `POD_ERR_NONCE_USED`

### 4. Triage Preemption

On the laptop dashboard:
1. Open the triage section
2. Show:
   - priority tiers
   - slowdown percentage
   - predicted breach
   - decision trigger
   - safe waypoint
   - reroute mode

Optional raw API proof:
```bash
curl.exe "http://127.0.0.1:8080/api/triage/status"
```

Point out:
- `decision.triggered = true`
- `safe_waypoint = N2`
- `drop_cargo_ids`
- `keep_cargo_ids`
- `reroute_vehicle = truck -> drone`

## Judge Phrases

Use these exact lines if needed:

- `The protobuf contracts are committed and shared across the stack.`
- `The peer sync path uses real Wi-Fi Direct transport with protobuf SyncService RPC-aligned frames.`
- `The strongest fully offline paths today are auth, CRDT conflict handling, PoD, mesh relay logic, and the decision dashboard.`
- `The remaining highest-risk area is full-credit transport hardening for M2.4.`

## Backup Plan

If live 2-phone sync is unstable:
- still show Wi-Fi Direct initialization and peer discovery
- show CRDT conflict flow locally in `Deliveries`
- show PoD locally
- switch to mesh relay demo in `Network`
- keep route failure and triage on the dashboard

## One-Line Success Criteria

If you can show:
- `2-phone sync evidence`
- `route recompute under failure`
- `PoD handshake + replay rejection`
- `triage preemption decision`

then D2 is covered.
