/**
 * Web: the data key is stored *wrapped* (AES-GCM) by a non-extractable
 * WebCrypto key kept in IndexedDB. The browser can use that wrapping key but
 * no script can read its bytes, so copying the IndexedDB files off the disk
 * is not enough to decrypt the data. Limits (documented in docs/SECURITE.md):
 * code running in the page (XSS, malicious extension) could still ask the
 * browser to unwrap — hence the strict CSP.
 */
import { generateKey, KEY_LENGTH } from '@itera/core';

import { idbDone, idbRequest, openIdb } from './idb.web';

const DB = 'itera-keys';
const STORE = 'keys';
const ENTRY = 'data-key.v1';

interface WrappedKey {
  wrappingKey: CryptoKey;
  iv: Uint8Array<ArrayBuffer>;
  wrapped: ArrayBuffer;
}

export async function loadOrCreateDataKey(): Promise<Uint8Array> {
  const db = await openIdb(DB, [STORE]);
  try {
    const existing = (await idbRequest(db.transaction(STORE).objectStore(STORE).get(ENTRY))) as WrappedKey | undefined;
    if (existing) {
      const raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: existing.iv }, existing.wrappingKey, existing.wrapped));
      if (raw.length === KEY_LENGTH) return raw;
    }
    const key = generateKey();
    const wrappingKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, key.slice());
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ wrappingKey, iv, wrapped } satisfies WrappedKey, ENTRY);
    await idbDone(tx);
    return key;
  } finally {
    db.close();
  }
}

export async function destroyDataKey(): Promise<void> {
  const db = await openIdb(DB, [STORE]);
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(ENTRY);
    await idbDone(tx);
  } finally {
    db.close();
  }
}
