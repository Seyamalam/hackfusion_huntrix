import { Text, View } from 'react-native';

import { palette } from '@/src/theme/palette';

type InfoRowProps = {
  label: string;
  value: string;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        paddingBottom: 10,
      }}
    >
      <Text selectable style={{ color: palette.textMuted, fontWeight: '700' }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: palette.textPrimary,
          fontVariant: ['tabular-nums'],
          fontWeight: '700',
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
