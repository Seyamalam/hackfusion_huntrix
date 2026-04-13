import { Text, View } from 'react-native';

import { palette } from '@/src/theme/palette';

type SyncStateTone = 'alert' | 'info' | 'neutral' | 'success' | 'warning';

type SyncStateItem = {
  label: string;
  tone: SyncStateTone;
  value: string;
};

export function SyncStateStrip({
  eyebrow = 'State',
  items,
}: {
  eyebrow?: string;
  items: SyncStateItem[];
}) {
  return (
    <View
      accessible
      accessibilityLabel={items.map((item) => `${item.label} ${item.value}`).join(', ')}
      style={{
        gap: 12,
        borderRadius: 24,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: '#f6f0e7',
        padding: 14,
      }}
    >
      <Text
        selectable
        style={{
          color: palette.info,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        }}
      >
        {eyebrow}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map((item) => (
          <View
            key={item.label}
            style={{
              minWidth: 142,
              flexGrow: 1,
              gap: 6,
              borderRadius: 18,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: toneBackground(item.tone),
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text
              selectable
              style={{
                color: toneText(item.tone),
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {item.label}
            </Text>
            <Text selectable style={{ color: palette.textPrimary, fontWeight: '800', lineHeight: 20 }}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function toneBackground(tone: SyncStateTone) {
  switch (tone) {
    case 'alert':
      return '#f7ddd6';
    case 'info':
      return '#dcebf4';
    case 'success':
      return '#dceddf';
    case 'warning':
      return '#f3e4c1';
    default:
      return '#efe6d8';
  }
}

function toneText(tone: SyncStateTone) {
  switch (tone) {
    case 'alert':
      return '#8f321d';
    case 'info':
      return '#1b4f69';
    case 'success':
      return '#115241';
    case 'warning':
      return '#8b5b0d';
    default:
      return palette.textMuted;
  }
}
