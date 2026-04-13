import { Text, View } from 'react-native';

import { palette } from '@/src/theme/palette';

type StatusTone = 'alert' | 'info' | 'neutral' | 'success' | 'warning';

type StatusPillProps = {
  label: string;
  tone: StatusTone;
};

const toneMap: Record<StatusTone, { background: string; text: string }> = {
  alert: { background: '#f7d7cf', text: '#8d2f1f' },
  info: { background: '#d5e7f0', text: '#1b4f69' },
  neutral: { background: '#e7dfd2', text: palette.textPrimary },
  success: { background: '#d4ebdf', text: '#125741' },
  warning: { background: '#f2e2bf', text: '#8b5609' },
};

export function StatusPill({ label, tone }: StatusPillProps) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        borderRadius: 999,
        backgroundColor: toneMap[tone].background,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#ffffff55',
      }}
    >
      <Text selectable style={{ color: toneMap[tone].text, fontSize: 13, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}
