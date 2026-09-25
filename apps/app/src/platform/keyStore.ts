/**
 * iOS / native: the 256-bit data key lives in the Keychain.
 * WHEN_UNLOCKED_THIS_DEVICE_ONLY → readable only while the device is
 * unlocked, never synced to iCloud Keychain, never restored on another
 * device. Consequence: moving to a new phone requires an Itera export.
 */
import { base64ToBytes, bytesToBase64, generateKey, KEY_LENGTH } from '@itera/core';
import * as SecureStore from 'expo-secure-store';

const KEY_NAME = 'itera.data-key.v1';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function loadOrCreateDataKey(): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync(KEY_NAME, OPTIONS);
  if (existing) {
    const key = base64ToBytes(existing);
    if (key.length === KEY_LENGTH) return key;
  }
  const key = generateKey();
  await SecureStore.setItemAsync(KEY_NAME, bytesToBase64(key), OPTIONS);
  return key;
}

/** Crypto-shredding: without the key, any leftover ciphertext is unreadable. */
export async function destroyDataKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAME, OPTIONS);
}
