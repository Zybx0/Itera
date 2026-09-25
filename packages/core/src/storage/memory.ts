import type { RecordStore, StoreChanges, StoredRecord } from './types';

/** Reference implementation used by tests and as a behavioural spec for platform stores. */
export class MemoryRecordStore implements RecordStore {
  private readonly records = new Map<string, Uint8Array>();

  async getAll(): Promise<StoredRecord[]> {
    return [...this.records].map(([id, payload]) => ({ id, payload: payload.slice() }));
  }

  async commit({ put, remove }: StoreChanges): Promise<void> {
    for (const id of remove) this.records.delete(id);
    for (const r of put) this.records.set(r.id, r.payload.slice());
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  /** Test helper: raw access to what would be written to disk. */
  raw(): ReadonlyMap<string, Uint8Array> {
    return this.records;
  }
}
