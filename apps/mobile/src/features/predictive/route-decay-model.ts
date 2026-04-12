export const routeDecayModel = {
  features: [
    'cumulative_rainfall_mm',
    'rainfall_rate_change',
    'elevation_m',
    'soil_saturation_proxy',
  ],
  intercept: -5.131869,
  means: {
    cumulative_rainfall_mm: 0.693464,
    rainfall_rate_change: 5.293665,
    elevation_m: 16.635,
    soil_saturation_proxy: 0.588826,
  },
  scales: {
    cumulative_rainfall_mm: 0.273256,
    rainfall_rate_change: 17.855556,
    elevation_m: 8.421507,
    soil_saturation_proxy: 0.165464,
  },
  threshold: 0.7,
  weights: {
    cumulative_rainfall_mm: 0.285924,
    rainfall_rate_change: 2.423004,
    elevation_m: -1.097557,
    soil_saturation_proxy: 3.023406,
  },
} as const;
