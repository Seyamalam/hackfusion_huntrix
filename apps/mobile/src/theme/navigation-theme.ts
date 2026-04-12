import { DefaultTheme } from '@react-navigation/native';

import { palette } from '@/src/theme/palette';

export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.canvas,
    card: palette.shell,
    border: palette.border,
    notification: palette.alert,
    primary: palette.alert,
    text: palette.textPrimary,
  },
};
