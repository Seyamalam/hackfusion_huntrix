# M4 QA

Module 4 covers:
- `M4.1` weighted multi-modal graph
- `M4.2` dynamic route re-computation on failure
- `M4.3` vehicle constraints and handoff events
- `M4.4` visual route dashboard

## Setup

Run these services first:

```bash
python services/chaos/chaos_server.py
go run ./services/core/cmd/api -chaos-url http://127.0.0.1:5000
cd apps/dashboard
bun run dev
```

For the mobile app:

```bash
cd apps/mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_COMPUTER_LAN_IP:8080"
bun run start
```

## M4.1 Weighted Graph

Check:

```bash
curl "http://127.0.0.1:8080/api/route/preview?from=N1&to=N3&vehicle=truck&payload_kg=100"
curl "http://127.0.0.1:8080/api/network/status"
```

Confirm:
- network edges include `road`, `waterway`, and `airway`
- edges expose `travel_time_mins`, `capacity_units`, `risk_score`, and `payload_limit_kg`
- route response includes detailed legs

## M4.2 Dynamic Recompute

Check:

```bash
curl "http://127.0.0.1:8080/api/routes/active?failed_edge=E2&failure_status=washed_out"
curl "http://127.0.0.1:8080/api/routes/active?failed_edge=E6&failure_status=impassable"
```

Confirm:
- `recompute_ms` is returned
- `recompute_ms < 2000`
- affected routes change or disappear when a required edge is failed
- blocked overlays on the web dashboard update after refresh/poll

## M4.3 Vehicle Constraints And Handoffs

Check:

```bash
curl "http://127.0.0.1:8080/api/routes/missions"
curl "http://127.0.0.1:8080/api/route/preview?from=N2&to=N4&vehicle=drone&payload_kg=20"
```

Confirm:
- `truck` routes stay on `road`
- `speedboat` routes stay on `waterway`
- `drone` routes stay on `airway`
- overweight drone request fails
- mission response includes handoff events
- `Medical handoff to Companyganj` shows truck to drone handoff at `N2`

## M4.4 Visual Dashboard

Web dashboard:
- open the Leaflet dashboard
- confirm roads, waterways, and airways use different colors
- confirm vehicle markers animate on active routes
- confirm blocked edges render in red dashed form
- confirm the multimodal mission panel lists handoffs

Mobile app:
- open the `Command` tab
- confirm the in-app route graph renders the mission topology
- confirm the handoff node is emphasized
- confirm stage cards and handoff text match the mission API

## Demo Script

Recommended short flow:

1. Show `api/routes/missions` and point out the handoff event.
2. Show the mobile `Command` tab route graph for the same mission.
3. Show the Leaflet dashboard and route overlays.
4. Trigger a failed edge with `api/routes/active?failed_edge=...`.
5. Show recompute time under 2 seconds.
