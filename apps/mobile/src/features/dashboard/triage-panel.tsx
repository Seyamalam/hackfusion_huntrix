import { Text, View } from 'react-native';

import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import type { TriageStatusResponse } from '@/src/features/dashboard/dashboard-api';
import { palette } from '@/src/theme/palette';

export function TriagePanel({ triage }: { triage: TriageStatusResponse }) {
  return (
    <SectionCard
      eyebrow="Module 6"
      title={triage.snapshot.scenario_name}
      description="The triage engine reads SLA-backed priority tiers, predicts breaches when routes deteriorate, and preempts low-priority cargo without waiting for a dispatcher."
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {triage.snapshot.priority_tiers.map((tier) => (
          <StatusPill
            key={tier.tier}
            label={`${tier.tier} · ${tier.sla_hours}h`}
            tone={tier.tier === 'P0' ? 'alert' : tier.tier === 'P1' ? 'warning' : tier.tier === 'P2' ? 'info' : 'neutral'}
          />
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <InfoRow label="Trigger" value={triage.snapshot.trigger_source} />
        <InfoRow label="Baseline ETA" value={`${triage.snapshot.baseline_eta_mins} min`} />
        <InfoRow label="Current ETA" value={`${triage.snapshot.current_eta_mins} min`} />
        <InfoRow label="Slowdown" value={`${triage.snapshot.slowdown_pct}%`} />
      </View>

      <View style={{ gap: 12 }}>
        {triage.snapshot.predictions.map((prediction) => (
          <View
            key={prediction.cargo_id}
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
                {prediction.name}
              </Text>
              <StatusPill
                label={prediction.priority}
                tone={prediction.priority === 'P0' ? 'alert' : prediction.priority === 'P1' ? 'warning' : 'neutral'}
              />
            </View>
            <InfoRow label="SLA window" value={`${prediction.sla_window_mins / 60} hr`} />
            <InfoRow label="Predicted breach" value={prediction.will_breach ? 'Yes' : 'No'} />
            <InfoRow label="Recommended track" value={prediction.recommended_track} />
          </View>
        ))}
      </View>

      <View
        style={{
          gap: 10,
          borderRadius: 20,
          borderCurve: 'continuous',
          padding: 14,
          backgroundColor: triage.decision.triggered ? '#fff1ee' : palette.shell,
          borderWidth: 1,
          borderColor: triage.decision.triggered ? '#e2b4ac' : palette.border,
        }}
      >
        <Text selectable style={{ color: palette.textPrimary, fontWeight: '800' }}>
          {triage.decision.triggered ? 'Autonomous preemption triggered' : 'No preemption required'}
        </Text>
        <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
          {triage.decision.action}
        </Text>
        {triage.decision.triggered ? (
          <>
            <InfoRow label="Safe waypoint" value={triage.decision.safe_waypoint} />
            <InfoRow label="Keep onboard" value={triage.decision.keep_cargo_ids.join(', ')} />
            <InfoRow label="Drop at waypoint" value={triage.decision.drop_cargo_ids.join(', ')} />
            <InfoRow label="Reroute ETA" value={`${triage.decision.reroute_eta_mins} min via ${triage.decision.reroute_vehicle}`} />
          </>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        {triage.snapshot.audit_log.map((entry) => (
          <Text key={entry.id} selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
            [{entry.type}] {entry.detail}
          </Text>
        ))}
      </View>
    </SectionCard>
  );
}
