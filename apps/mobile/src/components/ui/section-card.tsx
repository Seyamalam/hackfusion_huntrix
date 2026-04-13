import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { palette } from '@/src/theme/palette';

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function SectionCard({ eyebrow, title, description, children }: SectionCardProps) {
  return (
    <View
      accessible
      style={{
        gap: 12,
        borderRadius: 28,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.borderStrong,
        backgroundColor: palette.surface,
        padding: 18,
        shadowColor: '#102430',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      }}
    >
      <View style={{ gap: 6 }}>
        <Text
          selectable
          style={{
            color: palette.info,
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Text>
        <Text selectable style={{ color: palette.textPrimary, fontSize: 22, fontWeight: '800' }}>
          {title}
        </Text>
        <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
          {description}
        </Text>
      </View>
      {children}
    </View>
  );
}
