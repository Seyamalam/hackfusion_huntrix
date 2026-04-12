import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { MetricCard } from '@/src/components/ui/metric-card';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import {
  dashboardFallback,
  fetchDashboardSummary,
  type DashboardSummary,
} from '@/src/features/dashboard/dashboard-api';
import { syncSignals } from '@/src/features/dashboard/dashboard-data';
import { palette } from '@/src/theme/palette';

export default function CommandScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchDashboardSummary(controller.signal)
      .then((nextSummary) => {
        setSummary(nextSummary);
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard');
      });

    return () => controller.abort();
  }, []);

  const liveSummary = summary ?? dashboardFallback;
  const metrics = [
    {
      label: 'Active Relief Nodes',
      value: String(liveSummary.node_count).padStart(2, '0'),
      detail: `${liveSummary.scenario} currently exposes ${liveSummary.edge_count} graph edges.`,
    },
    {
      label: 'Blocked Segments',
      value: String(liveSummary.blocked_edge_count).padStart(2, '0'),
      detail: 'Live edge failures come from the Go API, which can proxy the chaos simulator.',
    },
    {
      label: 'Truck ETA N1 -> N3',
      value: `${findRouteMinutes(liveSummary, 'truck')}m`,
      detail: 'Road-only constrained preview from the live routing service.',
    },
    {
      label: 'Boat ETA N1 -> N3',
      value: `${findRouteMinutes(liveSummary, 'speedboat')}m`,
      detail: 'Waterway-only constrained preview from the live routing service.',
    },
  ];

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
        description={
          error
            ? `Backend unavailable, showing fallback data. ${error}`
            : `Live summary loaded from the routing API for scenario ${liveSummary.scenario}.`
        }
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
          {metrics.map((metric) => (
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
        description="If the Companyganj route slows by 30%, the current P0 medical load misses SLA. The next build step is to feed this panel from the triage engine rather than static copy."
      />
    </ScrollView>
  );
}

function findRouteMinutes(summary: DashboardSummary, vehicle: string) {
  const match = summary.route_previews.find((preview) => preview.vehicle === vehicle);
  return match?.total_mins ?? 0;
}
