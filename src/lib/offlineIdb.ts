// src/lib/offlineIdb.ts
/**
 * High-capacity IndexedDB engine for offline trip caching & queued offline expenses.
 * Removes the ~5MB synchronous localStorage ceiling so large itineraries, custom place photos,
 * and offline expense receipts work reliably in subway tunnels and airplane mode.
 */

const DB_NAME = 'travel_tracker_offline_db';
const DB_VERSION = 1;
const STORE_TRIP_CACHE = 'trip_caches';
const STORE_EXPENSE_QUEUE = 'expense_queues';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openOfflineDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_TRIP_CACHE)) {
          db.createObjectStore(STORE_TRIP_CACHE);
        }
        if (!db.objectStoreNames.contains(STORE_EXPENSE_QUEUE)) {
          db.createObjectStore(STORE_EXPENSE_QUEUE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

export async function idbSetItem<T>(
  storeName: typeof STORE_TRIP_CACHE | typeof STORE_EXPENSE_QUEUE,
  key: string,
  value: T
): Promise<boolean> {
  const db = await openOfflineDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbGetItem<T>(
  storeName: typeof STORE_TRIP_CACHE | typeof STORE_EXPENSE_QUEUE,
  key: string
): Promise<T | null> {
  const db = await openOfflineDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbDeleteItem(
  storeName: typeof STORE_TRIP_CACHE | typeof STORE_EXPENSE_QUEUE,
  key: string
): Promise<boolean> {
  const db = await openOfflineDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
