/**
 * Passphrase-based key derivation (Argon2id, RFC 9106) used for encrypted
 * exports/backups. Parameters follow the OWASP Password Storage Cheat Sheet
 * baseline (m = 19 MiB, t = 2, p = 1): a good trade-off for a pure-JS
 * implementation running on a phone.
 */
import { argon2idAsync } from '@noble/hashes/argon2.js';

import { IteraError } from '../errors';
import { utf8ToBytes } from './encoding';
import { KEY_LENGTH } from './aead';

export interface KdfParams {
  alg: 'argon2id';
  /** Memory cost in KiB. */
  m: number;
  /** Iterations. */
  t: number;
  /** Parallelism. */
  p: number;
}

export const DEFAULT_KDF_PARAMS: KdfParams = { alg: 'argon2id', m: 19_456, t: 2, p: 1 };

/** Lower bounds refuse weak files; upper bounds stop a crafted file from exhausting memory/CPU. */
export const KDF_BOUNDS = { m: [19_456, 262_144], t: [2, 10], p: [1, 4] } as const;

export const MIN_PASSPHRASE_LENGTH = 12;

export function assertKdfParams(params: KdfParams): void {
  const ok =
    params.alg === 'argon2id' &&
    Number.isInteger(params.m) && params.m >= KDF_BOUNDS.m[0] && params.m <= KDF_BOUNDS.m[1] &&
    Number.isInteger(params.t) && params.t >= KDF_BOUNDS.t[0] && params.t <= KDF_BOUNDS.t[1] &&
    Number.isInteger(params.p) && params.p >= KDF_BOUNDS.p[0] && params.p <= KDF_BOUNDS.p[1];
  if (!ok) throw new IteraError('VALIDATION', 'KDF parameters out of accepted bounds');
}

export function assertPassphrase(passphrase: string): void {
  if ([...passphrase.normalize('NFKC')].length < MIN_PASSPHRASE_LENGTH) {
    throw new IteraError('VALIDATION', `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`);
  }
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  params: KdfParams = DEFAULT_KDF_PARAMS,
  onProgress?: (fraction: number) => void,
): Promise<Uint8Array> {
  assertKdfParams(params);
  if (salt.length < 16) throw new IteraError('VALIDATION', 'Salt too short');
  // NFKC so the same passphrase typed on different keyboards/OSes gives the same key.
  const password = utf8ToBytes(passphrase.normalize('NFKC'));
  return argon2idAsync(password, salt, {
    m: params.m,
    t: params.t,
    p: params.p,
    dkLen: KEY_LENGTH,
    maxmem: (KDF_BOUNDS.m[1] + 1024) * 1024,
    ...(onProgress ? { onProgress } : {}),
  });
}
