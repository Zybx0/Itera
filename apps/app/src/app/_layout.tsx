import '@/polyfills';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Background } from '@/components/Background';
import { LockGate } from '@/components/LockGate';
import { t } from '@/i18n/fr';
import { enableOffline } from '@/platform/offline';
import { CollectionProvider, useCollectionStatus } from '@/state/CollectionProvider';
import { errorMessage } from '@/state/errors';
import { useTheme } from '@/theme/useTheme';
import { space, type } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();
enableOffline();

function Gate() {
  const status = useCollectionStatus();
  const theme = useTheme();

  useEffect(() => {
    if (status.kind !== 'loading') void SplashScreen.hideAsync();
  }, [status.kind]);

  if (status.kind === 'ready') {
    return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: 'transparent' } }} />;
  }
  return (
    <View style={styles.center}>
      <Background />
      {status.kind === 'loading' ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <>
          <Text style={[type.title, { color: theme.text }]}>{t.common.errorTitle}</Text>
          <Text style={[type.body, { color: theme.textSecondary, textAlign: 'center' }]}>{errorMessage(status.error)}</Text>
        </>
      )}
    </View>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.backgroundGradient[0] }]}>
      <SafeAreaProvider>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <LockGate>
          <CollectionProvider>
            <Gate />
          </CollectionProvider>
        </LockGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
});
