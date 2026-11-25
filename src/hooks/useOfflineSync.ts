// src/hooks/useOfflineSync.ts
'use client';

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { idbGetItem, idbSetItem } from '@/lib/offlineIdb';

const OFFLINE_CACHE_PREFIX = 'travel_tracker_offline_cache_';
const OFFLINE_EXPENSE_QUEUE_PREFIX = 'travel_offline_expense_queue_';

export interface OfflineQueuedExpense {
  localId: string;
  queuedAt: string;
  payload: Record<string, any>;
}

export interface CachedTripSnapshot {
  cached_at: string;
  data: {
    trip?: any;
    itinerary?: any[];
    expenses?: any[];
    categories?: any[];
    categoryBudgets?: any;
  };
}

// Fast synchronous in-memory mirrors hydrated from IndexedDB + localStorage fallback
const memoryTripCache = new Map<string, CachedTripSnapshot>();
const memoryExpenseQueue = new Map<string, OfflineQueuedExpense[]>();

export function resetOfflineMemoryCachesForTests(): void {
  memoryTripCache.clear();
  memoryExpenseQueue.clear();
}

export function getOfflineExpenseQueue(tripId?: string): OfflineQueuedExpense[] {
  if (!tripId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${OFFLINE_EXPENSE_QUEUE_PREFIX}${tripId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryExpenseQueue.set(tripId, parsed);
        return parsed;
      }
    }
  } catch {
    // Fall back to in-memory / IndexedDB mirror if localStorage is full or unavailable
  }
  return memoryExpenseQueue.get(tripId) || [];
}

function persistExpenseQueueDualLayer(tripId: string, nextQueue: OfflineQueuedExpense[]): void {
  memoryExpenseQueue.set(tripId, nextQueue);
  void idbSetItem('expense_queues', tripId, nextQueue);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${OFFLINE_EXPENSE_QUEUE_PREFIX}${tripId}`, JSON.stringify(nextQueue));
    } catch {
      // QuotaExceededError on localStorage (e.g. large base64 receipt): IndexedDB + memory still hold full queue safely!
    }
  }
}

export function enqueueOfflineExpense(
  tripId: string,
  payload: Record<string, any>
): OfflineQueuedExpense {
  const item: OfflineQueuedExpense = {
    localId: `offline-exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    queuedAt: new Date().toISOString(),
    payload,
  };
  if (typeof window !== 'undefined' && tripId) {
    const current = getOfflineExpenseQueue(tripId);
    persistExpenseQueueDualLayer(tripId, [...current, item]);
  }
  return item;
}

export function removeOfflineQueuedExpense(tripId: string, localId: string) {
  if (!tripId || typeof window === 'undefined') return;
  const current = getOfflineExpenseQueue(tripId);
  const next = current.filter((item) => item.localId !== localId);
  persistExpenseQueueDualLayer(tripId, next);
}

export async function hydrateOfflineStateFromIndexedDb(tripId: string): Promise<{
  tripCache: CachedTripSnapshot | null;
  expenseQueue: OfflineQueuedExpense[];
}> {
  if (!tripId || typeof window === 'undefined') {
    return { tripCache: null, expenseQueue: [] };
  }
  const [idbCache, idbQueue] = await Promise.all([
    idbGetItem<CachedTripSnapshot>('trip_caches', tripId),
    idbGetItem<OfflineQueuedExpense[]>('expense_queues', tripId),
  ]);
  if (idbCache) {
    memoryTripCache.set(tripId, idbCache);
  }
  if (Array.isArray(idbQueue) && idbQueue.length > 0) {
    memoryExpenseQueue.set(tripId, idbQueue);
  }
  return {
    tripCache: idbCache ?? memoryTripCache.get(tripId) ?? null,
    expenseQueue: idbQueue ?? getOfflineExpenseQueue(tripId),
  };
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function useOfflineSync(tripId?: string) {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Hydrate high-capacity IndexedDB snapshot & queue into memory on mount
  useEffect(() => {
    if (!tripId || typeof window === 'undefined') return;
    void hydrateOfflineStateFromIndexedDb(tripId);
  }, [tripId]);

  const cacheTripOffline = useCallback(
    (data: {
      trip?: any;
      itinerary?: any[];
      expenses?: any[];
      categories?: any[];
      categoryBudgets?: any;
    }) => {
      if (!tripId || typeof window === 'undefined') return;
      const snapshot: CachedTripSnapshot = {
        cached_at: new Date().toISOString(),
        data,
      };
      memoryTripCache.set(tripId, snapshot);

      // 1. Primary: Unlimited async IndexedDB storage (survives >5MB trips & base64 photos)
      void idbSetItem('trip_caches', tripId, snapshot);

      // 2. Secondary: Lightweight localStorage mirror (strip heavy inline data: URLs to avoid QuotaExceededError)
      try {
        const lightExpenses = Array.isArray(data.expenses)
          ? data.expenses.map((e) =>
              typeof e?.receipt_url === 'string' && e.receipt_url.startsWith('data:')
                ? { ...e, receipt_url: '' }
                : e
            )
          : data.expenses;
        localStorage.setItem(
          `${OFFLINE_CACHE_PREFIX}${tripId}`,
          JSON.stringify({
            cached_at: snapshot.cached_at,
            data: { ...data, expenses: lightExpenses },
          })
        );
      } catch {
        // IndexedDB + memory already hold the full unstripped snapshot safely
      }
      setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
    },
    [tripId]
  );

  const getOfflineTripCache = useCallback((): CachedTripSnapshot | null => {
    if (!tripId || typeof window === 'undefined') return null;
    const inMem = memoryTripCache.get(tripId);
    if (inMem) return inMem;
    try {
      const raw = localStorage.getItem(`${OFFLINE_CACHE_PREFIX}${tripId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedTripSnapshot;
      memoryTripCache.set(tripId, parsed);
      return parsed;
    } catch {
      return null;
    }
  }, [tripId]);

  return {
    isOnline,
    lastSyncedAt,
    cacheTripOffline,
    getOfflineTripCache,
    hydrateOfflineStateFromIndexedDb,
  };
}
