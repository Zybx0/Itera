import { describe, expect, it } from 'vitest';

import { generateKey, open, seal } from '../src/crypto/aead';
import { base64ToBytes, bytesToBase64, utf8ToBytes } from '../src/crypto/encoding';
import { assertKdfParams, assertPassphrase, DEFAULT_KDF_PARAMS, deriveKey } from '../src/crypto/kdf';
import { randomBytes } from '../src/crypto/random';
import { isIteraError } from '../src/errors';
import { newId, UUID_V4_PATTERN } from '../src/ids';

const aad = utf8ToBytes('aad');

describe('aead', () => {
  it('round-trips and produces distinct ciphertexts for the same plaintext', () => {
    const key = generateKey();
    const msg = utf8ToBytes('Bonjour — 你好 — 🙂');
    const a = seal(key, msg, aad);
    const b = seal(key, msg, aad);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
    expect(open(key, a, aad)).toEqual(msg);
  });

  it('rejects tampering, wrong key, wrong AAD, truncation and unknown versions', () => {
    const key = generateKey();
    const sealed = seal(key, utf8ToBytes('secret'), aad);
    const flipped = sealed.slice();
    flipped[flipped.length - 1]! ^= 1;
    const wrongVersion = sealed.slice();
    wrongVersion[0] = 2;
    const attempts = [
      () => open(key, flipped, aad),
      () => open(generateKey(), sealed, aad),
      () => open(key, sealed, utf8ToBytes('other')),
      () => open(key, sealed.subarray(0, 20), aad),
      () => open(key, wrongVersion, aad),
      () => seal(new Uint8Array(16), sealed, aad),
    ];
    for (const attempt of attempts) {
      expect(attempt).toThrow();
      try {
        attempt();
      } catch (e) {
        expect(isIteraError(e, 'CRYPTO')).toBe(true);
      }
    }
  });
});

describe('encoding', () => {
  it('matches Node base64 for all padding lengths', () => {
    for (let len = 0; len < 40; len++) {
      const bytes = randomBytes(len);
      const b64 = bytesToBase64(bytes);
      expect(b64).toBe(Buffer.from(bytes).toString('base64'));
      expect(base64ToBytes(b64)).toEqual(bytes);
    }
  });

  it('rejects malformed base64', () => {
    expect(() => base64ToBytes('abc')).toThrow();
    expect(() => base64ToBytes('ab$=')).toThrow();
  });
});

describe('random & ids', () => {
  it('produces RFC 4122 v4 ids without collisions', () => {
    const ids = new Set(Array.from({ length: 2000 }, newId));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(id).toMatch(UUID_V4_PATTERN);
  });

  it('supports large buffers', () => {
    expect(randomBytes(70_000).length).toBe(70_000);
  });
});

describe('kdf', () => {
  it('enforces passphrase length and parameter bounds', () => {
    expect(() => assertPassphrase('short')).toThrow();
    expect(() => assertPassphrase('correct horse battery')).not.toThrow();
    expect(() => assertKdfParams({ ...DEFAULT_KDF_PARAMS, m: 8 })).toThrow();
    expect(() => assertKdfParams({ ...DEFAULT_KDF_PARAMS, m: 10_000_000 })).toThrow();
    expect(() => assertKdfParams({ ...DEFAULT_KDF_PARAMS, t: 1 })).toThrow();
  });

  it('is deterministic for the same inputs and NFKC-normalises', async () => {
    const salt = randomBytes(16);
    const a = await deriveKey('ﬁne passphrase!', salt);
    const b = await deriveKey('fine passphrase!', salt);
    expect(a).toEqual(b);
    expect(a.length).toBe(32);
    await expect(deriveKey('fine passphrase!', new Uint8Array(4))).rejects.toThrow();
  });
});
