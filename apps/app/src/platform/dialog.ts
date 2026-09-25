import { Alert } from 'react-native';

import { t } from '@/i18n/fr';

export function confirm(message: string, confirmLabel: string = t.common.confirm, destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('', message, [
      { text: t.common.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

/** Two-choice dialog; resolves with the chosen index or null if cancelled. */
export function choose(message: string, options: [string, string]): Promise<0 | 1 | null> {
  return new Promise((resolve) => {
    Alert.alert('', message, [
      { text: t.common.cancel, style: 'cancel', onPress: () => resolve(null) },
      { text: options[0], onPress: () => resolve(0) },
      { text: options[1], style: 'destructive', onPress: () => resolve(1) },
    ]);
  });
}

export function notify(message: string): void {
  Alert.alert('', message);
}
