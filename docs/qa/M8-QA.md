# M8 QA

Module 8 covers:
- `M8.1` drone-required zone reachability analysis
- `M8.2` optimal rendezvous point computation
- `M8.3` boat-to-drone handoff coordination
- `M8.4` battery-aware mesh throttling

## Setup

Run the API and UIs:

```bash
go run ./services/core/cmd/api -chaos-url http://127.0.0.1:5000
cd apps/dashboard
bun run dev
cd ../mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_COMPUTER_LAN_IP:8080"
bun run start
```

## M8.1 Reachability

Check:

```bash
curl "http://127.0.0.1:8080/api/fleet/orchestration/status"
```

Confirm:
- `live_reachability` is present
- `drill_reachability` is present
- drill mode flags at least one `drone_required_zone`
- the web dashboard highlights the drone-required zone on the map

## M8.2 Rendezvous Logic

Confirm in the API response:
- at least 3 rendezvous scenarios exist
- each scenario includes:
  - meeting node
  - geographic coordinate
  - boat travel time
  - drone travel time
  - final mission time
- scenarios are feasible under the stated drone range and payload

Confirm in the mobile app:
- `Command` shows the rendezvous cards inside the hybrid fleet orchestration panel

## M8.3 Handoff Coordination

Confirm in the API response:
- a handoff scenario is present
- `pod_receipt_id` exists
- `ownership_before` and `ownership_after` differ
- ledger history contains:
  - boat arrival
  - PoD challenge generation
  - drone countersign
  - ownership transfer

Confirm in the dashboard:
- the handoff panel shows the event chain
- the ownership transition is visible

## M8.4 Mesh Throttling

Confirm in the API response:
- `battery_pct < 30`
- `accelerometer_state = stationary`
- adjusted interval is larger than baseline
- adjusted broadcast count is lower than baseline
- `battery_savings_pct > 0`

Confirm in the mobile app:
- `Network` shows the battery-aware mesh throttling panel
- the same savings numbers are visible
- the rule list states which reductions were applied

## Demo Script

Recommended short flow:

1. Show the drone-required zone on the dashboard map.
2. Open the rendezvous panel and compare the 3 scenarios.
3. Show the handoff timeline and ownership transfer.
4. Open the mobile `Network` tab and show the mesh throttling savings.
