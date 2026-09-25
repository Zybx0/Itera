import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius, space, type } from '@/theme/tokens';

import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export interface GlassButtonProps {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'glass' | 'primary' | 'danger';
  /** Custom tint colour (overrides variant colour). */
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  sublabel?: string;
}

export function GlassButton({ label, icon, onPress, variant = 'glass', color, disabled, loading, size = 'md', style, accessibilityLabel, sublabel }: GlassButtonProps) {
  const theme = useTheme();
  const tint = color ?? (variant === 'primary' ? theme.accent : variant === 'danger' ? theme.danger : undefined);
  const fg = tint ? '#FFFFFF' : theme.text;
  const height = size === 'lg' ? 58 : 46;
  const iconOnly = !label;
  return (
    <PressableScale onPress={onPress} disabled={disabled || loading} style={style} accessibilityLabel={accessibilityLabel ?? label}>
      <GlassSurface radius={radius.pill} tint={tint} interactive variant={tint ? 'regular' : 'clear'} style={{ minHeight: height, minWidth: height }}>
        <View style={[styles.row, { minHeight: height, paddingHorizontal: iconOnly ? 0 : size === 'lg' ? space.xl : space.lg }]}>
          {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} color={fg} size={size === 'lg' ? 22 : 18} /> : null}
          {label ? (
            <View style={styles.labels}>
              <Text style={[size === 'lg' ? type.headline : type.callout, { color: fg }]} numberOfLines={1}>
                {label}
              </Text>
              {sublabel ? <Text style={[type.caption, { color: fg, opacity: 0.8 }]}>{sublabel}</Text> : null}
            </View>
          ) : null}
        </View>
      </GlassSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  labels: { alignItems: 'center' },
});
