/**
 * Collection = the user's whole data set (decks, notes, cards, reviews),
 * held decrypted in memory and persisted encrypted through a RecordStore.
 *
 * Rules every mutation follows:
 *  - input is normalised (model/text.ts) then validated (model/schemas.ts);
 *  - the change is written to the store *first*, in one atomic commit, and
 *    the in-memory state is only updated if the write succeeded;
 *  - mutations are serialised (one at a time) to avoid lost updates;
 *  - `state` is immutable: each mutation produces a new object, which makes
 *    it directly usable with React's useSyncExternalStore.
 */
import { IteraError } from './errors';
import { newId } from './ids';
import { cleanSingleLine, cleanTags, cleanText } from './model/text';
import {
  cardSchema,
  deckConfigSchema,
  deckSchema,
  DEFAULT_DECK_CONFIG,
  noteSchema,
  reviewSchema,
  type Card,
  type Deck,
  type DeckConfig,
  type IteraRecord,
  type Note,
  type NoteType,
  type Rating,
  type Review,
} from './model/schemas';
import { newSchedule, nextSchedule, previewDue } from './scheduler/fsrs';
import { buildStudyQueue, type StudyQueue } from './scheduler/queue';
import { computeStats, type DeckStats } from './stats';
import { RecordCodec } from './storage/codec';
import type { RecordStore } from './storage/types';
import { validate } from './validate';
import { exportBundleFromRecords, type ExportBundle } from './export';

export interface CollectionState {
  readonly decks: ReadonlyMap<string, Deck>;
  readonly notes: ReadonlyMap<string, Note>;
  readonly cards: ReadonlyMap<string, Card>;
  readonly reviews: ReadonlyMap<string, Review>;
}

export interface CollectionOptions {
  /** Injected clock (epoch ms) — makes the scheduler testable. */
  clock?: () => number;
  /** Hour at which a new study day starts (local time). Default 4. */
  rolloverHour?: number;
}

export interface LoadReport {
  loaded: number;
  /** Ids of records that failed decryption or validation. They are left untouched in the store. */
  corrupt: string[];
}

export interface NewDeckInput {
  name: string;
  description?: string;
  config?: Partial<DeckConfig>;
}

export interface NewNoteInput {
  deckId: string;
  noteType?: NoteType;
  front: string;
  back: string;
  tags?: string[];
}

export interface CardFaces {
  question: string;
  answer: string;
}

const MAX_UNDO = 20;
const MAX_DURATION_MS = 600_000;

const EMPTY_STATE: CollectionState = { decks: new Map(), notes: new Map(), cards: new Map(), reviews: new Map() };

export class Collection {
  private state: CollectionState = EMPTY_STATE;
  private readonly listeners = new Set<() => void>();
  private tail: Promise<unknown> = Promise.resolve();
  private readonly undoStack: string[] = [];
  private readonly clock: () => number;
  private readonly rolloverHour: number | undefined;
  private readonly codec: RecordCodec;

  private constructor(
    private readonly store: RecordStore,
    key: Uint8Array,
    options: CollectionOptions,
  ) {
    this.codec = new RecordCodec(key);
    this.clock = options.clock ?? Date.now;
    this.rolloverHour = options.rolloverHour;
  }

  /** Decrypt and load everything from `store` using the data key `key`. */
  static async open(store: RecordStore, key: Uint8Array, options: CollectionOptions = {}): Promise<{ collection: Collection; report: LoadReport }> {
    const collection = new Collection(store, key, options);
    const report: LoadReport = { loaded: 0, corrupt: [] };
    const records: IteraRecord[] = [];
    for (const stored of await store.getAll()) {
      try {
        records.push(collection.codec.decode(stored));
        report.loaded++;
      } catch {
        report.corrupt.push(stored.id);
      }
    }
    collection.state = withRecords(EMPTY_STATE, records, []);
    return { collection, report };
  }

  // ---------------------------------------------------------------- reading

  getState = (): CollectionState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  listDecks(): Deck[] {
    return [...this.state.decks.values()].sort((a, b) => a.name.localeCompare(b.name) || a.createdAt - b.createdAt);
  }

