import { describe, expect, it } from 'vitest';

import { decryptExport, encryptExport, isEncryptedExport, isIteraError, parseExport, serializeExport } from '../src';
import { assertBundleIntegrity } from '../src/export';
import { newId } from '../src/ids';
import { openCollection } from './helpers';

async function seeded() {
  const ctx = await openCollection();
  const deck = await ctx.collection.createDeck({ name: 'Histoire' });
  await ctx.collection.addNote({ deckId: deck.id, noteType: 'basic-reversed', front: '1789', back: 'Révolution' });
  const cardId = ctx.collection.studyQueue(deck.id).cards[0]!.id;
  await ctx.collection.answer(cardId, 3, 1200);
  return { ...ctx, deck };
}

describe('plain export', () => {
  it('round-trips into a fresh collection (replace) and merges idempotently', async () => {
    const { collection } = await seeded();
    const text = serializeExport(collection.exportBundle());
    const bundle = parseExport(text);
    expect(bundle.cards).toHaveLength(2);
    expect(bundle.reviews).toHaveLength(1);

    const target = await openCollection();
    await target.collection.createDeck({ name: 'Will be replaced' });
    expect(await target.collection.importBundle(bundle, 'replace')).toEqual({ written: 5, skipped: 0 });
    expect(target.collection.getState()).toEqual(collection.getState());
    expect(await target.collection.importBundle(bundle, 'merge')).toEqual({ written: 0, skipped: 5 });
  });

  it('merge keeps the most recently updated version', async () => {
    const { collection, deck, clock } = await seeded();
    const bundle = collection.exportBundle();
    clock.advance(1000);
    await collection.updateDeck(deck.id, { name: 'Histoire (local)' });
    await collection.importBundle(bundle, 'merge');
    expect(collection.getDeck(deck.id).name).toBe('Histoire (local)');
    const newer = { ...bundle, decks: [{ ...bundle.decks[0]!, name: 'Histoire (import)', updatedAt: clock.now() + 1 }] };
    await collection.importBundle(newer, 'merge');
    expect(collection.getDeck(deck.id).name).toBe('Histoire (import)');
  });

  it('rejects malformed, oversized-field and inconsistent files', async () => {
    const { collection } = await seeded();
    const bundle = collection.exportBundle();
    const bad = [
      'not json',
      '{}',
      JSON.stringify({ ...bundle, version: 2 }),
      JSON.stringify({ ...bundle, notes: [{ ...bundle.notes[0]!, front: 'x'.repeat(30_000) }] }),
      JSON.stringify({ ...bundle, notes: [{ ...bundle.notes[0]!, deckId: newId() }] }),
      JSON.stringify({ ...bundle, reviews: [{ ...bundle.reviews[0]!, cardId: newId() }] }),
      JSON.stringify({ ...bundle, decks: [...bundle.decks, bundle.decks[0]] }),
      JSON.stringify({ ...bundle, cards: [{ ...bundle.cards[0]!, deckId: newId() }, bundle.cards[1]] }),
    ];
    for (const text of bad) {
      expect(() => parseExport(text), text.slice(0, 40)).toThrow();
      try {
        parseExport(text);
      } catch (e) {
        expect(isIteraError(e, 'IMPORT_FORMAT')).toBe(true);
      }
    }
    expect(() => assertBundleIntegrity(bundle)).not.toThrow();
  });

  it('is immune to prototype pollution and strips unknown keys', async () => {
    const { collection } = await seeded();
    const text = serializeExport(collection.exportBundle()).replace('"kind":"deck"', '"__proto__":{"polluted":true},"extra":1,"kind":"deck"');
    const bundle = parseExport(text);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(bundle.decks[0]!)).not.toContain('extra');
    expect(Object.keys(bundle.decks[0]!)).not.toContain('__proto__');
  });
});

describe('encrypted export', () => {
  it('round-trips with the right passphrase and fails otherwise', async () => {
    const { collection } = await seeded();
    const bundle = collection.exportBundle();
    const progress: number[] = [];
    const text = await encryptExport(bundle, 'une phrase de passe solide', { onProgress: (p) => progress.push(p) });
    expect(isEncryptedExport(text)).toBe(true);
    expect(isEncryptedExport(serializeExport(bundle))).toBe(false);
    expect(text).not.toContain('Révolution');
    expect(progress.length).toBeGreaterThan(0);
    expect(await decryptExport(text, 'une phrase de passe solide')).toEqual(bundle);
    await expect(decryptExport(text, 'mauvaise phrase de passe')).rejects.toSatisfy((e) => isIteraError(e, 'CRYPTO'));
    await expect(encryptExport(bundle, 'court')).rejects.toSatisfy((e) => isIteraError(e, 'VALIDATION'));

    const envelope = JSON.parse(text);
    await expect(decryptExport(JSON.stringify({ ...envelope, kdf: { ...envelope.kdf, m: 4_000_000 } }), 'une phrase de passe solide')).rejects.toSatisfy((e) =>
      isIteraError(e, 'VALIDATION'),
    );
    await expect(decryptExport('{"format":"other"}', 'x')).rejects.toSatisfy((e) => isIteraError(e, 'IMPORT_FORMAT'));
  }, 30_000);
});
