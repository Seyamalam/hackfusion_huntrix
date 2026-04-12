import { Text, View } from 'react-native';

import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import type { PredictiveStatusResponse } from '@/src/features/dashboard/dashboard-api';
import { runOnDevicePredictor } from '@/src/features/predictive/on-device-predictor';
import { palette } from '@/src/theme/palette';

export function PredictivePanel({ predictive }: { predictive: PredictiveStatusResponse }) {
  const localPredictions = runOnDevicePredictor(predictive.status.predictions).sort(
    (left, right) => right.probability - left.probability,
  );
  const topPredictions = localPredictions.slice(0, 3);

  return (
    <SectionCard
      eyebrow="Module 7"
      title="Predictive route decay"
      description="The mobile app runs the trained logistic model locally against the live feature snapshot, then surfaces high-risk edges before they fail."
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusPill label={`Precision ${predictive.status.metrics.precision}`} tone="success" />
        <StatusPill label={`Recall ${predictive.status.metrics.recall}`} tone="warning" />
        <StatusPill label={`F1 ${predictive.status.metrics.f1}`} tone="info" />
        <StatusPill label={`Threshold ${predictive.status.model.threshold}`} tone="neutral" />
      </View>

      <View style={{ gap: 10 }}>
        <InfoRow label="Ingestion source" value="1 Hz rainfall CSV feed" />
        <InfoRow label="Prediction runtime" value={`${predictive.recompute_ms} ms`} />
        <InfoRow label="Advance reroutes" value={String(predictive.status.recommendations.length)} />
      </View>

      <View style={{ gap: 12 }}>
        {topPredictions.map((prediction) => (
          <View
            key={prediction.edgeId}
            style={{
              gap: 8,
              borderRadius: 18,
              borderCurve: 'continuous',
              padding: 12,
              backgroundColor: palette.shell,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Text selectable style={{ color: palette.textPrimary, fontWeight: '800' }}>
                Edge {prediction.edgeId}
              </Text>
              <StatusPill
                label={`${Math.round(prediction.probability * 100)}%`}
                tone={prediction.highRisk ? 'alert' : 'success'}
              />
            </View>
            <InfoRow label="Model host" value="On-device JS inference" />
            <InfoRow label="Dominant feature" value={prediction.topFeature} />
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {predictive.status.recommendations.map((recommendation) => (
          <Text key={`${recommendation.vehicle}-${recommendation.source}-${recommendation.target}`} selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
            {recommendation.vehicle}: {recommendation.message} Baseline {recommendation.baseline_eta_mins} min, proactive {recommendation.proactive_eta_mins} min.
          </Text>
        ))}
      </View>
    </SectionCard>
  );
}
