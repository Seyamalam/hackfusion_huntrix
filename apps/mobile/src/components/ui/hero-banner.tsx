import { ReactNode } from 'react';
import { Text, View } from 'react-native';

type HeroBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function HeroBanner({ eyebrow, title, description, children }: HeroBannerProps) {
  return (
    <View
      style={{
        gap: 14,
        borderRadius: 32,
        borderCurve: 'continuous',
        backgroundColor: '#182a35',
        padding: 20,
      }}
    >
      <Text
        selectable
        style={{
          color: '#f2b9a9',
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
