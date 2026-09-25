/** Page scaffold: animated background, safe areas, centred column on wide screens, glass header. */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n/fr';
import { useTheme } from '@/theme/useTheme';
import { MAX_CONTENT_WIDTH, space, type } from '@/theme/tokens';

import { Background } from './Background';
import { GlassButton } from './GlassButton';

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}

export function Screen({ title, subtitle, back, right, children, scroll = true, footer }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <View style={[styles.root, styles.clip]}>
      <Background />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Body
          style={styles.root}
          {...(scroll
            ? { contentContainerStyle: [styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl }], keyboardShouldPersistTaps: 'handled' as const }
            : { style: [styles.root, styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md }] })}>
          <View style={styles.header}>
            {back ? <GlassButton icon="back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel={t.common.back} /> : null}
            <View style={styles.flex} />
            {right}
          </View>
          {title ? (
            <Animated.View entering={FadeInDown.duration(380)} style={styles.titles}>
              <Text style={[type.largeTitle, { color: theme.text }]} accessibilityRole="header" numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? <Text style={[type.callout, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
            </Animated.View>
          ) : null}
          {children}
        </Body>
        {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  clip: { overflow: 'hidden' },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: space.lg, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 46 },
  titles: { gap: space.xs },
  footer: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: space.lg },
});
