import { Pressable, Text } from 'react-native';

import { palette } from '@/src/theme/palette';

type ActionChipProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger' | 'primary';
};

const toneMap = {
  default: {
    backgroundColor: palette.surfaceStrong,
    color: palette.textPrimary,
    borderColor: palette.borderStrong,
  },
  danger: {
    backgroundColor: '#f4d6d0',
    color: '#8d2f1f',
    borderColor: '#d7a499',
  },
  primary: {
    backgroundColor: palette.brandDeep,
    color: '#fff6ee',
    borderColor: '#0f2532',
  },
};

export function ActionChip({
  accessibilityHint,
  accessibilityLabel,
  label,
  onPress,
  tone = 'default',
}: ActionChipProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 999,
        borderWidth: 1,
        borderColor: toneMap[tone].borderColor,
        backgroundColor: toneMap[tone].backgroundColor,
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <Text style={{ color: toneMap[tone].color, fontWeight: '800', lineHeight: 18 }}>{label}</Text>
    </Pressable>
  );
}
