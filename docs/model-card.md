# Route Decay Model Card

## Model Summary

- Model name: `route_decay_model`
- Task: binary classification of whether a graph edge will become impassable within the next `2 hours`
- Module target: `M7 - Predictive Route Decay`
- Runtime format: JSON coefficients consumed by Go and on-device TypeScript inference
- Current threshold: `0.7`

## Intended Use

The model scores logistics edges in the Sylhet flood scenario and marks high-risk edges for proactive routing penalties.

Used by:
- Go predictive engine: [engine.go](/C:/Users/user/Desktop/hackfusion_huntrix/services/core/internal/predictive/engine.go:93)
- Mobile on-device inference: [on-device-predictor.ts](/C:/Users/user/Desktop/hackfusion_huntrix/apps/mobile/src/features/predictive/on-device-predictor.ts:1)

Not intended for:
- real-world flood prediction without retraining on real field data
- geographies outside the simulated Sylhet scenario
- safety-critical deployment without human review

## Dataset

- Sensor feed source: [rainfall_sensor_feed.csv](/C:/Users/user/Desktop/hackfusion_huntrix/ml/training/rainfall_sensor_feed.csv)
- Training table: [route_decay_training.csv](/C:/Users/user/Desktop/hackfusion_huntrix/ml/training/route_decay_training.csv)
- Scenario graph: [sylhet_map.json](/C:/Users/user/Desktop/hackfusion_huntrix/data/sylhet_map.json)
- Environmental context: [edge_environment_context.json](/C:/Users/user/Desktop/hackfusion_huntrix/data/edge_environment_context.json)
- Dataset generator: [generate_route_decay_dataset.py](/C:/Users/user/Desktop/hackfusion_huntrix/ml/training/generate_route_decay_dataset.py:1)

### Input Features

- `cumulative_rainfall_mm`
- `rainfall_rate_change`
- `elevation_m`
- `soil_saturation_proxy`

### Sampling

- Rainfall feed frequency: `1 Hz`
- Window length: `60` seconds
- Scenario length per edge: `360` seconds

### Label Construction

Labels are synthetic and generated from a hand-authored flooding score in the dataset script. This is acceptable for the hackathon prototype, but it means evaluation quality is optimistic compared with a real-world dataset.

## Training Procedure

- Training script: [train_route_decay_model.py](/C:/Users/user/Desktop/hackfusion_huntrix/ml/training/train_route_decay_model.py:1)
- Model family: logistic regression
- Feature normalization: per-feature mean/std standardization from training split
- Train/test split: `80/20`
- Seed: `20260412`

## Metrics

Artifact source: [route_decay_metrics.json](/C:/Users/user/Desktop/hackfusion_huntrix/ml/artifacts/route_decay_metrics.json:1)

- Accuracy: `0.98`
- Precision: `1.0`
- Recall: `0.8333`
- F1: `0.9091`
- Threshold: `0.7`
- Confusion counts:
- `TP = 5`
- `FP = 0`
- `TN = 44`
- `FN = 1`

## Artifacts

- Model coefficients: [route_decay_model.json](/C:/Users/user/Desktop/hackfusion_huntrix/ml/artifacts/route_decay_model.json:1)
- Mirrored mobile coefficients: [route-decay-model.ts](/C:/Users/user/Desktop/hackfusion_huntrix/apps/mobile/src/features/predictive/route-decay-model.ts:1)

## Integration

High-risk edges are penalized in the routing graph before route plans are served from the API.

Key integration points:
- predictive scoring: [engine.go](/C:/Users/user/Desktop/hackfusion_huntrix/services/core/internal/predictive/engine.go:93)
- penalty application in API route flow: [server.go](/C:/Users/user/Desktop/hackfusion_huntrix/services/core/internal/api/server.go:156)

## Edge Cases And Risks

- Labels are synthetic, not field-observed.
- The split is random over generated rows, so train/test leakage risk is higher than with edge- or storm-level partitioning.
- The mobile model is currently a mirrored coefficient file, so retraining requires keeping app and artifact copies in sync.
- Threshold tuning is static and may need adjustment for different scenario severity.

## Next Improvements

- export a single generated mobile artifact instead of duplicating coefficients manually
- split evaluation by scenario or edge group rather than random row order
- add more realistic hydrology and topology features
- replace synthetic labels with simulated or observed failure events
