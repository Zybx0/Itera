/** Web persistence: IndexedDB object store of encrypted blobs, keyed by record id. */
import type { RecordStore, StoredRecord } from '@itera/core';

import { idbDone, idbRequest, openIdb } from './idb.web';

const STORE = 'records';

export async function openRecordStore(): Promise<RecordStore> {
  const db = await openIdb('itera-data', [STORE]);

  return {
    async getAll(): Promise<StoredRecord[]> {
      const store = db.transaction(STORE).objectStore(STORE);
      const [keys, values] = await Promise.all([idbRequest(store.getAllKeys()), idbRequest(store.getAll())]);
      return keys.map((id, i) => ({ id: String(id), payload: new Uint8Array(values[i] as ArrayBuffer) }));
    },
    async commit({ put, remove }) {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const id of remove) store.delete(id);
      for (const r of put) store.put(r.payload.slice().buffer, r.id);
      await idbDone(tx);
    },
    async clear() {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      await idbDone(tx);
    },
  };
}
