/**
 * iOS: native Liquid Glass (UIGlassEffect) on iOS 26+, system material blur
 * on older versions.
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius as radii } from '@/theme/tokens';

import { GlassSheen } from './GlassSheen';
import type { GlassSurfaceProps } from './GlassSurface.types';

const LIQUID = isLiquidGlassAvailable();

export function GlassSurface({ children, style, radius = radii.lg, variant = 'regular', tint, interactive }: GlassSurfaceProps) {
  const theme = useTheme();
  if (LIQUID) {
    // Real system Liquid Glass already renders its own specular highlight — no GlassSheen here.
    return (
      <GlassView
        glassEffectStyle={variant}
        isInteractive={interactive ?? false}
        {...(tint ? { tintColor: tint } : {})}
        style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView
      intensity={variant === 'clear' ? 40 : 70}
      tint={theme.dark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
      style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.glassBorder }, style]}>
      {tint ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.85 }]} /> : null}
      <GlassSheen />
      {children}
    </BlurView>
  );
}
