import type { QueueCounts } from '@itera/core';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n/fr';
import { useTheme } from '@/theme/useTheme';
import { space, type } from '@/theme/tokens';

/** New / learning / review counts, Anki colour convention (blue / red / green). */
export function CountChips({ counts, labels = false, large = false }: { counts: QueueCounts; labels?: boolean; large?: boolean }) {
  const theme = useTheme();
  const items = [
    { n: counts.new, color: theme.state.new, label: t.counts.new },
    { n: counts.learning, color: theme.state.learning, label: t.counts.learning },
    { n: counts.review, color: theme.state.review, label: t.counts.review },
  ];
  return (
    <View style={[styles.row, large && styles.large]}>
      {items.map((i) => (
        <View key={i.label} style={[styles.item, large && styles.itemLarge]} accessibilityLabel={`${i.n} ${i.label}`}>
          <Text style={[large ? type.title : type.headline, { color: i.n > 0 ? i.color : theme.textTertiary, fontVariant: ['tabular-nums'] }]}>{i.n}</Text>
          {labels ? <Text style={[type.caption, { color: theme.textSecondary }]}>{i.label}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  large: { justifyContent: 'space-around' },
  item: { alignItems: 'center', minWidth: 24 },
  itemLarge: { flex: 1 },
});