  getDeck(id: string): Deck {
    return mustGet(this.state.decks, id, 'deck');
  }

  notesOfDeck(deckId: string): Note[] {
    return [...this.state.notes.values()].filter((n) => n.deckId === deckId).sort((a, b) => b.createdAt - a.createdAt);
  }

  cardsOfDeck(deckId: string): Card[] {
    return [...this.state.cards.values()].filter((c) => c.deckId === deckId);
  }

  cardsOfNote(noteId: string): Card[] {
    return [...this.state.cards.values()].filter((c) => c.noteId === noteId).sort((a, b) => a.template - b.template);
  }

  reviewsOfDeck(deckId: string): Review[] {
    return [...this.state.reviews.values()].filter((r) => r.deckId === deckId);
  }

  cardFaces(cardId: string): CardFaces {
    const card = mustGet(this.state.cards, cardId, 'card');
    const note = mustGet(this.state.notes, card.noteId, 'note');
    return card.template === 0 ? { question: note.front, answer: note.back } : { question: note.back, answer: note.front };
  }

  studyQueue(deckId: string): StudyQueue {
    return buildStudyQueue({
      deck: this.getDeck(deckId),
      cards: this.state.cards.values(),
      reviews: this.reviewsOfDeck(deckId),
      now: this.clock(),
      ...(this.rolloverHour !== undefined ? { rolloverHour: this.rolloverHour } : {}),
    });
  }

  /** Due date (epoch ms) for each answer button. */
  previewAnswers(cardId: string): Record<Rating, number> {
    const card = mustGet(this.state.cards, cardId, 'card');
    return previewDue(this.getDeck(card.deckId).config, card.schedule, this.clock());
  }

