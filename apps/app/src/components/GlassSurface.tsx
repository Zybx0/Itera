/** Fallback (Android and any platform without a dedicated file): translucent panel, no blur. */
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius as radii } from '@/theme/tokens';

import type { GlassSurfaceProps } from './GlassSurface.types';

export function GlassSurface({ children, style, radius = radii.lg, variant = 'regular', tint }: GlassSurfaceProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius,
          backgroundColor: tint ?? (variant === 'clear' ? theme.glassFill : theme.glassFillStrong),
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.glassBorder,
          overflow: 'hidden',
        },
        style,
      ]}>
      {children}
    </View>
  );
}
