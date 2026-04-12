import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { palette } from '@/src/theme/palette';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Route Missing' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 20,
          backgroundColor: palette.canvas,
        }}
      >
        <Text selectable style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary }}>
          This route does not exist.
        </Text>

        <Link href="/" style={{ paddingVertical: 12 }}>
          <Text selectable style={{ color: palette.alert, fontWeight: '700' }}>
            Return to command view
          </Text>
        </Link>
      </View>
    </>
  );
}
