import { ScrollView, Text, View } from 'react-native';

import { MetricCard } from '@/src/components/ui/metric-card';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import { dashboardMetrics, syncSignals } from '@/src/features/dashboard/dashboard-data';
import { palette } from '@/src/theme/palette';

export default function CommandScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 16,
        padding: 20,
      }}
      style={{ flex: 1, backgroundColor: palette.canvas }}
    >
      <SectionCard
        eyebrow="Huntrix Delta"
        title="Flood command overview"
        description="Offline-first coordination for relief movement, route failures, and signed handoffs."
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {syncSignals.map((signal) => (
            <StatusPill key={signal.label} label={signal.label} tone={signal.tone} />
          ))}
        </View>
      </SectionCard>

      <View style={{ gap: 12 }}>
        <Text
          selectable
          style={{
            color: palette.textPrimary,
            fontSize: 18,
            fontWeight: '700',
          }}
        >
          Operational Snapshot
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {dashboardMetrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
            />
          ))}
        </View>
      </View>

      <SectionCard
        eyebrow="Priority Pressure"
        title="Triage engine recommends preemption"
        description="If the Companyganj route slows by 30%, the current P0 medical load misses SLA. The next build step is to wire this panel to live Go routing output."
      />
    </ScrollView>
  );
}
