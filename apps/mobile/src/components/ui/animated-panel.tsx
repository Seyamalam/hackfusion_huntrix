import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

type AnimatedPanelProps = {
  children: ReactNode;
  index?: number;
};

export function AnimatedPanel({ children, index = 0 }: AnimatedPanelProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(400)} layout={LinearTransition}>
      <View>{children}</View>
    </Animated.View>
  );
}
