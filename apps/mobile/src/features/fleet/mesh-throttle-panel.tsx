import { Text, View } from 'react-native';

import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import type { FleetOrchestrationStatusResponse } from '@/src/features/dashboard/dashboard-api';
import { palette } from '@/src/theme/palette';

export function MeshThrottlePanel({ fleet }: { fleet: FleetOrchestrationStatusResponse }) {
  const throttle = fleet.status.mesh_throttle;

  return (
    <SectionCard
      eyebrow="M8.4"
      title="Battery-aware mesh throttling"
      description="The mesh simulator reduces background broadcast frequency when battery is low, the device is stationary, and it is already near a known node."
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusPill label={`Battery ${throttle.battery_pct}%`} tone={throttle.battery_pct < 30 ? 'alert' : 'neutral'} />
        <StatusPill label={throttle.accelerometer_state} tone="info" />
        <StatusPill label={`${throttle.battery_savings_pct}% savings`} tone="success" />
      </View>

      <View style={{ gap: 10 }}>
        <InfoRow label="Base interval" value={`${throttle.base_interval_seconds}s`} />
        <InfoRow label="Adjusted interval" value={`${throttle.adjusted_interval_seconds}s`} />
        <InfoRow label="Baseline broadcasts / 10m" value={String(throttle.baseline_broadcasts)} />
        <InfoRow label="Adjusted broadcasts / 10m" value={String(throttle.adjusted_broadcasts)} />
        <InfoRow label="Battery drain" value={`${throttle.baseline_battery_drain_pct}% -> ${throttle.adjusted_battery_drain_pct}%`} />
      </View>

      <View style={{ gap: 8 }}>
        {throttle.applied_rules.map((rule) => (
          <Text key={rule.rule} selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
            [{rule.applied ? 'applied' : 'idle'}] {rule.rule}: {rule.reason}
          </Text>
        ))}
      </View>
    </SectionCard>
  );
}
