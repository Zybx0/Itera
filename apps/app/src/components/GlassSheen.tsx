/**
 * The specular highlight that sells "liquid glass": a soft diagonal sheen
 * glancing across the top of the panel, fading to nothing. Shared by every
 * GlassSurface variant except the real native Liquid Glass (iOS 26+, which
 * renders its own specular highlight and needs none of ours).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export function GlassSheen() {
  const theme = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[theme.glassHighlight, 'transparent']}
      locations={[0, 0.6]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.7, y: 0.8 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
