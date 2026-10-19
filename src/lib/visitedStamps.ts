// src/lib/visitedStamps.ts

export interface VisitedStampMap {
  [activityId: string]: boolean;
}

const EVENT_NAME = 'visited-stamps-changed';

export function getTripVisitedStamps(tripId?: string, activityIds?: string[]): VisitedStampMap {
  if (typeof window === 'undefined') return {};
  const result: VisitedStampMap = {};

  try {
    if (tripId) {
      const raw = localStorage.getItem(`trip_visited_stamps_${tripId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.assign(result, parsed);
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

export function isActivityVisited(tripId: string | undefined, activityId: string): boolean {
  if (typeof window === 'undefined' || !activityId) return false;
  try {
    if (tripId) {
      const raw = localStorage.getItem(`trip_visited_stamps_${tripId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed[activityId] === 'boolean') {
          return parsed[activityId];
        }
      }
    }
    return localStorage.getItem(`visited_activity_${activityId}`) === 'true';
  } catch {
    return false;
  }
}

export function isStopVisited(activityId: string, tripId?: string): boolean {
  return isActivityVisited(tripId, activityId);
}

export function toggleActivityVisited(
  tripId: string | undefined,
  activityId: string,
  forceValue?: boolean
): boolean {
  if (typeof window === 'undefined' || !activityId) return false;
  try {
    const current = isActivityVisited(tripId, activityId);
    const next = typeof forceValue === 'boolean' ? forceValue : !current;

    // Save in individual key
    localStorage.setItem(`visited_activity_${activityId}`, next ? 'true' : 'false');

    // Save in trip map key
    if (tripId) {
      const map = getTripVisitedStamps(tripId);
      map[activityId] = next;
      localStorage.setItem(`trip_visited_stamps_${tripId}`, JSON.stringify(map));
    }

    // Broadcast change so LiveTripCard and ItineraryStopCard stay in instant sync
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: { tripId, activityId, visited: next },
      })
    );

    return next;
  } catch (err) {
    console.error('Failed to toggle visited stamp:', err);
    return false;
  }
}

export function toggleStopVisited(activityId: string, tripId?: string, forceValue?: boolean): boolean {
  return toggleActivityVisited(tripId, activityId, forceValue);
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
