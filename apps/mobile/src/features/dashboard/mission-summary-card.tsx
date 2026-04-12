import { Text, View } from 'react-native';

import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import type { MissionPlan } from '@/src/features/dashboard/dashboard-api';
import { palette } from '@/src/theme/palette';

export function MissionSummaryCard({ mission }: { mission: MissionPlan }) {
  return (
    <SectionCard
      eyebrow="M4.3 Mission Summary"
      title={mission.label}
      description="This keeps the route story clear on mobile: which vehicle moves what, how long each stage takes, and where the handoff happens."
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusPill label={`${mission.total_mins} min`} tone="info" />
        <StatusPill label={`Cost ${mission.total_cost}`} tone="warning" />
        <StatusPill
          label={`${mission.stage_count} stage${mission.stage_count === 1 ? '' : 's'}`}
          tone="neutral"
        />
        <StatusPill
          label={`${mission.handoffs.length} handoff${mission.handoffs.length === 1 ? '' : 's'}`}
          tone={mission.handoffs.length > 0 ? 'alert' : 'success'}
        />
      </View>

      <View style={{ gap: 10 }}>
        <InfoRow label="Mission ID" value={mission.mission_id} />
        <InfoRow label="Total stages" value={String(mission.stage_count)} />
        <InfoRow label="Projected time" value={`${mission.total_mins} min`} />
        <InfoRow label="Projected cost" value={String(mission.total_cost)} />
      </View>

      <View style={{ gap: 12 }}>
        {mission.stages.map((stage, index) => (
          <View
            key={`${mission.mission_id}-${stage.vehicle}-${index}`}
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
                Stage {index + 1}: {stage.vehicle.toUpperCase()}
              </Text>
              <Text selectable style={{ color: palette.textSecondary }}>
                {stage.total_mins} min
              </Text>
            </View>
            <InfoRow label="Route" value={`${stage.source} -> ${stage.target}`} />
            <InfoRow label="Payload" value={`${stage.payload_kg ?? 0} kg`} />
            <InfoRow label="Legs" value={String(stage.leg_count)} />
            <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
              {(stage.legs ?? [])
                .map((leg) => `${leg.source} -> ${leg.target}${leg.link_type ? ` (${leg.link_type})` : ''}`)
                .join(' / ') || 'No leg details returned.'}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {mission.handoffs.length === 0 ? (
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
            No cross-mode handoff in this mission.
          </Text>
        ) : (
          mission.handoffs.map((handoff) => (
            <View
              key={`${handoff.node_id}-${handoff.from_vehicle}-${handoff.to_vehicle}`}
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
                Handoff at {handoff.node_id}
              </Text>
              <InfoRow label="Transfer" value={`${handoff.from_vehicle} -> ${handoff.to_vehicle}`} />
              <InfoRow label="Payload" value={`${handoff.payload_kg} kg`} />
              <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
                {handoff.reason}
              </Text>
            </View>
          ))
        )}
      </View>
    </SectionCard>
  );
}
