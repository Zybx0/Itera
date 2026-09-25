/**
 * Pure read functions over a CollectionState snapshot. They take the state
 * and the current time explicitly, which makes them safe to call during a
 * React render (React Compiler memoises on their inputs) and trivial to test.
 * Collection's read methods delegate here.
 */
import type { CollectionState } from './collection';
import { IteraError } from './errors';
import type { Card, Deck, Note, Rating, Review } from './model/schemas';
import { previewDue } from './scheduler/fsrs';
import { buildStudyQueue, type StudyQueue } from './scheduler/queue';
import { computeStats, type DeckStats } from './stats';

export interface CardFaces {
  question: string;
  answer: string;
}

function mustGet<T>(map: ReadonlyMap<string, T>, id: string, what: string): T {
  const value = map.get(id);
  if (value === undefined) throw new IteraError('NOT_FOUND', `Unknown ${what}`);
  return value;
}

export function selectDecks(state: CollectionState): Deck[] {
  return [...state.decks.values()].sort((a, b) => a.name.localeCompare(b.name) || a.createdAt - b.createdAt);
}

export function selectDeck(state: CollectionState, deckId: string): Deck {
  return mustGet(state.decks, deckId, 'deck');
}

export function selectNotesOfDeck(state: CollectionState, deckId: string): Note[] {
  return [...state.notes.values()].filter((n) => n.deckId === deckId).sort((a, b) => b.createdAt - a.createdAt);
}

export function selectCardsOfDeck(state: CollectionState, deckId: string): Card[] {
  return [...state.cards.values()].filter((c) => c.deckId === deckId);
}

export function selectCardsOfNote(state: CollectionState, noteId: string): Card[] {
  return [...state.cards.values()].filter((c) => c.noteId === noteId).sort((a, b) => a.template - b.template);
}

export function selectReviewsOfDeck(state: CollectionState, deckId: string): Review[] {
  return [...state.reviews.values()].filter((r) => r.deckId === deckId);
}

export function selectCardFaces(state: CollectionState, cardId: string): CardFaces {
  const card = mustGet(state.cards, cardId, 'card');
  const note = mustGet(state.notes, card.noteId, 'note');
  return card.template === 0 ? { question: note.front, answer: note.back } : { question: note.back, answer: note.front };
}

export function selectStudyQueue(state: CollectionState, deckId: string, now: number, rolloverHour?: number): StudyQueue {
  return buildStudyQueue({
    deck: selectDeck(state, deckId),
    cards: state.cards.values(),
    reviews: selectReviewsOfDeck(state, deckId),
    now,
    ...(rolloverHour !== undefined ? { rolloverHour } : {}),
  });
}

/** Due date (epoch ms) for each answer button. */
export function selectAnswerPreview(state: CollectionState, cardId: string, now: number): Record<Rating, number> {
  const card = mustGet(state.cards, cardId, 'card');
  return previewDue(selectDeck(state, card.deckId).config, card.schedule, now);
}

export function selectStats(state: CollectionState, deckId: string | undefined, now: number, rolloverHour?: number): DeckStats {
  const cards = deckId ? selectCardsOfDeck(state, deckId) : state.cards.values();
  const reviews = deckId ? selectReviewsOfDeck(state, deckId) : state.reviews.values();
  return computeStats(cards, reviews, now, rolloverHour);
}
