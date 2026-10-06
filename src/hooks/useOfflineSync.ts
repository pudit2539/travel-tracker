// src/hooks/useOfflineSync.ts
'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';

const OFFLINE_CACHE_PREFIX = 'travel_tracker_offline_cache_';

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
