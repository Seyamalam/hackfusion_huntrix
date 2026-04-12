import { Pressable, Text, View } from 'react-native';

import { palette } from '@/src/theme/palette';

type OtpCardProps = {
  code: string;
  detail: string;
  title: string;
  onPress?: () => void;
  actionLabel?: string;
};

export function OtpCard({ code, detail, title, onPress, actionLabel }: OtpCardProps) {
  return (
    <View
      style={{
        gap: 12,
        borderRadius: 28,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        padding: 18,
      }}
    >
      <Text selectable style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700' }}>
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: palette.alert,
          fontSize: 40,
          fontVariant: ['tabular-nums'],
          fontWeight: '900',
          letterSpacing: 4,
        }}
      >
        {code}
      </Text>
      <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
        {detail}
      </Text>
      {onPress && actionLabel ? (
        <Pressable
          onPress={onPress}
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            backgroundColor: palette.surfaceStrong,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
