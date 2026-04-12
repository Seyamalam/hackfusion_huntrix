import { Text, View } from 'react-native';

import type { AuthLogEntry } from '@/src/features/auth/auth-types';
import { palette } from '@/src/theme/palette';

type AuthLogCardProps = {
  entries: AuthLogEntry[];
};

export function AuthLogCard({ entries }: AuthLogCardProps) {
  return (
    <View style={{ gap: 12 }}>
      {entries.map((entry) => (
        <View
          key={entry.id}
          style={{
            gap: 6,
            borderRadius: 20,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.shell,
            padding: 14,
          }}
        >
          <Text selectable style={{ color: palette.alert, fontSize: 12, fontWeight: '800' }}>
            {entry.type.replaceAll('_', ' ').toUpperCase()}
          </Text>
          <Text selectable style={{ color: palette.textPrimary, lineHeight: 20 }}>
            {entry.payload.detail}
          </Text>
          <Text selectable style={{ color: palette.textMuted, fontSize: 12 }}>
            {entry.createdAt}
          </Text>
          <Text selectable style={{ color: palette.textMuted, fontSize: 12 }}>
            prev {entry.prevHash.slice(0, 12)}... hash {entry.hash.slice(0, 12)}...
          </Text>
        </View>
      ))}
    </View>
  );
}
