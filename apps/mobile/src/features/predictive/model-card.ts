export const routeDecayModelCard = {
  artifactFormat: 'JSON coefficient artifact mirrored into on-device TypeScript',
  dataset: {
    environmentContext: 'data/edge_environment_context.json',
    rainfallFeed: 'ml/training/rainfall_sensor_feed.csv',
    scenarioGraph: 'data/sylhet_map.json',
    trainingTable: 'ml/training/route_decay_training.csv',
  },
  edgeCases: [
    'Labels are synthetic, so real-world confidence is lower than the demo metrics suggest.',
    'The current split is random by row, so leakage risk is higher than an edge-group split.',
    'Retraining requires keeping the mobile artifact in sync with the exported backend artifact.',
  ],
  features: [
    'cumulative_rainfall_mm',
    'rainfall_rate_change',
    'elevation_m',
    'soil_saturation_proxy',
  ],
  metrics: {
    accuracy: 0.98,
    f1: 0.9091,
    precision: 1.0,
    recall: 0.8333,
    threshold: 0.7,
  },
  modelName: 'route_decay_model',
  modelType: 'logistic_regression',
  predictionWindow: '2 hours',
  runtime: 'On-device JavaScript inference in Expo React Native',
  sampling: {
    feedFrequencyHz: 1,
    scenarioLengthSeconds: 360,
    windowSeconds: 60,
  },
  seed: 20260412,
  split: '80/20 train/test split',
} as const;
