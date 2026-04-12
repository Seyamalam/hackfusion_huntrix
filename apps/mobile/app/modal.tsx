import { ScrollView, Text } from 'react-native';

import { SectionCard } from '@/src/components/ui/section-card';
import { palette } from '@/src/theme/palette';

export default function ScenarioModal() {
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
        eyebrow="Demo Control"
        title="Scenario assumptions"
        description="First pass uses a simulated relay mesh, seeded disaster data, and Expo web for the richer route dashboard if it is faster than fighting native offline maps."
      />

      <SectionCard
        eyebrow="Next Wiring"
        title="Immediate integration targets"
        description="Connect this modal to chaos events, sync queue depth, and route recomputation once the Go simulator endpoint is in place."
      >
        <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
          Core requirement pressure stays on protobuf contracts, offline state, route recomputation,
          and proof-of-delivery verification.
        </Text>
      </SectionCard>
    </ScrollView>
  );
}
