import { Text, View } from 'react-native';

import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import type { FleetOrchestrationStatusResponse } from '@/src/features/dashboard/dashboard-api';
import { palette } from '@/src/theme/palette';

export function FleetOrchestrationPanel({ fleet }: { fleet: FleetOrchestrationStatusResponse }) {
  return (
    <SectionCard
      eyebrow="Module 8"
      title="Hybrid fleet orchestration"
      description="The orchestration engine marks drone-only zones, computes rendezvous points, and simulates boat-to-drone ownership transfer on the ledger."
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusPill label={`Live zones ${fleet.status.live_reachability.drone_required_zones.length}`} tone="neutral" />
        <StatusPill label={`Drill zones ${fleet.status.drill_reachability.drone_required_zones.length}`} tone="alert" />
        <StatusPill label={`Rendezvous ${fleet.status.rendezvous.length}`} tone="info" />
        <StatusPill label={`${fleet.recompute_ms}ms solve`} tone="success" />
      </View>

      <View style={{ gap: 12 }}>
        {(fleet.status.drill_reachability.drone_required_zones.length > 0
          ? fleet.status.drill_reachability.drone_required_zones
          : fleet.status.live_reachability.drone_required_zones
        ).map((zone) => (
          <View
            key={zone.node_id}
            style={{
              gap: 8,
              borderRadius: 18,
              borderCurve: 'continuous',
              padding: 12,
              backgroundColor: '#fff1ee',
              borderWidth: 1,
              borderColor: '#e2b4ac',
            }}
          >
            <Text selectable style={{ color: palette.textPrimary, fontWeight: '800' }}>
              Drone-required zone: {zone.name}
            </Text>
            <InfoRow label="Reason" value={zone.reason} />
            <InfoRow label="Truck reachable" value={zone.truck_reachable ? 'Yes' : 'No'} />
            <InfoRow label="Boat reachable" value={zone.boat_reachable ? 'Yes' : 'No'} />
            <InfoRow label="Drone reachable" value={zone.drone_reachable ? 'Yes' : 'No'} />
          </View>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        {fleet.status.rendezvous.map((scenario) => (
          <View
            key={scenario.scenario_id}
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
            <Text selectable style={{ color: palette.textPrimary, fontWeight: '800' }}>
              {scenario.label}
            </Text>
            <InfoRow label="Meeting node" value={`${scenario.best_meeting_node_id} (${scenario.best_meeting_lat.toFixed(3)}, ${scenario.best_meeting_lng.toFixed(3)})`} />
            <InfoRow label="Boat travel" value={`${scenario.boat_travel_mins} min`} />
            <InfoRow label="Drone travel" value={`${scenario.drone_travel_mins} + ${scenario.drone_final_leg_mins} min`} />
            <InfoRow label="Combined mission" value={`${scenario.combined_mission_mins} min`} />
          </View>
        ))}
      </View>

      <View
        style={{
          gap: 10,
          borderRadius: 20,
          borderCurve: 'continuous',
          padding: 14,
          backgroundColor: palette.shell,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        <Text selectable style={{ color: palette.textPrimary, fontWeight: '800' }}>
          {fleet.status.handoff.scenario_label}
        </Text>
        <InfoRow label="PoD receipt" value={fleet.status.handoff.pod_receipt_id} />
        <InfoRow label="Ownership" value={`${fleet.status.handoff.ownership_before} -> ${fleet.status.handoff.ownership_after}`} />
        {fleet.status.handoff.ledger_history.map((entry) => (
          <Text key={`${entry.event_type}-${entry.created_at}`} selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
            [{entry.event_type}] {entry.detail}
          </Text>
        ))}
      </View>
    </SectionCard>
  );
}
