/**
 * Hard limits applied to every piece of user data. They protect against
 * memory exhaustion (crafted import files) and keep records small enough to
 * encrypt/decrypt quickly. Changing them is a data-format decision: document
 * it in docs/FICHE_DE_SUIVI.md.
 */
export const LIMITS = {
  deckNameLength: 120,
  deckDescriptionLength: 2_000,
  fieldLength: 20_000,
  tagLength: 64,
  tagsPerNote: 32,
  newPerDayMax: 9_999,
  reviewsPerDayMax: 99_999,
  /** Max records accepted in one import (≈ very large Anki collection). */
  importRecordsMax: 1_000_000,
  /** Max size of an import file, in characters. */
  importTextMax: 200 * 1024 * 1024,
} as const;
