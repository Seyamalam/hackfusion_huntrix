# M7 QA

Module 7 covers:
- `M7.1` rainfall ingestion and feature engineering
- `M7.2` impassability classification model
- `M7.3` proactive rerouting integration
- `M7.4` prediction confidence display

## Setup

Train the artifacts once:

```bash
python ml/training/generate_route_decay_dataset.py
python ml/training/train_route_decay_model.py
```

Run the stack:

```bash
go run ./services/core/cmd/api -chaos-url http://127.0.0.1:5000
cd apps/dashboard
bun run dev
cd ../mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_COMPUTER_LAN_IP:8080"
bun run start
```

## M7.1 Ingestion And Features

Check the raw assets:
- `ml/training/rainfall_sensor_feed.csv`
- `ml/training/route_decay_training.csv`
- `data/edge_environment_context.json`

Confirm:
- rainfall feed is sampled at `1 Hz`
- per-edge features exist:
  - cumulative rainfall
  - rainfall rate change
  - elevation
  - soil saturation proxy

## M7.2 Model Quality

Check:
- `ml/artifacts/route_decay_model.json`
- `ml/artifacts/route_decay_metrics.json`

Confirm:
- model threshold is `0.7`
- precision, recall, and F1 are reported
- current artifact metrics are approximately:
  - precision `1.0`
  - recall `0.8333`
  - F1 `0.9091`

## M7.3 Proactive Rerouting

Check:

```bash
curl "http://127.0.0.1:8080/api/predictive/status"
```

Confirm:
- high-risk edges are present when probability `>= 0.7`
- recommendations are returned
- recommendation messages indicate advance reroute before failure
- the proactive ETA and avoided edge list are included

## M7.4 Confidence Display

Web dashboard:
- open the Leaflet dashboard
- confirm edge colors reflect predicted risk
- click or hover an edge
- confirm the popup shows:
  - probability
  - cumulative rainfall
  - rainfall rate change
  - elevation
  - soil saturation proxy
  - prediction timestamp

Mobile app:
- open `Command`
- confirm the predictive panel shows:
  - precision / recall / F1
  - top risky edges
  - dominant feature per edge
  - proactive recommendation summary
- this panel is powered by on-device JS inference using the trained coefficients

## Demo Script

Recommended short flow:

1. Show the trained metrics file.
2. Show `api/predictive/status`.
3. Point out the high-risk edges above `0.7`.
4. Show the proactive reroute recommendation.
5. Open the dashboard and hover the risky edge.
6. Open the mobile `Command` tab and show the same edge scored on-device.
