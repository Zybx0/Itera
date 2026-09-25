import { describe, expect, it, vi } from 'vitest';

import { Collection, generateKey, isIteraError, MemoryRecordStore, type StoreChanges } from '../src';
import { DAY, MINUTE, openCollection } from './helpers';

describe('Collection — decks & notes', () => {
  it('creates, normalises and validates decks', async () => {
    const { collection } = await openCollection();
    const deck = await collection.createDeck({ name: '  Japonais ‮  N5 ', config: { newPerDay: 5 } });
    expect(deck.name).toBe('Japonais N5');
    expect(deck.config.newPerDay).toBe(5);
    expect(deck.config.desiredRetention).toBe(0.9);
    await expect(collection.createDeck({ name: '   ' })).rejects.toSatisfy((e) => isIteraError(e, 'VALIDATION'));
    await expect(collection.createDeck({ name: 'x'.repeat(500) })).rejects.toThrow();
    await expect(collection.updateDeck(deck.id, { config: { desiredRetention: 2 } })).rejects.toThrow();
    const renamed = await collection.updateDeck(deck.id, { name: 'JLPT N5', config: { reviewsPerDay: 50 } });
    expect(renamed).toMatchObject({ name: 'JLPT N5', config: { newPerDay: 5, reviewsPerDay: 50 } });
    expect(collection.listDecks().map((d) => d.name)).toEqual(['JLPT N5']);
  });

  it('creates one card for basic notes and two for reversed notes', async () => {
    const { collection } = await openCollection();
    const deck = await collection.createDeck({ name: 'D' });
    const basic = await collection.addNote({ deckId: deck.id, front: 'chat', back: 'cat', tags: ['Animal', 'animal', ' big cat '] });
    const reversed = await collection.addNote({ deckId: deck.id, noteType: 'basic-reversed', front: 'chien', back: 'dog' });
    expect(basic.tags).toEqual(['animal', 'big_cat']);
    expect(collection.cardsOfNote(basic.id)).toHaveLength(1);
    const [c0, c1] = collection.cardsOfNote(reversed.id);
    expect(collection.cardFaces(c0!.id)).toEqual({ question: 'chien', answer: 'dog' });
    expect(collection.cardFaces(c1!.id)).toEqual({ question: 'dog', answer: 'chien' });
    await expect(collection.addNote({ deckId: deck.id, noteType: 'basic-reversed', front: 'a', back: '' })).rejects.toThrow();
    await expect(collection.addNote({ deckId: deck.id, front: '', back: 'x' })).rejects.toThrow();
    await expect(collection.addNote({ deckId: 'nope', front: 'a', back: 'b' })).rejects.toSatisfy((e) => isIteraError(e, 'NOT_FOUND'));
  });

  it('updates note type, moves decks and keeps cards consistent', async () => {
    const { collection } = await openCollection();
    const a = await collection.createDeck({ name: 'A' });
    const b = await collection.createDeck({ name: 'B' });
    const note = await collection.addNote({ deckId: a.id, front: 'x', back: 'y' });
    await collection.updateNote(note.id, { noteType: 'basic-reversed', deckId: b.id });
    expect(collection.cardsOfNote(note.id).map((c) => [c.template, c.deckId])).toEqual([[0, b.id], [1, b.id]]);
    const reversedCard = collection.cardsOfNote(note.id)[1]!;
    await collection.answer(reversedCard.id, 3, 1000);
    await collection.updateNote(note.id, { noteType: 'basic' });
    expect(collection.cardsOfNote(note.id)).toHaveLength(1);
    expect(collection.getState().reviews.size).toBe(0);
    expect(collection.canUndo()).toBe(false);
  });

  it('cascades deletions', async () => {
    const { collection, store } = await openCollection();
    const deck = await collection.createDeck({ name: 'D' });
    const keep = await collection.createDeck({ name: 'Keep' });
    const note = await collection.addNote({ deckId: deck.id, noteType: 'basic-reversed', front: 'a', back: 'b' });
    await collection.addNote({ deckId: keep.id, front: 'k', back: 'k' });
    await collection.answer(collection.cardsOfNote(note.id)[0]!.id, 3, 500);
    await collection.deleteNote(note.id);
    expect(collection.getState().cards.size).toBe(1);
    expect(collection.getState().reviews.size).toBe(0);
    await collection.addNote({ deckId: deck.id, front: 'c', back: 'd' });
    await collection.deleteDeck(deck.id);
    const state = collection.getState();
    expect([state.decks.size, state.notes.size, state.cards.size]).toEqual([1, 1, 1]);
    expect(store.raw().size).toBe(3);
  });
});

