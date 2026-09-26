/**
 * Full-screen backdrop: a plain near-flat gradient with, in dark mode, two
 * very soft, diffuse light sources anchored in opposite corners (à la
 * glassresearch.tech) — no visible circular edge, no motion. Approximated
 * with stacked, increasingly-opaque concentric circles (works identically
 * on native and web) and, on web only, an extra CSS blur on top to erase any
 * remaining banding. The glass surfaces above blur/refract this field, which
 * is what reads as "glass": the effect comes from the panels, not the décor.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

const RINGS = [
  { scale: 1, opacity: 0.05 },
  { scale: 0.68, opacity: 0.07 },
  { scale: 0.4, opacity: 0.09 },
] as const;

/** A soft radial glow, faked with concentric circles, centred on (cx, cy). */
function Glow({ color, cx, cy, size }: { color: string; cx: number; cy: number; size: number }) {
  const blur = Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as ViewStyle) : null;
  return (
    <View style={[StyleSheet.absoluteFill, blur]} pointerEvents="none">
      {RINGS.map((ring) => {
        const ringSize = size * ring.scale;
        return (
          <View
            key={ring.scale}
            style={{
              position: 'absolute',
              left: cx - ringSize / 2,
              top: cy - ringSize / 2,
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              backgroundColor: color,
              opacity: ring.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

export function Background() {
  const theme = useTheme();
  // Measured after mount (onLayout), not useWindowDimensions: Expo Router's
  // static web export pre-renders with no real window, so sizing the glow
  // from the window size mismatches between server and client hydration.
  // Starting from null on both sides and filling in post-mount avoids that.
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  };
  const size = layout ? Math.max(layout.width, layout.height) * 1.1 : 0;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none" onLayout={onLayout}>
      <LinearGradient colors={theme.backgroundGradient} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {theme.glow && layout ? (
        <>
          <Glow color={theme.glow[0]} cx={0} cy={0} size={size} />
          <Glow color={theme.glow[1]} cx={layout.width} cy={layout.height} size={size} />
        </>
      ) : null}
    </View>
  );
}
