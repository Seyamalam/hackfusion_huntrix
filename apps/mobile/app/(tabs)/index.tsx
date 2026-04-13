import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AnimatedPanel } from '@/src/components/ui/animated-panel';
import { ActionChip } from '@/src/components/ui/action-chip';
import { HeroBanner } from '@/src/components/ui/hero-banner';
import { InfoRow } from '@/src/components/ui/info-row';
import { MetricCard } from '@/src/components/ui/metric-card';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import { SyncStateStrip } from '@/src/components/ui/sync-state-strip';
import {
  dashboardFallback,
  fetchDashboardSummary,
  fetchFleetOrchestrationStatus,
  fetchMissionPlans,
  fetchNetworkStatus,
  fetchPredictiveStatus,
  fetchTriageStatus,
  missionFallback,
  fleetFallback,
  networkFallback,
  predictiveFallback,
  triageFallback,
  type DashboardSummary,
  type FleetOrchestrationStatusResponse,
  type MissionPlansResponse,
  type NetworkStatus,
  type PredictiveStatusResponse,
  type TriageStatusResponse,
} from '@/src/features/dashboard/dashboard-api';
import { syncSignals } from '@/src/features/dashboard/dashboard-data';
import { MissionSummaryCard } from '@/src/features/dashboard/mission-summary-card';
import { TriagePanel } from '@/src/features/dashboard/triage-panel';
import { FleetOrchestrationPanel } from '@/src/features/fleet/fleet-orchestration-panel';
import { PredictivePanel } from '@/src/features/predictive/predictive-panel';
import { useBackendReconnect } from '@/src/hooks/use-backend-reconnect';
import { palette } from '@/src/theme/palette';

export default function CommandScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [missions, setMissions] = useState<MissionPlansResponse | null>(null);
  const [fleet, setFleet] = useState<FleetOrchestrationStatusResponse | null>(null);
  const [predictive, setPredictive] = useState<PredictiveStatusResponse | null>(null);
  const [triage, setTriage] = useState<TriageStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reconnect = useBackendReconnect(
    async (signal) => {
      const [nextSummary, nextFleet, nextNetwork, nextMissions, nextPredictive, nextTriage] =
        await Promise.all([
          fetchDashboardSummary(signal),
          fetchFleetOrchestrationStatus(signal),
          fetchNetworkStatus(signal),
          fetchMissionPlans(signal),
          fetchPredictiveStatus(signal),
          fetchTriageStatus(signal),
        ]);
      setSummary(nextSummary);
      setFleet(nextFleet);
      setNetwork(nextNetwork);
      setMissions(nextMissions);
      setPredictive(nextPredictive);
      setTriage(nextTriage);
      setError(null);
    },
    {
      onError: (fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard');
      },
      onSuccess: () => {
        setError(null);
      },
    },
  );

  const liveSummary = summary ?? dashboardFallback;
  const liveFleet = fleet ?? fleetFallback;
  const liveNetwork = network ?? networkFallback;
  const liveMissions = missions ?? missionFallback;
  const livePredictive = predictive ?? predictiveFallback;
  const liveTriage = triage ?? triageFallback;
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
          <ActionChip
            label={reconnect.isRefreshing ? 'Reconnecting…' : 'Reconnect'}
            onPress={reconnect.reconnect}
            tone="default"
            accessibilityHint="Retry all backend dashboard requests now."
          />
        </HeroBanner>
      </AnimatedPanel>

      <AnimatedPanel index={1}>
        <SyncStateStrip
          eyebrow="Mission State"
          items={[
            { label: 'Offline', value: reconnect.backendState === 'fallback' ? 'Fallback active' : 'Scenario cached locally', tone: reconnect.backendState === 'fallback' ? 'warning' : 'success' },
            { label: 'Syncing', value: reconnect.isRefreshing ? 'Auto reconnecting' : error ? 'Feed interrupted' : 'Live command feed', tone: reconnect.isRefreshing ? 'info' : error ? 'alert' : 'info' },
            { label: 'Conflict', value: liveTriage.snapshot.predictions.some((prediction) => prediction.will_breach) ? 'SLA pressure' : 'Stable', tone: liveTriage.snapshot.predictions.some((prediction) => prediction.will_breach) ? 'warning' : 'neutral' },
            { label: 'Verified', value: reconnect.lastSuccessAt ? `Last sync ${new Date(reconnect.lastSuccessAt).toLocaleTimeString()}` : 'Awaiting backend', tone: reconnect.lastSuccessAt ? 'success' : 'warning' },
          ]}
        />
      </AnimatedPanel>

      <AnimatedPanel index={2}>
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

      <AnimatedPanel index={3}>
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

      <AnimatedPanel index={4}>
        <MissionSummaryCard mission={primaryMission} />
      </AnimatedPanel>

      <AnimatedPanel index={5}>
        <FleetOrchestrationPanel fleet={liveFleet} />
      </AnimatedPanel>

      <AnimatedPanel index={6}>
        <PredictivePanel predictive={livePredictive} />
      </AnimatedPanel>

      <AnimatedPanel index={7}>
        <TriagePanel triage={liveTriage} />
      </AnimatedPanel>

      <AnimatedPanel index={8}>
        <SectionCard
          eyebrow="Priority Pressure"
          title="Narrate the decision, not the math"
          description={liveSummary.weighted_graph_note ?? 'Weighted route cost combines travel time, risk, and capacity pressure.'}
        >
          <View style={{ gap: 10 }}>
            <InfoRow label="Priority under stress" value="P0 Medical" />
            <InfoRow label="Fallback delivery mode" value={liveTriage.decision.reroute_vehicle || (primaryMission?.handoffs[0] ? `${primaryMission.handoffs[0].from_vehicle} -> ${primaryMission.handoffs[0].to_vehicle}` : 'Direct route')} />
            <InfoRow label="Decision trigger" value={`Slowdown ${liveTriage.snapshot.slowdown_pct}%`} />
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
