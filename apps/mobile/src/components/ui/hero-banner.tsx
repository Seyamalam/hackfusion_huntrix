import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { palette } from '@/src/theme/palette';

type HeroBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function HeroBanner({ eyebrow, title, description, children }: HeroBannerProps) {
  return (
    <View
      accessible
      style={{
        gap: 14,
        borderRadius: 32,
        borderCurve: 'continuous',
        backgroundColor: palette.brandDeep,
        borderWidth: 1,
        borderColor: '#264a5d',
        padding: 20,
        overflow: 'hidden',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -40,
          top: -30,
          width: 180,
          height: 180,
          borderRadius: 999,
          backgroundColor: '#2e5f78',
          opacity: 0.22,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -30,
          bottom: -50,
          width: 210,
          height: 120,
          borderRadius: 999,
          backgroundColor: '#d9a441',
          opacity: 0.14,
        }}
      />
      <Text
        selectable
        style={{
          color: '#c4dce8',
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {eyebrow}
      </Text>
      <Text
        selectable
        style={{
          color: '#fff8ef',
          fontSize: 30,
          fontWeight: '900',
          lineHeight: 34,
        }}
      >
        {title}
      </Text>
      <Text selectable style={{ color: '#d1dde5', fontSize: 15, lineHeight: 22 }}>
        {description}
      </Text>
      {children ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View> : null}
    </View>
  );
}
