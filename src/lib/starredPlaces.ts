// src/lib/starredPlaces.ts
import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';

export type StarredPlaceKind = 'place' | 'food';

export interface StarredPlaceItem {
  id: string;
  name: string;
  kind: StarredPlaceKind;
  city?: string;
  note?: string;
  mapsUrl?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_PREFIX = 'travel_tracker_starred_places_v1_';
export const STARRED_PLACES_UPDATED_EVENT = 'travel_tracker_starred_places_updated';

export function getStarredPlaces(tripId?: string): StarredPlaceItem[] {
  if (typeof window === 'undefined' || !tripId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStarredPlaces(
  tripId: string | undefined,
  items: StarredPlaceItem[],
  options?: { skipRemoteSync?: boolean; deletedId?: string }
): StarredPlaceItem[] {
  if (!tripId) return items;
  if (typeof window !== 'undefined') {
    try {
      const key = `${STORAGE_PREFIX}${tripId}`;
      const serialized = JSON.stringify(items);
      if (localStorage.getItem(key) !== serialized) {
        localStorage.setItem(key, serialized);
      }
      window.dispatchEvent(new CustomEvent(STARRED_PLACES_UPDATED_EVENT, { detail: { tripId } }));
    } catch {}
  }
  if (!options?.skipRemoteSync) {
    void syncTripMetadataToSupabase(tripId, {
      starredPlaces: items,
      ...(options?.deletedId ? { deletedEntityIds: { [options.deletedId]: Date.now() } } : {}),
    });
  }
  return items;
}

export function isPlaceStarred(tripId: string | undefined, name: string): boolean {
  if (!tripId || !name) return false;
  const target = name.trim().toLowerCase();
  return getStarredPlaces(tripId).some((p) => p.name.trim().toLowerCase() === target);
}

export function toggleStarredPlace(
  tripId: string | undefined,
  input: {
    name: string;
    kind?: StarredPlaceKind;
    city?: string;
    note?: string;
    mapsUrl?: string;
  }
): { starred: boolean; items: StarredPlaceItem[] } {
  if (!tripId || !input.name.trim()) return { starred: false, items: [] };
  const current = getStarredPlaces(tripId);
  const cleanName = input.name.trim();
  const existing = current.find((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase());

  if (existing) {
    const next = current.filter((p) => p.id !== existing.id);
    saveStarredPlaces(tripId, next, { deletedId: existing.id });
    return { starred: false, items: next };
  }

  const now = Date.now();
  const created: StarredPlaceItem = {
    id: `star-${now}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    kind: input.kind || 'place',
    city: input.city?.trim() || undefined,
    note: input.note?.trim() || undefined,
    mapsUrl:
      input.mapsUrl?.trim() ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${cleanName} ${input.city || 'Japan'}`.trim()
      )}`,
    createdAt: now,
    updatedAt: now,
  };
  const next = [created, ...current];
  saveStarredPlaces(tripId, next);
  return { starred: true, items: next };
}

export function removeStarredPlace(tripId: string | undefined, id: string): StarredPlaceItem[] {
  if (!tripId) return [];
  const current = getStarredPlaces(tripId);
  const next = current.filter((p) => p.id !== id);
  return saveStarredPlaces(tripId, next, { deletedId: id });
}

export function hydrateStarredPlacesFromSupabase(tripId: string, remoteItems: unknown): boolean {
  if (typeof window === 'undefined' || !tripId || !Array.isArray(remoteItems)) return false;
  try {
    const key = `${STORAGE_PREFIX}${tripId}`;
    const serialized = JSON.stringify(remoteItems);
    if (localStorage.getItem(key) === serialized) return false;
    localStorage.setItem(key, serialized);
    window.dispatchEvent(new CustomEvent(STARRED_PLACES_UPDATED_EVENT, { detail: { tripId } }));
    return true;
  } catch {
    return false;
  }
}

export function subscribeStarredPlaces(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(STARRED_PLACES_UPDATED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(STARRED_PLACES_UPDATED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
