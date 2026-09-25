import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius, space, type } from '@/theme/tokens';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const theme = useTheme();
  return (
    <GlassSurface radius={radius.pill} variant="clear" style={styles.row}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            style={[styles.item, selected && { backgroundColor: theme.accent }]}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}>
            <Text style={[type.callout, { color: selected ? theme.accentText : theme.text }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', padding: space.xs, gap: space.xs },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: radius.pill, paddingHorizontal: space.md },
});