  stats(deckId?: string): DeckStats {
    const cards = deckId ? this.cardsOfDeck(deckId) : this.state.cards.values();
    const reviews = deckId ? this.reviewsOfDeck(deckId) : this.state.reviews.values();
    return computeStats(cards, reviews, this.clock(), this.rolloverHour);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Complete copy of the user's data (GDPR art. 15 & 20: access and portability). */
  exportBundle(): ExportBundle {
    return exportBundleFromRecords(this.state, this.clock());
  }

  // --------------------------------------------------------------- writing

  createDeck(input: NewDeckInput): Promise<Deck> {
    return this.serial(async () => {
      const now = this.clock();
      const deck = validate(
        deckSchema,
        {
          kind: 'deck',
          id: newId(),
          name: cleanSingleLine(input.name),
          description: cleanText(input.description ?? '').trim(),
          config: { ...DEFAULT_DECK_CONFIG, ...input.config },
          createdAt: now,
          updatedAt: now,
        },
        'deck',
      );
      await this.apply([deck], []);
      return deck;
    });
  }

  updateDeck(id: string, patch: Partial<Omit<NewDeckInput, 'config'>> & { config?: Partial<DeckConfig> }): Promise<Deck> {
    return this.serial(async () => {
      const current = this.getDeck(id);
      const deck = validate(
        deckSchema,
        {
          ...current,
          ...(patch.name !== undefined ? { name: cleanSingleLine(patch.name) } : {}),
          ...(patch.description !== undefined ? { description: cleanText(patch.description).trim() } : {}),
          config: validate(deckConfigSchema, { ...current.config, ...patch.config }, 'deck settings'),
          updatedAt: this.clock(),
        },
        'deck',
      );
      await this.apply([deck], []);
      return deck;
    });
  }

  /** Deletes the deck and, in cascade, its notes, cards and review history. */
  deleteDeck(id: string): Promise<void> {
    return this.serial(async () => {
      const deck = this.getDeck(id);
      const cards = this.cardsOfDeck(id);
      const cardIds = new Set(cards.map((c) => c.id));
      const reviews = [...this.state.reviews.values()].filter((r) => r.deckId === id || cardIds.has(r.cardId));
      await this.apply([], [deck, ...this.notesOfDeck(id), ...cards, ...reviews]);
      this.pruneUndo();
    });
  }

  addNote(input: NewNoteInput): Promise<Note> {
    return this.serial(async () => {
      this.getDeck(input.deckId);
      const now = this.clock();
      const note = this.buildNote({ kind: 'note', id: newId(), createdAt: now }, input, now);
      const cards = templatesFor(note.noteType).map((template) => this.buildCard(note, template, now));
      await this.apply([note, ...cards], []);
      return note;
    });
  }

  updateNote(id: string, patch: Partial<NewNoteInput>): Promise<Note> {
    return this.serial(async () => {
      const current = mustGet(this.state.notes, id, 'note');
      if (patch.deckId !== undefined) this.getDeck(patch.deckId);
      const now = this.clock();
      const note = this.buildNote(current, { ...current, ...patch }, now);

      const put: IteraRecord[] = [note];
      const remove: IteraRecord[] = [];
      const existing = this.cardsOfNote(id);
      const wanted = templatesFor(note.noteType);
      for (const card of existing) {
        if (!wanted.includes(card.template)) {
          remove.push(card, ...[...this.state.reviews.values()].filter((r) => r.cardId === card.id));
        } else if (card.deckId !== note.deckId) {
          put.push({ ...card, deckId: note.deckId, updatedAt: now });
        }
      }
      for (const template of wanted) {
        if (!existing.some((c) => c.template === template)) put.push(this.buildCard(note, template, now));
      }
      await this.apply(put, remove);
      this.pruneUndo();
      return note;
    });
  }

  deleteNote(id: string): Promise<void> {
    return this.serial(async () => {
      const note = mustGet(this.state.notes, id, 'note');
      const cards = this.cardsOfNote(id);
      const cardIds = new Set(cards.map((c) => c.id));
      const reviews = [...this.state.reviews.values()].filter((r) => cardIds.has(r.cardId));
      await this.apply([], [note, ...cards, ...reviews]);
      this.pruneUndo();
    });
  }

  setSuspended(cardId: string, suspended: boolean): Promise<Card> {
    return this.serial(async () => {
      const card = { ...mustGet(this.state.cards, cardId, 'card'), suspended, updatedAt: this.clock() };
      await this.apply([card], []);
      return card;
    });
  }

  /** Record an answer, reschedule the card with FSRS and log the review. */
  answer(cardId: string, rating: Rating, durationMs: number): Promise<Review> {
    return this.serial(async () => {
      const card = mustGet(this.state.cards, cardId, 'card');
      if (card.suspended) throw new IteraError('CONFLICT', 'Card is suspended');
      const deck = this.getDeck(card.deckId);
      const now = this.clock();
      const schedule = nextSchedule(deck.config, card.schedule, rating, now);
      const updated = validate(cardSchema, { ...card, schedule, updatedAt: now }, 'card');
      const review = validate(
        reviewSchema,
        {
          kind: 'review',
          id: newId(),
          cardId,
          deckId: card.deckId,
          rating,
          reviewedAt: now,
          durationMs: Math.round(Math.min(Math.max(durationMs, 0), MAX_DURATION_MS)),
          stateBefore: card.schedule.state,
          scheduleBefore: card.schedule,
          dueAfter: schedule.due,
          createdAt: now,
          updatedAt: now,
        },
        'review',
      );
      await this.apply([updated, review], []);
      this.undoStack.push(review.id);
      if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
      return review;
    });
  }

  /** Revert the most recent answer of this session. Returns the card id to show again, or null. */
  undoLastAnswer(): Promise<string | null> {
    return this.serial(async () => {
      this.pruneUndo();
      const reviewId = this.undoStack.pop();
      if (!reviewId) return null;
      const review = mustGet(this.state.reviews, reviewId, 'review');
      const card = mustGet(this.state.cards, review.cardId, 'card');
      await this.apply([{ ...card, schedule: review.scheduleBefore, updatedAt: this.clock() }], [review]);
      return card.id;
    });
  }

  /** Replace or merge the collection with an already-validated export bundle. */
  importBundle(bundle: ExportBundle, mode: 'merge' | 'replace'): Promise<{ written: number; skipped: number }> {
    return this.serial(async () => {
      const incoming: IteraRecord[] = [...bundle.decks, ...bundle.notes, ...bundle.cards, ...bundle.reviews];
      const all = allRecords(this.state);
      if (mode === 'replace') {
        const incomingIds = new Set(incoming.map((r) => r.id));
        await this.apply(incoming, all.filter((r) => !incomingIds.has(r.id)));
        this.undoStack.length = 0;
        return { written: incoming.length, skipped: 0 };
      }
      const existing = new Map(all.map((r) => [r.id, r]));
      const put = incoming.filter((r) => {
        const mine = existing.get(r.id);
        return !mine || (mine.kind === r.kind && r.updatedAt > mine.updatedAt);
      });
      await this.apply(put, []);
      return { written: put.length, skipped: incoming.length - put.length };
    });
  }

  /** Delete every record from the store (GDPR art. 17, right to erasure). */
  eraseAll(): Promise<void> {
    return this.serial(async () => {
      await this.store.clear();
      this.undoStack.length = 0;
      this.state = EMPTY_STATE;
      this.emit();
    });
  }

  // -------------------------------------------------------------- internals

  private serial<T>(op: () => Promise<T>): Promise<T> {
    const result = this.tail.then(op);
    this.tail = result.catch(() => undefined);
    return result;
  }

  private async apply(put: IteraRecord[], remove: IteraRecord[]): Promise<void> {
    await this.store.commit({ put: put.map((r) => this.codec.encode(r)), remove: remove.map((r) => r.id) });
    this.state = withRecords(this.state, put, remove);
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private pruneUndo(): void {
    for (let i = this.undoStack.length - 1; i >= 0; i--) {
      if (!this.state.reviews.has(this.undoStack[i]!)) this.undoStack.splice(i, 1);
    }
  }

  private buildNote(base: Pick<Note, 'kind' | 'id' | 'createdAt'>, input: NewNoteInput, now: number): Note {
    const note = validate(
      noteSchema,
      {
        kind: 'note',
        id: base.id,
        deckId: input.deckId,
        noteType: input.noteType ?? 'basic',
        front: cleanText(input.front).trim(),
        back: cleanText(input.back).trim(),
        tags: cleanTags(input.tags ?? []),
        createdAt: base.createdAt,
        updatedAt: now,
      },
      'note',
    );
    if (note.noteType === 'basic-reversed' && note.back.length === 0) {
      throw new IteraError('VALIDATION', 'Invalid note: back is required for reversed cards');
    }
    return note;
  }

  private buildCard(note: Note, template: 0 | 1, now: number): Card {
    return validate(
      cardSchema,
      {
        kind: 'card',
        id: newId(),
        noteId: note.id,
        deckId: note.deckId,
        template,
        suspended: false,
        schedule: newSchedule(now),
        createdAt: now,
        updatedAt: now,
      },
      'card',
    );
  }
}

function templatesFor(noteType: NoteType): (0 | 1)[] {
  return noteType === 'basic-reversed' ? [0, 1] : [0];
}

function mustGet<T>(map: ReadonlyMap<string, T>, id: string, what: string): T {
  const value = map.get(id);
  if (value === undefined) throw new IteraError('NOT_FOUND', `Unknown ${what}`);
  return value;
}

export function allRecords(state: CollectionState): IteraRecord[] {
  return [...state.decks.values(), ...state.notes.values(), ...state.cards.values(), ...state.reviews.values()];
}

const MAP_FOR_KIND = { deck: 'decks', note: 'notes', card: 'cards', review: 'reviews' } as const;

/** Returns a new state with `put` upserted and `remove` deleted; untouched maps are shared. */
function withRecords(state: CollectionState, put: readonly IteraRecord[], remove: readonly IteraRecord[]): CollectionState {
  const maps = new Map<keyof CollectionState, Map<string, IteraRecord>>();
  const mapFor = (kind: IteraRecord['kind']): Map<string, IteraRecord> => {
    const key = MAP_FOR_KIND[kind];
    let map = maps.get(key);
    if (!map) {
      map = new Map<string, IteraRecord>(state[key] as ReadonlyMap<string, IteraRecord>);
      maps.set(key, map);
    }
    return map;
  };
  for (const r of remove) mapFor(r.kind).delete(r.id);
  for (const r of put) mapFor(r.kind).set(r.id, r);
  return { ...state, ...Object.fromEntries(maps) } as CollectionState;
}
