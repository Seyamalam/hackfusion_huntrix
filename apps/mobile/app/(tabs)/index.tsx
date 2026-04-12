import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AnimatedPanel } from '@/src/components/ui/animated-panel';
import { HeroBanner } from '@/src/components/ui/hero-banner';
import { InfoRow } from '@/src/components/ui/info-row';
import { MetricCard } from '@/src/components/ui/metric-card';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import {
  dashboardFallback,
  fetchDashboardSummary,
  fetchMissionPlans,
  fetchNetworkStatus,
  missionFallback,
  networkFallback,
  type DashboardSummary,
  type MissionPlansResponse,
  type NetworkStatus,
} from '@/src/features/dashboard/dashboard-api';
import { syncSignals } from '@/src/features/dashboard/dashboard-data';
import { RouteGraphCard } from '@/src/features/dashboard/route-graph-card';
import { palette } from '@/src/theme/palette';

export default function CommandScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [missions, setMissions] = useState<MissionPlansResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetchDashboardSummary(controller.signal),
      fetchNetworkStatus(controller.signal),
      fetchMissionPlans(controller.signal),
    ])
      .then(([nextSummary, nextNetwork, nextMissions]) => {
        setSummary(nextSummary);
        setNetwork(nextNetwork);
        setMissions(nextMissions);
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
  const liveNetwork = network ?? networkFallback;
  const liveMissions = missions ?? missionFallback;
  const primaryMission = liveMissions.missions[0] ?? missionFallback.missions[0];
  const metrics = [
    {
      label: 'Active Relief Nodes',
      value: String(liveSummary.node_count).padStart(2, '0'),
      detail: `${liveSummary.scenario} currently exposes ${liveSummary.edge_count} graph edges.`,
    },
    {
      label: 'Blocked Segments',
      value: String(liveSummary.blocked_edge_count).padStart(2, '0'),
      detail: 'Live edge failures come from the Go API, which proxies the chaos simulator.',
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
    {
      label: 'Mission Handoffs',
      value: String(primaryMission?.handoffs.length ?? 0).padStart(2, '0'),
      detail: 'Cross-mode transfers are emitted by the backend mission planner, not faked in the UI.',
    },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 16, padding: 20 }}
      style={{ flex: 1, backgroundColor: palette.canvas }}
    >
      <AnimatedPanel index={0}>
        <HeroBanner
          eyebrow="Huntrix Delta"
          title="Disaster command pulse"
          description={
            error
              ? `Backend unavailable, showing fallback data. ${error}`
              : `Live summary loaded from the routing API for scenario ${liveSummary.scenario}.`
          }
        >
          {syncSignals.map((signal) => (
            <StatusPill key={signal.label} label={signal.label} tone={signal.tone} />
          ))}
          <StatusPill
            label={`${liveSummary.last_recompute_ms ?? liveMissions.recompute_ms}ms recompute`}
            tone="neutral"
          />
        </HeroBanner>
      </AnimatedPanel>

      <AnimatedPanel index={1}>
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
      </AnimatedPanel>

      <AnimatedPanel index={2}>
        <SectionCard
          eyebrow="Scenario Brief"
          title={liveSummary.scenario}
          description="Use this card to explain the flood context before you zoom into the route graph. It translates the API state into demo language."
        >
          <View style={{ gap: 10 }}>
            <InfoRow label="Region" value={liveNetwork.metadata.region} />
            <InfoRow label="Last network update" value={liveNetwork.metadata.last_updated} />
            <InfoRow label="Blocked corridors" value={String(liveSummary.blocked_edge_count)} />
            <InfoRow label="Primary mission" value={primaryMission.label} />
          </View>
        </SectionCard>
      </AnimatedPanel>

      <AnimatedPanel index={3}>
        <RouteGraphCard network={liveNetwork} mission={primaryMission} />
      </AnimatedPanel>

      <AnimatedPanel index={4}>
        <SectionCard
          eyebrow="Priority Pressure"
          title="Narrate the decision, not the math"
          description={liveSummary.weighted_graph_note ?? 'Weighted route cost combines travel time, risk, and capacity pressure.'}
        >
          <View style={{ gap: 10 }}>
            <InfoRow label="Priority under stress" value="P0 Medical" />
            <InfoRow label="Fallback delivery mode" value={primaryMission?.handoffs[0] ? `${primaryMission.handoffs[0].from_vehicle} -> ${primaryMission.handoffs[0].to_vehicle}` : 'Direct route'} />
            <InfoRow label="Decision trigger" value={`Recompute in ${liveMissions.recompute_ms} ms`} />
          </View>
        </SectionCard>
      </AnimatedPanel>
    </ScrollView>
  );
}

function findRouteMinutes(summary: DashboardSummary, vehicle: string) {
  const match = summary.route_previews.find((preview) => preview.vehicle === vehicle);
  return match?.total_mins ?? 0;
}
