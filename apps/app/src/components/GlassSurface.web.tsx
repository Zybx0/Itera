/** Web: CSS backdrop-filter glass with a specular top highlight. */
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius as radii } from '@/theme/tokens';

import { GlassSheen } from './GlassSheen';
import type { GlassSurfaceProps } from './GlassSurface.types';

export function GlassSurface({ children, style, radius = radii.lg, variant = 'regular', tint }: GlassSurfaceProps) {
  const theme = useTheme();
  const blur = variant === 'clear' ? 'blur(16px) saturate(170%)' : 'blur(30px) saturate(190%)';
  const glass = {
    borderRadius: radius,
    backgroundColor: tint ?? (variant === 'clear' ? theme.glassFill : theme.glassFillStrong),
    borderWidth: 1,
    borderColor: theme.glassBorder,
    overflow: 'hidden',
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    boxShadow: `inset 0 1px 0 ${theme.glassHighlight}, inset 0 -1px 0 rgba(0,0,0,0.25), 0 10px 40px -12px ${theme.shadow}`,
  } as ViewStyle;
  return (
    <View style={[glass, style]}>
      <GlassSheen />
      {children}
    </View>
  );
}
