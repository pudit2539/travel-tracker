// src/hooks/useOfflineSync.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

const OFFLINE_CACHE_PREFIX = 'travel_tracker_offline_cache_';

export function useOfflineSync(tripId?: string) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
