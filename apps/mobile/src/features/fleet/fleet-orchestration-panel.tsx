import { Text, View } from 'react-native';

import { ActionChip } from '@/src/components/ui/action-chip';
import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import type { FleetOrchestrationStatusResponse } from '@/src/features/dashboard/dashboard-api';
import { useLiveHandoff } from '@/src/features/fleet/use-live-handoff';
import { palette } from '@/src/theme/palette';

export function FleetOrchestrationPanel({ fleet }: { fleet: FleetOrchestrationStatusResponse }) {
  const handoff = useLiveHandoff(fleet.status.rendezvous);

  return (
    <SectionCard
      eyebrow="Module 8"
      title="Hybrid fleet orchestration"
      description="The orchestration engine marks drone-only zones and computes rendezvous points in Go. The handoff card below now runs a live mobile PoD-backed ownership transfer."
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
          Live handoff execution
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <StatusPill label="PoD-backed" tone="success" />
          <StatusPill label="Syncable ledger" tone="info" />
          <StatusPill label={handoff.currentRole ?? 'unknown role'} tone="neutral" />
          <StatusPill label={`Receipts ${handoff.receipts.length}`} tone="info" />
          <StatusPill label={`Ledger ${handoff.selectedScenarioRecords.length}`} tone="warning" />
          <StatusPill label={handoff.currentOwner} tone="success" />
        </View>
        <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
          {handoff.status}
        </Text>

        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: palette.textMuted, fontWeight: '700' }}>
            Active rendezvous scenario
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {fleet.status.rendezvous.map((scenario) => (
              <ActionChip
                key={scenario.scenario_id}
                label={scenario.best_meeting_node_id}
                onPress={() => handoff.setSelectedScenarioId(scenario.scenario_id)}
                tone={
                  handoff.selectedScenario?.scenario_id === scenario.scenario_id ? 'primary' : 'default'
                }
              />
            ))}
          </View>
          {handoff.selectedScenario ? (
            <View style={{ gap: 8 }}>
              <InfoRow label="Scenario" value={handoff.selectedScenario.label} />
              <InfoRow
                label="Meeting node"
                value={`${handoff.selectedScenario.best_meeting_node_id} (${handoff.selectedScenario.best_meeting_lat.toFixed(3)}, ${handoff.selectedScenario.best_meeting_lng.toFixed(3)})`}
              />
              <InfoRow
                label="Mission"
                value={`${handoff.selectedScenario.boat_travel_mins}m boat + ${handoff.selectedScenario.drone_travel_mins}m drone approach + ${handoff.selectedScenario.drone_final_leg_mins}m final leg`}
              />
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <ActionChip label="Boat Arrived" onPress={handoff.markBoatArrival} tone="primary" />
          <ActionChip label="Generate Challenge" onPress={handoff.generateHandoffChallenge} />
          <ActionChip label="Drone Countersign" onPress={handoff.droneCountersign} />
          <ActionChip label="Finalize Transfer" onPress={handoff.finalizeOwnershipTransfer} tone="danger" />
          <ActionChip label="Reset Handoff" onPress={handoff.clearHandoffLedger} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <StatusPill
            label={handoff.selectedScenarioRecords.some((record) => record.status === 'boat_arrived') ? 'Boat Arrived' : 'Awaiting Boat'}
            tone={handoff.selectedScenarioRecords.some((record) => record.status === 'boat_arrived') ? 'success' : 'neutral'}
          />
          <StatusPill
            label={handoff.selectedScenarioRecords.some((record) => record.status === 'challenge_generated') ? 'Challenge Ready' : 'No Challenge'}
            tone={handoff.selectedScenarioRecords.some((record) => record.status === 'challenge_generated') ? 'warning' : 'neutral'}
          />
          <StatusPill
            label={handoff.selectedScenarioRecords.some((record) => record.status === 'countersigned') ? 'Drone Signed' : 'Awaiting Drone'}
            tone={handoff.selectedScenarioRecords.some((record) => record.status === 'countersigned') ? 'info' : 'neutral'}
          />
          <StatusPill
            label={handoff.selectedScenarioRecords.some((record) => record.status === 'ownership_transferred') ? 'Ownership Transferred' : 'Transfer Pending'}
            tone={handoff.selectedScenarioRecords.some((record) => record.status === 'ownership_transferred') ? 'success' : 'alert'}
          />
        </View>

        {handoff.selectedScenarioRecords.length === 0 ? (
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
            No live handoff record yet for this scenario.
          </Text>
        ) : (
          handoff.selectedScenarioRecords
            .slice()
            .reverse()
            .map((record) => (
              <View
                key={`${record.handoff_id}-${record.updated_at}`}
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
                  <StatusPill label={formatEventType(record.status)} tone={toneForEvent(record.status)} />
                  <Text selectable style={{ color: palette.textMuted, fontWeight: '700' }}>
                    {formatTimestamp(record.updated_at)}
                  </Text>
                </View>
                <InfoRow label="Ownership" value={`${record.from_owner} -> ${record.to_owner}`} />
                <InfoRow label="Roles" value={`${record.from_role} -> ${record.to_role}`} />
                <InfoRow label="Receipt" value={record.pod_receipt_id || 'pending'} />
                <InfoRow
                  label="Receipt hash"
                  value={record.pod_receipt_hash ? compactHash(record.pod_receipt_hash) : 'pending'}
                />
              </View>
            ))
        )}
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
    case 'countersigned':
      return 'info' as const;
    case 'challenge_generated':
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

function compactHash(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}
