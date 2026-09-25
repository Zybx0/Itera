/**
 * Opens the encrypted collection once at startup and exposes it to screens.
 *
 *   loadOrCreateDataKey()  ─┐
 *                           ├─> Collection.open(store, key) ─> context
 *   openRecordStore()      ─┘
 *
 * Screens read data with useCollectionState() (re-renders on every change,
 * via useSyncExternalStore) and write through useCollection() methods.
 */
import { Collection, type CollectionState, type LoadReport } from '@itera/core';
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { destroyDataKey, loadOrCreateDataKey } from '@/platform/keyStore';
import { openRecordStore } from '@/platform/recordStore';

type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; collection: Collection; report: LoadReport }
  | { kind: 'error'; error: unknown };

interface ContextValue {
  status: Status;
  /** Right to erasure: wipe every record, destroy the key, start fresh. */
  eraseEverything(): Promise<void>;
}

const CollectionContext = createContext<ContextValue | null>(null);

// One database connection for the app's lifetime (reused after "erase everything").
let storePromise: ReturnType<typeof openRecordStore> | null = null;

async function openCollection(): Promise<Status> {
  storePromise ??= openRecordStore();
  storePromise.catch(() => (storePromise = null));
  const [store, key] = await Promise.all([storePromise, loadOrCreateDataKey()]);
  const { collection, report } = await Collection.open(store, key);
  return { kind: 'ready', collection, report };
}

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    openCollection().then(
      (s) => !cancelled && setStatus(s),
      (error: unknown) => !cancelled && setStatus({ kind: 'error', error }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const eraseEverything = useCallback(async () => {
    if (status.kind === 'ready') await status.collection.eraseAll();
    await destroyDataKey();
    setStatus(await openCollection());
  }, [status]);

  return <CollectionContext.Provider value={{ status, eraseEverything }}>{children}</CollectionContext.Provider>;
}

function useCtx(): ContextValue {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('CollectionProvider missing');
  return ctx;
}

export function useCollectionStatus(): Status {
  return useCtx().status;
}

export function useEraseEverything(): () => Promise<void> {
  return useCtx().eraseEverything;
}

/** Only call from screens rendered after the loading gate (see app/_layout.tsx). */
export function useCollection(): Collection {
  const { status } = useCtx();
  if (status.kind !== 'ready') throw new Error('Collection not ready');
  return status.collection;
}

export function useCollectionState(): CollectionState {
  const collection = useCollection();
  return useSyncExternalStore(collection.subscribe, collection.getState, collection.getState);
}
