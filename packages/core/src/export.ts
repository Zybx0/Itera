/**
 * Export / import format (GDPR art. 20 — portability, and user backups).
 *
 * Plain export: human-readable JSON, versioned (`format` + `version`).
 * Encrypted export: the same JSON sealed with XChaCha20-Poly1305 under a key
 * derived from a passphrase with Argon2id. Everything read from a file is
 * treated as hostile: size-limited, schema-validated and checked for
 * referential integrity before it can touch the collection.
 */
import { z } from 'zod';

import { open, seal } from './crypto/aead';
import { base64ToBytes, bytesToBase64, bytesToUtf8, utf8ToBytes } from './crypto/encoding';
import { assertPassphrase, DEFAULT_KDF_PARAMS, deriveKey, type KdfParams } from './crypto/kdf';
import { randomBytes } from './crypto/random';
import { IteraError } from './errors';
import { LIMITS } from './model/limits';
import { cardSchema, deckSchema, noteSchema, reviewSchema, timestampSchema, type Card, type Deck, type Note, type Review } from './model/schemas';
import { validate } from './validate';

export const EXPORT_FORMAT = 'itera.export';
export const ENCRYPTED_EXPORT_FORMAT = 'itera.encrypted-export';
const EXPORT_AAD = utf8ToBytes('itera/export/v1');

export const exportBundleSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(1),
  exportedAt: timestampSchema,
  decks: z.array(deckSchema),
  notes: z.array(noteSchema),
  cards: z.array(cardSchema),
  reviews: z.array(reviewSchema),
});

export type ExportBundle = z.infer<typeof exportBundleSchema>;

const encryptedEnvelopeSchema = z.object({
  format: z.literal(ENCRYPTED_EXPORT_FORMAT),
  version: z.literal(1),
  kdf: z.object({ alg: z.literal('argon2id'), m: z.number().int(), t: z.number().int(), p: z.number().int() }),
  salt: z.string().max(64),
  data: z.string(),
});

export function exportBundleFromRecords(
  state: { decks: ReadonlyMap<string, Deck>; notes: ReadonlyMap<string, Note>; cards: ReadonlyMap<string, Card>; reviews: ReadonlyMap<string, Review> },
  now: number,
): ExportBundle {
  return {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: now,
    decks: [...state.decks.values()],
    notes: [...state.notes.values()],
    cards: [...state.cards.values()],
    reviews: [...state.reviews.values()],
  };
}

/** Rejects duplicate ids and dangling references inside a bundle. */
export function assertBundleIntegrity(bundle: ExportBundle): void {
  const total = bundle.decks.length + bundle.notes.length + bundle.cards.length + bundle.reviews.length;
  if (total > LIMITS.importRecordsMax) throw new IteraError('IMPORT_FORMAT', 'Too many records');

  const ids = new Set<string>();
  const unique = (id: string) => {
    if (ids.has(id)) throw new IteraError('IMPORT_FORMAT', 'Duplicate record id');
    ids.add(id);
  };
  const decks = new Set(bundle.decks.map((d) => (unique(d.id), d.id)));
  const notes = new Map(bundle.notes.map((n) => (unique(n.id), [n.id, n] as const)));
  const cards = new Map(bundle.cards.map((c) => (unique(c.id), [c.id, c] as const)));
  bundle.reviews.forEach((r) => unique(r.id));

  for (const n of bundle.notes) if (!decks.has(n.deckId)) throw new IteraError('IMPORT_FORMAT', 'Note references a missing deck');
  for (const c of bundle.cards) {
    const note = notes.get(c.noteId);
    if (!note || note.deckId !== c.deckId) throw new IteraError('IMPORT_FORMAT', 'Card references a missing note or deck');
  }
  for (const r of bundle.reviews) if (!cards.has(r.cardId)) throw new IteraError('IMPORT_FORMAT', 'Review references a missing card');
}

export function serializeExport(bundle: ExportBundle): string {
  return JSON.stringify(bundle);
}

function parseJson(text: string): unknown {
  if (text.length > LIMITS.importTextMax) throw new IteraError('IMPORT_FORMAT', 'File too large');
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new IteraError('IMPORT_FORMAT', 'File is not valid JSON', { cause });
  }
}

/** Parse and fully validate a plain export. */
export function parseExport(text: string): ExportBundle {
  const bundle = validateImport(parseJson(text));
  assertBundleIntegrity(bundle);
  return bundle;
}

function validateImport(value: unknown): ExportBundle {
  try {
    return validate(exportBundleSchema, value, 'export file');
  } catch (cause) {
    throw new IteraError('IMPORT_FORMAT', 'Not a valid Itera export file', { cause });
  }
}

export function isEncryptedExport(text: string): boolean {
  return text.length < 200 ? false : text.slice(0, 200).includes(`"${ENCRYPTED_EXPORT_FORMAT}"`);
}

export async function encryptExport(
  bundle: ExportBundle,
  passphrase: string,
  options: { kdf?: KdfParams; onProgress?: (fraction: number) => void } = {},
): Promise<string> {
  assertPassphrase(passphrase);
  const kdf = options.kdf ?? DEFAULT_KDF_PARAMS;
  const salt = randomBytes(16);
  const key = await deriveKey(passphrase, salt, kdf, options.onProgress);
  try {
    const data = seal(key, utf8ToBytes(serializeExport(bundle)), EXPORT_AAD);
    return JSON.stringify({ format: ENCRYPTED_EXPORT_FORMAT, version: 1, kdf, salt: bytesToBase64(salt), data: bytesToBase64(data) });
  } finally {
    key.fill(0);
  }
}

export async function decryptExport(text: string, passphrase: string, onProgress?: (fraction: number) => void): Promise<ExportBundle> {
  const envelope = encryptedEnvelopeSchema.safeParse(parseJson(text));
  if (!envelope.success) throw new IteraError('IMPORT_FORMAT', 'Not a valid encrypted Itera export');
  const { kdf, salt, data } = envelope.data;
  const key = await deriveKey(passphrase, base64ToBytes(salt), kdf, onProgress);
  let plaintext: Uint8Array;
  try {
    plaintext = open(key, base64ToBytes(data), EXPORT_AAD);
  } finally {
    key.fill(0);
  }
  return parseExport(bytesToUtf8(plaintext));
}
