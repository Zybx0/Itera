/**
 * Full-screen backdrop: a plain, static two-stop gradient — no decorative
 * shapes, no motion. The glass surfaces above blur/refract this flat field,
 * which is what reads as "glass": the effect comes from the panels, not from
 * a colourful backdrop.
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
