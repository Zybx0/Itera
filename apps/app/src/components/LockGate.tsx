/**
 * Security overlays (native only; no-ops on web):
 *  - privacy shield: hides content while the app is inactive, so the iOS
 *    app switcher snapshot never shows cards;
 *  - app lock: when enabled, requires Face ID / passcode on launch and when
 *    returning from background. While locked, the collection provider is
 *    unmounted: nothing is decrypted until the user authenticates.
 */
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n/fr';
import { appLockSupported, authenticate, isAppLockEnabled } from '@/platform/appLock';
import { useTheme } from '@/theme/useTheme';
import { space, type } from '@/theme/tokens';

import { Background } from './Background';
import { GlassButton } from './GlassButton';
import { Icon } from './Icon';

export function LockGate({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [locked, setLocked] = useState(appLockSupported);
  const [shielded, setShielded] = useState(false);
  const enabled = useRef(false);

  const unlock = async () => {
    if (!enabled.current || (await authenticate(t.lock.reason))) setLocked(false);
    // If authentication was cancelled, the lock screen must not stay hidden behind the splash.
    else void SplashScreen.hideAsync();
  };

  useEffect(() => {
    if (!appLockSupported) return;
    isAppLockEnabled().then((on) => {
      enabled.current = on;
      if (on) void unlock();
      else setLocked(false);
    });
    const sub = AppState.addEventListener('change', (state) => {
      setShielded(state !== 'active');
      if (state === 'background') {
        void isAppLockEnabled().then((on) => {
          enabled.current = on;
          if (on) setLocked(true);
        });
      }
    });
    return () => sub.remove();
  }, []);

  if (!locked && !shielded) return <>{children}</>;
  return (
    <View style={styles.root}>
      {locked ? null : children}
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Background />
        {locked ? (
          <View style={styles.center}>
            <Icon name="lock" size={40} color={theme.text} />
            <Text style={[type.title, { color: theme.text }]}>{t.lock.title}</Text>
            <GlassButton label={t.lock.unlock} variant="primary" size="lg" onPress={unlock} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
});
