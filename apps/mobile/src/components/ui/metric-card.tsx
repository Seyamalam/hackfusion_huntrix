import { Text, View } from 'react-native';

import { palette } from '@/src/theme/palette';

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <View
      style={{
        minWidth: 156,
        flexGrow: 1,
        gap: 8,
        borderRadius: 24,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        padding: 16,
      }}
    >
      <Text selectable style={{ color: palette.textMuted, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: palette.textPrimary,
          fontSize: 28,
          fontVariant: ['tabular-nums'],
          fontWeight: '800',
        }}
      >
        {value}
      </Text>
      <Text selectable style={{ color: palette.textSecondary, lineHeight: 20 }}>
        {detail}
      </Text>
    </View>
  );
}
