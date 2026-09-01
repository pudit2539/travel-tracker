// src/lib/photos.ts

export interface PhotoMemory {
  id: string;
  trip_id: string;
  image_url: string;
  caption: string;
  location?: string;
  date_label?: string;
  created_at: string;
}

const PHOTO_STORAGE_PREFIX = 'travel_tracker_photos_';

export function getTripPhotos(tripId: string): PhotoMemory[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${PHOTO_STORAGE_PREFIX}${tripId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTripPhoto(
  tripId: string,
  photo: { image_url: string; caption: string; location?: string; date_label?: string }
): PhotoMemory[] {
  const existing = getTripPhotos(tripId);
  const newPhoto: PhotoMemory = {
    id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    trip_id: tripId,
    image_url: photo.image_url,
    caption: photo.caption.trim(),
    location: photo.location?.trim() || '',
    date_label: photo.date_label?.trim() || '',
    created_at: new Date().toISOString(),
  };

  const updated = [newPhoto, ...existing];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${PHOTO_STORAGE_PREFIX}${tripId}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save photo memory', e);
    }
  }
  return updated;
}

export function deleteTripPhoto(tripId: string, photoId: string): PhotoMemory[] {
  const existing = getTripPhotos(tripId).filter(p => p.id !== photoId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${PHOTO_STORAGE_PREFIX}${tripId}`, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to delete photo', e);
    }
  }
  return existing;
}