describe('Collection — studying', () => {
  it('answers, reschedules, logs and undoes', async () => {
    const { collection, clock } = await openCollection();
    const deck = await collection.createDeck({ name: 'D' });
    await collection.addNote({ deckId: deck.id, front: 'q', back: 'a' });
    const [card] = collection.studyQueue(deck.id).cards;
    const preview = collection.previewAnswers(card!.id);
    expect(preview[4]).toBeGreaterThan(clock.now());

    const review = await collection.answer(card!.id, 4, 99_999_999);
    expect(review.durationMs).toBe(600_000);
    expect(review.stateBefore).toBe(0);
    const updated = collection.getState().cards.get(card!.id)!;
    expect(updated.schedule.state).toBe(2);
    expect(collection.studyQueue(deck.id).cards).toHaveLength(0);
    expect(collection.stats(deck.id)).toMatchObject({ reviewedToday: 1, review: 1 });
    expect(collection.stats()).toMatchObject({ total: 1 });

    expect(await collection.undoLastAnswer()).toBe(card!.id);
    expect(collection.getState().cards.get(card!.id)!.schedule).toEqual(card!.schedule);
    expect(collection.getState().reviews.size).toBe(0);
    expect(await collection.undoLastAnswer()).toBeNull();
  });

  it('brings cards back when due and respects suspension', async () => {
    const { collection, clock } = await openCollection();
    const deck = await collection.createDeck({ name: 'D' });
    await collection.addNote({ deckId: deck.id, front: 'q', back: 'a' });
    const cardId = collection.studyQueue(deck.id).cards[0]!.id;
    await collection.answer(cardId, 1, 1000); // Again → learning, due in ~1 min
    expect(collection.studyQueue(deck.id).counts.learning).toBe(1); // learn-ahead
    clock.advance(10 * MINUTE);
    await collection.answer(cardId, 3, 1000);
    await collection.answer(cardId, 3, 1000);
    clock.advance(60 * DAY);
    expect(collection.studyQueue(deck.id).counts.review).toBe(1);
    await collection.setSuspended(cardId, true);
    expect(collection.studyQueue(deck.id).cards).toHaveLength(0);
    await expect(collection.answer(cardId, 3, 0)).rejects.toSatisfy((e) => isIteraError(e, 'CONFLICT'));
  });
});

describe('Collection — persistence & security', () => {
  it('persists everything encrypted and reloads with the same key', async () => {
    const { collection, store, key, clock } = await openCollection();
    const deck = await collection.createDeck({ name: 'Médecine confidentielle' });
    await collection.addNote({ deckId: deck.id, front: 'diagnostic secret', back: 'réponse secrète' });

    for (const payload of store.raw().values()) {
      const asText = Buffer.from(payload).toString('latin1');
      expect(asText).not.toMatch(/secret|confidentielle|deck|note|card/i);
    }

    const reopened = await Collection.open(store, key, { clock: clock.now });
    expect(reopened.report).toEqual({ loaded: 3, corrupt: [] });
    expect(reopened.collection.getState()).toEqual(collection.getState());

    const wrongKey = await Collection.open(store, generateKey());
    expect(wrongKey.report.loaded).toBe(0);
    expect(wrongKey.report.corrupt).toHaveLength(3);
  });

  it('detects blobs moved to another id and schema-invalid records', async () => {
    const { collection, store, key } = await openCollection();
    const a = await collection.createDeck({ name: 'A' });
    const b = await collection.createDeck({ name: 'B' });
    await store.commit({ put: [{ id: b.id, payload: store.raw().get(a.id)! }], remove: [] });
    const { report } = await Collection.open(store, key);
    expect(report.corrupt).toEqual([b.id]);
  });

  it('does not change memory when the store fails, and keeps working afterwards', async () => {
    const store = new MemoryRecordStore();
    const { collection } = await openCollection({ store });
    const failing = vi.spyOn(store, 'commit').mockRejectedValueOnce(new Error('disk full'));
    await expect(collection.createDeck({ name: 'A' })).rejects.toThrow('disk full');
    expect(collection.listDecks()).toHaveLength(0);
    failing.mockRestore();
    await collection.createDeck({ name: 'B' });
    expect(collection.listDecks()).toHaveLength(1);
  });

  it('serialises concurrent mutations and notifies subscribers', async () => {
    const { collection, store } = await openCollection();
    const commits: StoreChanges[] = [];
    const original = store.commit.bind(store);
    store.commit = async (changes) => {
      commits.push(changes);
      await new Promise((r) => setTimeout(r, 1));
      return original(changes);
    };
    const listener = vi.fn();
    const unsubscribe = collection.subscribe(listener);
    const before = collection.getState();
    await Promise.all(Array.from({ length: 10 }, (_, i) => collection.createDeck({ name: `D${i}` })));
    expect(collection.listDecks()).toHaveLength(10);
    expect(listener).toHaveBeenCalledTimes(10);
    expect(collection.getState()).not.toBe(before);
    expect(collection.getState().notes).toBe(before.notes); // untouched maps are shared
    unsubscribe();
    await collection.eraseAll();
    expect(listener).toHaveBeenCalledTimes(10);
    expect(store.raw().size).toBe(0);
    expect(collection.listDecks()).toHaveLength(0);
  });
});
