/**
 * Public API of @itera/core. Apps must import from here only, never from
 * internal paths, so internals can be refactored freely.
 */
export { IteraError, isIteraError, type IteraErrorCode } from './errors';
export { newId } from './ids';

export { generateKey, KEY_LENGTH, wipeBytes } from './crypto/aead';
export { base64ToBytes, bytesToBase64 } from './crypto/encoding';
export { MIN_PASSPHRASE_LENGTH, type KdfParams } from './crypto/kdf';

export { LIMITS } from './model/limits';
export {
  CardStates,
  DEFAULT_DECK_CONFIG,
  Ratings,
  type Card,
  type CardState,
  type Deck,
  type DeckConfig,
  type IteraRecord,
  type Note,
  type NoteType,
  type Rating,
  type Review,
  type Schedule,
} from './model/schemas';

export { DEFAULT_ROLLOVER_HOUR, nextStudyDayStart, studyDayStart } from './scheduler/day';
export { retrievability } from './scheduler/fsrs';
export type { QueueCounts, StudyQueue } from './scheduler/queue';
export type { DeckStats } from './stats';
export { formatInterval } from './format';

export type { RecordStore, StoreChanges, StoredRecord } from './storage/types';
export { MemoryRecordStore } from './storage/memory';

export {
  Collection,
  type CardFaces,
  type CollectionOptions,
  type CollectionState,
  type LoadReport,
  type NewDeckInput,
  type NewNoteInput,
} from './collection';

export {
  decryptExport,
  encryptExport,
  isEncryptedExport,
  parseExport,
  serializeExport,
  type ExportBundle,
} from './export';
