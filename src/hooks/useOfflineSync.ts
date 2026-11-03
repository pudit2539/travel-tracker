// src/hooks/useOfflineSync.ts
'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';

const OFFLINE_CACHE_PREFIX = 'travel_tracker_offline_cache_';
const OFFLINE_EXPENSE_QUEUE_PREFIX = 'travel_offline_expense_queue_';

export interface OfflineQueuedExpense {
  localId: string;
  queuedAt: string;
  payload: Record<string, any>;
}

export function getOfflineExpenseQueue(tripId?: string): OfflineQueuedExpense[] {
  if (!tripId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${OFFLINE_EXPENSE_QUEUE_PREFIX}${tripId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
    try {
      const current = getOfflineExpenseQueue(tripId);
      const next = [...current, item];
      localStorage.setItem(`${OFFLINE_EXPENSE_QUEUE_PREFIX}${tripId}`, JSON.stringify(next));
    } catch (e) {
      console.error('Failed to enqueue offline expense', e);
    }
  }
  return item;
}

export function removeOfflineQueuedExpense(tripId: string, localId: string) {
  if (!tripId || typeof window === 'undefined') return;
  try {
    const current = getOfflineExpenseQueue(tripId);
    const next = current.filter((item) => item.localId !== localId);
    localStorage.setItem(`${OFFLINE_EXPENSE_QUEUE_PREFIX}${tripId}`, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to remove offline queued expense', e);
  }
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

  const cacheTripOffline = useCallback((data: {
    trip?: any;
    itinerary?: any[];
    expenses?: any[];
    categories?: any[];
    categoryBudgets?: any;
  }) => {
    if (!tripId || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${OFFLINE_CACHE_PREFIX}${tripId}`, JSON.stringify({
        cached_at: new Date().toISOString(),
        data,
      }));
      setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
    } catch (e) {
      console.error('Failed to save offline cache', e);
    }
  }, [tripId]);

  const getOfflineTripCache = useCallback(() => {
    if (!tripId || typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`${OFFLINE_CACHE_PREFIX}${tripId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [tripId]);

  return {
    isOnline,
    lastSyncedAt,
    cacheTripOffline,
    getOfflineTripCache,
  };
}
