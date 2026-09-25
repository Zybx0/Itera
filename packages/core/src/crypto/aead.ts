/**
 * Authenticated encryption for every record persisted by Itera.
 *
 * Algorithm: XChaCha20-Poly1305 (@noble/ciphers, audited, constant-time,
 * pure JS so it behaves identically on iOS/Hermes, web and desktop).
 * The 192-bit nonce is random per message, so nonce reuse is not a practical
 * concern even with billions of writes under the same key.
 *
 * Sealed layout (bytes):  [version=0x01][nonce:24][ciphertext+tag]
 * The version byte gives us crypto agility: a future algorithm gets 0x02 and
 * old data stays readable.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';

import { IteraError } from '../errors';
import { randomBytes } from './random';

export const KEY_LENGTH = 32;
const NONCE_LENGTH = 24;
const VERSION_V1 = 0x01;

export function generateKey(): Uint8Array {
  return randomBytes(KEY_LENGTH);
}

function assertKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || key.length !== KEY_LENGTH) {
    throw new IteraError('CRYPTO', 'Invalid key length');
  }
}

/** Encrypt `plaintext`, binding it to `aad` (authenticated but not encrypted). */
export function seal(key: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): Uint8Array {
  assertKey(key);
  const nonce = randomBytes(NONCE_LENGTH);
  const ciphertext = xchacha20poly1305(key, nonce, aad).encrypt(plaintext);
  const out = new Uint8Array(1 + NONCE_LENGTH + ciphertext.length);
  out[0] = VERSION_V1;
  out.set(nonce, 1);
  out.set(ciphertext, 1 + NONCE_LENGTH);
  return out;
}

/** Decrypt and authenticate. Throws IteraError('CRYPTO') on any tampering. */
export function open(key: Uint8Array, sealed: Uint8Array, aad: Uint8Array): Uint8Array {
  assertKey(key);
  if (sealed.length < 1 + NONCE_LENGTH + 16 || sealed[0] !== VERSION_V1) {
    throw new IteraError('CRYPTO', 'Unsupported or truncated ciphertext');
  }
  const nonce = sealed.subarray(1, 1 + NONCE_LENGTH);
  const ciphertext = sealed.subarray(1 + NONCE_LENGTH);
  try {
    return xchacha20poly1305(key, nonce, aad).decrypt(ciphertext);
  } catch (cause) {
    throw new IteraError('CRYPTO', 'Decryption failed (wrong key or corrupted data)', { cause });
  }
}

/** Best-effort zeroisation of key material that is no longer needed. */
export function wipeBytes(bytes: Uint8Array): void {
  bytes.fill(0);
}
