/**
 * Full-screen animated backdrop: a soft gradient with three slowly drifting
 * colour orbs. The glass surfaces above blur/refract it, which is what makes
 * the UI feel "liquid". Animations run on the UI thread (Reanimated) and
 * are disabled when the user asks the OS to reduce motion.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/useTheme';

function Orb({
  color,
  size,
  from,
  to,
  duration,
  opacity = 0.32,
}: {
  color: string;
  size: number;
  from: [number, number];
  to: [number, number];
  duration: number;
  opacity?: number;
}) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!reduceMotion) progress.set(withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [progress, duration, reduceMotion]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: from[0] + (to[0] - from[0]) * progress.get() },
      { translateY: from[1] + (to[1] - from[1]) * progress.get() },
      { scale: 1 + 0.15 * progress.get() },
    ],
  }));

  const blur = Platform.OS === 'web' ? ({ filter: 'blur(70px)' } as ViewStyle) : null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }, blur, animated]}
    />
  );
}

export function Background() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const size = Math.max(width, height) * 0.55;
  // Sober look: mostly black/near-white, the violet glow is a hint, not a rainbow.
  const opacity = theme.dark ? 0.22 : 0.38;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <LinearGradient colors={theme.backgroundGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Orb color={theme.orbs[0]} size={size} from={[-size * 0.3, -size * 0.2]} to={[width * 0.3, height * 0.1]} duration={17_000} opacity={opacity} />
      <Orb color={theme.orbs[1]} size={size * 0.8} from={[width * 0.6, height * 0.35]} to={[width * 0.1, height * 0.55]} duration={21_000} opacity={opacity} />
      <Orb color={theme.orbs[2]} size={size * 0.9} from={[width * 0.1, height * 0.8]} to={[width * 0.55, height * 0.6]} duration={25_000} opacity={opacity} />
    </View>
  );
}
