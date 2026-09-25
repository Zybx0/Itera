import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/theme/useTheme';
import { space, type } from '@/theme/tokens';

import { GlassSurface } from './GlassSurface';

export function Section({ title, children, delay = 0 }: { title?: string; children: ReactNode; delay?: number }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)} style={styles.wrap}>
      {title ? <Text style={[type.caption, styles.title, { color: theme.textSecondary }]}>{title.toUpperCase()}</Text> : null}
      <GlassSurface style={styles.body}>{children}</GlassSurface>
    </Animated.View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  title: { marginLeft: space.md, letterSpacing: 0.6 },
  body: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
