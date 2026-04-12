import type { PredictiveEdgePrediction } from '@/src/features/dashboard/dashboard-api';
import { routeDecayModel } from '@/src/features/predictive/route-decay-model';

export type LocalPrediction = {
  edgeId: string;
  probability: number;
  highRisk: boolean;
  topFeature: string;
};

export function runOnDevicePredictor(predictions: PredictiveEdgePrediction[]): LocalPrediction[] {
  return predictions.map((prediction) => {
    const features = prediction.feature_snapshot;
    const raw = {
      cumulative_rainfall_mm: features.cumulative_rainfall_mm,
      rainfall_rate_change: features.rainfall_rate_change,
      elevation_m: features.elevation_m,
      soil_saturation_proxy: features.soil_saturation_proxy,
    };

    let logit = routeDecayModel.intercept;
    let topFeature = 'soil_saturation_proxy';
    let topMagnitude = 0;

    for (const feature of routeDecayModel.features) {
      const standardized =
        (raw[feature] - routeDecayModel.means[feature]) / routeDecayModel.scales[feature];
      const contribution = standardized * routeDecayModel.weights[feature];
      logit += contribution;
      if (Math.abs(contribution) > topMagnitude) {
        topMagnitude = Math.abs(contribution);
        topFeature = feature;
      }
    }

    const probability = 1 / (1 + Math.exp(-logit));
    return {
      edgeId: prediction.edge_id,
      probability,
      highRisk: probability >= routeDecayModel.threshold,
      topFeature,
    };
  });
}
