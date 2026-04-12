import { ScrollView, Text, View } from 'react-native';

import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import { networkNodes } from '@/src/features/dashboard/dashboard-data';
import { palette } from '@/src/theme/palette';

export default function NetworkScreen() {
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
        eyebrow="Mesh"
        title="Relay state"
        description="This screen will become the live view for store-and-forward, battery-aware throttling, and conflict visibility."
      />

      {networkNodes.map((node) => (
        <SectionCard
          key={node.id}
          eyebrow={node.id}
          title={node.name}
          description={node.role}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <StatusPill label={node.status} tone={node.statusTone} />
            <StatusPill label={`Battery ${node.battery}`} tone="neutral" />
          </View>
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
            {node.note}
          </Text>
        </SectionCard>
      ))}
    </ScrollView>
  );
}
