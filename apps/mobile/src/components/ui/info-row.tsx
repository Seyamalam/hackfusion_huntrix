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
        alignItems: 'flex-start',
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        paddingBottom: 10,
      }}
    >
      <Text
        selectable
        style={{
          color: palette.textMuted,
          flexBasis: '42%',
          flexShrink: 0,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: palette.textPrimary,
          flex: 1,
          fontVariant: ['tabular-nums'],
          fontWeight: '700',
          lineHeight: 26,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
