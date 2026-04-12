# M6 QA

Module 6 covers:
- `M6.1` priority taxonomy and SLA windows
- `M6.2` SLA breach prediction under route deterioration
- `M6.3` autonomous drop-and-reroute preemption

## Setup

Run the Go API and the two UIs:

```bash
go run ./services/core/cmd/api -chaos-url http://127.0.0.1:5000
cd apps/dashboard
bun run dev
cd ../mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_COMPUTER_LAN_IP:8080"
bun run start
```

## M6.1 Taxonomy

Check:

```bash
curl "http://127.0.0.1:8080/api/triage/status"
```

Confirm:
- `priority_tiers` contains `P0`, `P1`, `P2`, `P3`
- SLA windows are `2h`, `6h`, `24h`, `72h`
- each tier includes a vector clock to show CRDT-backed storage

## M6.2 Breach Prediction

Use the default endpoint:

```bash
curl "http://127.0.0.1:8080/api/triage/status"
```

Confirm:
- `slowdown_pct >= 30`
- predictions exist for each cargo item
- at least one critical cargo item (`P0`) shows `will_breach = true`
- the dashboard triage panel mirrors the same prediction state

## M6.3 Autonomous Preemption

Confirm in the API response:
- `decision.triggered = true`
- `safe_waypoint = N2`
- `drop_cargo_ids` contain the `P2` and `P3` cargo IDs
- `keep_cargo_ids` contain the `P0` and `P1` cargo IDs
- `reroute_vehicle = truck -> drone`
- `audit_trail_anchor` is present

Confirm in the web dashboard:
- the `Autonomous triage engine` panel shows the slowdown and decision
- the same panel shows each cargo prediction and recommended track

Confirm in the mobile app:
- open `Command`
- the triage panel shows the SLA tiers
- the predicted breach and the reroute decision are visible
- the audit log entries are listed

## Demo Script

Recommended short flow:

1. Show the four SLA tiers.
2. Point out the simulated convoy slowdown over 30%.
3. Show that `P0` will breach SLA on the current route.
4. Show the autonomous decision to drop `P2/P3` at `N2`.
5. Show the reroute path for `P0/P1` only.
