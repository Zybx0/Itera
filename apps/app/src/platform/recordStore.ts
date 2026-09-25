/**
 * iOS / native persistence: one SQLite table of encrypted blobs.
 * secure_delete overwrites freed pages with zeros, and clear() checkpoints
 * the WAL and VACUUMs so erased data does not linger in the database files.
 */
import type { RecordStore, StoredRecord } from '@itera/core';
import * as SQLite from 'expo-sqlite';

export async function openRecordStore(): Promise<RecordStore> {
  const db = await SQLite.openDatabaseAsync('itera.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA secure_delete = ON;
    CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY NOT NULL, payload BLOB NOT NULL) WITHOUT ROWID;
  `);

  return {
    async getAll(): Promise<StoredRecord[]> {
      const rows = await db.getAllAsync<{ id: string; payload: Uint8Array }>('SELECT id, payload FROM records');
      return rows.map((r) => ({ id: r.id, payload: new Uint8Array(r.payload) }));
    },
    async commit({ put, remove }) {
      if (put.length === 0 && remove.length === 0) return;
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const id of remove) await tx.runAsync('DELETE FROM records WHERE id = ?', id);
        for (const r of put) await tx.runAsync('INSERT OR REPLACE INTO records (id, payload) VALUES (?, ?)', r.id, r.payload);
      });
    },
    async clear() {
      await db.execAsync('DELETE FROM records; PRAGMA wal_checkpoint(TRUNCATE); VACUUM;');
    },
  };
}
