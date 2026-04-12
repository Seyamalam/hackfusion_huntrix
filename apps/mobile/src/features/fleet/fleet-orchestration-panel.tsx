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
              gap: 12,
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
            <DetailBlock label="Reason" value={zone.reason} />
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
              gap: 12,
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
            <DetailBlock
              label="Meeting node"
              value={`${scenario.best_meeting_node_id} (${scenario.best_meeting_lat.toFixed(3)}, ${scenario.best_meeting_lng.toFixed(3)})`}
            />
            <InfoRow label="Boat travel" value={`${scenario.boat_travel_mins} min`} />
            <DetailBlock
              label="Drone travel"
              value={`${scenario.drone_travel_mins} + ${scenario.drone_final_leg_mins} min`}
            />
            <InfoRow label="Combined mission" value={`${scenario.combined_mission_mins} min`} />
            <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
              {scenario.explanation}
            </Text>
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
        <DetailBlock
          label="Ownership"
          value={`${fleet.status.handoff.ownership_before} -> ${fleet.status.handoff.ownership_after}`}
        />
        {fleet.status.handoff.ledger_history.map((entry) => (
          <View
            key={`${entry.event_type}-${entry.created_at}`}
            style={{
              gap: 8,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 10,
              backgroundColor: '#f4efe6',
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <StatusPill label={formatEventType(entry.event_type)} tone={toneForEvent(entry.event_type)} />
              <Text selectable style={{ color: palette.textMuted, fontWeight: '700' }}>
                {formatTimestamp(entry.created_at)}
              </Text>
            </View>
            <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
              {entry.detail}
            </Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        paddingBottom: 10,
      }}
    >
      <Text selectable style={{ color: palette.textMuted, fontWeight: '700' }}>
        {label}
      </Text>
      <Text selectable style={{ color: palette.textPrimary, fontWeight: '700', lineHeight: 22 }}>
        {value}
      </Text>
    </View>
  );
}

function formatEventType(value: string) {
  return value.replace(/_/g, ' ').toUpperCase();
}

function toneForEvent(value: string) {
  switch (value) {
    case 'ownership_transferred':
      return 'success' as const;
    case 'drone_countersigned':
      return 'info' as const;
    case 'pod_challenge_generated':
      return 'warning' as const;
    default:
      return 'neutral' as const;
  }
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
