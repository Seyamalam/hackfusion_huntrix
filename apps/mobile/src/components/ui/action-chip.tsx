import { Pressable, Text } from 'react-native';

import { palette } from '@/src/theme/palette';

type ActionChipProps = {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger' | 'primary';
};

const toneMap = {
  default: {
    backgroundColor: palette.surfaceStrong,
    color: palette.textPrimary,
  },
  danger: {
    backgroundColor: '#f4d0c7',
    color: '#8d2f1f',
  },
  primary: {
    backgroundColor: palette.alert,
    color: '#fff6ee',
  },
};

export function ActionChip({ label, onPress, tone = 'default' }: ActionChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 999,
        backgroundColor: toneMap[tone].backgroundColor,
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: toneMap[tone].color, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}
