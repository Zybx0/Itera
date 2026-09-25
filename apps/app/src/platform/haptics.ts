import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function tapFeedback(): void {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

export function successFeedback(): void {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
