/**
 * Full-screen backdrop: a plain, static, near-flat gradient. No decorative
 * shapes, no motion — the "liquid glass" character comes entirely from the
 * panels (see GlassSurface*), not from the backdrop.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export function Background() {
  const theme = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={theme.backgroundGradient} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
