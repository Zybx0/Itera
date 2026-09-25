import { IteraError } from '../errors';

interface CryptoLike {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

/**
 * Cryptographically secure random bytes.
 *
 * Relies on `globalThis.crypto.getRandomValues` (WebCrypto). Browsers and
 * Node >= 19 expose it natively; on React Native the app installs it from
 * `expo-crypto` at startup (see apps/app/src/polyfills.ts). We never fall back
 * to Math.random: if no CSPRNG exists we fail loudly.
 */
export function randomBytes(length: number): Uint8Array {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!crypto || typeof crypto.getRandomValues !== 'function') {
    throw new IteraError('CRYPTO', 'No secure random number generator available');
  }
  const out = new Uint8Array(length);
  // getRandomValues is limited to 65536 bytes per call.
  for (let offset = 0; offset < length; offset += 65536) {
    crypto.getRandomValues(out.subarray(offset, Math.min(length, offset + 65536)));
  }
  return out;
}
