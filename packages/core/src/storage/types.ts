/**
 * Persistence contract implemented by each platform (SQLite on iOS/desktop,
 * IndexedDB on web, in-memory for tests).
 *
 * The store only ever sees opaque encrypted blobs keyed by record id: no
 * card text, deck name, date or type is stored in clear. This keeps the
 * storage layer trivial and makes a future end-to-end-encrypted sync server
 * unable to read user data (privacy by design, GDPR art. 25).
 */
export interface StoredRecord {
  id: string;
  /** Output of `seal()` — see crypto/aead.ts. */
  payload: Uint8Array;
}

export interface StoreChanges {
  put: StoredRecord[];
  remove: string[];
}

export interface RecordStore {
  /** Every record currently stored. */
  getAll(): Promise<StoredRecord[]>;
  /** Apply puts and removes atomically (all or nothing). */
  commit(changes: StoreChanges): Promise<void>;
  /** Remove every record (GDPR right to erasure). */
  clear(): Promise<void>;
}
