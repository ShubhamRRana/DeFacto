import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors as defaultColors } from '../theme/colors';

const SQUARE = 26;
const OFFSET = 30;
const DURATION = 2400;
const LOOP_DELAY = 200;
const FADE_DURATION = 400;

const SQUARE_PATHS = [
  {
    input: [0, 8.333, 100],
    x: [0, 0, 0],
    y: [0, 1, 1],
    fadeDelay: 100,
  },
  {
    input: [0, 8.333, 16.67, 25, 83.33, 91.67, 100],
    x: [0, 0, 1, 1, 1, 1, 0],
    y: [1, 2, 2, 1, 1, 0, 0],
    fadeDelay: 100,
  },
  {
    input: [0, 16.67, 25, 33.33, 41.67, 66.67, 75, 83.33, 91.67, 100],
    x: [1, 1, 1, 2, 2, 2, 2, 1, 1, 1],
    y: [1, 1, 0, 0, 1, 1, 2, 2, 1, 1],
    fadeDelay: 200,
  },
  {
    input: [0, 33.33, 41.67, 50, 58.33, 100],
    x: [2, 2, 2, 3, 3, 3],
    y: [1, 1, 2, 2, 1, 1],
    fadeDelay: 300,
  },
  {
    input: [0, 50, 58.33, 66.67, 75, 100],
    x: [3, 3, 3, 2, 2, 2],
    y: [1, 1, 0, 0, 1, 1],
    fadeDelay: 400,
  },
];

function AnimatedSquare({ path, color }) {
  const progress = useSharedValue(0);
  const fadeProgress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withDelay(
        LOOP_DELAY,
        withTiming(1, { duration: DURATION, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    fadeProgress.value = withDelay(
      path.fadeDelay,
      withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );
  }, [fadeProgress, path.fadeDelay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value * 100;
    const x = interpolate(p, path.input, path.x.map((col) => col * OFFSET));
    const y = interpolate(p, path.input, path.y.map((row) => row * OFFSET));
    const scale = interpolate(fadeProgress.value, [0, 1], [0.75, 1]);

    return {
      opacity: fadeProgress.value,
      transform: [{ translateX: x }, { translateY: y }, { scale }],
    };
  });

  return (
    <Animated.View
      style={[styles.square, { backgroundColor: color }, animatedStyle]}
    />
  );
}

export default function LoadingSpinner({ color = defaultColors.primary, style }) {
  return (
    <View style={[styles.container, style]}>
      {SQUARE_PATHS.map((path, index) => (
        <AnimatedSquare key={index} path={path} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 3 * OFFSET + SQUARE,
    height: 2 * OFFSET + SQUARE,
    position: 'relative',
  },
  square: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SQUARE,
    height: SQUARE,
    borderRadius: 2,
  },
});
