// src/lib/visitedStamps.ts
import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';

export interface CheckInMeta {
  visited: boolean;
  by?: string;      // ชื่อผู้เช็กอิน เช่น 'คุณปูดิษฐ์'
  userId?: string;  // user ID
  at?: string;      // เช่น '14:30 น.'
}

export type VisitedStampMap = Record<string, boolean>;

const EVENT_NAME = 'visited-stamps-changed';

export function getTripVisitedStamps(tripId?: string, activityIds?: string[]): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  const result: Record<string, boolean> = {};

  try {
    if (tripId) {
      const raw = localStorage.getItem(`trip_visited_stamps_${tripId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.keys(parsed).forEach((k) => {
            const v = parsed[k];
            result[k] = typeof v === 'boolean' ? v : Boolean(v?.visited);
          });
        }
      }
    }

    // Also merge individual legacy keys if present
    if (activityIds && activityIds.length > 0) {
      activityIds.forEach((id) => {
        if (!id) return;
        const legacy = localStorage.getItem(`visited_activity_${id}`);
        if (legacy === 'true') {
          result[id] = true;
        }
      });
    }
  } catch (err) {
    console.error('Failed to read visited stamps:', err);
  }

  return result;
}

export function getTripVisitedMeta(tripId?: string): Record<string, CheckInMeta> {
  if (typeof window === 'undefined' || !tripId) return {};
  try {
    const raw = localStorage.getItem(`trip_visited_stamps_${tripId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const res: Record<string, CheckInMeta> = {};
        Object.keys(parsed).forEach((k) => {
          const v = parsed[k];
          if (typeof v === 'object' && v !== null) {
            res[k] = v;
          } else if (v === true) {
            res[k] = { visited: true };
          }
        });
        return res;
      }
    }
  } catch (err) {
    console.error('Failed to read visited meta:', err);
  }
  return {};
}

const visitedMemoryCache = new Map<string, { raw: string | null; parsed: Record<string, any> }>();

function readParsedStampsForTrip(tripId: string): Record<string, any> {
  if (typeof window === 'undefined' || !tripId) return {};
  try {
    const raw = localStorage.getItem(`trip_visited_stamps_${tripId}`);
    const cached = visitedMemoryCache.get(tripId);
    if (cached && cached.raw === raw) {
      return cached.parsed;
    }
    if (!raw) {
      const empty: Record<string, any> = {};
      visitedMemoryCache.set(tripId, { raw: null, parsed: empty });
      return empty;
    }
    const parsed = JSON.parse(raw);
    const valid = parsed && typeof parsed === 'object' ? parsed : {};
    visitedMemoryCache.set(tripId, { raw, parsed: valid });
    return valid;
  } catch {
    return {};
  }
}

export function isActivityVisited(tripId: string | undefined, activityId: string): boolean {
  if (typeof window === 'undefined' || !activityId) return false;
  try {
    if (tripId) {
      const parsed = readParsedStampsForTrip(tripId);
      if (parsed && parsed[activityId] !== undefined) {
        const val = parsed[activityId];
        return typeof val === 'boolean' ? val : Boolean(val?.visited);
      }
    }
    return localStorage.getItem(`visited_activity_${activityId}`) === 'true';
  } catch {
    return false;
  }
}

export function getActivityCheckInMeta(tripId: string | undefined, activityId: string): CheckInMeta | null {
  if (typeof window === 'undefined' || !activityId || !tripId) return null;
  try {
    const parsed = readParsedStampsForTrip(tripId);
    const val = parsed?.[activityId];
    if (typeof val === 'object' && val !== null) {
      return val as CheckInMeta;
    } else if (val === true) {
      return { visited: true };
    }
  } catch {
    return null;
  }
  return null;
}

export function isStopVisited(activityId: string, tripId?: string): boolean {
  return isActivityVisited(tripId, activityId);
}

export function hydrateVisitedStampsFromSupabase(tripId: string, serverMap: Record<string, any>): void {
  if (typeof window === 'undefined' || !tripId || !serverMap || typeof serverMap !== 'object') return;
  try {
    const raw = localStorage.getItem(`trip_visited_stamps_${tripId}`);
    let local: Record<string, any> = {};
    if (raw) {
      try { local = JSON.parse(raw) || {}; } catch {}
    }
    const merged = { ...local, ...serverMap };
    localStorage.setItem(`trip_visited_stamps_${tripId}`, JSON.stringify(merged));
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: { tripId, hydrated: true },
      })
    );
  } catch (e) {
    console.warn('Failed to hydrate visited stamps from Supabase:', e);
  }
}

export function toggleActivityVisited(
  tripId: string | undefined,
  activityId: string,
  forceValue?: boolean,
  userInfo?: { userId?: string; userName?: string }
): boolean {
  if (typeof window === 'undefined' || !activityId) return false;
  try {
    const current = isActivityVisited(tripId, activityId);
    const next = typeof forceValue === 'boolean' ? forceValue : !current;

    const atStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const meta: CheckInMeta = {
      visited: next,
      by: next ? (userInfo?.userName || 'สมาชิก') : undefined,
      userId: next ? userInfo?.userId : undefined,
      at: next ? atStr : undefined,
    };

    // Save in individual key
    localStorage.setItem(`visited_activity_${activityId}`, next ? 'true' : 'false');

    // Save in trip map key
    if (tripId) {
      const raw = localStorage.getItem(`trip_visited_stamps_${tripId}`);
      let rawMap: Record<string, any> = {};
      if (raw) {
        try { rawMap = JSON.parse(raw) || {}; } catch {}
      }
      rawMap[activityId] = meta;
      localStorage.setItem(`trip_visited_stamps_${tripId}`, JSON.stringify(rawMap));

      // Sync to Supabase Trip Metadata in background so all members see it in real-time
      syncTripMetadataToSupabase(tripId, {
        checkedInSpots: rawMap,
      }).catch((err) => {
        console.warn('Failed to sync check-in to Supabase:', err);
      });
    }

    // Broadcast change so LiveTripCard and ItineraryStopCard stay in instant sync
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: { tripId, activityId, visited: next, meta },
      })
    );

    return next;
  } catch (err) {
    console.error('Failed to toggle visited stamp:', err);
    return false;
  }
}

export function toggleStopVisited(
  activityId: string,
  tripId?: string,
  forceValue?: boolean,
  userInfo?: { userId?: string; userName?: string }
): boolean {
  return toggleActivityVisited(tripId, activityId, forceValue, userInfo);
}

export function getVisitedCountForItems(items: Array<{ id?: string }>, tripId?: string): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((count, item) => {
    if (!item?.id) return count;
    return isActivityVisited(tripId, item.id) ? count + 1 : count;
  }, 0);
}

export function subscribeVisitedStamps(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
