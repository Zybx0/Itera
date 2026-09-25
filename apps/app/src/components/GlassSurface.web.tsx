/** Web: CSS backdrop-filter glass with a specular top highlight. */
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius as radii } from '@/theme/tokens';

import type { GlassSurfaceProps } from './GlassSurface.types';

export function GlassSurface({ children, style, radius = radii.lg, variant = 'regular', tint }: GlassSurfaceProps) {
  const theme = useTheme();
  const blur = variant === 'clear' ? 'blur(14px) saturate(160%)' : 'blur(28px) saturate(180%)';
  const glass = {
    borderRadius: radius,
    backgroundColor: tint ?? (variant === 'clear' ? theme.glassFill : theme.glassFillStrong),
    borderWidth: 1,
    borderColor: theme.glassBorder,
    overflow: 'hidden',
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    boxShadow: `inset 0 1px 0 ${theme.glassHighlight}, 0 10px 40px -12px ${theme.shadow}`,
  } as ViewStyle;
  return <View style={[glass, style]}>{children}</View>;
}
