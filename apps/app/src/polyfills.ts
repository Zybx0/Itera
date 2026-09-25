/**
 * Must be imported before anything from @itera/core.
 * Hermes (iOS) has no WebCrypto: we expose expo-crypto's CSPRNG
 * (SecRandomCopyBytes on iOS) as globalThis.crypto.getRandomValues.
 */
import { getRandomValues } from 'expo-crypto';

type CryptoGlobal = { crypto?: { getRandomValues?: unknown } };
const g = globalThis as CryptoGlobal;
if (typeof g.crypto?.getRandomValues !== 'function') {
  g.crypto = Object.assign(g.crypto ?? {}, { getRandomValues });
}
