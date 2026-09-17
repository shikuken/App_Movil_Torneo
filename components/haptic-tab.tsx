import { Pressable, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';

type HapticTabProps = PressableProps & {
  children?: React.ReactNode;
};

export function HapticTab({ onPressIn, ...props }: HapticTabProps) {
  return (
    <Pressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
    />
  );
}
