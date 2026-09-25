/** Optional biometric / passcode lock (Face ID, Touch ID, device passcode). */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const SETTING = 'itera.app-lock.v1';

export const appLockSupported = true;

export async function canUseAppLock(): Promise<boolean> {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function isAppLockEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(SETTING)) === '1';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(SETTING, '1', { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(SETTING);
}

export async function authenticate(reason: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: reason, disableDeviceFallback: false });
  return result.success;
}
