/**
 * Converts domain records to encrypted storage blobs and back.
 * The record id is used as AAD, so a blob copied onto another id fails
 * authentication (prevents record swapping/replay inside the database).
 */
import { open, seal } from '../crypto/aead';
import { bytesToUtf8, utf8ToBytes } from '../crypto/encoding';
import { IteraError } from '../errors';
import { recordSchema, type IteraRecord } from '../model/schemas';
import type { StoredRecord } from './types';

const AAD_PREFIX = 'itera/record/v1/';

function aadFor(id: string): Uint8Array {
  return utf8ToBytes(AAD_PREFIX + id);
}

export class RecordCodec {
  constructor(private readonly key: Uint8Array) {}

  encode(record: IteraRecord): StoredRecord {
    return { id: record.id, payload: seal(this.key, utf8ToBytes(JSON.stringify(record)), aadFor(record.id)) };
  }

  decode(stored: StoredRecord): IteraRecord {
    const json = bytesToUtf8(open(this.key, stored.payload, aadFor(stored.id)));
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (cause) {
      throw new IteraError('VALIDATION', 'Stored record is not valid JSON', { cause });
    }
    const result = recordSchema.safeParse(parsed);
    if (!result.success || result.data.id !== stored.id) {
      throw new IteraError('VALIDATION', 'Stored record does not match schema');
    }
    return result.data;
  }
}
