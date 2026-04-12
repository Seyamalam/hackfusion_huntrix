import { ScrollView, Text, View } from 'react-native';

import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import { deliveryQueue } from '@/src/features/dashboard/dashboard-data';
import { palette } from '@/src/theme/palette';

export default function DeliveriesScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 16,
        padding: 20,
      }}
      style={{ flex: 1, backgroundColor: palette.canvas }}
    >
      {deliveryQueue.map((delivery) => (
        <SectionCard
          key={delivery.id}
          eyebrow={delivery.id}
          title={delivery.title}
          description={delivery.route}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <StatusPill label={delivery.priority} tone={delivery.priorityTone} />
            <StatusPill label={delivery.status} tone={delivery.statusTone} />
          </View>
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
            {delivery.note}
          </Text>
        </SectionCard>
      ))}
    </ScrollView>
  );
}
